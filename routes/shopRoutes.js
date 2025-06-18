const express = require("express");
const router = express.Router();
const { body, query, param, validationResult } = require("express-validator");
const isAuthenticated = require("../middleware/isAuthenticated");

function renderHomePage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const connection = req.app.get("dbConnection");

  if (!userId || !userName) {
    return res.redirect("/signin");
  }

  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, userResults) {
      if (error) {
        console.error("Error fetching user for homepage:", error);
        return res.status(500).render("homepage", {
          pageType: "homepage",
          items: [],
          promotionBanners: [],
          error: "Error loading homepage.",
        });
      }
      if (userResults.length) {
        connection.query(
          "SELECT banner_id, alt_text FROM promotion_banners WHERE is_active = 1 ORDER BY sort_order ASC, uploaded_at DESC",
          function (bannerError, bannerResults) {
            if (bannerError) {
              console.error("Error fetching promotion banners:", bannerError);
              connection.query(
                `SELECT 
                  item_id, item_name, item_type, item_category, item_price, 
                  item_calories, item_serving, item_rating, total_ratings, 
                  item_description_long
                FROM menu`,
                function (menuError, menuResults) {
                  if (menuError) {
                    console.error(
                      "Error fetching menu for homepage:",
                      menuError
                    );
                    return res.status(500).render("homepage", {
                      pageType: "homepage",
                      items: [],
                      promotionBanners: [],
                      error: "Error loading menu.",
                    });
                  }
                  res.render("homepage", {
                    pageType: "homepage",
                    items: menuResults || [],
                    promotionBanners: [],
                    error: "Error loading banners.",
                  });
                }
              );
            } else {
              connection.query(
                `SELECT 
                  item_id, item_name, item_type, item_category, item_price, 
                  item_calories, item_serving, item_rating, total_ratings, 
                  item_description_long
                FROM menu`,
                function (menuError, menuResults) {
                  if (menuError) {
                    console.error(
                      "Error fetching menu for homepage:",
                      menuError
                    );
                    return res.status(500).render("homepage", {
                      pageType: "homepage",
                      items: [],
                      promotionBanners: bannerResults || [],
                      error: "Error loading menu.",
                    });
                  }
                  res.render("homepage", {
                    pageType: "homepage",
                    items: menuResults || [],
                    promotionBanners: bannerResults || [],
                  });
                }
              );
            }
          }
        );
      } else {
        res.clearCookie("cookuid");
        res.clearCookie("cookuname");
        res.clearCookie("usertype");
        res.clearCookie("item_count");
        return res.redirect("/signin");
      }
    }
  );
}

router.get("/homepage", renderHomePage);

async function renderItemDetailPage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("Validation errors for item ID:", errors.array());
    return res.status(400).send("Invalid item ID format.");
  }

  const itemId = req.params.itemId;
  const connection = req.app.get("dbConnection");
  console.log(`renderItemDetailPage called for item ID: ${itemId}`);
  try {
    const itemQuery = `
      SELECT 
        m.item_id, m.item_name, m.item_type, m.item_category, m.item_price, 
        m.item_calories, m.item_serving, m.item_rating, m.total_ratings, 
        m.item_description_long
      FROM menu m
      WHERE m.item_id = ?`;
    const reviewsQuery =
      "SELECT ir.*, u.user_name FROM item_ratings ir JOIN users u ON ir.user_id = u.user_id WHERE ir.item_id = ? ORDER BY ir.rating_date DESC";

    connection.query(itemQuery, [itemId], (err, itemResults) => {
      if (err || itemResults.length === 0) {
        console.error("Error fetching item details or item not found:", err);
        return res.status(404).send("Item not found");
      }
      connection.query(reviewsQuery, [itemId], (reviewErr, reviewResults) => {
        if (reviewErr) {
          console.error("Error fetching reviews:", reviewErr);
        }
        res.render("itemDetail", {
          pageType: "item-detail",
          item: itemResults[0],
          reviews: reviewResults || [],
          error: null,
        });
      });
    });
  } catch (error) {
    console.error("Server error in renderItemDetailPage:", error);
    res.status(500).send("Error loading item page.");
  }
}

async function submitItemRating(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: errors.array(),
    });
  }

  const itemId = req.params.itemId;
  const userId = req.cookies.cookuid;
  const { rating_value, review_text } = req.body;
  const connection = req.app.get("dbConnection");
  console.log(
    `submitItemRating called for item ID: ${itemId} by user ID: ${userId} with rating: ${rating_value}`
  );

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "Please log in to rate items." });
  }

  try {
    const upsertQuery = `
      INSERT INTO item_ratings (item_id, user_id, rating_value, review_text) 
      VALUES (?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE rating_value = VALUES(rating_value), review_text = VALUES(review_text), rating_date = CURRENT_TIMESTAMP
    `;
    connection.query(
      upsertQuery,
      [itemId, userId, rating_value, review_text],
      (err, result) => {
        if (err) {
          console.error("Error submitting rating:", err);
          return res
            .status(500)
            .json({ success: false, message: "Failed to submit rating." });
        }
        const updateMenuRatingQuery = `
        UPDATE menu m SET 
        m.item_rating = (SELECT AVG(ir.rating_value) FROM item_ratings ir WHERE ir.item_id = ?),
        m.total_ratings = (SELECT COUNT(*) FROM item_ratings ir WHERE ir.item_id = ?)
        WHERE m.item_id = ?
      `;
        connection.query(
          updateMenuRatingQuery,
          [itemId, itemId, itemId],
          (updateErr) => {
            if (updateErr)
              console.error("Error updating menu average rating:", updateErr);
            res.json({
              success: true,
              message: "Rating submitted successfully!",
            });
          }
        );
      }
    );
  } catch (error) {
    console.error("Server error in submitItemRating:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
}

const searchValidationRules = [
  query("query")
    .trim()
    .notEmpty()
    .withMessage("Please enter a search term.")
    .isLength({ min: 1, max: 100 })
    .withMessage("Search term must be between 1 and 100 characters.")
    .escape(),
];

async function renderSearchResultsPage(req, res) {
  const errors = validationResult(req);
  const searchTerm = req.query.query;

  console.log(
    `renderSearchResultsPage called with search query: ${searchTerm}`
  );

  if (!errors.isEmpty()) {
    return res.render("searchResults", {
      pageType: "search",
      results: [],
      query: searchTerm || "",
      searchError: errors.array()[0].msg,
    });
  }

  const connection = req.app.get("dbConnection");

  try {
    const dbQuery = `
      SELECT 
        item_id, item_name, item_type, item_category, item_price, 
        item_calories, item_serving, item_rating, total_ratings, 
        item_description_long
      FROM menu 
      WHERE item_name LIKE ?
    `;
    const searchPattern = `%${searchTerm}%`;
    connection.query(dbQuery, [searchPattern], (err, searchResults) => {
      if (err) {
        console.error("Error searching items:", err);
        return res.render("searchResults", {
          pageType: "search",
          results: [],
          query: searchTerm,
          searchError: "Error performing search.",
        });
      }
      res.render("searchResults", {
        pageType: "search",
        results: searchResults,
        query: searchTerm,
        searchError: null,
      });
    });
  } catch (error) {
    console.error("Server error in renderSearchResultsPage:", error);
    res.status(500).render("searchResults", {
      pageType: "search",
      results: [],
      query: searchTerm || "",
      searchError: "An unexpected server error occurred.",
    });
  }
}

router.get(
  "/item/:itemId",
  isAuthenticated,
  [
    param("itemId")
      .isInt({ gt: 0 })
      .withMessage("Item ID must be a positive integer.")
      .toInt(),
  ],
  renderItemDetailPage
);

router.post(
  "/item/:itemId/rate",
  isAuthenticated,
  [
    param("itemId")
      .isInt({ gt: 0 })
      .withMessage("Item ID must be a positive integer.")
      .toInt(),
    body("rating_value")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be an integer between 1 and 5."),
    body("review_text")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Review text cannot exceed 1000 characters.")
      .escape(),
  ],
  submitItemRating
);
router.get(
  "/search",
  isAuthenticated,
  searchValidationRules,
  renderSearchResultsPage
);

module.exports = router;
