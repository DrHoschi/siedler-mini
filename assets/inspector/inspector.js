/* ============================================================================
 * Datei: assets/inspector/inspector.js
 * Projekt: Siedler-Mini — Inspector (Fullscreen)
 * Version: v18.10.2
 *
 * Ziele:
 *  - Vollbild-Overlay (mobile/desktop), Header & Tabs sticky, Footer fix
 *  - Stabile Logs (persistenter Puffer in window.__cb._logBuf)
 *  - Tabs: Übersicht · Logs · Build (BUILD_CATEGORIES) · Pfade · Tests
 *  - Keine Log-Löschung beim Tabwechsel
 *  - Optional: „Prettifier“ für bekannte Log-Zeilen (lesbarere Texte)
 *  - Öffnen/Schließen via window.GameUI.toggleInspector/openInspector/closeInspector
 *  - Events: cb:inspector:open/close, cb:build-select, cb:paths:toggle/reset
 * ========================================================================== */

(function () {
  const VERSION = "v18.10.2";

  // -- Logging helpers --------------------------------------------------------
  const CB = (window.__cb = window.__cb || {});
  CB._logBuf = CB._logBuf || [];   // [{ ts, level, text }]
  CB._logMax = CB._logMax || 500;

  function trimBuf() {
    const over = CB._logBuf.length - CB._logMax;
    if (over > 0) CB._logBuf.splice(0, over);
  }

  // Fallback-Konsole (falls kein CBLog vorhanden)
  if (!window.CBLog) {
    window.CBLog = {
      log  : (...a) => { CB._logBuf.push({ts:new Date(),level:"LOG" ,text:a.map(String).join(" ")}); trimBuf(); console.log (...a); },
      info : (...a) => { CB._logBuf.push({ts:new Date(),level:"INFO",text:a.map(String).join(" ")}); trimBuf(); console.info(...a); },
      warn : (...a) => { CB._logBuf.push({ts:new Date(),level:"WARN",text:a.map(String).join(" ")}); trimBuf(); console.warn(...a); },
      error: (...a) => { CB._logBuf.push({ts:new Date(),level:"ERR" ,text:a.map(String).join(" ")}); trimBuf(); console.error(...a); },
      getBuffer: () => CB._logBuf.slice(),
      clear: () => { CB._logBuf.length = 0; }
    };
    (window.CBLog.info || console.info)("[CBLog] Polyfill aktiv (Inspector-Fallback)");
  }

  const log  = (...a) => (window.CBLog.log  || console.log ).apply(console, a);
  const info = (...a) => (window.CBLog.info || console.info).apply(console, a);
  const warn = (...a) => (window.CBLog.warn || console.warn).apply(console, a);

  // -- DOM-Grundgerüst --------------------------------------------------------
  let root, panel, headEl, tabsEl, bodyEl, footerEl, preLog;

  const SA_T = "env(safe-area-inset-top)";
  const SA_R = "env(safe-area-inset-right)";
  const SA_B = "env(safe-area-inset-bottom)";
  const SA_L = "env(safe-area-inset-left)";

  function ensureDOM() {
    if (root) return;

    // Root: Vollbild, klickt nicht durch
    root = document.createElement("div");
    root.id = "inspector";
    root.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483646",
      "display:none",
      "pointer-events:auto",
    ].join(";");

    // Panel: nimmt den ganzen Viewport ein
    panel = document.createElement("div");
    panel.style.cssText = [
      "position:absolute",
      "inset:0",
      `padding:calc(${SA_T} + 8px) calc(${SA_R} + 8px) calc(${SA_B} + 8px) calc(${SA_L} + 8px)`,
      "display:flex",
      "flex-direction:column",
      "background:rgba(12,12,12,.96)",
      "border:1px solid rgba(255,255,255,.08)",
      "border-radius:12px",
      "box-shadow:0 30px 80px rgba(0,0,0,.55)",
      "backdrop-filter:blur(8px)",
      "color:#e8e8e8",
      "overflow:hidden"
    ].join(";");

    // Header (sticky)
    headEl = document.createElement("div");
    headEl.style.cssText = [
      "position:sticky","top:0","z-index:2",
      "display:flex","align-items:center","gap:10px",
      "padding:10px 12px",
      "background:linear-gradient(to bottom, rgba(18,18,18,1), rgba(18,18,18,.96))",
      "border-bottom:1px solid rgba(255,255,255,.06)"
    ].join(";");
    const title = document.createElement("div");
    title.textContent = `Inspector v${VERSION}`;
    title.style.cssText = "font-weight:700;opacity:.92";
    const spacer = document.createElement("div"); spacer.style.flex = "1";
    const btnClose = button("Schließen", close);
    btnClose.style.borderRadius = "12px";
    headEl.append(title, spacer, btnClose);

    // Tabs (sticky)
    tabsEl = document.createElement("div");
    tabsEl.style.cssText = [
      "position:sticky","top:48px","z-index:2",
      "display:flex","gap:8px","flex-wrap:wrap",
      "padding:8px 12px",
      "background:linear-gradient(to bottom, rgba(18,18,18,.98), rgba(18,18,18,.95))",
      "border-bottom:1px solid rgba(255,255,255,.06)"
    ].join(";");

    // Body (scrollt)
    bodyEl = document.createElement("div");
    bodyEl.style.cssText = "flex:1; overflow:auto; padding:12px; min-height:0";

    // Footer (Buttons nur im Log-Tab sichtbar)
    footerEl = document.createElement("div");
    footerEl.style.cssText = [
      "position:sticky","bottom:0","z-index:2",
      "display:flex","gap:10px","flex-wrap:wrap",
      "padding:12px",
      "background:linear-gradient(to top, rgba(18,18,18,1), rgba(18,18,18,.96))",
      "border-top:1px solid rgba(255,255,255,.06)"
    ].join(";");

    const btnCopy   = button("Kopieren", () => {
      try {
        const txt = formatBuffer(currentBuffer(), true); // true = prettified
        navigator.clipboard.writeText(txt);
        info("[inspector.core] Logs kopiert");
      } catch (e) { warn("Clipboard fehlgeschlagen:", e?.message); }
    });
    const btnClear  = button("Leeren", () => {
      window.CBLog?.clear?.();
      if (preLog) preLog.textContent = "[Log geleert]";
      info("[inspector.core] Log geleert");
    });
    const btnRefresh = button("Aktualisieren", renderLogs);
    footerEl.append(btnCopy, btnClear, btnRefresh);

    panel.append(headEl, tabsEl, bodyEl, footerEl);
    root.append(panel);
    document.body.append(root);

    // Tabs registrieren
    initTabs();

    // Standardansicht: Logs
    activateTab("logs");

    // ESC = schließen
    window.addEventListener("keydown", (e)=>{
      if (e.key === "Escape" && root.style.display !== "none") close();
    });
  }

  // -- Utilities --------------------------------------------------------------
  function button(label, onClick) {
    const b = document.createElement("button");
    b.textContent = label;
    b.addEventListener("click", onClick);
    b.style.cssText = [
      "border:none","border-radius:10px",
      "padding:8px 12px",
      "background:rgba(255,255,255,.12)",
      "color:#fff","cursor:pointer"
    ].join(";");
    return b;
  }

  function pill(label) {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = [
      "border:none","border-radius:999px",
      "padding:8px 12px",
      "background:rgba(255,255,255,.10)",
      "color:#ddd","cursor:pointer"
    ].join(";");
    return b;
  }

  function currentBuffer() {
    return window.CBLog?.getBuffer ? window.CBLog.getBuffer() : CB._logBuf.slice();
  }

  const pad2 = (n)=>String(n).padStart(2,"0");

  // Pretty-Mapping für bekannte Meldungen
  function labelForBuild(id) {
    try {
      const cats = (window.BUILD_CATEGORIES && Array.isArray(window.BUILD_CATEGORIES)) ? window.BUILD_CATEGORIES : [];
      for (const c of cats) for (const it of (c.items||[])) if (it.id === id) return it.label || id;
    } catch {}
    return id;
  }
  function prettify(text) {
    // [ui] Build-Select <id>
    let m = text.match(/\[ui\]\s+Build-Select\s+(\w[\w-]*)/i);
    if (m) return `[Build] Auswahl: ${labelForBuild(m[1])} (${m[1]})`;

    // [ui-start] Start → <map>
    m = text.match(/\[ui-start\].*Start\s*[→=>]\s*(.+)$/i);
    if (m) return `[Start] Map geladen: ${m[1]}`;

    // [bootstrap] bereits gestartet
    if (/bootstrap\].*bereits gestartet/i.test(text)) return "[Bootstrap] Bereits aktiv (kein erneuter Start)";

    return text; // sonst unverändert
  }

  function formatBuffer(arr, pretty=false){
    return (arr||[]).map(it=>{
      const d = it.ts instanceof Date ? it.ts : new Date(it.ts);
      const ts = `[${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}]`;
      const lv = (it.level||"LOG").toUpperCase().padEnd(4," ");
      const line = pretty ? prettify(it.text) : it.text;
      return `${ts} ${lv} ${line}`;
    }).join("\n");
  }

  // -- Tabs -------------------------------------------------------------------
  const TABS = [
    { id:"overview", label:"Übersicht", render: renderOverview },
    { id:"logs"    , label:"Logs"     , render: renderLogs     },
    { id:"build"   , label:"Build"    , render: renderBuild    },
    { id:"paths"   , label:"Pfade"    , render: renderPaths    },
    { id:"tests"   , label:"Tests"    , render: renderTests    },
  ];
  const tabBtn = new Map();

  function initTabs(){
    tabsEl.innerHTML = "";
    TABS.forEach(t=>{
      const b = pill(t.label);
      b.addEventListener("click", ()=> activateTab(t.id));
      tabBtn.set(t.id, b);
      tabsEl.appendChild(b);
    });
  }

  function activateTab(id){
    TABS.forEach(t=>{
      const active = (t.id === id);
      const btn = tabBtn.get(t.id);
      if (!btn) return;
      btn.classList.toggle("active", active);
      btn.style.background = active ? "rgba(120,200,120,.28)" : "rgba(255,255,255,.10)";
    });
    const tab = TABS.find(t=>t.id===id) || TABS[0];
    tab.render();
  }

  // -- Render-Funktionen ------------------------------------------------------
  function renderOverview(){
    bodyEl.innerHTML = "";
    footerEl.style.display = "none";

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:grid;gap:8px";
    wrap.innerHTML = `
      <div style="opacity:.85">Version: <b>${VERSION}</b></div>
      <div style="opacity:.85">Canvas: <span id="ov-canvas">–</span></div>
      <div style="opacity:.85">Map: <span id="ov-map">–</span></div>
    `;
    bodyEl.appendChild(wrap);

    try {
      const cvs = document.getElementById("game");
      if (cvs) wrap.querySelector("#ov-canvas").textContent =
        `${cvs.width||cvs.clientWidth}×${cvs.height||cvs.clientHeight}`;
      const mapName = (document.getElementById("game")?.dataset?.map || "–").split("/").pop();
      wrap.querySelector("#ov-map").textContent = mapName;
    } catch {}
  }

  function renderLogs(){
    bodyEl.innerHTML = "";
    footerEl.style.display = "flex";

    preLog = document.createElement("pre");
    preLog.style.cssText = [
      "margin:0","padding:12px",
      "background:rgba(10,10,10,.85)",
      "border:1px solid rgba(255,255,255,.08)",
      "border-radius:10px",
      "font-family:ui-monospace, Menlo, Consolas, monospace",
      "font-size:14px","line-height:1.35",
      "color:#e6e6e6","white-space:pre-wrap",
      "min-height:40vh"
    ].join(";");

    const buf = currentBuffer();
    preLog.textContent = buf.length ? formatBuffer(buf, /*pretty*/true) : "[Keine Log-Einträge vorhanden]";
    bodyEl.appendChild(preLog);
  }

  // Build-Tab – nutzt optional window.BUILD_CATEGORIES
  function renderBuild(){
    bodyEl.innerHTML = "";
    footerEl.style.display = "none";

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:10px";

    const cats = (window.BUILD_CATEGORIES && Array.isArray(window.BUILD_CATEGORIES)
      ? window.BUILD_CATEGORIES
      : [
          { id:"general", title:"Allg.", items:[
            { id:"hq",    label:"Hauptquartier" },
            { id:"depot", label:"Depot" },
            { id:"house", label:"Haus" }
          ]},
          { id:"production_food", title:"Produktion", items:[
            { id:"farm",    label:"Farm" },
            { id:"fischer", label:"Fischer" }
          ]}
        ]);

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
            try { (window.CBLog?.log||console.log)(`[ui] Build-Select ${it.id}`); } catch {}
          });
        }
        row.appendChild(btn);
      });
      wrap.appendChild(row);
    });

    bodyEl.appendChild(wrap);
  }

  // Pfade-Tab – nur Control-Events
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

    const status = document.createElement("div");
    status.style.cssText = "opacity:.8;margin-top:6px";
    const refreshStatus = ()=>{
      const on = !!(window.__cb && window.__cb.pathsEnabled);
      status.textContent = `Pfade-Overlay: ${on ? "AN" : "AUS"}`;
    };
    refreshStatus();

    box.appendChild(mk("Overlay umschalten", ()=>{
      try { window.dispatchEvent(new CustomEvent("cb:paths:toggle")); } catch {}
      setTimeout(refreshStatus, 50);
    }));
    box.appendChild(mk("Heatmap zurücksetzen", ()=>{
      try { window.dispatchEvent(new CustomEvent("cb:paths:reset")); } catch {}
    }));

    bodyEl.append(box, status);
  }

  function renderTests(){
    bodyEl.innerHTML = "";
    footerEl.style.display = "none";
    const d = document.createElement("div");
    d.textContent = "Tests folgen …";
    d.style.opacity = ".8";
    bodyEl.appendChild(d);
  }

  // -- Öffnen/Schließen + Bridge ---------------------------------------------
  function open() {
    ensureDOM();
    root.style.display = "block";
    window.dispatchEvent(new CustomEvent("cb:inspector:open"));
    info("[inspector.core] geöffnet", `v${VERSION}`);
  }

  function close() {
    if (!root) return;
    root.style.display = "none";
    window.dispatchEvent(new CustomEvent("cb:inspector:close"));
  }

  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = function (force) {
    ensureDOM();
    const isHidden = (root.style.display === "none" || !root.style.display);
    const wantOpen = (typeof force === "boolean") ? force : isHidden;
    wantOpen ? open() : close();
  };
  window.GameUI.openInspector  = open;
  window.GameUI.closeInspector = close;

  // Bereitmeldung (kein Auto-Open)
  info("[inspector.core] bereit", `v${VERSION}`);
})();
