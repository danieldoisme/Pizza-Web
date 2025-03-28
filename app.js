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
  next();
});

// Set up routes
app.use("/", indexRoutes);
app.use("/admin", adminRoutes);

// Routes for User Sign-up, Sign-in, Home Page, Cart, Checkout, Order Confirmation, My Orders, and Settings
app.get("/", renderIndexPage);
app.get("/signup", renderSignUpPage);
app.post("/signup", signUpUser);
app.get("/signin", renderSignInPage);
app.post("/signin", signInUser);
app.get("/homepage", renderHomePage);
app.get("/cart", renderCart);
app.post("/cart", updateCart);
app.post("/checkout", checkout);
app.get("/confirmation", renderConfirmationPage);
app.get("/orders", renderMyOrdersPage);
app.get("/settings", renderSettingsPage);
app.post("/address", updateAddress);
app.post("/contact", updateContact);
app.post("/password", updatePassword);
app.get("/logout", logout);

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

// Index Page
function renderIndexPage(req, res) {
  res.render("index");
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
        res.cookie("cookuid", user_id);
        res.cookie("cookuname", user_name);
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

// Checkout
function checkout(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        const { itemid, quantity, subprice } = req.body;
        const userid = userId;
        const currDate = new Date();

        if (
          Array.isArray(itemid) &&
          Array.isArray(quantity) &&
          Array.isArray(subprice)
        ) {
          itemid.forEach((item, index) => {
            if (quantity[index] != 0) {
              connection.query(
                "INSERT INTO orders (order_id, user_id, item_id, quantity, price, datetime) VALUES (?, ?, ?, ?, ?, ?)",
                [
                  uuidv4(),
                  userid,
                  item,
                  quantity[index],
                  subprice[index] * quantity[index],
                  currDate,
                ],
                function (error, results, fields) {
                  if (error) {
                    console.log(error);
                    res.sendStatus(500);
                  }
                }
              );
            }
          });
        } else {
          if (quantity != 0) {
            connection.query(
              "INSERT INTO orders (order_id, user_id, item_id, quantity, price, datetime) VALUES (?, ?, ?, ?, ?, ?)",
              [
                uuidv4(),
                userid,
                itemid,
                quantity,
                subprice * quantity,
                currDate,
              ],
              function (error, results, fields) {
                if (error) {
                  console.log(error);
                  res.sendStatus(500);
                }
              }
            );
          }
        }

        citems = [];
        citemdetails = [];
        item_in_cart = 0;
        getItemDetails(citems, 0);
        res.render("confirmation", { username: userName, userid: userId });
      } else {
        res.render("signin");
      }
    }
  );
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

// Render My Orders Page
function renderMyOrdersPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT user_id, user_name, user_address, user_email, user_mobileno FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, resultUser) {
      if (!error && resultUser.length) {
        connection.query(
          "SELECT order_dispatch.order_id, order_dispatch.user_id, order_dispatch.quantity, order_dispatch.price, order_dispatch.datetime, menu.item_id, menu.item_name, menu.item_img FROM order_dispatch, menu WHERE order_dispatch.user_id = ? AND menu.item_id = order_dispatch.item_id ORDER BY order_dispatch.datetime DESC",
          [userId],
          function (error, results) {
            if (!error) {
              res.render("orders", {
                userDetails: resultUser,
                items: results,
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
        res.cookie("cookuid", admin_id);
        res.cookie("cookuname", admin_name);
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
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  connection.query(
    "SELECT admin_id, admin_name FROM admin WHERE admin_id = ? and admin_name = ?",
    [userId, userName],
    function (error, results) {
      if (!error && results.length) {
        connection.query(
          "SELECT * FROM orders ORDER BY datetime",
          function (error, results2) {
            res.render("admin/orders", {
              username: userName,
              userid: userId,
              orders: results2,
            });
          }
        );
      } else {
        res.render("admin/login");
      }
    }
  );
}

// Dispatch Orders
function dispatchOrders(req, res) {
  const totalOrder = req.body.order_id_s;
  if (!totalOrder || totalOrder.length === 0) {
    return res.render("admin/orders", {
      username: req.cookies.cookuname,
      orders: [],
      error: "No orders selected for dispatch",
    });
  }

  const unique = [...new Set(totalOrder)];
  const promises = [];

  // Begin transaction
  connection.beginTransaction(function (err) {
    if (err) {
      console.error("Transaction error:", err);
      return res.status(500).send("Database transaction error");
    }

    // Process each order in the transaction
    unique.forEach((orderId) => {
      const promise = new Promise((resolve, reject) => {
        connection.query(
          "SELECT * FROM orders WHERE order_id = ?",
          [orderId],
          function (error, resultsItem) {
            if (error || !resultsItem.length) {
              return reject(error || new Error("Order not found"));
            }

            const order = resultsItem[0];
            const currDate = new Date();

            connection.query(
              "INSERT INTO order_dispatch (order_id, user_id, item_id, quantity, price, datetime) VALUES (?, ?, ?, ?, ?, ?)",
              [
                order.order_id,
                order.user_id,
                order.item_id,
                order.quantity,
                order.price,
                currDate,
              ],
              function (error) {
                if (error) return reject(error);

                connection.query(
                  "DELETE FROM orders WHERE order_id = ?",
                  [order.order_id],
                  function (error) {
                    if (error) return reject(error);
                    resolve();
                  }
                );
              }
            );
          }
        );
      });
      promises.push(promise);
    });

    // Wait for all operations to complete
    Promise.all(promises)
      .then(() => {
        // Commit the transaction
        connection.commit(function (err) {
          if (err) {
            return connection.rollback(function () {
              console.error("Commit error:", err);
              res.status(500).send("Failed to commit transaction");
            });
          }

          // Only after successful commit, fetch updated orders and render page
          connection.query(
            "SELECT * FROM orders ORDER BY datetime",
            function (error, results) {
              if (error) {
                console.error("Query error after commit:", error);
                return res.status(500).send("Error fetching updated orders");
              }

              res.render("admin/orders", {
                username: req.cookies.cookuname,
                orders: results,
                success: "Orders dispatched successfully",
              });
            }
          );
        });
      })
      .catch((error) => {
        // Rollback the transaction on any error
        connection.rollback(function () {
          console.error("Operation error:", error);
          res.status(500).send("Error dispatching orders: " + error.message);
        });
      });
  });
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
