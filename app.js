// Loading and Using Modules Required
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
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
  res.locals.setOrderPaidCodAdmin = setOrderPaidCodAdmin;
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
app.get("/confirmation", renderConfirmationPage);
app.get("/orders", renderMyOrdersPage);
app.get("/settings", renderSettingsPage);
app.post("/address", updateAddress);
app.post("/contact", updateContact);
app.post("/password", updatePassword);
app.get("/logout", logout);
app.post("/checkout", renderCheckoutPage);
app.post("/checkout/process-payment", isAuthenticated, processPayment);

// Route for user to mark order as delivered
app.post(
  "/order/mark-delivered/:order_id",
  isAuthenticated,
  setOrderDeliveredUser
);

// New route for item detail page
app.get("/item/:itemId", renderItemDetailPage);
// New route for submitting item rating
app.post("/item/:itemId/rate", isAuthenticated, submitItemRating);

// Search Route
app.get("/search", isAuthenticated, renderSearchResultsPage);

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
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const userType = req.cookies.usertype;
  const itemCount = req.cookies.item_count || 0; // Ensure item_count is fetched

  console.log("=============== INDEX PAGE ==============");
  console.log("Cookies received:", req.cookies);
  console.log("Auth cookies:", { userId, userName, userType });
  console.log("Cookie header:", req.headers.cookie);
  console.log("=========================================");

  if (userId && userName && userType) {
    // User is logged in
    if (userType === "admin") {
      res.render("index", {
        userid: userId,
        username: userName,
        isAdmin: true,
        itemCount: itemCount,
        pageType: "index", // Added pageType
      });
    } else {
      res.render("index", {
        userid: userId,
        username: userName,
        isAdmin: false,
        itemCount: itemCount,
        pageType: "index", // Added pageType
      });
    }
  } else {
    // User is not logged in
    res.render("index", {
      userid: null,
      username: null,
      isAdmin: false,
      itemCount: itemCount,
      pageType: "index", // Added pageType
    });
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
    function (error) {
      if (error) {
        console.log(error);
        return res.status(500).send("Error signing up.");
      }
      res.render("signin");
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

        res.cookie("cookuid", user_id, {
          maxAge: 24 * 60 * 60 * 1000,
          httpOnly: true,
          path: "/",
          sameSite: "lax",
        });

        res.cookie("cookuname", user_name, {
          maxAge: 24 * 60 * 60 * 1000,
          httpOnly: true,
          path: "/",
          sameSite: "lax",
        });

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
  const itemCount = req.cookies.item_count || 0; // Get item count

  if (!userId || !userName) {
    return res.redirect("/signin");
  }

  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, userResults) {
      if (error) {
        console.error("Error fetching user for homepage:", error);
        return res.status(500).send("Error loading homepage.");
      }
      if (userResults.length) {
        connection.query("SELECT * FROM menu", function (error, menuResults) {
          if (error) {
            console.error("Error fetching menu for homepage:", error);
            return res.status(500).send("Error loading menu.");
          }
          res.render("homepage", {
            username: userName,
            userid: userId,
            items: menuResults,
            item_count: itemCount, // Pass item count to homepage
          });
        });
      } else {
        // User details from cookie not found in DB, likely invalid session
        res.clearCookie("cookuid");
        res.clearCookie("cookuname");
        res.clearCookie("usertype");
        res.clearCookie("item_count");
        return res.redirect("/signin");
      }
    }
  );
}

// Render Cart Page
function renderCart(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const itemCount = req.cookies.item_count || 0; // Get item_count from cookies

  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (error) {
        console.error("Error fetching user for cart:", error);
        return res.status(500).send("Error loading cart.");
      }
      if (results.length) {
        // citemdetails should ideally be populated based on current cart state,
        // not just a global variable if cart can be modified elsewhere.
        // For now, assuming citemdetails is correctly managed by updateCart.
        res.render("cart", {
          username: userName,
          userid: userId,
          items: citemdetails,
          item_count: itemCount, // Pass item_count
        });
      } else {
        res.clearCookie("cookuid");
        res.clearCookie("cookuname");
        res.clearCookie("usertype");
        res.clearCookie("item_count");
        res.redirect("/signin");
      }
    }
  );
}

// Update Cart
function updateCart(req, res) {
  const cartItems = req.body.cart || [];
  const cartItemCount = req.body.item_count || 0;

  citemdetails = [];

  const uniqueItems = [...new Set(cartItems)];

  if (uniqueItems.length === 0) {
    item_in_cart = 0;
    return res.status(200).send({ success: true });
  }

  getItemDetails(uniqueItems, uniqueItems.length);

  item_in_cart = cartItemCount;

  return res.status(200).send({ success: true });
}

// Function to fetch details of items in the cart
let citemdetails = [];
let item_in_cart = 0;
function getItemDetails(citems, size) {
  citemdetails = [];

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
  const { itemid, quantity, subprice } = req.body;
  const itemCount = req.cookies.item_count || 0; // Get item_count

  if (!userId || !userName) {
    return res.redirect("/signin");
  }

  connection.query(
    "SELECT user_id, user_name, user_address AS address, user_mobileno AS contact FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, userResults) {
      if (error || userResults.length === 0) {
        console.error(
          "Error fetching user for checkout or user not found:",
          error
        );
        return res.redirect("/signin"); // Or an error page
      }

      // Ensure itemid is an array for the IN clause
      const itemIdsForQuery = Array.isArray(itemid)
        ? itemid
        : itemid
        ? [itemid]
        : [];

      if (itemIdsForQuery.length === 0) {
        // No items to checkout, redirect to cart or show message
        return res.render("checkout", {
          username: userName,
          userid: userId,
          address: userResults[0].address,
          contact: userResults[0].contact,
          items: [], // No items
          item_count: itemCount,
          checkoutError: "No items selected for checkout.",
        });
      }

      const query =
        "SELECT item_id, item_name, item_price FROM menu WHERE item_id IN (?)";
      connection.query(query, [itemIdsForQuery], (err, itemDetailsResults) => {
        if (err) {
          console.error("Error fetching item details for checkout:", err);
          return res.redirect("/cart?error=fetch_failed");
        }

        const itemDetailsMap = new Map();
        itemDetailsResults.forEach((item) => {
          itemDetailsMap.set(item.item_id.toString(), item);
        });

        const checkoutItems = itemid // Use original itemid from req.body for mapping
          .map((id, index) => {
            const details = itemDetailsMap.get(id.toString());
            const qty =
              quantity && quantity[index] ? parseInt(quantity[index], 10) : 0;
            if (details && !isNaN(qty) && qty > 0) {
              const itemPrice = parseFloat(details.item_price); // Ensure item_price is a float
              return {
                item_id: id,
                item_name: details.item_name,
                item_price: itemPrice,
                quantity: qty,
                subtotal: itemPrice * qty, // Calculation will be float
              };
            }
            return null;
          })
          .filter((item) => item !== null);

        if (checkoutItems.length === 0 && itemid && itemid.length > 0) {
          console.warn("Checkout attempted with invalid item data:", {
            itemid,
            quantity,
          });
          return res.redirect("/cart?error=invalid_checkout_items");
        }

        res.render("checkout", {
          username: userName,
          userid: userId,
          address: userResults[0].address,
          contact: userResults[0].contact,
          items: checkoutItems,
          item_count: itemCount,
        });
      });
    }
  );
}

// Process Payment
function processPayment(req, res) {
  const rawUserId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const paymentMethod = req.body.paymentMethod; // COD or PayPal

  if (!rawUserId || !userName) {
    console.error(
      "Authentication failed: User ID or Name missing from cookies."
    );
    return res.status(401).json({
      success: false,
      message: "Authentication required. User ID or Name missing from cookies.",
    });
  }

  const userId = parseInt(rawUserId, 10);
  if (isNaN(userId)) {
    console.error(
      "Invalid User ID in cookie after parsing. Raw User ID:",
      rawUserId
    );
    return res
      .status(401)
      .json({ success: false, message: "Invalid User ID format in cookie." });
  }
  console.log(`Processing payment for user_id: ${userId}`);

  const paypalAddress = req.body.paypalShippingAddress;
  const addressSelection = req.body.addressSelection;
  const existingUserAddress = req.body.address;
  const newDeliveryAddressInput = req.body.newDeliveryAddress;
  let determinedAddress = "";

  if (paymentMethod === "PayPal") {
    if (paypalAddress && paypalAddress.trim() !== "") {
      determinedAddress = paypalAddress.trim();
    }
  }

  if (determinedAddress === "") {
    if (
      addressSelection === "new" &&
      newDeliveryAddressInput &&
      newDeliveryAddressInput.trim() !== ""
    ) {
      determinedAddress = newDeliveryAddressInput.trim();
    } else if (existingUserAddress && existingUserAddress.trim() !== "") {
      determinedAddress = existingUserAddress.trim();
    }
  }

  const deliveryAddress = determinedAddress;

  if (!deliveryAddress || deliveryAddress.trim() === "") {
    return res
      .status(400)
      .json({ success: false, message: "Delivery address is required" });
  }

  let itemid_data_accessor, quantity_data_accessor;

  if (paymentMethod === "PayPal") {
    itemid_data_accessor = req.body["itemid[]"];
    quantity_data_accessor = req.body["quantity[]"];
    // subprice_data_accessor is no longer used for total_amount calculation
  } else {
    itemid_data_accessor = req.body.itemid;
    quantity_data_accessor = req.body.quantity;
    // subprice_data_accessor is no longer used for total_amount calculation
  }

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

  if (!itemIds.length || itemIds.length !== quantities.length) {
    return res.status(400).json({
      success: false,
      message: "Invalid order data. Item details are missing or mismatched.",
    });
  }

  const itemsToProcess = itemIds
    .map((id, index) => {
      const qty = parseInt(quantities[index], 10);
      if (id && !isNaN(qty) && qty > 0) {
        return { id: id, qty: qty };
      }
      return null;
    })
    .filter((item) => item !== null);

  if (itemsToProcess.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No valid items to process." });
  }

  const currDate = new Date();

  // Verify user_id exists before starting transaction
  connection.query(
    "SELECT user_id FROM users WHERE user_id = ?",
    [userId],
    (userErr, userResults) => {
      if (userErr) {
        console.error("Database error verifying user:", userErr);
        return res.status(500).json({
          success: false,
          message: "Database error during user verification.",
        });
      }
      if (userResults.length === 0) {
        console.error(
          "User verification failed: User ID not found in database. User ID:",
          userId
        );
        return res.status(404).json({
          success: false,
          message: "User not found. Cannot create order.",
        });
      }

      // User verified, proceed to fetch item prices and calculate total
      const itemPricePromises = itemsToProcess.map((item) => {
        return new Promise((resolve, reject) => {
          connection.query(
            "SELECT item_price FROM menu WHERE item_id = ?",
            [item.id],
            (err, priceResults) => {
              if (err || priceResults.length === 0) {
                console.error(
                  `Error fetching price for item_id ${item.id} or item not found:`,
                  err || "Item not found"
                );
                return reject(
                  new Error(
                    `Could not fetch price for item ${item.id} or item does not exist.`
                  )
                );
              }
              const price_per_item = parseFloat(priceResults[0].item_price); // Ensure float
              resolve({
                item_id: item.id,
                quantity: item.qty,
                price_per_item: price_per_item,
                subtotal: price_per_item * item.qty, // Calculation will be float
              });
            }
          );
        });
      });

      Promise.all(itemPricePromises)
        .then((detailedOrderItems) => {
          const serverCalculatedTotalAmount = detailedOrderItems.reduce(
            (sum, item) => sum + item.subtotal, // item.subtotal is already float
            0
          );

          if (
            isNaN(serverCalculatedTotalAmount) ||
            !isFinite(serverCalculatedTotalAmount)
          ) {
            console.error(
              "Server calculated totalAmount is invalid. Value:",
              serverCalculatedTotalAmount
            );
            return res.status(500).json({
              success: false,
              message: "Error calculating total order amount on server.",
            });
          }

          connection.beginTransaction((transactionErr) => {
            if (transactionErr) {
              console.error(
                "Database error starting transaction:",
                transactionErr
              );
              return res.status(500).json({
                success: false,
                message: "Database error starting transaction.",
              });
            }

            const orderQuery =
              "INSERT INTO orders (user_id, order_date, total_amount, payment_method, shipping_address, order_status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?)";
            let initialPaymentStatus = "Unpaid"; // Default for COD
            if (paymentMethod === "PayPal") {
              initialPaymentStatus =
                req.body.status === "COMPLETED" ? "Paid" : "Failed";
            }

            const orderValues = [
              userId,
              currDate,
              parseFloat(serverCalculatedTotalAmount.toFixed(2)), // Ensure total_amount is stored as float
              paymentMethod,
              deliveryAddress,
              "Pending",
              initialPaymentStatus,
            ];

            console.log(
              "Attempting to save order header with query:",
              orderQuery
            );
            console.log("Order values to be inserted:", orderValues);

            connection.query(
              orderQuery,
              orderValues,
              (orderError, orderResult) => {
                if (orderError) {
                  console.error("MySQL error saving order header:", orderError);
                  return connection.rollback(() => {
                    res.status(500).json({
                      success: false,
                      message: "Error saving order header.",
                    });
                  });
                }

                const orderId = orderResult.insertId;
                console.log(`Order header saved with order_id: ${orderId}`);

                if (detailedOrderItems.length === 0) {
                  // This case should ideally be caught earlier, but as a safeguard:
                  console.warn(
                    "Order created with no items. Order ID:",
                    orderId
                  );
                  return connection.commit((commitErr) => {
                    if (commitErr) {
                      console.error(
                        "MySQL error committing empty order:",
                        commitErr
                      );
                      return connection.rollback(() => {
                        res.status(500).json({
                          success: false,
                          message: "Error finalizing order (commit).",
                        });
                      });
                    }
                    res.cookie("cart", "[]", {
                      httpOnly: true,
                      path: "/",
                      sameSite: "lax",
                    });
                    res.cookie("item_count", "0", {
                      httpOnly: true,
                      path: "/",
                      sameSite: "lax",
                    });
                    return res.json({
                      success: true,
                      orderId: orderId,
                      redirectUrl: `/confirmation?orderId=${orderId}`,
                    });
                  });
                }

                const orderItemsInsertQuery =
                  "INSERT INTO order_items (order_id, item_id, quantity, price_per_item, subtotal) VALUES ?";
                const orderItemsValues = detailedOrderItems.map((item) => [
                  orderId,
                  item.item_id,
                  item.quantity,
                  parseFloat(item.price_per_item.toFixed(2)), // Ensure price_per_item is stored as float
                  parseFloat(item.subtotal.toFixed(2)), // Ensure subtotal is stored as float
                ]);

                connection.query(
                  orderItemsInsertQuery,
                  [orderItemsValues],
                  (itemsError) => {
                    if (itemsError) {
                      console.error(
                        "MySQL error saving order items:",
                        itemsError
                      );
                      return connection.rollback(() => {
                        res.status(500).json({
                          success: false,
                          message: "Error saving order items.",
                        });
                      });
                    }

                    connection.commit((commitErr) => {
                      if (commitErr) {
                        console.error(
                          "MySQL error committing transaction:",
                          commitErr
                        );
                        return connection.rollback(() => {
                          res.status(500).json({
                            success: false,
                            message: "Error finalizing order (commit).",
                          });
                        });
                      }
                      console.log(
                        `Order ${orderId} and its items committed successfully.`
                      );
                      res.cookie("cart", "[]", {
                        httpOnly: true,
                        path: "/",
                        sameSite: "lax",
                      });
                      res.cookie("item_count", "0", {
                        httpOnly: true,
                        path: "/",
                        sameSite: "lax",
                      });
                      return res.json({
                        success: true,
                        orderId: orderId,
                        redirectUrl: `/confirmation?orderId=${orderId}`,
                      });
                    });
                  }
                );
              }
            );
          });
        })
        .catch((priceProcessingError) => {
          console.error(
            "Error processing item prices or calculating total:",
            priceProcessingError
          );
          return res.status(500).json({
            success: false,
            message:
              priceProcessingError.message || "Error processing order items.",
          });
        });
    }
  );
}

// Render Confirmation Page
function renderConfirmationPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const itemCount = req.cookies.item_count || 0; // Get item_count

  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (error) {
        console.error("Error fetching user for confirmation:", error);
        return res.status(500).send("Error loading confirmation page.");
      }
      if (results.length) {
        res.render("confirmation", {
          username: userName,
          userid: userId,
          item_count: itemCount,
        });
      } else {
        res.clearCookie("cookuid");
        res.clearCookie("cookuname");
        res.clearCookie("usertype");
        res.clearCookie("item_count");
        res.redirect("/signin");
      }
    }
  );
}

// Render My Orders Page
function renderMyOrdersPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;

  if (!userId || !userName) {
    return res.redirect("/signin");
  }

  connection.query(
    "SELECT user_id, user_name, user_address, user_email, user_mobileno FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, userResults) {
      if (error || userResults.length === 0) {
        return res.redirect("/signin");
      }

      const userDetails = userResults[0];

      const ordersQuery =
        "SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC"; // Corrected order_datetime to order_date
      connection.query(ordersQuery, [userId], (orderError, orders) => {
        if (orderError) {
          console.error("SQL Error in renderMyOrdersPage:", orderError); // Added console.error
          return res.render("orders", {
            username: userName,
            userid: userId,
            userDetails: userDetails,
            orders: [],
            item_count: item_in_cart,
            error: "Could not load your orders.",
          });
        }

        if (orders.length === 0) {
          return res.render("orders", {
            username: userName,
            userid: userId,
            userDetails: userDetails,
            orders: [],
            item_count: item_in_cart,
          });
        }

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
            res.render("orders", {
              username: userName,
              userid: userId,
              userDetails: userDetails,
              orders: ordersWithItems,
              item_count: item_in_cart,
            });
          })
          .catch(() => {
            res.render("orders", {
              username: userName,
              userid: userId,
              userDetails: userDetails,
              orders: [],
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
  const itemCount = req.cookies.item_count || 0; // Get item_count

  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (error) {
        console.error("Error fetching user for settings:", error);
        return res.status(500).send("Error loading settings page.");
      }
      if (results.length) {
        res.render("settings", {
          username: userName,
          userid: userId,
          item_count: itemCount, // Pass item_count
        });
      } else {
        res.clearCookie("cookuid");
        res.clearCookie("cookuname");
        res.clearCookie("usertype");
        res.clearCookie("item_count");
        res.redirect("/signin");
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
          function (error) {
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
          function (error) {
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
          function (error) {
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
      if (error || !results || results.length === 0) {
        return res.redirect("/admin/login");
      }
      res.render("admin/dashboard", {
        username: userName,
        userid: userId,
      });
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
      if (error || !results || results.length === 0) {
        return res.render("admin/login", { error: "Invalid credentials" });
      }
      const adminId = results[0].admin_id;
      const adminName = results[0].admin_name;

      res.cookie("cookuid", adminId, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
      });
      res.cookie("cookuname", adminName, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
      });
      res.cookie("usertype", "admin", {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
      });
      res.redirect("/admin/dashboard");
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
      if (error || !results || results.length === 0) {
        return res.redirect("/admin/login");
      }
      res.render("admin/addFood", { username: userName, userid: userId });
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
    FoodPrice, // This will be parsed to float
    FoodDescriptionLong, // Added for detailed description
  } = req.body;
  if (!req.files || !req.files.FoodImg) {
    return res.status(400).send("Image was not uploaded");
  }
  const fimage = req.files.FoodImg;
  const fimage_name = fimage.name;

  // Ensure FoodPrice is a float
  const foodPriceFloat = parseFloat(FoodPrice);
  if (isNaN(foodPriceFloat) || foodPriceFloat < 0) {
    return res.redirect("/admin/addFood?error=InvalidFoodPrice");
  }

  if (
    fimage.mimetype == "image/jpeg" ||
    fimage.mimetype == "image/png" ||
    fimage.mimetype == "image/webp" ||
    fimage.mimetype == "image/jpg"
  ) {
    fimage.mv("public/images/dish/" + fimage_name, function (err) {
      if (err) {
        console.error("Error moving image:", err);
        return res.status(500).send(err);
      }
      // item_rating and total_ratings will have default values (0.00 and 0) from the DB schema
      connection.query(
        "INSERT INTO menu (item_name, item_type, item_category, item_serving, item_calories, item_price, item_img, item_description_long) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          FoodName,
          FoodType,
          FoodCategory,
          FoodServing,
          FoodCalories,
          foodPriceFloat, // Use the parsed float value
          fimage_name,
          FoodDescriptionLong, // Added
        ],
        function (error) {
          if (error) {
            console.log("Error adding food to DB:", error);
            res.redirect("/admin/addFood?error=FailedToAddFood");
          } else {
            res.redirect("/admin/addFood?success=FoodAdded");
          }
        }
      );
    });
  } else {
    res.redirect("/admin/addFood?error=InvalidImageFormat");
  }
}

// Render Item Detail Page
function renderItemDetailPage(req, res) {
  const itemId = req.params.itemId;
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const itemCount = req.cookies.item_count || 0; // Get item_count

  const itemQuery = "SELECT * FROM menu WHERE item_id = ?";
  const ratingsQuery = `
    SELECT ir.rating_id, ir.item_id, ir.user_id, ir.rating_value, ir.review_text, ir.rating_date, u.user_name 
    FROM item_ratings ir 
    JOIN users u ON ir.user_id = u.user_id 
    WHERE ir.item_id = ? 
    ORDER BY ir.rating_date DESC
  `;

  connection.query(itemQuery, [itemId], (err, itemResults) => {
    if (err) {
      console.error("Error fetching item:", err);
      return res
        .status(500)
        .render("error", { message: "Error fetching item details." }); // Assuming you have an error.ejs
    }
    if (itemResults.length === 0) {
      return res.status(404).render("error", { message: "Item not found." }); // Assuming you have an error.ejs
    }
    const item = itemResults[0];

    connection.query(ratingsQuery, [itemId], (ratingsErr, ratingsResults) => {
      if (ratingsErr) {
        console.error("Error fetching ratings:", ratingsErr);
        // Render the page anyway, but indicate ratings couldn't be loaded
        return res.render("itemDetail", {
          // This EJS file will be created in Phase 3
          item: item,
          ratings: [],
          averageRating: item.item_rating,
          totalRatings: item.total_ratings,
          username: userName,
          userid: userId,
          item_count: itemCount,
          error: "Could not load ratings at this time.",
          success: req.query.success, // For success messages from rating submission
        });
      }
      res.render("itemDetail", {
        // This EJS file will be created in Phase 3
        item: item,
        ratings: ratingsResults,
        averageRating: item.item_rating,
        totalRatings: item.total_ratings,
        username: userName,
        userid: userId,
        item_count: itemCount, // Pass item_count
        error: req.query.error,
        success: req.query.success,
      });
    });
  });
}

// Submit Item Rating (ensure user is authenticated via middleware)
function submitItemRating(req, res) {
  const itemId = req.params.itemId;
  const userId = req.cookies.cookuid;
  const { rating_value, review_text } = req.body;

  // Basic validation, though client-side and more robust server-side might be added
  const parsedRating = parseInt(rating_value, 10);
  if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res.redirect(`/item/${itemId}?error=InvalidRatingValue`);
  }

  connection.beginTransaction((transactionErr) => {
    if (transactionErr) {
      console.error("Transaction Begin Error:", transactionErr);
      return res.redirect(`/item/${itemId}?error=DatabaseError`);
    }

    const upsertRatingQuery = `
      INSERT INTO item_ratings (item_id, user_id, rating_value, review_text, rating_date) 
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE 
        rating_value = VALUES(rating_value), 
        review_text = VALUES(review_text), 
        rating_date = CURRENT_TIMESTAMP
    `;
    connection.query(
      upsertRatingQuery,
      [itemId, userId, parsedRating, review_text || null],
      (upsertErr, result) => {
        if (upsertErr) {
          return connection.rollback(() => {
            console.error("Error inserting/updating rating:", upsertErr);
            res.redirect(`/item/${itemId}?error=RatingSubmissionFailed`);
          });
        }

        const updateMenuQuery = `
        UPDATE menu
        SET 
          total_ratings = (SELECT COUNT(*) FROM item_ratings WHERE item_id = ?),
          item_rating = (SELECT AVG(rating_value) FROM item_ratings WHERE item_id = ?)
        WHERE item_id = ?
      `;
        connection.query(
          updateMenuQuery,
          [itemId, itemId, itemId],
          (updateErr) => {
            if (updateErr) {
              return connection.rollback(() => {
                console.error("Error updating menu rating:", updateErr);
                res.redirect(`/item/${itemId}?error=MenuUpdateFailed`);
              });
            }

            connection.commit((commitErr) => {
              if (commitErr) {
                return connection.rollback(() => {
                  console.error("Transaction Commit Error:", commitErr);
                  res.redirect(`/item/${itemId}?error=DatabaseCommitError`);
                });
              }
              res.redirect(`/item/${itemId}?success=RatingSubmitted`);
            });
          }
        );
      }
    );
  });
}

// Render Search Results Page
function renderSearchResultsPage(req, res) {
  const query = req.query.query || "";
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const userType = req.cookies.usertype;
  const itemCount = req.cookies.item_count || 0;

  // Determine if user is admin for header/nav partial rendering
  const isAdmin = userType === "admin";

  if (!query.trim()) {
    // If search query is empty, redirect to homepage or show a message
    // For now, let's render the search page with a message or an empty result set
    return res.render("searchResults", {
      query: "", // Pass empty query
      results: [], // No results
      username: userName,
      userid: userId,
      isAdmin: isAdmin,
      item_count: itemCount,
      searchMessage: "Please enter a search term.", // Optional message
    });
  }

  const searchQuery = `
    SELECT * FROM menu 
    WHERE LOWER(item_name) LIKE LOWER(?) 
       OR LOWER(item_description_long) LIKE LOWER(?) 
       OR LOWER(item_category) LIKE LOWER(?)
  `;
  const searchTerm = `%${query}%`;

  connection.query(
    searchQuery,
    [searchTerm, searchTerm, searchTerm],
    (error, results) => {
      if (error) {
        console.error("Error performing search:", error);
        return res.status(500).render("searchResults", {
          query: query,
          results: [],
          username: userName,
          userid: userId,
          isAdmin: isAdmin,
          item_count: itemCount,
          searchError: "An error occurred while searching. Please try again.",
        });
      }

      res.render("searchResults", {
        query: query,
        results: results,
        username: userName,
        userid: userId,
        isAdmin: isAdmin,
        item_count: itemCount,
      });
    }
  );
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  const userId = req.cookies.cookuid;
  if (!userId) {
    return res.redirect("/signin");
  }
  next();
}

// Render Admin View and Dispatch Orders Page
function renderViewDispatchOrdersPage(req, res) {
  const adminId = req.cookies.cookuid;
  const adminName = req.cookies.cookuname;
  const userType = req.cookies.usertype;

  if (!adminId || !adminName || userType !== "admin") {
    return res.redirect("/admin/login?error=Unauthorized Access");
  }

  const ordersQuery = `
    SELECT
      o.order_id,
      o.user_id,
      u.user_name,
      o.order_date,
      o.total_amount,
      o.order_status,
      o.payment_method,
      o.payment_status,
      o.shipping_address,
      o.notes,
      o.delivery_date
    FROM orders o
    JOIN users u ON o.user_id = u.user_id
    ORDER BY o.order_date DESC
  `;

  connection.query(ordersQuery, (error, orders) => {
    if (error) {
      console.error("SQL Error fetching orders for admin:", error);
      return res.render("admin/orders", {
        adminName: adminName,
        orders: [],
        error: "Failed to load orders data. Please try again later.",
        success: req.query.success,
      });
    }

    if (orders.length === 0) {
      return res.render("admin/orders", {
        adminName: adminName,
        orders: [],
        message: "No orders found.",
        success: req.query.success,
        error: req.query.error,
      });
    }

    const orderItemPromises = orders.map((order) => {
      return new Promise((resolve, reject) => {
        const itemsQuery = `
          SELECT
            oi.quantity,
            oi.price_per_item,
            oi.subtotal,
            m.item_name,
            m.item_img,
            m.item_id
          FROM order_items oi
          JOIN menu m ON oi.item_id = m.item_id
          WHERE oi.order_id = ?
        `;
        connection.query(itemsQuery, [order.order_id], (itemError, items) => {
          if (itemError) {
            console.error(
              `SQL Error fetching items for order ${order.order_id}:`,
              itemError
            );
            order.items = [];
            resolve(order);
            return;
          }
          order.items = items;
          resolve(order);
        });
      });
    });

    Promise.all(orderItemPromises)
      .then((ordersWithItems) => {
        res.render("admin/orders", {
          adminName: adminName,
          orders: ordersWithItems,
          success: req.query.success,
          error: req.query.error,
        });
      })
      .catch((err) => {
        console.error("Error processing order items for admin view:", err);
        res.render("admin/orders", {
          adminName: adminName,
          orders: orders,
          error: "Failed to load full item details for some orders.",
          success: req.query.success,
        });
      });
  });
}

// Dispatch Orders
function dispatchOrders(req, res) {
  const adminId = req.cookies.cookuid;
  const orderIdsToDispatch = req.body.order_id_s;

  if (!adminId || req.cookies.usertype !== "admin") {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (
    !orderIdsToDispatch ||
    !Array.isArray(orderIdsToDispatch) ||
    orderIdsToDispatch.length === 0
  ) {
    return res.redirect("/admin/orders?error=No+orders+selected+for+dispatch.");
  }

  connection.beginTransaction((transactionErr) => {
    if (transactionErr) {
      console.error("Transaction Begin Error for dispatch:", transactionErr);
      return res.redirect(
        "/admin/orders?error=Failed+to+start+dispatch+process."
      );
    }

    const dispatchPromises = orderIdsToDispatch.map((orderId) => {
      return new Promise((resolve, reject) => {
        connection.query(
          "SELECT order_status FROM orders WHERE order_id = ?",
          [orderId],
          (statusErr, statusResults) => {
            if (statusErr || statusResults.length === 0) {
              return reject({
                orderId: orderId,
                error: `Order ${orderId} not found or DB error.`,
              });
            }
            const currentStatus = statusResults[0].order_status;
            if (currentStatus !== "Pending" && currentStatus !== "Processing") {
              return resolve({
                orderId: orderId,
                skipped: true,
                message: `Order ${orderId} is already ${currentStatus}.`,
              });
            }

            connection.query(
              "UPDATE orders SET order_status = 'Dispatched' WHERE order_id = ? AND (order_status = 'Pending' OR order_status = 'Processing')",
              [orderId],
              (updateErr, updateResult) => {
                if (updateErr || updateResult.affectedRows === 0) {
                  return reject({
                    orderId: orderId,
                    error: `Failed to update status for order ${orderId}. May have been updated by another process.`,
                  });
                }

                connection.query(
                  "INSERT INTO order_dispatch (order_id, dispatched_by_admin_id, dispatch_datetime) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE dispatch_datetime = NOW(), dispatched_by_admin_id = VALUES(dispatched_by_admin_id)",
                  [orderId, adminId],
                  (dispatchErr) => {
                    if (dispatchErr) {
                      return reject({
                        orderId: orderId,
                        error: `Failed to record dispatch for order ${orderId}: ${dispatchErr.message}`,
                      });
                    }
                    resolve({
                      orderId: orderId,
                      success: true,
                      message: `Order ${orderId} dispatched.`,
                    });
                  }
                );
              }
            );
          }
        );
      });
    });

    Promise.all(dispatchPromises.map((p) => p.catch((e) => e)))
      .then((results) => {
        const successfulDispatches = results.filter((r) => r.success).length;
        const skippedOrders = results.filter((r) => r.skipped).length;
        const failedDispatches = results.filter((r) => r.error);

        if (failedDispatches.length > 0) {
          connection.rollback(() => {
            console.error("Dispatch Failures:", failedDispatches);
            let errorMsg = `Failed+to+dispatch+${failedDispatches.length}+order(s).`;
            res.redirect(`/admin/orders?error=${errorMsg}`);
          });
        } else {
          connection.commit((commitErr) => {
            if (commitErr) {
              connection.rollback(() => {
                console.error(
                  "Transaction Commit Error for dispatch:",
                  commitErr
                );
                res.redirect(
                  "/admin/orders?error=Failed+to+finalize+dispatch+operation."
                );
              });
            } else {
              let successMsg = `${successfulDispatches}+order(s)+successfully+dispatched.`;
              if (skippedOrders > 0)
                successMsg += `+${skippedOrders}+order(s)+were+skipped+(already+processed+or+not+applicable).`;
              res.redirect(`/admin/orders?success=${successMsg}`);
            }
          });
        }
      })
      .catch((overallErr) => {
        connection.rollback(() => {
          console.error(
            "Unexpected overall error in dispatch process:",
            overallErr
          );
          res.redirect(
            "/admin/orders?error=An+unexpected+error+occurred+during+dispatch."
          );
        });
      });
  });
}

// Admin: Set Order Status to Processing
function setOrderProcessing(req, res) {
  const orderId = req.params.order_id;
  const adminId = req.cookies.cookuid;

  if (!adminId || req.cookies.usertype !== "admin") {
    return res.redirect("/admin/login?error=Unauthorized");
  }
  const query =
    "UPDATE orders SET order_status = 'Processing' WHERE order_id = ? AND order_status = 'Pending'";
  connection.query(query, [orderId], (error, result) => {
    if (error) {
      console.error("Error updating order status to Processing:", error);
      return res.redirect("/admin/orders?error=Failed+to+update+order+status");
    }
    if (result.affectedRows === 0) {
      return res.redirect(
        "/admin/orders?error=Order+" +
          orderId +
          "+not+found+or+cannot+be+marked+as+processing+at+this+time."
      );
    }
    res.redirect(
      "/admin/orders?success=Order+" + orderId + "+marked+as+Processing"
    );
  });
}

// Admin: Set Order Status to Delivered (and handle COD)
function setOrderDeliveredAdmin(req, res) {
  const orderId = req.params.order_id;
  const adminId = req.cookies.cookuid;

  if (!adminId || req.cookies.usertype !== "admin") {
    return res.redirect("/admin/login?error=Unauthorized");
  }
  const query =
    "UPDATE orders SET order_status = 'Delivered', delivery_date = NOW() WHERE order_id = ? AND (order_status = 'Dispatched' OR order_status = 'Processing')";
  connection.query(query, [orderId], (error, result) => {
    if (error) {
      console.error("Error updating order status to Delivered:", error);
      return res.redirect("/admin/orders?error=Failed+to+update+order+status");
    }
    if (result.affectedRows === 0) {
      return res.redirect(
        "/admin/orders?error=Order+" +
          orderId +
          "+not+found+or+cannot+be+marked+as+delivered+from+its+current+status."
      );
    }
    res.redirect(
      "/admin/orders?success=Order+" + orderId + "+marked+as+Delivered"
    );
  });
}

// Admin: Mark COD Order as Paid
function setOrderPaidCodAdmin(req, res) {
  const orderId = req.params.order_id;
  const adminId = req.cookies.cookuid; // Assuming admin ID is stored in cookuid

  if (!adminId || req.cookies.usertype !== "admin") {
    return res.redirect("/admin/login?error=Unauthorized");
  }

  const query =
    "UPDATE orders SET payment_status = 'Paid' WHERE order_id = ? AND payment_method = 'COD' AND payment_status = 'Unpaid'";

  connection.query(query, [orderId], (error, result) => {
    if (error) {
      console.error(
        `Admin ${adminId} error marking COD order ${orderId} as Paid:`,
        error
      );
      return res.redirect(
        "/admin/orders?error=Failed+to+update+payment+status"
      );
    }
    if (result.affectedRows === 0) {
      // This could be because the order wasn't found, isn't COD, or was already Paid.
      return res.redirect(
        "/admin/orders?error=Order+" +
          orderId +
          "+not+found,+not+applicable+for+this+action,+or+already+updated."
      );
    }
    console.log(`Order ${orderId} (COD) marked as Paid by admin ${adminId}`);
    res.redirect("/admin/orders?success=Order+" + orderId + "+marked+as+Paid");
  });
}

// User: Mark Order as Delivered
function setOrderDeliveredUser(req, res) {
  const order_id = req.params.order_id;
  const userId = req.cookies.cookuid;

  if (!userId) {
    return res.redirect("/signin");
  }

  connection.query(
    "UPDATE orders SET order_status = 'Delivered', delivery_date = NOW() WHERE order_id = ? AND user_id = ? AND order_status = 'Dispatched'",
    [order_id, userId],
    function (error, results) {
      if (error) {
        console.error(
          `User ${userId} error marking order ${order_id} as Delivered:`,
          error
        );
      } else if (results.affectedRows > 0) {
        console.log(`Order ${order_id} marked as Delivered by user ${userId}`);
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

  if (item_name === "None") {
    return res.status(400).send("Please select a valid food item");
  }

  // Ensure the price is treated as a float
  const price = parseFloat(new_food_price);

  if (isNaN(price) || price < 0) {
    return res.status(400).send("Please enter a valid positive price");
  }

  connection.query(
    "SELECT item_name FROM menu WHERE item_name = ?",
    [item_name],
    function (error, results1) {
      if (error) {
        return res.status(500).send("Database error checking item");
      }

      if (!results1.length) {
        return res.status(404).send("Food item not found");
      }

      connection.query(
        // Ensure item_price is set as a float
        "UPDATE menu SET item_price = ? WHERE item_name = ?",
        [price, item_name],
        function (error) {
          if (error) {
            return res.status(500).send("Error updating price");
          }

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
  // const adminId = req.cookies.cookuid;

  res.clearCookie("cookuid");
  res.clearCookie("cookuname");
  res.clearCookie("usertype");

  if (req.originalUrl === "/admin/logout") {
    return res.redirect("/admin/login");
  }

  return res.redirect("/signin");
}

module.exports = app;
