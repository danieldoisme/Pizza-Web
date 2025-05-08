// Loading and Using Modules Required
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const ejs = require("ejs");
const fileUpload = require("express-fileupload");
const { v4: uuidv4 } = require("uuid");
const mysql = require("mysql");

// Initialize Express App
const app = express();

// Import routes
const indexRoutes = require("./routes/index.js");
const adminRoutes = require("./routes/admin.js");

// Set View Engine and Middleware
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use(fileUpload());

// Database Connection
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "pizzazzpizza",
});
connection.connect();

app.use((req, res, next) => {
  // Attach renderIndexPage for use in indexRoutes
  res.locals.renderIndexPage = renderIndexPage;

  // Admin handlers
  res.locals.renderAdminLogInPage = renderAdminLogInPage;
  res.locals.adminLogIn = adminLogIn;
  res.locals.renderAdminHomepage = renderAdminHomepage;
  res.locals.renderAddFoodPage = renderAddFoodPage;
  res.locals.addFood = addFood;
  res.locals.renderViewDispatchOrdersPage = renderViewDispatchOrdersPage;
  res.locals.dispatchOrders = dispatchOrders;
  res.locals.renderChangePricePage = renderChangePricePage;
  res.locals.changePrice = changePrice;
  res.locals.logout = logout;
  // Add new admin handlers
  res.locals.setOrderProcessing = setOrderProcessing;
  res.locals.setOrderDeliveredAdmin = setOrderDeliveredAdmin;
  next();
});

// Set up routes
app.use("/", indexRoutes);
app.use("/admin", adminRoutes);

// Routes for User Sign-up, Sign-in, Home Page, Cart, Checkout, Order Confirmation, My Orders, and Settings
app.get("/signup", renderSignUpPage);
app.post("/signup", signUpUser);
app.get("/signin", renderSignInPage);
app.post("/signin", signInUser);
app.get("/homepage", renderHomePage);
app.get("/cart", renderCart);
app.post("/cart", updateCart);
// app.post("/checkout", checkout);
app.get("/confirmation", renderConfirmationPage);
app.get("/orders", renderMyOrdersPage);
app.get("/settings", renderSettingsPage);
app.post("/address", updateAddress);
app.post("/contact", updateContact);
app.post("/password", updatePassword);
app.get("/logout", logout);
app.post("/checkout", renderCheckoutPage);
app.post("/checkout/process-payment", processPayment);

// Route for user to mark order as delivered
app.post("/order/mark-delivered/:order_id", setOrderDeliveredUser);

app.post("/updateCart", function (req, res) {
  const cart = req.body.cart || [];
  const itemCount = req.body.item_count || 0;

  // Update server-side cart state
  citemdetails = [];

  if (cart.length > 0) {
    // Fetch items in cart
    getItemDetails(cart, cart.length);
  }

  item_in_cart = itemCount;

  return res.status(200).json({ success: true });
});

// Render Index Page
function renderIndexPage(req, res) {
  // Get authentication info from cookies
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const userType = req.cookies.usertype; // This is the new cookie we added

  console.log("=============== INDEX PAGE ==============");
  console.log("Cookies received:", req.cookies);
  console.log("Auth cookies:", { userId, userName, userType });
  console.log("Cookie header:", req.headers.cookie);
  console.log("=========================================");

  // Simplified authentication check using the usertype cookie
  if (userId && userName && userType) {
    const isAdmin = userType === "admin";

    res.render("index", {
      userid: userId,
      username: userName,
      isAdmin: isAdmin,
    });
  } else {
    // No valid cookies found, render without auth info
    console.log("No valid auth cookies found");
    res.render("index", {});
  }
}

// User Sign-up
function renderSignUpPage(req, res) {
  res.render("signup");
}

function signUpUser(req, res) {
  const { name, address, email, mobile, password } = req.body;
  connection.query(
    "INSERT INTO users (user_name, user_address, user_email, user_password, user_mobileno) VALUES (?, ?, ?, ?, ?)",
    [name, address, email, password, mobile],
    function (error, results) {
      if (error) {
        console.log(error);
      } else {
        res.render("signin");
      }
    }
  );
}

// User Sign-in
function renderSignInPage(req, res) {
  res.render("signin");
}

function signInUser(req, res) {
  const { email, password } = req.body;
  connection.query(
    "SELECT user_id, user_name, user_email, user_password FROM users WHERE user_email = ?",
    [email],
    function (error, results) {
      if (error || !results.length || results[0].user_password !== password) {
        res.render("signin");
      } else {
        const { user_id, user_name } = results[0];

        // Set cookies with explicit options that ensure they're sent with all requests
        res.cookie("cookuid", user_id, {
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          httpOnly: true,
          path: "/", // CRITICAL: This ensures the cookie is sent with all requests
          sameSite: "lax",
        });

        res.cookie("cookuname", user_name, {
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          httpOnly: true,
          path: "/", // CRITICAL: This ensures the cookie is sent with all requests
          sameSite: "lax",
        });

        // Add a user type cookie to simplify identification
        res.cookie("usertype", "user", {
          maxAge: 24 * 60 * 60 * 1000,
          httpOnly: true,
          path: "/",
          sameSite: "lax",
        });

        res.redirect("/homepage");
      }
    }
  );
}

// Render Home Page
function renderHomePage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;

  // Early check for missing cookies - redirect immediately
  if (!userId || !userName) {
    return res.redirect("/signin");
  }

  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        connection.query("SELECT * FROM menu", function (error, results) {
          if (!error) {
            res.render("homepage", {
              username: userName,
              userid: userId,
              items: results,
            });
          }
        });
      } else {
        // Change render to redirect for proper URL change
        return res.redirect("/signin");
      }
    }
  );
}

// Render Cart Page
function renderCart(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        res.render("cart", {
          username: userName,
          userid: userId,
          items: citemdetails,
          item_count: item_in_cart,
        });
      } else {
        res.render("signin");
      }
    }
  );
}

// Update Cart
function updateCart(req, res) {
  const cartItems = req.body.cart || [];
  const cartItemCount = req.body.item_count || 0;

  // Clear previous cart contents
  citemdetails = [];

  // Use Set to ensure uniqueness
  const uniqueItems = [...new Set(cartItems)];

  // If there are no items in cart, reset and return
  if (uniqueItems.length === 0) {
    item_in_cart = 0;
    return res.status(200).send({ success: true });
  }

  // Function to fetch details of items in the cart
  getItemDetails(uniqueItems, uniqueItems.length);

  // Set the item count based on client value
  item_in_cart = cartItemCount;

  return res.status(200).send({ success: true });
}

// Function to fetch details of items in the cart
let citems = [];
let citemdetails = [];
let item_in_cart = 0;
function getItemDetails(citems, size) {
  // Clear previous items
  citemdetails = [];

  // Use a counter to ensure we've processed all items
  let processed = 0;

  citems.forEach((item) => {
    connection.query(
      "SELECT * FROM menu WHERE item_id = ?",
      [item],
      function (error, results_item) {
        if (!error && results_item.length) {
          citemdetails.push(results_item[0]);
        }

        processed++;
        if (processed === citems.length) {
          // All items processed
          item_in_cart = size;
        }
      }
    );
  });
}

// Render Checkout Page
function renderCheckoutPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const { itemid, quantity, subprice } = req.body; // Get submitted cart data

  console.log("Checkout - Received Body:", req.body);
  console.log("Checkout - Auth Check:", { userId, userName });

  // Early check for missing cookies - redirect immediately
  if (!userId || !userName) {
    console.log("Checkout - Missing auth cookies, redirecting to signin");
    return res.redirect("/signin");
  }

  // Validate submitted data
  if (
    !itemid ||
    !quantity ||
    !subprice ||
    !Array.isArray(itemid) ||
    !Array.isArray(quantity) ||
    !Array.isArray(subprice) ||
    itemid.length !== quantity.length ||
    itemid.length !== subprice.length
  ) {
    console.log("Checkout - Invalid or missing cart data in body");
    // Redirect back to cart if data is invalid
    return res.redirect("/cart");
  }

  connection.query(
    "SELECT user_id, user_name, user_address AS address, user_mobileno AS contact FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, userResults) {
      if (error) {
        console.log("Checkout - DB Error (User Query):", error);
        return res.redirect("/signin");
      }

      if (!userResults || userResults.length === 0) {
        console.log("Checkout - User not found in DB");
        return res.redirect("/signin");
      }

      // Fetch item details based on submitted item IDs
      const placeHolders = itemid.map(() => "?").join(",");
      const query = `SELECT item_id, item_name, item_price FROM menu WHERE item_id IN (${placeHolders})`;

      connection.query(query, itemid, (err, itemDetailsResults) => {
        if (err) {
          console.log("Checkout - DB Error (Item Query):", err);
          return res.redirect("/cart");
        }

        // Map database results for easy lookup
        const itemDetailsMap = new Map();
        itemDetailsResults.forEach((item) => {
          itemDetailsMap.set(item.item_id.toString(), item);
        });

        // Construct the items array for the checkout page, including quantity and calculated subtotal
        const checkoutItems = itemid
          .map((id, index) => {
            const details = itemDetailsMap.get(id.toString());
            const qty = parseInt(quantity[index], 10);
            if (details && !isNaN(qty) && qty > 0) {
              return {
                item_id: id,
                item_name: details.item_name,
                item_price: details.item_price, // Price per single item
                quantity: qty,
                subtotal: details.item_price * qty, // Use calculated subtotal based on quantity
              };
            }
            return null; // Filter out invalid items/quantities later
          })
          .filter((item) => item !== null); // Remove null entries

        if (checkoutItems.length === 0) {
          console.log("Checkout - No valid items to checkout");
          return res.redirect("/cart"); // Redirect if no valid items remain
        }

        // Calculate total item count for display (sum of quantities)
        const totalItemCount = checkoutItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        );

        // Render checkout page with user details and the structured cart items
        res.render("checkout", {
          username: userName,
          userid: userId,
          user: userResults[0],
          items: checkoutItems, // Pass the structured items with quantity and subtotal
          item_count: totalItemCount, // Pass the total quantity of items
        });
      });
    }
  );
}

// Process Payment
function processPayment(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const paymentMethod = req.body.paymentMethod;

  // --- START: Determine Delivery Address ---
  const paypalAddress = req.body.paypalShippingAddress; // Address potentially provided by PayPal
  const formAddress = req.body.address || req.body.newDeliveryAddress; // Address from COD form or PayPal fallback
  let deliveryAddress = ""; // Initialize

  if (
    paymentMethod === "PayPal" &&
    paypalAddress &&
    paypalAddress.trim() !== ""
  ) {
    // Priority 1: Use PayPal address if available for PayPal payments
    console.log("Using shipping address provided by PayPal.");
    deliveryAddress = paypalAddress.trim();
  } else if (formAddress && formAddress.trim() !== "") {
    // Priority 2: Use address from form (for COD, or as PayPal fallback)
    console.log("Using shipping address from form.");
    deliveryAddress = formAddress.trim();
  }
  // --- END: Determine Delivery Address ---

  const paymentId = req.body.paymentId || null; // For PayPal transactions

  let itemid_data_accessor, quantity_data_accessor, subprice_data_accessor;

  if (paymentMethod === "PayPal") {
    // For PayPal, data is sent via FormData and keys are like 'itemid[]'
    itemid_data_accessor = req.body["itemid[]"];
    quantity_data_accessor = req.body["quantity[]"];
    subprice_data_accessor = req.body["subprice[]"];
  } else {
    // For COD (and potentially others using standard form submission with name="foo[]"),
    // bodyParser.urlencoded({ extended: true }) parses 'foo[]' into req.body.foo
    itemid_data_accessor = req.body.itemid;
    quantity_data_accessor = req.body.quantity;
    subprice_data_accessor = req.body.subprice;
  }

  console.log("Processing payment:", {
    paymentMethod,
    paymentId,
    deliveryAddress,
  }); // Log the final address being used
  console.log("Payment Body:", req.body);

  // Check if authentication is valid
  if (!userId || !userName) {
    console.log("Payment Processing - Not authenticated");
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }

  // Ensure item data are arrays (handle single item case)
  const itemIds = Array.isArray(itemid_data_accessor)
    ? itemid_data_accessor
    : itemid_data_accessor
    ? [itemid_data_accessor]
    : [];
  const quantities = Array.isArray(quantity_data_accessor)
    ? quantity_data_accessor
    : quantity_data_accessor
    ? [quantity_data_accessor]
    : [];
  const subprices = Array.isArray(subprice_data_accessor)
    ? subprice_data_accessor
    : subprice_data_accessor
    ? [subprice_data_accessor]
    : [];

  // Validate address - ensure we have one either from PayPal or the form
  if (!deliveryAddress || deliveryAddress.trim() === "") {
    console.log("Payment Processing - Missing address");
    return res
      .status(400)
      .json({ success: false, message: "Delivery address is required" });
  }

  // Basic validation of received arrays (use the ensured array versions)
  if (
    !itemIds ||
    !quantities ||
    !subprices ||
    itemIds.length !== quantities.length ||
    itemIds.length !== subprices.length ||
    itemIds.length === 0
  ) {
    console.log("Payment Processing - Invalid item data arrays");
    // Return JSON for both PayPal and COD if data is invalid
    return res
      .status(400)
      .json({ success: false, message: "Invalid order data" });
  }

  // Calculate total amount for the order and validate items
  let totalAmount = 0;
  const validItems = []; // Store items with valid data

  // Use the ensured array versions for iteration
  for (let i = 0; i < itemIds.length; i++) {
    const qty = parseInt(quantities[i], 10);
    // Subprice from client is already qty * price, we use it for totalAmount calculation
    // but will fetch the actual price per item later for order_items table.
    const clientSubtotal = parseFloat(subprices[i]);
    if (
      !isNaN(qty) &&
      qty > 0 &&
      !isNaN(clientSubtotal) &&
      clientSubtotal > 0
    ) {
      totalAmount += clientSubtotal;
      validItems.push({
        id: itemIds[i], // Use itemIds array
        qty: qty,
        // We don't store clientSubtotal here, will calculate based on fetched price
      });
    } else {
      console.warn(
        `Skipping invalid item data at index ${i}: qty=${quantities[i]}, subprice=${subprices[i]}` // Use quantities/subprices arrays
      );
    }
  }

  const currDate = new Date();

  // Start Database Transaction
  connection.beginTransaction((err) => {
    if (err) {
      console.error("Transaction Begin Error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error starting transaction",
      });
    }

    // 1. Insert into orders table
    const orderQuery =
      "INSERT INTO orders (user_id, order_datetime, total_amount, payment_method, payment_id, delivery_address, order_status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"; // Added payment_status field

    let initialPaymentStatus = "Unpaid"; // Default for COD or if PayPal status is not 'COMPLETED'
    if (paymentMethod === "PayPal") {
      // req.body.status comes from PayPal onApprove: formData.append('status', orderData.status);
      if (req.body.status === "COMPLETED") {
        initialPaymentStatus = "Paid";
      } else {
        // If PayPal payment wasn't 'COMPLETED', mark as 'Failed' or handle as per your business logic
        initialPaymentStatus = "Failed";
      }
    }

    const orderValues = [
      userId,
      currDate,
      totalAmount,
      paymentMethod,
      paymentId,
      deliveryAddress,
      "Pending", // Initial order_status
      initialPaymentStatus, // Initial payment_status
    ];

    connection.query(orderQuery, orderValues, (error, orderResult) => {
      if (error) {
        console.error("Error inserting into orders table:", error);
        return connection.rollback(() => {
          res
            .status(500)
            .json({ success: false, message: "Error saving order header" });
        });
      }

      const newOrderId = orderResult.insertId;
      console.log(`Order created with ID: ${newOrderId}`);

      // 2. Prepare to insert into order_items table
      const itemPromises = validItems.map((item) => {
        return new Promise((resolve, reject) => {
          // Fetch the current price from the menu for accuracy and storage
          connection.query(
            "SELECT item_price FROM menu WHERE item_id = ?",
            [item.id],
            (priceError, priceResult) => {
              if (priceError || priceResult.length === 0) {
                console.error(
                  `Error fetching price for item ${item.id}:`,
                  priceError || "Item not found"
                );
                // Reject the promise to trigger rollback
                return reject(
                  new Error(`Could not verify price for item ID ${item.id}`)
                );
              }

              const pricePerItem = priceResult[0].item_price;
              // Calculate the subtotal based on fetched price and quantity
              const calculatedSubtotal = item.qty * pricePerItem;

              const itemQuery =
                "INSERT INTO order_items (order_id, item_id, quantity, price_per_item, subtotal) VALUES (?, ?, ?, ?, ?)";
              const itemValues = [
                newOrderId,
                item.id,
                item.qty,
                pricePerItem, // Store the price per item at time of order
                calculatedSubtotal, // Store the calculated subtotal
              ];

              connection.query(itemQuery, itemValues, (itemError) => {
                if (itemError) {
                  console.error(
                    `Error inserting order item ${item.id} for order ${newOrderId}:`,
                    itemError
                  );
                  // Reject the promise to trigger rollback
                  return reject(itemError);
                }
                // Resolve the promise for this item
                resolve();
              });
            }
          );
        });
      });

      // Execute all item insertions concurrently within the transaction
      Promise.all(itemPromises)
        .then(() => {
          // All items inserted successfully, now commit the transaction
          connection.commit((commitError) => {
            if (commitError) {
              console.error("Transaction Commit Error:", commitError);
              // Rollback if commit fails
              return connection.rollback(() => {
                res.status(500).json({
                  success: false,
                  message: "Error finalizing order commit",
                });
              });
            }

            console.log(
              `Order ${newOrderId} processed and committed successfully.`
            );
            // Clear cart (assuming global cart state is still relevant, though ideally it shouldn't be)
            // Consider sending a message to the client to clear its local cart state instead
            citems = [];
            citemdetails = [];
            item_in_cart = 0;

            // Respond based on payment method AFTER successful commit
            if (paymentMethod === "PayPal") {
              console.log("PayPal payment successful, returning JSON");
              return res
                .status(200)
                .json({ success: true, redirectUrl: "/confirmation" });
            } else {
              console.log(
                "COD payment successful, redirecting to confirmation"
              );
              // Redirect only after successful commit for COD
              return res.redirect("/confirmation");
            }
          });
        })
        .catch((itemInsertError) => {
          // Rollback if any item insertion promise was rejected
          console.error(
            "Error inserting one or more order items:",
            itemInsertError
          );
          return connection.rollback(() => {
            // Send a generic error message
            res.status(500).json({
              success: false,
              message: "Error saving order details. Order cancelled.",
            });
          });
        });
    });
  });
}

// Render Confirmation Page
function renderConfirmationPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        res.render("confirmation", { username: userName, userid: userId });
      } else {
        res.render("signin");
      }
    }
  );
}

app.get("/confirmation", function (req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;

  if (userId && userName) {
    res.render("confirmation", { username: userName, userid: userId });
  } else {
    res.redirect("/signin");
  }
});

// Render My Orders Page
function renderMyOrdersPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;

  // Check authentication
  if (!userId || !userName) {
    console.log("My Orders - Not authenticated, redirecting to signin");
    return res.redirect("/signin");
  }

  // 1. Fetch user details
  connection.query(
    "SELECT user_id, user_name, user_address, user_email, user_mobileno FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, userResults) {
      if (error || userResults.length === 0) {
        console.error(
          "My Orders - Error fetching user or user not found:",
          error
        );
        // If user details can't be fetched, redirect to signin
        return res.redirect("/signin");
      }

      const userDetails = userResults[0];

      // 2. Fetch the user's orders
      const ordersQuery =
        "SELECT * FROM orders WHERE user_id = ? ORDER BY order_datetime DESC";
      connection.query(ordersQuery, [userId], (orderError, orders) => {
        if (orderError) {
          console.error("My Orders - Error fetching orders:", orderError);
          // Render the page with an error message or empty orders list
          return res.render("orders", {
            username: userName,
            userid: userId,
            userDetails: userDetails,
            orders: [], // Pass empty array on error
            item_count: item_in_cart, // Assuming item_in_cart is still relevant for nav
            error: "Could not load your orders.",
          });
        }

        if (orders.length === 0) {
          // No orders found, render the page with an empty list
          return res.render("orders", {
            username: userName,
            userid: userId,
            userDetails: userDetails,
            orders: [],
            item_count: item_in_cart,
          });
        }

        // 3. Fetch items for each order
        const orderItemPromises = orders.map((order) => {
          return new Promise((resolve, reject) => {
            const itemsQuery = `
              SELECT
                oi.quantity,
                oi.price_per_item,
                oi.subtotal,
                m.item_name,
                m.item_img
              FROM order_items oi
              JOIN menu m ON oi.item_id = m.item_id
              WHERE oi.order_id = ?
            `;
            connection.query(
              itemsQuery,
              [order.order_id],
              (itemError, items) => {
                if (itemError) {
                  console.error(
                    `My Orders - Error fetching items for order ${order.order_id}:`,
                    itemError
                  );
                  // Reject if items for an order can't be fetched
                  return reject(itemError);
                }
                // Attach the fetched items to the order object
                order.items = items;
                resolve(order); // Resolve with the order object now containing items
              }
            );
          });
        });

        // 4. Wait for all item queries to complete
        Promise.all(orderItemPromises)
          .then((ordersWithItems) => {
            // All orders now have their items attached
            res.render("orders", {
              username: userName,
              userid: userId,
              userDetails: userDetails,
              orders: ordersWithItems, // Pass the complete structure
              item_count: item_in_cart,
            });
          })
          .catch((fetchItemsError) => {
            console.error(
              "My Orders - Error processing order items:",
              fetchItemsError
            );
            // Render with an error if any item query failed
            res.render("orders", {
              username: userName,
              userid: userId,
              userDetails: userDetails,
              orders: [], // Pass empty array on error
              item_count: item_in_cart,
              error: "Could not load details for all orders.",
            });
          });
      });
    }
  );
}

// Render Settings Page
function renderSettingsPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        res.render("settings", {
          username: userName,
          userid: userId,
          item_count: item_in_cart,
        });
      }
    }
  );
}
// Update Address
function updateAddress(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const address = req.body.address;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        connection.query(
          "UPDATE users SET user_address = ? WHERE user_id = ?",
          [address, userId],
          function (error, results) {
            if (!error) {
              res.render("settings", {
                username: userName,
                userid: userId,
                item_count: item_in_cart,
              });
            }
          }
        );
      } else {
        res.render("signin");
      }
    }
  );
}

// Update Contact
function updateContact(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const mobileno = req.body.mobileno;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        connection.query(
          "UPDATE users SET user_mobileno = ? WHERE user_id = ?",
          [mobileno, userId],
          function (error, results) {
            if (!error) {
              res.render("settings", {
                username: userName,
                userid: userId,
                item_count: item_in_cart,
              });
            }
          }
        );
      } else {
        res.render("signin");
      }
    }
  );
}

// Update Password
function updatePassword(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const oldPassword = req.body.old_password;
  const newPassword = req.body.new_password;
  const confirmPassword = req.body.confirmPassword;

  // First check if new password and confirm password match
  if (newPassword !== confirmPassword) {
    return res.render("settings", {
      username: userName,
      userid: userId,
      item_count: item_in_cart,
      error: "New password and confirm password do not match",
    });
  }

  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ? AND user_password = ?",
    [userId, userName, oldPassword],
    function (error, results) {
      if (!error && results.length) {
        connection.query(
          "UPDATE users SET user_password = ? WHERE user_id = ?",
          [newPassword, userId],
          function (error, results) {
            if (!error) {
              return res.render("settings", {
                username: userName,
                userid: userId,
                item_count: item_in_cart,
                success: "Password updated successfully!",
              });
            } else {
              return res.render("settings", {
                username: userName,
                userid: userId,
                item_count: item_in_cart,
                error: "Database error. Please try again.",
              });
            }
          }
        );
      } else {
        // Don't redirect to signin, show error on current page
        return res.render("settings", {
          username: userName,
          userid: userId,
          item_count: item_in_cart,
          error: "Current password is incorrect",
        });
      }
    }
  );
}

// Admin Homepage
function renderAdminHomepage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_id = ? AND admin_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        res.render("admin/dashboard", {
          username: userName,
          userid: userId,
          items: results,
        });
      } else {
        res.render("admin/login");
      }
    }
  );
}

// Admin Log-in
function renderAdminLogInPage(req, res) {
  res.render("admin/login");
}

function adminLogIn(req, res) {
  const email = req.body.email;
  const password = req.body.password;
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_email = ? AND admin_password = ?",
    [email, password],
    function (error, results) {
      if (error || !results.length) {
        res.render("admin/login");
      } else {
        const { admin_id, admin_name } = results[0];

        // Set cookies with explicit options
        res.cookie("cookuid", admin_id, {
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          httpOnly: true,
          path: "/", // CRITICAL: This ensures the cookie is sent with all requests
          sameSite: "lax",
        });

        res.cookie("cookuname", admin_name, {
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          httpOnly: true,
          path: "/", // CRITICAL: This ensures the cookie is sent with all requests
          sameSite: "lax",
        });

        // Add a user type cookie to simplify identification
        res.cookie("usertype", "admin", {
          maxAge: 24 * 60 * 60 * 1000,
          httpOnly: true,
          path: "/",
          sameSite: "lax",
        });

        res.redirect("/admin/dashboard");
      }
    }
  );
}

// Render Add Food Page
function renderAddFoodPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_id = ? and admin_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        res.render("admin/addFood", {
          username: userName,
          userid: userId,
          items: results,
        });
      } else {
        res.render("admin/login");
      }
    }
  );
}

// Add Food
function addFood(req, res) {
  const {
    FoodName,
    FoodType,
    FoodCategory,
    FoodServing,
    FoodCalories,
    FoodPrice,
    FoodRating,
  } = req.body;
  if (!req.files) {
    return res.status(400).send("Image was not uploaded");
  }
  const fimage = req.files.FoodImg;
  const fimage_name = fimage.name;
  if (fimage.mimetype == "image/jpeg" || fimage.mimetype == "image/png") {
    fimage.mv("public/images/dish/" + fimage_name, function (err) {
      if (err) {
        return res.status(500).send(err);
      }
      connection.query(
        "INSERT INTO menu (item_name, item_type, item_category, item_serving, item_calories, item_price, item_rating, item_img) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          FoodName,
          FoodType,
          FoodCategory,
          FoodServing,
          FoodCalories,
          FoodPrice,
          FoodRating,
          fimage_name,
        ],
        function (error, results) {
          if (error) {
            console.log(error);
          } else {
            res.redirect("/admin/addFood");
          }
        }
      );
    });
  } else {
    res.render("admin/addFood");
  }
}

// Render Admin View and Dispatch Orders Page
function renderViewDispatchOrdersPage(req, res) {
  const adminId = req.cookies.cookuid;
  const adminName = req.cookies.cookuname;

  let redirectMessage = null;
  if (req.query.error) {
    redirectMessage = {
      type: "error",
      text: decodeURIComponent(req.query.error),
    };
  } else if (req.query.success) {
    redirectMessage = {
      type: "success",
      text: decodeURIComponent(req.query.success),
    };
  }

  connection.query(
    "SELECT admin_id FROM admin WHERE admin_id = ? AND admin_name = ?",
    [adminId, adminName],
    function (authError, authResults) {
      if (authError || authResults.length === 0) {
        console.error("Admin Orders - Auth failed:", authError);
        return res.redirect("/admin/login");
      }

      const ordersQuery = `
        SELECT
          o.order_id,
          o.user_id,
          u.user_name,
          o.order_datetime,
          o.total_amount,
          o.delivery_address,
          o.payment_method,
          o.order_status,
          o.payment_status 
        FROM orders o
        JOIN users u ON o.user_id = u.user_id
        ORDER BY o.order_datetime ASC
      `;

      connection.query(ordersQuery, (orderError, orders) => {
        if (orderError) {
          console.error("Admin Orders - Error fetching orders:", orderError);
          return res.render("admin/orders", {
            username: adminName,
            userid: adminId,
            orders: [],
            message: { type: "error", text: "Could not load orders." },
          });
        }

        if (orders.length === 0) {
          return res.render("admin/orders", {
            username: adminName,
            userid: adminId,
            orders: [],
            message: redirectMessage, // Show redirect message if any, even with no orders
          });
        }

        const orderItemPromises = orders.map((order) => {
          return new Promise((resolve, reject) => {
            const itemsQuery = `
              SELECT
                oi.quantity,
                oi.price_per_item,
                oi.subtotal,
                m.item_name
              FROM order_items oi
              JOIN menu m ON oi.item_id = m.item_id
              WHERE oi.order_id = ?
            `;
            connection.query(
              itemsQuery,
              [order.order_id],
              (itemError, items) => {
                if (itemError) {
                  console.error(
                    `Admin Orders - Error fetching items for order ${order.order_id}:`,
                    itemError
                  );
                  return reject(itemError);
                }
                order.items = items;
                resolve(order);
              }
            );
          });
        });

        Promise.all(orderItemPromises)
          .then((ordersWithItems) => {
            res.render("admin/orders", {
              username: adminName,
              userid: adminId,
              orders: ordersWithItems,
              message: redirectMessage, // Pass redirect message
            });
          })
          .catch((fetchItemsError) => {
            console.error(
              "Admin Orders - Error processing order items:",
              fetchItemsError
            );
            res.render("admin/orders", {
              username: adminName,
              userid: adminId,
              orders: [],
              message: {
                type: "error",
                text: "Could not load details for all orders.",
              },
            });
          });
      });
    }
  );
}

// Dispatch Orders
function dispatchOrders(req, res) {
  const adminId = req.cookies.cookuid;
  const adminName = req.cookies.cookuname; // For logging or further checks
  let orderIdsToDispatch = req.body.order_id_s;

  if (!Array.isArray(orderIdsToDispatch)) {
    orderIdsToDispatch = orderIdsToDispatch ? [orderIdsToDispatch] : [];
  }

  if (!orderIdsToDispatch || orderIdsToDispatch.length === 0) {
    console.log("Dispatch Orders - No orders selected");
    return res.redirect("/admin/orders?error=No%20orders%20selected");
  }

  const uniqueOrderIds = [...new Set(orderIdsToDispatch)];
  const currDate = new Date();

  connection.beginTransaction((err) => {
    if (err) {
      console.error("Dispatch Orders - Transaction Begin Error:", err);
      return res.redirect("/admin/orders?error=Database%20transaction%20error");
    }

    const dispatchPromises = uniqueOrderIds.map((orderId) => {
      return new Promise((resolve, reject) => {
        connection.query(
          "UPDATE orders SET order_status = 'Dispatched' WHERE order_id = ? AND order_status IN ('Pending', 'Processing')",
          [orderId],
          (updateError, updateResult) => {
            if (updateError) {
              console.error(
                `Dispatch Orders - Error updating status for order ${orderId}:`,
                updateError
              );
              return reject(updateError);
            }

            if (updateResult.affectedRows > 0) {
              // Order status successfully updated, now log it
              connection.query(
                "INSERT INTO order_dispatch (order_id, dispatch_datetime, dispatched_by_admin_id) VALUES (?, ?, ?)",
                [orderId, currDate, adminId],
                (insertError) => {
                  if (insertError) {
                    if (insertError.code === "ER_DUP_ENTRY") {
                      console.warn(
                        `Dispatch Orders - Order ${orderId} already marked as dispatched in log.`
                      );
                      resolve(); // Already logged, consider success for this order's dispatch logging
                    } else {
                      console.error(
                        `Dispatch Orders - Error inserting into dispatch log for order ${orderId}:`,
                        insertError
                      );
                      reject(insertError);
                    }
                  } else {
                    console.log(
                      `Dispatch Orders - Order ${orderId} marked as dispatched and logged.`
                    );
                    resolve();
                  }
                }
              );
            } else {
              // Order not updated (not in 'Pending'/'Processing', or already 'Dispatched', or not found)
              console.warn(
                `Dispatch Orders - Order ${orderId} not updated to Dispatched (state was not Pending/Processing or already Dispatched).`
              );
              resolve(); // Resolve to not block other dispatches, as this one didn't need/couldn't be actioned.
            }
          }
        );
      });
    });

    Promise.all(dispatchPromises)
      .then(() => {
        connection.commit((commitError) => {
          if (commitError) {
            console.error(
              "Dispatch Orders - Transaction Commit Error:",
              commitError
            );
            return connection.rollback(() => {
              res.redirect(
                "/admin/orders?error=Failed%20to%20commit%20dispatch%20transaction"
              );
            });
          }
          console.log("Dispatch Orders - Transaction committed successfully.");
          res.redirect(
            "/admin/orders?success=Orders%20dispatched%20successfully"
          );
        });
      })
      .catch((error) => {
        console.error(
          "Dispatch Orders - Error during dispatch operations:",
          error
        );
        connection.rollback(() => {
          res.redirect(
            `/admin/orders?error=Error%20dispatching%20orders:%20${encodeURIComponent(
              error.message
            )}`
          );
        });
      });
  });
}

// Admin: Set Order Status to Processing
function setOrderProcessing(req, res) {
  const order_id = req.params.order_id;
  const adminId = req.cookies.cookuid;
  const adminName = req.cookies.cookuname;

  if (!adminId || !adminName) {
    return res.redirect("/admin/login");
  }

  connection.query(
    "SELECT admin_id FROM admin WHERE admin_id = ? AND admin_name = ?",
    [adminId, adminName],
    function (authError, authResults) {
      if (authError || authResults.length === 0) {
        console.error(
          "Admin Action (Set Processing) - Auth failed:",
          authError
        );
        return res.redirect("/admin/login");
      }

      connection.query(
        "UPDATE orders SET order_status = 'Processing' WHERE order_id = ? AND order_status = 'Pending'",
        [order_id],
        function (error, results) {
          if (error) {
            console.error(
              `Error updating order ${order_id} to Processing:`,
              error
            );
            // Consider sending an error message to the admin page
          } else if (results.affectedRows > 0) {
            console.log(
              `Order ${order_id} status updated to Processing by admin ${adminId}`
            );
          } else {
            console.log(
              `Order ${order_id} not updated (not Pending or not found).`
            );
          }
          res.redirect("/admin/orders");
        }
      );
    }
  );
}

// Admin: Set Order Status to Delivered (and handle COD)
function setOrderDeliveredAdmin(req, res) {
  const order_id = req.params.order_id;
  const adminId = req.cookies.cookuid;
  const adminName = req.cookies.cookuname;

  if (!adminId || !adminName) {
    return res.redirect("/admin/login");
  }

  connection.query(
    "SELECT admin_id FROM admin WHERE admin_id = ? AND admin_name = ?",
    [adminId, adminName],
    function (authError, authResults) {
      if (authError || authResults.length === 0) {
        console.error("Admin Action (Set Delivered) - Auth failed:", authError);
        return res.redirect("/admin/login");
      }

      connection.query(
        "SELECT payment_method, order_status FROM orders WHERE order_id = ?",
        [order_id],
        function (fetchError, orderResults) {
          if (fetchError || orderResults.length === 0) {
            console.error(
              `Error fetching order ${order_id} for delivery update or order not found:`,
              fetchError
            );
            return res.redirect("/admin/orders");
          }

          const order = orderResults[0];
          if (order.order_status !== "Dispatched") {
            console.log(
              `Order ${order_id} cannot be marked delivered by admin (not Dispatched).`
            );
            // Optionally, add a query param to show a message to admin
            return res.redirect("/admin/orders");
          }

          let updateQuery;
          let queryParams = [order_id];

          if (order.payment_method === "COD") {
            updateQuery =
              "UPDATE orders SET order_status = 'Delivered', payment_status = 'Paid' WHERE order_id = ? AND order_status = 'Dispatched'";
          } else {
            updateQuery =
              "UPDATE orders SET order_status = 'Delivered' WHERE order_id = ? AND order_status = 'Dispatched'";
          }

          connection.query(
            updateQuery,
            queryParams,
            function (updateError, results) {
              if (updateError) {
                console.error(
                  `Error updating order ${order_id} to Delivered by admin:`,
                  updateError
                );
              } else if (results.affectedRows > 0) {
                console.log(
                  `Order ${order_id} status updated to Delivered by admin ${adminId}`
                );
              } else {
                console.log(
                  `Order ${order_id} not updated to Delivered (already Delivered or not found).`
                );
              }
              res.redirect("/admin/orders");
            }
          );
        }
      );
    }
  );
}

// User: Mark Order as Delivered
function setOrderDeliveredUser(req, res) {
  const order_id = req.params.order_id;
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname; // For logging or further checks if needed

  if (!userId || !userName) {
    // User not logged in
    return res.redirect("/signin");
  }

  connection.query(
    "UPDATE orders SET order_status = 'Delivered' WHERE order_id = ? AND user_id = ? AND order_status = 'Dispatched'",
    [order_id, userId],
    function (error, results) {
      if (error) {
        console.error(
          `User ${userId} error marking order ${order_id} as Delivered:`,
          error
        );
        // Consider sending an error message to the user's orders page
      } else if (results.affectedRows > 0) {
        console.log(`Order ${order_id} marked as Delivered by user ${userId}`);
      } else {
        console.log(
          `Order ${order_id} not updated by user ${userId} (not Dispatched, not owned, or not found).`
        );
      }
      res.redirect("/orders");
    }
  );
}

// Render Admin Change Price Page
function renderChangePricePage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_id = ? and admin_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        connection.query("SELECT * FROM menu", function (error, results) {
          if (!error) {
            res.render("admin/changePrice", {
              username: userName,
              items: results,
            });
          }
        });
      } else {
        res.render("admin/login");
      }
    }
  );
}

// Change Price
function changePrice(req, res) {
  const item_name = req.body.item_name;
  const new_food_price = req.body.NewFoodPrice;

  // Validate inputs
  if (item_name === "None") {
    return res.status(400).send("Please select a valid food item");
  }

  // Convert and validate price as integer
  const price = parseInt(new_food_price, 10);

  // Check if input is a valid integer
  if (isNaN(price) || price < 0 || price.toString() !== new_food_price.trim()) {
    return res.status(400).send("Please enter a valid positive integer price");
  }

  connection.query(
    "SELECT item_name FROM menu WHERE item_name = ?",
    [item_name],
    function (error, results1) {
      if (error) {
        console.error("Database error checking item:", error);
        return res.status(500).send("Database error checking item");
      }

      if (!results1.length) {
        return res.status(404).send("Food item not found");
      }

      connection.query(
        "UPDATE menu SET item_price = ? WHERE item_name = ?",
        [price, item_name],
        function (error, results2) {
          if (error) {
            console.error("Database error updating price:", error);
            return res.status(500).send("Error updating price");
          }

          // Redirect with success message
          return res.redirect(
            "/admin/dashboard?message=Price updated successfully"
          );
        }
      );
    }
  );
}

// Logout
function logout(req, res) {
  // Save the user type before clearing cookies
  const adminId = req.cookies.cookuid;
  const adminName = req.cookies.cookuname;

  // Clear the authentication cookies
  res.clearCookie("cookuid");
  res.clearCookie("cookuname");

  // Check if this was an admin user
  if (req.originalUrl === "/admin/logout") {
    return res.redirect("/admin/login");
  }

  // Default to user signin
  return res.redirect("/signin");
}

module.exports = app;
