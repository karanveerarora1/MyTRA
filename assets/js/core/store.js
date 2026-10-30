/* MYTRA // core/store.js - persistence (account store + localStorage mirror). Needs utils.js. */
"use strict";

/* ============================================================
   STORAGE — real persistence with no setup step.
   Cloud: the artifact document store, scoped to the signed-in
   account. Local: mirrored to this browser so the instrument
   still reads when the store is unreachable.
   Demo data lives only in memory and never touches either.
   ============================================================ */
const Store = {
  db: null, cloud: false, ns: "real", demo: false, queue: new Map(), timer: null, failed: false,

  lkey(path) { return "mytra:v1:" + path; },

  async init() {
    try {
      if (window.claude && typeof window.claude.use === "function") {
        const db = await window.claude.use("db");
        if (db) { this.db = db; this.cloud = true; }
      }
    } catch (e) { this.cloud = false; }
    return this.cloud;
  },

  unwrap(r) {
    if (r == null) return null;
    if (typeof r.data === "function") { try { return r.exists === false ? null : (r.data() || null); } catch (e) { return null; } }
    if (typeof r === "object" && r.data && typeof r.data === "object" && !Array.isArray(r.data) && ("exists" in r || "id" in r || "path" in r || "ref" in r)) {
      return r.exists === false ? null : r.data;
    }
    return typeof r === "object" ? r : null;
  },

  readLocal(path) {
    try { const raw = localStorage.getItem(this.lkey(path)); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  },
  writeLocal(path, data) {
    try { localStorage.setItem(this.lkey(path), JSON.stringify(data)); } catch (e) { /* quota or blocked */ }
  },

  async get(path) {
    if (this.demo) return null;
    const local = this.readLocal(path);
    if (!this.cloud) return local;
    try {
      const remote = this.unwrap(await this.db.doc(path).get());
      if (!remote) { if (local) this.set(path, local); return local; }
      if (local && (local._u || 0) > (remote._u || 0)) { this.set(path, local); return local; }
      this.writeLocal(path, remote);
      return remote;
    } catch (e) { this.failed = true; return local; }
  },

  set(path, data) {
    if (this.demo) return;
    data._u = Date.now();
    this.writeLocal(path, data);
    if (!this.cloud) return;
    this.queue.set(path, data);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 700);
  },

  async flush() {
    if (!this.cloud || !this.queue.size) return;
    const batch = Array.from(this.queue.entries());
    this.queue.clear();
    let ok = true;
    for (const [path, data] of batch) {
      try { await this.db.doc(path).set(data); }
      catch (e) { ok = false; this.queue.set(path, data); }
    }
    this.failed = !ok;
    syncBadge();
  },

  async del(path) {
    try { localStorage.removeItem(this.lkey(path)); } catch (e) {}
    if (this.cloud) { try { await this.db.doc(path).delete(); } catch (e) {} }
  }
};
