document.addEventListener("DOMContentLoaded", function () {
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
        document.getElementById("cart-number-count").innerHTML =
          data.newItemCount;
        localStorage.setItem("item_count", data.newItemCount);

        const btnName = "btn" + item_id;
        const btn = document.getElementById(btnName);
        if (btn) {
          const originalButtonContent = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML = "Added";

          setTimeout(() => {
            btn.innerHTML = originalButtonContent;
            btn.disabled = false;
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
