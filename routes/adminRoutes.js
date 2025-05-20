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
    page: "dashboard",
  });
});

// --- Menu Management ---
// New Main Route for Menu Management Page
router.get("/menu", (req, res) => {
  const connection = req.app.get("dbConnection");

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10; // Default 10 items per page
  const offset = (page - 1) * limit;

  // Define allowed sortable columns to prevent SQL injection
  const allowedSortBy = [
    "item_id",
    "item_name",
    "item_type",
    "item_category",
    "item_price",
    "item_calories",
    "item_serving",
  ];
  let sortBy = req.query.sortBy || "item_name"; // Default sort by item_name
  if (!allowedSortBy.includes(sortBy)) {
    sortBy = "item_name"; // Fallback to default if invalid column is provided
  }

  let sortOrder = req.query.sortOrder || "ASC"; // Default sort order ASC
  if (sortOrder.toUpperCase() !== "ASC" && sortOrder.toUpperCase() !== "DESC") {
    sortOrder = "ASC"; // Fallback to default if invalid order
  }

  const countQuery = "SELECT COUNT(*) AS totalItems FROM menu";
  const dataQuery = `
    SELECT 
      item_id, item_name, item_type, item_category, item_price, 
      item_calories, item_serving, item_rating, total_ratings, 
      item_description_long
    FROM menu 
    ORDER BY ${connection.escapeId(sortBy)} ${
    sortOrder === "DESC" ? "DESC" : "ASC"
  }
    LIMIT ? 
    OFFSET ?`;

  connection.query(countQuery, (err, countResult) => {
    if (err) {
      console.error("Error fetching menu item count:", err);
      return res.redirect(
        "/admin/dashboard?error=" +
          encodeURIComponent("Could not load menu items.")
      );
    }

    const totalItems = countResult[0].totalItems;
    const totalPages = Math.ceil(totalItems / limit);

    connection.query(dataQuery, [limit, offset], (err, items) => {
      if (err) {
        console.error("Error fetching menu items for management:", err);
        return res.redirect(
          "/admin/dashboard?error=" +
            encodeURIComponent("Could not load menu items.")
        );
      }
      res.render("admin/menuManagement", {
        adminName: req.cookies.cookuname,
        items: items,
        message: req.query.message || null,
        error: req.query.error || null,
        page: "menu",
        currentPage: page,
        totalPages: totalPages,
        limit: limit,
        sortBy: sortBy,
        sortOrder: sortOrder,
        totalItems: totalItems,
      });
    });
  });
});

// Adapted POST /admin/addFood
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
  } = req.body;

  let imageBuffer = null;
  let imageMimeType = null;

  // Check if a file was uploaded (assuming the input field name is 'item_img')
  if (req.files && req.files.item_img) {
    // Changed from req.files.FoodImg
    const foodImage = req.files.item_img; // Changed from req.files.FoodImg
    imageBuffer = foodImage.data;
    imageMimeType = foodImage.mimetype;
  } else {
    return res.redirect(
      "/admin/menu?error=" + encodeURIComponent("Food image is required.")
    );
  }

  if (
    !item_name ||
    !item_type ||
    !item_category ||
    !item_serving ||
    !item_calories ||
    !item_price ||
    !imageBuffer
  ) {
    return res.redirect(
      "/admin/menu?error=" +
        encodeURIComponent("All fields and image are required.")
    );
  }

  const query =
    "INSERT INTO menu (item_name, item_type, item_category, item_serving, item_calories, item_price, item_description_long, item_img_blob, item_img_mimetype) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  connection.query(
    query,
    [
      item_name,
      item_type,
      item_category,
      item_serving,
      parseInt(item_calories),
      parseFloat(item_price),
      item_description_long || null,
      imageBuffer, // Store the binary data
      imageMimeType, // Store the MIME type
    ],
    (err, result) => {
      if (err) {
        console.error("Error adding food item with image blob:", err);
        // Check for specific errors like 'max_allowed_packet'
        if (err.code === "ER_NET_PACKET_TOO_LARGE") {
          return res.redirect(
            "/admin/menu?error=" +
              encodeURIComponent(
                "Image file is too large. Please upload a smaller image."
              )
          );
        }
        return res.redirect(
          "/admin/menu?error=" +
            encodeURIComponent("Database error adding food.")
        );
      }
      res.redirect(
        "/admin/menu?message=" +
          encodeURIComponent("Food item added successfully!")
      );
    }
  );
});

// API Endpoint to Fetch Item Data for Editing
router.get("/api/food/:itemId", (req, res) => {
  const connection = req.app.get("dbConnection");
  const itemId = req.params.itemId;
  const query =
    "SELECT item_id, item_name, item_type, item_category, item_serving, item_calories, item_price, item_description_long FROM menu WHERE item_id = ?";
  connection.query(query, [itemId], (err, results) => {
    if (err) {
      console.error("Error fetching food item for API:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error." });
    }
    if (results.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found." });
    }
    res.json({ success: true, item: results[0] });
  });
});

// POST /admin/editFood/:itemId
router.post("/editFood/:itemId", (req, res) => {
  const connection = req.app.get("dbConnection");
  const itemId = req.params.itemId;
  const {
    item_name,
    item_type,
    item_category,
    item_serving,
    item_calories,
    item_price,
    item_description_long,
    // item_img is no longer taken from req.body for the image itself
  } = req.body;

  if (
    !item_name ||
    !item_type ||
    !item_category ||
    !item_serving ||
    !item_calories || // Ensure calories is a number, or handle potential NaN
    item_price === undefined ||
    item_price === null ||
    isNaN(parseFloat(item_price))
    // item_img (filename) validation is removed as we handle file upload separately
  ) {
    return res.redirect(
      `/admin/menu?error=` +
        encodeURIComponent(
          "All fields (except image) are required for editing, and price/calories must be valid numbers."
        )
    );
  }

  let imageBuffer = null;
  let imageMimeType = null;
  let updateImage = false;

  if (req.files && req.files.item_img && req.files.item_img.data) {
    const foodImage = req.files.item_img;
    // Basic validation for uploaded file (e.g., size, type) can be added here
    if (foodImage.size > 0) {
      // Make sure a file was actually uploaded
      imageBuffer = foodImage.data;
      imageMimeType = foodImage.mimetype;
      updateImage = true;
    }
  }

  let querySetParts = [
    "item_name = ?",
    "item_type = ?",
    "item_category = ?",
    "item_serving = ?",
    "item_calories = ?",
    "item_price = ?",
    "item_description_long = ?",
  ];
  let queryParams = [
    item_name,
    item_type,
    item_category,
    item_serving,
    parseInt(item_calories),
    parseFloat(item_price),
    item_description_long || null,
  ];

  if (updateImage) {
    querySetParts.push("item_img_blob = ?");
    querySetParts.push("item_img_mimetype = ?");
    queryParams.push(imageBuffer);
    queryParams.push(imageMimeType);
  }
  // The old item_img (filename) column is no longer updated here.
  // If you need to clear it, you would explicitly set item_img = NULL

  queryParams.push(itemId); // For the WHERE clause

  const query = `
    UPDATE menu 
    SET ${querySetParts.join(", ")}
    WHERE item_id = ?`;

  connection.query(query, queryParams, (err, result) => {
    if (err) {
      console.error("Error updating food item:", err);
      if (err.code === "ER_NET_PACKET_TOO_LARGE") {
        return res.redirect(
          "/admin/menu?error=" +
            encodeURIComponent(
              "New image file is too large. Please upload a smaller image."
            )
        );
      }
      return res.redirect(
        "/admin/menu?error=" +
          encodeURIComponent("Database error updating food item.")
      );
    }
    if (result.affectedRows === 0) {
      return res.redirect(
        "/admin/menu?error=" + encodeURIComponent("Item not found for update.")
      );
    }
    res.redirect(
      "/admin/menu?message=" +
        encodeURIComponent("Food item updated successfully!")
    );
  });
});

// POST /admin/deleteFood/:itemId
router.post("/deleteFood/:itemId", (req, res) => {
  const connection = req.app.get("dbConnection");
  const itemId = req.params.itemId;

  // First, check if the item is part of any order_items to prevent deletion if it is.
  // This is important for data integrity. You might decide to allow deletion
  // or mark items as "inactive" instead. For now, we prevent deletion if in use.
  const checkOrderItemsQuery =
    "SELECT COUNT(*) AS count FROM order_items WHERE item_id = ?";
  connection.query(checkOrderItemsQuery, [itemId], (err, results) => {
    if (err) {
      console.error(
        "Error checking order_items before deleting menu item:",
        err
      );
      return res.redirect(
        "/admin/menu?error=" +
          encodeURIComponent("Database error checking related orders.")
      );
    }

    if (results[0].count > 0) {
      return res.redirect(
        "/admin/menu?error=" +
          encodeURIComponent(
            "Cannot delete item. It is part of existing orders. Consider marking it as unavailable instead."
          )
      );
    }

    // If not in any order_items, proceed with deletion
    const deleteQuery = "DELETE FROM menu WHERE item_id = ?";
    connection.query(deleteQuery, [itemId], (deleteErr, deleteResult) => {
      if (deleteErr) {
        console.error("Error deleting food item:", deleteErr);
        return res.redirect(
          "/admin/menu?error=" +
            encodeURIComponent("Database error deleting food item.")
        );
      }
      if (deleteResult.affectedRows === 0) {
        return res.redirect(
          "/admin/menu?error=" +
            encodeURIComponent("Item not found for deletion.")
        );
      }
      res.redirect(
        "/admin/menu?message=" +
          encodeURIComponent("Food item deleted successfully!")
      );
    });
  });
});

// --- Order Management ---
// Combined route for viewing orders.
router.get("/ordersManagement", async (req, res) => {
  const connection = req.app.get("dbConnection");
  const adminName = req.cookies.cookuname;

  // Filters
  const order_status_filter = req.query.order_status_filter || "";
  const payment_status_filter = req.query.payment_status_filter || "";
  const search_user_filter = req.query.search_user_filter || "";
  // Future: date_from_filter, date_to_filter

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10; // Default orders per page
  const offset = (page - 1) * limit;

  let whereClauses = [];
  let queryParams = []; // For the main data query
  let countQueryParams = []; // For the count query

  if (order_status_filter) {
    whereClauses.push("o.order_status = ?");
    queryParams.push(order_status_filter);
    countQueryParams.push(order_status_filter);
  }
  if (payment_status_filter) {
    whereClauses.push("o.payment_status = ?");
    queryParams.push(payment_status_filter);
    countQueryParams.push(payment_status_filter);
  }
  if (search_user_filter) {
    if (!isNaN(parseInt(search_user_filter))) { // if it's a number, could be user_id
        whereClauses.push("(u.user_name LIKE ? OR o.user_id = ?)");
        const searchTerm = `%${search_user_filter}%`;
        queryParams.push(searchTerm, parseInt(search_user_filter));
        countQueryParams.push(searchTerm, parseInt(search_user_filter));
    } else { // otherwise, search by name only
        whereClauses.push("u.user_name LIKE ?");
        const searchTerm = `%${search_user_filter}%`;
        queryParams.push(searchTerm);
        countQueryParams.push(searchTerm);
    }
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  try {
    // Step 1: Get total count of orders matching filters
    const countQuery = `
      SELECT COUNT(o.order_id) AS totalOrders
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      ${whereString}`;

    const [countResult] = await connection.promise().query(countQuery, countQueryParams);
    const totalOrders = countResult[0].totalOrders;
    const totalPages = Math.ceil(totalOrders / limit);
    
    const currentPage = (page > totalPages && totalPages > 0) ? totalPages : page; // Adjust if page is out of bounds
    const currentOffset = (currentPage - 1) * limit;


    // Step 2: Fetch paginated and filtered orders with user details
    const ordersQuery = `
      SELECT o.*, u.user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      ${whereString}
      ORDER BY o.order_date DESC
      LIMIT ? OFFSET ?`;

    const finalQueryParams = [...queryParams, limit, currentOffset];
    const [orders] = await connection.promise().query(ordersQuery, finalQueryParams);

    // Step 3: For each order, fetch its items
    const ordersWithItems = [];
    if (orders && orders.length > 0) {
      for (const order of orders) {
        const itemsQuery = `
          SELECT oi.item_id, oi.quantity, oi.price_per_item, oi.subtotal, m.item_name
          FROM order_items oi
          JOIN menu m ON oi.item_id = m.item_id
          WHERE oi.order_id = ?`;
        const [items] = await connection.promise().query(itemsQuery, [order.order_id]);
        ordersWithItems.push({ ...order, items: items });
      }
    }

    res.render("admin/ordersManagement", {
      adminName: adminName,
      orders: ordersWithItems,
      message: req.query.message || null,
      error: req.query.error || null,
      page: "orders", // For sidebar active state
      currentPage: currentPage,
      totalPages: totalPages,
      limit: limit,
      currentFilters: {
        order_status_filter,
        payment_status_filter,
        search_user_filter
      },
      totalOrders: totalOrders
    });
  } catch (err) {
    console.error("Error fetching orders for admin:", err);
    res.redirect(
      "/admin/dashboard?error=" +
        encodeURIComponent("Could not load orders due to a server error.")
    );
  }
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
        "/admin/ordersManagement?error=" + encodeURIComponent("Database error.")
      );
    }
    // Optionally, add to order_dispatch table if "Processing" implies dispatch prep
    // const dispatchQuery = "INSERT INTO order_dispatch (order_id, dispatched_by_admin_id, dispatch_datetime) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE dispatched_by_admin_id = VALUES(dispatched_by_admin_id), dispatch_datetime = NOW()";
    // connection.query(dispatchQuery, [order_id, adminId], (dispatchErr, dispatchResult) => { ... });
    res.redirect(
      "/admin/ordersManagement?message=" +
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
        "/admin/ordersManagement?error=" + encodeURIComponent("Database error.")
      );
    }
    // Ensure entry in order_dispatch if not already there
    const dispatchQuery =
      "INSERT INTO order_dispatch (order_id, dispatched_by_admin_id, dispatch_datetime, dispatch_status) VALUES (?, ?, NOW(), 'Delivered') ON DUPLICATE KEY UPDATE dispatched_by_admin_id = VALUES(dispatched_by_admin_id), dispatch_datetime = NOW(), dispatch_status = 'Delivered'";
    connection.query(
      dispatchQuery,
      [order_id, adminId],
      (dispatchErr, dispatchResult) => {
        if (dispatchErr) {
          console.error("Error updating order_dispatch table:", dispatchErr);
          // Decide if this is a critical error to halt the redirect
        }
        res.redirect(
          "/admin/ordersManagement?message=" +
            encodeURIComponent(`Order ${order_id} set to Delivered.`)
        );
      }
    );
  });
});

// NEW ROUTE: Admin to set order to Dispatched
router.post("/order/set-dispatched/:order_id", (req, res) => {
  const connection = req.app.get("dbConnection");
  const order_id = req.params.order_id;
  const adminId = req.cookies.cookuid; // For logging or dispatch table

  // Update order status to 'Dispatched' only if it's 'Pending' or 'Processing'
  const query =
    "UPDATE orders SET order_status = 'Dispatched' WHERE order_id = ? AND (order_status = 'Pending' OR order_status = 'Processing')";
  connection.query(query, [order_id], (err, result) => {
    if (err) {
      console.error("Error setting order to dispatched:", err);
      return res.redirect(
        "/admin/ordersManagement?error=" +
          encodeURIComponent("Database error setting status to Dispatched.")
      );
    }
    if (result.affectedRows > 0) {
      // Optionally, add to order_dispatch table
      const dispatchQuery =
        "INSERT INTO order_dispatch (order_id, dispatched_by_admin_id, dispatch_datetime, dispatch_status) VALUES (?, ?, NOW(), 'Dispatched') ON DUPLICATE KEY UPDATE dispatched_by_admin_id = VALUES(dispatched_by_admin_id), dispatch_datetime = NOW(), dispatch_status = 'Dispatched'";
      connection.query(
        dispatchQuery,
        [order_id, adminId],
        (dispatchErr, dispatchResult) => {
          if (dispatchErr) {
            console.error(
              "Error updating order_dispatch table for dispatched order:",
              dispatchErr
            );
            // Non-critical error, so proceed with redirect
          }
          res.redirect(
            "/admin/ordersManagement?message=" +
              encodeURIComponent(`Order ${order_id} set to Dispatched.`)
          );
        }
      );
    } else {
      // Order not found, not in a dispatchable state, or already dispatched
      res.redirect(
        "/admin/ordersManagement?error=" +
          encodeURIComponent(
            `Order ${order_id} could not be set to Dispatched. It may not be in a 'Pending' or 'Processing' state, or was already actioned.`
          )
      );
    }
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
        "/admin/ordersManagement?error=" + encodeURIComponent("Database error.")
      );
    }
    if (result.affectedRows === 0) {
      return res.redirect(
        "/admin/ordersManagement?error=" +
          encodeURIComponent("Order not found or not a COD order.")
      );
    }
    res.redirect(
      "/admin/ordersManagement?message=" +
        encodeURIComponent(`Order ${order_id} (COD) marked as Paid.`)
    );
  });
});

module.exports = router;
