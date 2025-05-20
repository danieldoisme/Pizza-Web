const express = require("express");
const router = express.Router();

// Endpoint to get all menu items or filter by category/type
router.get("/menu-items", (req, res) => {
  const connection = req.app.get("dbConnection");
  const { category, type } = req.query;

  let query =
    "SELECT item_id, item_name, item_price, item_category, item_type, item_description_long, item_calories FROM menu";
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
    // Add image URLs to each item
    const itemsWithImages = results.map((item) => ({
      ...item,
      item_image_url: `${req.protocol}://${req.get("host")}/images/item-image/${
        item.item_id
      }`,
    }));
    res.json({ success: true, items: itemsWithImages });
  });
});

// Endpoint to get details for a specific menu item by name or ID
router.get("/menu-item/:itemName", (req, res) => {
  const connection = req.app.get("dbConnection");
  const itemName = req.params.itemName;
  const isNumericId = /^\d+$/.test(itemName);
  let query;
  let queryParams;

  if (isNumericId) {
    query =
      "SELECT item_id, item_name, item_price, item_category, item_type, item_description_long, item_calories FROM menu WHERE item_id = ?";
    queryParams = [parseInt(itemName)];
  } else {
    // Using LIKE for more flexible name matching
    query = `
    SELECT 
      item_id, item_name, item_type, item_category, item_price, 
      item_calories, item_serving, item_rating, total_ratings, 
      item_description_long
    FROM menu 
    WHERE item_name LIKE ?`;
    queryParams = [`%${itemName}%`];
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

    // Process results to add image URL
    // If searching by name and multiple items match, Botpress might need to handle disambiguation.
    // For now, if multiple results by name, we'll add image_url to all.
    // If by ID, there should be only one.
    const processedResults = results.map((item) => ({
      ...item,
      item_image_url: `${req.protocol}://${req.get("host")}/images/item-image/${
        item.item_id
      }`,
    }));

    if (isNumericId) {
      // If searched by ID, there should be only one result
      res.json({ success: true, item: processedResults[0] });
    } else {
      // If searched by name, return all matches (or just the first if preferred)
      // For simplicity, returning the first match if only one, or all if multiple.
      // The bot might need logic to handle multiple matches.
      res.json({
        success: true,
        item:
          processedResults.length === 1
            ? processedResults[0]
            : processedResults,
      });
    }
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
