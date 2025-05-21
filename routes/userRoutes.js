const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt"); // Import bcrypt
const saltRounds = 10; // Define salt rounds
const crypto = require("crypto");
const { transporter } = require("./indexRoutes"); // Added import for transporter

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
    return res.redirect("/signin");
  }
  const connection = req.app.get("dbConnection");
  try {
    const [userDataResults] = await connection
      .promise()
      .query("SELECT * FROM users WHERE user_id = ?", [userId]);
    if (userDataResults.length === 0) {
      return res.redirect("/signin"); // Or handle error
    }
    const userData = userDataResults[0];

    // Fetch promotion subscription status
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

    res.render("settings", {
      pageType: "settings",
      username: req.cookies.cookuname,
      userid: userId,
      item_count: req.cookies.item_count || 0,
      userData: userData,
      promotionSubscription: promotionSubscription, // Pass to EJS
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (error) {
    console.error("Error fetching user data for settings:", error);
    res.redirect(
      "/homepage?error=" + encodeURIComponent("Could not load settings.")
    );
  }
}

// Handler for updating user address
function updateAddress(req, res) {
  const userId = req.cookies.cookuid;
  // const { address } = req.body; // Old
  const { address_line1, address_line2, city, state, postal_code, country } =
    req.body; // New
  const connection = req.app.get("dbConnection");

  if (!userId) {
    return res.redirect("/signin");
  }

  // Basic validation for required new fields
  if (
    !address_line1 ||
    address_line1.trim() === "" ||
    !city ||
    city.trim() === "" ||
    !postal_code ||
    postal_code.trim() === "" ||
    !country ||
    country.trim() === ""
  ) {
    return res.redirect(
      "/settings?error=" +
        encodeURIComponent(
          "Street, City, Postal Code, and Country are required."
        )
    );
  }

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

  const query = "UPDATE users SET user_address = ? WHERE user_id = ?";
  // connection.query(query, [address, userId], (err, result) => { // Old
  connection.query(query, [combinedAddress, userId], (err, result) => {
    if (err) {
      console.error("Error updating address:", err);
      return res.redirect(
        "/settings?error=" + encodeURIComponent("Failed to update address.")
      );
    }
    res.redirect(
      "/settings?success=" + encodeURIComponent("Address updated successfully.")
    );
  });
}

// Handler for updating user contact (mobile number)
function updateContact(req, res) {
  const userId = req.cookies.cookuid;
  const { mobileno } = req.body;
  const connection = req.app.get("dbConnection");

  if (!userId) {
    return res.redirect("/signin");
  }

  if (!mobileno || mobileno.trim() === "") {
    return res.redirect(
      "/settings?error=" + encodeURIComponent("Mobile number cannot be empty.")
    );
  }

  const query = "UPDATE users SET user_mobileno = ? WHERE user_id = ?";
  connection.query(query, [mobileno, userId], (err, result) => {
    if (err) {
      console.error("Error updating mobile number:", err);
      return res.redirect(
        "/settings?error=" +
          encodeURIComponent("Failed to update mobile number.")
      );
    }
    res.redirect(
      "/settings?success=" +
        encodeURIComponent("Mobile number updated successfully.")
    );
  });
}

// Handler for updating user password
async function updatePassword(req, res) {
  const userId = req.cookies.cookuid;
  const { old_password, new_password, confirmPassword } = req.body;
  const connection = req.app.get("dbConnection");

  if (!userId) {
    return res.redirect("/signin");
  }

  if (new_password !== confirmPassword) {
    return res.redirect(
      "/settings?error=" + encodeURIComponent("New passwords do not match.")
    );
  }

  if (!new_password || new_password.length < 6) {
    return res.redirect(
      "/settings?error=" +
        encodeURIComponent("New password must be at least 6 characters long.")
    );
  }

  const getUserQuery = "SELECT user_password FROM users WHERE user_id = ?";
  connection.query(getUserQuery, [userId], async (err, results) => {
    if (err) {
      console.error("Error fetching user for password update:", err);
      return res.redirect(
        "/settings?error=" +
          encodeURIComponent("Failed to update password. Please try again.")
      );
    }

    if (results.length === 0) {
      return res.redirect(
        "/settings?error=" + encodeURIComponent("User not found.")
      );
    }

    const storedPasswordHash = results[0].user_password;

    try {
      const oldPasswordMatch = await bcrypt.compare(
        old_password,
        storedPasswordHash
      );
      if (!oldPasswordMatch) {
        return res.redirect(
          "/settings?error=" + encodeURIComponent("Incorrect old password.")
        );
      }

      const newHashedPassword = await bcrypt.hash(new_password, saltRounds);
      const updatePasswordQuery =
        "UPDATE users SET user_password = ? WHERE user_id = ?";
      connection.query(
        updatePasswordQuery,
        [newHashedPassword, userId],
        (updateErr, updateResult) => {
          if (updateErr) {
            console.error("Error updating password:", updateErr);
            return res.redirect(
              "/settings?error=" +
                encodeURIComponent(
                  "Failed to update password. Please try again."
                )
            );
          }
          res.redirect(
            "/settings?success=" +
              encodeURIComponent("Password updated successfully.")
          );
        }
      );
    } catch (hashOrCompareError) {
      console.error(
        "Error during password update (hash/compare):",
        hashOrCompareError
      );
      return res.redirect(
        "/settings?error=" +
          encodeURIComponent("An error occurred. Please try again.")
      );
    }
  });
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

// Placeholder for User to Mark Order as Delivered
async function setOrderDeliveredUser(req, res) {
  const orderId = req.params.order_id;
  const userId = req.cookies.cookuid;
  const connection = req.app.get("dbConnection");
  console.log(
    `setOrderDeliveredUser called for order ID: ${orderId} by user ID: ${userId}`
  );

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated." });
  }

  try {
    // Verify the order belongs to the user and is in a state that can be marked delivered by user (e.g., 'Shipped')
    const checkOrderQuery =
      "SELECT order_id FROM orders WHERE order_id = ? AND user_id = ? AND order_status = 'Dispatched'"; // Or 'Processing' if applicable
    connection.query(
      checkOrderQuery,
      [orderId, userId],
      (checkErr, checkResults) => {
        if (checkErr || checkResults.length === 0) {
          console.error(
            "Error checking order or order not eligible:",
            checkErr
          );
          return res.status(403).json({
            success: false,
            message:
              "Order cannot be marked as delivered or does not belong to you.",
          });
        }

        const updateQuery =
          "UPDATE orders SET order_status = 'Delivered', delivery_date = CURRENT_TIMESTAMP WHERE order_id = ? AND user_id = ?";
        connection.query(updateQuery, [orderId, userId], (err, result) => {
          if (err) {
            console.error("Error marking order as delivered by user:", err);
            return res.status(500).json({
              success: false,
              message: "Failed to update order status.",
            });
          }
          if (result.affectedRows > 0) {
            // Update dispatch_status in order_dispatch table to 'Delivered'
            // This preserves the original dispatch_datetime and dispatched_by_admin_id
            const dispatchUpdateQuery =
              "UPDATE order_dispatch SET dispatch_status = 'Delivered' WHERE order_id = ?";
            connection.query(
              dispatchUpdateQuery,
              [orderId],
              (dispatchErr, dispatchResult) => {
                if (dispatchErr) {
                  console.error(
                    "Error updating order_dispatch status for user-delivered order:",
                    dispatchErr
                  );
                  // Log error, but proceed with redirect as order status update was successful
                }
                // Optionally, you could check dispatchResult.affectedRows here if needed
                res.redirect(
                  "/orders?message=" +
                    encodeURIComponent("Order marked as delivered.")
                );
              }
            );
          } else {
            res.status(404).json({
              success: false,
              message: "Order not found or already updated.",
            });
          }
        });
      }
    );
  } catch (error) {
    console.error("Server error in setOrderDeliveredUser:", error);
    res.status(500).json({ success: false, message: "Server error." });
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
        return res.redirect(
          "/settings?error=" + encodeURIComponent("User not found.")
        );
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
      res.redirect("/settings?success=" + encodeURIComponent(message)); // Redirect to subscriptions tab
    } catch (error) {
      console.error("Error updating promotion subscription:", error);
      res.redirect(
        "/settings?error=" +
          encodeURIComponent("Failed to update subscription status.") // Redirect to subscriptions tab
      );
    }
  }
);

// Define routes for user settings
router.get("/settings", isAuthenticated, renderSettingsPage);
router.post("/address", isAuthenticated, updateAddress);
router.post("/contact", isAuthenticated, updateContact);
router.post("/password", isAuthenticated, updatePassword);

// Define route for "My Orders"
router.get("/orders", isAuthenticated, renderMyOrdersPage);

// Define route for marking order as delivered
router.post(
  "/order/mark-delivered/:order_id",
  isAuthenticated,
  setOrderDeliveredUser
);

module.exports = router;
