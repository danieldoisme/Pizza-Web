// Initialize cart from localStorage or create empty cart
let item_count = parseInt(localStorage.getItem("item_count") || 0);
let cart = JSON.parse(localStorage.getItem("cart") || "[]");

// Update cart count display when page loads
document.addEventListener("DOMContentLoaded", function () {
  // Find the cart counter element and update it
  const cartCounter = document.getElementById("cart-number-count");
  if (cartCounter) {
    cartCounter.innerHTML = item_count;
  }

  // If there are items in cart, update button states
  cart.forEach((id) => {
    const btnName = "btn" + id;
    const btn = document.getElementById(btnName);
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "Added";
    }
  });
});

window.addToCart = function (item_id) {
  // Check if item is already in cart to prevent duplicates
  if (!cart.includes(item_id)) {
    item_count++;
    document.getElementById("cart-number-count").innerHTML = item_count;
    const name = "btn" + item_id;
    document.getElementById(name).disabled = true;
    document.getElementById(name).innerHTML = "Added";
    cart.push(item_id);

    // Save to localStorage
    localStorage.setItem("item_count", item_count);
    localStorage.setItem("cart", JSON.stringify(cart));
  }
};

window.openMyCart = function () {
  let url = "/cart";
  // Ensure cart and item_count are fresh from localStorage before sending
  const currentCart = JSON.parse(localStorage.getItem("cart") || "[]");
  const currentItemCount = parseInt(localStorage.getItem("item_count") || 0);

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cart: currentCart,
      item_count: currentItemCount,
    }),
  })
    .then((response) => {
      if (response.ok) {
        // Successfully updated server-side cart, now navigate
        window.location.href = "/cart";
      } else {
        // Server responded with an error
        console.error(
          "Failed to update cart on server. Status:",
          response.status
        );
        // Optionally, inform the user, e.g., alert("Could not sync cart with server.");
        // Still navigate, or handle error more gracefully depending on desired UX
        window.location.href = "/cart"; // Navigate even if there was a server error, or handle differently
      }
    })
    .catch((error) => {
      console.error("Error posting cart data to server:", error);
      // Optionally, inform the user, e.g., alert("Could not connect to server to update cart.");
      // Still navigate or handle error
      window.location.href = "/cart"; // Navigate on network error, or handle differently
    });
};
