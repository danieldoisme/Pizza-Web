const express = require("express");
const router = express.Router();

// GET /item-image/:itemId - Serves item images from the database
// This route will be accessed via /images/item-image/:itemId if registered with app.use('/images', imageRoutes);
router.get("/item-image/:itemId", (req, res) => {
  const itemId = req.params.itemId;
  const connection = req.app.get("dbConnection"); // Get the database connection pool

  if (isNaN(parseInt(itemId))) {
    return res.status(400).send("Invalid item ID.");
  }

  const query =
    "SELECT item_img_blob, item_img_mimetype FROM menu WHERE item_id = ?";

  connection.query(query, [itemId], (err, results) => {
    if (err) {
      console.error("Database error fetching image for item ID:", itemId, err);
      return res.status(500).send("Error retrieving image.");
    }

    if (
      results.length > 0 &&
      results[0].item_img_blob &&
      results[0].item_img_mimetype
    ) {
      res.setHeader("Content-Type", results[0].item_img_mimetype);
      res.send(results[0].item_img_blob);
    } else {
      // Optional: Send a default placeholder image or a 404
      console.warn(`Image data or mimetype not found for item ID: ${itemId}`);
      // You could send a default image file here:
      // res.sendFile(path.join(__dirname, '../public/images/dish/default-pizza.jpg'));
      res.status(404).send("Image not found.");
    }
  });
});

module.exports = router;
