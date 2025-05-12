const express = require("express");
const router = express.Router();

const isAuthenticated = require("../middleware/isAuthenticated");

// Helper function to get cart count (can be called internally)
async function fetchCartCount(connection, userId) {
  return new Promise((resolve, reject) => {
    const query =
      "SELECT SUM(quantity) AS itemCount FROM user_cart_items WHERE user_id = ?";
    connection.query(query, [userId], (err, results) => {
      if (err) {
        console.error("Error fetching cart count:", err);
        return reject(err);
      }
      const count =
        results && results.length > 0 && results[0].itemCount
          ? parseInt(results[0].itemCount)
          : 0;
      resolve(count);
    });
  });
}

// Render Cart Page
async function renderCart(req, res) {
  const user_id = req.cookies.cookuid;
  const connection = req.app.get("dbConnection");

  try {
    const query = `
      SELECT uc.item_id, uc.quantity, m.item_name, m.item_price, m.item_img 
      FROM user_cart_items uc
      JOIN menu m ON uc.item_id = m.item_id
      WHERE uc.user_id = ? AND uc.quantity > 0
    `; // Selected m.item_img directly
    connection.query(query, [user_id], (err, results) => {
      if (err) {
        console.error("Error fetching cart items from database:", err);
        return res.status(500).render("cart", {
          error: "Error loading your cart. Please try again later.",
          items: [],
          count: 0, // Pass count
          total: 0,
          pageType: "cart",
        });
      }

      const cartItems = results.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        item_price: parseFloat(item.item_price),
        quantity: parseInt(item.quantity),
        subtotal: parseFloat(item.item_price) * parseInt(item.quantity),
        // Construct the full image path here
        item_image: item.item_img
          ? `/images/dish/${item.item_img}`
          : "/images/dish/default-pizza.jpg",
      }));

      const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );

      res.render("cart", {
        items: cartItems,
        count: itemCount, // Pass the calculated item count
        total: totalAmount,
        pageType: "cart",
        error: req.query.message || null,
      });
    });
  } catch (error) {
    console.error("Server error in renderCart:", error);
    res.status(500).render("cart", {
      error: "An unexpected error occurred while loading your cart.",
      items: [],
      count: 0, // Pass count
      total: 0,
      pageType: "cart",
    });
  }
}

// Get Cart API - Fetches detailed cart contents
async function getCartAPI(req, res) {
  const userId = req.cookies.cookuid;
  const connection = req.app.get("dbConnection");

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated." });
  }

  try {
    const query = `
      SELECT uc.item_id, uc.quantity, m.item_name, m.item_price, m.item_img 
      FROM user_cart_items uc
      JOIN menu m ON uc.item_id = m.item_id
      WHERE uc.user_id = ? AND uc.quantity > 0
    `; // Selected m.item_img directly
    connection.query(query, [userId], (err, results) => {
      if (err) {
        console.error("Error fetching cart items for API:", err);
        return res
          .status(500)
          .json({ success: false, message: "Error loading your cart." });
      }

      const cartItems = results.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        item_price: parseFloat(item.item_price),
        quantity: parseInt(item.quantity),
        subtotal: parseFloat(item.item_price) * parseInt(item.quantity),
        // Construct the full image path here
        item_image: item.item_img
          ? `/images/dish/${item.item_img}`
          : "/images/dish/default-pizza.jpg",
      }));

      const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );

      res.json({
        success: true,
        cartItems: cartItems,
        itemCount: itemCount,
        totalAmount: totalAmount,
      });
    });
  } catch (error) {
    console.error("Server error in getCartAPI:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected server error occurred.",
    });
  }
}

// Add to Cart API
async function addToCartAPI(req, res) {
  const userId = req.cookies.cookuid;
  const { itemId, quantity = 1 } = req.body;
  const connection = req.app.get("dbConnection");

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated." });
  }
  if (!itemId) {
    return res
      .status(400)
      .json({ success: false, message: "Item ID is required." });
  }
  const addQuantity = parseInt(quantity);
  if (isNaN(addQuantity) || addQuantity <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid quantity." });
  }

  try {
    const checkQuery =
      "SELECT quantity FROM user_cart_items WHERE user_id = ? AND item_id = ?";
    connection.query(
      checkQuery,
      [userId, itemId],
      async (checkErr, results) => {
        if (checkErr) {
          console.error("Error checking cart for item:", checkErr);
          return res
            .status(500)
            .json({ success: false, message: "Error adding item to cart." });
        }

        let newItemCount;
        if (results.length > 0) {
          const updateQuery =
            "UPDATE user_cart_items SET quantity = quantity + ? WHERE user_id = ? AND item_id = ?";
          connection.query(
            updateQuery,
            [addQuantity, userId, itemId],
            async (updateErr) => {
              if (updateErr) {
                console.error(
                  "Error updating item quantity in cart:",
                  updateErr
                );
                return res.status(500).json({
                  success: false,
                  message: "Error updating item in cart.",
                });
              }
              newItemCount = await fetchCartCount(connection, userId);
              res.cookie("item_count", newItemCount, { httpOnly: false });
              res.json({
                success: true,
                message: "Item quantity updated in cart.",
                newItemCount,
              });
            }
          );
        } else {
          const insertQuery =
            "INSERT INTO user_cart_items (user_id, item_id, quantity) VALUES (?, ?, ?)";
          connection.query(
            insertQuery,
            [userId, itemId, addQuantity],
            async (insertErr) => {
              if (insertErr) {
                console.error("Error inserting new item into cart:", insertErr);
                return res.status(500).json({
                  success: false,
                  message: "Error adding new item to cart.",
                });
              }
              newItemCount = await fetchCartCount(connection, userId);
              res.cookie("item_count", newItemCount, { httpOnly: false });
              res.json({
                success: true,
                message: "Item added to cart.",
                newItemCount,
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("Server error in addToCartAPI:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while adding to cart." });
  }
}

// Update Cart API
async function updateCartAPI(req, res) {
  const userId = req.cookies.cookuid;
  const { itemId, newQuantity } = req.body;
  const connection = req.app.get("dbConnection");

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated." });
  }
  if (!itemId || typeof newQuantity === "undefined") {
    return res.status(400).json({
      success: false,
      message: "Item ID and new quantity are required.",
    });
  }
  const quantityValue = parseInt(newQuantity);
  if (isNaN(quantityValue) || quantityValue < 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid quantity value." });
  }

  try {
    let newItemCount;
    if (quantityValue === 0) {
      const deleteQuery =
        "DELETE FROM user_cart_items WHERE user_id = ? AND item_id = ?";
      connection.query(
        deleteQuery,
        [userId, itemId],
        async (deleteErr, result) => {
          if (deleteErr) {
            console.error(
              "Error removing item from cart (update to 0):",
              deleteErr
            );
            return res
              .status(500)
              .json({ success: false, message: "Error updating cart." });
          }
          newItemCount = await fetchCartCount(connection, userId);
          res.cookie("item_count", newItemCount, { httpOnly: false });
          if (result.affectedRows > 0) {
            res.json({
              success: true,
              message: "Item removed from cart.",
              newItemCount,
            });
          } else {
            res.json({
              success: true,
              message: "Item not found or already removed.",
              newItemCount,
            });
          }
        }
      );
    } else {
      const updateQuery =
        "UPDATE user_cart_items SET quantity = ? WHERE user_id = ? AND item_id = ?";
      connection.query(
        updateQuery,
        [quantityValue, userId, itemId],
        async (updateErr, result) => {
          if (updateErr) {
            console.error("Error updating item quantity in cart:", updateErr);
            return res
              .status(500)
              .json({ success: false, message: "Error updating cart." });
          }
          newItemCount = await fetchCartCount(connection, userId);
          res.cookie("item_count", newItemCount, { httpOnly: false });
          if (result.affectedRows > 0) {
            res.json({
              success: true,
              message: "Cart updated successfully.",
              newItemCount,
            });
          } else {
            const checkQuery = "SELECT item_id FROM menu WHERE item_id = ?";
            connection.query(
              checkQuery,
              [itemId],
              async (itemErr, itemResults) => {
                if (itemErr || itemResults.length === 0) {
                  return res.status(404).json({
                    success: false,
                    message: "Item to update not found in menu.",
                    newItemCount,
                  });
                }
                res.status(404).json({
                  success: false,
                  message: "Item not found in cart to update.",
                  newItemCount,
                });
              }
            );
          }
        }
      );
    }
  } catch (error) {
    console.error("Server error in updateCartAPI:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while updating cart." });
  }
}

// Remove From Cart API
async function removeFromCartAPI(req, res) {
  const userId = req.cookies.cookuid;
  const { itemId } = req.body;
  const connection = req.app.get("dbConnection");

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated." });
  }
  if (!itemId) {
    return res
      .status(400)
      .json({ success: false, message: "Item ID is required." });
  }

  try {
    const deleteQuery =
      "DELETE FROM user_cart_items WHERE user_id = ? AND item_id = ?";
    connection.query(
      deleteQuery,
      [userId, itemId],
      async (deleteErr, result) => {
        if (deleteErr) {
          console.error("Error removing item from cart:", deleteErr);
          return res.status(500).json({
            success: false,
            message: "Error removing item from cart.",
          });
        }
        const newItemCount = await fetchCartCount(connection, userId);
        res.cookie("item_count", newItemCount, { httpOnly: false });
        if (result.affectedRows > 0) {
          res.json({
            success: true,
            message: "Item removed from cart.",
            newItemCount,
          });
        } else {
          res.json({
            success: true,
            message: "Item not found in cart or already removed.",
            newItemCount,
          });
        }
      }
    );
  } catch (error) {
    console.error("Server error in removeFromCartAPI:", error);
    res.status(500).json({
      success: false,
      message: "Server error while removing from cart.",
    });
  }
}

// Get Cart Count API
async function getCartCountAPI(req, res) {
  const userId = req.cookies.cookuid; // Server can access HttpOnly cookies
  const connection = req.app.get("dbConnection");
  if (!userId) {
    // User is not logged in (or cookie missing), return 0 count
    return res.json({ success: true, count: 0 }); // Still success:true, but count is 0
  }
  try {
    const count = await fetchCartCount(connection, userId);
    res.cookie("item_count", count, { httpOnly: false });
    res.json({ success: true, count: count });
  } catch (error) {
    res.json({
      success: false,
      count: 0,
      message: "Server error fetching cart count.",
    });
  }
}

// Cart Page Route
router.get("/cart", isAuthenticated, renderCart);

// API Routes for Cart Management
router.get("/api/cart", isAuthenticated, getCartAPI);
router.post("/api/cart/add", isAuthenticated, addToCartAPI);
router.post("/api/cart/update", isAuthenticated, updateCartAPI);
router.post("/api/cart/remove", isAuthenticated, removeFromCartAPI);
router.get("/api/cart/count", isAuthenticated, getCartCountAPI);

module.exports = router;
