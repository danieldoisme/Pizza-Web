const express = require("express");
const router = express.Router();
const adminRoutes = require("./admin"); // Import the admin routes

// Home page
router.get("/", (req, res) => {
  res.render("index");
});

// Login
router.get("/login", (req, res) => {
  res.render("signin");
});

router.post("/login", (req, res) => {
  // Login logic here
  // If successful, set req.session.userId and redirect to dashboard
});

// Register
router.get("/register", (req, res) => {
  res.render("signup");
});

router.post("/register", (req, res) => {
  // Registration logic here
  // If successful, redirect to login page
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Mount admin routes under /admin prefix
router.use("/admin", adminRoutes);

module.exports = router;
