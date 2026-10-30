/* MYTRA // app/main.js - routing, event delegation, boot, init. Loaded last. */
"use strict";

/* ============================================================
   SHELL: routing, delegation, boot
   ============================================================ */
const VIEWS = { mission: renderMission, today: renderToday, calendar: renderCalendarSoon, focus: renderFocus, telemetry: renderTelemetry, system: renderSystem };
const VIEW_TITLES = { mission: "Mission control", today: "Today", calendar: "Calendar", focus: "Focus engine", telemetry: "Telemetry", system: "System" };
let CUR = "mission";

function render() {
  const node = $("#v-" + CUR);
  try {
    VIEWS[CUR]();
  } catch (err) {
    node.innerHTML = "";
    const p = panel("Telemetry interrupted", { head: '<span class="st cr"><i></i>Read error</span>' });
    p._bd.innerHTML = '<div class="critbox"><span class="lbl">This panel could not be built</span>' +
      '<p>Your data is intact — the display failed, not the record. Try again, or switch view and come back.</p>' +
      '<p class="mono" style="font-size:11px;color:var(--dimmer);margin:0">' + esc(String(err && err.message || err)) + "</p></div>" +
      '<button class="btn btn-p" onclick="render()" style="margin-top:14px">Retry</button>';
    node.appendChild(p);
    if (window.console) console.error(err);
  }
  updateTop();
}
/* ---------- hash routing: every view has its own URL (#mission, #today …) ---------- */
function viewFromHash() {
  const v = location.hash.replace(/^#\/?/, "");
  return VIEWS[v] ? v : "mission";
}
function goView(v) {
  if (!VIEWS[v]) return;
  if (viewFromHash() !== v) { location.hash = v; return; } /* hashchange calls showView */
  showView(v);
}
function showView(v) {
  CUR = v;
  Object.keys(VIEWS).forEach(x => $("#v-" + x).classList.toggle("hide", x !== v));
  $$("[data-view]").forEach(b => {
    const onIt = b.dataset.view === v;
    b.classList.toggle("on", onIt);
    if (onIt) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  document.title = VIEW_TITLES[v] + " · MYTRA";
  render();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}
on(window, "hashchange", () => {
  if ($("#app").classList.contains("hide")) return;
  const raw = location.hash.replace(/^#\/?/, "");
  if (raw && !VIEWS[raw]) return; /* in-page anchors such as the skip link */
  showView(viewFromHash());
});

function enterApp() {
  $("#app").classList.remove("hide");
  document.body.style.overflow = "";
  syncBadge();
  startFeLoop();
  showView(viewFromHash());
}

function updateTop() {
  const n = new Date();
  $("#top-date").textContent = fmtDate(todayKey());
  $("#top-clock").textContent = p2(n.getHours()) + ":" + p2(n.getMinutes()) + ":" + p2(n.getSeconds());
}
setInterval(() => {
  if ($("#app").classList.contains("hide")) return;
  updateTop();
  const nw = $(".tl-now");
  if (nw) nw.style.left = "calc(var(--tlpad) + " + (nowMin() / 1440) + " * (100% - var(--tlpad)))";
}, 1000);

/* ---------- delegation ---------- */
const ACTIONS = {
  caffeine: openCaffeine, nap: openNap, sleep: () => openSleep(), event: openEvent,
  objectives: openObjectives, routines: openRoutineEditor, morning: openMorningCheck,
  debrief: openDebrief, "focus-go": () => goView("focus")
};
const DEL_MAP = { caffeine: "caffeine", nap: "naps", "focus-go": "focus", event: "events" };

on(document, "click", e => {
  const t = e.target;
  const hit = sel => t.closest(sel);

  /* view links (#mission, #today …) are plain anchors handled by hashchange */

  const gt = hit("[data-goto]");
  if (gt) { if (gt.dataset.goto === "system") SYS_TAB = "intelligence"; goView(gt.dataset.goto); return; }

  const act = hit("[data-act]");
  if (act && ACTIONS[act.dataset.act]) { ACTIONS[act.dataset.act](); return; }

  const tg = hit("[data-toggle]");
  if (tg) { toggleHabit(tg.dataset.toggle); return; }

  const ob = hit("[data-obj]");
  if (ob) { const k = todayKey(), d = day(k); d.objectives.primaryDone = !d.objectives.primaryDone; saveDay(k); render(); toast(d.objectives.primaryDone ? "Objective closed" : "Objective reopened"); return; }

  const sc = hit("[data-sec]");
  if (sc) { const k = todayKey(), d = day(k), i = Number(sc.dataset.sec); if (d.objectives.secondary[i]) { d.objectives.secondary[i].done = !d.objectives.secondary[i].done; saveDay(k); render(); } return; }

  const dl = hit("[data-del]");
  if (dl) {
    const [a, id] = dl.dataset.del.split(":");
    const key = DEL_MAP[a]; if (!key) return;
    const k = todayKey(), d = day(k);
    d[key] = (d[key] || []).filter(x => x.id !== id);
    saveDay(k); render(); toast("Entry removed");
    return;
  }

  const ex = hit("[data-exp]");
  if (ex) { startExperiment(ex.dataset.exp); return; }

  const dm = hit("[data-dismiss]");
  if (dm) { S.core.dismissed = (S.core.dismissed || []).concat([dm.dataset.dismiss]); saveCore(); render(); toast("Signal dismissed"); return; }

  const ud = hit("[data-undismiss]");
  if (ud) { S.core.dismissed = (S.core.dismissed || []).filter(x => x !== ud.dataset.undismiss); saveCore(); render(); return; }

  const ce = hit("[data-close-exp]");
  if (ce) { const x = S.core.experiments.find(y => y.id === ce.dataset.closeExp); if (x) { x.closed = true; saveCore(); render(); toast("Experiment closed"); } return; }

  const de = hit("[data-del-exp]");
  if (de) { S.core.experiments = S.core.experiments.filter(y => y.id !== de.dataset.delExp); saveCore(); render(); return; }

  const tb = hit("[data-tab]");
  if (tb) { SYS_TAB = tb.dataset.tab; render(); return; }

  const rg = hit("[data-range]");
  if (rg) {
    RANGE = Number(rg.dataset.range);
    const need = Math.ceil(RANGE / 28) + 1;
    loadMonths(Math.min(14, need)).then(render);
    render();
    return;
  }

  const fe = hit("[data-fe]");
  if (fe) { feAction(fe.dataset.fe); return; }

  const op = hit("[data-open]");
  if (op) { openDayRecord(op.dataset.open); return; }
});

on(document, "keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (document.activeElement && document.activeElement.tagName) || "";
  if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
  if (!$("#ov").classList.contains("hide")) return;
  if ($("#app").classList.contains("hide")) return;
  const map = { 1: "mission", 2: "today", 3: "calendar", 4: "focus", 5: "telemetry", 6: "system" };
  if (map[e.key]) { goView(map[e.key]); return; }
  if (e.key.toLowerCase() === "c") { openCaffeine(); e.preventDefault(); }
  if (e.key.toLowerCase() === "d") { openDebrief(); e.preventDefault(); }
});

/* ---------- boot sequence ---------- */
function type(node, text, speed) {
  return new Promise(res => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { node.innerHTML = text; res(); return; }
    let i = 0;
    node.innerHTML = '<span class="cur"></span>';
    const t = setInterval(() => {
      i++;
      node.innerHTML = esc(text.slice(0, i)) + (i < text.length ? '<span class="cur"></span>' : "");
      if (i >= text.length) { clearInterval(t); res(); }
    }, speed || 22);
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

async function runBoot() {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bar = $("#boot-bar");
  const step = p => { bar.style.right = (100 - p) + "%"; };
  await type($("#boot-l1"), "MYTRA system", 26); step(18);
  await wait(reduce ? 40 : 130);
  await type($("#boot-l2"), "Initializing telemetry...", 18); step(58);
  await wait(reduce ? 40 : 120);
  await type($("#boot-l3"), "Loading personal model...", 18); step(88);
  await wait(reduce ? 40 : 160);
  step(100);
  await type($("#boot-l4"), "System ready", 26);
  await wait(reduce ? 60 : 320);
}

/* ---------- init ---------- */
(async function init() {
  /* Facade: only the demo runs. There is no sign-in, setup or saved data in this version, so
     anyone who reaches the app without ?demo=1 sees the "we're working on it" page instead. */
  if (!new URLSearchParams(location.search).has("demo")) { location.replace("../unavailable.html"); return; }
  $("#rail-build").textContent = BUILD;
  feLoad();

  await runBoot();
  $("#boot").classList.add("hide");
  enterDemo();

  on(document, "visibilitychange", () => { if (document.visibilityState === "visible" && !$("#app").classList.contains("hide")) { renderFocusDial(); updateTop(); } });
})();

