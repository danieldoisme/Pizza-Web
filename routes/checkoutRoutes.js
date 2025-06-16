const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator"); // Import express-validator

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
const processPaymentValidationRules = [
  body("paymentMethod")
    .trim()
    .isIn(["COD", "PayPal"])
    .withMessage("Invalid payment method selected."),
  body("addressOption")
    .optional()
    .trim()
    .isIn(["existing", "new"])
    .withMessage("Invalid address option."),
  body("address") // Existing address
    .if(body("addressOption").equals("existing"))
    .trim()
    .notEmpty()
    .withMessage("Existing address cannot be empty if selected.")
    .isLength({ max: 255 })
    .withMessage("Existing address is too long."),
  body("new_address_line1")
    .if(body("addressOption").equals("new"))
    .trim()
    .notEmpty()
    .withMessage("Street address is required for a new address.")
    .isLength({ max: 100 })
    .withMessage("New street address is too long (max 100 chars)."),
  body("new_address_line2")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("New apartment/suite info is too long (max 100 chars)."),
  body("new_city")
    .if(body("addressOption").equals("new"))
    .trim()
    .notEmpty()
    .withMessage("City is required for a new address.")
    .isLength({ max: 50 })
    .withMessage("New city name is too long (max 50 chars)."),
  body("new_state")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("New state/province name is too long (max 50 chars)."),
  body("new_postal_code")
    .if(body("addressOption").equals("new"))
    .trim()
    .notEmpty()
    .withMessage("ZIP/Postal code is required for a new address.")
    .isLength({ max: 20 })
    .withMessage("New ZIP/Postal code is too long (max 20 chars)."),
  body("new_country")
    .if(body("addressOption").equals("new"))
    .trim()
    .notEmpty()
    .withMessage("Country is required for a new address.")
    .isLength({ max: 50 })
    .withMessage("New country name is too long (max 50 chars)."),
  body("paymentId") // PayPal Order ID
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .isLength({ max: 100 })
    .withMessage("PayPal Payment ID seems invalid."),
  body("status") // PayPal status
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .isLength({ max: 50 })
    .withMessage("PayPal status seems invalid."),
  body("paypalShippingAddress")
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .isLength({ max: 255 })
    .withMessage("PayPal shipping address is too long."),
  body("notes")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes are too long (max 500 chars)."),
];

async function processPayment(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: errors.array(),
    });
  }

  console.log("processPayment req.body (post-validation):", req.body);

  const user_id = req.cookies.cookuid;
  const {
    paymentMethod,
    addressOption, // Used by validators, available here
    address, // For existing address selection (validated and trimmed)
    new_address_line1, // New address fields start here (validated and trimmed)
    new_address_line2,
    new_city,
    new_state,
    new_postal_code,
    new_country, // New address fields end here (validated and trimmed)
    paymentId, // PayPal Order ID (validated and trimmed)
    status, // PayPal status e.g. 'COMPLETED' (validated and trimmed)
    paypalShippingAddress, // Address from PayPal (validated and trimmed)
    notes, // Optional notes from customer (validated and trimmed)
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
        // Check if 'new' address option was selected and validated fields are present
        if (
          addressOption === "new" &&
          new_address_line1 &&
          new_city &&
          new_postal_code &&
          new_country
        ) {
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
          // Check if 'existing' address option was selected and validated 'address' is present
        } else if (
          addressOption === "existing" &&
          address &&
          address.trim() !== ""
        ) {
          finalAddressString = address.trim().substring(0, 255);
        } else {
          // This case should ideally be caught by client-side validation or if addressOption is missing/invalid
          // For COD, an address (either new or existing) must be validly provided if selected.
          // If addressOption was not 'new' or 'existing' but COD is chosen, it's an issue.
          // Or if addressOption was 'new' but required fields were empty (should be caught by validator).
          // Or if addressOption was 'existing' but 'address' was empty (should be caught by validator).
          console.error(
            "COD order: Valid delivery address details not found after validation. AddressOption:",
            addressOption,
            "ReqBody:",
            req.body
          );
          return res.status(400).json({
            success: false,
            message:
              "A valid delivery address is required for Cash on Delivery. Please check your address selection and details.",
          });
        }
      } else if (paymentMethod === "PayPal") {
        if (paypalShippingAddress && paypalShippingAddress.trim() !== "") {
          finalAddressString = paypalShippingAddress.trim().substring(0, 255);
          // Fallback to new address from form if PayPal didn't provide one and 'new' was selected
        } else if (
          addressOption === "new" &&
          new_address_line1 &&
          new_city &&
          new_postal_code &&
          new_country
        ) {
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
          // Fallback to existing address from form
        } else if (
          addressOption === "existing" &&
          address &&
          address.trim() !== ""
        ) {
          finalAddressString = address.trim().substring(0, 255);
        } else {
          console.warn(
            "PayPal order: Shipping address not determined from PayPal or form. AddressOption:",
            addressOption
          );
          // Depending on business logic, an address might still be required.
          // If finalAddressString remains empty, it will be stored as such.
        }
      } else {
        // This case should be caught by the paymentMethod validator
        console.error(
          "Invalid payment method after validation:",
          paymentMethod
        );
        return res
          .status(400)
          .json({ success: false, message: "Invalid payment method." });
      }

      // Ensure finalAddressString is not undefined if it's going into the DB
      if (finalAddressString === undefined) finalAddressString = "";

      const orderStatus = "Pending";
      const paymentStatusDb =
        paymentMethod === "PayPal" && status === "COMPLETED"
          ? "Paid"
          : paymentMethod === "PayPal" // If PayPal and not COMPLETED
          ? "Failed" // Set to "Failed"
          : "Unpaid"; // Default for COD or other non-PayPal scenarios

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
router.post(
  "/checkout/process-payment",
  isAuthenticated,
  processPaymentValidationRules,
  processPayment
);
router.get("/confirmation", isAuthenticated, renderConfirmationPage);

module.exports = router;
