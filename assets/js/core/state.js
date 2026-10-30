/* MYTRA // core/state.js - data model, in-memory state, load/save. Needs utils.js, store.js. */
"use strict";

/* ============================================================
   STATE
   ============================================================ */
const HABIT_CATS = [
  { id: "movement", n: "Movement" }, { id: "mind", n: "Mind" }, { id: "work", n: "Work" },
  { id: "recovery", n: "Recovery" }, { id: "nutrition", n: "Nutrition" }, { id: "other", n: "Other" }
];
const EVENT_CATS = [
  { id: "deep", n: "Deep work" }, { id: "routine", n: "Routine" }, { id: "break", n: "Breaks" },
  { id: "admin", n: "Admin" }, { id: "exercise", n: "Exercise" }, { id: "recovery", n: "Recovery" }, { id: "other", n: "Other" }
];
const CAT_COLOR = { deep: "#4FD8F5", routine: "#4F8FF5", break: "#7A8A93", admin: "#9B7FE0", exercise: "#4FD9A6", recovery: "#E8A33D", other: "#3E4C55" };

function defCore() {
  return {
    v: 1, calibrated: false, createdAt: Date.now(), firstDay: todayKey(),
    profile: { wake: "07:00", bed: "23:00", objective: "patterns", priorities: [], sleepTarget: 480 },
    settings: { groundMg: 28, instantMg: 57, chime: true, debriefHour: 20 },
    habits: [], experiments: [], dismissed: []
  };
}
function defDay(k) {
  return {
    date: k, sleep: null, ratings: {}, objectives: { primary: "", primaryDone: false, secondary: [] },
    habits: {}, caffeine: [], naps: [], focus: [], events: [], debriefAt: null
  };
}

const S = { core: defCore(), months: {}, loaded: new Set() };

function monthObj(mk) {
  if (!S.months[mk]) S.months[mk] = { days: {} };
  return S.months[mk];
}
function getDay(k, create) {
  const m = monthObj(mkey(k));
  if (!m.days[k] && create) m.days[k] = defDay(k);
  return m.days[k] || null;
}
function day(k) { return getDay(k, true); }
function dayRO(k) { const m = S.months[mkey(k)]; return (m && m.days[k]) || null; }

function saveCore() { Store.set("state/core", S.core); }
function saveDay(k) { Store.set("months/" + mkey(k), S.months[mkey(k)]); }

async function loadMonth(mk) {
  if (S.loaded.has(mk)) return;
  S.loaded.add(mk);
  const d = await Store.get("months/" + mk);
  if (d && d.days) S.months[mk] = d; else monthObj(mk);
}
async function loadMonths(n) {
  const jobs = [], d = new Date();
  for (let i = 0; i < n; i++) {
    const k = d.getFullYear() + "-" + p2(d.getMonth() + 1);
    jobs.push(loadMonth(k));
    d.setMonth(d.getMonth() - 1);
  }
  await Promise.all(jobs);
}

const activeHabits = () => (S.core.habits || []).filter(h => !h.archived);

/* Load the saved profile into S.core. Falls back to a fresh instrument. */
async function loadCore() {
  let core = null;
  try {
    await Store.init();
    core = await Store.get("state/core");
  } catch (e) { /* fall back to a fresh instrument */ }
  if (core && core.v) {
    S.core = Object.assign(defCore(), core);
    S.core.profile = Object.assign(defCore().profile, core.profile || {});
    S.core.settings = Object.assign(defCore().settings, core.settings || {});
    S.core.habits = core.habits || [];
    S.core.experiments = core.experiments || [];
    S.core.dismissed = core.dismissed || [];
  }
  return S.core;
}

/* ---------- onboarding options (setup.html, shown again in the welcome summary) ---------- */
const OBJECTIVES = [
  { id: "sleep", n: "Better sleep", s: "Duration, timing and consistency" },
  { id: "focus", n: "Better focus", s: "Longer, cleaner blocks of work" },
  { id: "consistency", n: "Better consistency", s: "Routines that actually hold" },
  { id: "energy", n: "More energy", s: "Fewer flat afternoons" },
  { id: "routines", n: "Better routines", s: "A day with a shape to it" },
  { id: "wellbeing", n: "Better wellbeing", s: "Mood and stress in view" },
  { id: "patterns", n: "Understand my patterns", s: "Learn how your own system behaves" }
];
const PRIORITIES = [
  { id: "sleep", n: "Sleep" }, { id: "focus", n: "Focus" }, { id: "energy", n: "Energy" },
  { id: "mood", n: "Mood & stress" }, { id: "routine", n: "Routines" }, { id: "caffeine", n: "Caffeine" }, { id: "recovery", n: "Naps & recovery" }
];
const STARTER = [
  { n: "Morning walk", cat: "movement" }, { n: "Deep work block", cat: "work" }, { n: "Training", cat: "movement" },
  { n: "Read", cat: "mind" }, { n: "Stretch", cat: "recovery" }, { n: "No screens after 22:30", cat: "recovery" },
  { n: "Water first thing", cat: "nutrition" }, { n: "Ten minutes quiet", cat: "mind" }
];

