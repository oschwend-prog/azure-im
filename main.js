/* ============================================================
   azure IM — interaction layer (progressive enhancement)
   Works fully without libraries; Lenis + GSAP elevate when present.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  if (hasGSAP) { gsap.registerPlugin(ScrollTrigger); }

  /* ---------- Smooth scroll (Lenis) ---------- */
  var lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true, lerp: 0.1 });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (hasGSAP) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ---------- Anchor links route through Lenis ---------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.2 });
      else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });
  });

  /* ---------- Nav state + scroll progress ---------- */
  var nav = $("[data-nav]");
  var progress = $(".scroll-progress span");
  function onScroll(y) {
    if (typeof y !== "number") y = window.scrollY || window.pageYOffset || 0;
    if (nav) nav.classList.toggle("scrolled", y > 40);
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    }
  }
  if (lenis) lenis.on("scroll", function (e) { onScroll(e.scroll); });
  window.addEventListener("scroll", function () { if (!lenis) onScroll(); }, { passive: true });
  onScroll(0);

  /* ---------- Mobile menu ---------- */
  var toggle = $("[data-nav-toggle]");
  var menu = $("[data-nav-menu]");
  function closeMenu() {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", "false");
    menu.classList.remove("open");
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      menu.classList.toggle("open", !open);
    });
  }

  /* ---------- Reveal on scroll (IntersectionObserver — always reliable) ---------- */
  var revealEls = $$("[data-reveal]");
  if (reduced || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var el = en.target;
          var delay = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
          el.style.transitionDelay = Math.min(delay * 60, 240) + "ms";
          el.classList.add("in");
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Hero title: masked line reveal ---------- */
  var lines = $$(".hero-title .line-in");
  if (lines.length) {
    if (reduced || !hasGSAP) {
      lines.forEach(function (l) { l.style.transform = "none"; });
    } else {
      gsap.fromTo(lines,
        { yPercent: 112 },
        { yPercent: 0, duration: 1.15, ease: "expo.out", stagger: 0.12, delay: 0.15 }
      );
    }
  }

  /* ---------- Parallax ---------- */
  if (hasGSAP && !reduced) {
    $$("[data-parallax]").forEach(function (el) {
      var strength = parseFloat(el.getAttribute("data-parallax")) || 0.15;
      gsap.to(el, {
        yPercent: strength * 100,
        ease: "none",
        scrollTrigger: {
          trigger: el.closest("section") || el,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (!reduced && window.matchMedia("(hover: hover)").matches) {
    $$("[data-magnetic]").forEach(function (el) {
      var strength = 0.3;
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * strength;
        var y = (e.clientY - (r.top + r.height / 2)) * strength;
        el.style.transform = "translate(" + x + "px," + y + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- Contact form ---------- */
  var form = $("[data-contact-form]");
  if (form) {
    var status = $("[data-form-status]");
    var action = form.getAttribute("action") || "";
    var configured = action.indexOf("your-form-id") === -1 && action.indexOf("formspree") !== -1;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);

      if (!configured) {
        // No backend wired yet → compose a mailto so enquiries still reach Olivier.
        var subject = encodeURIComponent("Enquiry from azure-im.com — " + (data.get("name") || ""));
        var body = encodeURIComponent(
          "Name: " + (data.get("name") || "") + "\n" +
          "Email: " + (data.get("email") || "") + "\n\n" +
          (data.get("message") || "")
        );
        window.location.href = "mailto:olivier@azure-im.com?subject=" + subject + "&body=" + body;
        if (status) { status.textContent = "Opening your email app…"; status.className = "form-status ok"; }
        return;
      }

      if (status) { status.textContent = "Sending…"; status.className = "form-status"; }
      fetch(action, { method: "POST", body: data, headers: { Accept: "application/json" } })
        .then(function (r) {
          if (r.ok) {
            form.reset();
            if (status) { status.textContent = "Thank you — we'll be in touch shortly."; status.className = "form-status ok"; }
          } else {
            if (status) { status.textContent = "Something went wrong. Please email olivier@azure-im.com."; status.className = "form-status err"; }
          }
        })
        .catch(function () {
          if (status) { status.textContent = "Network error. Please email olivier@azure-im.com."; status.className = "form-status err"; }
        });
    });
  }

  /* refresh triggers after fonts/images settle */
  if (hasGSAP) {
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }
})();
