/*==========

Theme Name: Foodify - Food HTML5 Template
Theme Version: 1.0

==========*/

/*==========
----- JS INDEX -----
1.Smooth scroll
2.Scroll to top
3.Scroll to section
==========*/

const IS_ADMIN_PAGE = document.body.classList.contains("admin-active");
const scrollerTargetElement = document.querySelector("#js-scroll-content");

// smooth scroll logic for #js-scroll-content
if (!IS_ADMIN_PAGE && scrollerTargetElement) {
  // var html = document.documentElement;
  // var body = document.body;

  var scroller = {
    target: scrollerTargetElement,
    ease: 0.08, // <= scroll speed
    endY: 0,
    y: 0,
    resizeRequest: 1,
    scrollRequest: 0,
  };

  var requestId = null;

  if (scroller.target) {
    TweenLite.set(scroller.target, {
      rotation: 0.001,
      force3D: true,
    });
  }

  window.addEventListener("load", onLoad);

  function onLoad() {
    if (!scroller.target) return;
    updateScroller();
    window.addEventListener("resize", onResize);
    document.addEventListener("scroll", onScroll);
  }

  function updateScroller() {
    if (scroller.target && scroller.resizeRequest > 0) {
      document.body.style.height = scroller.target.clientHeight + "px";
      scroller.resizeRequest = 0;
    }
    if (scroller.target) {
      scroller.endY = window.pageYOffset;
      scroller.y += (scroller.endY - scroller.y) * scroller.ease;

      if (Math.abs(scroller.endY - scroller.y) < 0.05) {
        scroller.y = scroller.endY;
        if (requestId) {
          cancelAnimationFrame(requestId);
          requestId = null;
        }
      } else {
        requestId = requestAnimationFrame(updateScroller);
      }
      TweenLite.set(scroller.target, { y: -scroller.y });
    }
  }

  function onScroll() {
    if (!scroller.target) return;
    scroller.scrollRequest++;
    if (!requestId) {
      requestId = requestAnimationFrame(updateScroller);
    }
  }

  function onResize() {
    if (!scroller.target) return;
    scroller.resizeRequest++;
    if (!requestId) {
      requestId = requestAnimationFrame(updateScroller);
    }
  }

  if (typeof jQuery !== "undefined" && jQuery.fn.on) {
    const filtersElement = jQuery(".filters");
    if (filtersElement.length > 0) {
      filtersElement.on("click", function () {
        setTimeout(function () {
          if (!IS_ADMIN_PAGE && scroller.target) {
            onScroll();
            onResize();
          }
        }, 1000);
      });
    }
  }

  const filterListItems = document.querySelectorAll(".filters li");
  filterListItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (!IS_ADMIN_PAGE && scroller.target) {
        onResize();
      }
    });
    item.addEventListener("click", () => {
      if (!IS_ADMIN_PAGE && scroller.target) {
        onScroll();
      }
    });
  });
} else {
  if (IS_ADMIN_PAGE) {
    console.log("Smooth scroll for #js-scroll-content disabled on admin page.");
  } else if (!scrollerTargetElement) {
    console.log("#js-scroll-content not found, smooth scroll for it disabled.");
  }
}

// Scroll to top
const scrolltotopButton = document.querySelector(".scrolltop");

if (scrolltotopButton) {
  // Move the button to be a direct child of <body>
  // This ensures position:fixed works relative to the viewport,
  // escaping any transformed parent containers like #js-scroll-content.
  document.body.appendChild(scrolltotopButton);

  scrolltotopButton.addEventListener("click", () => {
    const adminMainContent = document.querySelector(".admin-main-content");
    if (
      IS_ADMIN_PAGE &&
      window.innerWidth >= 768 &&
      adminMainContent &&
      typeof adminMainContent.scrollTop !== "undefined"
    ) {
      gsap.to(adminMainContent, {
        scrollTo: { y: 0, autoKill: false },
        duration: 0.5,
      });
    } else {
      if (typeof gsap !== "undefined" && gsap.plugins.scrollTo) {
        gsap.to(window, { scrollTo: { y: 0, autoKill: false }, duration: 0.5 });
      } else if (typeof window.scrollToTop === "function") {
        window.scrollToTop();
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  });

  function toggleScrollTopButtonVisibility() {
    const currentScrollY = window.pageYOffset;
    const customScrollerActive = !IS_ADMIN_PAGE && !!scrollerTargetElement;
    // console.log( // Keeping logs for debugging if needed, can be commented out later
    //   `smooth-scroll.js: toggleScrollTopButtonVisibility. window.pageYOffset: ${currentScrollY}, CustomScrollerActive: ${customScrollerActive}`
    // );

    if (currentScrollY > 50) {
      // console.log("smooth-scroll.js: Attempting to show scroll-to-top button.");
      scrolltotopButton.style.display = "flex";
    } else {
      // console.log("smooth-scroll.js: Attempting to hide scroll-to-top button.");
      scrolltotopButton.style.display = "none";
    }
  }

  // Ensure the event listener is added and the initial check is performed reliably
  if (
    document.readyState === "complete" ||
    (document.readyState !== "loading" && !document.documentElement.doScroll)
  ) {
    console.log(
      "smooth-scroll.js: DOM ready or complete. Initializing scroll-to-top visibility logic."
    );
    window.addEventListener("scroll", toggleScrollTopButtonVisibility);
    toggleScrollTopButtonVisibility(); // Initial check
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      console.log(
        "smooth-scroll.js: DOMContentLoaded. Initializing scroll-to-top visibility logic."
      );
      window.addEventListener("scroll", toggleScrollTopButtonVisibility);
      toggleScrollTopButtonVisibility(); // Initial check
    });
  }
} else {
  console.warn(
    "smooth-scroll.js: Scroll-to-top button (.scrolltop) not found. Ensure HTML is loaded before script."
  );
}

// Scroll to section
if (typeof jQuery !== "undefined" && jQuery.fn.animate) {
  const sections = $("section");
  const nav = $(".foody-nav-menu, .banner-btn");

  if (nav.length && sections.length) {
    const nav_height = nav.outerHeight() || 0;

    nav.find("a[href^='#']").on("click", function (e) {
      const targetHref = $(this).attr("href");
      try {
        const targetElement = $(targetHref);
        if (targetElement.length) {
          e.preventDefault();
          const adminMainContent = $(".admin-main-content");

          if (
            IS_ADMIN_PAGE &&
            window.innerWidth >= 768 &&
            adminMainContent.length &&
            typeof adminMainContent.scrollTop === "function"
          ) {
            const targetOffsetTop = targetElement.offset().top;
            const scrollerOffsetTop = adminMainContent.offset().top;
            const scrollerScrollTop = adminMainContent.scrollTop();
            const relativeScrollTo =
              targetOffsetTop -
              scrollerOffsetTop +
              scrollerScrollTop -
              nav_height;

            adminMainContent.animate({ scrollTop: relativeScrollTo }, 500);
          } else {
            const scrollToPosition = targetElement.offset().top - nav_height;
            $("html, body").animate({ scrollTop: scrollToPosition }, 500);
          }
          return false;
        }
      } catch (err) {
        console.warn(
          "Error in ScrollToSection:",
          err,
          "Target Href:",
          targetHref
        );
      }
    });
  }
}
