const express = require("express");
const router = express.Router();

const isAuthenticated = require("../middleware/isAuthenticated");

// Render Checkout Page
async function renderCheckoutPage(req, res) {
  const user_id = req.cookies.cookuid;
  // res.locals.username and res.locals.userid are available from app.js middleware
  const connection = req.app.get("dbConnection");

  try {
    const query = `
      SELECT uc.item_id, uc.quantity, m.item_name, m.item_price 
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
          user: {
            name: res.locals.username,
            id: res.locals.userid,
            address: null,
          }, // Pass a default user object
          pageType: "checkout",
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

      // Fetch user's address from the users table
      const addressQuery =
        "SELECT user_address FROM users WHERE user_id = ? LIMIT 1";
      connection.query(
        addressQuery,
        [user_id],
        (addressErr, addressResults) => {
          let userDbAddress = null;
          if (addressErr) {
            console.error("Error fetching user address:", addressErr);
            // Potentially render with an error or proceed without address
          } else if (addressResults && addressResults.length > 0) {
            userDbAddress = addressResults[0].user_address;
          }

          // Construct the user object for the template
          const userForTemplate = {
            name: res.locals.username, // Already available via res.locals
            id: res.locals.userid, // Already available via res.locals
            address: userDbAddress, // This is the string address or null
          };

          res.render("checkout", {
            items: cartItems,
            total: totalAmount.toFixed(2),
            itemCount: itemCount,
            user: userForTemplate, // Pass the structured user object
            pageType: "checkout",
            error: null,
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
      user: { name: res.locals.username, id: res.locals.userid, address: null }, // Pass a default user object
      pageType: "checkout",
    });
  }
}

// Process Payment
async function processPayment(req, res) {
  console.log("processPayment req.body:", req.body);

  const user_id = req.cookies.cookuid;
  const {
    paymentMethod,
    address, // For existing address selection
    new_address_line1, // New address fields start here
    new_address_line2,
    new_city,
    new_state,
    new_postal_code,
    new_country, // New address fields end here
    paymentId, // PayPal Order ID
    status, // PayPal status e.g. 'COMPLETED'
    paypalShippingAddress, // Address from PayPal
    notes, // Optional notes from customer
  } = req.body;
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

      let finalAddressString = "";

      if (paymentMethod === "COD") {
        if (new_address_line1 && new_city && new_postal_code && new_country) {
          // New address submitted for COD
          const parts = [
            new_address_line1,
            new_address_line2,
            new_city,
            new_state,
            new_postal_code,
            new_country,
          ];
          finalAddressString = parts
            .filter((part) => part && part.trim() !== "")
            .join(", ")
            .substring(0, 255);
        } else if (
          address &&
          typeof address === "string" &&
          address.trim() !== ""
        ) {
          // Existing address selected for COD
          finalAddressString = address.trim().substring(0, 255);
        } else {
          console.error(
            "COD order: Delivery address is missing or empty. Required: new address fields or existing address.",
            req.body
          );
          return res.status(400).json({
            success: false,
            message:
              "Delivery address is required for COD. Please check your address details.",
          });
        }
      } else if (paymentMethod === "PayPal") {
        if (
          paypalShippingAddress &&
          typeof paypalShippingAddress === "string" &&
          paypalShippingAddress.trim() !== ""
        ) {
          finalAddressString = paypalShippingAddress.trim().substring(0, 255);
        } else if (
          new_address_line1 &&
          new_city &&
          new_postal_code &&
          new_country
        ) {
          // Fallback to new address from form for PayPal
          const parts = [
            new_address_line1,
            new_address_line2,
            new_city,
            new_state,
            new_postal_code,
            new_country,
          ];
          finalAddressString = parts
            .filter((part) => part && part.trim() !== "")
            .join(", ")
            .substring(0, 255);
        } else if (
          address &&
          typeof address === "string" &&
          address.trim() !== ""
        ) {
          // Fallback to existing address from form for PayPal
          finalAddressString = address.trim().substring(0, 255);
        } else {
          console.warn(
            "PayPal order: Shipping address not determined from PayPal or form."
          );
          // If address is strictly required for PayPal orders too, add a check and error response here.
          // For now, we might allow it if PayPal flow doesn't mandate it and it's not physical goods.
          // However, for physical goods, this would be an issue.
        }
      } else {
        console.error("Invalid payment method received:", paymentMethod);
        return res
          .status(400)
          .json({ success: false, message: "Invalid payment method." });
      }

      const orderStatus = "Pending";
      const paymentStatusDb =
        paymentMethod === "PayPal" && status === "COMPLETED"
          ? "Paid"
          : "Unpaid";

      const orderInsertQuery = `
        INSERT INTO orders (user_id, total_amount, payment_method, shipping_address, order_status, payment_status, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      connection.query(
        orderInsertQuery,
        [
          user_id,
          totalAmountFromDB,
          paymentMethod,
          finalAddressString, // Use the determined address
          orderStatus,
          paymentStatusDb,
          notes || null,
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
            parseFloat(item.item_price),
            parseFloat(item.item_price) * parseInt(item.quantity),
          ]);
          const orderItemsInsertQuery = `INSERT INTO order_items (order_id, item_id, quantity, price_per_item, subtotal) VALUES ?`;

          connection.query(
            orderItemsInsertQuery,
            [orderItemsValues],
            (orderItemsErr) => {
              if (orderItemsErr) {
                console.error("Error creating order items:", orderItemsErr);
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
                }
                res.cookie("item_count", 0, { httpOnly: false });

                res.json({
                  success: true,
                  message: "Order placed successfully!",
                  orderId: order_id,
                  redirectUrl: `/confirmation?orderId=${order_id}`, // Added redirectUrl
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

  if (!orderId) {
    // If no orderId is present, redirect to homepage or orders page
    // as the user might have navigated here directly.
    return res.redirect("/homepage");
  }

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
