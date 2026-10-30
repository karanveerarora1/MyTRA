/* MYTRA // site/landing.js - public-site decoration. Standalone, no dependencies.
   The pages are complete without this file. */
"use strict";

/* ---------- landing canvas: a quiet telemetry field ---------- */
(function startLandingCanvas() {
  const cv = document.getElementById("lgrid");
  if (!cv || !cv.getContext) return;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = cv.getContext("2d");
  let W = 0, H = 0;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pts = [];
  const size = () => {
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const seed = () => {
    pts.length = 0;
    const n = Math.min(46, Math.round(W * H / 30000));
    for (let i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .1, vy: (Math.random() - .5) * .1, r: Math.random() * 1.1 + .3 });
  };
  let t = 0;
  const frame = () => {
    ctx.clearRect(0, 0, W, H);
    /* horizon rules */
    ctx.strokeStyle = "rgba(79,216,245,.055)";
    ctx.lineWidth = 1;
    for (let y = ((t * .18) % 90) - 90; y < H; y += 90) {
      ctx.beginPath(); ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(W, Math.round(y) + .5); ctx.stroke();
    }
    /* drifting points with faint links */
    pts.forEach(p => {
      if (!reduce) { p.x += p.vx; p.y += p.vy; }
      if (p.x < 0) p.x += W; if (p.x > W) p.x -= W;
      if (p.y < 0) p.y += H; if (p.y > H) p.y -= H;
      ctx.fillStyle = "rgba(79,216,245,.34)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
    });
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 20000) {
          ctx.strokeStyle = "rgba(79,216,245," + (0.055 * (1 - d2 / 20000)).toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
        }
      }
    }
    if (reduce) return; /* one still frame for reduced motion */
    t++;
    requestAnimationFrame(frame);
  };
  size(); seed();
  window.addEventListener("resize", () => { size(); seed(); if (reduce) frame(); });
  frame();
})();
