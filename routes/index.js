// var express = require('express');
// var router = express.Router();

// /* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

// module.exports = router;
const express = require("express");
const router = express.Router();

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

module.exports = router;
