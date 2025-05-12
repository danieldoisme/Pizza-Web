// Loading and Using Modules Required
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const mysql = require("mysql");

// Initialize Express App
const app = express();

// Import routes
const indexRoutes = require("./routes/indexRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const authRoutes = require("./routes/authRoutes.js");
const shopRoutes = require("./routes/shopRoutes.js");
const cartRoutes = require("./routes/cartRoutes.js"); // Import cart routes
const checkoutRoutes = require("./routes/checkoutRoutes.js"); // Import checkout routes

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
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to database: " + err.stack);
    return;
  }
  console.log("Connected to database as id " + connection.threadId);
});
app.set("dbConnection", connection);

// Middleware to make user data and cart count available to all views
app.use((req, res, next) => {
  res.locals.username = req.cookies.cookuname || null;
  res.locals.userid = req.cookies.cookuid || null;
  res.locals.isAdmin = req.cookies.usertype === "admin";
  res.locals.item_count = req.cookies.item_count || 0;
  next();
});

// Set up routes
app.use("/", indexRoutes);
app.use("/admin", adminRoutes);
app.use("/", userRoutes);
app.use("/", authRoutes);
app.use("/", shopRoutes);
app.use("/", cartRoutes); // Add cart routes
app.use("/", checkoutRoutes); // Add checkout routes

module.exports = app;
