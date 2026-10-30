/* MYTRA // ui/charts.js - hand-drawn SVG charts, timeline, heatmap, calendar. */
"use strict";

/* ============================================================
   CHARTS — hand-drawn SVG, no library. One scale places every
   mark, tick and label, and the viewBox leaves room for the
   outermost labels.
   ============================================================ */
const SVGNS = "http://www.w3.org/2000/svg";
function sv(tag, attrs) { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; }
const CHARTS = [];

function niceMax(v) {
  if (!isFinite(v) || v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const s = v / mag;
  return (s <= 1 ? 1 : s <= 2 ? 2 : s <= 2.5 ? 2.5 : s <= 5 ? 5 : 10) * mag;
}

/**
 * cfg: { data:[{k,v}], color, height, kind:'line'|'bar', fmt(v), yMin, yMax,
 *        baseline:{v,label}, unitLabel, zeroBase }
 */
function drawChart(wrap, cfg) {
  wrap.innerHTML = "";
  wrap.classList.add("chwrap");
  const data = cfg.data || [];
  const present = data.filter(d => d.v != null && isFinite(d.v));
  const H = cfg.height || 150;
  const W = Math.max(240, wrap.clientWidth || 560);

  if (present.length < 2) {
    wrap.appendChild(emptyBlock("No trace yet", "MYTRA plots this once there are at least two readings in the selected window. Keep logging."));
    return;
  }
  const pl = 44, pr = 12, pt = 14, pb = 22;
  const iw = W - pl - pr, ih = H - pt - pb;

  let lo = cfg.yMin != null ? cfg.yMin : Math.min.apply(null, present.map(d => d.v));
  let hi = cfg.yMax != null ? cfg.yMax : Math.max.apply(null, present.map(d => d.v));
  if (cfg.baseline && cfg.baseline.v != null) { lo = Math.min(lo, cfg.baseline.v); hi = Math.max(hi, cfg.baseline.v); }
  if (cfg.zeroBase) lo = 0;
  if (hi === lo) { hi = lo + 1; }
  const padY = (hi - lo) * 0.12; lo -= padY; hi += padY;
  if (cfg.zeroBase) lo = 0;
  if (cfg.hardMin != null) lo = Math.max(lo, cfg.hardMin);

  const n = data.length;
  const xOf = i => cfg.kind === "bar" ? pl + (i + .5) * (iw / n) : pl + (n === 1 ? iw / 2 : i * iw / (n - 1));
  const yOf = v => pt + ih - (v - lo) / (hi - lo) * ih;
  const color = cfg.color || "#4FD8F5";
  const gid = "g" + uid();

  const svg = sv("svg", { class: "ch", viewBox: "0 0 " + W + " " + H, height: H, role: "img", "aria-label": cfg.aria || "trend chart" });
  const defs = sv("defs");
  const lg = sv("linearGradient", { id: gid, x1: "0", y1: "0", x2: "0", y2: "1" });
  lg.appendChild(sv("stop", { offset: "0", "stop-color": color, "stop-opacity": ".26" }));
  lg.appendChild(sv("stop", { offset: "1", "stop-color": color, "stop-opacity": "0" }));
  defs.appendChild(lg); svg.appendChild(defs);

  /* horizontal grid + y labels — every label names a value the scale reaches */
  const ticks = 4;
  for (let t = 0; t <= ticks; t++) {
    const v = lo + (hi - lo) * t / ticks, y = yOf(v);
    svg.appendChild(sv("line", { x1: pl, y1: y, x2: W - pr, y2: y, stroke: "#141B21", "stroke-width": 1 }));
    const tx = sv("text", { x: pl - 7, y: y + 3.2, "text-anchor": "end", fill: "#4B5A62", "font-family": "IBM Plex Mono, monospace", "font-size": 9 });
    tx.textContent = (cfg.tickFmt || cfg.fmt || (x => fx(x, 0)))(v);
    svg.appendChild(tx);
  }
  /* axis */
  svg.appendChild(sv("line", { x1: pl, y1: pt, x2: pl, y2: pt + ih, stroke: "#1A2228", "stroke-width": 1 }));

  /* x labels */
  const xi = n <= 8 ? data.map((_, i) => i) : [0, Math.floor((n - 1) / 3), Math.floor(2 * (n - 1) / 3), n - 1];
  Array.from(new Set(xi)).forEach(i => {
    const tx = sv("text", { x: clamp(xOf(i), pl + 12, W - pr - 12), y: H - 6, "text-anchor": "middle", fill: "#3E4C55", "font-family": "IBM Plex Mono, monospace", "font-size": 8.5 });
    tx.textContent = n <= 8 ? DOW[parseKey(data[i].k).getDay()].slice(0, 2) : fmtDateShort(data[i].k);
    svg.appendChild(tx);
  });

  /* baseline overlay */
  if (cfg.baseline && cfg.baseline.v != null) {
    const y = yOf(cfg.baseline.v);
    svg.appendChild(sv("line", { x1: pl, y1: y, x2: W - pr, y2: y, stroke: "#7A8A93", "stroke-width": 1, "stroke-dasharray": "3 4", opacity: ".7" }));
    const tx = sv("text", { x: W - pr, y: y - 5, "text-anchor": "end", fill: "#7A8A93", "font-family": "IBM Plex Mono, monospace", "font-size": 8.5, "letter-spacing": ".1em" });
    tx.textContent = "BASELINE";
    svg.appendChild(tx);
  }

  if (cfg.kind === "bar") {
    const bw = Math.max(2, iw / n * .58);
    data.forEach((d, i) => {
      if (d.v == null) return;
      const y = yOf(d.v), y0 = yOf(Math.max(lo, 0));
      const h = Math.max(1, y0 - y);
      svg.appendChild(sv("rect", { x: xOf(i) - bw / 2, y: y, width: bw, height: h, fill: color, "fill-opacity": ".30" }));
      svg.appendChild(sv("rect", { x: xOf(i) - bw / 2, y: y, width: bw, height: 1.4, fill: color }));
    });
  } else {
    /* break the trace across gaps rather than interpolating through them */
    let seg = [];
    const segs = [];
    data.forEach((d, i) => { if (d.v == null) { if (seg.length) segs.push(seg); seg = []; } else seg.push([xOf(i), yOf(d.v)]); });
    if (seg.length) segs.push(seg);
    segs.forEach(sg => {
      if (sg.length > 1) {
        const dstr = "M" + sg.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L");
        const area = dstr + "L" + sg[sg.length - 1][0].toFixed(1) + "," + (pt + ih) + "L" + sg[0][0].toFixed(1) + "," + (pt + ih) + "Z";
        svg.appendChild(sv("path", { d: area, fill: "url(#" + gid + ")" }));
        const p = sv("path", { d: dstr, fill: "none", stroke: color, "stroke-width": 1.4, "stroke-linejoin": "round", "stroke-linecap": "round", class: "draw" });
        const L = sg.reduce((s, c, i2) => i2 ? s + Math.hypot(c[0] - sg[i2 - 1][0], c[1] - sg[i2 - 1][1]) : 0, 0);
        p.style.setProperty("--len", Math.ceil(L));
        svg.appendChild(p);
      } else {
        svg.appendChild(sv("circle", { cx: sg[0][0], cy: sg[0][1], r: 2, fill: color }));
      }
    });
    const last = present[present.length - 1];
    const li = data.findIndex(d => d.k === last.k);
    svg.appendChild(sv("circle", { cx: xOf(li), cy: yOf(last.v), r: 3.4, fill: "#07090B", stroke: color, "stroke-width": 1.4 }));
    svg.appendChild(sv("circle", { cx: xOf(li), cy: yOf(last.v), r: 6.5, fill: "none", stroke: color, "stroke-width": 1, opacity: ".28" }));
  }

  /* hover inspection */
  const guide = sv("line", { x1: 0, y1: pt, x2: 0, y2: pt + ih, stroke: color, "stroke-width": 1, opacity: "0" });
  const dot = sv("circle", { r: 3, fill: color, opacity: "0" });
  svg.appendChild(guide); svg.appendChild(dot);
  const hit = sv("rect", { x: pl, y: 0, width: iw, height: H, fill: "transparent", style: "cursor:crosshair" });
  svg.appendChild(hit);
  wrap.appendChild(svg);

  const tip = el("div", "chtip");
  wrap.appendChild(tip);
  const move = e => {
    const r = svg.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const sx = px / r.width * W;
    let bi = -1, bd = 1e9;
    data.forEach((d, i) => { if (d.v == null) return; const dd = Math.abs(xOf(i) - sx); if (dd < bd) { bd = dd; bi = i; } });
    if (bi < 0) return;
    const d = data[bi], X = xOf(bi), Y = yOf(d.v);
    guide.setAttribute("x1", X); guide.setAttribute("x2", X); guide.setAttribute("opacity", ".4");
    dot.setAttribute("cx", X); dot.setAttribute("cy", Y); dot.setAttribute("opacity", "1");
    tip.innerHTML = '<div style="color:#7A8A93;letter-spacing:.12em">' + esc(fmtDateShort(d.k)) + "</div><b>" + esc((cfg.fmt || (v => fx(v, 1)))(d.v)) + (cfg.unitLabel ? " " + esc(cfg.unitLabel) : "") + "</b>";
    tip.style.left = (X / W * 100) + "%";
    tip.style.top = (Y / H * r.height) + "px";
    tip.classList.add("show");
  };
  const leave = () => { tip.classList.remove("show"); guide.setAttribute("opacity", "0"); dot.setAttribute("opacity", "0"); };
  on(hit, "mousemove", move); on(hit, "mouseleave", leave);
  on(hit, "touchstart", move); on(hit, "touchmove", move); on(hit, "touchend", leave);

  CHARTS.push({ wrap: wrap, cfg: cfg });
}

function sparkline(node, data, color) {
  node.innerHTML = "";
  const present = data.filter(v => v != null && isFinite(v));
  if (present.length < 2) return;
  const W = 100, H = 22;
  let lo = Math.min.apply(null, present), hi = Math.max.apply(null, present);
  if (hi === lo) { hi = lo + 1; lo -= 1; }
  const n = data.length;
  const svg = sv("svg", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none", class: "spark", "aria-hidden": "true" });
  let seg = [], segs = [];
  data.forEach((v, i) => {
    if (v == null) { if (seg.length) segs.push(seg); seg = []; return; }
    seg.push([(n === 1 ? W / 2 : i * W / (n - 1)), H - 2 - (v - lo) / (hi - lo) * (H - 4)]);
  });
  if (seg.length) segs.push(seg);
  segs.forEach(sg => {
    if (sg.length < 2) return;
    svg.appendChild(sv("path", { d: "M" + sg.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L"), fill: "none", stroke: color || "#4FD8F5", "stroke-width": 1, opacity: ".75", "vector-effect": "non-scaling-stroke" }));
  });
  const li = data.map((v, i) => v != null ? i : -1).filter(i => i >= 0).pop();
  if (li != null) svg.appendChild(sv("circle", { cx: (n === 1 ? W / 2 : li * W / (n - 1)), cy: H - 2 - (data[li] - lo) / (hi - lo) * (H - 4), r: 1.6, fill: color || "#4FD8F5" }));
  node.appendChild(svg);
}

/* ---------- donut ---------- */
function polar(cx, cy, r, a) { const rad = (a - 90) * Math.PI / 180; return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]; }
function arcPath(cx, cy, ro, ri, a0, a1) {
  const [x0, y0] = polar(cx, cy, ro, a0), [x1, y1] = polar(cx, cy, ro, a1);
  const [x2, y2] = polar(cx, cy, ri, a1), [x3, y3] = polar(cx, cy, ri, a0);
  const big = (a1 - a0) > 180 ? 1 : 0;
  return "M" + x0 + "," + y0 + "A" + ro + "," + ro + " 0 " + big + " 1 " + x1 + "," + y1 +
         "L" + x2 + "," + y2 + "A" + ri + "," + ri + " 0 " + big + " 0 " + x3 + "," + y3 + "Z";
}
function drawDonut(wrap, rows, total, centerLabel, centerSub) {
  wrap.innerHTML = "";
  const S1 = 180, c = S1 / 2, ro = 78, ri = 52;
  const svg = sv("svg", { viewBox: "0 0 " + S1 + " " + S1, width: S1, height: S1, style: "max-width:100%", role: "img", "aria-label": "day distribution" });
  svg.appendChild(sv("circle", { cx: c, cy: c, r: (ro + ri) / 2, fill: "none", stroke: "#111820", "stroke-width": ro - ri }));
  let a = 0;
  rows.forEach(r => {
    const sweep = r.pct / 100 * 360;
    if (sweep <= 0.4) { a += sweep; return; }
    svg.appendChild(sv("path", { d: arcPath(c, c, ro, ri, a + .8, a + sweep - .8), fill: r.c, "fill-opacity": ".82" }));
    a += sweep;
  });
  const t1 = sv("text", { x: c, y: c - 2, "text-anchor": "middle", fill: "#E6EDF1", "font-family": "IBM Plex Mono, monospace", "font-size": 19 });
  t1.textContent = centerLabel; svg.appendChild(t1);
  const t2 = sv("text", { x: c, y: c + 14, "text-anchor": "middle", fill: "#4B5A62", "font-family": "IBM Plex Mono, monospace", "font-size": 8.5, "letter-spacing": ".14em" });
  t2.textContent = centerSub; svg.appendChild(t2);
  wrap.appendChild(svg);
}

/* ---------- focus ring ---------- */
function drawRing(node, frac, label, sub, running) {
  node.innerHTML = "";
  const S1 = 210, c = S1 / 2, r = 92;
  const svg = sv("svg", { class: "ring", viewBox: "0 0 " + S1 + " " + S1, "aria-hidden": "true" });
  for (let i = 0; i < 60; i++) {
    const a = i * 6, len = i % 5 === 0 ? 8 : 4;
    const [x1, y1] = polar(c, c, r + 12, a), [x2, y2] = polar(c, c, r + 12 - len, a);
    svg.appendChild(sv("line", { x1, y1, x2, y2, stroke: i % 5 === 0 ? "#26343D" : "#171F25", "stroke-width": 1 }));
  }
  svg.appendChild(sv("circle", { cx: c, cy: c, r: r, fill: "none", stroke: "#141B21", "stroke-width": 3 }));
  const C = 2 * Math.PI * r;
  svg.appendChild(sv("circle", {
    cx: c, cy: c, r: r, fill: "none", stroke: running ? "#4FD8F5" : "#7A8A93", "stroke-width": 3, "stroke-linecap": "butt",
    "stroke-dasharray": C, "stroke-dashoffset": C * (1 - clamp(frac, 0, 1)),
    transform: "rotate(-90 " + c + " " + c + ")", style: "transition:stroke-dashoffset .3s linear"
  }));
  if (frac > 0 && frac < 1) {
    const [hx, hy] = polar(c, c, r, frac * 360);
    svg.appendChild(sv("circle", { cx: hx, cy: hy, r: 4, fill: running ? "#4FD8F5" : "#7A8A93" }));
  }
  node.appendChild(svg);
}

/* ---------- 24h timeline ---------- */
const LANES = [
  { id: "sleep", n: "Sleep" }, { id: "focus", n: "Focus" }, { id: "caffeine", n: "Caffeine" },
  { id: "naps", n: "Recovery" }, { id: "events", n: "Events" }, { id: "habits", n: "Routine" }
];
function drawTimeline(wrap, k) {
  wrap.innerHTML = "";
  const d = dayRO(k);
  const isToday = k === todayKey();
  const box = el("div", "tl");
  const laneH = 24;
  LANES.forEach((L, i) => {
    const lane = el("div", "tl-lane");
    lane.style.top = (i * laneH) + "px";
    lane.appendChild(el("span", "lname", esc(L.n)));
    const tr = el("div", "tl-track");
    lane.appendChild(tr);
    box.appendChild(lane);

    const put = (startMin, endMin, color, title) => {
      const a = clamp(startMin, 0, 1440), b = clamp(endMin, 0, 1440);
      if (b <= a) return;
      const blk = el("div", "tl-blk");
      blk.style.left = (a / 1440 * 100) + "%";
      blk.style.width = Math.max(0.4, (b - a) / 1440 * 100) + "%";
      blk.style.background = color + "38";
      blk.style.borderColor = color;
      blk.title = title;
      tr.appendChild(blk);
    };
    const dot = (m, color, title) => {
      const p = el("div", "tl-pt");
      p.style.left = (clamp(m, 0, 1440) / 1440 * 100) + "%";
      p.style.background = color + "55"; p.style.borderColor = color;
      p.title = title;
      tr.appendChild(p);
    };
    if (!d) return;
    if (L.id === "sleep" && d.sleep && d.sleep.wake) {
      const w = toMin(d.sleep.wake), b = toMin(d.sleep.bedtime);
      if (w != null) put(0, w, "#4F8FF5", "Asleep until " + d.sleep.wake);
      if (b != null && b > 720) put(b, 1440, "#4F8FF5", "Bedtime " + d.sleep.bedtime);
    }
    if (L.id === "focus") (d.focus || []).forEach(f => { const s = toMin(f.start); if (s != null) put(s, s + (f.sec || 0) / 60, "#4FD8F5", (f.task || "Focus session") + " · " + durShort(f.sec)); });
    if (L.id === "caffeine") (d.caffeine || []).forEach(c => { const s = toMin(c.t); if (s != null) dot(s, "#E8A33D", c.label + " · " + c.mg + "mg at " + c.t); });
    if (L.id === "naps") (d.naps || []).forEach(nn => { const s = toMin(nn.start); if (s != null) put(s, s + (nn.minutes || 0), "#4FD9A6", "Nap · " + nn.minutes + "m"); });
    if (L.id === "events") (d.events || []).forEach(e => { const s = toMin(e.start); if (s != null) put(s, s + (e.minutes || 0), CAT_COLOR[e.cat] || "#7A8A93", e.label + " · " + e.minutes + "m"); });
    if (L.id === "habits") {
      const hs = activeHabits();
      hs.forEach(h => { const t = d.habits && d.habits[h.id]; if (t && typeof t === "string") { const s = toMin(t); if (s != null) dot(s, "#9B7FE0", h.name + " at " + t); } });
    }
  });
  const ax = el("div", "tl-ax");
  for (let h = 0; h <= 24; h += 3) {
    const t = el("i"); t.style.left = (h / 24 * 100) + "%"; ax.appendChild(t);
    const s = el("span", null, p2(h) + ":00"); s.style.left = (h / 24 * 100) + "%"; ax.appendChild(s);
  }
  box.appendChild(ax);
  if (isToday) {
    const nw = el("div", "tl-now");
    nw.style.left = "calc(var(--tlpad) + " + (nowMin() / 1440) + " * (100% - var(--tlpad)))";
    box.appendChild(nw);
  }
  box.style.height = (LANES.length * laneH + 22) + "px";
  wrap.appendChild(box);
}

/* ---------- heatmap ---------- */
function drawHeatmap(wrap, hid) {
  wrap.innerHTML = "";
  const weeks = 26, tot = weeks * 7;
  const today = new Date();
  const endOfWeek = new Date(today); endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
  const start = new Date(endOfWeek); start.setDate(endOfWeek.getDate() - tot + 1);
  const hs = activeHabits();
  const days = el("div", "hmdays");
  ["S", "", "T", "", "T", "", "S"].forEach(t => days.appendChild(el("span", null, t)));
  wrap.appendChild(days);
  const tk = todayKey();
  for (let w = 0; w < weeks; w++) {
    const col = el("div", "wk");
    for (let dd = 0; dd < 7; dd++) {
      const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + dd);
      const k = dkey(dt);
      const cell = el("div", "d");
      if (k > tk) { cell.className = "d fut"; col.appendChild(cell); continue; }
      const dobj = dayRO(k);
      let lvl = 0, txt = "";
      if (hid === "__all") {
        const rel = hs.filter(h => !h.startedOn || h.startedOn <= k);
        const done = rel.filter(h => dobj && dobj.habits && dobj.habits[h.id]).length;
        const p = rel.length ? done / rel.length : 0;
        lvl = p === 0 ? 0 : p < .35 ? 1 : p < .7 ? 2 : p < 1 ? 3 : 4;
        txt = fmtDateShort(k) + " · " + done + "/" + rel.length + " routines";
      } else {
        const v = !!(dobj && dobj.habits && dobj.habits[hid]);
        lvl = v ? 4 : 0;
        txt = fmtDateShort(k) + " · " + (v ? "completed" : "not logged");
      }
      cell.dataset.l = lvl;
      cell.title = txt;
      cell.dataset.k = k;
      cell.setAttribute("role", "button");
      cell.tabIndex = -1;
      col.appendChild(cell);
    }
    wrap.appendChild(col);
  }
  on(wrap, "click", e => { const c = e.target.closest("[data-k]"); if (c) openDayRecord(c.dataset.k); });
}

/* ---------- calendar ---------- */
let calCursor = null;
function drawCalendar(wrap) {
  wrap.innerHTML = "";
  const cur = calCursor || new Date();
  const y = cur.getFullYear(), mo = cur.getMonth();
  const first = new Date(y, mo, 1), last = new Date(y, mo + 1, 0);
  const grid = el("div", "cal");
  ["S", "M", "T", "W", "T", "F", "S"].forEach(d => grid.appendChild(el("div", "dow", d)));
  for (let i = 0; i < first.getDay(); i++) grid.appendChild(el("div", "cd pad"));
  const tk = todayKey();
  for (let dnum = 1; dnum <= last.getDate(); dnum++) {
    const k = y + "-" + p2(mo + 1) + "-" + p2(dnum);
    const m = metrics(k);
    const c = el("div", "cd");
    const g = m.score == null ? 0 : m.score >= 80 ? 4 : m.score >= 65 ? 3 : m.score >= 50 ? 2 : 1;
    c.className = "cd g" + g + (k === tk ? " today" : "");
    c.dataset.k = k;
    c.setAttribute("role", "button");
    c.tabIndex = 0;
    c.innerHTML = '<span class="n">' + p2(dnum) + '</span><span class="sc">' + (m.score != null ? m.score : "") + '</span><span class="bd"></span>';
    c.title = fmtDate(k) + (m.score != null ? " · day score " + m.score : " · no record");
    grid.appendChild(c);
  }
  const hd = el("div", null, "");
  hd.style.cssText = "display:flex;align-items:center;gap:12px;margin-bottom:12px";
  hd.innerHTML = '<button class="btn btn-q btn-sm" data-cal="-1">‹</button>' +
    '<span class="lbl" style="letter-spacing:.2em;color:var(--text)">' + MONTHS[mo] + " " + y + '</span>' +
    '<button class="btn btn-q btn-sm" data-cal="1">›</button><div style="flex:1"></div>' +
    '<span class="lbl lbl-dim">Colour = day score band</span>';
  wrap.appendChild(hd);
  wrap.appendChild(grid);
  on(hd, "click", e => {
    const b = e.target.closest("[data-cal]"); if (!b) return;
    calCursor = new Date(y, mo + Number(b.dataset.cal), 1);
    loadMonth(calCursor.getFullYear() + "-" + p2(calCursor.getMonth() + 1)).then(() => drawCalendar(wrap));
  });
  on(grid, "click", e => { const c = e.target.closest("[data-k]"); if (c) openDayRecord(c.dataset.k); });
  on(grid, "keydown", e => { if (e.key === "Enter" || e.key === " ") { const c = e.target.closest("[data-k]"); if (c) { e.preventDefault(); openDayRecord(c.dataset.k); } } });
}


let rsT = null;
on(window, "resize", () => {
  clearTimeout(rsT);
  rsT = setTimeout(() => {
    const live = CHARTS.splice(0).filter(c => document.body.contains(c.wrap));
    live.forEach(c => { try { drawChart(c.wrap, c.cfg); } catch (e) {} });
  }, 260);
});

