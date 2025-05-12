const express = require("express");
const router = express.Router();

// Middleware to check if user is authenticated (copy from app.js or import if modularized)
function isAuthenticated(req, res, next) {
  if (req.cookies.cookuid && req.cookies.cookuname) {
    return next();
  }
  res.redirect("/signin");
}

// Render Checkout Page
async function renderCheckoutPage(req, res) {
  const user_id = req.cookies.cookuid;
  const connection = req.app.get("dbConnection");

  try {
    const query = `
      SELECT uc.item_id, uc.quantity, m.item_name, m.item_price, m.item_img AS item_image 
      FROM user_cart_items uc
      JOIN menu m ON uc.item_id = m.item_id
      WHERE uc.user_id = ? AND uc.quantity > 0
    `;
    connection.query(query, [user_id], (err, results) => {
      if (err) {
        console.error("Error fetching cart items for checkout:", err);
        return res.status(500).render("checkout", {
          error: "Error preparing your checkout. Please try again.",
          items: [],
          total: 0,
          itemCount: 0,
          existingAddress: null,
          pageType: "checkout",
          // username, userid, isAdmin are available via res.locals
        });
      }

      if (results.length === 0) {
        return res.redirect(
          "/cart?message=Your cart is empty. Please add items before checkout."
        );
      }

      const cartItems = results.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        item_price: parseFloat(item.item_price),
        quantity: parseInt(item.quantity),
        subtotal: parseFloat(item.item_price) * parseInt(item.quantity),
        item_image: item.item_image || "/images/dish/default-pizza.jpg",
      }));

      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );
      const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

      // Assuming user_addresses table exists as per original app.js logic
      const addressQuery =
        "SELECT user_address AS address_line1, 'Default City' AS city, 'DF' AS state, '00000' AS zip_code, 'USA' AS country FROM users WHERE user_id = ? LIMIT 1"; // Simplified, adjust if you have a user_addresses table
      connection.query(
        addressQuery,
        [user_id],
        (addressErr, addressResults) => {
          let existingAddress = null;
          if (addressErr) {
            console.error("Error fetching user address:", addressErr);
          } else {
            existingAddress =
              addressResults && addressResults.length > 0
                ? addressResults[0] // This will need adjustment if user_addresses table is different or not used.
                : { address_line1: req.cookies.user_address || "N/A" }; // Fallback or get from user table
          }

          res.render("checkout", {
            items: cartItems,
            total: totalAmount.toFixed(2),
            itemCount: itemCount,
            existingAddress: existingAddress, // This structure depends on your actual address table/logic
            pageType: "checkout",
            error: null,
            // username, userid, isAdmin are available via res.locals
          });
        }
      );
    });
  } catch (error) {
    console.error("Server error in renderCheckoutPage:", error);
    res.status(500).render("checkout", {
      error: "An unexpected error occurred during checkout preparation.",
      items: [],
      total: 0,
      itemCount: 0,
      existingAddress: null,
      pageType: "checkout",
      // username, userid, isAdmin are available via res.locals
    });
  }
}

// Process Payment
async function processPayment(req, res) {
  const user_id = req.cookies.cookuid;
  const { paymentMethod, addressData, paymentId, payerId, selectedAddressId } =
    req.body;
  const connection = req.app.get("dbConnection");

  if (!user_id) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated." });
  }

  try {
    const cartQuery = `
      SELECT uc.item_id, uc.quantity, m.item_name, m.item_price
      FROM user_cart_items uc
      JOIN menu m ON uc.item_id = m.item_id
      WHERE uc.user_id = ? AND uc.quantity > 0
    `;
    connection.query(cartQuery, [user_id], (cartErr, cartItems) => {
      if (cartErr) {
        console.error("Error fetching cart for payment processing:", cartErr);
        return res.status(500).json({
          success: false,
          message: "Error processing payment (fetching cart).",
        });
      }
      if (!cartItems || cartItems.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Your cart is empty." });
      }

      const totalAmountFromDB = cartItems.reduce(
        (sum, item) =>
          sum + parseFloat(item.item_price) * parseInt(item.quantity),
        0
      );

      // Determine shipping address (simplified, adjust based on your actual address handling)
      let finalAddressString = "N/A";
      if (
        selectedAddressId &&
        selectedAddressId !== "new" &&
        selectedAddressId !== "current"
      ) {
        // If you have a user_addresses table, fetch address by selectedAddressId
        // For now, using placeholder logic or user's main address
        connection.query(
          "SELECT user_address FROM users WHERE user_id = ?",
          [user_id],
          (err, userAddr) => {
            if (userAddr && userAddr.length > 0)
              finalAddressString = userAddr[0].user_address;
          }
        );
      } else if (typeof addressData === "string" && addressData.trim() !== "") {
        finalAddressString = addressData.substring(0, 255);
      } else if (addressData && typeof addressData === "object") {
        // For new address form
        finalAddressString = `${addressData.street || ""}, ${
          addressData.city || ""
        }, ${addressData.state || ""} ${addressData.zip || ""}, ${
          addressData.country || "USA"
        }`.substring(0, 255);
      } else {
        // Fallback to user's default address from users table if no other address provided
        connection.query(
          "SELECT user_address FROM users WHERE user_id = ?",
          [user_id],
          (err, userAddr) => {
            if (userAddr && userAddr.length > 0)
              finalAddressString = userAddr[0].user_address;
            else finalAddressString = "Address not provided";
          }
        );
      }

      const orderStatus = "Pending"; // Initial status
      const paymentStatus =
        paymentMethod === "paypal" && paymentId ? "Paid" : "Unpaid"; // Adjust for COD

      const orderInsertQuery = `
        INSERT INTO orders (user_id, total_amount, payment_method, shipping_address, order_status, payment_status, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `; // Assuming 'notes' can be null or from req.body.notes
      connection.query(
        orderInsertQuery,
        [
          user_id,
          totalAmountFromDB,
          paymentMethod,
          finalAddressString, // Use the determined address
          orderStatus,
          paymentStatus,
          req.body.notes || null, // Example for notes
        ],
        (orderErr, orderResult) => {
          if (orderErr) {
            console.error("Error creating order:", orderErr);
            return res
              .status(500)
              .json({ success: false, message: "Failed to create order." });
          }
          const order_id = orderResult.insertId;

          const orderItemsValues = cartItems.map((item) => [
            order_id,
            item.item_id,
            parseInt(item.quantity),
            parseFloat(item.item_price), // price_per_item
            parseFloat(item.item_price) * parseInt(item.quantity), // subtotal
          ]);
          // Ensure your order_items table has price_per_item and subtotal columns
          const orderItemsInsertQuery = `INSERT INTO order_items (order_id, item_id, quantity, price_per_item, subtotal) VALUES ?`;

          connection.query(
            orderItemsInsertQuery,
            [orderItemsValues],
            (orderItemsErr) => {
              if (orderItemsErr) {
                console.error("Error creating order items:", orderItemsErr);
                // Consider rolling back the order insertion or marking it as failed
                return res.status(500).json({
                  success: false,
                  message: "Failed to record order items.",
                });
              }

              const clearCartQuery =
                "DELETE FROM user_cart_items WHERE user_id = ?";
              connection.query(clearCartQuery, [user_id], (clearCartErr) => {
                if (clearCartErr) {
                  console.error(
                    "Error clearing cart after order:",
                    clearCartErr
                  );
                  // Log error but proceed as order is placed
                }
                // Update client-side item_count cookie
                res.cookie("item_count", 0, { httpOnly: false }); // Client accessible

                res.json({
                  success: true,
                  message: "Order placed successfully!",
                  orderId: order_id,
                });
              });
            }
          );
        }
      );
    });
  } catch (error) {
    console.error("Server error in processPayment:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected server error occurred during payment.",
    });
  }
}

// Render Confirmation Page
function renderConfirmationPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  // item_count is available from res.locals
  const connection = req.app.get("dbConnection");

  // No need to re-validate user here if isAuthenticated middleware is used,
  // but keeping it if it's a strict requirement from original code.
  // If user cookies are invalid, isAuthenticated should redirect.
  if (!userId || !userName) {
    return res.redirect("/signin");
  }

  // The order ID should ideally be passed from the processPayment redirect or query parameter
  const orderId = req.query.orderId; // Example: /confirmation?orderId=123

  res.render("confirmation", {
    pageType: "confirmation",
    orderId: orderId, // Pass orderId to the template
    // username, userid, item_count are available via res.locals
  });
}

// Checkout and Payment Routes
router.post("/checkout", isAuthenticated, renderCheckoutPage); // Kept as POST as per original app.js
router.get("/checkout", isAuthenticated, renderCheckoutPage); // Added GET for direct access
router.post("/checkout/process-payment", isAuthenticated, processPayment);
router.get("/confirmation", isAuthenticated, renderConfirmationPage);

module.exports = router;
