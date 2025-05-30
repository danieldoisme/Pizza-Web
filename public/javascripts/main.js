/* global Swiper, ScrollTrigger, Parallax */

window.scrollToTop = function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

document.addEventListener("DOMContentLoaded", function () {
  const dropdownBtn = document.getElementById("usernameDropdownBtn");
  if (dropdownBtn) {
    dropdownBtn.addEventListener("click", function (e) {
      document.getElementById("myDropdown").classList.toggle("show");
      e.stopPropagation();
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
    fetch("/api/cart/count")
      .then((response) => {
        console.log(
          "main.js: /api/cart/count fetch response status:",
          response.status
        );
        if (!response.ok) {
          return response.text().then((text) => {
            console.error(
              `main.js: /api/cart/count HTTP error! Status: ${response.status}. Body: ${text}`
            );
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
        if (data && typeof data.count !== "undefined") {
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
          cartCounterElement.innerHTML = "0";
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
          cartCounterElement.innerHTML = "0";
        }
        localStorage.setItem("item_count", "0");
      });
  } else if (cartCounterElement) {
    console.log(
      "main.js: User is not logged in. Setting cart count display to 0."
    );
    cartCounterElement.innerHTML = "0";
    localStorage.setItem("item_count", "0");
    localStorage.removeItem("cart");
  } else if (!isLoggedIn && !cartCounterElement) {
    console.warn(
      "main.js: User not logged in AND cartCounterElement was not found."
    );
  }

  const logoutButton = document.querySelector('a[href="/logout"]');
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("cart");
      localStorage.removeItem("item_count");
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

  if ($(".promotion-banner-slider").length > 0) {
    new Swiper(".promotion-banner-slider", {
      slidesPerView: 1,
      spaceBetween: 20,
      loop: true,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false,
      },
      speed: 1000,
      pagination: {
        el: ".promotion-banner-slider .swiper-pagination",
        clickable: true,
      },
      watchOverflow: true,
    });
  }

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
              filter: "all",
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

    $this.parent().addClass("active");
    $this.parent().siblings().removeClass("active");

    const currentBaseUrl = window.location.origin + window.location.pathname;
    const targetUrl = new URL(href, currentBaseUrl);
    const currentUrl = new URL(window.location.href);

    const isSamePageNavigation =
      targetUrl.origin === currentUrl.origin &&
      targetUrl.pathname === currentUrl.pathname;

    if (isSamePageNavigation && targetUrl.hash) {
      const $targetElement = jQuery(targetUrl.hash);
      if ($targetElement.length) {
        e.preventDefault();
        jQuery("html, body")
          .stop()
          .animate(
            {
              scrollTop: $targetElement.offset().top - 50,
            },
            800
          );
        if (isMobileMenuToggled) {
          jQuery(".main-navigation").removeClass("toggled");
        }
        return;
      }
    }

    if (isMobileMenuToggled) {
      jQuery(".main-navigation").removeClass("toggled");
    }
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
  if (scene) {
    new Parallax(scene);
  } else {
    console.warn(
      "main.js: Parallax scene element '.js-parallax-scene' not found on this page."
    );
  }
});

jQuery(window).on("load", function () {
  $("body").removeClass("body-fixed");

  const filterElements = document.querySelectorAll(".filter");
  if (filterElements.length > 0) {
    let targets = filterElements;
    let activeTab = 0;
    let old = 0;
    let animation;

    for (let i = 0; i < targets.length; i++) {
      targets[i].index = i;
      targets[i].addEventListener("click", moveBar);
    }

    if (targets[0]) {
      gsap.set(".filter-active", {
        x: targets[0].offsetLeft,
        width: targets[0].offsetWidth,
      });
    }

    function moveBar() {
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
