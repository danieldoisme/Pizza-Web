// item_count will be initialized/updated by main.js from server or set to 0.
// The 'cart' array in localStorage is primarily for client-side UI (disabling buttons).
// It should be cleared on logout (handled in main.js)

document.addEventListener("DOMContentLoaded", function () {
  // The following lines that set the cartCounter.innerHTML are removed,
  // as main.js will handle the initial count update from the API.
  // const currentItemCount = parseInt(localStorage.getItem("item_count") || 0);
  // const cartCounter = document.getElementById("cart-number-count");
  // if (cartCounter) {
  //   cartCounter.innerHTML = currentItemCount;
  // }

  // Update button states based on localStorage 'cart' (list of item IDs)
  // This part can remain as it's about button states, not the count display.
  const localCartIds = JSON.parse(localStorage.getItem("cart") || "[]");
  localCartIds.forEach((id) => {
    const btnName = "btn" + id;
    const btn = document.getElementById(btnName);
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "Added";
    }
  });
});

window.addToCart = function (item_id) {
  fetch("/api/cart/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: item_id, quantity: 1 }),
  })
    .then((response) => {
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      if (data.success && typeof data.newItemCount !== "undefined") {
        // This part correctly updates the count after an action
        document.getElementById("cart-number-count").innerHTML =
          data.newItemCount;
        localStorage.setItem("item_count", data.newItemCount);

        const btnName = "btn" + item_id;
        const btn = document.getElementById(btnName);
        if (btn) {
          const originalButtonContent = btn.innerHTML; // Store original content
          btn.disabled = true;
          btn.innerHTML = "Added"; // Change text to "Added"

          setTimeout(() => {
            btn.innerHTML = originalButtonContent; // Revert to original content
            btn.disabled = false; // Re-enable the button
          }, 2000); // 2 seconds
        }

        let localCartIds = JSON.parse(localStorage.getItem("cart") || "[]");
        if (!localCartIds.includes(String(item_id))) {
          localCartIds.push(String(item_id));
          localStorage.setItem("cart", JSON.stringify(localCartIds));
        }
      } else {
        console.error(
          "Failed to add item to cart:",
          data.message || "Unknown error"
        );
        alert(
          "Error adding item to cart: " + (data.message || "Please try again.")
        );
      }
    })
    .catch((error) => {
      console.error("Error adding item to cart:", error);
      alert("Error adding item to cart. Could not connect to server.");
    });
};

window.openMyCart = function () {
  window.location.href = "/cart";
};
