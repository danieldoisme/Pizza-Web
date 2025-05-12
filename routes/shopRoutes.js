const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/isAuthenticated");

// Render Home Page (Menu Page)
function renderHomePage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  // item_count is available from res.locals.item_count set by global middleware
  const connection = req.app.get("dbConnection");

  // This check ensures that only users with valid cookies can access the homepage.
  // If cookies are missing, redirect to signin.
  if (!userId || !userName) {
    return res.redirect("/signin");
  }

  // Validate user from DB (this logic was in the original app.js function)
  connection.query(
    "SELECT user_id, user_name FROM users WHERE user_id = ? AND user_name = ?",
    [userId, userName],
    function (error, userResults) {
      if (error) {
        console.error("Error fetching user for homepage:", error);
        // Render homepage with an error message if DB query fails
        return res.status(500).render("homepage", {
          pageType: "homepage",
          items: [],
          error: "Error loading homepage.",
          // username, userid, item_count are available via res.locals
        });
      }
      if (userResults.length) {
        // User validated, now fetch menu items
        // Fetch all columns needed by homepage.ejs
        connection.query(
          "SELECT item_id, item_name, item_type, item_category, item_serving, item_calories, item_price, item_rating, total_ratings, item_img FROM menu",
          function (error, menuResults) {
            if (error) {
              console.error("Error fetching menu for homepage:", error);
              return res.status(500).render("homepage", {
                pageType: "homepage",
                items: [],
                error: "Error loading menu.",
                // username, userid, item_count are available via res.locals
              });
            }
            res.render("homepage", {
              pageType: "homepage",
              items: menuResults,
              // username, userid, item_count are available via res.locals
            });
          }
        );
      } else {
        // Cookies were present but user not found in DB (e.g., user deleted, or invalid cookie)
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

// Placeholder for Item Detail Page
async function renderItemDetailPage(req, res) {
  const itemId = req.params.itemId;
  const connection = req.app.get("dbConnection");
  console.log(`renderItemDetailPage called for item ID: ${itemId}`);
  // Logic to fetch item details from 'menu' table using itemId
  // Fetch item ratings from 'item_ratings' table
  // Render an item detail EJS template (e.g., itemDetail.ejs)
  try {
    const itemQuery =
      "SELECT *, (SELECT AVG(rating_value) FROM item_ratings WHERE item_id = menu.item_id) as avg_rating, (SELECT COUNT(*) FROM item_ratings WHERE item_id = menu.item_id) as num_ratings FROM menu WHERE item_id = ?";
    const reviewsQuery =
      "SELECT ir.*, u.user_name FROM item_ratings ir JOIN users u ON ir.user_id = u.user_id WHERE ir.item_id = ? ORDER BY ir.rating_date DESC";

    connection.query(itemQuery, [itemId], (err, itemResults) => {
      if (err || itemResults.length === 0) {
        console.error("Error fetching item details or item not found:", err);
        return res.status(404).send("Item not found"); // Or render a 404 page
      }
      connection.query(reviewsQuery, [itemId], (reviewErr, reviewResults) => {
        if (reviewErr) {
          console.error("Error fetching reviews:", reviewErr);
          // Continue to render page without reviews or with an error message for reviews
        }
        res.render("itemDetail", {
          // Assuming you have an itemDetail.ejs
          pageType: "item-detail",
          item: itemResults[0],
          reviews: reviewResults || [],
          error: null,
          // username, userid, item_count, isAdmin from res.locals
        });
      });
    });
  } catch (error) {
    console.error("Server error in renderItemDetailPage:", error);
    res.status(500).send("Error loading item page.");
  }
}

// Placeholder for Submitting Item Rating
async function submitItemRating(req, res) {
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
  if (!rating_value || rating_value < 1 || rating_value > 5) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid rating value." });
  }

  try {
    // Upsert logic: Insert or Update rating
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
        // After submitting, update the average rating and total ratings in the menu table
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

// Corrected Search Results Page handler
async function renderSearchResultsPage(req, res) {
  const searchTerm = req.query.query;
  const connection = req.app.get("dbConnection");
  console.log(
    `renderSearchResultsPage called with search query: ${searchTerm}`
  );

  if (!searchTerm || searchTerm.trim() === "") {
    return res.render("searchResults", {
      pageType: "search",
      results: [],
      query: "",
      searchError: "Please enter a search term.",
      // username, userid, item_count, isAdmin from res.locals
    });
  }

  try {
    // Add item_type to the SELECT statement
    const dbQuery = `
      SELECT item_id, item_name, item_price, item_img, item_category, item_calories, item_type 
      FROM menu 
      WHERE item_name LIKE ? OR item_category LIKE ? OR item_description_long LIKE ?
    `;
    const searchPattern = `%${searchTerm}%`;
    connection.query(
      dbQuery,
      [searchPattern, searchPattern, searchPattern],
      (err, searchResults) => {
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
      }
    );
  } catch (error) {
    console.error("Server error in renderSearchResultsPage:", error);
    res.status(500).render("searchResults", {
      pageType: "search",
      results: [],
      query: searchTerm,
      searchError: "An unexpected server error occurred.",
    });
  }
}

router.get("/item/:itemId", renderItemDetailPage); // No isAuthenticated, so anyone can view
router.post("/item/:itemId/rate", isAuthenticated, submitItemRating);
router.get("/search", renderSearchResultsPage); // No isAuthenticated, so anyone can search

module.exports = router;
