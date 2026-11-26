/* ============================================================
   azure IM — interaction layer (progressive enhancement)
   Works fully without libraries; GSAP adds parallax when present.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  if (hasGSAP) { gsap.registerPlugin(ScrollTrigger); }

  /* ---------- Anchor links: native scroll, then move focus to the section ---------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      if (history.replaceState) history.replaceState(null, "", id);
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
  window.addEventListener("scroll", function () { onScroll(); }, { passive: true });
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
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("open")) { closeMenu(); toggle.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (menu.classList.contains("open") && !menu.contains(e.target) && !toggle.contains(e.target)) closeMenu();
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
          el.style.transitionDelay = Math.min(delay * 50, 150) + "ms";
          el.classList.add("in");
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* Hero title reveal is handled purely in CSS (see @keyframes lineUp),
     so it never depends on JS or GSAP loading. */

  /* ---------- Reduced motion: hold hero video on its poster ---------- */
  if (reduced) {
    var heroVideo = $(".hero-video");
    if (heroVideo) { try { heroVideo.pause(); } catch (e) {} heroVideo.removeAttribute("autoplay"); }
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

  /* ---------- Contact form -> /api/contact (emails info@azure-im.com) ---------- */
  var form = $("[data-contact-form]");
  if (form) {
    var status = $("[data-form-status]");
    var submitBtn = form.querySelector('button[type="submit"]');
    var startedAt = Date.now();
    var FALLBACK = "Sorry, the message could not be sent. Please email info@azure-im.com.";
    function setStatus(text, cls) {
      if (!status) return;
      status.textContent = text;
      status.className = "form-status" + (cls ? " " + cls : "");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var payload = {
        name: String(data.get("name") || "").trim(),
        email: String(data.get("email") || "").trim(),
        message: String(data.get("message") || "").trim(),
        website: String(data.get("website") || ""),
        elapsed: Date.now() - startedAt
      };
      setStatus("Sending…");
      if (submitBtn) submitBtn.disabled = true;

      fetch(form.getAttribute("action") || "/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (body) { return { ok: r.ok, body: body }; });
        })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            setStatus("Thank you. Your message has been sent and we will reply by email.", "ok");
          } else {
            setStatus((res.body && res.body.error) || FALLBACK, "err");
          }
        })
        .catch(function () { setStatus("Network error. Please email info@azure-im.com.", "err"); })
        .then(function () { if (submitBtn) submitBtn.disabled = false; });
    });
  }

  /* refresh triggers after fonts/images settle */
  if (hasGSAP) {
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }
})();
