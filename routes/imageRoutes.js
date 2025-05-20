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

// GET /banner-image/:banner_id - Serves promotion banner images from the database
// This route will be accessed via /images/banner-image/:banner_id if registered with app.use('/images', imageRoutes);
router.get("/banner-image/:banner_id", (req, res) => {
  const bannerId = req.params.banner_id;
  const connection = req.app.get("dbConnection"); // Get the database connection pool

  if (isNaN(parseInt(bannerId))) {
    return res.status(400).send("Invalid banner ID.");
  }

  // Query for active banners. If you need to show inactive banners in admin, adjust or create a separate route.
  const query =
    "SELECT image_blob, image_mimetype FROM promotion_banners WHERE banner_id = ?"; // Removed 'AND is_active = 1' for admin panel to see all

  connection.query(query, [bannerId], (err, results) => {
    if (err) {
      console.error(
        "Database error fetching image for banner ID:",
        bannerId,
        err
      );
      return res.status(500).send("Error retrieving banner image.");
    }

    if (
      results.length > 0 &&
      results[0].image_blob &&
      results[0].image_mimetype
    ) {
      res.setHeader("Content-Type", results[0].image_mimetype);
      res.send(results[0].image_blob);
    } else {
      console.warn(
        `Image data or mimetype not found for banner ID: ${bannerId}`
      );
      res.status(404).send("Banner image not found.");
    }
  });
});

module.exports = router;
