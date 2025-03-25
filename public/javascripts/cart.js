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

function addToCart(item_id) {
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
}

function openMyCart() {
  let url = "/cart";
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cart: cart,
      item_count: item_count,
    }),
  });

  window.location.href = "/cart";
}
