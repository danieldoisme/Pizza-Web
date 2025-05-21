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
      SELECT uc.item_id, uc.quantity, m.item_name, m.item_price
      FROM user_cart_items uc
      JOIN menu m ON uc.item_id = m.item_id
      WHERE uc.user_id = ? AND uc.quantity > 0
    `;
    connection.query(query, [user_id], (err, results) => {
      if (err) {
        console.error("Error fetching cart items from database:", err);
        return res.status(500).render("cart", {
          error: "Error loading your cart. Please try again later.",
          items: [],
          count: 0,
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
        // item_image property is removed, cart.ejs will use item_id
      }));

      const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );

      res.render("cart", {
        items: cartItems,
        count: itemCount,
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
      count: 0,
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
      SELECT uc.item_id, uc.quantity, m.item_name, m.item_price
      FROM user_cart_items uc
      JOIN menu m ON uc.item_id = m.item_id
      WHERE uc.user_id = ? AND uc.quantity > 0
    `; // m.item_img (old filename) is no longer needed here for constructing the path
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
        item_image: `/images/item-image/${item.item_id}`, // Updated to provide the new dynamic URL
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
  const { itemId, quantity = 1 } = req.body; // quantity is the amount to add
  const connection = req.app.get("dbConnection");

  const minQuantity = 1; // Minimum quantity for an item in cart (usually 1 when adding)
  const maxQuantity = 10; // Maximum allowed quantity for any single item in the cart

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
      .json({ success: false, message: "Invalid quantity to add." });
  }

  try {
    // First, check if the item is valid by looking it up in the menu
    const checkMenuQuery = "SELECT item_id FROM menu WHERE item_id = ?";
    connection.query(checkMenuQuery, [itemId], async (menuErr, menuResults) => {
      if (menuErr) {
        console.error("Error checking menu item:", menuErr);
        return res
          .status(500)
          .json({ success: false, message: "Error verifying item details." });
      }
      if (menuResults.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Item to add does not exist." });
      }

      // Item exists in menu, proceed with cart logic
      const checkCartQuery =
        "SELECT quantity FROM user_cart_items WHERE user_id = ? AND item_id = ?";
      connection.query(
        checkCartQuery,
        [userId, itemId],
        async (checkErr, cartResults) => {
          if (checkErr) {
            console.error("Error checking cart for item:", checkErr);
            return res
              .status(500)
              .json({ success: false, message: "Error adding item to cart." });
          }

          let finalQuantity;
          let message = "Item added to cart."; // Default message

          if (cartResults.length > 0) {
            // Item already in cart
            const currentQuantityInCart = parseInt(cartResults[0].quantity);
            const potentialNewQuantity = currentQuantityInCart + addQuantity;

            if (potentialNewQuantity > maxQuantity) {
              finalQuantity = maxQuantity;
              message = `Item quantity updated. Maximum ${maxQuantity} units allowed; quantity capped.`;
            } else {
              finalQuantity = potentialNewQuantity;
              message = "Item quantity updated in cart.";
            }
            if (finalQuantity <= 0) {
              // Should not happen if addQuantity is > 0
              finalQuantity = minQuantity; // Or handle as an error/removal
            }

            const updateQuery =
              "UPDATE user_cart_items SET quantity = ? WHERE user_id = ? AND item_id = ?";
            connection.query(
              updateQuery,
              [finalQuantity, userId, itemId],
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
                const newItemCount = await fetchCartCount(connection, userId);
                res.cookie("item_count", newItemCount, { httpOnly: false });
                res.json({
                  success: true,
                  message: message,
                  newItemCount,
                  updatedItemId: itemId,
                  newQuantityInCart: finalQuantity,
                });
              }
            );
          } else {
            // Item not in cart, add new
            if (addQuantity > maxQuantity) {
              finalQuantity = maxQuantity;
              message = `Item added to cart. Maximum ${maxQuantity} units allowed; quantity capped.`;
            } else {
              finalQuantity = addQuantity;
            }
            if (finalQuantity < minQuantity) {
              // Ensure it's at least minQuantity
              finalQuantity = minQuantity;
            }

            const insertQuery =
              "INSERT INTO user_cart_items (user_id, item_id, quantity) VALUES (?, ?, ?)";
            connection.query(
              insertQuery,
              [userId, itemId, finalQuantity],
              async (insertErr) => {
                if (insertErr) {
                  console.error(
                    "Error inserting new item into cart:",
                    insertErr
                  );
                  return res.status(500).json({
                    success: false,
                    message: "Error adding new item to cart.",
                  });
                }
                const newItemCount = await fetchCartCount(connection, userId);
                res.cookie("item_count", newItemCount, { httpOnly: false });
                res.json({
                  success: true,
                  message: message,
                  newItemCount,
                  addedItemId: itemId,
                  newQuantityInCart: finalQuantity,
                });
              }
            );
          }
        }
      );
    });
  } catch (error) {
    // Catch synchronous errors or unhandled promise rejections
    console.error("Server error in addToCartAPI (outer try-catch):", error);
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

  const minQuantity = 1;
  const maxQuantity = 10;

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

  // Validate newQuantity to be between minQuantity and maxQuantity
  if (
    isNaN(quantityValue) ||
    quantityValue < minQuantity ||
    quantityValue > maxQuantity
  ) {
    // Fetch current quantity from DB to send back for client-side input reset
    const getCurrentQtyQuery =
      "SELECT quantity FROM user_cart_items WHERE user_id = ? AND item_id = ?";
    connection.query(getCurrentQtyQuery, [userId, itemId], (err, results) => {
      let currentQuantityInCart = minQuantity; // Default if item not in cart or error

      if (err) {
        console.error(
          "DB error fetching current quantity for validation response:",
          err
        );
      } else if (results.length > 0) {
        const dbQuantity = results[0].quantity;
        // If DB quantity is somehow outside valid range, still report a valid number for reset
        if (dbQuantity >= minQuantity && dbQuantity <= maxQuantity) {
          currentQuantityInCart = dbQuantity;
        } else {
          console.warn(
            `Item ${itemId} for user ${userId} has an invalid quantity ${dbQuantity} in DB. Reporting ${minQuantity} for reset.`
          );
          currentQuantityInCart = minQuantity; // Or maxQuantity if that makes more sense, but min is safer.
        }
      }
      // If results.length is 0, item is not in cart; currentQuantityInCart remains minQuantity.

      return res.status(400).json({
        success: false,
        message: `Quantity must be between ${minQuantity} and ${maxQuantity}.`,
        currentQuantityInCart: currentQuantityInCart,
      });
    });
    return; // Stop further processing
  }

  // If quantityValue is valid (1-10), proceed to update the database
  try {
    const updateQuery =
      "UPDATE user_cart_items SET quantity = ? WHERE user_id = ? AND item_id = ?";
    connection.query(
      updateQuery,
      [quantityValue, userId, itemId],
      async (updateErr, result) => {
        if (updateErr) {
          console.error("Error updating item quantity in cart:", updateErr);
          // Attempt to fetch current quantity for error response
          const getCurrentQtyQueryOnError =
            "SELECT quantity FROM user_cart_items WHERE user_id = ? AND item_id = ?";
          connection.query(
            getCurrentQtyQueryOnError,
            [userId, itemId],
            (err, qtyResults) => {
              let qtyInCart = quantityValue; // Fallback to the quantity attempted by user
              if (!err && qtyResults.length > 0) {
                qtyInCart = qtyResults[0].quantity;
                // Ensure this is also within bounds for consistency
                if (qtyInCart < minQuantity || qtyInCart > maxQuantity)
                  qtyInCart = minQuantity;
              } else if (err) {
                console.error(
                  "DB error fetching current quantity on update error:",
                  err
                );
              }
              return res.status(500).json({
                success: false,
                message: "Error updating cart.",
                currentQuantityInCart: qtyInCart,
              });
            }
          );
          return;
        }

        const newItemCount = await fetchCartCount(connection, userId);
        res.cookie("item_count", newItemCount, { httpOnly: false });

        if (result.affectedRows > 0) {
          res.json({
            success: true,
            message: "Cart updated successfully.",
            newItemCount,
            updatedItemId: itemId,
            newQuantity: quantityValue, // The validated and saved quantity
          });
        } else {
          // Item not found in cart for this user, or quantity was already the same.
          // Check if the item itself is valid in the menu.
          const checkMenuQuery = "SELECT item_id FROM menu WHERE item_id = ?";
          connection.query(checkMenuQuery, [itemId], (menuErr, menuResults) => {
            let responseMessage =
              "Item not found in cart to update, or quantity was already correct.";
            let responseStatus = 404;
            let qtyForClient = minQuantity;

            if (menuErr) {
              console.error("Error checking menu item:", menuErr);
              responseMessage = "Error verifying item details.";
              responseStatus = 500;
            } else if (menuResults.length === 0) {
              responseMessage = "Item to update does not exist in menu.";
              responseStatus = 404; // Item itself is invalid
            } else {
              // Item is valid in menu, but not in user's cart for update.
              // Try to get current quantity if it exists, otherwise default to minQuantity.
              const getCurrentQtyQueryAgain =
                "SELECT quantity FROM user_cart_items WHERE user_id = ? AND item_id = ?";
              connection.query(
                getCurrentQtyQueryAgain,
                [userId, itemId],
                (qErr, qResults) => {
                  if (!qErr && qResults.length > 0) {
                    qtyForClient = qResults[0].quantity;
                    if (
                      qtyForClient < minQuantity ||
                      qtyForClient > maxQuantity
                    )
                      qtyForClient = minQuantity;
                  }
                  return res.status(responseStatus).json({
                    success: false,
                    message: responseMessage,
                    newItemCount, // Cart count might be unchanged but still relevant
                    currentQuantityInCart: qtyForClient,
                  });
                }
              );
              return; // Return here to avoid double response
            }

            return res.status(responseStatus).json({
              success: false,
              message: responseMessage,
              newItemCount,
              currentQuantityInCart: qtyForClient,
            });
          });
        }
      }
    );
  } catch (error) {
    // Catch synchronous errors or unhandled promise rejections from fetchCartCount
    console.error("Server error in updateCartAPI (outer try-catch):", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating cart.",
      currentQuantityInCart: quantityValue, // Fallback to attempted value
    });
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
