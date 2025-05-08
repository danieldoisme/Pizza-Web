const express = require("express");
const router = express.Router();

// Homepage
router.get("/", (req, res) => {
  res.locals.renderIndexPage(req, res);
});

module.exports = router;
