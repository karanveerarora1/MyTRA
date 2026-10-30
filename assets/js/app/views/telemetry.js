/* MYTRA // app/views/telemetry.js - Telemetry view (#telemetry). */
"use strict";

let RANGE = 7;
let HEAT_HABIT = "__all";

/* ---------------- TELEMETRY ---------------- */
function renderTelemetry() {
  const root = $("#v-telemetry");
  const ranges = [[7, "7D"], [30, "30D"], [90, "90D"], [365, "1Y"]];
  root.innerHTML = viewHead("Telemetry", "Level 2 // Performance",
    '<div class="rng">' + ranges.map(([n, l]) => '<button data-range="' + n + '" class="' + (RANGE === n ? "on" : "") + '">' + l + "</button>").join("") + "</div>");
  const stack = el("div", "stack");
  root.appendChild(stack);

  const hist = dayHistory(RANGE);
  const base = baselines();
  const logged = hist.filter(m => m.logged > 0).length;

  if (logged < 2) {
    const p = panel("Telemetry // " + RANGE + " days");
    p._bd.appendChild(emptyBlock("No trace yet", "MYTRA needs at least a couple of logged days in this window before it will draw a trend. Nothing here is filled in on your behalf."));
    stack.appendChild(p);
    return;
  }

  const charts = [
    { t: "Performance", s: "Day score", id: "score", color: "#4FD8F5", fmt: v => Math.round(v), yMin: 0, yMax: 100, base: base.score.v },
    { t: "Sleep", s: "Duration", id: "sleepMin", color: "#4F8FF5", fmt: v => hm(v), tickFmt: v => Math.round(v / 60) + "h", base: base.sleepMin.v },
    { t: "Focus time", s: "Minutes logged", id: "focusSec", color: "#4FD8F5", kind: "bar", zeroBase: true, fmt: v => Math.round(v) + "m", conv: v => v == null ? 0 : v / 60 },
    { t: "Energy", s: "Self-reported", id: "energy", color: "#4FD9A6", fmt: v => fx(v, 1), yMin: 0, yMax: 10, base: base.energy.v },
    { t: "Mood", s: "Self-reported", id: "mood", color: "#9B7FE0", fmt: v => fx(v, 1), yMin: 0, yMax: 10, base: base.mood.v },
    { t: "Routine", s: "Completion", id: "habitPct", color: "#4FD8F5", kind: "bar", zeroBase: true, yMax: 100, fmt: v => Math.round(v) + "%" },
    { t: "Caffeine", s: "Daily total", id: "caffMg", color: "#E8A33D", kind: "bar", zeroBase: true, fmt: v => Math.round(v) + "mg", conv: v => v == null ? 0 : v, base: base.caffMg.v }
  ];
  charts.forEach(c => {
    const has = hist.filter(m => m[c.id] != null).length;
    const p = panel(c.t.toUpperCase() + " // " + RANGE + "D", { head: '<span class="lbl lbl-dim">' + esc(c.s) + " · " + has + " readings</span>" });
    const w = el("div"); p._bd.appendChild(w);
    drawChart(w, {
      data: hist.map(m => ({ k: m.date, v: c.conv ? c.conv(m[c.id]) : m[c.id] })),
      color: c.color, kind: c.kind, height: 156, fmt: c.fmt, tickFmt: c.tickFmt,
      yMin: c.yMin, yMax: c.yMax, zeroBase: c.zeroBase,
      baseline: c.base != null ? { v: c.base } : null,
      aria: c.t + " over " + RANGE + " days"
    });
    stack.appendChild(p);
  });

  /* weekly report */
  const rep = weeklyReport();
  const rp = panel("Weekly system report", { flush: true, head: '<span class="lbl lbl-dim">Last 7 days</span>' });
  if (!rep) rp._bd.appendChild(emptyBlock("Report not ready", "MYTRA writes the weekly report once at least three days in the window carry a day score."));
  else {
    const g = el("div", "rep");
    g.innerHTML =
      '<div class="c"><span class="lbl">System performance</span><span class="v n" style="color:var(--accent)">' + rep.perf + '</span><div class="s lbl lbl-dim" style="margin-top:6px">of 100 · ' +
        (rep.baseScore != null ? signedPct((rep.perf - rep.baseScore) / rep.baseScore * 100) + " vs baseline" : "baseline pending") + "</div></div>" +
      '<div class="c"><span class="lbl">Strongest variable</span><span class="v">' + (rep.strongest ? esc(rep.strongest.v.n) : "—") + '</span><div class="s lbl lbl-dim" style="margin-top:6px">' +
        (rep.strongest ? signedPct(rep.strongest.raw) + " vs baseline" : "") + "</div></div>" +
      '<div class="c"><span class="lbl">Degraded variable</span><span class="v">' + (rep.degraded ? esc(rep.degraded.v.n) : "—") + '</span><div class="s lbl lbl-dim" style="margin-top:6px">' +
        (rep.degraded ? signedPct(rep.degraded.raw) + " vs baseline" : "") + "</div></div>" +
      '<div class="c"><span class="lbl">Best day</span><span class="v">' + esc(DOW[parseKey(rep.bestDay.date).getDay()]) + '</span><div class="s lbl lbl-dim" style="margin-top:6px">score ' + rep.bestDay.score + "</div></div>" +
      '<div class="c"><span class="lbl">Lowest day</span><span class="v">' + esc(DOW[parseKey(rep.lowDay.date).getDay()]) + '</span><div class="s lbl lbl-dim" style="margin-top:6px">score ' + rep.lowDay.score + "</div></div>";
    rp._bd.appendChild(g);
    const sig = el("div"); sig.style.cssText = "padding:16px;border-top:1px solid var(--line)";
    sig.innerHTML = '<span class="lbl">Most interesting signal</span>' +
      (rep.signal ? '<p style="margin:9px 0 0;font-size:13.5px;line-height:1.6;color:var(--text)">' + esc(rep.signal.title) + '</p><p class="hint" style="margin-top:6px">' + esc(rep.signal.evidence) + "</p>"
        : '<p class="hint" style="margin:9px 0 0">No relationship in your data yet clears MYTRA\'s minimum sample size.</p>');
    rp._bd.appendChild(sig);
  }
  stack.appendChild(rp);

  /* aggregate distribution */
  const agg = {};
  let aggTotal = 0;
  keyRange(todayKey(), RANGE).forEach(k => {
    const d = distribution(k);
    d.rows.forEach(r => { agg[r.cat] = (agg[r.cat] || 0) + r.mins; aggTotal += r.mins; });
  });
  const arows = Object.entries(agg).map(([cat, mins]) => ({
    cat, mins, pct: aggTotal ? mins / aggTotal * 100 : 0,
    n: (EVENT_CATS.find(c => c.id === cat) || { n: cat }).n, c: CAT_COLOR[cat] || CAT_COLOR.other
  })).sort((a, b) => b.mins - a.mins);
  const dp = panel("Day distribution // " + RANGE + "D", { head: '<span class="lbl lbl-dim">' + Math.round(aggTotal) + " min logged</span>" });
  if (aggTotal < 60) dp._bd.appendChild(emptyBlock("Not enough logged time", "This is built only from durations you recorded. Log focus sessions and events and the shape of your days will appear here."));
  else {
    const holder = el("div"); holder.style.cssText = "display:flex;gap:26px;align-items:center;flex-wrap:wrap";
    const dn = el("div"); holder.appendChild(dn);
    const lg = el("div", "legend"); lg.style.cssText = "flex-direction:column;gap:9px;margin:0;flex:1;min-width:190px";
    arows.forEach(r => lg.insertAdjacentHTML("beforeend",
      '<span class="i"><b style="background:' + r.c + '"></b>' + esc(r.n) + '<div style="flex:1"></div><span>' + Math.round(r.pct) + "% · " + hmShort(r.mins) + "</span></span>"));
    holder.appendChild(lg);
    dp._bd.appendChild(holder);
    drawDonut(dn, arows, aggTotal, hmShort(aggTotal).split(" ")[0] + "h", "LOGGED");
  }
  stack.appendChild(dp);

  /* heatmap */
  const hs = activeHabits();
  const hp = panel("Routine heatmap // 26 weeks", {
    head: '<select class="in" id="hm-sel" style="width:auto;padding:5px 26px 5px 9px;font-size:11px"><option value="__all">All routines</option>' +
      hs.map(h => '<option value="' + h.id + '"' + (HEAT_HABIT === h.id ? " selected" : "") + ">" + esc(h.name) + "</option>").join("") + "</select>"
  });
  if (!hs.length) hp._bd.appendChild(emptyBlock("No active routines", "Configure your first routine to begin tracking."));
  else {
    const st = habitStats(HEAT_HABIT === "__all" ? (hs[0] || {}).id : HEAT_HABIT, 182);
    const box = el("div");
    const hw = el("div", "hm");
    box.appendChild(hw);
    if (HEAT_HABIT !== "__all") {
      const s2 = habitStats(HEAT_HABIT, 182);
      box.insertAdjacentHTML("afterbegin",
        '<div class="bigrow" style="border:1px solid var(--line);margin-bottom:16px">' +
        '<div class="c"><span class="lbl">Current run</span><span class="v">' + s2.current + '</span><div class="s">days</div></div>' +
        '<div class="c"><span class="lbl">Best run</span><span class="v">' + s2.best + '</span><div class="s">days</div></div>' +
        '<div class="c"><span class="lbl">Completion</span><span class="v">' + (s2.completion != null ? Math.round(s2.completion) + "%" : "—") + '</span><div class="s">' + s2.done + " of " + s2.elig + " days</div></div>" +
        "</div>");
    }
    hp._bd.appendChild(box);
    drawHeatmap(hw, HEAT_HABIT);
    hp._bd.insertAdjacentHTML("beforeend",
      '<p class="hint" style="margin-top:12px">Consistency matters more than an unbroken run. A gap is information, not a failure — the heatmap keeps it visible without scoring it.</p>');
    on($("#hm-sel", hp), "change", e => { HEAT_HABIT = e.target.value; render(); });
  }
  stack.appendChild(hp);
}

