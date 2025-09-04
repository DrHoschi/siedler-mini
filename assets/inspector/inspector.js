/* ============================================================================
 *  assets/inspector/inspector.js
 *  Inspector-Core (stabil)
 *  Version: v18.9.3
 *  CODE-STYLE:
 *    - Keine Abhängigkeit zur Game-Engine nötig
 *    - Öffnet immer, auch auf Startseite
 *    - Tabs: Übersicht | Logs | Build | Pfade | Tests
 *    - Logs: CBLog-Puffer + Live-Stream; robust falls CBLog fehlt
 *    - Build/Pfade: aus Vorgaben integriert
 * ========================================================================== */

(function () {
  "use strict";

  const VERSION = "v18.9.3";
  const log = (...a) => (window.CBLog?.info || console.log)("[inspector.core]", ...a);

  // --------- DOM Grundgerüst -------------------------------------------------
  const rootId = "inspector";
  let root, headerEl, tabsEl, bodyEl, footerEl, preLog;

  // State
  const State = {
    isOpen: false,
    currentTab: "logs",
    stopLogStream: null, // disposer
  };

  // Hilfsfunktionen -----------------------------------------------------------
  function ensureRoot() {
    if (root) return;

    root = document.createElement("div");
    root.id = rootId;
    root.style.cssText =
      "position:fixed;left:50%;top:64px;transform:translateX(-50%);" +
      "max-width:960px;width:calc(100vw - 32px);max-height:70vh;overflow:hidden;" +
      "z-index:2147483646;background:rgba(18,18,18,.94);border:1px solid #2b2b2b;border-radius:12px;" +
      "box-shadow:0 30px 90px rgba(0,0,0,.5);color:#eee;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif;display:none;";

    // Header
    headerEl = document.createElement("div");
    headerEl.style.cssText = "display:flex;align-items:center;gap:12px;padding:10px 12px;border-bottom:1px solid #2b2b2b;";
    const title = document.createElement("div");
    title.textContent = "Inspector";
    title.style.cssText = "font-weight:700;letter-spacing:.2px;opacity:.95";
    const ver = document.createElement("div");
    ver.textContent = " " + VERSION;
    ver.style.cssText = "opacity:.5;font-size:12px;margin-top:1px";
    const spacer = document.createElement("div"); spacer.style.flex = "1";
    const btnClose = document.createElement("button");
    btnClose.textContent = "Schließen";
    btnClose.style.cssText = "border:none;border-radius:12px;padding:6px 10px;background:#494949;color:#fff;cursor:pointer;";
    btnClose.addEventListener("click", close);
    headerEl.appendChild(title);
    headerEl.appendChild(ver);
    headerEl.appendChild(spacer);
    headerEl.appendChild(btnClose);

    // Tabs
    tabsEl = document.createElement("div");
    tabsEl.style.cssText = "display:flex;gap:8px;padding:8px 12px;border-bottom:1px solid #2b2b2b;flex-wrap:wrap;";
    const tabs = [
      ["overview", "Übersicht"],
      ["logs", "Logs"],
      ["build", "Build"],
      ["paths", "Pfade"],
      ["tests", "Tests"],
    ];
    tabs.forEach(([id, label]) => {
      const b = document.createElement("button");
      b.dataset.tab = id;
      b.textContent = label;
      b.style.cssText =
        "border:none;border-radius:999px;padding:6px 12px;background:rgba(255,255,255,.10);" +
        "color:#eee;cursor:pointer;outline:none;";
      b.addEventListener("click", () => selectTab(id));
      tabsEl.appendChild(b);
    });

    // Body
    bodyEl = document.createElement("div");
    bodyEl.style.cssText = "padding:12px;overflow:auto;max-height:48vh;";
    preLog = document.createElement("pre");
    preLog.style.cssText =
      "margin:0;padding:12px;background:#121212;border:1px solid #2b2b2b;border-radius:8px;" +
      "min-height:240px;color:#d6d6d6;white-space:pre-wrap;word-break:break-word;font-family:Menlo,Consolas,ui-monospace,monospace;";
    bodyEl.appendChild(preLog);

    // Footer (Buttons unten)
    footerEl = document.createElement("div");
    footerEl.style.cssText = "display:flex;gap:10px;padding:12px;border-top:1px solid #2b2b2b;";
    const btnCopy = mkBtn("Kopieren", () => copyLogs());
    const btnClear = mkBtn("Leeren", () => clearLogs());
    const btnRefresh = mkBtn("Aktualisieren", () => refreshLogs());
    footerEl.append(btnCopy, btnClear, btnRefresh);

    root.append(headerEl, tabsEl, bodyEl, footerEl);
    document.body.appendChild(root);

    // Tastaturkürzel
    window.addEventListener("keydown", (ev) => {
      if (!State.isOpen) return;
      if (ev.key === "Escape") close();
    });
  }

  function mkBtn(label, onClick) {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText =
      "border:none;border-radius:12px;padding:8px 12px;background:rgba(255,255,255,.10);" +
      "color:#fff;cursor:pointer;";
    b.addEventListener("click", onClick);
    return b;
  }

  // --------- Logs: Buffer + Stream ------------------------------------------
  function getCBLog() {
    return window.CBLog || null;
  }

  function clearLogs() {
    preLog.textContent = "";
  }

  function copyLogs() {
    const txt = preLog.textContent || "";
    try {
      navigator.clipboard?.writeText(txt);
    } catch {}
  }

  function refreshLogs() {
    // Puffer einlesen
    preLog.textContent = "";
    const CBL = getCBLog();
    if (CBL?.getBuffer) {
      const buf = CBL.getBuffer();
      if (Array.isArray(buf)) {
        for (const line of buf) preLog.textContent += line + "\n";
      }
    }
  }

  function startLogStream() {
    const CBL = getCBLog();
    if (!CBL || !CBL.LogStream || !CBL.LogStream.start) {
      // Minimal-Proxy (falls kein CBLog vorhanden): höre auf console.log etc. – sehr simpel
      const orig = console.log;
      console.log = function (...args) {
        try {
          const line = (args && args.length ? args.join(" ") : "");
          preLog.textContent += (line || "LOG") + "\n";
        } catch {}
        orig.apply(console, args);
      };
      return () => {
        // kein sauberer Restore hier (nur Fallback-Zweig)
      };
    }

    const stop = CBL.LogStream.start((line) => {
      preLog.textContent += line + "\n";
    });
    return stop;
  }

  // --------- Tabs Umschalten (fix) ------------------------------------------
  function setActiveTabButton(id) {
    tabsEl.querySelectorAll("button").forEach((b) => {
      if (b.dataset.tab === id) {
        b.style.background = "rgba(80,160,100,.25)";
      } else {
        b.style.background = "rgba(255,255,255,.10)";
      }
    });
  }

  function unmountTab(tab) {
    // beim Verlassen aufräumen
    if (tab === "logs" && typeof State.stopLogStream === "function") {
      try { State.stopLogStream(); } catch {}
      State.stopLogStream = null;
    }
  }

  function mountTab(tab) {
    // beim Betreten initialisieren
    if (tab === "logs") {
      footerEl.style.display = "flex";
      bodyEl.innerHTML = "";
      bodyEl.appendChild(preLog);
      refreshLogs();
      State.stopLogStream = startLogStream();
    } else if (tab === "overview") {
      renderOverview();
    } else if (tab === "build") {
      renderBuild();
    } else if (tab === "paths") {
      renderPaths();
    } else if (tab === "tests") {
      renderTests();
    }
  }

  function selectTab(next) {
    if (State.currentTab === next) return;
    unmountTab(State.currentTab);
    State.currentTab = next;
    setActiveTabButton(next);
    mountTab(next);
  }

  // --------- Öffnen/Schließen -----------------------------------------------
  function open() {
    ensureRoot();
    if (State.isOpen) return;
    State.isOpen = true;
    root.style.display = "block";
    setActiveTabButton(State.currentTab);
    mountTab(State.currentTab);
    log("geöffnet", VERSION);
  }

  function close() {
    if (!State.isOpen) return;
    unmountTab(State.currentTab);
    State.isOpen = false;
    root.style.display = "none";
  }

  // --------- Öffentliche Bridge für FAB/UX -----------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = function (force) {
    ensureRoot();
    const wantOpen = typeof force === "boolean" ? force : !State.isOpen;
    wantOpen ? open() : close();
  };
  window.GameUI.openInspector = open;
  window.GameUI.closeInspector = close;

  // --------- Autostart-Badge / Garantierte Sichtbarkeit ----------------------
  // Falls gewünscht direkt initialisieren (nicht automatisch öffnen):
  // -> wir initialisieren nur das Gerüst, öffnen via FAB
  ensureRoot();
  log("bereit", VERSION);

  // ========================================================================== 
  // TABS – Inhalte
  // ==========================================================================

  // Übersicht (Platzhalter)
  function renderOverview() {
    bodyEl.innerHTML = "";
    footerEl.style.display = "none";

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:grid;gap:8px";

    const p = (k, v) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:space-between;gap:12px;background:rgba(255,255,255,.06);padding:8px 10px;border-radius:8px";
      const l = document.createElement("div"); l.style.opacity = ".75"; l.textContent = k;
      const r = document.createElement("div"); r.style.fontWeight = "600"; r.textContent = v;
      row.append(l, r);
      wrap.appendChild(row);
    };

    const size = `${Math.round(innerWidth)}×${Math.round(innerHeight)}`;
    const mapName = document.querySelector("#game")?.dataset?.map || "unbekannt";
    p("Version", VERSION);
    p("Canvas-Viewport", size);
    p("Map", mapName);

    bodyEl.appendChild(wrap);
  }

  // === REPLACE in assets/inspector/inspector.js ==============================
  // 1) Build-Tab – liest optional window.BUILD_CATEGORIES
  function renderBuild(){
    // UI-Container vorbereiten
    bodyEl.innerHTML = "";
    footerEl.style.display = "none";
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:10px";

    // Quelle: BUILD_CATEGORIES oder Fallback
    const cats = (window.BUILD_CATEGORIES && Array.isArray(window.BUILD_CATEGORIES) ? window.BUILD_CATEGORIES : [
      { id:"general", title:"Allg.", items:[
        { id:"hq", label:"Hauptquartier" },
        { id:"depot", label:"Depot" },
        { id:"house", label:"Haus" }
      ]},
      { id:"production_food", title:"Produktion", items:[
        { id:"farm", label:"Farm" },
        { id:"fischer", label:"Fischer" }
      ]}
    ]);

    // kleine Helper
    const mkH = (txt)=>{ const h=document.createElement("div"); h.textContent=txt; h.style.cssText="opacity:.8;font-weight:700;margin-top:4px"; return h; };
    const mkBtn = (label, disabled=false)=>{
      const b=document.createElement("button");
      b.textContent = label;
      b.disabled = !!disabled;
      b.style.cssText = "border:none;border-radius:999px;padding:6px 10px;margin:4px 6px 0 0;cursor:pointer;" +
        (disabled ? "background:rgba(255,255,255,.06);color:#777;cursor:not-allowed;"
                  : "background:rgba(255,255,255,.10);color:#ddd;");
      return b;
    };

    // Render
    cats.forEach(cat=>{
      wrap.appendChild(mkH(cat.title || cat.id));
      const row = document.createElement("div");
      row.style.cssText = "display:flex;flex-wrap:wrap";
      (cat.items||[]).forEach(it=>{
        const btn = mkBtn(it.label || it.id, !!it.todo);
        if (!it.todo){
          btn.addEventListener("click", ()=>{
            const detail = { type: it.id };
            try { window.dispatchEvent(new CustomEvent("cb:build-select", { detail })); } catch {}
            try { (window.CBLog?.log||console.log)("[ui] Build-Select", it.id); } catch {}
          });
        }
        row.appendChild(btn);
      });
      wrap.appendChild(row);
    });

    bodyEl.appendChild(wrap);
  }

  // 2) Pfade-Tab – nur Events toggeln/resetten
  function renderPaths(){
    bodyEl.innerHTML = "";
    footerEl.style.display = "none";

    const box = document.createElement("div");
    box.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";

    const mk = (label, fn)=>{
      const b=document.createElement("button");
      b.textContent = label;
      b.style.cssText = "border:none;border-radius:10px;padding:8px 12px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer";
      b.addEventListener("click", fn);
      return b;
    };

    // Statusanzeige (aus __cb, falls vorhanden)
    const status = document.createElement("div");
    status.style.cssText = "opacity:.8;margin-top:6px";
    const refreshStatus = ()=>{
      const on = !!(window.__cb && window.__cb.pathsEnabled);
      status.textContent = `Pfade-Overlay: ${on ? "AN" : "AUS"}`;
    };
    refreshStatus();

    // Buttons
    box.appendChild(mk("Overlay umschalten", ()=>{
      try { window.dispatchEvent(new CustomEvent("cb:paths:toggle")); } catch {}
      setTimeout(refreshStatus, 50);
    }));
    box.appendChild(mk("Heatmap zurücksetzen", ()=>{
      try { window.dispatchEvent(new CustomEvent("cb:paths:reset")); } catch {}
    }));

    bodyEl.appendChild(box);
    bodyEl.appendChild(status);
  }

  // Tests (Platzhalter)
  function renderTests() {
    bodyEl.innerHTML = "";
    footerEl.style.display = "none";
    const d = document.createElement("div");
    d.textContent = "Tests – Platzhalter.";
    d.style.opacity = ".8";
    bodyEl.appendChild(d);
  }
})();
