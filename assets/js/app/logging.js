/* MYTRA // app/logging.js - logging modals: caffeine, nap, sleep, event, objectives, routines, check-ins, day record. */
"use strict";

/* ============================================================
   CAFFEINE
   ============================================================ */
const CAFF_PRESETS = [
  { id: "coffee", n: "Coffee" }, { id: "espresso", n: "Espresso" }, { id: "tea", n: "Tea" },
  { id: "energy", n: "Energy drink" }, { id: "custom", n: "Custom" }
];
function openCaffeine() {
  let kind = "coffee";
  modal({
    title: "Log caffeine",
    build(bd) {
      bd.innerHTML =
        '<div class="fld"><span class="lbl">Source</span><div class="chips" id="cf-kind">' +
        CAFF_PRESETS.map(p => '<button type="button" class="chip' + (p.id === "coffee" ? " sel" : "") + '" data-k="' + p.id + '">' + p.n + "</button>").join("") +
        '</div></div><div id="cf-detail"></div>' +
        field("Time", '<input class="in" id="cf-time" type="time" value="' + timeNow() + '">') +
        '<div class="dg" style="border:1px solid var(--line)"><div class="r"><span class="k">Calculated dose</span><span class="v" id="cf-mg" style="color:var(--accent)">—</span></div></div>';
      const detail = $("#cf-detail", bd);
      const render = () => {
        if (kind === "coffee") {
          detail.innerHTML =
            field("Coffee type", '<select class="in" id="cf-ctype"><option value="ground">Ground / filter / plunger</option><option value="instant">Instant</option></select>') +
            field("Teaspoons", '<input class="in" id="cf-tsp" type="number" min="0.5" max="12" step="0.5" value="2">',
              "Level teaspoons of coffee used. MYTRA multiplies by your per-teaspoon figure, which you can change in System → Settings.");
        } else if (kind === "espresso") {
          detail.innerHTML = field("Shots", '<input class="in" id="cf-shots" type="number" min="1" max="8" step="1" value="1">', "Counted at 63 mg per single shot.");
        } else if (kind === "tea") {
          detail.innerHTML =
            field("Tea", '<select class="in" id="cf-ttype"><option value="47">Black tea — 47 mg</option><option value="28">Green tea — 28 mg</option><option value="61">Matcha — 61 mg</option><option value="0">Herbal / rooibos — 0 mg</option></select>') +
            field("Cups", '<input class="in" id="cf-cups" type="number" min="1" max="10" step="1" value="1">');
        } else if (kind === "energy") {
          detail.innerHTML =
            field("Volume", '<select class="in" id="cf-ml"><option value="250">250 ml can — 80 mg</option><option value="330">330 ml — 106 mg</option><option value="500">500 ml — 160 mg</option></select>') +
            field("Quantity", '<input class="in" id="cf-cans" type="number" min="1" max="6" step="1" value="1">');
        } else {
          detail.innerHTML =
            field("Label", '<input class="in" id="cf-label" type="text" placeholder="Cold brew" maxlength="40">') +
            field("Caffeine", '<input class="in" id="cf-custom" type="number" min="0" max="1000" step="5" value="80">', "Milligrams.");
        }
        $$("input,select", detail).forEach(i => { on(i, "input", calc); on(i, "change", calc); });
        calc();
      };
      const calc = () => {
        const r = caffCalc(kind, bd);
        $("#cf-mg", bd).textContent = r.mg ? r.mg + " mg" : "—";
        $("#cf-mg", bd).dataset.mg = r.mg;
        $("#cf-mg", bd).dataset.label = r.label;
        $("#cf-mg", bd).dataset.detail = r.detail;
      };
      on($("#cf-kind", bd), "click", e => {
        const b = e.target.closest("[data-k]"); if (!b) return;
        kind = b.dataset.k;
        $$(".chip", $("#cf-kind", bd)).forEach(c => c.classList.remove("sel"));
        b.classList.add("sel");
        render();
      });
      render();
    },
    actions: [
      { label: "Cancel", kind: "btn-q", fn: closeModal },
      {
        label: "Record", kind: "btn-p", fn() {
          const bd = $("#ov .md-bd");
          const mg = Number($("#cf-mg", bd).dataset.mg || 0);
          if (!mg) { toast("Enter a dose above zero", "warn"); return; }
          const k = todayKey(), d = day(k);
          d.caffeine.push({ id: uid(), t: $("#cf-time", bd).value || timeNow(), mg: Math.round(mg), label: $("#cf-mg", bd).dataset.label, detail: $("#cf-mg", bd).dataset.detail });
          d.caffeine.sort((a, b) => (toMin(a.t) || 0) - (toMin(b.t) || 0));
          saveDay(k); closeModal(); toast("Recorded · " + Math.round(mg) + " mg"); render();
        }
      }
    ]
  });
}
function caffCalc(kind, bd) {
  const st = S.core.settings;
  if (kind === "coffee") {
    const t = $("#cf-ctype", bd) ? $("#cf-ctype", bd).value : "ground";
    const tsp = Number(($("#cf-tsp", bd) || {}).value || 0);
    const per = t === "instant" ? st.instantMg : st.groundMg;
    return { mg: Math.round(tsp * per), label: t === "instant" ? "Instant coffee" : "Coffee", detail: tsp + " tsp × " + per + " mg" };
  }
  if (kind === "espresso") {
    const s = Number(($("#cf-shots", bd) || {}).value || 0);
    return { mg: Math.round(s * 63), label: "Espresso", detail: s + " shot" + (s === 1 ? "" : "s") };
  }
  if (kind === "tea") {
    const per = Number(($("#cf-ttype", bd) || {}).value || 0);
    const c = Number(($("#cf-cups", bd) || {}).value || 0);
    const nm = $("#cf-ttype", bd) ? $("#cf-ttype", bd).selectedOptions[0].textContent.split("—")[0].trim() : "Tea";
    return { mg: Math.round(per * c), label: nm, detail: c + " cup" + (c === 1 ? "" : "s") };
  }
  if (kind === "energy") {
    const ml = Number(($("#cf-ml", bd) || {}).value || 250);
    const c = Number(($("#cf-cans", bd) || {}).value || 1);
    const per = ml === 250 ? 80 : ml === 330 ? 106 : 160;
    return { mg: Math.round(per * c), label: "Energy drink", detail: c + " × " + ml + " ml" };
  }
  const mg = Number(($("#cf-custom", bd) || {}).value || 0);
  const lb = (($("#cf-label", bd) || {}).value || "").trim();
  return { mg: Math.round(mg), label: lb || "Custom", detail: mg + " mg entered" };
}

/* ============================================================
   NAP
   ============================================================ */
function openNap() {
  modal({
    title: "Log nap",
    build(bd) {
      bd.innerHTML =
        '<div class="row2">' +
        field("Start", '<input class="in" id="np-s" type="time" value="' + fromMin(nowMin() - 20) + '">') +
        field("End", '<input class="in" id="np-e" type="time" value="' + timeNow() + '">') +
        "</div>" +
        '<div class="dg" style="border:1px solid var(--line)"><div class="r"><span class="k">Duration</span><span class="v" id="np-d" style="color:var(--accent)">—</span></div></div>' +
        scaleHTML("Post-nap state", null, "groggy", "restored") +
        '<span class="hint">Optional. Leave the rating blank if you would rather not score it.</span>';
      wireScales(bd);
      const calc = () => {
        const a = toMin($("#np-s", bd).value), b = toMin($("#np-e", bd).value);
        let m = (a == null || b == null) ? null : (b - a + 1440) % 1440;
        if (m != null && m > 240) m = null;
        $("#np-d", bd).textContent = m == null ? "—" : m + " min";
        $("#np-d", bd).dataset.m = m == null ? "" : m;
      };
      on($("#np-s", bd), "input", calc); on($("#np-e", bd), "input", calc); calc();
    },
    actions: [
      { label: "Cancel", kind: "btn-q", fn: closeModal },
      {
        label: "Record", kind: "btn-p", fn() {
          const bd = $("#ov .md-bd");
          const m = Number($("#np-d", bd).dataset.m || 0);
          if (!m) { toast("Check the start and end times", "warn"); return; }
          const k = todayKey(), d = day(k);
          d.naps.push({ id: uid(), start: $("#np-s", bd).value, end: $("#np-e", bd).value, minutes: m, after: scaleVal(bd, "Post-nap state") });
          saveDay(k); closeModal(); toast("Recorded · " + m + " min nap"); render();
        }
      }
    ]
  });
}

/* ============================================================
   SLEEP
   ============================================================ */
function openSleep(k) {
  const key = k || todayKey();
  const d = day(key);
  const s = d.sleep || {};
  modal({
    title: "Sleep — night ending " + fmtDateShort(key),
    build(bd) {
      bd.innerHTML =
        '<div class="row2">' +
        field("Bedtime", '<input class="in" id="sl-b" type="time" value="' + (s.bedtime || S.core.profile.bed) + '">') +
        field("Wake", '<input class="in" id="sl-w" type="time" value="' + (s.wake || S.core.profile.wake) + '">') +
        "</div>" +
        '<div class="dg" style="border:1px solid var(--line)"><div class="r"><span class="k">Duration</span><span class="v" id="sl-d" style="color:var(--accent)">—</span></div></div>' +
        scaleHTML("Sleep quality", s.quality || null, "broken", "deep") +
        '<span class="hint">MYTRA records what you enter. It does not assess sleep disorders — if sleep is a persistent concern, speak to a physician.</span>';
      wireScales(bd);
      const calc = () => {
        const m = sleepDur($("#sl-b", bd).value, $("#sl-w", bd).value);
        $("#sl-d", bd).textContent = m == null ? "—" : hm(m) + "  ·  " + hmShort(m);
        $("#sl-d", bd).dataset.m = m == null ? "" : m;
      };
      on($("#sl-b", bd), "input", calc); on($("#sl-w", bd), "input", calc); calc();
    },
    actions: [
      { label: "Cancel", kind: "btn-q", fn: closeModal },
      {
        label: "Record", kind: "btn-p", fn() {
          const bd = $("#ov .md-bd");
          const m = Number($("#sl-d", bd).dataset.m || 0);
          if (!m) { toast("Check the bedtime and wake time", "warn"); return; }
          d.sleep = { bedtime: $("#sl-b", bd).value, wake: $("#sl-w", bd).value, durMin: m, quality: scaleVal(bd, "Sleep quality") };
          saveDay(key); closeModal(); toast("Recorded · " + hm(m)); render();
        }
      }
    ]
  });
}

/* ============================================================
   EVENT
   ============================================================ */
function openEvent() {
  modal({
    title: "Log event",
    build(bd) {
      bd.innerHTML =
        field("What was it", '<input class="in" id="ev-l" type="text" placeholder="Team review" maxlength="60">') +
        field("Category", '<select class="in" id="ev-c">' + EVENT_CATS.map(c => '<option value="' + c.id + '">' + c.n + "</option>").join("") + "</select>",
          "Categories drive the day distribution chart.") +
        '<div class="row2">' +
        field("Start", '<input class="in" id="ev-s" type="time" value="' + timeNow() + '">') +
        field("Minutes", '<input class="in" id="ev-m" type="number" min="1" max="720" step="5" value="30">') +
        "</div>";
    },
    actions: [
      { label: "Cancel", kind: "btn-q", fn: closeModal },
      {
        label: "Record", kind: "btn-p", fn() {
          const bd = $("#ov .md-bd");
          const lb = $("#ev-l", bd).value.trim();
          const m = Number($("#ev-m", bd).value || 0);
          if (!lb) { toast("Give the event a name", "warn"); return; }
          if (!m) { toast("Enter a duration in minutes", "warn"); return; }
          const k = todayKey(), d = day(k);
          d.events.push({ id: uid(), label: lb, cat: $("#ev-c", bd).value, start: $("#ev-s", bd).value, minutes: m });
          d.events.sort((a, b) => (toMin(a.start) || 0) - (toMin(b.start) || 0));
          saveDay(k); closeModal(); toast("Recorded"); render();
        }
      }
    ]
  });
}

/* ============================================================
   OBJECTIVES
   ============================================================ */
function openObjectives() {
  const k = todayKey(), d = day(k);
  const o = d.objectives;
  modal({
    title: "Objectives — " + fmtDateShort(k),
    build(bd) {
      bd.innerHTML =
        field("Primary objective", '<input class="in" id="ob-p" type="text" maxlength="120" placeholder="What would make today successful?" value="' + esc(o.primary || "") + '">',
          "One thing. Fewer objectives, better execution.") +
        '<div class="sepline"></div>' +
        field("Secondary 1", '<input class="in ob-s" type="text" maxlength="90" value="' + esc((o.secondary[0] || {}).t || "") + '">') +
        field("Secondary 2", '<input class="in ob-s" type="text" maxlength="90" value="' + esc((o.secondary[1] || {}).t || "") + '">') +
        field("Secondary 3", '<input class="in ob-s" type="text" maxlength="90" value="' + esc((o.secondary[2] || {}).t || "") + '">');
    },
    actions: [
      { label: "Cancel", kind: "btn-q", fn: closeModal },
      {
        label: "Save", kind: "btn-p", fn() {
          const bd = $("#ov .md-bd");
          o.primary = $("#ob-p", bd).value.trim();
          const old = o.secondary.slice();
          o.secondary = $$(".ob-s", bd).map((i, ix) => ({ t: i.value.trim(), done: (old[ix] || {}).done || false })).filter(x => x.t);
          saveDay(k); closeModal(); toast("Objectives set"); render();
        }
      }
    ]
  });
}

/* ============================================================
   HABITS / ROUTINES
   ============================================================ */
function toggleHabit(hid) {
  const k = todayKey(), d = day(k);
  if (d.habits[hid]) delete d.habits[hid];
  else d.habits[hid] = timeNow();
  saveDay(k);
  render();
  if (d.habits[hid]) {
    const row = $('[data-habit="' + hid + '"] .rec');
    if (row) { row.classList.add("show"); setTimeout(() => row.classList.remove("show"), 1400); }
  }
}
function openRoutineEditor() {
  modal({
    title: "Configure routines",
    build(bd) {
      const draw = () => {
        const hs = S.core.habits || [];
        bd.innerHTML =
          '<div class="glist" id="rt-list">' + (hs.length ? hs.map((h, i) =>
            '<div class="dg"><div class="r" style="background:var(--panel-2)">' +
            '<span class="mono" style="font-size:10px;color:var(--dimmest);width:16px">' + p2(i + 1) + "</span>" +
            '<span class="k" style="color:var(--text);text-transform:none;letter-spacing:0;font-family:var(--sans);font-size:13px">' + esc(h.name) +
            (h.archived ? ' <span class="lbl" style="color:var(--dimmer)">retired</span>' : "") + "</span>" +
            '<span class="lbl lbl-dim">' + esc((HABIT_CATS.find(c => c.id === h.cat) || { n: "Other" }).n) + "</span>" +
            '<button class="btn btn-q btn-sm" data-up="' + h.id + '" aria-label="Move up">↑</button>' +
            '<button class="btn btn-q btn-sm" data-arch="' + h.id + '">' + (h.archived ? "Restore" : "Retire") + "</button>" +
            "</div></div>").join("") : '<div class="empty"><span class="lbl">No active routines</span><p>Configure your first routine to begin tracking.</p></div>') +
          "</div><div class=\"sepline\"></div>" +
          '<div class="row2">' +
          field("New routine", '<input class="in" id="rt-n" type="text" maxlength="40" placeholder="Morning walk">') +
          field("Category", '<select class="in" id="rt-c">' + HABIT_CATS.map(c => '<option value="' + c.id + '">' + c.n + "</option>").join("") + "</select>") +
          "</div>" +
          '<button class="btn" id="rt-add">Add routine</button>' +
          '<span class="hint">Retiring a routine keeps its history but removes it from today\'s list. Movement routines are used when MYTRA looks for a relationship with mood.</span>';
        on($("#rt-add", bd), "click", () => {
          const n = $("#rt-n", bd).value.trim();
          if (!n) { toast("Name the routine", "warn"); return; }
          S.core.habits.push({ id: uid(), name: n, cat: $("#rt-c", bd).value, startedOn: todayKey(), archived: false });
          saveCore(); draw(); render(); toast("Routine added");
        });
        on(bd, "click", e => {
          const a = e.target.closest("[data-arch]"), u = e.target.closest("[data-up]");
          if (a) { const h = S.core.habits.find(x => x.id === a.dataset.arch); h.archived = !h.archived; saveCore(); draw(); render(); }
          if (u) { const i = S.core.habits.findIndex(x => x.id === u.dataset.up); if (i > 0) { const t = S.core.habits[i]; S.core.habits[i] = S.core.habits[i - 1]; S.core.habits[i - 1] = t; saveCore(); draw(); render(); } }
        });
      };
      draw();
    },
    actions: [{ label: "Done", kind: "btn-p", fn: closeModal }]
  });
}

/* ============================================================
   MORNING CHECK + NIGHTLY DEBRIEF
   ============================================================ */
function openMorningCheck() {
  const k = todayKey(), d = day(k);
  modal({
    title: "Morning system check",
    build(bd) {
      const s = d.sleep || {};
      bd.innerHTML =
        '<div class="row2">' +
        field("Bedtime", '<input class="in" id="mc-b" type="time" value="' + (s.bedtime || S.core.profile.bed) + '">') +
        field("Wake", '<input class="in" id="mc-w" type="time" value="' + (s.wake || S.core.profile.wake) + '">') +
        "</div>" +
        '<div class="dg" style="border:1px solid var(--line)"><div class="r"><span class="k">Sleep duration</span><span class="v" id="mc-d" style="color:var(--accent)">—</span></div></div>' +
        scaleHTML("Sleep quality", s.quality || null, "broken", "deep") +
        scaleHTML("Energy", d.ratings.energy || null, "flat", "charged") +
        scaleHTML("Mood", d.ratings.mood || null, "low", "bright") +
        '<span class="hint">All of it optional. Record what you know.</span>';
      wireScales(bd);
      const calc = () => {
        const m = sleepDur($("#mc-b", bd).value, $("#mc-w", bd).value);
        $("#mc-d", bd).textContent = m == null ? "—" : hm(m);
        $("#mc-d", bd).dataset.m = m == null ? "" : m;
      };
      on($("#mc-b", bd), "input", calc); on($("#mc-w", bd), "input", calc); calc();
    },
    actions: [
      { label: "Skip", kind: "btn-q", fn: closeModal },
      {
        label: "Log", kind: "btn-p", fn() {
          const bd = $("#ov .md-bd");
          const m = Number($("#mc-d", bd).dataset.m || 0);
          if (m) d.sleep = { bedtime: $("#mc-b", bd).value, wake: $("#mc-w", bd).value, durMin: m, quality: scaleVal(bd, "Sleep quality") };
          const e = scaleVal(bd, "Energy"), mo = scaleVal(bd, "Mood");
          if (e != null) d.ratings.energy = e;
          if (mo != null) d.ratings.mood = mo;
          d.morningCheck = Date.now();
          saveDay(k); closeModal(); toast("Baseline logged for today"); render();
        }
      }
    ]
  });
}

function openDebrief() {
  const k = todayKey(), d = day(k);
  modal({
    title: "Daily debrief — " + fmtDateShort(k),
    build(bd) {
      bd.innerHTML =
        '<span class="lbl" style="letter-spacing:.2em;color:var(--accent)">System check</span>' +
        scaleHTML("Energy", d.ratings.energy || null, "flat", "charged") +
        scaleHTML("Mood", d.ratings.mood || null, "low", "bright") +
        scaleHTML("Focus", d.ratings.focusR || null, "scattered", "locked in") +
        scaleHTML("Stress", d.ratings.stress || null, "calm", "overloaded") +
        scaleHTML("Day rating", d.ratings.dayR || null, "poor", "excellent") +
        '<span class="hint">These five readings are what most of MYTRA\'s pattern detection runs on. Nothing here is a score of you.</span>';
      wireScales(bd);
    },
    actions: [
      { label: "Later", kind: "btn-q", fn: closeModal },
      {
        label: "Close the day", kind: "btn-p", fn() {
          const bd = $("#ov .md-bd");
          const map = { Energy: "energy", Mood: "mood", Focus: "focusR", Stress: "stress", "Day rating": "dayR" };
          let any = false;
          Object.keys(map).forEach(n => { const v = scaleVal(bd, n); if (v != null) { d.ratings[map[n]] = v; any = true; } });
          if (!any) { toast("Set at least one reading", "warn"); return; }
          d.debriefAt = Date.now();
          saveDay(k);
          closeModal();
          modal({
            title: "Debrief complete",
            build(b2) {
              const m = metrics(k);
              b2.innerHTML =
                '<div class="bigrow" style="border:1px solid var(--line)">' +
                '<div class="c"><span class="lbl">Day score</span><span class="v" style="color:var(--accent)">' + (m.score != null ? m.score : "—") + '</span><div class="s">of 100</div></div>' +
                '<div class="c"><span class="lbl">Sleep</span><span class="v">' + hm(m.sleepMin) + '</span><div class="s">last cycle</div></div>' +
                '<div class="c"><span class="lbl">Focus time</span><span class="v">' + (m.focusSec ? dur(m.focusSec) : "—") + '</span><div class="s">logged today</div></div>' +
                "</div>" +
                '<p style="margin:0;font-size:14px;line-height:1.7;color:var(--dim)">You have earned rest. The session resumes tomorrow.</p>' +
                '<span class="st on"><i></i>Telemetry stored · baseline updated</span>';
            },
            actions: [{ label: "Close", kind: "btn-p", fn: closeModal }]
          });
          render();
        }
      }
    ]
  });
}

/* ============================================================
   DAY RECORD
   ============================================================ */
function openDayRecord(k) {
  const m = metrics(k), d = dayRO(k), dist = distribution(k);
  modal({
    title: fmtDate(k),
    build(bd) {
      if (!d || (m.logged === 0 && !dist.total)) {
        bd.appendChild(emptyBlock("No record", "Nothing was logged on this day. MYTRA leaves gaps as gaps rather than filling them in."));
        return;
      }
      bd.innerHTML =
        '<div class="bigrow" style="border:1px solid var(--line)">' +
        rec("Day score", m.score != null ? m.score : "—", "of 100") +
        rec("Sleep", hm(m.sleepMin), d && d.sleep ? d.sleep.bedtime + " → " + d.sleep.wake : "not logged") +
        rec("Energy", m.energy != null ? fx(m.energy, 1) : "—", "of 10") +
        rec("Focus", m.focusR != null ? fx(m.focusR, 1) : "—", "of 10") +
        rec("Mood", m.mood != null ? fx(m.mood, 1) : "—", "of 10") +
        rec("Stress", m.stress != null ? fx(m.stress, 1) : "—", "of 10") +
        rec("Routine", m.habitPct != null ? Math.round(m.habitPct) + "%" : "—", m.habitTotal ? m.habitDone + " of " + m.habitTotal : "none active") +
        rec("Caffeine", m.caffMg != null ? m.caffMg + "mg" : "—", m.caffLast != null ? "last " + fromMin(m.caffLast) : "none logged") +
        rec("Focus time", m.focusSec ? dur(m.focusSec) : "—", m.focusCount + " session" + (m.focusCount === 1 ? "" : "s")) +
        rec("Recovery", m.napMin ? hm(m.napMin) : "—", m.napCount + " nap" + (m.napCount === 1 ? "" : "s")) +
        "</div>";
      if (d && d.objectives && d.objectives.primary) {
        bd.insertAdjacentHTML("beforeend",
          '<div><span class="lbl">Primary objective</span><p style="margin:7px 0 0;font-family:var(--disp);font-size:16px;line-height:1.4">' + esc(d.objectives.primary) + "</p></div>");
      }
      const tlw = el("div"); bd.appendChild(el("div", null, '<span class="lbl">Timeline</span>')); bd.appendChild(tlw);
      drawTimeline(tlw, k);
      if (dist.total > 20) {
        const dw = el("div", null, '<span class="lbl">Day distribution</span>');
        const holder = el("div"); holder.style.cssText = "display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:10px";
        const dn = el("div"); holder.appendChild(dn);
        const lg = el("div", "legend"); lg.style.flexDirection = "column";
        dist.rows.forEach(r => lg.insertAdjacentHTML("beforeend", '<span class="i"><b style="background:' + r.c + '"></b>' + esc(r.n) + ' <span>' + Math.round(r.pct) + "%</span></span>"));
        holder.appendChild(lg);
        dw.appendChild(holder);
        bd.appendChild(dw);
        drawDonut(dn, dist.rows, dist.total, Math.round(dist.total / 60 * 10) / 10 + "h", "LOGGED");
      }
      if (d && d.caffeine && d.caffeine.length) {
        bd.insertAdjacentHTML("beforeend", '<div><span class="lbl">Caffeine ledger</span><div class="dg" style="margin-top:8px">' +
          d.caffeine.map(c => '<div class="r"><span class="k">' + esc(c.t) + " · " + esc(c.label) + '</span><span class="v">' + c.mg + "mg</span></div>").join("") + "</div></div>");
      }
      function rec(l, v, s) { return '<div class="c"><span class="lbl">' + l + '</span><span class="v">' + esc(String(v)) + '</span><div class="s">' + esc(s) + "</div></div>"; }
    },
    actions: [{ label: "Close", kind: "btn-p", fn: closeModal }]
  });
}
