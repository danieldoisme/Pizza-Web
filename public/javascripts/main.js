/* global Swiper, ScrollTrigger, Parallax */

window.scrollToTop = function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

document.addEventListener("DOMContentLoaded", function () {
  const dropdownBtn = document.getElementById("usernameDropdownBtn");
  if (dropdownBtn) {
    dropdownBtn.addEventListener("click", function (e) {
      document.getElementById("myDropdown").classList.toggle("show");
      e.stopPropagation(); // Prevent event from bubbling up to window
    });
  }

  window.addEventListener("click", function (event) {
    if (
      !event.target.matches(".header-username") &&
      !event.target.closest(".header-username")
    ) {
      const dropdowns = document.getElementsByClassName("dropdown-content");
      for (let i = 0; i < dropdowns.length; i++) {
        const openDropdown = dropdowns[i];
        if (openDropdown.classList.contains("show")) {
          openDropdown.classList.remove("show");
        }
      }
    }
  });

  const cartCounterElement = document.getElementById("cart-number-count");

  if (cartCounterElement) {
    console.log(
      "main.js: cartCounterElement (id='cart-number-count') was FOUND in the DOM."
    );
    console.log(
      "main.js: Attempting to fetch cart count from /api/cart/count (will rely on server to check auth)..."
    );
    fetch("/api/cart/count") // Always fetch; server will know if user is logged in via cookies
      .then((response) => {
        console.log(
          "main.js: /api/cart/count fetch response status:",
          response.status
        );
        if (!response.ok) {
          return response.text().then((text) => {
            // Get text for non-JSON error bodies
            console.error(
              `main.js: /api/cart/count HTTP error! Status: ${response.status}. Body: ${text}`
            );
            // If not OK (e.g. 401 if API protects itself, or 500), treat as count 0 or error
            throw new Error(
              `HTTP error! status: ${response.status}, responseBody: ${text}`
            );
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log(
          "main.js: /api/cart/count API call returned data:",
          JSON.stringify(data)
        );
        // The API now returns { success: true, count: N } for logged-in users
        // or { success: false, count: 0, message: "User not authenticated." } for guests
        if (data && typeof data.count !== "undefined") {
          // Check for data.count directly
          console.log(
            `main.js: API returned count. Attempting to update cart display to: ${data.count}`
          );
          cartCounterElement.innerHTML = data.count;
          console.log(
            `main.js: cartCounterElement.innerHTML is now: "${cartCounterElement.innerHTML}"`
          );
          localStorage.setItem("item_count", data.count);
          console.log(
            `main.js: localStorage item_count set to: "${localStorage.getItem(
              "item_count"
            )}"`
          );
        } else {
          console.warn(
            "main.js: API call to /api/cart/count did not return expected data.count. Data received:",
            JSON.stringify(data)
          );
          cartCounterElement.innerHTML = "0"; // Fallback
          localStorage.setItem("item_count", "0");
        }
      })
      .catch((error) => {
        console.error(
          "main.js: Error during fetch or processing for /api/cart/count:",
          error.message,
          error
        );
        if (cartCounterElement) {
          cartCounterElement.innerHTML = "0"; // Default to 0 on error
        }
        localStorage.setItem("item_count", "0");
      });
  } else {
    console.error(
      "main.js: CRITICAL - cartCounterElement (id='cart-number-count') was NOT FOUND in the DOM!"
    );
  }

  // Handle client-side cleanup after logout
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("logged_out") === "true") {
    console.log(
      "main.js: Logged out detected from URL param. Clearing cart data."
    );
    localStorage.removeItem("cart");
    localStorage.removeItem("item_count");
    if (cartCounterElement) {
      cartCounterElement.innerHTML = "0";
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const isLoggedIn = document.cookie
    .split(";")
    .some((item) => item.trim().startsWith("cookuid="));

  if (isLoggedIn && cartCounterElement) {
    console.log(
      "main.js: User is logged in and cart element exists. Fetching cart count from /api/cart/count..."
    );
    fetch("/api/cart/count")
      .then((response) => {
        console.log(
          "main.js: /api/cart/count fetch response status:",
          response.status
        );
        if (!response.ok) {
          // Log the response text if it's not OK, as it might contain error details
          return response.text().then((text) => {
            throw new Error(
              `HTTP error! status: ${response.status}, statusText: ${response.statusText}, responseBody: ${text}`
            );
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log(
          "main.js: /api/cart/count API call returned data:",
          JSON.stringify(data)
        );
        if (data.success && typeof data.count !== "undefined") {
          console.log(
            `main.js: API success. Attempting to update cart display to: ${data.count}`
          );
          cartCounterElement.innerHTML = data.count;
          console.log(
            `main.js: cartCounterElement.innerHTML is now: "${cartCounterElement.innerHTML}"`
          );
          localStorage.setItem("item_count", data.count);
          console.log(
            `main.js: localStorage item_count set to: "${localStorage.getItem(
              "item_count"
            )}"`
          );
        } else {
          console.warn(
            "main.js: API call to /api/cart/count was not successful or data.count is undefined. Data received:",
            JSON.stringify(data)
          );
          cartCounterElement.innerHTML = "0";
          localStorage.setItem("item_count", "0");
        }
      })
      .catch((error) => {
        console.error(
          "main.js: Error during fetch or processing for /api/cart/count:",
          error.message,
          error
        );
        if (cartCounterElement) {
          // Ensure element exists before trying to update on error
          cartCounterElement.innerHTML = "0";
        }
        localStorage.setItem("item_count", "0");
      });
  } else if (cartCounterElement) {
    // Element exists, but user not logged in
    console.log(
      "main.js: User is not logged in. Setting cart count display to 0."
    );
    cartCounterElement.innerHTML = "0";
    localStorage.setItem("item_count", "0");
    localStorage.removeItem("cart"); // Clear any guest cart items array if you use one
  } else if (!isLoggedIn && !cartCounterElement) {
    console.warn(
      "main.js: User not logged in AND cartCounterElement was not found."
    );
  }

  // Also, for explicit logout button clicks (if any outside of a direct link leading to /logout):
  // This is a fallback or for SPAs where full page reload might not occur on every logout action.
  // However, since /logout causes a redirect, the above DOMContentLoaded check is primary.
  const logoutButton = document.querySelector('a[href="/logout"]');
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("cart");
      localStorage.removeItem("item_count");
      // No need to update cartCounter.innerHTML here as page will reload/redirect
    });
  }
});

$(document).ready(function ($) {
  "use strict";

  new Swiper(".book-table-img-slider", {
    slidesPerView: 1,
    spaceBetween: 20,
    loop: true,
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },
    speed: 2000,
    effect: "coverflow",
    coverflowEffect: {
      rotate: 3,
      stretch: 2,
      depth: 100,
      modifier: 5,
      slideShadows: false,
    },
    loopAdditionSlides: true,
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
  });

  new Swiper(".team-slider", {
    slidesPerView: 3,
    spaceBetween: 30,
    loop: true,
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },
    speed: 2000,

    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
    breakpoints: {
      0: {
        slidesPerView: 1.2,
      },
      768: {
        slidesPerView: 2,
      },
      992: {
        slidesPerView: 3,
      },
      1200: {
        slidesPerView: 3,
      },
    },
  });

  $(function () {
    // Only initialize mixItUp if filter controls are present on the page
    if ($(".filter").length > 0 && $(".menu-list-row").length > 0) {
      var filterList = {
        init: function () {
          $(".menu-list-row").mixItUp({
            selectors: {
              target: ".dish-box-wp",
              filter: ".filter",
            },
            animation: {
              effects: "fade",
              easing: "ease-in-out",
            },
            load: {
              filter: "all", // Default to showing all items if filters are present
            },
          });
        },
      };
      filterList.init();
    }
  });

  jQuery(".menu-toggle").click(function () {
    jQuery(".main-navigation").toggleClass("toggled");
  });

  jQuery(".main-navigation ul li a").on("click", function (e) {
    const $this = jQuery(this);
    const href = $this.attr("href");
    const isMobileMenuToggled = jQuery(".main-navigation").hasClass("toggled");

    // Update active class for styling (optional, but often part of such handlers)
    $this.parent().addClass("active");
    $this.parent().siblings().removeClass("active");

    // Resolve the target URL relative to the current page's URL
    const currentBaseUrl = window.location.origin + window.location.pathname;
    const targetUrl = new URL(href, currentBaseUrl);
    const currentUrl = new URL(window.location.href);

    // Check if the link is intended for an anchor on the *current* page
    const isSamePageNavigation =
      targetUrl.origin === currentUrl.origin &&
      targetUrl.pathname === currentUrl.pathname;

    if (isSamePageNavigation && targetUrl.hash) {
      // It's an anchor on the current page
      const $targetElement = jQuery(targetUrl.hash);
      if ($targetElement.length) {
        e.preventDefault(); // Prevent default navigation ONLY for successful on-page scroll
        jQuery("html, body")
          .stop()
          .animate(
            {
              // Adjust the '50' based on your fixed header's height, if any
              scrollTop: $targetElement.offset().top - 50,
            },
            800 // Animation duration in milliseconds
          );
        if (isMobileMenuToggled) {
          jQuery(".main-navigation").removeClass("toggled");
        }
        return; // Stop further processing for this handled on-page scroll
      }
      // If the anchor (#hash) doesn't exist on the current page,
      // let the browser handle it (it will typically scroll to top or do nothing).
    }

    // For all other cases:
    // 1. Link to a different page (e.g., /contact)
    // 2. Link to an anchor on a different page (e.g., /#about from /contact)
    // 3. Link to an anchor on the current page but the anchor element doesn't exist
    // In these cases, we allow the browser's default navigation.

    // If the mobile menu is toggled, close it before navigating.
    if (isMobileMenuToggled) {
      jQuery(".main-navigation").removeClass("toggled");
      // Note: If closing the menu has a long animation and interferes with
      // immediate navigation, you might need to e.preventDefault(),
      // then navigate after a short timeout. However, this is often not necessary.
      // Example for delayed navigation (use with caution):
      // e.preventDefault();
      // setTimeout(function() { window.location.href = href; }, 150);
      // return;
    }

    // Allow default browser behavior (navigation) to proceed.
    // No e.preventDefault() here for off-page links or unhandled on-page anchors.
  });

  gsap.registerPlugin(ScrollTrigger);

  var elementFirst = document.querySelector(".site-header");
  ScrollTrigger.create({
    trigger: "body",
    start: "30px top",
    end: "bottom bottom",

    onEnter: () => myFunction(),
    onLeaveBack: () => myFunction(),
  });

  function myFunction() {
    elementFirst.classList.toggle("sticky_head");
  }

  var scene = $(".js-parallax-scene").get(0);
  // Add a check to ensure 'scene' exists before initializing Parallax
  if (scene) {
    new Parallax(scene);
  } else {
    // Only log if we expect a parallax scene on the current page.
    // You might want to check if the current page is one that *should* have it.
    console.warn(
      "main.js: Parallax scene element '.js-parallax-scene' not found on this page."
    );
  }
});

jQuery(window).on("load", function () {
  $("body").removeClass("body-fixed");

  const filterElements = document.querySelectorAll(".filter"); // Get potential filter elements
  if (filterElements.length > 0) {
    // Only proceed if filters exist
    let targets = filterElements; // Use the NodeList directly or convert to array if needed by GSAP logic
    let activeTab = 0;
    let old = 0;
    let animation;

    for (let i = 0; i < targets.length; i++) {
      targets[i].index = i;
      targets[i].addEventListener("click", moveBar);
    }

    // Ensure targets[0] exists before accessing offsetLeft/offsetWidth
    if (targets[0]) {
      gsap.set(".filter-active", {
        x: targets[0].offsetLeft,
        width: targets[0].offsetWidth,
      });
    }

    function moveBar() {
      // Ensure this.index is valid and targets[this.index] exists
      if (this.index != activeTab && targets[this.index]) {
        if (animation && animation.isActive()) {
          animation.progress(1);
        }
        animation = gsap.timeline({
          defaults: {
            duration: 0.4,
          },
        });
        old = activeTab;
        activeTab = this.index;
        // Ensure targets[activeTab] and targets[old] are valid before using
        if (targets[activeTab] && targets[old]) {
          animation.to(".filter-active", {
            x: targets[activeTab].offsetLeft,
            width: targets[activeTab].offsetWidth,
          });

          animation.to(
            targets[old],
            {
              color: "#0d0d25",
              ease: "none",
            },
            0
          );
          animation.to(
            targets[activeTab],
            {
              color: "#fff",
              ease: "none",
            },
            0
          );
        } else {
          console.warn(
            "main.js: moveBar - target for activeTab or old tab is undefined."
          );
        }
      }
    }
  } else {
    console.log(
      "main.js: Filter elements not found, skipping filter animation setup."
    );
  }
});
