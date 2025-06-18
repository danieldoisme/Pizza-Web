const express = require("express");
const router = express.Router();

router.get("/item-image/:itemId", (req, res) => {
  const itemId = req.params.itemId;
  const connection = req.app.get("dbConnection");

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
      res.status(404).send("Image not found.");
    }
  });
});

router.get("/banner-image/:banner_id", (req, res) => {
  const bannerId = req.params.banner_id;
  const connection = req.app.get("dbConnection");

  if (isNaN(parseInt(bannerId))) {
    return res.status(400).send("Invalid banner ID.");
  }

  const query =
    "SELECT image_blob, image_mimetype FROM promotion_banners WHERE banner_id = ?";

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
      res.status(404).send("Banner image not found.");
    }
  });
});

module.exports = router;
