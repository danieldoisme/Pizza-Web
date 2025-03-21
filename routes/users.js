// var express = require('express');
// var router = express.Router();

// /* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });

// module.exports = router;
const express = require("express");
const router = express.Router();

// User authentication middleware
function userAuthMiddleware(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

// User dashboard
router.get("/dashboard", userAuthMiddleware, (req, res) => {
  // Get menu items from database
  res.render("homepage", { username: req.session.userName, items: [] });
});

// Cart route
router.get("/cart", userAuthMiddleware, (req, res) => {
  // Get cart items from database
  res.render("cart", {
    username: req.session.userName,
    items: [],
    item_count: 0,
  });
});

// Orders route
router.get("/orders", userAuthMiddleware, (req, res) => {
  // Get user's orders from database
  res.render("myorders", {
    username: req.session.userName,
    items: [],
    item_count: 0,
    userDetails: [{ user_name: req.session.userName }],
  });
});

// Settings route
router.get("/settings", userAuthMiddleware, (req, res) => {
  res.render("settings", { username: req.session.userName, item_count: 0 });
});

module.exports = router;
