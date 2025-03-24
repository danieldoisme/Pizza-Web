const express = require("express");
const router = express.Router();
const isAdmin = require("../middleware/isAdmin");

// Apply admin middleware to all routes in this router
router.use(isAdmin);

// Admin login route
router.get("/login", (req, res) => {
  res.render("admin/login");
});

router.post("/login", (req, res) => {
  // Admin login logic here
  // If successful, set req.session.adminId and redirect to dashboard
});

// Admin dashboard
router.get("/dashboard", (req, res) => {
  res.render("admin/dashboard", { username: req.session.adminName });
});

// Add food route
router.get("/food/add", (req, res) => {
  res.render("admin/addFood", { username: req.session.adminName });
});

// Change food price route
router.get("/food/price", (req, res) => {
  // Get items from database
  res.render("admin/changePrice", {
    username: req.session.adminName,
    items: [],
  });
});

// Dispatch orders route
router.get("/orders", (req, res) => {
  // Get orders from database
  res.render("admin/orders", {
    username: req.session.adminName,
    orders: [],
  });
});

// Admin dashboard
router.get("/", (req, res) => {
  res.redirect("/admin/dashboard");
});

// Products route
router.get("/products", (req, res) => {
  res.render("admin/products");
});

module.exports = router;
