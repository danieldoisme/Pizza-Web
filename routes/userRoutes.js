const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const crypto = require("crypto");
const { transporter } = require("./indexRoutes");
const { body, validationResult } = require("express-validator");

function isAuthenticated(req, res, next) {
  if (req.cookies.cookuid && req.cookies.cookuname) {
    return next();
  }
  res.redirect("/signin");
}

async function renderSettingsPage(req, res) {
  const userId = req.cookies.cookuid;
  if (!userId) {
    req.flash("error", "Please sign in to view settings.");
    return res.redirect("/signin");
  }
  const connection = req.app.get("dbConnection");
  try {
    const [userDataResults] = await connection
      .promise()
      .query("SELECT * FROM users WHERE user_id = ?", [userId]);
    if (userDataResults.length === 0) {
      req.flash("error", "User not found.");
      return res.redirect("/homepage");
    }
    const userData = userDataResults[0];

    let promotionSubscription = null;
    const [subscriptionResults] = await connection
      .promise()
      .query(
        "SELECT is_subscribed FROM email_subscriptions WHERE user_id = ? OR email = ?",
        [userId, userData.user_email]
      );

    if (subscriptionResults.length > 0) {
      promotionSubscription = subscriptionResults[0];
    }

    const flashedErrorMessages = res.locals.error;
    const flashedSuccessMessages = res.locals.success;
    const oldInput = req.flash("oldInput")[0] || {};

    let displayError = null;
    if (flashedErrorMessages && flashedErrorMessages.length > 0) {
      displayError = Array.isArray(flashedErrorMessages)
        ? flashedErrorMessages.join(", ")
        : flashedErrorMessages;
    }

    let displaySuccess = null;
    if (flashedSuccessMessages && flashedSuccessMessages.length > 0) {
      displaySuccess = Array.isArray(flashedSuccessMessages)
        ? flashedSuccessMessages.join(", ")
        : flashedSuccessMessages;
    }

    res.render("settings", {
      pageType: "settings",
      username: req.cookies.cookuname,
      userid: userId,
      item_count: req.cookies.item_count || 0,
      userData: userData,
      promotionSubscription: promotionSubscription,
      error: displayError,
      success: displaySuccess,
      oldInput: oldInput,
    });
  } catch (error) {
    console.error("Error fetching user data for settings:", error);
    req.flash("error", "Could not load your settings page. Please try again.");
    res.redirect("/homepage");
  }
}

const contactValidationRules = [
  body("mobileno")
    .notEmpty()
    .withMessage("Mobile number is required.")
    .isMobilePhone("any", { strictMode: false })
    .withMessage("Invalid mobile number.")
    .trim()
    .escape(),
];

async function updateContact(req, res) {
  const errors = validationResult(req);
  const userId = req.cookies.cookuid;

  if (!userId) {
    req.flash("error", "Authentication required.");
    return res.redirect("/signin");
  }

  if (!errors.isEmpty()) {
    req.flash(
      "error",
      errors.array().map((err) => err.msg)
    );
    req.flash("oldInput", req.body);
    return res.redirect("/settings");
  }

  const { mobileno } = req.body;
  const connection = req.app.get("dbConnection");

  try {
    await connection
      .promise()
      .query("UPDATE users SET user_mobileno = ? WHERE user_id = ?", [
        mobileno,
        userId,
      ]);
    req.flash("success", "Mobile number updated successfully.");
    res.redirect("/settings");
  } catch (err) {
    console.error("Error updating mobile number:", err);
    req.flash("error", "Failed to update mobile number.");
    req.flash("oldInput", req.body);
    res.redirect("/settings");
  }
}

const addressValidationRules = [
  body("address_line1")
    .notEmpty()
    .withMessage("Street address is required.")
    .trim()
    .escape(),
  body("address_line2").trim().escape(),
  body("city").notEmpty().withMessage("City is required.").trim().escape(),
  body("state")
    .notEmpty()
    .withMessage("State/Province is required.")
    .trim()
    .escape(),
  body("postal_code")
    .notEmpty()
    .withMessage("ZIP/Postal Code is required.")
    .isPostalCode("any")
    .withMessage("Invalid postal code.")
    .trim()
    .escape(),
  body("country")
    .notEmpty()
    .withMessage("Country is required.")
    .trim()
    .escape(),
];

async function updateAddress(req, res) {
  const errors = validationResult(req);
  const userId = req.cookies.cookuid;

  if (!userId) {
    req.flash("error", "Authentication required.");
    return res.redirect("/signin");
  }

  if (!errors.isEmpty()) {
    req.flash(
      "error",
      errors.array().map((err) => err.msg)
    );
    req.flash("oldInput", req.body);
    return res.redirect("/settings");
  }

  const { address_line1, address_line2, city, state, postal_code, country } =
    req.body;
  const connection = req.app.get("dbConnection");

  const addressParts = [
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country,
  ];
  const combinedAddress = addressParts
    .filter((part) => part && part.trim() !== "")
    .join(", ");

  try {
    await connection
      .promise()
      .query("UPDATE users SET user_address = ? WHERE user_id = ?", [
        combinedAddress,
        userId,
      ]);
    req.flash("success", "Address updated successfully.");
    res.redirect("/settings");
  } catch (err) {
    console.error("Error updating address:", err);
    req.flash("error", "Failed to update address.");
    req.flash("oldInput", req.body);
    res.redirect("/settings");
  }
}

const passwordValidationRules = [
  body("old_password").notEmpty().withMessage("Old password is required."),
  body("new_password")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long.")
    .matches(/[A-Z]/)
    .withMessage("New password must contain at least one uppercase letter.")
    .matches(/[a-z]/)
    .withMessage("New password must contain at least one lowercase letter.")
    .matches(/[0-9]/)
    .withMessage("New password must contain at least one number.")
    .matches(/[\W_]/)
    .withMessage("New password must contain at least one special character."),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.new_password) {
      throw new Error("New passwords do not match.");
    }
    return true;
  }),
];

async function updatePassword(req, res) {
  const errors = validationResult(req);
  const userId = req.cookies.cookuid;

  if (!userId) {
    req.flash("error", "Authentication required.");
    return res.redirect("/signin");
  }

  if (!errors.isEmpty()) {
    req.flash(
      "error",
      errors.array().map((err) => err.msg)
    );
    return res.redirect("/settings");
  }

  const { old_password, new_password } = req.body;
  const connection = req.app.get("dbConnection");

  try {
    const [results] = await connection
      .promise()
      .query("SELECT user_password FROM users WHERE user_id = ?", [userId]);
    if (results.length === 0) {
      req.flash("error", "User not found.");
      return res.redirect("/settings");
    }
    const storedPasswordHash = results[0].user_password;

    const oldPasswordMatch = await bcrypt.compare(
      old_password,
      storedPasswordHash
    );
    if (!oldPasswordMatch) {
      req.flash("error", "Incorrect old password.");
      return res.redirect("/settings");
    }

    const newHashedPassword = await bcrypt.hash(new_password, saltRounds);
    await connection
      .promise()
      .query("UPDATE users SET user_password = ? WHERE user_id = ?", [
        newHashedPassword,
        userId,
      ]);

    req.flash("success", "Password updated successfully.");
    res.redirect("/settings");
  } catch (err) {
    console.error("Error updating password:", err);
    req.flash("error", "Failed to update password. Please try again.");
    res.redirect("/settings");
  }
}

async function renderMyOrdersPage(req, res) {
  const userId = req.cookies.cookuid;
  const itemCount = res.locals.item_count || 0;
  const connection = req.app.get("dbConnection");

  if (!userId) {
    return res.redirect("/signin");
  }

  try {
    const userDetailsQuery =
      "SELECT user_id, user_name, user_email, user_address, user_mobileno FROM users WHERE user_id = ?";
    connection.query(userDetailsQuery, [userId], (userErr, userResults) => {
      if (userErr || userResults.length === 0) {
        console.error(
          "Error fetching user details for orders page or user not found:",
          userErr
        );
        return res.status(userErr ? 500 : 404).render("orders", {
          pageType: "orders",
          item_count: itemCount,
          orders: [],
          userDetails: null,
          error: "Could not load your details at this time.",
        });
      }

      const currentUserDetails = userResults[0];

      const ordersQuery = `
        SELECT 
          o.order_id, 
          o.order_date, 
          o.total_amount, 
          o.shipping_address,
          o.order_status,
          o.payment_method,
          o.payment_status,
          o.notes,
          o.delivery_date 
        FROM orders o
        WHERE o.user_id = ?
        ORDER BY o.order_date DESC
      `;

      connection.query(ordersQuery, [userId], async (ordersErr, orders) => {
        if (ordersErr) {
          console.error("Error fetching orders:", ordersErr);
          return res.status(500).render("orders", {
            pageType: "orders",
            item_count: itemCount,
            orders: [],
            userDetails: currentUserDetails,
            error: "Could not retrieve your orders at this time.",
          });
        }

        if (orders.length === 0) {
          return res.render("orders", {
            pageType: "orders",
            item_count: itemCount,
            orders: [],
            userDetails: currentUserDetails,
            error: null,
          });
        }

        const ordersWithItems = [];
        for (const order of orders) {
          const orderItemsQuery = `
            SELECT 
              oi.item_id, 
              oi.quantity, 
              oi.price_per_item, 
              oi.subtotal,
              m.item_name
            FROM order_items oi
            JOIN menu m ON oi.item_id = m.item_id
            WHERE oi.order_id = ?
          `;
          try {
            const items = await new Promise((resolve, reject) => {
              connection.query(
                orderItemsQuery,
                [order.order_id],
                (itemErr, itemResults) => {
                  if (itemErr) {
                    return reject(itemErr);
                  }
                  resolve(itemResults);
                }
              );
            });
            ordersWithItems.push({ ...order, items: items });
          } catch (itemFetchError) {
            console.error(
              `Error fetching items for order ${order.order_id}:`,
              itemFetchError
            );
            ordersWithItems.push({
              ...order,
              items: [],
              errorFetchingItems: true,
            });
          }
        }

        res.render("orders", {
          pageType: "orders",
          item_count: itemCount,
          orders: ordersWithItems,
          userDetails: currentUserDetails,
          error: null,
        });
      });
    });
  } catch (error) {
    console.error("Server error in renderMyOrdersPage:", error);
    res.status(500).render("orders", {
      pageType: "orders",
      item_count: itemCount,
      orders: [],
      userDetails: null,
      error: "An unexpected error occurred.",
    });
  }
}

async function setOrderDeliveredUser(req, res) {
  const orderId = req.params.order_id;
  const userId = req.cookies.cookuid;
  const connection = req.app.get("dbConnection");

  if (!userId) {
    return res.redirect(
      "/signin?error=" + encodeURIComponent("Authentication required.")
    );
  }

  try {
    const [orderRows] = await connection
      .promise()
      .query(
        "SELECT order_status FROM orders WHERE order_id = ? AND user_id = ?",
        [orderId, userId]
      );

    if (orderRows.length === 0) {
      return res.redirect(
        "/orders?error=" +
          encodeURIComponent(
            "Order not found or you do not have permission to update it."
          )
      );
    }

    const currentStatus = orderRows[0].order_status;

    if (currentStatus === "Dispatched") {
      const [updateOrderResult] = await connection
        .promise()
        .query(
          "UPDATE orders SET order_status = 'Delivered', delivery_date = CURRENT_TIMESTAMP WHERE order_id = ? AND user_id = ?",
          [orderId, userId]
        );

      if (updateOrderResult.affectedRows > 0) {
        try {
          const [dispatchUpdateResult] = await connection
            .promise()
            .query(
              "UPDATE order_dispatch SET dispatch_status = 'Delivered' WHERE order_id = ?",
              [orderId]
            );
          if (dispatchUpdateResult.affectedRows === 0) {
            console.warn(
              `Order_dispatch table not updated for order ID: ${orderId}, though order was marked delivered.`
            );
          }
        } catch (dispatchErr) {
          console.error(
            "Error updating order_dispatch status for user-delivered order:",
            dispatchErr
          );
        }
        return res.redirect(
          "/orders?success=" +
            encodeURIComponent(`Order #${orderId} has been marked as Received.`)
        );
      } else {
        return res.redirect(
          "/orders?error=" +
            encodeURIComponent(
              "Failed to mark the order as Received. Please try again or check order status."
            )
        );
      }
    } else {
      return res.redirect(
        "/orders?error=" +
          encodeURIComponent(
            `Order #${orderId} cannot be marked as Received. Current status: ${currentStatus}.`
          )
      );
    }
  } catch (error) {
    console.error("Server error in setOrderDeliveredUser:", error);
    return res.redirect(
      "/orders?error=" +
        encodeURIComponent(
          "An error occurred while trying to mark your order as Received."
        )
    );
  }
}

router.post(
  "/settings/update-promotion-subscription",
  isAuthenticated,
  async (req, res) => {
    const userId = req.cookies.cookuid;
    const { subscribe_promotions } = req.body;
    const shouldBeSubscribed = subscribe_promotions === "on";
    const connection = req.app.get("dbConnection");

    try {
      const [userDataResults] = await connection
        .promise()
        .query("SELECT user_email FROM users WHERE user_id = ?", [userId]);
      if (userDataResults.length === 0) {
        req.flash("error", "User not found.");
        return res.redirect("/settings");
      }
      const userEmail = userDataResults[0].user_email;
      const unsubscribeToken = crypto.randomBytes(32).toString("hex");

      const [existingSubscriptions] = await connection
        .promise()
        .query(
          "SELECT subscription_id, is_subscribed FROM email_subscriptions WHERE email = ?",
          [userEmail]
        );

      if (existingSubscriptions.length > 0) {
        const subscription = existingSubscriptions[0];
        const subscriptionId = subscription.subscription_id;
        const wasPreviouslySubscribed = subscription.is_subscribed;

        if (shouldBeSubscribed) {
          await connection
            .promise()
            .query(
              "UPDATE email_subscriptions SET is_subscribed = 1, user_id = ?, unsubscribed_at = NULL, unsubscribe_token = ?, subscribed_at = IF(? = 0, NOW(), subscribed_at) WHERE subscription_id = ?",
              [
                userId,
                unsubscribeToken,
                wasPreviouslySubscribed,
                subscriptionId,
              ]
            );

          if (!wasPreviouslySubscribed) {
            const mailOptionsResubscribe = {
              from: `"PizzazzPizza" <${process.env.GMAIL_USER}>`,
              to: userEmail,
              subject: "Welcome Back to PizzazzPizza Promotions!",
              html: `<p>Welcome back!</p><p>You have been successfully re-subscribed to PizzazzPizza promotions.</p><p>You'll continue to be the first to know about our latest deals and offers.</p><p>To unsubscribe at any time, click here: ${
                req.protocol
              }://${req.get(
                "host"
              )}/unsubscribe-promotions?token=${unsubscribeToken}</p>`,
            };
            try {
              await transporter.sendMail(mailOptionsResubscribe);
              console.log(
                `Re-subscription email sent to ${userEmail} from settings.`
              );
            } catch (emailError) {
              console.error(
                `Error sending re-subscription email to ${userEmail} from settings:`,
                emailError
              );
            }
          }
        } else {
          await connection
            .promise()
            .query(
              "UPDATE email_subscriptions SET is_subscribed = 0, unsubscribed_at = NOW(), unsubscribe_token = NULL WHERE subscription_id = ?",
              [subscriptionId]
            );
        }
      } else if (shouldBeSubscribed) {
        await connection
          .promise()
          .query(
            "INSERT INTO email_subscriptions (email, user_id, is_subscribed, unsubscribe_token, subscribed_at) VALUES (?, ?, 1, ?, NOW())",
            [userEmail, userId, unsubscribeToken]
          );

        const mailOptions = {
          from: `"PizzazzPizza" <${process.env.GMAIL_USER}>`,
          to: userEmail,
          subject: "Subscription Confirmed - PizzazzPizza Promotions",
          html: `<p>Thank you for subscribing to PizzazzPizza promotions!</p><p>You'll be the first to know about our latest deals and offers.</p><p>To unsubscribe at any time, click here: ${
            req.protocol
          }://${req.get(
            "host"
          )}/unsubscribe-promotions?token=${unsubscribeToken}</p>`,
        };
        try {
          await transporter.sendMail(mailOptions);
          console.log(
            `Subscription confirmation email sent to ${userEmail} from settings.`
          );
        } catch (emailError) {
          console.error(
            `Error sending subscription confirmation email to ${userEmail} from settings:`,
            emailError
          );
        }
      }

      const message = shouldBeSubscribed
        ? "Subscribed to promotions successfully."
        : "Unsubscribed from promotions successfully.";
      req.flash("success", message);
      res.redirect("/settings");
    } catch (error) {
      console.error("Error updating promotion subscription:", error);
      req.flash("error", "Failed to update subscription status.");
      res.redirect("/settings");
    }
  }
);

router.get("/settings", isAuthenticated, renderSettingsPage);
router.post("/contact", isAuthenticated, contactValidationRules, updateContact);
router.post("/address", isAuthenticated, addressValidationRules, updateAddress);
router.post(
  "/password",
  isAuthenticated,
  passwordValidationRules,
  updatePassword
);

router.get("/orders", isAuthenticated, renderMyOrdersPage);

router.post(
  "/order/mark-delivered/:order_id",
  isAuthenticated,
  setOrderDeliveredUser
);

router.post("/order/cancel/:order_id", isAuthenticated, async (req, res) => {
  const { order_id } = req.params;
  const userId = req.cookies.cookuid;
  const connection = req.app.get("dbConnection");

  if (!userId) {
    return res.redirect(
      "/signin?error=" + encodeURIComponent("Authentication required.")
    );
  }

  try {
    const [orderRows] = await connection
      .promise()
      .query(
        "SELECT order_status FROM orders WHERE order_id = ? AND user_id = ?",
        [order_id, userId]
      );

    if (orderRows.length === 0) {
      return res.redirect(
        "/orders?error=" +
          encodeURIComponent(
            "Order not found or you do not have permission to cancel it."
          )
      );
    }

    const currentStatus = orderRows[0].order_status;

    if (currentStatus === "Pending" || currentStatus === "Processing") {
      const [updateResult] = await connection
        .promise()
        .query(
          "UPDATE orders SET order_status = 'Cancelled' WHERE order_id = ? AND user_id = ?",
          [order_id, userId]
        );

      if (updateResult.affectedRows > 0) {
        return res.redirect(
          "/orders?success=" +
            encodeURIComponent(
              `Order #${order_id} has been successfully cancelled.`
            )
        );
      } else {
        return res.redirect(
          "/orders?error=" +
            encodeURIComponent("Failed to cancel the order. Please try again.")
        );
      }
    } else {
      return res.redirect(
        "/orders?error=" +
          encodeURIComponent(
            `Order #${order_id} cannot be cancelled as it is already ${currentStatus}.`
          )
      );
    }
  } catch (error) {
    console.error("Error cancelling order by user:", error);
    return res.redirect(
      "/orders?error=" +
        encodeURIComponent(
          "An error occurred while trying to cancel your order. Please try again later."
        )
    );
  }
});

module.exports = router;
