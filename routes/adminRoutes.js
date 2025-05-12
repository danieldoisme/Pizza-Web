const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const isAdmin = require("../middleware/isAdmin");

// --- Login/Logout Routes (No Auth Required) ---
router.get("/login", (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.cookies.cookuid && req.cookies.cookuname) {
    return res.redirect("/admin/dashboard");
  }
  res.render("admin/login", {
    error: req.query.error || null,
    message: req.query.message || null,
  });
});

router.post("/login", async (req, res) => {
  try {
    const { admin_email, admin_password } = req.body;
    const connection = req.app.get("dbConnection");

    if (!admin_email || !admin_password) {
      return res.redirect(
        "/admin/login?error=" +
          encodeURIComponent("Email and password are required.")
      );
    }

    const query = "SELECT * FROM admin WHERE admin_email = ?";
    connection.query(query, [admin_email], async (err, results) => {
      if (err) {
        console.error("Error querying admin:", err);
        return res.redirect(
          "/admin/login?error=" +
            encodeURIComponent("Server error during login.")
        );
      }

      if (results.length === 0) {
        return res.redirect(
          "/admin/login?error=" +
            encodeURIComponent("Invalid email or password.")
        );
      }

      const admin = results[0];
      const match = await bcrypt.compare(admin_password, admin.admin_password);

      if (match) {
        res.cookie("cookuid", admin.admin_id.toString(), {
          httpOnly: true,
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000, // Example: 1 day
        });
        res.cookie("cookuname", admin.admin_name, {
          httpOnly: true,
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000, // Example: 1 day
        });
        res.redirect("/admin/dashboard");
      } else {
        return res.redirect(
          "/admin/login?error=" +
            encodeURIComponent("Invalid email or password.")
        );
      }
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.redirect(
      "/admin/login?error=" +
        encodeURIComponent("An unexpected error occurred.")
    );
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("cookuid");
  res.clearCookie("cookuname");
  res.redirect(
    "/admin/login?message=" + encodeURIComponent("Logged out successfully.")
  );
});

// --- Apply isAdmin Middleware to All Protected Routes Below ---
router.use(isAdmin);

// --- Protected Admin Routes ---
router.get("/dashboard", (req, res) => {
  // You can fetch any data needed for the dashboard here
  res.render("admin/dashboard", {
    adminName: req.cookies.cookuname,
    message: req.query.message || null,
    error: req.query.error || null,
  });
});

// --- Food Management ---
router.get("/addFood", (req, res) => {
  // Assumes you have a views/admin/addFood.ejs
  res.render("admin/addFood", {
    adminName: req.cookies.cookuname,
    message: req.query.message || null,
    error: req.query.error || null,
  });
});

router.post("/addFood", (req, res) => {
  const connection = req.app.get("dbConnection");
  const {
    item_name,
    item_type,
    item_category,
    item_serving,
    item_calories,
    item_price,
    item_description_long,
    item_img,
  } = req.body;

  // Basic validation
  if (
    !item_name ||
    !item_type ||
    !item_category ||
    !item_serving ||
    !item_calories ||
    !item_price ||
    !item_img
  ) {
    return res.redirect(
      "/admin/addFood?error=" + encodeURIComponent("All fields are required.")
    );
  }

  const query =
    "INSERT INTO menu (item_name, item_type, item_category, item_serving, item_calories, item_price, item_description_long, item_img) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  connection.query(
    query,
    [
      item_name,
      item_type,
      item_category,
      item_serving,
      parseInt(item_calories),
      parseFloat(item_price),
      item_description_long,
      item_img,
    ],
    (err, result) => {
      if (err) {
        console.error("Error adding food item:", err);
        return res.redirect(
          "/admin/addFood?error=" +
            encodeURIComponent("Database error adding food.")
        );
      }
      res.redirect(
        "/admin/dashboard?message=" +
          encodeURIComponent("Food item added successfully!")
      );
    }
  );
});

router.get("/changePrice", (req, res) => {
  const connection = req.app.get("dbConnection");
  // Fetch menu items to populate a dropdown or list in the view
  connection.query(
    "SELECT item_id, item_name, item_price FROM menu ORDER BY item_name ASC",
    (err, items) => {
      if (err) {
        console.error("Error fetching menu items for price change:", err);
        return res.redirect(
          "/admin/dashboard?error=" +
            encodeURIComponent("Could not load items.")
        );
      }
      // Assumes you have a views/admin/changePrice.ejs
      res.render("admin/changePrice", {
        adminName: req.cookies.cookuname,
        items: items,
        message: req.query.message || null,
        error: req.query.error || null,
      });
    }
  );
});

router.post("/changePrice", (req, res) => {
  const connection = req.app.get("dbConnection");
  const { item_id, new_price } = req.body;

  if (
    !item_id ||
    new_price === undefined ||
    new_price === null ||
    isNaN(parseFloat(new_price))
  ) {
    return res.redirect(
      "/admin/changePrice?error=" +
        encodeURIComponent("Item ID and a valid new price are required.")
    );
  }

  const query = "UPDATE menu SET item_price = ? WHERE item_id = ?";
  connection.query(
    query,
    [parseFloat(new_price), parseInt(item_id)],
    (err, result) => {
      if (err) {
        console.error("Error changing price:", err);
        return res.redirect(
          "/admin/changePrice?error=" +
            encodeURIComponent("Database error changing price.")
        );
      }
      if (result.affectedRows === 0) {
        return res.redirect(
          "/admin/changePrice?error=" + encodeURIComponent("Item not found.")
        );
      }
      res.redirect(
        "/admin/changePrice?message=" +
          encodeURIComponent("Price updated successfully!")
      );
    }
  );
});

// --- Order Management ---
// Combined route for viewing orders.
// You might want separate views or tabs for pending, processing, dispatched, delivered orders.
router.get("/orders", (req, res) => {
  const connection = req.app.get("dbConnection");
  // Fetch orders, potentially join with user details or order items
  // Example: Fetch all orders, newest first
  const query = `
    SELECT o.*, u.user_name 
    FROM orders o 
    LEFT JOIN users u ON o.user_id = u.user_id 
    ORDER BY o.order_date DESC`;
  connection.query(query, (err, orders) => {
    if (err) {
      console.error("Error fetching orders:", err);
      return res.redirect(
        "/admin/dashboard?error=" + encodeURIComponent("Could not load orders.")
      );
    }
    // Assumes you have a views/admin/orders.ejs (or dispatchOrders.ejs)
    res.render("admin/orders", {
      adminName: req.cookies.cookuname,
      orders: orders,
      message: req.query.message || null,
      error: req.query.error || null,
    });
  });
});

// This GET route is redundant if /orders serves the same purpose.
// router.get("/dispatch_orders", (req, res) => { /* ... same as GET /orders ... */ });

// POST /dispatch_orders (and potentially POST /orders if it's meant for the same action)
// This route seems to be for a general "dispatch" action, but the specific status changes
// are handled by more granular routes below. Consider what "dispatching" means here.
// If it's just changing status to "Dispatched", use set-processing or set-delivered.
// For now, let's assume it's a general update or a placeholder.
router.post("/dispatch_orders", (req, res) => {
  // Or router.post("/orders", ...)
  const connection = req.app.get("dbConnection");
  const { order_id_to_dispatch, new_status } = req.body; // Example fields

  if (!order_id_to_dispatch || !new_status) {
    return res.redirect(
      "/admin/orders?error=" +
        encodeURIComponent("Order ID and new status required for dispatch.")
    );
  }
  // This is a generic example. You'll need specific logic.
  // For example, to add to order_dispatch table:
  // const adminId = req.cookies.cookuid;
  // const dispatchQuery = "INSERT INTO order_dispatch (order_id, dispatched_by_admin_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE dispatched_by_admin_id = VALUES(dispatched_by_admin_id), dispatch_datetime = NOW()";
  // connection.query(dispatchQuery, [order_id_to_dispatch, adminId], (err, result) => { ... });

  const updateQuery = "UPDATE orders SET order_status = ? WHERE order_id = ?";
  connection.query(
    updateQuery,
    [new_status, order_id_to_dispatch],
    (err, result) => {
      if (err) {
        console.error("Error dispatching order:", err);
        return res.redirect(
          "/admin/orders?error=" +
            encodeURIComponent("Database error dispatching order.")
        );
      }
      res.redirect(
        "/admin/orders?message=" +
          encodeURIComponent(
            `Order ${order_id_to_dispatch} status updated to ${new_status}.`
          )
      );
    }
  );
});

// Route for admin to set order to Processing
router.post("/order/set-processing/:order_id", (req, res) => {
  const connection = req.app.get("dbConnection");
  const order_id = req.params.order_id;
  const adminId = req.cookies.cookuid; // For logging or dispatch table

  const query =
    "UPDATE orders SET order_status = 'Processing' WHERE order_id = ?";
  connection.query(query, [order_id], (err, result) => {
    if (err) {
      console.error("Error setting order to processing:", err);
      return res.redirect(
        "/admin/orders?error=" + encodeURIComponent("Database error.")
      );
    }
    // Optionally, add to order_dispatch table if "Processing" implies dispatch prep
    // const dispatchQuery = "INSERT INTO order_dispatch (order_id, dispatched_by_admin_id, dispatch_datetime) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE dispatched_by_admin_id = VALUES(dispatched_by_admin_id), dispatch_datetime = NOW()";
    // connection.query(dispatchQuery, [order_id, adminId], (dispatchErr, dispatchResult) => { ... });
    res.redirect(
      "/admin/orders?message=" +
        encodeURIComponent(`Order ${order_id} set to Processing.`)
    );
  });
});

// Route for admin to set order to Delivered
router.post("/order/set-delivered-admin/:order_id", (req, res) => {
  const connection = req.app.get("dbConnection");
  const order_id = req.params.order_id;
  const adminId = req.cookies.cookuid;

  // Update order status and delivery date
  const query =
    "UPDATE orders SET order_status = 'Delivered', delivery_date = NOW() WHERE order_id = ?";
  connection.query(query, [order_id], (err, result) => {
    if (err) {
      console.error("Error setting order to delivered:", err);
      return res.redirect(
        "/admin/orders?error=" + encodeURIComponent("Database error.")
      );
    }
    // Ensure entry in order_dispatch if not already there
    const dispatchQuery =
      "INSERT INTO order_dispatch (order_id, dispatched_by_admin_id, dispatch_datetime) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE dispatched_by_admin_id = VALUES(dispatched_by_admin_id), dispatch_datetime = NOW()";
    connection.query(
      dispatchQuery,
      [order_id, adminId],
      (dispatchErr, dispatchResult) => {
        if (dispatchErr) {
          console.error("Error updating order_dispatch table:", dispatchErr);
          // Decide if this is a critical error to halt the redirect
        }
        res.redirect(
          "/admin/orders?message=" +
            encodeURIComponent(`Order ${order_id} set to Delivered.`)
        );
      }
    );
  });
});

// Route for admin to mark COD order as paid
router.post("/order/mark-paid-cod/:order_id", (req, res) => {
  const connection = req.app.get("dbConnection");
  const order_id = req.params.order_id;

  // Ensure it's a COD order before marking paid, or just update payment_status
  const query =
    "UPDATE orders SET payment_status = 'Paid' WHERE order_id = ? AND payment_method = 'COD'"; // Or remove payment_method check if admin can mark any as paid
  connection.query(query, [order_id], (err, result) => {
    if (err) {
      console.error("Error marking COD order as paid:", err);
      return res.redirect(
        "/admin/orders?error=" + encodeURIComponent("Database error.")
      );
    }
    if (result.affectedRows === 0) {
      return res.redirect(
        "/admin/orders?error=" +
          encodeURIComponent("Order not found or not a COD order.")
      );
    }
    res.redirect(
      "/admin/orders?message=" +
        encodeURIComponent(`Order ${order_id} (COD) marked as Paid.`)
    );
  });
});

module.exports = router;
