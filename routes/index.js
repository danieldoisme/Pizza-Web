const express = require("express");
const router = express.Router();
const adminRoutes = require("./admin");

// Homepage
router.get("/", (req, res) => {
  res.render("index");
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Mount admin routes under /admin prefix
router.use("/admin", adminRoutes);

module.exports = router;
