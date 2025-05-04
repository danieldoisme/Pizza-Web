const express = require("express");
const router = express.Router();

// Homepage
router.get("/", (req, res) => {
  // Call the renderIndexPage function from app.js (attached via middleware)
  // This function handles checking auth cookies and passing data to the template
  res.locals.renderIndexPage(req, res);
});

module.exports = router;
