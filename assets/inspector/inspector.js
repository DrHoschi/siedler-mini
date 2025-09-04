/* ============================================================================
 *  assets/inspector/inspector.js
 *  Neue Siedler – Inspector (stabile Minimal-Core)
 *  Version: v18.8.2
 *  CODE_STYLE:
 *    - Keine externen Abhängigkeiten nötig (CBLog optional)
 *    - Idempotent (keine Doppel-Init; sauberer Toggle)
 *    - Tabs: Übersicht | Logs (aktiv) | Build | Pfade | Tests
 *    - Öffnen via window.GameUI.toggleInspector()
 *    - Auto-Open nur via ?inspector=1 oder Event 'cb:inspector-open'
 * ========================================================================== */
(function () {
  "use strict";

  // --- Guard gegen Doppel-Init -----------------------------------------------
  if (window.__INSPECTOR_CORE_READY__) return;
  window.__INSPECTOR_CORE_READY__ = true;

  const VERSION = "v18.8.2";
  const NS = "[inspector.core]";

  // --- Helpers ----------------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const toStr = (v) => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    try { return JSON.stringify(v); } catch { return String(v); }
  };
  const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
  const tsFmt = (t) => {
    const d = new Date(t || Date.now());
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  };

  // --- CBLog-Brücke / Fallback ------------------------------------------------
  // Nutzt vorhandenes CBLog, sonst minimalen Shim (inkl. Console-Proxy).
  const CB = (function ensureCBLog() {
    if (window.CBLog && typeof window.CBLog.on === "function") return window.CBLog;

    const buf = [];
    const subs = new Set();
    const push = (level, args, tag) => {
      const arr = Array.from(args || []);
      // (Fix) Nur loggen, wenn auch wirklich Inhalt vorhanden ist
      if (!arr.length) return;
      const entry = { ts: Date.now(), level, tag, args: arr };
      buf.push(entry);
      subs.forEach((fn) => { try { fn(entry); } catch {} });
    };

    // Console-Proxy nur einmal patchen
    if (!window.__CBLOG_CONSOLE_PATCHED__) {
      window.__CBLOG_CONSOLE_PATCHED__ = true;
      ["log", "info", "warn", "error"].forEach((m) => {
        const orig = console[m].bind(console);
        console[m] = function () {
          try { push(m.toUpperCase(), arguments, "console"); } catch {}
          orig.apply(console, arguments);
        };
      });
      try { console.info("[CBLog] Polyfill aktiv"); } catch {}
    }

    return {
      info: function () { push("INFO", arguments); },
      log:  function () { push("LOG",  arguments); },
      warn: function () { push("WARN", arguments); },
      error:function () { push("ERROR",arguments); },
      on:   function (fn){ subs.add(fn); },
      off:  function (fn){ subs.delete(fn); },
      getBuffer: function () { return buf.slice(); },
    };
  })();

  try { CB.info(`${NS} bereit (${VERSION})`); } catch {}

  // --- Log-Normalisierung -----------------------------------------------------
  function formatEntry(e) {
    try {
      // Strings direkt anzeigen (sofern nicht leer)
      if (typeof e === "string") return e.trim() ? e : "";

      // Arrayform: [ts, lvl, tag?, ...args]
      if (Array.isArray(e)) {
        const [ts, lvl, tg, ...rest] = e;
        const msg = rest.map(toStr).join(" ").trim();
        if (!msg) return "";
        return `[${tsFmt(ts)}] ${(lvl || "LOG").toString().toUpperCase()}${tg ? " ["+tg+"]" : ""} ${msg}`;
      }

      // Objektform
      const t   = e.ts || e.time || Date.now();
      const lvl = (e.level || e.lvl || e.type || "LOG").toString().toUpperCase();
      const tag = e.tag || e.scope || "";
      let payload = "";

      if (Array.isArray(e.args)) payload = e.args.map(toStr).join(" ");
      else if (e.message != null) payload = toStr(e.message);
      else if (e.text    != null) payload = toStr(e.text);
      else if (e.msg     != null) payload = toStr(e.msg);

      payload = (payload || "").trim();
      if (!payload && !tag) return "";           // (Fix) Leere Zeilen unterdrücken

      return `[${tsFmt(t)}] ${lvl}${tag ? " ["+tag+"]" : ""} ${payload}`.trim();
    } catch {
      return ""; // konservativ: besser nichts als kaputte Zeilen
    }
  }

  // --- UI (lazy build) --------------------------------------------------------
  let root, tabsEl, bodyEl, txtArea, footerEl;
  let currentTab = "logs";

  function buildUI() {
    if (root) return;

    root = el("div", "inspector");
    root.id = "inspector";
    root.setAttribute("role","dialog");
    root.setAttribute("aria-label","Inspector");
    root.style.cssText =
      "position:fixed; inset:auto 2.5vw 8vh 2.5vw; max-width:980px; margin:0 auto;"+
      "background:rgba(20,20,20,.94); border:1px solid rgba(255,255,255,.08);"+
      "border-radius:12px; color:#eee; z-index:2147483646; box-shadow:0 40px 120px rgba(0,0,0,.55);";

    // Header
    const head = el("div","insp-head");
    head.style.cssText = "display:flex;align-items:center;gap:10px;padding:10px 12px 8px;";
    head.appendChild(el("div","insp-title", `<strong>Inspector</strong><span style="opacity:.55;margin-left:8px">${VERSION}</span>`));
    const spacer = el("div"); spacer.style.flex = "1"; head.appendChild(spacer);
    const btnClose = el("button","insp-close","Schließen");
    btnClose.style.cssText = "border:none;border-radius:10px;padding:6px 10px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer;";
    btnClose.addEventListener("click", close);
    head.appendChild(btnClose);
    root.appendChild(head);

    // Tabs
    tabsEl = el("div","insp-tabs");
    tabsEl.style.cssText = "display:flex;gap:8px;padding:0 12px 10px;";
    [["overview","Übersicht"],["logs","Logs"],["build","Build"],["paths","Pfade"],["tests","Tests"]]
      .forEach(([id,label])=>{
        const b = el("button","insp-tab",label);
        b.dataset.tab = id;
        b.style.cssText = "border:none;border-radius:999px;padding:6px 12px;background:rgba(255,255,255,.10);color:#ddd;cursor:pointer;";
        b.addEventListener("click",()=>switchTab(id));
        tabsEl.appendChild(b);
      });
    root.appendChild(tabsEl);

    // Body
    bodyEl = el("div","insp-body");
    bodyEl.style.cssText = "padding:0 12px 12px;";

    const box = el("div","insp-logbox");
    box.style.cssText = "background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.08);border-radius:8px;overflow:hidden;";
    txtArea = el("pre","insp-pre");
    txtArea.style.cssText = "margin:0;padding:12px;white-space:pre-wrap;font:13px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#dfe8f0;min-height:200px;max-height:48vh;overflow:auto;";
    box.appendChild(txtArea);
    bodyEl.appendChild(box);

    // Footer
    footerEl = el("div","insp-foot");
    footerEl.style.cssText = "display:flex;gap:8px;padding:10px 12px 12px;";
    const btnClear = el("button","insp-btn","Leeren");
    btnClear.style.cssText = "border:none;border-radius:10px;padding:6px 10px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer;";
    btnClear.addEventListener("click",()=>{ txtArea.textContent = ""; });
    const btnRefresh = el("button","insp-btn","Aktualisieren");
    btnRefresh.style.cssText = btnClear.style.cssText;
    btnRefresh.addEventListener("click", refreshLogs);
    footerEl.append(btnClear, btnRefresh);
    bodyEl.appendChild(footerEl);

    root.appendChild(bodyEl);
    document.body.appendChild(root);

    switchTab(currentTab);
  }

  function switchTab(id){
    currentTab = id;
    [...tabsEl.querySelectorAll("button")].forEach(b=>{
      const active = (b.dataset.tab===id);
      b.style.background = active ? "rgba(76,175,80,.28)" : "rgba(255,255,255,.10)";
      b.style.color      = active ? "#e9f6ec"           : "#ddd";
    });

    if (id === "logs") {
      footerEl.style.display = "";
      refreshLogs();
    } else {
      footerEl.style.display = "none";
      if (id === "overview")      txtArea.textContent = "[Übersicht kommt …]";
      else if (id === "build")    txtArea.textContent = "[Build-Werkzeuge folgen …]";
      else if (id === "paths")    txtArea.textContent = "[Pfade-Overlay & Stats folgen …]";
      else if (id === "tests")    txtArea.textContent = "[Mini-Tests folgen …]";
      else                        txtArea.textContent = "";
    }
  }

  // --- Log-Stream -------------------------------------------------------------
  let streamOn = false;
  function startStream(){
    if (streamOn) return;
    streamOn = true;
    refreshLogs();                           // Vergangenheit
    if (CB && typeof CB.on === "function") { // Live
      CB.on(onLogEntry);
    }
  }
  function onLogEntry(e){
    if (!txtArea || currentTab !== "logs") return;
    const line = formatEntry(e);
    if (!line) return;                       // (Fix) Leere Zeilen ausfiltern
    txtArea.textContent += (txtArea.textContent ? "\n" : "") + line;
    txtArea.scrollTop = txtArea.scrollHeight;
  }
  function refreshLogs(){
    try {
      const buf =
        (CB && typeof CB.getBuffer === "function" && CB.getBuffer()) ||
        window.__CBLOG_BUF ||
        [];
      const lines = buf.map(formatEntry).filter(Boolean);
      txtArea.textContent = lines.length ? lines.join("\n") : "[Keine Log-Einträge vorhanden]";
      txtArea.scrollTop = txtArea.scrollHeight;
    } catch (e) {
      txtArea.textContent = "[Log konnte nicht gelesen werden]";
      try { console.warn(NS, "refreshLogs failed:", e); } catch {}
    }
  }

  // --- API (für FAB & andere UIs) --------------------------------------------
  function open()  { buildUI(); root.style.display = "block"; startStream(); try{ CB.info(`${NS} geöffnet (${VERSION})`);}catch{} }
  function close() { if (!root) return; root.style.display = "none"; }
  function toggle(){ if (!root || root.style.display === "none" || !root.style.display) open(); else close(); }

  // Öffentliche Bridge schonend setzen
  window.GameUI = window.GameUI || {};
  if (window.GameUI.toggleInspector !== toggle) window.GameUI.toggleInspector = toggle;
  window.GameUI.openInspector  = open;
  window.GameUI.closeInspector = close;

  // --- Auto-Open nur auf Wunsch ----------------------------------------------
  try {
    if (/\binspector=1\b/.test(location.search)) {
      setTimeout(open, 60); // minimaler Delay, bis <body> steht
    }
    window.addEventListener("cb:inspector-open", open);
  } catch {}

  // --- Mini-Failsafe-Badge ----------------------------------------------------
  (function ensureBadge(){
    try {
      if (document.getElementById("btn-inspector")) return;
      const b = el("button","", "🛠");
      b.title = "Inspector öffnen";
      b.style.cssText =
        "position:fixed;right:14px;bottom:14px;width:48px;height:48px;border:none;border-radius:50%;"+
        "background:rgba(30,30,30,.92);color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.35);z-index:2147483647;cursor:pointer;";
      b.addEventListener("click", toggle);
      document.addEventListener("DOMContentLoaded", ()=>document.body.appendChild(b));
    } catch {}
  })();

})();
