const express = require("express");
const router = express.Router();

// Admin authentication middleware
function adminAuthMiddleware(req, res, next) {
  if (!req.session.adminId) {
    return res.redirect("/admin/login");
  }
  next();
}

// Admin login route
router.get("/login", (req, res) => {
  res.render("admin_signin");
});

router.post("/login", (req, res) => {
  // Admin login logic here
  // If successful, set req.session.adminId and redirect to dashboard
});

// Admin dashboard - protected by middleware
router.get("/dashboard", adminAuthMiddleware, (req, res) => {
  res.render("adminHomepage", { username: req.session.adminName });
});

// Add food route
router.get("/food/add", adminAuthMiddleware, (req, res) => {
  res.render("admin_addFood", { username: req.session.adminName });
});

// Change food price route
router.get("/food/price", adminAuthMiddleware, (req, res) => {
  // Get items from database
  res.render("admin_change_price", {
    username: req.session.adminName,
    items: [],
  });
});

// Dispatch orders route
router.get("/orders", adminAuthMiddleware, (req, res) => {
  // Get orders from database
  res.render("admin_view_dispatch_orders", {
    username: req.session.adminName,
    orders: [],
  });
});

module.exports = router;
