/* MYTRA // site/hero.js - the front-page hero. Standalone, no dependencies.
   A WebGL particle field that morphs through the five people MYTRA is built for
   (athlete, founder, student, creator, engineer) and then collapses into "YOU",
   plus the boot sequence, identity cycle, day clock and cursor reticle.
   The hero reads complete without this file. */
"use strict";

(function mytraHero() {
  const hero = document.getElementById("hero");
  if (!hero) return;
  const root = document.documentElement;
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const fine = !!(window.matchMedia && matchMedia("(pointer: fine)").matches);
  const TAU = Math.PI * 2;
  const $ = id => document.getElementById(id);

  const IDS = [
    { word: "athlete",  pre: "For the", line: "recovery, sleep and training load, read together." },
    { word: "founder",  pre: "For the", line: "energy and deep work, managed as a resource." },
    { word: "student",  pre: "For the", line: "focus hours and sleep, tracked through every term." },
    { word: "creator",  pre: "For the", line: "your best working hours, found in your own data." },
    { word: "engineer", pre: "For the", line: "every input to your day, instrumented." },
    { word: "you",      pre: "For",     line: "measured against your own baseline." }
  ];
  const HOLD = [3800, 3800, 3800, 3800, 4200, 5200];

  /* ---------- text scramble ---------- */
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>#%+=";
  function scramble(el, text, dur) {
    if (!el) return;
    if (reduce) { el.textContent = text; return; }
    const from = el.textContent, len = Math.max(from.length, text.length);
    const t0 = performance.now(), id = (el._scr || 0) + 1;
    el._scr = id;
    (function step(now) {
      if (el._scr !== id) return;
      const p = Math.min(1, (now - t0) / dur);
      let s = "";
      for (let i = 0; i < len; i++) {
        const lock = 0.3 + 0.7 * i / len;
        if (p >= lock) s += text[i] || "";
        else if (p > lock - 0.42) s += text[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        else s += from[i] || "";
      }
      el.textContent = s;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- seeded random ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ============================================================
     PARTICLE FIELD
     ============================================================ */
  function createField(canvas) {
    let gl = null;
    try { gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, powerPreference: "high-performance" }); } catch (e) { gl = null; }
    if (!gl) return null;

    const CAM = 4.2, F = 1 / Math.tan(22.5 * Math.PI / 180);
    const small = innerWidth < 760;
    const N = small ? 9000 : 20000;
    const DUST = small ? 900 : 2000;
    const M = N - DUST;
    const R = mulberry32(20261003);
    const dpr = Math.min(1.75, window.devicePixelRatio || 1);

    const pos = new Float32Array(N * 3);
    const rnd = new Float32Array(N * 4);
    const ease = new Float32Array(M);
    const shapes = [];
    for (let k = 0; k < 6; k++) shapes.push(new Float32Array(M * 3));

    for (let i = 0; i < N; i++) {
      rnd[i * 4] = R(); rnd[i * 4 + 1] = R(); rnd[i * 4 + 2] = R();
      rnd[i * 4 + 3] = R() * 0.999 + (i >= M ? 2 : 0);
    }
    for (let i = 0; i < M; i++) {
      const r = R();
      ease[i] = 0.016 + r * r * 0.07;
      const u = R() * 2 - 1, th = R() * TAU, s = Math.sqrt(1 - u * u), rr = 0.04 * R();
      pos[i * 3] = s * Math.cos(th) * rr; pos[i * 3 + 1] = u * rr; pos[i * 3 + 2] = s * Math.sin(th) * rr;
    }
    for (let i = M; i < N; i++) {
      pos[i * 3] = (R() - 0.5) * 14; pos[i * 3 + 1] = (R() - 0.5) * 8; pos[i * 3 + 2] = -7 + R() * 9;
    }

    const rotate = (o, x, y, z, ax, ay) => {
      const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
      const y1 = cx * y - sx * z, z1 = sx * y + cx * z;
      o[0] = cy * x + sy * z1; o[1] = y1; o[2] = -sy * x + cy * z1;
    };
    const tmp = [0, 0, 0];

    /* 0 ATHLETE - a beating core inside three orbital rings */
    (function athlete(a) {
      for (let i = 0; i < M; i++) {
        const o = i * 3;
        if (i % 4 === 0) {
          const k = i % 3, ang = R() * TAU, rr = 1.42 + k * 0.13 + (R() - 0.5) * 0.03;
          rotate(tmp, Math.cos(ang) * rr, (R() - 0.5) * 0.02, Math.sin(ang) * rr, [0.42, -0.7, 1.25][k], [0, 1.1, 2.3][k]);
          a[o] = tmp[0]; a[o + 1] = tmp[1]; a[o + 2] = tmp[2];
        } else {
          const y = 1 - 2 * (i + 0.5) / M, s = Math.sqrt(1 - y * y), th = i * 2.399963, r = 0.98 + (R() - 0.5) * 0.02;
          a[o] = Math.cos(th) * s * r; a[o + 1] = y * r; a[o + 2] = Math.sin(th) * s * r;
        }
      }
    })(shapes[0]);

    /* 1 FOUNDER - a four-arm spiral that climbs to a summit, with a beam above it */
    (function founder(a) {
      for (let i = 0; i < M; i++) {
        const o = i * 3, q = R();
        if (q < 0.12) {
          const ang = R() * TAU, rr = 1.25 + R() * 0.45;
          a[o] = Math.cos(ang) * rr; a[o + 1] = -1.05 + (R() - 0.5) * 0.02; a[o + 2] = Math.sin(ang) * rr;
        } else if (q < 0.17) {
          a[o] = (R() - 0.5) * 0.015; a[o + 1] = 1.05 + R() * 0.6; a[o + 2] = (R() - 0.5) * 0.015;
        } else {
          const t = Math.pow(R(), 0.85), rr = 1.3 * (1 - t) + 0.03, ang = t * 4 * TAU + (i % 4) * TAU / 4;
          const j = (R() - 0.5) * 0.06 * (1 - t);
          a[o] = Math.cos(ang) * (rr + j); a[o + 1] = -1.05 + t * 2.1; a[o + 2] = Math.sin(ang) * (rr + j);
        }
      }
    })(shapes[1]);

    /* 2 STUDENT - a double helix: growth, encoded */
    (function student(a) {
      for (let i = 0; i < M; i++) {
        const o = i * 3;
        let s, x, y, z;
        if (i % 5 === 0) {
          s = ((R() * 20) | 0) / 19 * 2 - 1;
          const ang = s * 1.6 * TAU, v = R();
          const ax = Math.cos(ang) * 0.62, az = Math.sin(ang) * 0.62;
          x = ax * (1 - 2 * v); z = az * (1 - 2 * v);
        } else {
          s = R() * 2 - 1;
          const ang = s * 1.6 * TAU + (i % 2) * Math.PI, rr = 0.62 + (R() - 0.5) * 0.07;
          x = Math.cos(ang) * rr; z = Math.sin(ang) * rr;
        }
        y = s * 1.3;
        const c = Math.cos(0.62), sn = Math.sin(0.62);
        a[o] = c * x - sn * y; a[o + 1] = sn * x + c * y; a[o + 2] = z;
      }
    })(shapes[2]);

    /* 3 CREATOR - a (2,5) torus knot: one unbroken line, never repeating the same way */
    (function creator(a) {
      for (let i = 0; i < M; i++) {
        const o = i * 3, t = R() * TAU, p = 2, q = 5;
        const r = 0.82 + 0.36 * Math.cos(q * t);
        const tube = 0.075 * Math.sqrt(R()), u = R() * TAU, v = R() * 2 - 1, sv = Math.sqrt(1 - v * v);
        a[o] = r * Math.cos(p * t) + tube * sv * Math.cos(u);
        a[o + 1] = r * Math.sin(p * t) + tube * v;
        a[o + 2] = 0.36 * Math.sin(q * t) + tube * sv * Math.sin(u);
      }
    })(shapes[3]);

    /* 4 ENGINEER - a tesseract, rotating through the fourth dimension (rebuilt every frame) */
    const V4 = [], EDGES = [];
    for (let v = 0; v < 16; v++) V4.push([v & 1 ? 1 : -1, v & 2 ? 1 : -1, v & 4 ? 1 : -1, v & 8 ? 1 : -1]);
    for (let v = 0; v < 16; v++) for (let b = 0; b < 4; b++) { const w = v ^ (1 << b); if (v < w) EDGES.push([v, w]); }
    const tE = new Uint8Array(M), tT = new Float32Array(M), P3 = new Float32Array(48);
    for (let i = 0; i < M; i++) {
      tE[i] = i % 32;
      tT[i] = R() < 0.14 ? (R() < 0.5 ? R() * 0.03 : 1 - R() * 0.03) : R();
    }
    function engineer(a, ang) {
      const c1 = Math.cos(ang), s1 = Math.sin(ang), c2 = Math.cos(ang * 0.62), s2 = Math.sin(ang * 0.62);
      for (let v = 0; v < 16; v++) {
        let [x, y, z, w] = V4[v];
        const x1 = c1 * x - s1 * w, w1 = s1 * x + c1 * w;
        const z1 = c2 * z - s2 * w1, w2 = s2 * z + c2 * w1;
        const f = 1.65 / (2.7 - w2);
        rotate(tmp, x1 * f, y * f, z1 * f, 0.38, 0.62);
        P3[v * 3] = tmp[0]; P3[v * 3 + 1] = tmp[1]; P3[v * 3 + 2] = tmp[2];
      }
      for (let i = 0; i < M; i++) {
        const e = EDGES[tE[i]], t = tT[i], A = e[0] * 3, B = e[1] * 3, o = i * 3;
        a[o] = P3[A] + (P3[B] - P3[A]) * t;
        a[o + 1] = P3[A + 1] + (P3[B + 1] - P3[A + 1]) * t;
        a[o + 2] = P3[A + 2] + (P3[B + 2] - P3[A + 2]) * t;
      }
    }
    engineer(shapes[4], 0.6);

    /* 5 YOU - sampled from type; placeholder sphere until the font is ready */
    shapes[5].set(shapes[0]);
    function buildYou() {
      const c = document.createElement("canvas"), W = 1000, H = 400;
      c.width = W; c.height = H;
      const x = c.getContext("2d");
      x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
      x.font = "800 360px 'Saira Condensed', 'Saira', 'Arial Narrow', sans-serif";
      x.fillText("YOU", W / 2, H / 2 + 14);
      const d = x.getImageData(0, 0, W, H).data, pts = [];
      for (let py = 0; py < H; py += 2) for (let px = 0; px < W; px += 2) if (d[(py * W + px) * 4 + 3] > 140) pts.push(px, py);
      if (!pts.length) return;
      const n = pts.length / 2, a = shapes[5], S = 3.1 / W;
      for (let i = 0; i < M; i++) {
        const k = ((R() * n) | 0) * 2, o = i * 3;
        a[o] = (pts[k] - W / 2 + (R() - 0.5) * 2) * S;
        a[o + 1] = -(pts[k + 1] - H / 2 + (R() - 0.5) * 2) * S;
        a[o + 2] = (R() - 0.5) * 0.14;
      }
    }
    if (document.fonts && document.fonts.load) {
      let built = false;
      const go = () => { if (!built) { built = true; buildYou(); } };
      document.fonts.load("800 100px 'Saira Condensed'").then(go, go);
      setTimeout(go, 2500);
    } else buildYou();

    /* ---------- GL program ---------- */
    const VS = `
      precision highp float;
      attribute vec3 aPos; attribute vec4 aRnd;
      uniform float uTime, uAspect, uDpr, uBurst, uScroll, uPulse, uScale, uSize;
      uniform vec2 uCenter, uRot, uMouse;
      varying float vA, vR, vHot;
      vec3 rY(vec3 p, float a){ float c=cos(a), s=sin(a); return vec3(c*p.x+s*p.z, p.y, -s*p.x+c*p.z); }
      vec3 rX(vec3 p, float a){ float c=cos(a), s=sin(a); return vec3(p.x, c*p.y-s*p.z, s*p.y+c*p.z); }
      void main(){
        float dust = step(1.5, aRnd.w);
        float r = fract(aRnd.w);
        float live = 1.0 - dust;
        vec3 dir = normalize(aRnd.xyz - 0.5 + 0.001);
        vec3 p = aPos;
        p += 0.013 * vec3(sin(uTime*1.3 + aRnd.x*50.0), cos(uTime*1.1 + aRnd.y*50.0), sin(uTime*0.9 + aRnd.z*50.0)) * live;
        p *= 1.0 + uPulse * (0.045 + 0.07*r) * live;
        p += dir * (uBurst * (0.25 + 0.9*r) + uScroll * (1.2 + 3.6*r)) * live;
        if (dust < 0.5) { p = rX(rY(p, uRot.y), uRot.x) * uScale; p.xy += uCenter; }
        else { p = rY(p, uRot.y * 0.15 + uTime * 0.012); p.y += sin(uTime*0.25 + aRnd.x*30.0) * 0.06; }
        float w = max(0.2, ${CAM.toFixed(2)} - p.z);
        gl_Position = vec4(p.x * ${F.toFixed(4)} / uAspect, p.y * ${F.toFixed(4)}, 0.0, w);
        vec2 ndc = gl_Position.xy / w;
        vec2 d = ndc - uMouse; d.x *= uAspect;
        float dist = length(d);
        float push = live * smoothstep(0.34, 0.0, dist) * 0.085;
        vec2 off = d / (dist + 0.0001) * push; off.x /= uAspect;
        gl_Position.xy += off * w;
        float sz = mix(1.0 + r*1.7, 0.6 + r*1.3, dust);
        gl_PointSize = max(1.0, uSize * sz * uDpr * (${CAM.toFixed(2)} / w) * mix(0.45 + 0.55*uScale, 1.0, dust));
        vA = dust > 0.5 ? (0.16 + 0.32*r) : (0.22 + 0.78 * smoothstep(${(CAM + 2.2).toFixed(2)}, ${(CAM - 1.4).toFixed(2)}, w));
        vA *= 1.0 - uScroll * 0.7 * live;
        vR = r; vHot = push * 9.0;
      }`;
    const FS = `
      precision mediump float;
      varying float vA, vR, vHot;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = dot(c, c) * 4.0;
        if (d > 1.0) discard;
        float a = pow(1.0 - d, 2.2);
        vec3 col = mix(vec3(0.31, 0.85, 0.96), vec3(0.86, 0.97, 1.0), smoothstep(0.55, 1.0, vR));
        col = mix(col, vec3(0.46, 0.56, 1.0), step(vR, 0.12) * 0.7);
        col = mix(col, vec3(1.0), clamp(vHot, 0.0, 1.0) * 0.6);
        float al = a * vA * (1.0 + vHot);
        gl_FragColor = vec4(col * al, al);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    const bPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bPos);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    const bRnd = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bRnd);
    gl.bufferData(gl.ARRAY_BUFFER, rnd, gl.STATIC_DRAW);
    const aRnd = gl.getAttribLocation(prog, "aRnd");
    gl.enableVertexAttribArray(aRnd); gl.vertexAttribPointer(aRnd, 4, gl.FLOAT, false, 0, 0);
    const U = {};
    ["uTime", "uAspect", "uDpr", "uBurst", "uScroll", "uPulse", "uScale", "uSize", "uCenter", "uRot", "uMouse"].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 0);

    /* ---------- state ---------- */
    let aspect = 1, center = [0, 0], scale = 1;
    let kind = 0, released = false, burst = 0, pulseAmt = 0, spin = 0.3, time = 0;
    let mx = 9, my = 9, smx = 0, smy = 0, tilt = 0, scroll = 0;
    let running = false, raf = 0, last = 0, fpsN = 0, fpsT = 0;
    const fpsEl = $("xh-fps");
    if ($("xh-pts")) $("xh-pts").textContent = N.toLocaleString("en-GB");

    function layout() {
      const W = canvas.clientWidth || 1, H = canvas.clientHeight || 1;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      aspect = W / H;
      const HALF = CAM / F, ppw = (H / 2) / HALF;
      let cx, cy, rad;
      if (W >= 900) {
        cx = W * 0.31; cy = H * 0.38; rad = Math.min(W * 0.15, H * 0.225);
      } else {
        const k = hero.querySelector(".xh-kick");
        const top = k ? k.getBoundingClientRect().top - hero.getBoundingClientRect().top : H * 0.4;
        cx = W / 2; cy = Math.max(H * 0.17, Math.min(top * 0.56, H * 0.3)); rad = Math.max(110, Math.min(W * 0.36, top * 0.4));
      }
      center = [(cx / W * 2 - 1) * HALF * aspect, (1 - cy / H * 2) * HALF];
      scale = rad / (1.3 * ppw);
    }

    function beat(t) {
      const ph = t % 1.1, g = (c, w) => Math.exp(-((ph - c) * (ph - c)) / (w * w));
      return g(0.08, 0.045) + 0.6 * g(0.3, 0.05);
    }

    function draw() {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.uTime, time);
      gl.uniform1f(U.uAspect, aspect);
      gl.uniform1f(U.uDpr, dpr);
      gl.uniform1f(U.uBurst, burst);
      gl.uniform1f(U.uScroll, scroll);
      gl.uniform1f(U.uPulse, pulseAmt * beat(time));
      gl.uniform1f(U.uScale, scale);
      gl.uniform1f(U.uSize, small ? 1.9 : 2.1);
      gl.uniform2f(U.uCenter, center[0], center[1]);
      const isText = kind === 5;
      gl.uniform2f(U.uRot, -0.12 + tilt * (isText ? 0.12 : 0.28), spin + smx * (isText ? 0.22 : 0.5));
      gl.uniform2f(U.uMouse, mx, my);
      gl.drawArrays(gl.POINTS, 0, N);
    }

    function step(dtf) {
      if (kind === 4) engineer(shapes[4], 0.6 + time * 0.42);
      const t = shapes[kind];
      for (let i = 0, o = 0; i < M; i++, o += 3) {
        const k = Math.min(1, ease[i] * dtf);
        pos[o] += (t[o] - pos[o]) * k;
        pos[o + 1] += (t[o + 1] - pos[o + 1]) * k;
        pos[o + 2] += (t[o + 2] - pos[o + 2]) * k;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, bPos);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos.subarray(0, M * 3));
    }

    function frame(now) {
      if (!running) { raf = 0; return; }
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now; time += dt;
      const dtf = dt * 60;
      fpsN++; fpsT += dt;
      if (fpsT > 0.5) { if (fpsEl) fpsEl.textContent = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; }

      const inside = mx < 2;
      smx += ((inside ? mx : 0) - smx) * 0.05 * dtf;
      smy += ((inside ? my : 0) - smy) * 0.05 * dtf;
      tilt = smy;
      if (kind === 5) { const goal = Math.round(spin / TAU) * TAU; spin += (goal - spin) * 0.045 * dtf; }
      else spin += dt * 0.17;
      burst *= Math.pow(0.935, dtf);
      pulseAmt += ((kind === 0 ? 1 : 0) - pulseAmt) * 0.05 * dtf;

      if (released) step(dtf);
      draw();
    }

    function setRunning(on) {
      if (reduce) return;
      if (on === running) return;
      running = on;
      if (on) { last = 0; raf = requestAnimationFrame(frame); }
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }

    function still() {
      /* reduced motion: one composed frame, no movement */
      pos.set(shapes[kind].subarray(0, M * 3), 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, bPos);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos.subarray(0, M * 3));
      burst = 0; draw();
    }

    layout();
    if (reduce) still();

    return {
      morph(k) {
        kind = k;
        if (reduce) { if (k === 5) spin = 0; still(); return; }
        burst = Math.max(burst, 0.32);
      },
      release() {
        released = true;
        if (reduce) { still(); return; }
        burst = 1.25;
      },
      resize() { layout(); if (reduce) still(); },
      mouse(x, y) { mx = x; my = y; },
      scroll(v) { scroll = v; },
      run: setRunning
    };
  }

  /* ============================================================
     WIRING
     ============================================================ */
  const canvas = $("xh-gl");
  const field = canvas ? createField(canvas) : null;
  if (!field) hero.classList.add("no-gl");

  const preEl = $("xh-pre"), wordEl = $("xh-word"), lineEl = $("xh-line"), greatEl = $("xh-great");
  const idxBtns = Array.from(hero.querySelectorAll(".xh-idx button"));
  let cur = 0, timer = 0, live = false;

  function schedule() {
    clearTimeout(timer);
    if (reduce || !live || document.hidden) return;
    timer = setTimeout(() => show((cur + 1) % IDS.length), HOLD[cur]);
  }
  function show(i) {
    cur = i;
    const d = IDS[i];
    if (preEl) preEl.textContent = d.pre;
    scramble(wordEl, d.word.toUpperCase(), 620);
    if (lineEl) {
      lineEl.classList.add("swap");
      setTimeout(() => { lineEl.textContent = d.line; lineEl.classList.remove("swap"); }, 240);
    }
    idxBtns.forEach((b, k) => { b.classList.remove("on"); b.setAttribute("aria-pressed", String(k === i)); });
    if (i < 5 && idxBtns[i]) {
      void idxBtns[i].offsetWidth;
      idxBtns[i].style.setProperty("--dur", HOLD[i] + "ms");
      idxBtns[i].classList.add("on");
    }
    hero.classList.toggle("is-you", i === 5);
    if (i === 5) scramble(greatEl, "great.", 900);
    if (field) field.morph(i);
    schedule();
  }
  idxBtns.forEach(b => b.addEventListener("click", () => show(+b.dataset.i)));
  document.addEventListener("visibilitychange", () => {
    if (field) field.run(!document.hidden && heroVisible);
    schedule();
    startHud();
  });

  /* ---------- pointer: field repulsion + reticle ---------- */
  const ret = hero.querySelector(".xh-ret"), retL = $("xh-ret-l");
  let rx = 0, ry = 0, rtx = 0, rty = 0, retRaf = 0;
  function retLoop() {
    rx += (rtx - rx) * 0.22; ry += (rty - ry) * 0.22;
    ret.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";
    retRaf = Math.abs(rtx - rx) + Math.abs(rty - ry) > 0.3 ? requestAnimationFrame(retLoop) : 0;
  }
  hero.addEventListener("pointermove", e => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 2 - 1, y = 1 - (e.clientY - r.top) / r.height * 2;
    if (field) field.mouse(x, y);
    if (fine && ret && !reduce) {
      rtx = e.clientX - r.left; rty = e.clientY - r.top;
      hero.classList.toggle("ret-on", !e.target.closest("a,button"));
      if (retL) retL.textContent = "X " + (x >= 0 ? "+" : "") + x.toFixed(3) + "  Y " + (y >= 0 ? "+" : "") + y.toFixed(3);
      if (!retRaf) retRaf = requestAnimationFrame(retLoop);
    }
  });
  hero.addEventListener("pointerleave", () => { if (field) field.mouse(9, 9); hero.classList.remove("ret-on"); });

  /* ---------- scroll: content lifts away, particles disperse ---------- */
  let heroVisible = true;
  function onScroll() {
    /* measured from the hero's bottom edge so a tall (phone) hero doesn't fade while it's still being read */
    const r = hero.getBoundingClientRect(), vh = window.innerHeight || r.height;
    const p = Math.min(1, Math.max(0, (vh - r.bottom) / (vh * 0.9)));
    hero.style.setProperty("--xp", p.toFixed(3));
    if (field) field.scroll(p * p);
  }
  addEventListener("scroll", onScroll, { passive: true });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(es => {
      heroVisible = es[0].isIntersecting;
      if (field) field.run(heroVisible && !document.hidden);
      startHud();
    }).observe(hero);
  }
  let rzT = 0;
  const onResize = () => { clearTimeout(rzT); rzT = setTimeout(() => { if (field) field.resize(); onScroll(); }, 120); };
  if ("ResizeObserver" in window) new ResizeObserver(onResize).observe(hero);
  else addEventListener("resize", onResize);

  /* ---------- day clock ---------- */
  const clk = $("xh-clock");
  const pad = n => String(n).padStart(2, "0");
  function tick() {
    if (!clk) return;
    const n = new Date(), m = new Date(n);
    m.setHours(24, 0, 0, 0);
    const s = Math.max(0, Math.floor((m - n) / 1000));
    clk.innerHTML = pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s % 3600 / 60)) + "<small>:" + pad(s % 60) + "</small>";
  }
  tick(); setInterval(tick, 1000);

  /* ---------- pit wall: session timer + simulated focus / energy trace ---------- */
  const tr = $("xh-trace"), sessEl = $("xh-sess"), fEl = $("xh-f"), eEl = $("xh-e");
  const tctx = tr && tr.getContext ? tr.getContext("2d") : null;
  const TN = 96, fBuf = new Float32Array(TN), eBuf = new Float32Array(TN), tStart = performance.now();
  let hudRaf = 0, simT = 0, lastSample = 0, lastUi = 0;
  const sim = (t, k) => 0.55 + 0.2 * Math.sin(t * 1.6 + k) + 0.12 * Math.sin(t * 4.1 + k * 2) + 0.06 * Math.sin(t * 10.3 + k * 3);
  if (tctx) {
    const d = Math.min(2, window.devicePixelRatio || 1);
    tr.width = 250 * d; tr.height = 46 * d;
    tctx.setTransform(tr.width / 250, 0, 0, d, 0, 0);
    for (let i = 0; i < TN; i++) { simT += 0.07; fBuf[i] = sim(simT, 0); eBuf[i] = sim(simT * 0.8, 2.1); }
  }
  function drawTrace() {
    if (!tctx) return;
    const W = 250, H = 46;
    tctx.clearRect(0, 0, W, H);
    tctx.strokeStyle = "rgba(122,138,147,.12)"; tctx.lineWidth = 1;
    for (let x = 0; x < W; x += 25) { tctx.beginPath(); tctx.moveTo(x + .5, 0); tctx.lineTo(x + .5, H); tctx.stroke(); }
    const line = (buf, col) => {
      tctx.beginPath();
      for (let i = 0; i < TN; i++) {
        const x = i / (TN - 1) * W, y = H - 4 - Math.max(0, Math.min(1, buf[i])) * (H - 8);
        i ? tctx.lineTo(x, y) : tctx.moveTo(x, y);
      }
      tctx.strokeStyle = col; tctx.lineWidth = 1.4; tctx.shadowColor = col; tctx.shadowBlur = 6; tctx.stroke(); tctx.shadowBlur = 0;
      const y = H - 4 - Math.max(0, Math.min(1, buf[TN - 1])) * (H - 8);
      tctx.fillStyle = "#fff"; tctx.beginPath(); tctx.arc(W - 2, y, 1.8, 0, TAU); tctx.fill();
    };
    line(eBuf, "rgba(185,140,255,.85)");
    line(fBuf, "rgba(79,216,245,1)");
  }
  function hudUi() {
    if (fEl) fEl.textContent = Math.round(68 + fBuf[TN - 1] * 30);
    if (eEl) eEl.textContent = Math.round(64 + eBuf[TN - 1] * 32);
  }
  function hudLoop(now) {
    hudRaf = 0;
    if (!heroVisible || document.hidden) return;
    hudRaf = requestAnimationFrame(hudLoop);
    const s = (now - tStart) / 1000;
    if (sessEl) sessEl.textContent = pad(Math.floor(s / 60) % 100) + ":" + pad(Math.floor(s % 60)) + "." + String(Math.floor(s * 1000 % 1000)).padStart(3, "0");
    if (now - lastSample > 60) {
      lastSample = now; simT += 0.07;
      fBuf.copyWithin(0, 1); eBuf.copyWithin(0, 1);
      fBuf[TN - 1] = sim(simT, 0); eBuf[TN - 1] = sim(simT * 0.8, 2.1);
      drawTrace();
    }
    if (now - lastUi > 450) { lastUi = now; hudUi(); }
  }
  function startHud() {
    if (reduce) { drawTrace(); hudUi(); return; }
    if (!hudRaf && heroVisible && !document.hidden) hudRaf = requestAnimationFrame(hudLoop);
  }
  startHud();

  /* ---------- boot sequence, then go live ---------- */
  function goLive() {
    if (live) return;
    live = true;
    hero.classList.add("is-live");
    if (field) { field.run(heroVisible && !document.hidden); field.release(); }
    setTimeout(() => scramble(greatEl, "great.", 1100), 450);
    show(0);
  }
  (function boot() {
    const el = $("xh-boot");
    if (!el || !root.classList.contains("xh-booting")) { root.classList.remove("xh-booting"); goLive(); return; }
    try { sessionStorage.setItem("mytra:boot", "1"); } catch (e) { /* fine: boot shows again next visit */ }
    if (field) field.run(true);
    /* calibration: five channels lock in one after another, a short hold, then release */
    const pods = Array.from(el.querySelectorAll(".pod")), lbl = $("xh-boot-l"), timers = [], STEP = 300;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      pods.forEach(p => p.classList.add("on"));
      if (lbl) lbl.textContent = "Ready";
      el.classList.add("lock");
      setTimeout(() => el.classList.add("out"), 260);
      setTimeout(() => { el.classList.add("done"); goLive(); }, 520);
      setTimeout(() => { root.classList.remove("xh-booting"); el.remove(); }, 1500);
    };
    pods.forEach((p, k) => timers.push(setTimeout(() => p.classList.add("on"), 250 + k * STEP)));
    timers.push(setTimeout(finish, 250 + 5 * STEP + 250));
    el.addEventListener("click", finish);
    addEventListener("keydown", finish, { once: true });
  })();
})();
