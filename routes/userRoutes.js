const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt"); // Import bcrypt
const saltRounds = 10; // Define salt rounds
const crypto = require("crypto");
const { transporter } = require("./indexRoutes"); // Added import for transporter
const { body, validationResult } = require("express-validator"); // Import express-validator

// Middleware to check if user is authenticated
// This should be the same as the one in app.js or imported from a shared middleware file
function isAuthenticated(req, res, next) {
  if (req.cookies.cookuid && req.cookies.cookuname) {
    return next();
  }
  res.redirect("/signin");
}

// Handler for rendering the settings page
async function renderSettingsPage(req, res) {
  const userId = req.cookies.cookuid;
  if (!userId) {
    // This should ideally be caught by isAuthenticated, but as a safeguard
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
      return res.redirect("/homepage"); // Or perhaps to signin if user context is lost
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

    // Use res.locals which are populated by your app.js middleware from req.flash()
    const flashedErrorMessages = res.locals.error; // Already an array or string from app.js
    const flashedSuccessMessages = res.locals.success; // Already an array or string from app.js
    const oldInput = req.flash("oldInput")[0] || {}; // 'oldInput' uses a distinct flash key, so direct req.flash is fine

    let displayError = null;
    if (flashedErrorMessages && flashedErrorMessages.length > 0) {
      // If app.js middleware gives an array (e.g., from express-validator), join it.
      // If it's already a string, use it as is.
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
      item_count: req.cookies.item_count || 0, // Ensure item_count is available
      userData: userData,
      promotionSubscription: promotionSubscription,
      error: displayError,
      success: displaySuccess,
      oldInput: oldInput,
    });
  } catch (error) {
    console.error("Error fetching user data for settings:", error);
    req.flash("error", "Could not load your settings page. Please try again.");
    res.redirect("/homepage"); // Or a more appropriate error page/redirect
  }
}

// Validation rules for contact update
const contactValidationRules = [
  body("mobileno")
    .notEmpty()
    .withMessage("Mobile number is required.")
    .isMobilePhone("any", { strictMode: false })
    .withMessage("Invalid mobile number.")
    .trim()
    .escape(),
];

// Handler for updating user contact (mobile number)
async function updateContact(req, res) {
  const errors = validationResult(req);
  const userId = req.cookies.cookuid;

  if (!userId) {
    // Should be caught by isAuthenticated, but good for direct calls if any
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

// Validation rules for address update
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

// Handler for updating user address
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

// Validation rules for password update
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

// Handler for updating user password
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
    // Do not flash password fields back
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

// Handler for rendering the "My Orders" page
async function renderMyOrdersPage(req, res) {
  const userId = req.cookies.cookuid;
  const itemCount = res.locals.item_count || 0; // Use res.locals set by global middleware
  const connection = req.app.get("dbConnection");

  if (!userId) {
    return res.redirect("/signin");
  }

  try {
    // 1. Fetch user details
    const userDetailsQuery =
      "SELECT user_id, user_name, user_email, user_address, user_mobileno FROM users WHERE user_id = ?";
    connection.query(userDetailsQuery, [userId], (userErr, userResults) => {
      if (userErr || userResults.length === 0) {
        console.error(
          "Error fetching user details for orders page or user not found:",
          userErr
        );
        // Redirect or render with an error, ensuring all expected template variables are present
        return res.status(userErr ? 500 : 404).render("orders", {
          pageType: "orders",
          item_count: itemCount,
          orders: [],
          userDetails: null, // Pass null or an empty object for userDetails
          error: "Could not load your details at this time.",
        });
      }

      const currentUserDetails = userResults[0];

      // 2. Fetch orders
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
            userDetails: currentUserDetails, // Pass fetched userDetails even if orders fail
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

        // 3. For each order, fetch its items
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
            // Promisify connection.query for use with async/await
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
            // Add order even if items fail to load, with empty items array or an error flag
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
          userDetails: currentUserDetails, // Pass the fetched user details
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

// REVISED Handler for User to Mark Order as Delivered/Received
async function setOrderDeliveredUser(req, res) {
  const orderId = req.params.order_id; // Consistent naming with existing
  const userId = req.cookies.cookuid;
  const connection = req.app.get("dbConnection");
  // console.log( // Original console.log can be kept if desired for debugging
  //   `setOrderDeliveredUser called for order ID: ${orderId} by user ID: ${userId}`
  // );

  if (!userId) {
    // Consistent redirect for authentication failure
    return res.redirect(
      "/signin?error=" + encodeURIComponent("Authentication required.")
    );
  }

  try {
    // Verify the order belongs to the user and is in 'Dispatched' state
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
      // Update the order status to "Delivered" and set delivery_date
      const [updateOrderResult] = await connection.promise().query(
        "UPDATE orders SET order_status = 'Delivered', delivery_date = CURRENT_TIMESTAMP WHERE order_id = ? AND user_id = ?", // Using CURRENT_TIMESTAMP from existing
        [orderId, userId]
      );

      if (updateOrderResult.affectedRows > 0) {
        // Update dispatch_status in order_dispatch table (from existing logic)
        try {
          const [dispatchUpdateResult] = await connection
            .promise()
            .query(
              "UPDATE order_dispatch SET dispatch_status = 'Delivered' WHERE order_id = ?",
              [orderId]
            );
          if (dispatchUpdateResult.affectedRows === 0) {
            // Log if order_dispatch wasn't updated, but don't treat as a primary failure if order was updated
            console.warn(
              `Order_dispatch table not updated for order ID: ${orderId}, though order was marked delivered.`
            );
          }
        } catch (dispatchErr) {
          console.error(
            "Error updating order_dispatch status for user-delivered order:",
            dispatchErr
          );
          // Log error, but proceed with success message for the main order update
        }
        return res.redirect(
          "/orders?success=" +
            encodeURIComponent(`Order #${orderId} has been marked as Received.`)
        ); // Using 'success' for consistency
      } else {
        // This case implies the order wasn't updated, perhaps already delivered or an issue.
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

// New route to update promotion subscription from settings
router.post(
  "/settings/update-promotion-subscription",
  isAuthenticated,
  async (req, res) => {
    const userId = req.cookies.cookuid;
    const { subscribe_promotions } = req.body; // 'on' or undefined
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
      const unsubscribeToken = crypto.randomBytes(32).toString("hex"); // Token for new subscriptions/re-subscriptions

      const [existingSubscriptions] = await connection.promise().query(
        "SELECT subscription_id, is_subscribed FROM email_subscriptions WHERE email = ?", // Fetch is_subscribed
        [userEmail]
      );

      if (existingSubscriptions.length > 0) {
        const subscription = existingSubscriptions[0];
        const subscriptionId = subscription.subscription_id;
        const wasPreviouslySubscribed = subscription.is_subscribed;

        if (shouldBeSubscribed) {
          // User wants to be subscribed
          await connection
            .promise()
            .query(
              "UPDATE email_subscriptions SET is_subscribed = 1, user_id = ?, unsubscribed_at = NULL, unsubscribe_token = ?, subscribed_at = IF(? = 0, NOW(), subscribed_at) WHERE subscription_id = ?",
              [
                userId,
                unsubscribeToken, // New token for active subscription
                wasPreviouslySubscribed, // Check if it's a re-subscription
                subscriptionId,
              ]
            );

          if (!wasPreviouslySubscribed) {
            // This was a re-subscription, send "Welcome Back" email
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
          // User wants to be unsubscribed
          await connection.promise().query(
            "UPDATE email_subscriptions SET is_subscribed = 0, unsubscribed_at = NOW(), unsubscribe_token = NULL WHERE subscription_id = ?", // Set token to NULL
            [subscriptionId]
          );
        }
      } else if (shouldBeSubscribed) {
        // Create new subscription if user wants to subscribe and doesn't have one
        await connection
          .promise()
          .query(
            "INSERT INTO email_subscriptions (email, user_id, is_subscribed, unsubscribe_token, subscribed_at) VALUES (?, ?, 1, ?, NOW())",
            [userEmail, userId, unsubscribeToken]
          );

        // Send confirmation email for new subscription
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

// Define routes for user settings
router.get("/settings", isAuthenticated, renderSettingsPage);
router.post("/contact", isAuthenticated, contactValidationRules, updateContact);
router.post("/address", isAuthenticated, addressValidationRules, updateAddress);
router.post(
  "/password",
  isAuthenticated,
  passwordValidationRules,
  updatePassword
);

// Define route for "My Orders"
router.get("/orders", isAuthenticated, renderMyOrdersPage);

// Define route for marking order as delivered
router.post(
  "/order/mark-delivered/:order_id",
  isAuthenticated,
  setOrderDeliveredUser // This now points to the revised async function
);

// NEW ROUTE: User cancels an order
router.post("/order/cancel/:order_id", isAuthenticated, async (req, res) => {
  const { order_id } = req.params;
  const userId = req.cookies.cookuid; // Get user_id from cookie
  const connection = req.app.get("dbConnection");

  if (!userId) {
    // This should ideally be caught by isAuthenticated, but as a safeguard:
    return res.redirect(
      "/signin?error=" + encodeURIComponent("Authentication required.")
    );
  }

  try {
    // First, verify the order belongs to the user and is in a cancellable state
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
      // Update the order status to "Cancelled"
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
        // This case should ideally not be reached if the select query worked
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
