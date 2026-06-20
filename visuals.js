/* ============================================================
   azure IM — generative visuals (progressive enhancement)
   1) Azure currents — flow field behind the quote band
   2) Night globe — countries, sun-shading, live data cables
   Both run only while on-screen and respect reduced-motion.
   ============================================================ */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function whenVisible(el, cb) {
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { cb(e.isIntersecting); });
    }, { threshold: 0.04 }).observe(el);
  }

  /* ---------------- 1) Azure currents ---------------- */
  (function () {
    var c = document.querySelector("[data-currents]");
    if (!c) return;
    var ctx = c.getContext("2d"), DPR = Math.min(2, window.devicePixelRatio || 1);
    var W, H, P = [], N, running = false, raf = 0;
    function size() {
      W = c.clientWidth; H = c.clientHeight;
      c.width = W * DPR; c.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = "#0c1830"; ctx.fillRect(0, 0, W, H);
    }
    function reset(p) { p.x = Math.random() * W; p.y = Math.random() * H; p.life = 40 + Math.random() * 140; p.c = Math.random(); }
    function init() { size(); N = Math.min(600, Math.floor(W * 0.9)); P = []; for (var i = 0; i < N; i++) { var p = {}; reset(p); P.push(p); } }
    function field(x, y, t) { var s = 0.0016; return Math.sin(x * s + t * 0.00028) * 1.5 + Math.cos(y * s * 1.3 - t * 0.00019) * 1.4 + Math.sin((x + y) * s * 0.6) * 1.1; }
    function frame(t) {
      if (!running) return;
      ctx.fillStyle = "rgba(12,24,48,0.05)"; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < P.length; i++) {
        var p = P[i], a = field(p.x, p.y, t), nx = p.x + Math.cos(a) * 1.7, ny = p.y + Math.sin(a) * 1.7;
        var col = p.c < 0.5 ? "74,163,216" : (p.c < 0.82 ? "143,208,238" : "42,127,184");
        ctx.strokeStyle = "rgba(" + col + ",0.16)"; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny; p.life--;
        if (p.life < 0 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) reset(p);
      }
      raf = requestAnimationFrame(frame);
    }
    init();
    window.addEventListener("resize", init);
    if (reduced) return;
    whenVisible(c, function (on) {
      if (on && !running) { running = true; raf = requestAnimationFrame(frame); }
      else if (!on && running) { running = false; cancelAnimationFrame(raf); }
    });
  })();

  /* ---------------- 2) Night globe ---------------- */
  (function () {
    var c = document.querySelector("[data-globe]");
    if (!c || !window.d3 || !window.topojson) return;
    var ctx = c.getContext("2d"), DPR = Math.min(2, window.devicePixelRatio || 1);
    var W, H, R, cx, cy, proj, path, rotLon = 0, running = false, raf = 0;
    var land = null, borders = null, grat = d3.geoGraticule10();
    var cities = [[-0.1, 51.5], [-74, 40.7], [8.7, 50.1], [4.9, 52.4], [2.3, 48.9], [103.8, 1.35], [139.7, 35.7], [114.2, 22.3], [55.3, 25.2], [151.2, -33.9], [-122.4, 37.8], [72.9, 19], [-46.6, -23.5], [-79.4, 43.7], [-3.7, 40.4], [9.2, 45.5], [18.1, 59.3], [-6.3, 53.3], [-9.1, 38.7], [23.7, 37.9], [37.6, 55.7]];
    var ridx = [[0, 1], [0, 2], [2, 5], [1, 10], [0, 5], [6, 7], [0, 17], [14, 18], [3, 0], [8, 5], [1, 13], [0, 20], [15, 5], [6, 9], [4, 2], [16, 0]];
    var routes = ridx.map(function (r) { return { a: cities[r[0]], b: cities[r[1]], ph: Math.random() }; });
    function size() {
      W = c.clientWidth; H = c.clientHeight;
      c.width = W * DPR; c.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      R = Math.min(W, H) * 0.42; cx = W / 2; cy = H / 2;
      proj = d3.geoOrthographic().translate([cx, cy]).scale(R).clipAngle(90).rotate([rotLon, -18]);
      path = d3.geoPath(proj, ctx);
    }
    function vis(p) { var r = proj.rotate(); return d3.geoDistance(p, [-r[0], -r[1]]) < Math.PI / 2; }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath(); path({ type: "Sphere" });
      var g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      g.addColorStop(0, "#163059"); g.addColorStop(1, "#0a172e"); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); path(grat); ctx.strokeStyle = "rgba(120,180,225,0.10)"; ctx.lineWidth = 0.5; ctx.stroke();
      if (land) {
        ctx.beginPath(); path(land); ctx.fillStyle = "rgba(33,62,102,0.95)"; ctx.fill();
        ctx.beginPath(); path(borders); ctx.strokeStyle = "rgba(125,195,238,0.30)"; ctx.lineWidth = 0.5; ctx.stroke();
      }
      ctx.save(); ctx.beginPath(); path({ type: "Sphere" }); ctx.clip();
      var sg = ctx.createRadialGradient(cx - R * 0.55, cy - R * 0.6, R * 0.15, cx + R * 0.3, cy + R * 0.35, R * 1.55);
      sg.addColorStop(0, "rgba(150,200,240,0.12)"); sg.addColorStop(0.45, "rgba(10,18,36,0)"); sg.addColorStop(1, "rgba(3,7,16,0.66)");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H); ctx.restore();
      var ag = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.14);
      ag.addColorStop(0, "rgba(74,163,216,0)"); ag.addColorStop(0.6, "rgba(74,163,216,0.16)"); ag.addColorStop(1, "rgba(74,163,216,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.14, 0, 7); ctx.fillStyle = ag; ctx.fill();
      for (var i = 0; i < routes.length; i++) {
        var rt = routes[i], ip = d3.geoInterpolate(rt.a, rt.b);
        ctx.beginPath(); var st = false;
        for (var t = 0; t <= 1.001; t += 0.035) {
          var pt = ip(t);
          if (vis(pt)) { var xy = proj(pt); if (!st) { ctx.moveTo(xy[0], xy[1]); st = true; } else ctx.lineTo(xy[0], xy[1]); } else st = false;
        }
        ctx.strokeStyle = "rgba(74,163,216,0.22)"; ctx.lineWidth = 0.8; ctx.stroke();
        for (var d = 0; d < 6; d++) {
          var tp = rt.ph - d * 0.015; if (tp < 0) continue;
          var pp = ip(tp); if (vis(pp)) { var xy2 = proj(pp); ctx.beginPath(); ctx.arc(xy2[0], xy2[1], 1.7, 0, 7); ctx.fillStyle = "rgba(196,232,252," + (0.6 * (1 - d / 6)) + ")"; ctx.fill(); }
        }
      }
      for (var ci = 0; ci < cities.length; ci++) {
        var p = cities[ci];
        if (vis(p)) { var x3 = proj(p); ctx.beginPath(); ctx.arc(x3[0], x3[1], 3, 0, 7); ctx.fillStyle = "rgba(74,163,216,0.14)"; ctx.fill(); ctx.beginPath(); ctx.arc(x3[0], x3[1], 1.4, 0, 7); ctx.fillStyle = "rgba(165,218,247,0.95)"; ctx.fill(); }
      }
    }
    function tick() {
      if (!running) return;
      rotLon += 0.11; proj.rotate([rotLon, -18]);
      for (var i = 0; i < routes.length; i++) { routes[i].ph += 0.004; if (routes[i].ph > 1) routes[i].ph -= 1; }
      draw();
      raf = requestAnimationFrame(tick);
    }
    size();
    window.addEventListener("resize", function () { size(); if (!running) draw(); });
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(function (w) {
      land = topojson.feature(w, w.objects.countries);
      borders = topojson.mesh(w, w.objects.countries, function (a, b) { return a !== b; });
      if (!running) draw();
    }).catch(function () {});
    draw();
    if (reduced) return;
    whenVisible(c, function (on) {
      if (on && !running) { running = true; raf = requestAnimationFrame(tick); }
      else if (!on && running) { running = false; cancelAnimationFrame(raf); }
    });
  })();
})();
