const express = require("express");
const router = express.Router();
const isAdmin = require("../middleware/isAdmin");

// Login routes (no auth required)
router.get("/login", (req, res) => {
  res.locals.renderAdminLogInPage(req, res);
});

router.post("/login", (req, res) => {
  res.locals.adminLogIn(req, res);
});

// Logout route (no auth required)
router.get("/logout", (req, res) => {
  res.locals.logout(req, res);
});

// Apply the isAdmin middleware to all protected admin routes
router.use(isAdmin);

// Protected admin routes
router.get("/dashboard", (req, res) => {
  res.locals.renderAdminHomepage(req, res);
});

router.get("/addFood", (req, res) => {
  res.locals.renderAddFoodPage(req, res);
});

router.post("/addFood", (req, res) => {
  res.locals.addFood(req, res);
});

router.get("/orders", (req, res) => {
  res.locals.renderViewDispatchOrdersPage(req, res);
});

router.post("/orders", (req, res) => {
  res.locals.dispatchOrders(req, res);
});

router.get("/changePrice", (req, res) => {
  res.locals.renderChangePricePage(req, res);
});

router.post("/changePrice", (req, res) => {
  res.locals.changePrice(req, res);
});

module.exports = router;
