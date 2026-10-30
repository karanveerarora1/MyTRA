/* MYTRA // core/analytics.js - deterministic statistics over logged data. Needs state.js. */
"use strict";

/* ============================================================
   ANALYTICS — deterministic, computed from logged data only.
   Nothing here fabricates a value: a metric with no entry stays
   null and is excluded from every mean, correlation and chart.
   ============================================================ */


/* Variables MYTRA tracks. `hb` = higher is better (for baseline deltas). */
const VARS = [
  { id: "sleepMin",  n: "Sleep",            hb: 1, fmt: v => hm(v),              unit: "" },
  { id: "sleepQ",    n: "Sleep quality",    hb: 1, fmt: v => fx(v, 1),           unit: "/10" },
  { id: "focusR",    n: "Focus",            hb: 1, fmt: v => fx(v, 1),           unit: "/10" },
  { id: "energy",    n: "Energy",           hb: 1, fmt: v => fx(v, 1),           unit: "/10" },
  { id: "mood",      n: "Mood",             hb: 1, fmt: v => fx(v, 1),           unit: "/10" },
  { id: "stress",    n: "Stress",           hb: -1, fmt: v => fx(v, 1),          unit: "/10" },
  { id: "habitPct",  n: "Routine",          hb: 1, fmt: v => Math.round(v) + "%", unit: "" },
  { id: "caffMg",    n: "Caffeine",         hb: 0, fmt: v => Math.round(v) + "mg", unit: "" },
  { id: "focusSec",  n: "Focus time",       hb: 1, fmt: v => durShort(v),        unit: "" },
  { id: "napMin",    n: "Recovery",         hb: 0, fmt: v => hm(v),              unit: "" },
  { id: "bedNorm",   n: "Bedtime",          hb: 0, fmt: v => fromMin(v),         unit: "" },
  { id: "dayR",      n: "Day rating",       hb: 1, fmt: v => fx(v, 1),           unit: "/10" }
];
const VAR = {}; VARS.forEach(v => VAR[v.id] = v);

/* ---------- per-day metric extraction ---------- */
function metrics(k) {
  const d = dayRO(k);
  const m = {
    date: k, sleepMin: null, sleepQ: null, bedNorm: null, wakeMin: null,
    energy: null, mood: null, focusR: null, stress: null, dayR: null,
    habitPct: null, habitDone: 0, habitTotal: 0,
    caffMg: null, caffLast: null, caffAfter14: null,
    focusSec: null, focusCount: 0, napMin: null, napCount: 0,
    logged: 0, score: null
  };
  if (!d) return m;
  if (d.sleep && d.sleep.durMin) { m.sleepMin = d.sleep.durMin; m.logged++; }
  if (d.sleep && d.sleep.quality) m.sleepQ = d.sleep.quality;
  if (d.sleep && d.sleep.bedtime) m.bedNorm = bedNorm(d.sleep.bedtime);
  if (d.sleep && d.sleep.wake) m.wakeMin = toMin(d.sleep.wake);
  const r = d.ratings || {};
  ["energy", "mood", "focusR", "stress", "dayR"].forEach(x => { if (r[x] != null) { m[x] = r[x]; m.logged++; } });

  const hs = activeHabits();
  const relevant = hs.filter(h => !h.startedOn || h.startedOn <= k);
  if (relevant.length) {
    m.habitTotal = relevant.length;
    m.habitDone = relevant.filter(h => d.habits && d.habits[h.id]).length;
    if (m.habitDone > 0 || d.debriefAt || k < todayKey()) { m.habitPct = m.habitDone / m.habitTotal * 100; }
    if (m.habitDone) m.logged++;
  }
  if (d.caffeine && d.caffeine.length) {
    m.caffMg = d.caffeine.reduce((s, c) => s + (c.mg || 0), 0);
    m.caffLast = Math.max.apply(null, d.caffeine.map(c => toMin(c.t) || 0));
    m.caffAfter14 = d.caffeine.filter(c => (toMin(c.t) || 0) >= 840).reduce((s, c) => s + (c.mg || 0), 0);
    m.logged++;
  }
  if (d.focus && d.focus.length) {
    m.focusSec = d.focus.reduce((s, f) => s + (f.sec || 0), 0);
    m.focusCount = d.focus.length; m.logged++;
  }
  if (d.naps && d.naps.length) {
    m.napMin = d.naps.reduce((s, n) => s + (n.minutes || 0), 0);
    m.napCount = d.naps.length; m.logged++;
  }
  m.score = dayScore(m);
  return m;
}

function dayScore(m) {
  const comps = [];
  const push = (w, v) => { if (v != null && isFinite(v)) comps.push([w, clamp(v, 0, 100)]); };
  push(1.5, m.dayR != null ? m.dayR * 10 : null);
  push(1.2, m.energy != null ? m.energy * 10 : null);
  push(1.2, m.focusR != null ? m.focusR * 10 : null);
  push(1.0, m.mood != null ? m.mood * 10 : null);
  push(0.8, m.stress != null ? (11 - m.stress) * 10 : null);
  push(1.0, m.habitPct);
  if (m.sleepMin != null) {
    const target = S.core.profile.sleepTarget || 480;
    push(1.1, 100 - Math.abs(m.sleepMin - target) * 0.16);
  }
  if (m.focusSec != null) push(0.7, Math.min(100, m.focusSec / (3 * 3600) * 100));
  if (comps.length < 2) return null;
  const wsum = comps.reduce((s, c) => s + c[0], 0);
  return Math.round(comps.reduce((s, c) => s + c[0] * c[1], 0) / wsum);
}

/* ---------- history ---------- */
function dayHistory(nDays, endK) {
  const end = endK || todayKey();
  return keyRange(end, nDays).map(metrics);
}
function seriesOf(hist, id) { return hist.map(m => m[id]); }
function vals(hist, id) { return hist.map(m => m[id]).filter(v => v != null && isFinite(v)); }

/* ---------- baselines: winsorised 30-day mean, gradually updated ---------- */
const BASE_WIN = 30, BASE_MIN = 5;
function baselines() {
  const hist = dayHistory(BASE_WIN + 1).slice(0, BASE_WIN);
  const out = {};
  VARS.forEach(v => {
    const a = vals(hist, v.id);
    if (a.length < BASE_MIN) { out[v.id] = { v: null, n: a.length }; return; }
    const lo = pct(a, .1), hi = pct(a, .9);
    const w = a.map(x => clamp(x, lo, hi));
    out[v.id] = { v: mean(w), n: a.length };
  });
  const scores = hist.map(m => m.score).filter(v => v != null);
  out.score = { v: scores.length >= BASE_MIN ? mean(scores) : null, n: scores.length };
  const beds = vals(hist, "bedNorm");
  out.bedConsistency = { v: beds.length >= 4 ? clamp(100 - (stdev(beds) || 0) * 0.55, 0, 100) : null, n: beds.length };
  return out;
}
function deltaVsBase(val, base, hb) {
  if (val == null || base == null || base === 0) return null;
  const raw = (val - base) / Math.abs(base) * 100;
  return { pct: raw, good: hb === 0 ? null : (hb > 0 ? raw >= 0 : raw <= 0) };
}

/* ============================================================
   CORRELATION / SIGNAL DETECTION
   Each relationship is tested on the person's own paired days.
   Confidence is a function of sample size and effect size only.
   ============================================================ */
const RELS = [
  { id: "sleep_focus",  x: "sleepMin", y: "focusR", lag: 0, xn: "sleep duration", yn: "focus", xf: v => hmShort(v), yf: v => fx(v, 1) + " / 10", split: "median",
    exp: t => "For the next 7 days, protect a " + hmShort(t) + " sleep opportunity and watch whether focus follows." },
  { id: "sleep_energy", x: "sleepMin", y: "energy", lag: 0, xn: "sleep duration", yn: "energy", xf: v => hmShort(v), yf: v => fx(v, 1) + " / 10", split: "median",
    exp: t => "Hold sleep at " + hmShort(t) + " or more for a week and log energy each morning." },
  { id: "sleep_mood",   x: "sleepMin", y: "mood", lag: 0, xn: "sleep duration", yn: "mood", xf: v => hmShort(v), yf: v => fx(v, 1) + " / 10", split: "median",
    exp: t => "Keep sleep above " + hmShort(t) + " for 7 days and see whether mood tracks it." },
  { id: "caff_sleep",   x: "caffAfter14", y: "sleepMin", lag: 1, xn: "afternoon caffeine", yn: "next-night sleep", xf: v => Math.round(v) + " mg", yf: v => hmShort(v), split: "zero",
    exp: () => "Try 7 days with no caffeine after 14:00 and compare your sleep duration." },
  { id: "caff_sleepq",  x: "caffAfter14", y: "sleepQ", lag: 1, xn: "afternoon caffeine", yn: "next-night sleep quality", xf: v => Math.round(v) + " mg", yf: v => fx(v, 1) + " / 10", split: "zero",
    exp: () => "Move your last dose before 14:00 for a week and keep rating sleep quality." },
  { id: "caff_focus",   x: "caffMg", y: "focusR", lag: 0, xn: "caffeine intake", yn: "focus", xf: v => Math.round(v) + " mg", yf: v => fx(v, 1) + " / 10", split: "median",
    exp: t => "Hold intake near " + Math.round(t) + " mg for a week and see whether focus moves with it." },
  { id: "nap_energy",   x: "napMin", y: "energy", lag: 0, xn: "logged nap time", yn: "energy", xf: v => hm(v), yf: v => fx(v, 1) + " / 10", split: "zero",
    exp: () => "Log a short nap on 4 of the next 7 afternoons and rate energy at the debrief." },
  { id: "move_mood",    x: "moveDone", y: "mood", lag: 0, xn: "movement routines", yn: "mood", xf: v => v >= 1 ? "completed" : "not completed", yf: v => fx(v, 1) + " / 10", split: "zero",
    exp: () => "Complete your movement routine on 5 of the next 7 days and watch mood at the debrief." },
  { id: "habit_day",    x: "habitPct", y: "dayR", lag: 0, xn: "routine completion", yn: "day rating", xf: v => Math.round(v) + "%", yf: v => fx(v, 1) + " / 10", split: "median",
    exp: t => "Aim for " + Math.round(t) + "% routine completion for 7 days and compare day ratings." },
  { id: "bed_energy",   x: "bedDev", y: "energy", lag: 0, xn: "bedtime drift", yn: "energy", xf: v => Math.round(v) + " min", yf: v => fx(v, 1) + " / 10", split: "median",
    exp: t => "Keep bedtime within " + Math.round(t) + " minutes of your usual for a week." },
  { id: "focus_day",    x: "focusSec", y: "dayR", lag: 0, xn: "focus time", yn: "day rating", xf: v => durShort(v), yf: v => fx(v, 1) + " / 10", split: "median",
    exp: t => "Book " + durShort(t) + " of focused work on 5 of the next 7 days." },
  { id: "sleepq_focus", x: "sleepQ", y: "focusR", lag: 0, xn: "sleep quality", yn: "focus", xf: v => fx(v, 1) + " / 10", yf: v => fx(v, 1) + " / 10", split: "median",
    exp: t => "Watch whether focus keeps tracking sleep quality above " + fx(t, 1) + " / 10." }
];

/* derived fields used by a couple of relationships */
function enrich(hist, base) {
  const bedBase = base.bedNorm && base.bedNorm.v;
  const moveIds = activeHabits().filter(h => h.cat === "movement").map(h => h.id);
  hist.forEach(m => {
    m.bedDev = (m.bedNorm != null && bedBase != null) ? Math.abs(m.bedNorm - bedBase) : null;
    if (!moveIds.length) { m.moveDone = null; return; }
    const d = dayRO(m.date);
    m.moveDone = d ? (moveIds.some(id => d.habits && d.habits[id]) ? 1 : 0) : null;
  });
  return hist;
}

const CONF = [
  { i: 0, k: "c0", n: "Insufficient data" },
  { i: 1, k: "c1", n: "Early signal" },
  { i: 2, k: "c2", n: "Moderate signal" },
  { i: 3, k: "c3", n: "Strong pattern" }
];
function confidence(n, r) {
  const a = Math.abs(r);
  if (n < 8 || a < 0.2) return CONF[0];
  if (n >= 21 && a >= 0.45) return CONF[3];
  if (n >= 14 && a >= 0.30) return CONF[2];
  return CONF[1];
}

function testRel(rel, hist) {
  const xs = [], ys = [];
  for (let i = 0; i < hist.length; i++) {
    const a = hist[i], b = hist[i + rel.lag];
    if (!a || !b) continue;
    const xv = a[rel.x], yv = b[rel.y];
    if (xv == null || yv == null || !isFinite(xv) || !isFinite(yv)) continue;
    xs.push(xv); ys.push(yv);
  }
  const n = xs.length;
  const r = pearson(xs, ys);
  if (r == null) return { rel, n, r: null, conf: CONF[0] };
  const conf = confidence(n, r);

  /* split comparison — the readable half of the observation */
  let th = null;
  if (rel.split === "zero") th = 0.0001;
  else { const md = median(xs); th = md; }
  const hiY = [], loY = [], hiX = [], loX = [];
  for (let i = 0; i < n; i++) {
    if (xs[i] >= th) { hiY.push(ys[i]); hiX.push(xs[i]); } else { loY.push(ys[i]); loX.push(xs[i]); }
  }
  const split = (hiY.length >= 4 && loY.length >= 4) ? {
    th, hiN: hiY.length, loN: loY.length,
    hiY: mean(hiY), loY: mean(loY), hiX: mean(hiX), loX: mean(loX),
    diff: mean(hiY) - mean(loY)
  } : null;
  return { rel, n, r, conf, split, xs, ys };
}

function buildInsights() {
  const base = baselines();
  /* oldest -> newest, so hist[i + lag] is the day `lag` days after hist[i] */
  const hist = enrich(dayHistory(120), base);
  const out = [];
  RELS.forEach(rel => {
    const t = testRel(rel, hist);
    if (!t.r || t.conf.i === 0 || !t.split) return;
    const rel_ = t.rel, sp = t.split;
    const pos = t.r > 0;
    let title, obs;
    if (rel_.split === "zero") {
      title = cap(rel_.yn) + " has averaged " + rel_.yf(sp.hiY) + " on days with " + rel_.xn + " logged.";
      obs = "Against " + rel_.yf(sp.loY) + " on days without it — a difference of " +
            fx(Math.abs(sp.diff), 1) + " across " + sp.hiN + " and " + sp.loN + " days.";
    } else {
      const hiFirst = sp.hiY >= sp.loY;
      title = cap(rel_.yn) + " has averaged " + rel_.yf(hiFirst ? sp.hiY : sp.loY) + " when " + rel_.xn +
              " was " + (hiFirst ? "above" : "below") + " " + rel_.xf(sp.th) + ".";
      obs = "Against " + rel_.yf(hiFirst ? sp.loY : sp.hiY) + " " + (hiFirst ? "below" : "above") + " that line. " +
            "Correlation across your history is r = " + (t.r > 0 ? "+" : "−") + fx(Math.abs(t.r), 2) + ".";
    }
    out.push({
      id: rel_.id, title, obs, conf: t.conf, n: t.n, r: t.r,
      evidence: t.n + " comparable day" + (t.n === 1 ? "" : "s") + " in your history.",
      experiment: rel_.exp(sp.th || sp.hiX),
      strength: Math.abs(t.r) * (t.conf.i + 1)
    });
  });
  out.sort((a, b) => b.strength - a.strength);
  return out.filter(i => !(S.core.dismissed || []).includes(i.id));
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ---------- day distribution: only logged minutes are counted ---------- */
function distribution(k) {
  const d = dayRO(k);
  const buckets = {};
  const add = (cat, mins) => { if (mins > 0) buckets[cat] = (buckets[cat] || 0) + mins; };
  if (d) {
    (d.focus || []).forEach(f => add("deep", (f.sec || 0) / 60));
    (d.naps || []).forEach(n => add("recovery", n.minutes || 0));
    (d.events || []).forEach(e => add(e.cat || "other", e.minutes || 0));
  }
  const total = Object.values(buckets).reduce((s, v) => s + v, 0);
  const rows = Object.entries(buckets)
    .map(([cat, mins]) => ({ cat, mins, pct: total ? mins / total * 100 : 0, n: (EVENT_CATS.find(c => c.id === cat) || { n: cat }).n, c: CAT_COLOR[cat] || CAT_COLOR.other }))
    .sort((a, b) => b.mins - a.mins);
  return { total, rows };
}

/* ---------- habit consistency ---------- */
function habitStats(hid, nDays) {
  const keys = keyRange(todayKey(), nDays || 90);
  const h = (S.core.habits || []).find(x => x.id === hid);
  const start = h && h.startedOn ? h.startedOn : null;
  let done = 0, elig = 0, cur = 0, best = 0, run = 0;
  const cells = keys.map(k => {
    const inRange = !start || k >= start;
    const d = dayRO(k);
    const v = !!(d && d.habits && d.habits[hid]);
    if (inRange && k <= todayKey()) { elig++; if (v) done++; }
    return { k, v, inRange };
  });
  cells.forEach(c => { if (!c.inRange) return; if (c.v) { run++; best = Math.max(best, run); } else if (c.k < todayKey()) { run = 0; } });
  for (let i = cells.length - 1; i >= 0; i--) { const c = cells[i]; if (!c.inRange) break; if (c.v) cur++; else if (c.k < todayKey()) break; }
  return { done, elig, completion: elig ? done / elig * 100 : null, current: cur, best, cells };
}

/* ---------- weekly system report ---------- */
function weeklyReport() {
  const base = baselines();
  const hist = dayHistory(7);
  const scored = hist.filter(m => m.score != null);
  if (scored.length < 3) return null;
  const perf = Math.round(mean(scored.map(m => m.score)));
  const cands = VARS.filter(v => v.hb !== 0).map(v => {
    const a = vals(hist, v.id); const b = base[v.id] && base[v.id].v;
    if (!a.length || b == null) return null;
    const d = (mean(a) - b) / Math.abs(b) * 100;
    return { v, d: d * (v.hb > 0 ? 1 : -1), raw: d, n: a.length };
  }).filter(Boolean).sort((a, b) => b.d - a.d);
  const bestDay = scored.slice().sort((a, b) => b.score - a.score)[0];
  const lowDay = scored.slice().sort((a, b) => a.score - b.score)[0];
  const ins = buildInsights();
  return {
    perf, n: scored.length,
    strongest: cands[0] || null,
    degraded: cands.length > 1 ? cands[cands.length - 1] : null,
    bestDay, lowDay,
    signal: ins[0] || null,
    baseScore: base.score.v
  };
}

