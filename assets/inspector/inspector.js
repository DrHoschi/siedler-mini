/* ============================================================================
 *  assets/inspector/inspector.js
 *  Version: v18.10.3 (stabil, „nie wieder hängt beim Laden“)
 *  Projekt: Neue Siedler — Inspector Core
 *
 *  Ziele:
 *    - Öffnet/zeichnet sich ohne Warten (keine Hänger „Inspektor lädt…“)
 *    - Harte Sichtbarkeits-Garantie (z-index, Inline-Fallback-CSS)
 *    - CBLog-Integration: liest vorhandenen Buffer (getBuffer/_buf/Polyfill)
 *    - Tabs: Übersicht / Logs / Build / Pfade / Tests
 *    - Build-Tab liest optional window.BUILD_CATEGORIES (Fallback enthalten)
 *    - Pfade-Tab: Toggle + Reset-Events
 *    - Globale Bridge: GameUI.openInspector / closeInspector / toggleInspector
 *    - Events: cb:inspector:ready, cb:inspector:open, cb:inspector:close
 *  Hinweis:
 *    - Diese Datei ist autark. Sie funktioniert auch, wenn CSS fehlt
 *      (setzt dann ein knappes Inline-Fallback-CSS).
 * ========================================================================== */

(function(){
  "use strict";

  // -------- Mini-Logs (Polyfill freundlich) --------------------------------
  const L = (lvl, ...a)=> (window.CBLog?.[lvl]||console[lvl]||console.log).call(console, "[inspector.core]", ...a);
  const info = (...a)=> L("info", ...a);
  const warn = (...a)=> L("warn", ...a);

  // -------- Einmalige Initialisierungsschutz --------------------------------
  if (window.__InspectorInitialized__) { return; }
  window.__InspectorInitialized__ = true;

  // -------- Inline-Fallback-CSS (falls externe CSS ausfällt) ----------------
  (function injectInlineCSS(){
    if (document.getElementById("inspector-inline-css")) return;
    const css = `
    #inspector{position:fixed;inset:8vh 2vw auto 2vw;z-index:2147483646;
      max-height:84vh;display:none;background:rgba(22,22,22,.96);
      border:1px solid rgba(255,255,255,.08);border-radius:14px;box-shadow:0 28px 80px rgba(0,0,0,.55);
      color:#e8e8e8;font:14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Arial,sans-serif;
      backdrop-filter: blur(8px); }
    #inspector.open{display:block;}
    #inspector .ins-head{display:flex;align-items:center;gap:12px;padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,.06);}
    #inspector .ins-title{font-weight:700;letter-spacing:.2px;opacity:.92}
    #inspector .ins-close{margin-left:auto;border:none;border-radius:12px;padding:8px 12px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer}
    #inspector .ins-tabs{display:flex;gap:8px;flex-wrap:wrap;padding:10px 16px 0}
    #inspector .ins-tab{border:none;border-radius:999px;padding:6px 12px;background:rgba(255,255,255,.10);color:#ddd;cursor:pointer}
    #inspector .ins-tab.active{background:rgba(120,200,120,.22);color:#f4fff4}
    #inspector .ins-body{padding:12px 16px 0;overflow:auto;max-height:calc(84vh - 116px);}
    #inspector .ins-footer{padding:10px 16px 14px;display:flex;gap:10px;border-top:1px solid rgba(255,255,255,.06)}
    #inspector .ins-btn{border:none;border-radius:12px;padding:8px 12px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer}
    #inspector pre{margin:0;padding:10px 12px;background:#111;border:1px solid rgba(255,255,255,.08);border-radius:10px;
      white-space:pre-wrap;word-break:break-word;font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,Monaco,"Roboto Mono",Consolas,"Liberation Mono","Courier New",monospace;}
    @media (max-width:780px){
      #inspector{inset:0;max-height:100vh;border-radius:0}
      #inspector .ins-body{max-height:calc(100vh - 114px);}
    }`;
    const style = document.createElement("style");
    style.id = "inspector-inline-css"; style.textContent = css;
    document.head.appendChild(style);
  })();

  // -------- DOM-Bausteine ---------------------------------------------------
  let root, headEl, bodyEl, footerEl, preLog;
  let activeTab = "logs"; // Standard: Logs

  function ensureRoot(){
    root = document.getElementById("inspector");
    if (root) return;

    root = document.createElement("div");
    root.id = "inspector";
    root.setAttribute("role","dialog");
    root.setAttribute("aria-label","Inspector");

    root.innerHTML = `
      <div class="ins-head">
        <div class="ins-title">Inspector <span class="ins-ver">v18.10.3</span></div>
        <button class="ins-close" type="button" aria-label="Schließen">Schließen</button>
      </div>
      <div class="ins-tabs" role="tablist">
        <button class="ins-tab" data-tab="overview">Übersicht</button>
        <button class="ins-tab" data-tab="logs">Logs</button>
        <button class="ins-tab" data-tab="build">Build</button>
        <button class="ins-tab" data-tab="paths">Pfade</button>
        <button class="ins-tab" data-tab="tests">Tests</button>
      </div>
      <div class="ins-body"></div>
      <div class="ins-footer"></div>
    `;
    document.body.appendChild(root);

    headEl   = root.querySelector(".ins-head");
    bodyEl   = root.querySelector(".ins-body");
    footerEl = root.querySelector(".ins-footer");

    // Schließen
    root.querySelector(".ins-close").addEventListener("click", close);

    // Tabs
    root.querySelectorAll(".ins-tab").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        setActiveTab(btn.dataset.tab);
      });
    });

    // Erstes Rendern
    setActiveTab(activeTab);

    // Signal: bereit
    window.dispatchEvent(new CustomEvent("cb:inspector:ready"));
    // evtl. „Inspektor lädt…“-Badge entfernen
    const badge = document.getElementById("inspector-loader");
    if (badge) try{ badge.remove(); }catch{}
    info("bereit (v18.10.3)");
  }

  // -------- Tabs ------------------------------------------------------------
  function setActiveTab(id){
    activeTab = id;
    // Klasse pflegen
    root?.querySelectorAll(".ins-tab").forEach(t=>{
      t.classList.toggle("active", t.dataset.tab===id);
    });

    // Render-Switch
    switch(id){
      case "overview": renderOverview(); break;
      case "logs":     renderLogs();     break;
      case "build":    renderBuild();    break;
      case "paths":    renderPaths();    break;
      case "tests":    renderTests();    break;
      default:         renderLogs();
    }
  }

  // -------- Overview --------------------------------------------------------
  function renderOverview(){
    bodyEl.innerHTML = "";
    footerEl.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div style="opacity:.85;margin-bottom:8px"><b>Runtime</b></div>
      <div style="display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;opacity:.92">
        <div>Canvas:</div><div id="ov-canvas">?</div>
        <div>Map:</div><div id="ov-map">?</div>
        <div>FPS:</div><div id="ov-fps">?</div>
      </div>
      <div style="opacity:.65;margin-top:10px">Hinweis: Werte werden vereinfacht aus der Engine/DOM gelesen.</div>
    `;
    bodyEl.appendChild(wrap);

    // einfache Füllung
    try {
      const cvs = document.getElementById("game");
      wrap.querySelector("#ov-canvas").textContent = cvs ? `${cvs.width||cvs.clientWidth}×${cvs.height||cvs.clientHeight}` : "–";
    } catch {}
    try {
      const map = document.getElementById("game")?.dataset?.map;
      wrap.querySelector("#ov-map").textContent = map || "–";
    } catch {}
    try {
      wrap.querySelector("#ov-fps").textContent = window.__cb?.fps ? `${window.__cb.fps}` : "–";
    } catch {}
  }

  // -------- Logs ------------------------------------------------------------
  function readCBLogBuffer(){
    // robust: mehrere mögliche Speicherorte
    if (window.CBLog?.getBuffer) return window.CBLog.getBuffer();
    if (Array.isArray(window.CBLog?._buf)) return window.CBLog._buf;
    if (Array.isArray(window.__CBLOG_BUFFER__)) return window.__CBLOG_BUFFER__;
    return [];
  }

  function formatEntry(e){
    // e kann string oder {time,level,scope,msg} sein
    if (typeof e === "string") return e;
    const ts = e.time || e.t || "";
    const lvl = (e.level||e.lvl||"LOG").toUpperCase().padEnd(5," ");
    const scope = e.scope ? `[${e.scope}] ` : "";
    const msg = e.msg || e.message || "";
    return `[${ts}] ${lvl} ${scope}${msg}`;
  }

  function renderLogs(){
    bodyEl.innerHTML = "";
    footerEl.innerHTML = "";

    preLog = document.createElement("pre");
    preLog.setAttribute("aria-live","polite");
    bodyEl.appendChild(preLog);

    const btnCopy = mkBtn("Kopieren", ()=> {
      try {
        const txt = preLog.textContent || "";
        navigator.clipboard?.writeText(txt);
      } catch {}
    });
    const btnClear = mkBtn("Leeren", ()=> {
      try { window.CBLog?.clear?.(); } catch {}
      preLog.textContent = "";
    });
    const btnRefresh = mkBtn("Aktualisieren", ()=> fillLog(true));

    footerEl.append(btnCopy, btnClear, btnRefresh);

    // initial
    fillLog(false);

    // Live-Refresh (versch. Eventnamen akzeptieren)
    const onAppend = ()=> {
      if (activeTab==="logs") fillLog(false);
    };
    window.addEventListener("cblog:append", onAppend);
    window.addEventListener("CBLog:append", onAppend);
    window.addEventListener("cb:log", onAppend);
    // beim Tab-Wechsel wird neu gerendert; hier reicht das
  }

  function fillLog(forceScrollToEnd){
    const buf = readCBLogBuffer();
    if (!buf || !buf.length){
      preLog.textContent = "[Keine Log-Einträge vorhanden]";
      return;
    }
    const wasAtEnd = isScrolledToEnd(bodyEl);
    preLog.textContent = buf.map(formatEntry).join("\n");
    if (forceScrollToEnd || wasAtEnd){
      bodyEl.scrollTop = bodyEl.scrollHeight;
    }
  }

  function isScrolledToEnd(scroller){
    const EPS = 8;
    return (scroller.scrollTop + scroller.clientHeight) >= (scroller.scrollHeight - EPS);
  }

  // -------- Build (aus BUILD_CATEGORIES, Fallback vorhanden) ----------------
  function renderBuild(){
    bodyEl.innerHTML = "";
    footerEl.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:10px";
    bodyEl.appendChild(wrap);

    const cats = (window.BUILD_CATEGORIES && Array.isArray(window.BUILD_CATEGORIES))
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
        ];

    const mkH = (txt)=>{ const h=document.createElement("div"); h.textContent=txt; h.style.cssText="opacity:.85;font-weight:700;margin-top:6px"; return h; };
    const mkPill = (label, disabled=false)=>{
      const b=document.createElement("button");
      b.textContent = label;
      b.disabled = !!disabled;
      b.className = "ins-btn";
      b.style.borderRadius = "999px";
      b.style.background = disabled ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.12)";
      b.style.opacity = disabled ? ".55" : "1";
      return b;
    };

    cats.forEach(cat=>{
      wrap.appendChild(mkH(cat.title||cat.id));
      const row = document.createElement("div");
      row.style.cssText = "display:flex;flex-wrap:wrap;gap:6px";
      (cat.items||[]).forEach(it=>{
        const btn = mkPill(it.label||it.id, !!it.todo);
        if (!it.todo){
          btn.addEventListener("click", ()=>{
            const detail = { type: it.id };
            try { window.dispatchEvent(new CustomEvent("cb:build-select", { detail })); } catch {}
            (window.CBLog?.log||console.log)("[Build] Auswahl:", `${it.label||it.id} (${it.id})`);
          });
        }
        row.appendChild(btn);
      });
      wrap.appendChild(row);
    });
  }

  // -------- Paths (Overlay/Heatmap steuern) ---------------------------------
  function renderPaths(){
    bodyEl.innerHTML = "";
    footerEl.innerHTML = "";

    const box = document.createElement("div");
    box.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center";
    bodyEl.appendChild(box);

    const status = document.createElement("div");
    status.style.cssText = "opacity:.8";
    const refreshStatus = ()=>{
      const on = !!(window.__cb && window.__cb.pathsEnabled);
      status.textContent = `Pfade-Overlay: ${on ? "AN" : "AUS"}`;
    };
    refreshStatus();

    box.appendChild(mkBtn("Overlay umschalten", ()=>{
      try { window.dispatchEvent(new CustomEvent("cb:paths:toggle")); } catch {}
      setTimeout(refreshStatus, 60);
    }));
    box.appendChild(mkBtn("Heatmap zurücksetzen", ()=>{
      try { window.dispatchEvent(new CustomEvent("cb:paths:reset")); } catch {}
    }));
    box.appendChild(status);
  }

  // -------- Tests (Platzhalter) ---------------------------------------------
  function renderTests(){
    bodyEl.innerHTML = "";
    footerEl.innerHTML = "";
    const p = document.createElement("div");
    p.style.opacity = ".8";
    p.textContent = "Tests – Platzhalter.";
    bodyEl.appendChild(p);
  }

  // -------- Helpers ---------------------------------------------------------
  function mkBtn(label, onClick){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ins-btn";
    b.textContent = label;
    if (onClick) b.addEventListener("click", onClick);
    return b;
  }

  // -------- API: open/close/toggle ------------------------------------------
  function open(){
    ensureRoot();
    root.classList.add("open");
    setActiveTab(activeTab||"logs");
    window.dispatchEvent(new CustomEvent("cb:inspector:open"));
    info("geöffnet (v18.10.3)");
  }
  function close(){
    if (!root) return;
    root.classList.remove("open");
    window.dispatchEvent(new CustomEvent("cb:inspector:close"));
    info("geschlossen");
  }
  function toggle(){
    ensureRoot();
    if (root.classList.contains("open")) close(); else open();
  }

  // -------- Bridge für FAB/UI -----------------------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI.openInspector  = open;
  window.GameUI.closeInspector = close;
  window.GameUI.toggleInspector= toggle;

  // -------- Auto-Init (ohne Warten) -----------------------------------------
  // Sofort melden, dass wir da sind, und Loader-Badge loswerden
  try{ window.dispatchEvent(new CustomEvent("cb:inspector:ready")); }catch{}
  const maybeBadge = document.getElementById("inspector-loader");
  if (maybeBadge) try{ maybeBadge.remove(); }catch{}

  // Optional: per Query ?inspector=1 direkt öffnen
  if (location.search.includes("inspector=1")) {
    // kurzer Timeout lässt DOM ankommen, blockiert aber nicht
    setTimeout(open, 50);
  }
})();
