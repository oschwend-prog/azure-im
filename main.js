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
    if (hasGSAP) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
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

  /* ---------- Custom cursor ---------- */
  if (!reduced && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var dot = document.createElement("div"); dot.className = "cursor-dot";
    var ring = document.createElement("div"); ring.className = "cursor-ring";
    document.body.appendChild(dot); document.body.appendChild(ring);
    document.body.classList.add("cursor-on");
    var mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;
    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate(" + mx + "px," + my + "px)";
    });
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      requestAnimationFrame(loop);
    })();
    var hov = "a, button, [data-magnetic], .text-link, input, textarea, label";
    document.addEventListener("mouseover", function (e) { if (e.target.closest(hov)) ring.classList.add("hover"); });
    document.addEventListener("mouseout", function (e) { if (e.target.closest(hov)) ring.classList.remove("hover"); });
    document.addEventListener("mouseleave", function () { dot.style.opacity = "0"; ring.style.opacity = "0"; });
    document.addEventListener("mouseenter", function () { dot.style.opacity = "1"; ring.style.opacity = "1"; });
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
        var subject = encodeURIComponent("Enquiry from azure-im.com — " + (data.get("name") || ""));
        var body = encodeURIComponent(
          "Name: " + (data.get("name") || "") + "\n" +
          "Email: " + (data.get("email") || "") + "\n\n" +
          (data.get("message") || "")
        );
        window.location.href = "mailto:info@azure-im.com?subject=" + subject + "&body=" + body;
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
            if (status) { status.textContent = "Something went wrong. Please email info@azure-im.com."; status.className = "form-status err"; }
          }
        })
        .catch(function () {
          if (status) { status.textContent = "Network error. Please email info@azure-im.com."; status.className = "form-status err"; }
        });
    });
  }

  /* refresh triggers after fonts/images settle */
  if (hasGSAP) {
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }
})();
