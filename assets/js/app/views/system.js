/* MYTRA // app/views/system.js - System view (#system). */
"use strict";

/* ---------------- SYSTEM (level 3) ---------------- */
let SYS_TAB = "variables";
function renderSystem() {
  const root = $("#v-system");
  const tabs = [["variables", "Variables"], ["intelligence", "Intelligence"], ["experiments", "Experiments"], ["calendar", "History"], ["settings", "Settings"], ["data", "Data & safety"]];
  root.innerHTML = viewHead("System", "Level 3 // Intelligence") +
    '<div class="tabs" style="margin-bottom:18px">' + tabs.map(([id, l]) => '<button data-tab="' + id + '" class="' + (SYS_TAB === id ? "on" : "") + '">' + l + "</button>").join("") + "</div>";
  const stack = el("div", "stack");
  root.appendChild(stack);
  ({ variables: sysVariables, intelligence: sysIntelligence, experiments: sysExperiments, calendar: sysCalendar, settings: sysSettings, data: sysData }[SYS_TAB])(stack);
}

function sysVariables(stack) {
  const base = baselines();
  const h7 = dayHistory(7);
  const p = panel("Variables vs baseline", { flush: true, head: '<span class="lbl lbl-dim">7-day mean against your own 30-day baseline</span>' });
  const g = el("div", "glist");
  let any = false;
  VARS.forEach(v => {
    const a = vals(h7, v.id), b = base[v.id] && base[v.id].v;
    if (!a.length) return;
    const cur = mean(a);
    const row = el("div", "var");
    if (b == null) {
      row.innerHTML = '<span class="lbl" style="color:var(--text)">' + esc(v.n) + '</span>' +
        '<span class="hint" style="margin:0">Baseline forms after ' + BASE_MIN + ' readings — ' + (base[v.id] ? base[v.id].n : 0) + ' so far.</span>' +
        '<span class="rt" style="color:var(--dimmer)">' + esc(v.fmt(cur)) + "</span>";
    } else {
      const d = (cur - b) / Math.abs(b) * 100;
      const good = v.hb === 0 ? null : (v.hb > 0 ? d >= 0 : d <= 0);
      const w = clamp(Math.abs(d) / 40 * 50, 1, 50);
      row.innerHTML = '<span class="lbl" style="color:var(--text)">' + esc(v.n) + '</span>' +
        '<div class="bar"><div class="zero"></div><div class="f' + (good === false ? " neg" : "") + '" style="' +
        (d >= 0 ? "left:50%;width:" + w + "%" : "right:50%;width:" + w + "%") + '"></div></div>' +
        '<span class="rt ' + (good === null ? "flat" : good ? "up" : "dn") + '" style="color:' + (good === null ? "var(--dim)" : good ? "var(--good)" : "var(--warn)") + '">' + signedPct(d) + "</span>";
      row.title = v.n + ": " + v.fmt(cur) + " now, baseline " + v.fmt(b);
    }
    g.appendChild(row); any = true;
  });
  if (!any) p._bd.appendChild(emptyBlock("No variables yet", "Log a few days and MYTRA will start reporting each variable against your own normal range rather than a population average."));
  else p._bd.appendChild(g);
  stack.appendChild(p);

  const bp = panel("Your baseline", { flush: true, head: '<span class="st ' + (base.score.v != null ? "ac" : "off") + '"><i></i>' + (base.score.v != null ? "Baseline updated" : "Insufficient data") + "</span>" });
  const bg = el("div", "bigrow");
  const rows = [
    ["Sleep", base.sleepMin.v != null ? hmShort(base.sleepMin.v) : "—", base.sleepMin.n + " nights"],
    ["Bedtime", base.bedNorm.v != null ? fromMin(base.bedNorm.v) : "—", base.bedConsistency.v != null ? Math.round(base.bedConsistency.v) + "% consistent" : "—"],
    ["Focus", base.focusR.v != null ? fx(base.focusR.v, 1) + " / 10" : "—", base.focusR.n + " readings"],
    ["Energy", base.energy.v != null ? fx(base.energy.v, 1) + " / 10" : "—", base.energy.n + " readings"],
    ["Mood", base.mood.v != null ? fx(base.mood.v, 1) + " / 10" : "—", base.mood.n + " readings"],
    ["Caffeine", base.caffMg.v != null ? Math.round(base.caffMg.v) + "mg" : "—", base.caffMg.n + " days"],
    ["Routine", base.habitPct.v != null ? Math.round(base.habitPct.v) + "%" : "—", base.habitPct.n + " days"],
    ["Day score", base.score.v != null ? Math.round(base.score.v) : "—", base.score.n + " days"]
  ];
  bg.innerHTML = rows.map(r => '<div class="c"><span class="lbl">' + r[0] + '</span><span class="v">' + esc(r[1]) + '</span><div class="s">' + esc(r[2]) + "</div></div>").join("");
  bp._bd.appendChild(bg);
  bp._bd.insertAdjacentHTML("beforeend",
    '<p class="hint" style="padding:14px 16px;border-top:1px solid var(--line);margin:0">Baselines are a 30-day mean with the top and bottom tenth trimmed, so one unusual day cannot pull your normal range around. They move gradually, by design.</p>');
  stack.appendChild(bp);
}

function sysIntelligence(stack) {
  const ins = buildInsights();
  const p = panel("Intelligence engine", { head: '<span class="lbl lbl-dim">' + ins.length + " signal" + (ins.length === 1 ? "" : "s") + " detected</span>" });
  p._bd.innerHTML = '<p class="hint" style="margin:0 0 4px;max-width:70ch">MYTRA tests relationships between your own variables using ordinary correlation on paired days. It reports what moved together. It cannot tell you what caused what, and it does not try to.</p>';
  stack.appendChild(p);
  if (!ins.length) {
    const e = panel("No pattern detected");
    e._bd.appendChild(emptyBlock("Insufficient data", "MYTRA needs more observations. Continue logging for roughly 7–14 days. A relationship is only surfaced once it has at least eight paired days and a real effect size."));
    stack.appendChild(e);
  } else {
    const grid = el("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px";
    ins.forEach(i => grid.appendChild(signalCard(i)));
    stack.appendChild(grid);
  }
  const dm = (S.core.dismissed || []);
  if (dm.length) {
    const d = panel("Dismissed signals", { flush: true });
    const g = el("div", "dg");
    dm.forEach(id => {
      const rel = RELS.find(r => r.id === id);
      g.insertAdjacentHTML("beforeend", '<div class="r"><span class="k">' + esc(rel ? cap(rel.xn) + " → " + rel.yn : id) +
        '</span><button class="btn btn-q btn-sm" data-undismiss="' + esc(id) + '">Restore</button></div>');
    });
    d._bd.appendChild(g);
    stack.appendChild(d);
  }
}

function sysExperiments(stack) {
  const exps = S.core.experiments || [];
  const active = exps.filter(e => !e.closed);
  const done = exps.filter(e => e.closed);
  const p = panel("Experiments", { head: '<span class="lbl lbl-dim">' + active.length + " active</span>" });
  p._bd.innerHTML = '<p class="hint" style="margin:0;max-width:70ch">An experiment is a fixed window in which you deliberately hold one variable steady. MYTRA compares the outcome variable inside the window against the 30 days before it started. Start one from any signal in Intelligence.</p>';
  stack.appendChild(p);

  if (!active.length && !done.length) {
    const e = panel("No experiment running");
    e._bd.appendChild(emptyBlock("Nothing under test", "When a signal looks worth checking, run it for seven days. That is how an observation becomes something you actually know."));
    stack.appendChild(e);
    return;
  }
  active.concat(done).forEach(x => {
    const rel = RELS.find(r => r.id === x.relId);
    const elapsed = Math.min(x.days, Math.max(0, Math.round((parseKey(todayKey()) - parseKey(x.startK)) / 86400000) + 1));
    const readout = experimentReadout(x, rel);
    const pn = panel(x.closed ? "Experiment complete" : "Experiment active", {
      head: '<span class="lbl lbl-dim">' + esc(fmtDateShort(x.startK)) + " → " + esc(fmtDateShort(addDays(x.startK, x.days - 1))) + "</span>"
    });
    const b = el("div", "exp");
    b.innerHTML = '<div class="t">' + esc(x.title) + "</div>" +
      '<div><div class="prog"><i style="width:' + (elapsed / x.days * 100) + '%"></i></div>' +
      '<div class="lbl lbl-dim" style="margin-top:7px">Day ' + elapsed + " of " + x.days + "</div></div>" +
      (readout
        ? '<div class="dg" style="border:1px solid var(--line)">' +
          '<div class="r"><span class="k">' + esc(rel ? cap(rel.yn) : "Outcome") + ' during window</span><span class="v" style="color:var(--accent)">' + esc(readout.during) + "</span></div>" +
          '<div class="r"><span class="k">30 days before</span><span class="v">' + esc(readout.before) + "</span></div>" +
          '<div class="r"><span class="k">Change</span><span class="v" style="color:' + (readout.up ? "var(--good)" : "var(--warn)") + '">' + esc(readout.delta) + "</span></div></div>" +
          '<p class="hint" style="margin:0">' + esc(readout.note) + "</p>"
        : '<p class="hint" style="margin:0">Not enough readings inside the window yet. Keep logging ' + esc(rel ? rel.yn : "the outcome") + " each day.</p>") +
      '<div style="display:flex;gap:8px">' +
      (x.closed ? "" : '<button class="btn btn-q btn-sm" data-close-exp="' + esc(x.id) + '">Close experiment</button>') +
      '<button class="btn btn-q btn-sm" data-del-exp="' + esc(x.id) + '">Delete</button></div>';
    pn._bd.appendChild(b);
    stack.appendChild(pn);
  });
}

function experimentReadout(x, rel) {
  if (!rel) return null;
  const keys = [];
  for (let i = 0; i < x.days; i++) { const k = addDays(x.startK, i); if (k <= todayKey()) keys.push(k); }
  const during = keys.map(metrics).map(m => m[rel.y]).filter(v => v != null);
  if (during.length < 3) return null;
  const beforeKeys = [];
  for (let i = 1; i <= 30; i++) beforeKeys.push(addDays(x.startK, -i));
  const before = beforeKeys.map(metrics).map(m => m[rel.y]).filter(v => v != null);
  if (before.length < 5) return null;
  const a = mean(during), b = mean(before);
  const dpc = (a - b) / Math.abs(b) * 100;
  return {
    during: rel.yf(a) + "  (" + during.length + "d)",
    before: rel.yf(b) + "  (" + before.length + "d)",
    delta: signedPct(dpc), up: dpc >= 0,
    note: "A change across " + during.length + " days is a hint, not a conclusion. Other things moved in this window too."
  };
}

function startExperiment(insId) {
  const ins = buildInsights().find(i => i.id === insId) || null;
  const rel = RELS.find(r => r.id === insId);
  if (!rel) { toast("Signal no longer available", "warn"); return; }
  modal({
    title: "Run experiment",
    build(bd) {
      bd.innerHTML =
        '<div><span class="lbl">Hypothesis under test</span><p style="margin:8px 0 0;font-size:13.5px;line-height:1.6">' +
        esc(ins ? ins.experiment : rel.exp(0)) + "</p></div>" +
        field("Window", '<select class="in" id="ex-d"><option value="7">7 days</option><option value="14">14 days</option><option value="21">21 days</option></select>') +
        field("Name it", '<input class="in" id="ex-t" type="text" maxlength="90" value="' + esc(cap(rel.xn) + " → " + rel.yn) + '">') +
        '<p class="hint" style="margin:0">MYTRA will compare ' + esc(rel.yn) + " inside the window against the 30 days before it.</p>";
    },
    actions: [
      { label: "Cancel", kind: "btn-q", fn: closeModal },
      {
        label: "Start", kind: "btn-p", fn() {
          const bd = $("#ov .md-bd");
          S.core.experiments.push({
            id: uid(), relId: rel.id, title: $("#ex-t", bd).value.trim() || rel.id,
            days: Number($("#ex-d", bd).value), startK: todayKey(), closed: false
          });
          saveCore(); closeModal(); SYS_TAB = "experiments"; goView("system"); toast("Experiment active");
        }
      }
    ]
  });
}

function sysCalendar(stack) {
  const p = panel("Calendar", { head: '<span class="lbl lbl-dim">Select a day to open its record</span>' });
  const w = el("div"); p._bd.appendChild(w);
  drawCalendar(w);
  stack.appendChild(p);
  const h30 = dayHistory(30).filter(m => m.score != null);
  const s = panel("Recent records", { flush: true });
  if (!h30.length) s._bd.appendChild(emptyBlock("No records yet", "Days appear here once they carry enough readings for a day score."));
  else {
    const g = el("div", "dg");
    h30.slice().reverse().slice(0, 14).forEach(m => g.insertAdjacentHTML("beforeend",
      '<div class="r" data-open="' + m.date + '" style="cursor:pointer"><span class="lbl lbl-dim" style="width:74px;flex:none">' + esc(fmtDateShort(m.date)) + "</span>" +
      '<span class="k">Sleep ' + hm(m.sleepMin) + " · Focus " + (m.focusSec ? durShort(m.focusSec) : "—") + " · Routine " + (m.habitPct != null ? Math.round(m.habitPct) + "%" : "—") + "</span>" +
      '<span class="v" style="color:var(--accent)">' + m.score + "</span></div>"));
    s._bd.appendChild(g);
  }
  stack.appendChild(s);
}

function sysSettings(stack) {
  const st = S.core.settings, pr = S.core.profile;
  const p = panel("Calibration");
  p._bd.innerHTML =
    '<div class="row2">' +
    field("Target wake time", '<input class="in" id="se-wake" type="time" value="' + esc(pr.wake) + '">') +
    field("Target bedtime", '<input class="in" id="se-bed" type="time" value="' + esc(pr.bed) + '">') +
    "</div>" +
    field("Sleep target", '<input class="in" id="se-target" type="number" min="240" max="720" step="15" value="' + pr.sleepTarget + '">', "Minutes. Used only for the sleep component of your day score.") +
    field("Debrief prompt from", '<select class="in" id="se-dh">' + [18, 19, 20, 21, 22, 23].map(h => '<option value="' + h + '"' + (st.debriefHour === h ? " selected" : "") + ">" + p2(h) + ":00</option>").join("") + "</select>") +
    '<div class="sepline"></div>' +
    '<span class="lbl">Caffeine calibration</span>' +
    '<div class="row2">' +
    field("Ground coffee — mg per teaspoon", '<input class="in" id="se-ground" type="number" min="5" max="90" step="1" value="' + st.groundMg + '">') +
    field("Instant coffee — mg per teaspoon", '<input class="in" id="se-instant" type="number" min="5" max="120" step="1" value="' + st.instantMg + '">') +
    "</div>" +
    '<p class="hint" style="margin:0">Defaults are 28 mg per level teaspoon of ground coffee and 57 mg for instant. Real beans vary by roast, grind and dose — if you know your own figure, put it here and every calculation follows it.</p>' +
    '<div class="sepline"></div>' +
    '<label style="display:flex;align-items:center;gap:9px;cursor:pointer"><input type="checkbox" id="se-chime"' + (st.chime ? " checked" : "") + '><span>Chime at the end of a focus phase</span></label>' +
    '<button class="btn btn-p" id="se-save" style="align-self:flex-start">Save calibration</button>';
  p._bd.style.display = "flex"; p._bd.style.flexDirection = "column"; p._bd.style.gap = "16px";
  on($("#se-save", p), "click", () => {
    pr.wake = $("#se-wake", p).value || pr.wake;
    pr.bed = $("#se-bed", p).value || pr.bed;
    pr.sleepTarget = clamp(Number($("#se-target", p).value) || 480, 240, 720);
    st.debriefHour = Number($("#se-dh", p).value);
    st.groundMg = clamp(Number($("#se-ground", p).value) || 28, 5, 90);
    st.instantMg = clamp(Number($("#se-instant", p).value) || 57, 5, 120);
    st.chime = $("#se-chime", p).checked;
    saveCore(); toast("Calibration saved"); render();
  });
  stack.appendChild(p);

  const rp = panel("Routines", { head: '<button class="btn btn-q btn-sm" data-act="routines">Configure</button>', flush: true });
  const hs = S.core.habits || [];
  if (!hs.length) rp._bd.appendChild(emptyBlock("No active routines", "Configure your first routine to begin tracking."));
  else {
    const g = el("div", "dg");
    hs.forEach((h, i) => {
      const s = habitStats(h.id, 90);
      g.insertAdjacentHTML("beforeend", '<div class="r"><span class="mono" style="font-size:10px;color:var(--dimmest);width:18px">' + p2(i + 1) + "</span>" +
        '<span class="k" style="text-transform:none;letter-spacing:0;font-family:var(--sans);font-size:13px;color:' + (h.archived ? "var(--dimmer)" : "var(--text)") + '">' + esc(h.name) + "</span>" +
        '<span class="lbl lbl-dim">' + esc((HABIT_CATS.find(c => c.id === h.cat) || { n: "Other" }).n) + "</span>" +
        '<span class="v">' + (s.completion != null ? Math.round(s.completion) + "%" : "—") + "</span></div>");
    });
    rp._bd.appendChild(g);
  }
  stack.appendChild(rp);
}

function sysData(stack) {
  const p = panel("Your data belongs to you");
  p._bd.style.cssText = "display:flex;flex-direction:column;gap:16px";
  const nDays = Object.values(S.months).reduce((s, m) => s + Object.keys(m.days || {}).length, 0);
  p._bd.innerHTML =
    '<div class="dg" style="border:1px solid var(--line)">' +
    '<div class="r"><span class="k">Storage</span><span class="v" style="font-size:12px">' + (Store.cloud ? "Your account · synced" : "This browser only") + "</span></div>" +
    '<div class="r"><span class="k">Days on record</span><span class="v">' + nDays + "</span></div>" +
    '<div class="r"><span class="k">Routines</span><span class="v">' + (S.core.habits || []).length + "</span></div>" +
    '<div class="r"><span class="k">First entry</span><span class="v" style="font-size:12px">' + esc(S.core.firstDay || "—") + "</span></div>" +
    "</div>" +
    '<p class="hint" style="margin:0;max-width:70ch">Everything you log is stored against your own account and read by nothing else. There is no advertising in MYTRA, no third-party analytics, and no sale or sharing of personal data. Export takes everything with you in a single JSON file.</p>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
    '<button class="btn" id="dt-export">Export all data</button>' +
    '<button class="btn btn-d" id="dt-wipe">Delete all data</button>' +
    "</div>";
  on($("#dt-export", p), "click", exportData);
  on($("#dt-wipe", p), "click", confirmWipe);
  stack.appendChild(p);

  const sp = panel("What MYTRA is not");
  sp._bd.innerHTML =
    '<div class="warnbox"><span class="lbl">Not medical software</span>' +
    '<p>MYTRA supports self-reflection and behaviour change. The word “therapeutic” in its name refers to that, and nothing more. It does not diagnose, treat or manage any medical or mental-health condition, it makes no medical claims, and <b>it can be wrong</b> — the readings you enter, the baselines it computes and the relationships it reports can all mislead. It is not a substitute for a doctor, therapist, psychologist, sleep specialist or emergency service. If anything about your health concerns you, consult a qualified physician.</p></div>' +
    '<div class="critbox" style="margin-top:16px"><span class="lbl">If you are struggling</span>' +
    '<p>If you are in crisis or thinking about harming yourself, please contact your local emergency number or a crisis line in your country right now — in the US and Canada call or text <b>988</b>; in the UK and Ireland call <b>116 123</b> (Samaritans); elsewhere, <b>findahelpline.com</b> lists services by country.</p>' +
    '<p style="margin-bottom:0">MYTRA is a logbook. A person is better.</p></div>' +
    '<p class="hint" style="margin-top:16px">Correlation is not causation. MYTRA reports that two of your variables moved together over a number of days; it cannot rule out the many other things that changed at the same time. Treat every signal as a question worth testing, never as an instruction.</p>';
  stack.appendChild(sp);

  const ap = panel("About");
  ap._bd.innerHTML =
    '<div class="dg" style="border:1px solid var(--line)">' +
    '<div class="r"><span class="k">System</span><span class="v" style="font-size:12px">MYTRA — My Therapeutic Resource Assistant</span></div>' +
    '<div class="r"><span class="k">Build</span><span class="v" style="font-size:12px">' + BUILD + "</span></div>" +
    '<div class="r"><span class="k">Analysis</span><span class="v" style="font-size:12px">Local statistics · no model calls</span></div>' +
    "</div>" +
    '<p class="hint" style="margin:14px 0 0">Every number in this application is computed in your browser from entries you made. Nothing is generated, estimated or inferred by a language model.</p>';
  stack.appendChild(ap);
}

async function exportData() {
  const payload = { app: "MYTRA", version: VER, exportedAt: new Date().toISOString(), demo: Store.demo, core: S.core, months: S.months };
  const json = JSON.stringify(payload, null, 2);
  let dl = null;
  try { if (window.claude && window.claude.use) dl = await window.claude.use("downloads"); } catch (e) {}
  if (dl) {
    try {
      await dl.save({ filename: "mytra-export-" + todayKey() + ".json", data: json });
      toast("Export saved"); return;
    } catch (e) { /* viewer declined or unavailable — fall through */ }
  }
  modal({
    title: "Export data",
    build(bd) {
      bd.innerHTML = '<p class="hint" style="margin:0">A direct file save is not available here. Select everything below and copy it — this is your complete record.</p>' +
        '<textarea class="in" readonly style="height:280px;font-family:var(--mono);font-size:11px">' + esc(json) + "</textarea>";
      setTimeout(() => { const t = $("textarea", bd); t.focus(); t.select(); }, 60);
    },
    actions: [{ label: "Close", kind: "btn-p", fn: closeModal }]
  });
}

function confirmWipe() {
  if (Store.demo) { toast("Demo data is never saved anywhere", "warn"); return; }
  modal({
    title: "Delete all data",
    build(bd) {
      bd.innerHTML = '<div class="critbox"><span class="lbl">This cannot be undone</span>' +
        '<p style="margin-bottom:0">Every day record, routine, focus session and experiment will be removed from your account and from this browser. Export first if you want to keep a copy.</p></div>' +
        field("Type DELETE to confirm", '<input class="in" id="wp-c" type="text" placeholder="DELETE" autocomplete="off">');
    },
    actions: [
      { label: "Cancel", kind: "btn-q", fn: closeModal },
      {
        label: "Delete everything", kind: "btn-d", async fn() {
          const bd = $("#ov .md-bd");
          if (($("#wp-c", bd).value || "").trim().toUpperCase() !== "DELETE") { toast("Type DELETE to confirm", "warn"); return; }
          const paths = ["state/core"].concat(Object.keys(S.months).map(m => "months/" + m));
          for (const pth of paths) await Store.del(pth);
          try { Object.keys(localStorage).filter(x => x.indexOf("mytra:") === 0).forEach(x => localStorage.removeItem(x)); } catch (e) {}
          S.core = defCore(); S.months = {}; S.loaded = new Set();
          feReset();
          closeModal();
          toast("All data deleted", "crit");
          location.reload();
        }
      }
    ]
  });
}
