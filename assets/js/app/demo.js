/* MYTRA // app/demo.js - demo mode (app/index.html?demo=1). */
"use strict";

/* ============================================================
   DEMO MODE — fictional data, in memory only, never written to
   the account and never mixed with real records.
   ============================================================ */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function buildDemo() {
  const rnd = mulberry32(20260906);
  const nrm = () => (rnd() + rnd() + rnd() - 1.5) * 1.15;
  const core = defCore();
  core.calibrated = true;
  core.profile = { wake: "06:55", bed: "23:10", objective: "focus", priorities: ["sleep", "focus", "energy"], sleepTarget: 465 };
  core.habits = [
    { id: "h1", name: "Morning walk", cat: "movement", startedOn: null, archived: false },
    { id: "h2", name: "Deep work block", cat: "work", startedOn: null, archived: false },
    { id: "h3", name: "Training", cat: "movement", startedOn: null, archived: false },
    { id: "h4", name: "Read", cat: "mind", startedOn: null, archived: false },
    { id: "h5", name: "Stretch", cat: "recovery", startedOn: null, archived: false }
  ];
  core.firstDay = addDays(todayKey(), -69);
  const months = {};
  const put = (k, d) => { const mk2 = k.slice(0, 7); if (!months[mk2]) months[mk2] = { days: {} }; months[mk2].days[k] = d; };

  let prevLate = 0; /* yesterday's late dose, carried into tonight's record */
  for (let i = 69; i >= 0; i--) {
    const k = addDays(todayKey(), -i);
    const dt = parseKey(k), dow = dt.getDay();
    const weekend = dow === 0 || dow === 6;
    const d = defDay(k);

    /* sleep — drifts later midweek, longer at weekends */
    const bedM = 1390 + Math.round(nrm() * 34) + (weekend ? 42 : 0) + (dow === 3 ? 26 : 0);
    const wakeM = 415 + Math.round(nrm() * 18) + (weekend ? 48 : 0) - (prevLate ? 26 + Math.round(rnd() * 22) : 0);
    const bed = fromMin(bedM), wake = fromMin(wakeM);
    const durM = sleepDur(bed, wake) || 450;
    const q = clamp(Math.round(5.2 + (durM - 450) / 52 + nrm() * 1.1), 1, 10);
    d.sleep = { bedtime: bed, wake: wake, durMin: durM, quality: q };

    /* caffeine — a late dose about a third of the time */
    const late = rnd() < 0.34;
    d.caffeine = [{ id: uid(), t: fromMin(wakeM + 70 + Math.round(rnd() * 40)), mg: 56, label: "Coffee", detail: "2 tsp × 28 mg" }];
    if (rnd() < 0.8) d.caffeine.push({ id: uid(), t: fromMin(690 + Math.round(rnd() * 60)), mg: 63, label: "Espresso", detail: "1 shot" });
    if (late) d.caffeine.push({ id: uid(), t: fromMin(900 + Math.round(rnd() * 130)), mg: 84, label: "Coffee", detail: "3 tsp × 28 mg" });
    const lateMg = late ? d.caffeine[d.caffeine.length - 1].mg : 0;

    /* naps */
    if (!weekend && rnd() < 0.3) {
      const s = 810 + Math.round(rnd() * 90), m = 18 + Math.round(rnd() * 14);
      d.naps = [{ id: uid(), start: fromMin(s), end: fromMin(s + m), minutes: m, after: clamp(Math.round(6.6 + nrm()), 1, 10) }];
    }
    const napM = d.naps.length ? d.naps[0].minutes : 0;

    /* routines */
    core.habits.forEach(h => {
      const p = h.id === "h1" ? 0.78 : h.id === "h2" ? (weekend ? 0.22 : 0.82) : h.id === "h3" ? (dow === 1 || dow === 3 || dow === 5 ? 0.74 : 0.14) : h.id === "h4" ? 0.6 : 0.48;
      if (rnd() < p) d.habits[h.id] = fromMin((h.id === "h1" ? wakeM + 25 : h.id === "h4" ? bedM - 45 : 600) + Math.round(rnd() * 40));
    });
    const doneN = Object.keys(d.habits).length;
    const moved = !!(d.habits.h1 || d.habits.h3);

    /* focus sessions clustered in the morning */
    if (!weekend || rnd() < 0.3) {
      const n = 1 + Math.floor(rnd() * 3.4);
      let t = wakeM + 105 + Math.round(rnd() * 50);
      for (let j = 0; j < n; j++) {
        const len = (rnd() < 0.55 ? 25 : 45) * 60;
        d.focus.push({
          id: uid(), start: fromMin(t), sec: len, mode: len === 1500 ? "p25" : "p45",
          task: ["Product proposal", "Model rebuild", "Client deck", "Code review", "Writing"][Math.floor(rnd() * 5)],
          rating: clamp(Math.round(6 + (durM - 450) / 60 + nrm() * 1.2), 1, 10),
          distractions: Math.floor(rnd() * 4)
        });
        t += len / 60 + 12 + Math.round(rnd() * 55);
      }
    }
    const focusSec = d.focus.reduce((s, f) => s + f.sec, 0);

    /* events */
    if (!weekend) {
      d.events.push({ id: uid(), label: "Standup", cat: "admin", start: fromMin(560), minutes: 25 });
      if (rnd() < 0.6) d.events.push({ id: uid(), label: "Email & admin", cat: "admin", start: fromMin(960), minutes: 35 + Math.round(rnd() * 30) });
      if (rnd() < 0.5) d.events.push({ id: uid(), label: "Lunch break", cat: "break", start: fromMin(780), minutes: 40 });
    }
    if (d.habits.h3) d.events.push({ id: uid(), label: "Training", cat: "exercise", start: fromMin(1080), minutes: 55 });

    /* ratings driven by the same underlying factors, plus noise */
    const sleepZ = (durM - 450) / 55;
    const energy = clamp(Math.round(6.4 + sleepZ * 1.15 + (napM > 0 ? 0.75 : 0) + nrm() * 0.9), 1, 10);
    const focusR = clamp(Math.round(6.2 + sleepZ * 1.3 + (focusSec / 3600) * 0.28 + nrm() * 0.9), 1, 10);
    const mood = clamp(Math.round(6.5 + (moved ? 0.85 : -0.35) + sleepZ * 0.55 + nrm() * 0.95), 1, 10);
    const stress = clamp(Math.round(5.1 - sleepZ * 0.7 + (doneN >= 4 ? -0.6 : 0.35) + nrm()), 1, 10);
    const dayR = clamp(Math.round((energy + focusR + mood + (11 - stress)) / 4 + (doneN / 5 - 0.6) * 1.1 + nrm() * 0.55), 1, 10);
    d.ratings = { energy, mood, focusR, stress, dayR };
    d.debriefAt = Date.now() - i * 86400000;
    d.objectives = {
      primary: ["Finish the product proposal", "Ship the pricing model", "Draft the quarterly review", "Clear the review backlog", "Rebuild the forecast"][Math.floor(rnd() * 5)],
      primaryDone: rnd() < 0.62, secondary: []
    };
    put(k, d);
    prevLate = lateMg;
  }
  return { core, months };
}
function enterDemo() {
  const dm = buildDemo();
  Store.demo = true;
  S.core = dm.core;
  S.months = dm.months;
  S.loaded = new Set(Object.keys(dm.months));
  $("#demo-flag").classList.remove("hide");
  enterApp();
  toast("Demo data loaded — nothing is saved", "warn");
}
