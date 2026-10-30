/* MYTRA // ui/components.js - toast, sync badge, modal, form builders, panels. Needs utils.js. */
"use strict";

/* ---------- ui chrome ---------- */
let toastT = null;
function toast(msg, kind) {
  const t = $("#toast");
  $("#toast-t").textContent = msg;
  const dot = $("#toast .st");
  dot.className = "st " + (kind === "warn" ? "wn" : kind === "crit" ? "cr" : kind === "info" ? "ac" : "on");
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 1900);
}
function syncBadge() {
  const n = $("#sync-st"); if (!n) return;
  if (Store.demo) { n.className = "st wn"; $("span", n).textContent = "Demo · not saved"; return; }
  if (!Store.cloud) { n.className = "st off"; $("span", n).textContent = "This device only"; return; }
  if (Store.failed) { n.className = "st wn"; $("span", n).textContent = "Sync retrying"; return; }
  n.className = "st on"; $("span", n).textContent = "Data synced";
}

/* ============================================================
   MODALS + LOGGING
   Every entry point is reachable in one tap from the console and
   closes in two or three. No long forms.
   ============================================================ */
let lastFocused = null;
function closeModal() {
  const ov = $("#ov");
  ov.classList.add("hide"); ov.innerHTML = "";
  document.body.style.overflow = "";
  if (lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (e) {} }
}
function modal(cfg) {
  lastFocused = document.activeElement;
  const ov = $("#ov");
  ov.innerHTML = "";
  const md = el("div", "md bez fade");
  md.setAttribute("aria-label", cfg.title);
  const hd = el("div", "md-hd");
  hd.innerHTML = '<span class="lbl">' + esc(cfg.title) + '</span>';
  const x = el("button", "x", "×"); x.setAttribute("aria-label", "Close"); on(x, "click", closeModal);
  hd.appendChild(x);
  md.appendChild(hd);
  const bd = el("div", "md-bd");
  md.appendChild(bd);
  ov.appendChild(md);
  ov.classList.remove("hide");
  document.body.style.overflow = "hidden";
  if (cfg.build) cfg.build(bd, md);
  if (cfg.actions) {
    const ft = el("div", "md-ft");
    cfg.actions.forEach(a => {
      const b = el("button", "btn " + (a.kind || ""), esc(a.label));
      on(b, "click", () => a.fn(b));
      ft.appendChild(b);
    });
    md.appendChild(ft);
  }
  const first = $("input,select,textarea,button.btn-p", bd) || x;
  setTimeout(() => { try { first.focus(); } catch (e) {} }, 40);
  return { bd, md };
}
on(document, "keydown", e => {
  if (e.key === "Escape" && !$("#ov").classList.contains("hide")) closeModal();
});
on($("#ov"), "click", e => { if (e.target.id === "ov") closeModal(); });

/* ---------- small builders ---------- */
function field(label, html, hint) {
  return '<label class="fld"><span class="lbl">' + esc(label) + "</span>" + html +
    (hint ? '<span class="hint">' + esc(hint) + "</span>" : "") + "</label>";
}
function scaleHTML(name, val, loLabel, hiLabel) {
  let h = '<div class="fld"><div class="scale-hd"><span class="lbl">' + esc(name) + '</span><span class="lbl lbl-dim">' + esc(loLabel) + " → " + esc(hiLabel) + '</span></div><div class="scale" data-scale="' + esc(name) + '">';
  for (let i = 1; i <= 10; i++) h += '<button type="button" data-v="' + i + '"' + (val === i ? ' class="sel"' : "") + ">" + i + "</button>";
  return h + "</div></div>";
}
function wireScales(root) {
  $$(".scale", root).forEach(sc => {
    on(sc, "click", e => {
      const b = e.target.closest("button[data-v]"); if (!b) return;
      $$("button", sc).forEach(x => x.classList.remove("sel"));
      b.classList.add("sel");
      sc.dataset.value = b.dataset.v;
    });
  });
}
function scaleVal(root, name) {
  const sc = $$(".scale", root).find(s => s.dataset.scale === name);
  if (!sc) return null;
  const sel = $("button.sel", sc);
  return sel ? Number(sel.dataset.v) : null;
}
const timeNow = () => fromMin(nowMin());

/* ---------- shared blocks ---------- */
function emptyBlock(title, body) {
  const n = el("div", "empty");
  n.innerHTML = '<span class="st off"><i></i></span><span class="lbl">' + esc(title) + '</span><p>' + esc(body) + "</p>";
  return n;
}

function panel(title, opts) {
  opts = opts || {};
  const p = el("section", "pnl bez");
  const hd = el("div", "pnl-hd");
  hd.innerHTML = '<span class="lbl">' + esc(title) + '</span><div class="sp"></div>' + (opts.head || "");
  p.appendChild(hd);
  const bd = el("div", "pnl-bd");
  if (opts.flush) bd.style.padding = "0";
  if (opts.pad) bd.style.padding = opts.pad;
  p.appendChild(bd);
  p._bd = bd; p._hd = hd;
  return p;
}
function deltaHTML(val, base, hb) {
  const d = deltaVsBase(val, base, hb);
  if (!d) return '<span class="dlt flat">baseline pending</span>';
  const cls = d.good === null ? "flat" : d.good ? "up" : "dn";
  return '<span class="dlt ' + cls + '">' + signedPct(d.pct) + " vs baseline</span>";
}
function viewHead(title, sub, tools) {
  return '<div class="vhd"><h1>' + esc(title) + '</h1><span class="sub">' + esc(sub) + '</span><div class="sp"></div>' + (tools || "") + "</div>";
}

