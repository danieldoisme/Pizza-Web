const express = require("express");
const router = express.Router();

// Route for the main landing page (index)
router.get("/", (req, res) => {
  // index.ejs uses res.locals.username, .userid, .isAdmin, .item_count if available
  // These are set by the global middleware in app.js.
  // No specific menu item query is needed for the index page itself.
  res.render("index", {
    pageType: "index",
    // username, userid, isAdmin, item_count are available via res.locals
  });
});

module.exports = router;
