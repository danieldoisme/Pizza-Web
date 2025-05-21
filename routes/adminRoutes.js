const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const isAdmin = require("../middleware/isAdmin.js");
const { body, validationResult } = require("express-validator"); // For input validation

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
    const pool = req.app.get("dbConnection");

    if (!admin_email || !admin_password) {
      return res.redirect(
        "/admin/login?error=" +
          encodeURIComponent("Email and password are required.")
      );
    }

    const query = "SELECT * FROM admin WHERE admin_email = ?";
    const [results] = await pool.promise().query(query, [admin_email]); // Use await and pool.promise()

    if (results.length === 0) {
      return res.redirect(
        "/admin/login?error=" + encodeURIComponent("Invalid email or password.")
      );
    }

    const admin = results[0];
    const match = await bcrypt.compare(admin_password, admin.admin_password);

    if (match) {
      res.cookie("cookuid", admin.admin_id.toString(), {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.cookie("cookuname", admin.admin_name, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.redirect("/admin/dashboard");
    } else {
      return res.redirect(
        "/admin/login?error=" + encodeURIComponent("Invalid email or password.")
      );
    }
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
router.get("/menu", async (req, res) => {
  const pool = req.app.get("dbConnection"); // Use pool

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
  // Use pool.escapeId for sortBy to prevent SQL injection
  const dataQuery = `
    SELECT 
      item_id, item_name, item_type, item_category, item_price, 
      item_calories, item_serving, item_rating, total_ratings, 
      item_description_long
    FROM menu 
    ORDER BY ${pool.escapeId(sortBy)} ${
    // Use pool.escapeId
    sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC" // Ensure sortOrder is sanitized
  }
    LIMIT ? 
    OFFSET ?`;

  try {
    const [countResult] = await pool.promise().query(countQuery);
    const totalItems = countResult[0].totalItems;
    const totalPages = Math.ceil(totalItems / limit);

    const [items] = await pool.promise().query(dataQuery, [limit, offset]);

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
  } catch (err) {
    console.error("Error fetching menu items for management:", err);
    // It's generally better to render an error page or send a JSON error
    // than redirecting with query parameters for errors, but following existing pattern.
    res.status(500).render("admin/errorAdmin", {
      // Render an error page
      adminName: req.cookies.cookuname,
      error: "Could not load menu items due to a server error.",
      page: "error",
    });
  }
});

// Adapted POST /admin/addFood
router.post("/addFood", async (req, res) => {
  // Changed to async
  const pool = req.app.get("dbConnection"); // Changed to pool
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

  if (req.files && req.files.item_img && req.files.item_img.data) {
    const foodImage = req.files.item_img;
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

  try {
    await pool.promise().query(
      // Changed to await pool.promise().query
      query,
      [
        item_name,
        item_type,
        item_category,
        item_serving,
        parseInt(item_calories),
        parseFloat(item_price),
        item_description_long || null,
        imageBuffer,
        imageMimeType,
      ]
    );
    res.redirect(
      "/admin/menu?message=" +
        encodeURIComponent("Food item added successfully!")
    );
  } catch (err) {
    console.error("Error adding food item with image blob:", err);
    if (err.code === "ER_NET_PACKET_TOO_LARGE") {
      return res.redirect(
        "/admin/menu?error=" +
          encodeURIComponent(
            "Image file is too large. Please upload a smaller image."
          )
      );
    }
    return res.redirect(
      "/admin/menu?error=" + encodeURIComponent("Database error adding food.")
    );
  }
});

// API Endpoint to Fetch Item Data for Editing
router.get("/api/food/:itemId", async (req, res) => {
  const pool = req.app.get("dbConnection");
  const itemId = req.params.itemId;
  const query =
    "SELECT item_id, item_name, item_type, item_category, item_serving, item_calories, item_price, item_description_long FROM menu WHERE item_id = ?";
  try {
    const [results] = await pool.promise().query(query, [itemId]);
    if (results.length === 0) {
      // Ensure a message is sent when item is not found
      return res
        .status(404)
        .json({ success: false, message: "Item not found." });
    }
    res.json({ success: true, item: results[0] });
  } catch (err) {
    console.error("Error fetching food item for API:", err);
    // Ensure a message is sent on database error
    res.status(500).json({
      success: false,
      message: "Database error occurred while fetching item details.",
    });
  }
});

// Adapted POST /admin/editFood
router.post("/editFood/:itemId", async (req, res) => {
  // Changed to async
  const pool = req.app.get("dbConnection"); // Changed to pool
  const itemId = req.params.itemId;
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
  let imageChanged = false;

  if (req.files && req.files.item_img && req.files.item_img.data) {
    const foodImage = req.files.item_img;
    if (foodImage.size > 0) {
      // Check if a new file was actually uploaded
      imageBuffer = foodImage.data;
      imageMimeType = foodImage.mimetype;
      imageChanged = true;
    }
  }

  if (
    !item_name ||
    !item_type ||
    !item_category ||
    !item_serving ||
    !item_calories ||
    !item_price
  ) {
    return res.redirect(
      `/admin/menu?error=${encodeURIComponent(
        "All fields are required."
      )}&itemId=${itemId}`
    );
  }

  let query;
  let queryParams;

  if (imageChanged) {
    query =
      "UPDATE menu SET item_name = ?, item_type = ?, item_category = ?, item_serving = ?, item_calories = ?, item_price = ?, item_description_long = ?, item_img_blob = ?, item_img_mimetype = ? WHERE item_id = ?";
    queryParams = [
      item_name,
      item_type,
      item_category,
      item_serving,
      parseInt(item_calories),
      parseFloat(item_price),
      item_description_long || null,
      imageBuffer,
      imageMimeType,
      itemId,
    ];
  } else {
    query =
      "UPDATE menu SET item_name = ?, item_type = ?, item_category = ?, item_serving = ?, item_calories = ?, item_price = ?, item_description_long = ? WHERE item_id = ?";
    queryParams = [
      item_name,
      item_type,
      item_category,
      item_serving,
      parseInt(item_calories),
      parseFloat(item_price),
      item_description_long || null,
      itemId,
    ];
  }

  try {
    await pool.promise().query(query, queryParams); // Changed to await pool.promise().query
    res.redirect(
      "/admin/menu?message=" +
        encodeURIComponent("Food item updated successfully!")
    );
  } catch (err) {
    console.error("Error updating food item:", err);
    if (err.code === "ER_NET_PACKET_TOO_LARGE") {
      return res.redirect(
        `/admin/menu?error=${encodeURIComponent(
          "Image file is too large. Please upload a smaller image."
        )}&itemId=${itemId}`
      );
    }
    return res.redirect(
      `/admin/menu?error=${encodeURIComponent(
        "Database error updating food."
      )}&itemId=${itemId}`
    );
  }
});

// Adapted POST /admin/deleteFood/:itemId
router.post("/deleteFood/:itemId", async (req, res) => {
  // Changed to async
  const pool = req.app.get("dbConnection"); // Changed to pool
  const itemId = req.params.itemId;
  const query = "DELETE FROM menu WHERE item_id = ?";

  try {
    const [result] = await pool.promise().query(query, [itemId]); // Changed to await pool.promise().query
    if (result.affectedRows > 0) {
      res.redirect(
        "/admin/menu?message=" +
          encodeURIComponent("Food item deleted successfully!")
      );
    } else {
      res.redirect(
        "/admin/menu?error=" +
          encodeURIComponent("Food item not found or already deleted.")
      );
    }
  } catch (err) {
    console.error("Error deleting food item:", err);
    res.redirect(
      "/admin/menu?error=" + encodeURIComponent("Database error deleting food.")
    );
  }
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
    if (!isNaN(parseInt(search_user_filter))) {
      // if it's a number, could be user_id
      whereClauses.push("(u.user_name LIKE ? OR o.user_id = ?)");
      const searchTerm = `%${search_user_filter}%`;
      queryParams.push(searchTerm, parseInt(search_user_filter));
      countQueryParams.push(searchTerm, parseInt(search_user_filter));
    } else {
      // otherwise, search by name only
      whereClauses.push("u.user_name LIKE ?");
      const searchTerm = `%${search_user_filter}%`;
      queryParams.push(searchTerm);
      countQueryParams.push(searchTerm);
    }
  }

  const whereString =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  try {
    // Step 1: Get total count of orders matching filters
    const countQuery = `
      SELECT COUNT(o.order_id) AS totalOrders
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      ${whereString}`;

    const [countResult] = await connection
      .promise()
      .query(countQuery, countQueryParams);
    const totalOrders = countResult[0].totalOrders;
    const totalPages = Math.ceil(totalOrders / limit);

    const currentPage = page > totalPages && totalPages > 0 ? totalPages : page; // Adjust if page is out of bounds
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
    const [orders] = await connection
      .promise()
      .query(ordersQuery, finalQueryParams);

    // Step 3: For each order, fetch its items
    const ordersWithItems = [];
    if (orders && orders.length > 0) {
      for (const order of orders) {
        const itemsQuery = `
          SELECT oi.item_id, oi.quantity, oi.price_per_item, oi.subtotal, m.item_name
          FROM order_items oi
          JOIN menu m ON oi.item_id = m.item_id
          WHERE oi.order_id = ?`;
        const [items] = await connection
          .promise()
          .query(itemsQuery, [order.order_id]);
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
        search_user_filter,
      },
      totalOrders: totalOrders,
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
router.post("/order/set-processing/:order_id", async (req, res) => {
  // Make async
  const pool = req.app.get("dbConnection"); // Use pool
  const order_id = req.params.order_id;

  const query =
    "UPDATE orders SET order_status = 'Processing' WHERE order_id = ?";
  try {
    const [result] = await pool.promise().query(query, [order_id]); // Use await
    if (result.affectedRows > 0) {
      res.redirect(
        "/admin/ordersManagement?message=" +
          encodeURIComponent(`Order ${order_id} set to Processing.`)
      );
    } else {
      res.redirect(
        "/admin/ordersManagement?error=" +
          encodeURIComponent(`Order ${order_id} not found or no change made.`)
      );
    }
  } catch (err) {
    console.error("Error setting order to processing:", err);
    res.redirect(
      "/admin/ordersManagement?error=" + encodeURIComponent("Database error.")
    );
  }
});

// Route for admin to set order to Delivered
router.post("/order/set-delivered-admin/:order_id", async (req, res) => {
  // Make async
  const pool = req.app.get("dbConnection"); // Use pool
  const order_id = req.params.order_id;
  const adminId = req.cookies.cookuid;

  const updateOrderStatusQuery =
    "UPDATE orders SET order_status = 'Delivered', delivery_date = NOW() WHERE order_id = ?";
  const dispatchQuery =
    "INSERT INTO order_dispatch (order_id, dispatched_by_admin_id, dispatch_datetime, dispatch_status) VALUES (?, ?, NOW(), 'Delivered') ON DUPLICATE KEY UPDATE dispatched_by_admin_id = VALUES(dispatched_by_admin_id), dispatch_datetime = NOW(), dispatch_status = 'Delivered'";

  let transactionConnection;
  try {
    transactionConnection = await pool.getConnection(); // Get a connection for transaction
    await transactionConnection.beginTransaction();

    const [updateResult] = await transactionConnection.query(
      updateOrderStatusQuery,
      [order_id]
    );

    if (updateResult.affectedRows > 0) {
      await transactionConnection.query(dispatchQuery, [order_id, adminId]);
      await transactionConnection.commit();
      res.redirect(
        "/admin/ordersManagement?message=" +
          encodeURIComponent(`Order ${order_id} set to Delivered.`)
      );
    } else {
      await transactionConnection.rollback();
      res.redirect(
        "/admin/ordersManagement?error=" +
          encodeURIComponent(
            `Order ${order_id} not found or no change made for delivery.`
          )
      );
    }
  } catch (err) {
    if (transactionConnection) await transactionConnection.rollback();
    console.error("Error setting order to delivered:", err);
    res.redirect(
      "/admin/ordersManagement?error=" +
        encodeURIComponent("Database error during delivery update.")
    );
  } finally {
    if (transactionConnection) transactionConnection.release();
  }
});

// NEW ROUTE: Admin to set order to Dispatched
router.post("/order/set-dispatched/:order_id", async (req, res) => {
  // Make async
  const pool = req.app.get("dbConnection"); // Use pool
  const order_id = req.params.order_id;
  const adminId = req.cookies.cookuid;

  const updateOrderStatusQuery =
    "UPDATE orders SET order_status = 'Dispatched' WHERE order_id = ? AND (order_status = 'Pending' OR order_status = 'Processing')";
  const dispatchQuery =
    "INSERT INTO order_dispatch (order_id, dispatched_by_admin_id, dispatch_datetime, dispatch_status) VALUES (?, ?, NOW(), 'Dispatched') ON DUPLICATE KEY UPDATE dispatched_by_admin_id = VALUES(dispatched_by_admin_id), dispatch_datetime = NOW(), dispatch_status = 'Dispatched'";

  let transactionConnection;
  try {
    transactionConnection = await pool.getConnection();
    await transactionConnection.beginTransaction();

    const [updateResult] = await transactionConnection.query(
      updateOrderStatusQuery,
      [order_id]
    );

    if (updateResult.affectedRows > 0) {
      await transactionConnection.query(dispatchQuery, [order_id, adminId]);
      await transactionConnection.commit();
      res.redirect(
        "/admin/ordersManagement?message=" +
          encodeURIComponent(`Order ${order_id} set to Dispatched.`)
      );
    } else {
      await transactionConnection.rollback();
      res.redirect(
        "/admin/ordersManagement?error=" +
          encodeURIComponent(
            `Order ${order_id} could not be set to Dispatched. It may not be in a 'Pending' or 'Processing' state, or was already actioned.`
          )
      );
    }
  } catch (err) {
    if (transactionConnection) await transactionConnection.rollback();
    console.error("Error setting order to dispatched:", err);
    res.redirect(
      "/admin/ordersManagement?error=" +
        encodeURIComponent("Database error setting status to Dispatched.")
    );
  } finally {
    if (transactionConnection) transactionConnection.release();
  }
});

router.post("/order/mark-paid/:order_id", async (req, res) => {
  // Make async
  const pool = req.app.get("dbConnection"); // Use pool
  const order_id = req.params.order_id;

  const query =
    "UPDATE orders SET payment_status = 'Paid' WHERE order_id = ? AND (payment_status = 'Unpaid' OR payment_status = 'Failed')";
  try {
    const [result] = await pool.promise().query(query, [order_id]); // Use await
    if (result.affectedRows > 0) {
      res.redirect(
        "/admin/ordersManagement?message=" +
          encodeURIComponent(`Order ${order_id} has been marked as Paid.`)
      );
    } else {
      res.redirect(
        "/admin/ordersManagement?error=" +
          encodeURIComponent(
            `Order ${order_id} not found, or its payment status was not 'Unpaid' or 'Failed'.`
          )
      );
    }
  } catch (err) {
    console.error("Error marking order as paid:", err);
    res.redirect(
      "/admin/ordersManagement?error=" +
        encodeURIComponent("Database error while marking order as paid.")
    );
  }
});

// GET /admin/users - Display User Management Page
router.get("/users", isAdmin, async (req, res) => {
  const connection = req.app.get("dbConnection");
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const searchName = req.query.search_name || "";
  const searchEmail = req.query.search_email || "";

  // Define allowed sortable columns
  const allowedSortBy = ["user_id", "user_name", "user_email"];
  let sortBy = req.query.sortBy || "user_name";
  if (!allowedSortBy.includes(sortBy)) {
    sortBy = "user_name"; // Fallback to default
  }

  let sortOrder = req.query.sortOrder || "ASC";
  if (sortOrder.toUpperCase() !== "ASC" && sortOrder.toUpperCase() !== "DESC") {
    sortOrder = "ASC"; // Fallback to default
  }

  let whereClauses = [];
  let queryParams = [];
  let countQueryParams = [];

  if (searchName) {
    whereClauses.push("user_name LIKE ?");
    queryParams.push(`%${searchName}%`);
    countQueryParams.push(`%${searchName}%`);
  }
  if (searchEmail) {
    whereClauses.push("user_email LIKE ?");
    queryParams.push(`%${searchEmail}%`);
    countQueryParams.push(`%${searchEmail}%`);
  }

  const whereCondition =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  try {
    // Get total count of users with filters
    const countQuery = `SELECT COUNT(*) AS totalUsers FROM users ${whereCondition}`;
    const [countResult] = await connection
      .promise()
      .query(countQuery, countQueryParams);
    const totalUsers = countResult[0].totalUsers;
    const totalPages = Math.ceil(totalUsers / limit);

    const currentPage =
      page > totalPages && totalPages > 0 ? totalPages : page < 1 ? 1 : page;
    const currentOffset = (currentPage - 1) * limit;

    // Get users for the current page with filters and sorting
    const usersQuery = `
      SELECT user_id, user_name, user_email, user_mobileno, user_address 
      FROM users 
      ${whereCondition}
      ORDER BY ${connection.escapeId(sortBy)} ${
      sortOrder === "DESC" ? "DESC" : "ASC"
    }
      LIMIT ? 
      OFFSET ?`;
    const finalQueryParams = [...queryParams, limit, currentOffset];
    const [users] = await connection
      .promise()
      .query(usersQuery, finalQueryParams);

    res.render("admin/userManagement", {
      page: "users",
      users: users,
      totalUsers: totalUsers,
      totalPages: totalPages,
      currentPage: currentPage,
      limit: limit,
      sortBy: sortBy,
      sortOrder: sortOrder,
      searchName: searchName,
      searchEmail: searchEmail,
      message: req.query.message,
      error: req.query.error,
      req: req,
    });
  } catch (err) {
    console.error("Error fetching users for management:", err);
    res.redirect(
      "/admin/dashboard?error=" + encodeURIComponent("Could not load users.")
    );
  }
});

// GET /admin/users/:userId - Fetch user data for editing
router.get("/users/:userId", isAdmin, async (req, res) => {
  const connection = req.app.get("dbConnection");
  const { userId } = req.params;

  try {
    const [users] = await connection
      .promise()
      .query(
        "SELECT user_id, user_name, user_email, user_mobileno, user_address FROM users WHERE user_id = ?",
        [userId]
      );
    if (users.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    res.json({ success: true, user: users[0] });
  } catch (err) {
    console.error("Error fetching user data for edit:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching user data." });
  }
});

// POST /admin/users/update/:userId - Update user details
router.post(
  "/users/update/:userId",
  isAdmin,
  [
    // Basic Validation
    body("user_name")
      .trim()
      .notEmpty()
      .withMessage("Name is required.")
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2 and 100 characters."),
    body("user_email")
      .trim()
      .notEmpty()
      .withMessage("Email is required.")
      .isEmail()
      .withMessage("Invalid email format.")
      .normalizeEmail(),
    body("user_mobileno")
      .optional({ checkFalsy: true })
      .trim()
      .isMobilePhone("any", { strictMode: false })
      .withMessage("Invalid mobile number format."), // Allows empty or valid
    body("user_address")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 255 })
      .withMessage("Address can be up to 255 characters."),
  ],
  async (req, res) => {
    const connection = req.app.get("dbConnection");
    const { userId } = req.params;
    const { user_name, user_email, user_mobileno, user_address } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors
        .array()
        .map((e) => e.msg)
        .join(" ");
      // Preserve existing query parameters (like search, sort, page) from the form's action URL
      const redirectParams = new URLSearchParams(req.query);
      redirectParams.set("error", `Validation failed: ${errorMessages}`);
      return res.redirect(`/admin/users?${redirectParams.toString()}`);
    }

    try {
      const updateQuery =
        "UPDATE users SET user_name = ?, user_email = ?, user_mobileno = ?, user_address = ? WHERE user_id = ?";
      const [result] = await connection
        .promise()
        .query(updateQuery, [
          user_name,
          user_email,
          user_mobileno || null,
          user_address || null,
          userId,
        ]);

      if (result.affectedRows === 0) {
        const redirectParams = new URLSearchParams(req.query);
        redirectParams.set("error", "User not found or no changes made.");
        return res.redirect(`/admin/users?${redirectParams.toString()}`);
      }

      const redirectParams = new URLSearchParams(req.query);
      redirectParams.set("message", "User updated successfully.");
      res.redirect(`/admin/users?${redirectParams.toString()}`);
    } catch (err) {
      console.error("Error updating user:", err);
      const redirectParams = new URLSearchParams(req.query);
      if (err.code === "ER_DUP_ENTRY") {
        redirectParams.set(
          "error",
          "Failed to update user. Email may already be in use."
        );
      } else {
        redirectParams.set("error", "Failed to update user.");
      }
      res.redirect(`/admin/users?${redirectParams.toString()}`);
    }
  }
);

// Make sure this is after router.use(isAdmin); if you want these routes protected.

// --- Promotion Banner Management ---

// GET /admin/banners - Display Banner Management Page
router.get("/banners", async (req, res) => {
  const connection = req.app.get("dbConnection");
  try {
    const [banners] = await connection
      .promise()
      .query(
        "SELECT banner_id, alt_text, is_active, sort_order, uploaded_at, updated_at FROM promotion_banners ORDER BY sort_order ASC, uploaded_at DESC"
      );
    res.render("admin/bannerManagement", {
      // We will create this EJS file later
      adminName: req.cookies.cookuname,
      page: "banners", // For sidebar active state
      banners: banners,
      message: req.query.message || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error("Error fetching banners for management:", err);
    res.redirect(
      "/admin/dashboard?error=" +
        encodeURIComponent("Could not load promotion banners.")
    );
  }
});

// GET /admin/api/banner/:banner_id - Fetch banner data for editing
router.get("/api/banner/:banner_id", async (req, res) => {
  const connection = req.app.get("dbConnection");
  const { banner_id } = req.params;
  try {
    const [banners] = await connection
      .promise()
      .query(
        "SELECT banner_id, alt_text, sort_order, is_active FROM promotion_banners WHERE banner_id = ?",
        [banner_id]
      );
    if (banners.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Banner not found." });
    }
    res.json({ success: true, banner: banners[0] });
  } catch (err) {
    console.error("Error fetching banner for API:", err);
    res.status(500).json({ success: false, message: "Database error." });
  }
});

// POST /admin/banners/upload - Handle new banner upload
router.post("/banners/upload", async (req, res) => {
  const connection = req.app.get("dbConnection");
  const { alt_text, sort_order, is_active } = req.body;

  if (!req.files || !req.files.banner_image) {
    return res.redirect(
      "/admin/banners?error=" + encodeURIComponent("Banner image is required.")
    );
  }

  const bannerImage = req.files.banner_image;
  const imageBuffer = bannerImage.data;
  const imageMimeType = bannerImage.mimetype;

  // Basic validation (example: size and type)
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  if (bannerImage.size > MAX_SIZE) {
    return res.redirect(
      "/admin/banners?error=" +
        encodeURIComponent("Image file is too large (max 5MB).")
    );
  }
  if (!ALLOWED_TYPES.includes(imageMimeType)) {
    return res.redirect(
      "/admin/banners?error=" +
        encodeURIComponent("Invalid image file type. Allowed: JPG, PNG, WEBP.")
    );
  }

  try {
    const query =
      "INSERT INTO promotion_banners (image_blob, image_mimetype, alt_text, sort_order, is_active) VALUES (?, ?, ?, ?, ?)";
    await connection
      .promise()
      .query(query, [
        imageBuffer,
        imageMimeType,
        alt_text || null,
        parseInt(sort_order) || 0,
        is_active === "on" || is_active === "true" ? 1 : 0,
      ]);
    res.redirect(
      "/admin/banners?message=" +
        encodeURIComponent("Banner uploaded successfully!")
    );
  } catch (err) {
    console.error("Error uploading banner:", err);
    if (err.code === "ER_NET_PACKET_TOO_LARGE") {
      return res.redirect(
        "/admin/banners?error=" +
          encodeURIComponent("Image file is too large for database.")
      );
    }
    res.redirect(
      "/admin/banners?error=" +
        encodeURIComponent("Database error uploading banner.")
    );
  }
});

// POST /admin/banners/edit/:banner_id - Handle banner update
router.post("/banners/edit/:banner_id", async (req, res) => {
  const connection = req.app.get("dbConnection");
  const { banner_id } = req.params;
  const { alt_text, sort_order, is_active } = req.body;

  let imageBuffer = null;
  let imageMimeType = null;
  let updateImage = false;

  if (
    req.files &&
    req.files.banner_image_edit &&
    req.files.banner_image_edit.data
  ) {
    const bannerImage = req.files.banner_image_edit;
    // Basic validation (example: size and type)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

    if (bannerImage.size > 0) {
      // Process only if a file is actually uploaded
      if (bannerImage.size > MAX_SIZE) {
        return res.redirect(
          "/admin/banners?error=" +
            encodeURIComponent("Updated image file is too large (max 5MB).")
        );
      }
      if (!ALLOWED_TYPES.includes(bannerImage.mimetype)) {
        return res.redirect(
          "/admin/banners?error=" +
            encodeURIComponent(
              "Invalid updated image file type. Allowed: JPG, PNG, WEBP."
            )
        );
      }
      imageBuffer = bannerImage.data;
      imageMimeType = bannerImage.mimetype;
      updateImage = true;
    }
  }

  try {
    let querySetParts = ["alt_text = ?", "sort_order = ?", "is_active = ?"];
    let queryParams = [
      alt_text || null,
      parseInt(sort_order) || 0,
      is_active === "on" || is_active === "true" ? 1 : 0,
    ];

    if (updateImage) {
      querySetParts.push("image_blob = ?");
      querySetParts.push("image_mimetype = ?");
      queryParams.push(imageBuffer);
      queryParams.push(imageMimeType);
    }
    queryParams.push(banner_id);

    const query = `UPDATE promotion_banners SET ${querySetParts.join(
      ", "
    )} WHERE banner_id = ?`;
    const [result] = await connection.promise().query(query, queryParams);

    if (result.affectedRows === 0) {
      return res.redirect(
        "/admin/banners?error=" +
          encodeURIComponent("Banner not found or no changes made.")
      );
    }
    res.redirect(
      "/admin/banners?message=" +
        encodeURIComponent("Banner updated successfully!")
    );
  } catch (err) {
    console.error("Error updating banner:", err);
    if (err.code === "ER_NET_PACKET_TOO_LARGE") {
      return res.redirect(
        "/admin/banners?error=" +
          encodeURIComponent("Updated image file is too large for database.")
      );
    }
    res.redirect(
      "/admin/banners?error=" +
        encodeURIComponent("Database error updating banner.")
    );
  }
});

// POST /admin/banners/toggle-active/:banner_id - Toggle active status
router.post("/banners/toggle-active/:banner_id", async (req, res) => {
  const connection = req.app.get("dbConnection");
  const { banner_id } = req.params;
  try {
    // First, get the current status
    const [currentStatusRows] = await connection
      .promise()
      .query("SELECT is_active FROM promotion_banners WHERE banner_id = ?", [
        banner_id,
      ]);

    if (currentStatusRows.length === 0) {
      return res.redirect(
        "/admin/banners?error=" + encodeURIComponent("Banner not found.")
      );
    }

    const newStatus = !currentStatusRows[0].is_active; // Toggle the status

    await connection
      .promise()
      .query("UPDATE promotion_banners SET is_active = ? WHERE banner_id = ?", [
        newStatus,
        banner_id,
      ]);
    res.redirect(
      "/admin/banners?message=" + encodeURIComponent("Banner status updated.")
    );
  } catch (err) {
    console.error("Error toggling banner status:", err);
    res.redirect(
      "/admin/banners?error=" +
        encodeURIComponent("Database error updating banner status.")
    );
  }
});

// POST /admin/banners/delete/:banner_id - Delete a banner
router.post("/banners/delete/:banner_id", async (req, res) => {
  const connection = req.app.get("dbConnection");
  const { banner_id } = req.params;
  try {
    const [result] = await connection
      .promise()
      .query("DELETE FROM promotion_banners WHERE banner_id = ?", [banner_id]);
    if (result.affectedRows === 0) {
      return res.redirect(
        "/admin/banners?error=" +
          encodeURIComponent("Banner not found for deletion.")
      );
    }
    res.redirect(
      "/admin/banners?message=" +
        encodeURIComponent("Banner deleted successfully.")
    );
  } catch (err) {
    console.error("Error deleting banner:", err);
    res.redirect(
      "/admin/banners?error=" +
        encodeURIComponent("Database error deleting banner.")
    );
  }
});

module.exports = router;
