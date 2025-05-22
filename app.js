// Loading and Using Modules Required
require("dotenv").config(); // Load environment variables
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const mysql = require("mysql2");
const cron = require("node-cron");
const statisticsService = require("./services/statisticsService");

// Initialize Express App
const app = express();

// Import services
// const statisticsService = require("./services/statisticsService"); // 2. Require your statisticsService

// Import routes
const indexRoutesModule = require("./routes/indexRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const authRoutes = require("./routes/authRoutes.js");
const shopRoutes = require("./routes/shopRoutes.js");
const cartRoutes = require("./routes/cartRoutes.js");
const checkoutRoutes = require("./routes/checkoutRoutes.js");
// const botApiRoutes = require("./routes/botApiRoutes.js");
const imageRoutes = require("./routes/imageRoutes.js"); // Import the new image routes
const adminStatisticsRoutes = require("./routes/adminStatisticsRoutes"); // Adjust path as needed
const adminSalesRoutes = require("./routes/adminSalesRoutes"); // 1. Import with the new name

// Set View Engine and Middleware
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use(fileUpload());

// Database Connection
const pool = mysql.createPool({
  // Change to createPool and use 'pool'
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "pizzazzpizza",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
app.set("dbConnection", pool); // Set the pool object

// Middleware to make user data and cart count available to all views
app.use((req, res, next) => {
  res.locals.username = req.cookies.cookuname || null;
  res.locals.userid = req.cookies.cookuid || null;
  res.locals.isAdmin = req.cookies.usertype === "admin";
  res.locals.item_count = req.cookies.item_count || 0;
  next();
});

// Set up routes
app.use("/", indexRoutesModule.router);
app.use("/admin", adminRoutes);
app.use("/", userRoutes);
app.use("/", authRoutes);
app.use("/", shopRoutes);
app.use("/", cartRoutes);
app.use("/", checkoutRoutes);
// app.use("/api/bot", botApiRoutes);
app.use("/images", imageRoutes); // Register the image routes under the /images path
app.use("/admin/statistics", adminStatisticsRoutes);
app.use("/admin/sales", adminSalesRoutes); // 2. Register with the new name

// Schedule daily statistics snapshot
// Runs every day at 1:05 AM (adjust as needed)
cron.schedule(
  "5 1 * * *",
  async () => {
    console.log("Running daily statistics snapshot job...");
    try {
      // Ensure you pass the promise-enabled pool if calculateAndStoreDailySnapshots expects it
      // If calculateAndStoreDailySnapshots is using the app's main pool directly,
      // and that pool is already mysql2/promise, this is fine.
      // Otherwise, you might need to get the pool differently or ensure it's promise-wrapped.
      // Based on populateSnapshots.js, calculateAndStoreDailySnapshots expects a mysql2/promise pool.
      // So, we create one here specifically for the job, or ensure the main app pool is compatible.

      // Option 1: Create a dedicated promise pool for the cron job (similar to populateSnapshots.js)
      const cronPool = mysql
        .createPool({
          host: process.env.DB_HOST || "localhost",
          user: process.env.DB_USER || "root",
          password: process.env.DB_PASSWORD || "",
          database: process.env.DB_NAME || "pizzazzpizza",
          waitForConnections: true,
          connectionLimit: 1, // Sufficient for a script
          queueLimit: 0,
        })
        .promise(); // Make sure it's a promise pool

      await statisticsService.calculateAndStoreDailySnapshots(cronPool);
      console.log("Daily statistics snapshot job completed successfully.");
      await cronPool.end(); // Close the dedicated pool
    } catch (error) {
      console.error("Error running daily statistics snapshot job:", error);
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh", // Or your server's timezone
  }
);

console.log("Daily statistics snapshot job scheduled.");

module.exports = app;
