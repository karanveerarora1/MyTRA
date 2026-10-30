/* MYTRA // core/utils.js - DOM helpers, time and numeric utilities. No dependencies. */
"use strict";

/* ============================================================
   MYTRA // PERSONAL TELEMETRY
   All analysis in this file is deterministic statistics computed
   from the signed-in person's own logged data. No language model
   is called, and no number is invented.
   ============================================================ */
const VER = "1.0.0";
const BUILD = "MT-" + VER.replace(/\./g, "");

/* ---------- tiny dom helpers ---------- */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const on = (n, ev, fn) => n && n.addEventListener(ev, fn);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/* ---------- time ---------- */
const p2 = n => String(n).padStart(2, "0");
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const DOW = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
function dkey(d) { return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
function mkey(k) { return k.slice(0, 7); }
function parseKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); }
function todayKey() { return dkey(new Date()); }
function keyRange(endK, n) { const out = []; for (let i = n - 1; i >= 0; i--) out.push(addDays(endK, -i)); return out; }
function fmtDate(k) { const d = parseKey(k); return DOW[d.getDay()] + " " + p2(d.getDate()) + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
function fmtDateShort(k) { const d = parseKey(k); return p2(d.getDate()) + " " + MONTHS[d.getMonth()]; }
function toMin(hhmm) { if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null; const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; }
function fromMin(m) { m = ((Math.round(m) % 1440) + 1440) % 1440; return p2(Math.floor(m / 60)) + ":" + p2(m % 60); }
function hm(mins) { if (mins == null || isNaN(mins)) return "—"; const s = mins < 0 ? "-" : ""; mins = Math.abs(Math.round(mins)); return s + p2(Math.floor(mins / 60)) + ":" + p2(mins % 60); }
function hmShort(mins) { if (mins == null) return "—"; mins = Math.round(mins); return Math.floor(mins / 60) + "h " + p2(mins % 60) + "m"; }
function dur(sec) { sec = Math.max(0, Math.round(sec)); return p2(Math.floor(sec / 3600)) + ":" + p2(Math.floor(sec % 3600 / 60)) + ":" + p2(sec % 60); }
function durShort(sec) { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60); return h ? h + "h " + p2(m) + "m" : m + "m " + p2(sec % 60) + "s"; }
function nowMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }

/* ---------- numeric ---------- */
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
function pct(a, q) { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); const i = clamp((s.length - 1) * q, 0, s.length - 1); const lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); }
const median = a => pct(a, .5);
function stdev(a) { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); }
function pearson(xs, ys) {
  const n = xs.length; if (n < 3) return null;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  if (sxx <= 0 || syy <= 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}
function signedPct(v) { if (v == null || !isFinite(v)) return "—"; const s = v > 0 ? "+" : v < 0 ? "−" : ""; return s + Math.abs(v).toFixed(1) + "%"; }
function fx(v, n) { return v == null || !isFinite(v) ? "—" : v.toFixed(n == null ? 1 : n); }

function bedNorm(hhmm) { const m = toMin(hhmm); if (m == null) return null; return m < 720 ? m + 1440 : m; }
function sleepDur(bed, wake) {
  const b = toMin(bed), w = toMin(wake);
  if (b == null || w == null) return null;
  let d = w - b; if (d <= 0) d += 1440;
  return d > 900 ? null : d;
}

