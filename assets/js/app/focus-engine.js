/* MYTRA // app/focus-engine.js - focus timer state machine. */
"use strict";

/* ============================================================
   FOCUS ENGINE
   Timestamp-driven so it stays accurate across tab throttling,
   and persisted so a reload resumes the running session.
   ============================================================ */
const FMODES = {
  free: { n: "Free run", s: "Open-ended", work: null },
  p25:  { n: "Pomodoro", s: "25 / 5 · long 15", work: 25, brk: 5, long: 15, cycles: 4 },
  p45:  { n: "Long pomodoro", s: "45 / 15", work: 45, brk: 15, long: 15, cycles: 1 }
};
let FE = { mode: "p25", phase: "idle", task: "", startTs: null, endTs: null, cycle: 0, accum: 0, paused: false };
const FE_KEY = "mytra:v1:focus-engine";

function feSave() { try { localStorage.setItem(FE_KEY, JSON.stringify(FE)); } catch (e) {} }
function feLoad() {
  try { const r = localStorage.getItem(FE_KEY); if (r) { const o = JSON.parse(r); if (o && o.mode) FE = Object.assign(FE, o); } } catch (e) {}
  if (FE.phase !== "idle" && !FE.paused && FE.endTs && Date.now() > FE.endTs + 6 * 3600 * 1000) feReset();
}
function feReset() { FE = { mode: FE.mode, phase: "idle", task: "", startTs: null, endTs: null, cycle: 0, accum: 0, paused: false }; feSave(); }

let AC = null;
function chime(times) {
  if (!S.core.settings.chime) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
    const n = times || 3;
    for (let i = 0; i < n; i++) {
      const t = AC.currentTime + i * 0.34;
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(i === n - 1 ? 1320 : 880, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.30);
      o.connect(g); g.connect(AC.destination);
      o.start(t); o.stop(t + 0.32);
    }
  } catch (e) { /* audio unavailable — the visual state still changes */ }
}

function phaseMins(phase) {
  const m = FMODES[FE.mode];
  if (phase === "work") return m.work;
  if (phase === "brk") return m.brk;
  if (phase === "long") return m.long;
  return null;
}
function feElapsed() {
  if (FE.phase === "idle") return 0;
  if (FE.paused) return FE.accum / 1000;
  return (FE.accum + (Date.now() - FE.startTs)) / 1000;
}
function feStart(phase) {
  FE.phase = phase;
  FE.accum = 0;
  FE.paused = false;
  FE.startTs = Date.now();
  const mins = phaseMins(phase);
  FE.endTs = mins ? FE.startTs + mins * 60000 : null;
  feSave();
}
function fePause() {
  if (FE.phase === "idle" || FE.paused) return;
  FE.accum += Date.now() - FE.startTs;
  FE.paused = true; FE.startTs = null;
  feSave(); renderFocusDial();
}
function feResume() {
  if (!FE.paused) return;
  FE.startTs = Date.now(); FE.paused = false;
  const mins = phaseMins(FE.phase);
  FE.endTs = mins ? FE.startTs + (mins * 60000 - FE.accum) : null;
  feSave(); renderFocusDial();
}
function logFocusSession(sec, opts) {
  if (sec < 45) return null;
  const k = todayKey(), d = day(k);
  const startMin = Math.max(0, nowMin() - Math.round(sec / 60));
  const s = {
    id: uid(), start: fromMin(startMin), sec: Math.round(sec),
    mode: FE.mode, task: (opts && opts.task) || FE.task || "",
    rating: (opts && opts.rating) || null, distractions: (opts && opts.distractions) != null ? opts.distractions : null
  };
  d.focus.push(s);
  saveDay(k);
  return s;
}
function feEndWork(auto) {
  const sec = feElapsed();
  const s = logFocusSession(sec);
  if (auto) {
    const m = FMODES[FE.mode];
    FE.cycle++;
    const next = (FE.mode === "p25" && FE.cycle % m.cycles === 0) ? "long" : (FE.mode === "p45" ? "long" : "brk");
    feStart(next);
    chime(3);
  } else {
    feReset();
  }
  render();
  if (s) openSessionComplete(s);
  else if (!auto) toast("Session under 45s — not recorded", "warn");
}
function openSessionComplete(s) {
  modal({
    title: "Session complete",
    build(bd) {
      bd.innerHTML =
        '<div class="bigrow" style="border:1px solid var(--line)">' +
        '<div class="c"><span class="lbl">Duration</span><span class="v" style="color:var(--accent)">' + dur(s.sec) + '</span><div class="s">' + esc(FMODES[s.mode].n) + '</div></div>' +
        '<div class="c"><span class="lbl">Today</span><span class="v">' + dur(metrics(todayKey()).focusSec || 0) + '</span><div class="s">total focus</div></div>' +
        "</div>" +
        field("What were you working on", '<input class="in" id="fc-t" type="text" maxlength="80" value="' + esc(s.task) + '" placeholder="Optional">') +
        '<div class="row2">' +
        field("Distractions", '<input class="in" id="fc-d" type="number" min="0" max="99" step="1" placeholder="Optional">') +
        "<div></div></div>" +
        scaleHTML("Focus quality", null, "scattered", "locked in") +
        '<span class="hint">Every field here is optional. The duration is already recorded.</span>';
      wireScales(bd);
    },
    actions: [
      { label: "Skip", kind: "btn-q", fn: () => { closeModal(); render(); } },
      {
        label: "Save", kind: "btn-p", fn() {
          const bd = $("#ov .md-bd");
          const k = todayKey(), d = day(k);
          const t = d.focus.find(f => f.id === s.id);
          if (t) {
            t.task = $("#fc-t", bd).value.trim();
            const dd = $("#fc-d", bd).value;
            t.distractions = dd === "" ? null : Number(dd);
            t.rating = scaleVal(bd, "Focus quality");
            saveDay(k);
          }
          closeModal(); toast("Session logged"); render();
        }
      }
    ]
  });
}

let feTimer = null;
function feTick() {
  if (FE.phase === "idle") return;
  if (!FE.paused && FE.endTs && Date.now() >= FE.endTs) {
    if (FE.phase === "work") { feEndWork(true); return; }
    chime(2);
    feStart("work");
    render();
    return;
  }
  renderFocusDial();
}
function startFeLoop() { clearInterval(feTimer); feTimer = setInterval(feTick, 250); }

let dialCache = "";
function renderFocusDial() {
  const rd = $("#fe-rd"); if (!rd) return;
  const mins = phaseMins(FE.phase);
  const elapsed = feElapsed();
  let showSec, frac;
  if (FE.phase === "idle") { showSec = 0; frac = 0; }
  else if (mins) { showSec = Math.max(0, mins * 60 - elapsed); frac = clamp(elapsed / (mins * 60), 0, 1); }
  else { showSec = elapsed; frac = (elapsed % 3600) / 3600; }
  /* redraw only when the visible second changes — the loop runs 4x/s for accuracy */
  const stamp = FE.phase + "|" + FE.paused + "|" + Math.floor(showSec) + "|" + FE.cycle;
  if (stamp === dialCache) return;
  dialCache = stamp;
  rd.textContent = dur(showSec);
  rd.className = "rd" + (FE.phase !== "idle" && !FE.paused ? " run" : "");
  const ph = $("#fe-ph");
  if (ph) ph.textContent = FE.phase === "idle" ? "Standby" :
    FE.paused ? "Paused · " + (FE.phase === "work" ? "work" : "break") :
    FE.phase === "work" ? "Work phase" : FE.phase === "long" ? "Long break" : "Break";
  const ring = $("#fe-ring");
  if (ring) drawRing(ring, frac, "", "", FE.phase !== "idle" && !FE.paused);
  const pd = $("#fe-pomo");
  if (pd) {
    const m = FMODES[FE.mode], total = m.cycles || 1;
    const rem = FE.cycle % total;
    const filled = (FE.cycle > 0 && rem === 0) ? total : rem;
    pd.innerHTML = Array.from({ length: total }, (_, i) => '<i class="' + (i < filled ? "f" : "") + '"></i>').join("");
  }
  const tt = $("#fe-task");
  if (tt) tt.textContent = FE.task || (FE.phase === "idle" ? "" : "Unlabelled session");
  const bs = $("#fe-btns");
  if (bs) {
    if (FE.phase === "idle") {
      bs.innerHTML = '<button class="btn btn-p" data-fe="start">Initiate session</button>';
    } else if (FE.paused) {
      bs.innerHTML = '<button class="btn btn-p" data-fe="resume">Resume</button><button class="btn" data-fe="end">End session</button>';
    } else {
      bs.innerHTML = '<button class="btn" data-fe="pause">Pause</button><button class="btn" data-fe="end">End session</button>' +
        (FE.phase !== "work" ? '<button class="btn btn-q" data-fe="skip">Skip break</button>' : "");
    }
  }
}
function feAction(a) {
  if (a === "start") {
    const t = $("#fe-taskin");
    FE.task = t ? t.value.trim() : "";
    feStart("work");
    if (AC && AC.state === "suspended") AC.resume();
    else chime(1);
    render();
  }
  else if (a === "pause") fePause();
  else if (a === "resume") feResume();
  else if (a === "end") { if (FE.phase === "work") feEndWork(false); else { feReset(); render(); } }
  else if (a === "skip") { feStart("work"); render(); }
}
