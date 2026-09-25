/**
 * site.js
 * Two small, independent behaviors:
 *   1. Reveal [data-animate] elements when they scroll into view.
 *   2. Count [data-count] numbers up when they scroll into view.
 * Both respect prefers-reduced-motion and both no-op gracefully if
 * IntersectionObserver isn't available.
 */
(function () {
  "use strict";

  var root = document.documentElement;

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /*function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }*/

  function canHover() {
    return window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  }

  /* ---- 1. Stagger index: give siblings inside the same [data-animate-
     group] an incrementing --stagger-index so animations.css can offset
     each one's transition-delay without hand-numbering every element. ---- */
  document.querySelectorAll("[data-animate-group]").forEach(function (group) {
    var items = group.querySelectorAll(":scope > [data-animate]");
    items.forEach(function (item, i) {
      item.style.setProperty("--stagger-index", i);
    });
  });

  document.querySelectorAll("[data-hero]").forEach(function (item, i) {
    item.style.setProperty("--stagger-index", i);
  });

  /* ---- 2. Scroll reveal ---- */
  var animated = document.querySelectorAll("[data-animate]");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    animated.forEach(function (el) {
      el.classList.add("in-view");
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );

    animated.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* ---- 3. Counters ---- */
  var counters = document.querySelectorAll("[data-count]");

  function animateCount(el) {
    var target = parseFloat(el.textContent);
    var suffix = el.getAttribute("data-suffix") || "";
    var decimals = (el.getAttribute("data-count").split(".")[1] || "").length;

    if (prefersReducedMotion || isNaN(target)) {
      el.textContent = target.toFixed(decimals) + suffix;
      return;
    }

    var duration = 3500;
    var start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      var value = target * eased;
      el.textContent = value.toFixed(decimals) + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = target.toFixed(decimals) + suffix;
      }
    }

    window.requestAnimationFrame(step);
  }

  if (counters.length) {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      counters.forEach(animateCount);
    } else {
      var countObserver = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 },
      );
      counters.forEach(function (el) {
        countObserver.observe(el);
      });
    }
  }

  /* ---- Scroll progress bar + header parallax, one rAF-throttled
     scroll listener driving both so we're not stacking handlers ---- */
  var progressEl = document.getElementById("scroll-progress");
  var header = document.querySelector("header");
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      var root = document.documentElement;
      var scrollTop = window.scrollY || root.scrollTop;
      var docHeight = root.scrollHeight - window.innerHeight;
      var progress = docHeight > 0 ? scrollTop / docHeight : 0;

      if (progressEl) {
        progressEl.style.setProperty("--scroll-progress", progress.toFixed(4));
      }

      if (header && !prefersReducedMotion) {
        var vh = window.innerHeight;
        if (scrollTop < vh) {
          var offset = Math.round(scrollTop * 0.08); // subtle, capped by vh
          header.style.setProperty("--header-parallax", offset + "px");
        }
      }

      ticking = false;
    });
  }

  if (progressEl || (header && !prefersReducedMotion)) {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- First-load curtain ---- */
  var curtain = document.querySelector(".page-transition");
  if (curtain) {
    if (prefersReducedMotion) {
      curtain.remove();
    } else {
      window.addEventListener(
        "load",
        function () {
          curtain.classList.add("is-leaving");
          curtain.addEventListener(
            "animationend",
            function () {
              curtain.remove();
            },
            { once: true },
          );
        },
        { once: true },
      );
    }
  }

  /* ---- Cursor-tracked tilt + glow (desktop pointer only) ---- */
  if (canHover && !prefersReducedMotion) {
    var tiltTargets = document.querySelectorAll("[data-tilt], .cta");

    tiltTargets.forEach(function (el) {
      var maxTilt = el.classList.contains("cta") ? 6 : 8;

      el.addEventListener("pointermove", function (e) {
        var rect = el.getBoundingClientRect();
        var relX = (e.clientX - rect.left) / rect.width;
        var relY = (e.clientY - rect.top) / rect.height;

        el.style.setProperty("--tilt-y", (relX - 0.5) * maxTilt * 2 + "deg");
        el.style.setProperty("--tilt-x", (0.5 - relY) * maxTilt * 2 + "deg");
        el.style.setProperty("--mx", relX * 100 + "%");
        el.style.setProperty("--my", relY * 100 + "%");
      });

      el.addEventListener("pointerleave", function () {
        el.style.setProperty("--tilt-x", "0deg");
        el.style.setProperty("--tilt-y", "0deg");
      });
    });
  }
})();
