/* MYTRA // app/views/focus.js - Focus engine view (#focus). */
"use strict";

/* ---------------- FOCUS ---------------- */
function renderFocus() {
  const root = $("#v-focus");
  root.innerHTML = viewHead("Focus // Engine", "Level 1 // Work time");
  const stack = el("div", "stack");
  root.appendChild(stack);

  const eng = el("div", "fe pnl bez");
  eng.style.border = "1px solid var(--line)";
  const dial = el("div", "dial");
  dial.innerHTML =
    '<div id="fe-ring"></div>' +
    '<div id="fe-rd" class="rd">00:00:00</div>' +
    '<div id="fe-ph" class="ph">Standby</div>' +
    '<div id="fe-task" class="task"></div>' +
    '<div id="fe-btns" style="display:flex;gap:9px;flex-wrap:wrap;justify-content:center"></div>';
  const side = el("div", "side");
  side.innerHTML =
    '<div class="fld"><span class="lbl">Mode</span><div class="modes" id="fe-modes">' +
    Object.entries(FMODES).map(([id, m]) =>
      '<button data-mode="' + id + '" class="' + (FE.mode === id ? "sel" : "") + '"><span class="mn">' + esc(m.n) + '</span><span class="ms">' + esc(m.s) + "</span></button>").join("") +
    "</div></div>" +
    field("Working on", '<input class="in" id="fe-taskin" type="text" maxlength="80" placeholder="Optional" value="' + esc(FE.task || "") + '">') +
    '<div class="fld"><span class="lbl">Cycle</span><div class="pomo" id="fe-pomo"></div></div>' +
    '<label style="display:flex;align-items:center;gap:9px;cursor:pointer"><input type="checkbox" id="fe-chime"' + (S.core.settings.chime ? " checked" : "") + '><span class="lbl" style="letter-spacing:.1em">Chime at phase end</span></label>' +
    '<p class="hint" style="margin:0">Work phases hand over to a break automatically, and breaks hand back to work. Everything asked after a session is optional — the duration is already recorded.</p>';
  eng.appendChild(dial); eng.appendChild(side);
  stack.appendChild(eng);
  dialCache = "";
  renderFocusDial();
  on($("#fe-modes", eng), "click", e => {
    const b = e.target.closest("[data-mode]"); if (!b) return;
    if (FE.phase !== "idle") { toast("End the running session first", "warn"); return; }
    FE.mode = b.dataset.mode; FE.cycle = 0; feSave(); render();
  });
  on($("#fe-chime", eng), "change", e => { S.core.settings.chime = e.target.checked; saveCore(); if (e.target.checked) chime(1); });

  /* telemetry */
  const k = todayKey();
  const h7 = dayHistory(7), h30 = dayHistory(30);
  const todaySec = metrics(k).focusSec || 0;
  const weekSec = h7.reduce((s, m) => s + (m.focusSec || 0), 0);
  const allS = [];
  h30.forEach(m => { const d = dayRO(m.date); (d && d.focus || []).forEach(f => allS.push(f)); });
  const avg = allS.length ? mean(allS.map(f => f.sec)) : null;
  const fw = bestFocusWindow(30);
  const tp = panel("Focus // Telemetry", { flush: true, head: '<span class="lbl lbl-dim">Rolling 30 days</span>' });
  const bg = el("div", "bigrow");
  bg.innerHTML =
    '<div class="c"><span class="lbl">Today</span><span class="v" style="color:var(--accent)">' + dur(todaySec) + '</span><div class="s">focused time</div></div>' +
    '<div class="c"><span class="lbl">Last 7 days</span><span class="v">' + dur(weekSec) + '</span><div class="s">' + h7.reduce((s, m) => s + m.focusCount, 0) + ' sessions</div></div>' +
    '<div class="c"><span class="lbl">Best window</span><span class="v" style="font-size:16px">' + (fw ? esc(fw.label) : "—") + '</span><div class="s">' + (fw ? "densest two hours" : "needs 2h of sessions") + '</div></div>' +
    '<div class="c"><span class="lbl">Average session</span><span class="v">' + (avg ? durShort(avg) : "—") + '</span><div class="s">' + allS.length + ' sessions in 30d</div></div>';
  tp._bd.appendChild(bg);
  stack.appendChild(tp);

  const cp = panel("Focus time // 14 days", { head: '<span class="lbl lbl-dim">Minutes per day</span>' });
  const cw = el("div"); cp._bd.appendChild(cw);
  const h14 = dayHistory(14);
  drawChart(cw, {
    data: h14.map(m => ({ k: m.date, v: m.focusSec ? m.focusSec / 60 : 0 })),
    kind: "bar", zeroBase: true, height: 158, color: "#4FD8F5",
    fmt: v => Math.round(v) + "m", aria: "focus minutes per day over 14 days"
  });
  stack.appendChild(cp);

  const hrs = panel("Hour distribution // 30 days", { head: '<span class="lbl lbl-dim">Where your focus actually lands</span>' });
  const hw = el("div"); hrs._bd.appendChild(hw);
  const buckets = new Array(24).fill(0);
  h30.forEach(m => {
    const d = dayRO(m.date);
    (d && d.focus || []).forEach(f => {
      const s = toMin(f.start); if (s == null) return;
      let rem = f.sec / 60, h = Math.floor(s / 60), off = s % 60;
      while (rem > 0 && h < 24) { const t = Math.min(rem, 60 - off); buckets[h] += t; rem -= t; off = 0; h++; }
    });
  });
  if (buckets.reduce((a, b) => a + b, 0) < 30) {
    hrs._bd.appendChild(emptyBlock("No focus pattern yet", "Run a handful of sessions and MYTRA will show which hours of the day your focused work actually falls into."));
  } else {
    const bars = el("div");
    bars.style.cssText = "display:flex;gap:2px;align-items:flex-end;height:110px";
    const mx = Math.max.apply(null, buckets) || 1;
    buckets.forEach((v, h) => {
      const c = el("div");
      c.style.cssText = "flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px;height:100%";
      c.innerHTML = '<div title="' + p2(h) + ':00 · ' + Math.round(v) + 'm" style="width:100%;height:' + (v / mx * 84) + 'px;min-height:' + (v > 0 ? 2 : 0) + 'px;background:' +
        (v > 0 ? "rgba(79,216,245,.34)" : "transparent") + ';border-top:' + (v > 0 ? "1.4px solid var(--accent)" : "0") + '"></div>' +
        '<span class="mono" style="font-size:7.5px;color:var(--dimmest)">' + (h % 3 === 0 ? p2(h) : "") + "</span>";
      bars.appendChild(c);
    });
    hrs._bd.appendChild(bars);
  }
  stack.appendChild(hrs);

  const sl = panel("Session log // 7 days", { flush: true });
  const rows = [];
  h7.slice().reverse().forEach(m => {
    const d = dayRO(m.date);
    (d && d.focus || []).slice().reverse().forEach(f => rows.push({ k: m.date, f }));
  });
  if (!rows.length) sl._bd.appendChild(emptyBlock("No sessions recorded", "Initiate a session above. MYTRA records the duration whether or not you fill anything else in."));
  else {
    const g = el("div", "dg");
    rows.slice(0, 24).forEach(r => g.insertAdjacentHTML("beforeend",
      '<div class="r"><span class="lbl lbl-dim" style="width:52px;flex:none">' + esc(fmtDateShort(r.k)) + "</span>" +
      '<span class="k" style="text-transform:none;letter-spacing:0;font-family:var(--sans);font-size:12.5px;color:var(--text)">' + esc(r.f.task || "Unlabelled session") + "</span>" +
      '<span class="lbl lbl-dim">' + (r.f.distractions != null ? r.f.distractions + " dist" : "") + "</span>" +
      '<span class="lbl lbl-dim">' + (r.f.rating ? r.f.rating + "/10" : "") + "</span>" +
      '<span class="v">' + esc(durShort(r.f.sec)) + "</span></div>"));
    sl._bd.appendChild(g);
  }
  stack.appendChild(sl);
}
