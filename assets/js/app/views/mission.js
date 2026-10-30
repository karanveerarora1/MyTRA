/* MYTRA // app/views/mission.js - Mission control view (#mission). */
"use strict";

/* ---------------- MISSION CONTROL ---------------- */
function renderMission() {
  const root = $("#v-mission");
  root.innerHTML = viewHead("Mission control", "Level 1 // Now");
  const k = todayKey();
  const m = metrics(k), base = baselines();
  const h7 = dayHistory(7);

  const grid = el("div", "mc");
  const left = el("div", "stack");
  const right = el("div", "stack");
  grid.appendChild(left); grid.appendChild(right);
  root.appendChild(grid);

  /* --- current state --- */
  const cs = panel("Current state", { flush: true, head: '<span class="st ' + (m.logged ? "ac" : "off") + '"><i></i>' + (m.logged ? m.logged + " streams today" : "awaiting first entry") + "</span>" });
  const tel = el("div", "tel");
  const cells = [
    { l: "Energy", v: m.energy != null ? fx(m.energy, 1) : "—", u: m.energy != null ? "/10" : "", id: "energy", raw: m.energy, s: seriesOf(h7, "energy") },
    { l: "Focus", v: m.focusR != null ? fx(m.focusR, 1) : "—", u: m.focusR != null ? "/10" : "", id: "focusR", raw: m.focusR, s: seriesOf(h7, "focusR") },
    { l: "Sleep", v: m.sleepMin != null ? hm(m.sleepMin) : "—", u: "", id: "sleepMin", raw: m.sleepMin, s: seriesOf(h7, "sleepMin") },
    { l: "Routine", v: m.habitPct != null ? Math.round(m.habitPct) + "" : "—", u: m.habitPct != null ? "%" : "", id: "habitPct", raw: m.habitPct, s: seriesOf(h7, "habitPct") }
  ];
  cells.forEach(c => {
    const n = el("div", "cell");
    n.innerHTML = '<span class="lbl">' + c.l + '</span><div class="v">' + esc(c.v) + (c.u ? "<u>" + c.u + "</u>" : "") +
      '</div><div class="meta">' + deltaHTML(c.raw, base[c.id] && base[c.id].v, VAR[c.id].hb) + "</div>";
    const sp = el("div", "spark"); n.appendChild(sp);
    tel.appendChild(n);
    sparkline(sp, c.s, c.raw == null ? "#4B5A62" : "#4FD8F5");
  });
  cs._bd.appendChild(tel);
  const dayline = el("div");
  dayline.style.cssText = "display:flex;gap:14px;flex-wrap:wrap;align-items:center;padding:13px 16px;border-top:1px solid var(--line)";
  dayline.innerHTML =
    '<span class="lbl">Day score</span><span class="num" style="font-size:19px;color:' + (m.score != null ? "var(--accent)" : "var(--dimmer)") + '">' + (m.score != null ? m.score : "—") + '</span>' +
    '<span class="lbl lbl-dim">of 100</span><div style="flex:1"></div>' +
    deltaHTML(m.score, base.score.v, 1);
  cs._bd.appendChild(dayline);
  left.appendChild(cs);

  /* --- 24h performance --- */
  const tl = panel("Performance // 24H", { head: '<span class="lbl lbl-dim">' + esc(fmtDate(k)) + "</span>" });
  const tlw = el("div"); tl._bd.appendChild(tlw);
  drawTimeline(tlw, k);
  left.appendChild(tl);

  /* --- objectives --- */
  const d = day(k);
  const ob = panel("Primary objective", { head: '<button class="btn btn-q btn-sm" data-act="objectives">Edit</button>' });
  const obw = el("div", "obj");
  obw.innerHTML =
    '<div class="prime"><button class="tick-o" aria-label="Mark objective done" data-obj="primary" style="width:20px;height:20px;border:1px solid ' +
    (d.objectives.primaryDone ? "var(--accent);background:rgba(79,216,245,.16)" : "var(--line-hot)") + ';flex:none;margin-top:3px"></button>' +
    '<div class="txt' + (d.objectives.primary ? "" : " empty") + '">' + (d.objectives.primary ? esc(d.objectives.primary) : "What would make today successful?") + "</div></div>";
  if (d.objectives.secondary.length) {
    obw.insertAdjacentHTML("beforeend", '<span class="lbl" style="margin-top:6px">Secondary objectives</span>');
    const sl = el("div", "sec-list");
    d.objectives.secondary.forEach((s, i) => {
      sl.insertAdjacentHTML("beforeend",
        '<div class="it' + (s.done ? " done" : "") + '"><button data-sec="' + i + '" aria-label="Toggle" style="width:15px;height:15px;border:1px solid ' +
        (s.done ? "var(--accent);background:rgba(79,216,245,.2)" : "var(--line-hot)") + ';flex:none"></button><span class="t">' + esc(s.t) + "</span></div>");
    });
    obw.appendChild(sl);
  }
  ob._bd.appendChild(obw);
  left.appendChild(ob);

  /* --- routines --- */
  const hs = activeHabits();
  const rt = panel("Routine // Active", {
    flush: true,
    head: '<span class="num" style="font-size:13px;color:var(--text)">' + p2(m.habitDone) + " / " + p2(m.habitTotal) +
      '</span><button class="btn btn-q btn-sm" data-act="routines" style="margin-left:10px">Configure</button>'
  });
  if (!hs.length) {
    rt._bd.appendChild(emptyBlock("No active routines", "Configure your first routine to begin tracking. Three to six is usually enough."));
  } else {
    const gl = el("div", "glist");
    hs.forEach((h, i) => {
      const done = !!d.habits[h.id];
      const row = el("div", "hrow" + (done ? " done" : ""));
      row.dataset.habit = h.id;
      row.innerHTML = '<span class="ix">' + p2(i + 1) + '</span><span class="nm">' + esc(h.name) + '</span>' +
        '<span class="rec">Recorded</span>' +
        (done && typeof d.habits[h.id] === "string" ? '<span class="lbl lbl-dim">' + esc(d.habits[h.id]) + "</span>" : "") +
        '<button class="tick" data-toggle="' + h.id + '" aria-pressed="' + done + '" aria-label="' + esc(h.name) + '"></button>';
      gl.appendChild(row);
    });
    rt._bd.appendChild(gl);
  }
  left.appendChild(rt);

  /* --- quick log --- */
  const qa = panel("Quick log", { flush: true });
  const q = el("div", "qa");
  [["caffeine", "Caffeine", "◈"], ["nap", "Nap", "◐"], ["focus-go", "Focus", "◎"], ["event", "Event", "◇"], ["sleep", "Sleep", "☾"], ["debrief", "Debrief", "◆"]]
    .forEach(([a, l, g]) => q.insertAdjacentHTML("beforeend", '<button data-act="' + a + '"><span class="g">' + g + '</span><span class="l">' + l + "</span></button>"));
  qa._bd.appendChild(q);
  left.appendChild(qa);

  /* ================= right column ================= */
  const hr = new Date().getHours();
  if (!d.sleep && hr < 13) {
    const p = el("div", "sig bez");
    p.innerHTML = '<div class="cap"><span class="lbl">Morning system check</span></div>' +
      '<p class="obs">Log last night\'s sleep and how you feel now. It takes about twenty seconds and it is what most of MYTRA\'s pattern detection runs on.</p>' +
      '<button class="btn btn-p" data-act="morning" style="width:100%">Run check</button>';
    right.appendChild(p);
  } else if (!d.debriefAt && hr >= S.core.settings.debriefHour) {
    const p = el("div", "sig bez");
    p.innerHTML = '<div class="cap"><span class="lbl" style="color:var(--accent)">Daily debrief</span></div>' +
      '<p class="obs">The day is close enough to done. Five readings and MYTRA closes the record.</p>' +
      '<button class="btn btn-p" data-act="debrief" style="width:100%">Begin debrief</button>';
    right.appendChild(p);
  }

  /* focus window hint, only when there is enough to say it */
  const fw = bestFocusWindow(30);
  if (fw && hr < 18) {
    const p = el("div", "sig");
    p.innerHTML = '<div class="cap"><span class="lbl">Observation</span></div>' +
      '<p class="obs">Your strongest logged focus window has been <b style="color:var(--accent)">' + esc(fw.label) + '</b> — ' +
      esc(durShort(fw.sec)) + " of focused work across the last 30 days.</p>";
    right.appendChild(p);
  }

  /* caffeine */
  const cf = el("div", "sig bez");
  const caffToday = (d.caffeine || []);
  const lastT = caffToday.length ? caffToday[caffToday.length - 1].t : null;
  const since = lastT != null ? (nowMin() - toMin(lastT) + 1440) % 1440 : null;
  cf.innerHTML = '<div class="cap"><span class="lbl">Caffeine // Today</span><div style="flex:1"></div>' +
    '<button class="btn btn-q btn-sm" data-act="caffeine">＋</button></div>' +
    '<div class="num" style="font-size:30px;line-height:1;margin-bottom:4px">' + (m.caffMg != null ? m.caffMg : "0") + '<u style="font-size:.4em;color:var(--dimmer)"> mg</u></div>' +
    '<div style="margin-bottom:12px">' + deltaHTML(m.caffMg, base.caffMg && base.caffMg.v, 0) + "</div>" +
    (caffToday.length
      ? '<div class="dg">' + caffToday.map(c => '<div class="r"><span class="k">' + esc(c.t) + " · " + esc(c.label) + '</span><span class="v">' + c.mg + "mg</span></div>").join("") + "</div>" +
        '<div class="kv"><div class="r"><span class="lbl">Last dose</span><span class="d mono" style="color:var(--text)">' + esc(lastT) + '</span></div>' +
        '<div class="r"><span class="lbl">Time since</span><span class="d mono" style="color:var(--text)">' + hm(since) + "</span></div></div>"
      : '<p class="obs" style="margin:0">Nothing logged today.</p>');
  right.appendChild(cf);

  /* recovery */
  const rc = el("div", "sig");
  rc.innerHTML = '<div class="cap"><span class="lbl">Recovery // Naps</span><div style="flex:1"></div><button class="btn btn-q btn-sm" data-act="nap">＋</button></div>' +
    (d.naps && d.naps.length
      ? '<div class="dg">' + d.naps.map(n => '<div class="r"><span class="k">' + esc(n.start) + " → " + esc(n.end) + '</span><span class="v">' + n.minutes + "m</span></div>").join("") + "</div>"
      : '<p class="obs" style="margin:0">No nap logged today.</p>');
  right.appendChild(rc);

  /* focus today */
  const ft = el("div", "sig");
  const fsec = m.focusSec || 0;
  ft.innerHTML = '<div class="cap"><span class="lbl">Focus // Today</span><div style="flex:1"></div><button class="btn btn-q btn-sm" data-act="focus-go">Engine</button></div>' +
    '<div class="num" style="font-size:26px;line-height:1;margin-bottom:10px">' + dur(fsec) + "</div>" +
    '<div class="kv"><div class="r"><span class="lbl">Sessions</span><span class="d mono" style="color:var(--text)">' + m.focusCount + '</span></div>' +
    '<div class="r"><span class="lbl">Longest</span><span class="d mono" style="color:var(--text)">' +
      (m.focusCount ? durShort(Math.max.apply(null, d.focus.map(f => f.sec))) : "—") + "</span></div></div>";
  right.appendChild(ft);

  /* signals */
  const ins = buildInsights();
  if (!ins.length) {
    const p = el("div", "sig bez");
    p.innerHTML = '<div class="cap"><span class="lbl">Intelligence</span><div style="flex:1"></div><span class="conf c0">Insufficient data</span></div>' +
      '<p class="obs">MYTRA needs more observations. Continue logging for roughly 7–14 days — your first meaningful signals will appear here.</p>';
    right.appendChild(p);
  } else {
    ins.slice(0, 2).forEach(i => right.appendChild(signalCard(i)));
    if (ins.length > 2) {
      const more = el("div", "sig");
      more.innerHTML = '<button class="btn btn-q" data-goto="system" style="width:100%">' + (ins.length - 2) + " more signal" + (ins.length - 2 === 1 ? "" : "s") + " in System</button>";
      right.appendChild(more);
    }
  }
}

function signalCard(i) {
  const p = el("div", "sig bez");
  p.innerHTML = '<div class="cap"><span class="lbl">Signal detected</span><div style="flex:1"></div><span class="conf ' + i.conf.k + '">' + esc(i.conf.n) + "</span></div>" +
    "<h4>" + esc(i.title) + "</h4>" +
    '<p class="obs">' + i.obs + "</p>" +
    '<div class="kv"><div class="r"><span class="lbl">Evidence</span><span class="d">' + esc(i.evidence) + "</span></div>" +
    '<div class="r"><span class="lbl">Experiment</span><span class="d">' + esc(i.experiment) + "</span></div></div>" +
    '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-q btn-sm" data-exp="' + esc(i.id) + '">Run experiment</button>' +
    '<button class="btn btn-q btn-sm" data-dismiss="' + esc(i.id) + '">Dismiss</button></div>';
  return p;
}

function bestFocusWindow(nDays) {
  const buckets = new Array(24).fill(0);
  let total = 0;
  keyRange(todayKey(), nDays).forEach(k => {
    const d = dayRO(k);
    (d && d.focus || []).forEach(f => {
      const s = toMin(f.start); if (s == null) return;
      let remaining = f.sec / 60, h = Math.floor(s / 60), off = s % 60;
      while (remaining > 0 && h < 24) {
        const take = Math.min(remaining, 60 - off);
        buckets[h] += take; total += take; remaining -= take; off = 0; h++;
      }
    });
  });
  if (total < 120) return null;
  let bi = 0, bv = -1;
  for (let h = 0; h < 23; h++) { const v = buckets[h] + buckets[h + 1]; if (v > bv) { bv = v; bi = h; } }
  if (bv < 60) return null;
  return { label: p2(bi) + ":00–" + p2(bi + 2) + ":00", sec: bv * 60 };
}
