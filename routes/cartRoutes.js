const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");

const isAuthenticated = require("../middleware/isAuthenticated");

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
    `;
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
        item_image: `/images/item-image/${item.item_id}`,
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

async function addToCartAPIInternal(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const userId = req.cookies.cookuid;
  const { itemId, quantity } = req.body;
  const connection = req.app.get("dbConnection");

  const minQuantityToAdd = 1;
  const maxCartQuantityPerItem = 10;

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated." });
  }

  try {
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
          let message = "Item added to cart.";

          const quantityToAdd = quantity;

          if (cartResults.length > 0) {
            const currentQuantityInCart = parseInt(cartResults[0].quantity);
            const potentialNewQuantity = currentQuantityInCart + quantityToAdd;

            if (potentialNewQuantity > maxCartQuantityPerItem) {
              finalQuantity = maxCartQuantityPerItem;
              message = `Item quantity updated. Maximum ${maxCartQuantityPerItem} units allowed; quantity capped.`;
            } else {
              finalQuantity = potentialNewQuantity;
              message = "Item quantity updated in cart.";
            }
            if (finalQuantity < 1) finalQuantity = 1;

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
            if (quantityToAdd > maxCartQuantityPerItem) {
              finalQuantity = maxCartQuantityPerItem;
              message = `Item added to cart. Maximum ${maxCartQuantityPerItem} units allowed; quantity capped.`;
            } else {
              finalQuantity = quantityToAdd;
            }
            if (finalQuantity < 1) finalQuantity = 1;

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
    console.error("Server error in addToCartAPI (outer try-catch):", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while adding to cart." });
  }
}

async function updateCartAPIInternal(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const userId = req.cookies.cookuid;
    const { itemId, newQuantity } = req.body;
    const connection = req.app.get("dbConnection");

    const quantityError = errors.array().find((e) => e.param === "newQuantity");
    const itemIdError = errors.array().find((e) => e.param === "itemId");

    if (quantityError && !itemIdError && userId && itemId) {
      const getCurrentQtyQuery =
        "SELECT quantity FROM user_cart_items WHERE user_id = ? AND item_id = ?";
      connection.query(getCurrentQtyQuery, [userId, itemId], (err, results) => {
        let qtyInCart = 1;
        if (!err && results.length > 0) {
          qtyInCart = results[0].quantity;
          if (qtyInCart < 1 || qtyInCart > 10) qtyInCart = 1;
        } else if (err) {
          console.error(
            "DB error fetching current quantity for validation response:",
            err
          );
        }
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: errors
            .array()
            .map((e) => e.msg)
            .join(" "),
          currentQuantityInCart: qtyInCart,
        });
      });
      return;
    } else {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
  }

  const userId = req.cookies.cookuid;
  const { itemId, newQuantity } = req.body;
  const connection = req.app.get("dbConnection");

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated." });
  }

  try {
    const updateQuery =
      "UPDATE user_cart_items SET quantity = ? WHERE user_id = ? AND item_id = ?";
    connection.query(
      updateQuery,
      [newQuantity, userId, itemId],
      async (updateErr, result) => {
        if (updateErr) {
          console.error("Error updating item quantity in cart:", updateErr);
          const getCurrentQtyQueryOnError =
            "SELECT quantity FROM user_cart_items WHERE user_id = ? AND item_id = ?";
          connection.query(
            getCurrentQtyQueryOnError,
            [userId, itemId],
            (err, qtyResults) => {
              let qtyInCart = newQuantity;
              if (!err && qtyResults.length > 0) {
                qtyInCart = qtyResults[0].quantity;
                if (qtyInCart < 1 || qtyInCart > 10) qtyInCart = 1;
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
            newQuantity: newQuantity,
          });
        } else {
          const checkMenuQuery = "SELECT item_id FROM menu WHERE item_id = ?";
          connection.query(checkMenuQuery, [itemId], (menuErr, menuResults) => {
            let responseMessage =
              "Item not found in cart to update, or quantity was already correct.";
            let responseStatus = 404;
            let qtyForClient = 1;

            if (menuErr) {
              console.error("Error checking menu item:", menuErr);
              responseMessage = "Error verifying item details.";
              responseStatus = 500;
            } else if (menuResults.length === 0) {
              responseMessage = "Item to update does not exist in menu.";
              responseStatus = 404;
            } else {
              const getCurrentQtyQueryAgain =
                "SELECT quantity FROM user_cart_items WHERE user_id = ? AND item_id = ?";
              connection.query(
                getCurrentQtyQueryAgain,
                [userId, itemId],
                (qErr, qResults) => {
                  if (!qErr && qResults.length > 0) {
                    qtyForClient = qResults[0].quantity;
                    if (qtyForClient < 1 || qtyForClient > 10) qtyForClient = 1;
                  }
                  return res.status(responseStatus).json({
                    success: false,
                    message: responseMessage,
                    newItemCount,
                    currentQuantityInCart: qtyForClient,
                  });
                }
              );
              return;
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
    console.error("Server error in updateCartAPI (outer try-catch):", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating cart.",
      currentQuantityInCart: newQuantity,
    });
  }
}

async function removeFromCartAPIInternal(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const userId = req.cookies.cookuid;
  const { itemId } = req.body;
  const connection = req.app.get("dbConnection");

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "User not authenticated." });
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
            removedItemId: itemId,
          });
        } else {
          res.json({
            success: true,
            message: "Item not found in cart or already removed.",
            newItemCount,
            removedItemId: itemId,
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

async function getCartCountAPI(req, res) {
  const userId = req.cookies.cookuid;
  const connection = req.app.get("dbConnection");
  if (!userId) {
    return res.json({ success: true, count: 0 });
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

router.get("/cart", isAuthenticated, renderCart);

router.get("/api/cart", isAuthenticated, getCartAPI);

router.post(
  "/api/cart/add",
  isAuthenticated,
  [
    body("itemId")
      .trim()
      .notEmpty()
      .withMessage("Item ID is required.")
      .isInt()
      .withMessage("Item ID must be an integer.")
      .toInt(),
    body("quantity")
      .optional()
      .trim()
      .isInt({ min: 1 })
      .withMessage("Quantity to add must be at least 1.")
      .toInt()
      .default(1),
  ],
  addToCartAPIInternal
);

router.post(
  "/api/cart/update",
  isAuthenticated,
  [
    body("itemId")
      .trim()
      .notEmpty()
      .withMessage("Item ID is required.")
      .isInt()
      .withMessage("Item ID must be an integer.")
      .toInt(),
    body("newQuantity")
      .trim()
      .notEmpty()
      .withMessage("New quantity is required.")
      .isInt({ min: 1, max: 10 })
      .withMessage("Quantity must be between 1 and 10.")
      .toInt(),
  ],
  updateCartAPIInternal
);

router.post(
  "/api/cart/remove",
  isAuthenticated,
  [
    body("itemId")
      .trim()
      .notEmpty()
      .withMessage("Item ID is required.")
      .isInt()
      .withMessage("Item ID must be an integer.")
      .toInt(),
  ],
  removeFromCartAPIInternal
);

router.get("/api/cart/count", isAuthenticated, getCartCountAPI);

module.exports = router;
