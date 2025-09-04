<!-- Datei: assets/inspector/inspector.js -->
/* =======================================================================
   Inspector (Kern + UI)
   Projekt: Siedler-Mini
   Version: v18.4.1
   CODE_STYLE:
     - Selbstheilend: eigener CBLog-Fallback, wenn global nicht vorhanden
     - Tabs: Übersicht | Logs | Build | Pfade | Tests (nur Logs aktiv)
     - Öffnen per GameUI.toggleInspector() und ?inspector=1
     - Keine externen Abhängigkeiten
   ======================================================================= */

(function () {
  "use strict";

  const VERSION = "v18.4.1";
  const NS = "[inspector.core]";

  /* ---------------------------------------------------------------------
   * 1) Minimal-CBLog, falls nicht vorhanden
   *    - puffert Einträge
   *    - proxyt console.* => Events + Buffer
   * ------------------------------------------------------------------- */
  (function ensureCBLog() {
    if (window.CBLog && typeof CBLog.getBuffer === "function") {
      (CBLog.info || console.log) && (CBLog.info?.(`${NS} CBLog vorhanden`) || console.log(`${NS} CBLog vorhanden`));
      return;
    }

    const BUF_MAX = 2000;
    const buf = [];
    const listeners = new Set();

    function push(line) {
      buf.push(line);
      if (buf.length > BUF_MAX) buf.shift();
      listeners.forEach((fn) => {
        try { fn(line); } catch (_) {}
      });
    }

    function fmt(ts, level, tag, parts) {
      const hh = ts.getHours().toString().padStart(2, "0");
      const mm = ts.getMinutes().toString().padStart(2, "0");
      const ss = ts.getSeconds().toString().padStart(2, "0");
      return `[${hh}:${mm}:${ss}] ${level} ${tag ? `[${tag}] ` : ""}${parts.join(" ")}`;
    }

    const original = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    };

    function wrapConsole(level) {
      return function (...args) {
        try {
          original[level](...args);
          const line = fmt(new Date(), level.toUpperCase(), "console", args.map(String));
          push(line);
        } catch (_) {
          // not fatal
        }
      };
    }

    console.log = wrapConsole("log");
    console.info = wrapConsole("info");
    console.warn = wrapConsole("warn");
    console.error = wrapConsole("error");

    window.CBLog = {
      /* API, die der Inspector nutzt */
      getBuffer() { return buf.slice(); },
      on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      off(fn) { listeners.delete(fn); },

      /* Bequeme Shortcuts, falls Code sie nutzt */
      ok:   (...a) => push(fmt(new Date(), "OK",   "", a.map(String))),
      info: (...a) => push(fmt(new Date(), "INFO", "", a.map(String))),
      warn: (...a) => push(fmt(new Date(), "WARN", "", a.map(String))),
      error:(...a) => push(fmt(new Date(), "ERROR","", a.map(String))),
    };

    // Kennzeichnung im Log
    window.CBLog.info?.("[CBLog] Polyfill aktiv (Inspector-Fallback)");
  })();

  /* ---------------------------------------------------------------------
   * 2) DOM-Helfer
   * ------------------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* ---------------------------------------------------------------------
   * 3) Panel-UI (leichtgewichtig, grau/anthrazit)
   * ------------------------------------------------------------------- */
  let rootEl = null;
  let logsBox, copyBtn, unsubLogs;

  function ensureStyles() {
    // Schlanke, integrierte Styles (stören nichts, wenn inspector.css zusätzlich existiert)
    if ($("#inspector-inline-style")) return;
    const s = el("style");
    s.id = "inspector-inline-style";
    s.textContent = `
      .inspector-wrap {
        position: fixed; inset: 6vh 5vw auto 5vw;
        background: linear-gradient(180deg, rgba(20,20,20,.96), rgba(20,20,20,.93));
        color: #e8eaec; border:1px solid rgba(255,255,255,.08); border-radius: 14px;
        box-shadow: 0 28px 90px rgba(0,0,0,.55), 0 2px 0 rgba(255,255,255,.04) inset;
        z-index: 2147483646; backdrop-filter: blur(8px);
      }
      .inspector-head {
        display:flex; align-items:center; gap:10px; padding:10px 12px 8px;
        border-bottom:1px solid rgba(255,255,255,.06);
      }
      .inspector-title { font-weight:700; letter-spacing:.2px; opacity:.95; }
      .inspector-ver   { opacity:.6; font-size:12px; margin-left:6px; }
      .inspector-spacer{ flex:1; }
      .inspector-close {
        border:none; border-radius:10px; padding:6px 10px; cursor:pointer;
        color:#e8eaec; background:rgba(255,255,255,.12);
      }
      .inspector-tabs { display:flex; gap:8px; padding:10px 12px 8px; flex-wrap:wrap; }
      .inspector-tab {
        border:none; border-radius:999px; padding:6px 12px; cursor:pointer;
        color:#e8eaec; background:rgba(255,255,255,.12); font-size:13px;
      }
      .inspector-tab.active { background:rgba(110,170,255,.25); }
      .inspector-body { padding:12px; }
      .inspector-mono {
        width:100%; height:48vh; resize:none; border-radius:10px; padding:10px 12px;
        background:#121416; color:#d9dbdf; border:1px solid rgba(255,255,255,.08);
        font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      }
      .inspector-actions { padding:8px 12px 12px; display:flex; gap:8px; }
      .inspector-btn {
        border:none; border-radius:10px; padding:8px 12px; cursor:pointer;
        color:#e8eaec; background:rgba(255,255,255,.12);
      }

      @media (max-width: 640px) {
        .inspector-wrap { inset: 6vh 3vw auto 3vw; }
        .inspector-mono { height:55vh; }
      }
    `;
    document.head.appendChild(s);
  }

  function renderPanel() {
    ensureStyles();

    // Hülle
    rootEl = el("div", "inspector-wrap");
    rootEl.id = "inspector";
    rootEl.setAttribute("role", "dialog");
    rootEl.setAttribute("aria-label", "Inspector");
    document.body.appendChild(rootEl);

    // Kopf
    const head = el("div", "inspector-head");
    head.append(
      el("div", "inspector-title", "Inspector"),
      el("div", "inspector-ver", VERSION),
      el("div", "inspector-spacer"),
    );
    const btnClose = el("button", "inspector-close", "Schließen");
    btnClose.addEventListener("click", close);
    head.append(btnClose);

    // Tabs
    const tabsBar = el("div", "inspector-tabs");
    const tabs = [
      { id: "overview", label: "Übersicht" },
      { id: "logs",     label: "Logs" },
      { id: "build",    label: "Build" },
      { id: "paths",    label: "Pfade" },
      { id: "tests",    label: "Tests" },
    ];
    const body = el("div", "inspector-body");

    tabs.forEach(t => {
      const b = el("button", "inspector-tab", t.label);
      b.dataset.tab = t.id;
      b.addEventListener("click", () => switchTab(t.id));
      tabsBar.appendChild(b);
    });

    // Body-Inhalt (nur Logs sofort bauen)
    const logsArea = el("textarea", "inspector-mono");
    logsArea.readOnly = true;
    logsArea.placeholder = "[Log wird geladen…]";
    logsBox = logsArea;

    const actions = el("div", "inspector-actions");
    copyBtn = el("button", "inspector-btn", "Kopieren");
    copyBtn.addEventListener("click", () => {
      try { navigator.clipboard.writeText(logsBox.value || ""); }
      catch(_) {}
    });
    actions.append(copyBtn);

    // Zusammenfügen
    rootEl.append(head, tabsBar, body, actions);

    // Starttab = Logs
    body.innerHTML = "";
    body.append(logsArea);
    activateTabButton("logs");
    startLogs();
  }

  function activateTabButton(id) {
    document.querySelectorAll(".inspector-tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === id);
    });
  }

  function switchTab(id) {
    const body = $(".inspector-body", rootEl);
    body.innerHTML = "";
    activateTabButton(id);

    if (id === "logs") {
      body.append(logsBox);
      startLogs();
      return;
    }

    // Platzhalter für die übrigen Tabs
    const ph = el("div");
    ph.style.cssText = "opacity:.8";
    ph.textContent = "Tab \"" + id + "\" ist vorbereitet und wird später befüllt.";
    body.append(ph);

    // Logs-Stream anhalten, wenn wir wegschalten
    stopLogs();
  }

  /* ---------------------------------------------------------------------
   * 4) Logs – Buffer + Live-Abo
   * ------------------------------------------------------------------- */
  function startLogs() {
    // Erst Puffer anzeigen
    try {
      const buf = (window.CBLog?.getBuffer?.() || []);
      logsBox.value = buf.join("\n") || "[Keine Log-Einträge vorhanden]";
      logsBox.scrollTop = logsBox.scrollHeight;
    } catch (e) {
      logsBox.value = "[CBLog nicht verfügbar]";
    }

    // Live-Stream (nur einmal)
    stopLogs();
    if (window.CBLog?.on) {
      unsubLogs = window.CBLog.on((line) => {
        if (!logsBox || !rootEl || rootEl.style.display === "none") return;
        const atEnd = (logsBox.scrollTop + logsBox.clientHeight + 8) >= logsBox.scrollHeight;
        logsBox.value += (logsBox.value ? "\n" : "") + line;
        if (atEnd) logsBox.scrollTop = logsBox.scrollHeight;
      });
    }
  }

  function stopLogs() {
    if (typeof unsubLogs === "function") {
      try { unsubLogs(); } catch(_) {}
    }
    unsubLogs = null;
  }

  /* ---------------------------------------------------------------------
   * 5) Öffnen/Schließen + Bridge
   * ------------------------------------------------------------------- */
  function open() {
    try {
      if (!rootEl) renderPanel();
      rootEl.style.display = "block";
      startLogs();
      (window.CBLog?.ok || console.log)(`${NS} geöffnet (${VERSION})`);
    } catch (e) {
      console.error(`${NS} open()`, e);
    }
  }

  function close() {
    try {
      if (!rootEl) return;
      rootEl.style.display = "none";
      stopLogs();
      (window.CBLog?.ok || console.log)(`${NS} geschlossen`);
    } catch (e) {
      console.error(`${NS} close()`, e);
    }
  }

  function toggle(force) {
    if (!rootEl || rootEl.style.display === "none") return open();
    if (force === true) return open();
    if (force === false) return close();
    // toggle
    (rootEl.style.display === "none") ? open() : close();
  }

  // Öffentliche Bridge für die FABs/UX
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = toggle;
  window.GameUI.openInspector   = open;
  window.GameUI.closeInspector  = close;

  // Optional: auto-open via ?inspector=1
  try {
    if (location.search.indexOf("inspector=1") !== -1) {
      setTimeout(open, 0);
    }
  } catch (_) {}

  (window.CBLog?.ok || console.log)(`${NS} bereit (${VERSION})`);
})();
