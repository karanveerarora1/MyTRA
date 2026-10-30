/* MYTRA // app/views/today.js - Today view (#today). */
"use strict";

/* ---------------- TODAY ---------------- */
function renderToday() {
  const root = $("#v-today");
  const k = todayKey(), d = day(k), m = metrics(k), base = baselines();
  root.innerHTML = viewHead("Today", "Level 1 // The daily record",
    '<button class="btn btn-q btn-sm" data-act="objectives">Objectives</button>' +
    '<button class="btn btn-p btn-sm" data-act="debrief" style="margin-left:8px">' + (d.debriefAt ? "Revise debrief" : "Daily debrief") + "</button>");

  const stack = el("div", "stack");
  root.appendChild(stack);

  /* record */
  const rec = panel("Daily record", { flush: true, head: '<span class="lbl lbl-dim">' + esc(fmtDate(k)) + "</span>" });
  const br = el("div", "bigrow");
  const R = (l, v, s) => '<div class="c"><span class="lbl">' + l + '</span><span class="v">' + esc(String(v)) + '</span><div class="s">' + esc(s) + "</div></div>";
  br.innerHTML =
    R("Day score", m.score != null ? m.score : "—", "of 100") +
    R("Sleep", hm(m.sleepMin), d.sleep ? d.sleep.bedtime + " → " + d.sleep.wake : "not logged") +
    R("Energy", m.energy != null ? fx(m.energy, 1) : "—", "of 10") +
    R("Focus", m.focusR != null ? fx(m.focusR, 1) : "—", "of 10") +
    R("Mood", m.mood != null ? fx(m.mood, 1) : "—", "of 10") +
    R("Stress", m.stress != null ? fx(m.stress, 1) : "—", "of 10") +
    R("Routine", m.habitPct != null ? Math.round(m.habitPct) + "%" : "—", m.habitTotal ? m.habitDone + " of " + m.habitTotal : "none active") +
    R("Caffeine", (m.caffMg || 0) + "mg", m.caffLast != null ? "last " + fromMin(m.caffLast) : "none logged") +
    R("Focus time", dur(m.focusSec || 0), m.focusCount + " session" + (m.focusCount === 1 ? "" : "s")) +
    R("Recovery", hm(m.napMin || 0), m.napCount + " nap" + (m.napCount === 1 ? "" : "s"));
  rec._bd.appendChild(br);
  stack.appendChild(rec);

  /* distribution */
  const dist = distribution(k);
  const dp = panel("Day distribution", { head: '<span class="lbl lbl-dim">' + (dist.total ? Math.round(dist.total) + " min logged" : "no durations logged") + "</span>" });
  if (dist.total < 20) {
    dp._bd.appendChild(emptyBlock("Nothing to divide yet", "This chart is built only from durations you actually logged — focus sessions, naps and events. MYTRA will not fill the rest of the day with guesses."));
  } else {
    const holder = el("div"); holder.style.cssText = "display:flex;gap:26px;align-items:center;flex-wrap:wrap";
    const dn = el("div"); holder.appendChild(dn);
    const lg = el("div", "legend"); lg.style.cssText = "flex-direction:column;gap:9px;margin:0;flex:1;min-width:170px";
    dist.rows.forEach(r => lg.insertAdjacentHTML("beforeend",
      '<span class="i"><b style="background:' + r.c + '"></b>' + esc(r.n) + '<div style="flex:1"></div><span>' + Math.round(r.pct) + "% · " + Math.round(r.mins) + "m</span></span>"));
    holder.appendChild(lg);
    dp._bd.appendChild(holder);
    drawDonut(dn, dist.rows, dist.total, (Math.round(dist.total / 6) / 10) + "h", "LOGGED");
  }
  stack.appendChild(dp);

  /* sleep */
  const sp = panel("Sleep // Last cycle", { head: '<button class="btn btn-q btn-sm" data-act="sleep">' + (d.sleep ? "Edit" : "Log") + "</button>" });
  if (!d.sleep) {
    sp._bd.appendChild(emptyBlock("No sleep record", "Log bedtime and wake time to start building the relationship between your sleep and the day that follows."));
  } else {
    const bconsist = baselines().bedConsistency;
    sp._bd.innerHTML =
      '<div class="num" style="font-size:38px;line-height:1;letter-spacing:-.03em">' + hm(d.sleep.durMin) + "</div>" +
      '<div style="margin:8px 0 16px">' + deltaHTML(d.sleep.durMin, base.sleepMin && base.sleepMin.v, 1) + "</div>" +
      '<div class="dg">' +
      '<div class="r"><span class="k">Bedtime</span><span class="v">' + esc(d.sleep.bedtime) + "</span></div>" +
      '<div class="r"><span class="k">Wake</span><span class="v">' + esc(d.sleep.wake) + "</span></div>" +
      '<div class="r"><span class="k">Quality</span><span class="v">' + (d.sleep.quality ? d.sleep.quality + " / 10" : "—") + "</span></div>" +
      '<div class="r"><span class="k">Bedtime consistency</span><span class="v">' + (bconsist.v != null ? Math.round(bconsist.v) + "%" : "—") + "</span></div>" +
      "</div>" +
      '<p class="hint" style="margin-top:12px">Consistency compares the last two weeks of bedtimes against each other. It is a description, not a diagnosis.</p>';
  }
  stack.appendChild(sp);

  /* ledgers */
  const two = el("div");
  two.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:18px";
  two.appendChild(ledger("Caffeine // Today", "caffeine", (d.caffeine || []).map(c => ({
    id: c.id, k: c.t + " · " + c.label + (c.detail ? " (" + c.detail + ")" : ""), v: c.mg + "mg"
  })), "No caffeine logged", "Log a dose to build the timing picture."));
  two.appendChild(ledger("Recovery // Naps", "nap", (d.naps || []).map(n => ({
    id: n.id, k: n.start + " → " + n.end + (n.after ? " · felt " + n.after + "/10" : ""), v: n.minutes + "m"
  })), "No naps logged", "MYTRA only comments on naps once your own energy ratings support it."));
  two.appendChild(ledger("Focus sessions", "focus-go", (d.focus || []).map(f => ({
    id: f.id, k: f.start + " · " + (f.task || "Unlabelled") + (f.rating ? " · " + f.rating + "/10" : ""), v: durShort(f.sec)
  })), "No sessions today", "Start the focus engine to record work time."));
  two.appendChild(ledger("Events", "event", (d.events || []).map(e => ({
    id: e.id, k: e.start + " · " + e.label, v: e.minutes + "m"
  })), "No events logged", "Events with durations feed the day distribution."));
  stack.appendChild(two);

  function ledger(title, act, rows, emptyT, emptyB) {
    const p = panel(title, { flush: true, head: '<button class="btn btn-q btn-sm" data-act="' + act + '">＋ Add</button>' });
    if (!rows.length) p._bd.appendChild(emptyBlock(emptyT, emptyB));
    else {
      const g = el("div", "dg");
      rows.forEach(r => g.insertAdjacentHTML("beforeend",
        '<div class="r"><span class="k" style="text-transform:none;letter-spacing:0;font-family:var(--sans);font-size:12.5px">' + esc(r.k) +
        '</span><span class="v">' + esc(r.v) + '</span><button class="x" data-del="' + esc(act) + ":" + esc(r.id) + '" aria-label="Remove">×</button></div>'));
      p._bd.appendChild(g);
    }
    return p;
  }
}
