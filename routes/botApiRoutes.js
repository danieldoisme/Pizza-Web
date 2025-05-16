const express = require("express");
const router = express.Router();

// Endpoint to get all menu items or filter by category/type
router.get("/menu-items", (req, res) => {
  const connection = req.app.get("dbConnection");
  const { category, type } = req.query;

  let query =
    "SELECT item_id, item_name, item_price, item_category, item_type, item_description_long, item_calories, item_img FROM menu";
  const queryParams = [];
  const conditions = [];

  if (category) {
    conditions.push("item_category = ?");
    queryParams.push(category);
  }
  if (type) {
    conditions.push("item_type = ?");
    queryParams.push(type);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY item_name ASC";

  connection.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching menu items for bot:", err);
      return res
        .status(500)
        .json({ success: false, message: "Error fetching menu items." });
    }
    res.json({ success: true, items: results });
  });
});

// Endpoint to get details for a specific menu item by name or ID
router.get("/menu-item/:identifier", (req, res) => {
  const connection = req.app.get("dbConnection");
  const identifier = req.params.identifier;
  const isNumericId = /^\d+$/.test(identifier);
  let query;
  let queryParams;

  if (isNumericId) {
    query =
      "SELECT item_id, item_name, item_price, item_category, item_type, item_description_long, item_calories, item_img FROM menu WHERE item_id = ?";
    queryParams = [parseInt(identifier)];
  } else {
    // Using LIKE for more flexible name matching
    query =
      "SELECT item_id, item_name, item_price, item_category, item_type, item_description_long, item_calories, item_img FROM menu WHERE item_name LIKE ?";
    queryParams = [`%${identifier}%`];
  }

  connection.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching specific menu item for bot:", err);
      return res
        .status(500)
        .json({ success: false, message: "Error fetching item details." });
    }
    if (results.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Menu item not found." });
    }
    // If searching by name and multiple items match, Botpress might need to handle disambiguation
    // For simplicity, returning the first match or all matches if by name
    res.json({
      success: true,
      item: isNumericId || results.length === 1 ? results[0] : results,
    });
  });
});

// Example for a simple FAQ - e.g., restaurant story (can be expanded)
router.get("/faq/story", (req, res) => {
  // This could also come from a database table if it changes often
  const story =
    "Our story began with Nonna Emilia, whose love for family and food was as boundless as the Tuscan sky... (fetch full story)";
  res.json({ success: true, topic: "Our Story", content: story });
});

module.exports = router;
