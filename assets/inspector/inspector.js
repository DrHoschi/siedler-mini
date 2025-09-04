/* ============================================================================
 *  assets/inspector/inspector.js
 *  Neue Siedler – Inspector (stabil + Tabs)
 *  Version: v18.9.3
 *  CODE_STYLE
 *    - Keine externen Abhängigkeiten; nutzt CBLog wenn vorhanden, sonst Polyfill
 *    - Idempotent (Guard gegen Doppel-Init)
 *    - Tabs: Übersicht | Logs | Build | Pfade | Tests (Tests Platzhalter)
 *    - Öffnen via window.GameUI.toggleInspector()
 *    - Auto-Open nur via ?inspector=1 oder Event 'cb:inspector-open'
 *    - Logs: Puffer + Live-Stream, Kopieren/Leeren/Aktualisieren
 *    - Rückwärtskompatibel – bricht nichts, was schon lief
 * ========================================================================== */
(function () {
  "use strict";

  // ---- Doppel-Init verhindern ------------------------------------------------
  if (window.__INSPECTOR_CORE_READY__) return;
  window.__INSPECTOR_CORE_READY__ = true;

  const VERSION = "v18.9.3";
  const NS = "[inspector.core]";

  // ---- Helpers ---------------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html!=null) n.innerHTML = html; return n; };
  const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
  const tsFmt = (t) => { const d = new Date(t || Date.now()); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };
  const toStr = (v) => { if (v == null) return ""; if (typeof v === "string") return v; try { return JSON.stringify(v); } catch { return String(v); } };

  // ---- CBLog-Brücke (oder Polyfill) -----------------------------------------
  const CB = (function ensureCBLog() {
    if (window.CBLog && typeof window.CBLog.on === "function") return window.CBLog;

    const buf = [];
    const subs = new Set();
    const push = (level, args, tag) => {
      const arr = Array.from(args || []);
      if (!arr.length) return;                      // keine leeren Logzeilen
      const entry = { ts: Date.now(), level, tag, args: arr };
      buf.push(entry);
      subs.forEach(fn => { try { fn(entry); } catch {} });
    };

    if (!window.__CBLOG_CONSOLE_PATCHED__) {
      window.__CBLOG_CONSOLE_PATCHED__ = true;
      ["log","info","warn","error"].forEach(m=>{
        const orig = console[m].bind(console);
        console[m] = function(){ try { push(m.toUpperCase(), arguments, "console"); } catch {} ; orig.apply(console, arguments); };
      });
      try { console.info("[CBLog] Polyfill aktiv"); } catch {}
    }

    return {
      info:  function(){ push("INFO",  arguments); },
      log:   function(){ push("LOG",   arguments); },
      warn:  function(){ push("WARN",  arguments); },
      error: function(){ push("ERROR", arguments); },
      on:    function(fn){ subs.add(fn); },
      off:   function(fn){ subs.delete(fn); },
      getBuffer(){ return buf.slice(); }
    };
  })();

  try { CB.info(`${NS} bereit (${VERSION})`); } catch {}

  // ---- UI (lazy) -------------------------------------------------------------
  let root, tabsEl, bodyEl, footerEl, preLog;
  let currentTab = "logs";

  function buildUI(){
    if (root) return;

    // Shell
    root = el("div","inspector");
    root.id = "inspector";
    root.setAttribute("role","dialog");
    root.style.cssText =
      "position:fixed;left:2.5vw;right:2.5vw;bottom:8vh;max-width:980px;margin:0 auto;"+
      "background:rgba(20,20,20,.94);border:1px solid rgba(255,255,255,.08);border-radius:12px;"+
      "color:#eee;z-index:2147483646;box-shadow:0 40px 120px rgba(0,0,0,.55)";

    // Header
    const head = el("div","insp-head");
    head.style.cssText = "display:flex;align-items:center;gap:10px;padding:10px 12px 8px";
    head.appendChild(el("div","insp-title", `<strong>Inspector</strong><span style="opacity:.55;margin-left:8px">${VERSION}</span>`));
    const spacer = el("div"); spacer.style.flex="1"; head.appendChild(spacer);
    const btnClose = el("button","insp-close","Schließen");
    btnClose.style.cssText="border:none;border-radius:10px;padding:6px 10px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer";
    btnClose.addEventListener("click", close);
    head.appendChild(btnClose);
    root.appendChild(head);

    // Tabs
    tabsEl = el("div","insp-tabs");
    tabsEl.style.cssText = "display:flex;gap:8px;padding:0 12px 10px";
    [["overview","Übersicht"],["logs","Logs"],["build","Build"],["paths","Pfade"],["tests","Tests"]].forEach(([id,label])=>{
      const b = el("button","insp-tab",label);
      b.dataset.tab = id;
      b.style.cssText = "border:none;border-radius:999px;padding:6px 12px;background:rgba(255,255,255,.10);color:#ddd;cursor:pointer";
      b.addEventListener("click",()=>switchTab(id));
      tabsEl.appendChild(b);
    });
    root.appendChild(tabsEl);

    // Body
    bodyEl = el("div","insp-body");
    bodyEl.style.cssText = "padding:0 12px 12px";

    // Log-Box (auch als generische Box für Info-Texte genutzt)
    const box = el("div","insp-box");
    box.style.cssText="background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.08);border-radius:8px;overflow:hidden";
    preLog = el("pre","insp-pre");
    preLog.style.cssText="margin:0;padding:12px;white-space:pre-wrap;font:13px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#dfe8f0;min-height:200px;max-height:48vh;overflow:auto";
    box.appendChild(preLog);
    bodyEl.appendChild(box);

    // Footer (nur im Log-Tab sichtbar)
    footerEl = el("div","insp-foot");
    footerEl.style.cssText = "display:flex;gap:8px;padding:10px 12px 12px";
    const btnCopy     = mkBtn("Kopieren", copyLogs);
    const btnClear    = mkBtn("Leeren",   ()=>{ preLog.textContent=""; });
    const btnRefresh  = mkBtn("Aktualisieren", refreshLogs);
    footerEl.append(btnCopy, btnClear, btnRefresh);
    bodyEl.appendChild(footerEl);

    root.appendChild(bodyEl);
    document.body.appendChild(root);

    switchTab(currentTab);
  }

  function mkBtn(label, fn){
    const b = el("button","insp-btn",label);
    b.style.cssText="border:none;border-radius:10px;padding:6px 10px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer";
    b.addEventListener("click", fn);
    return b;
  }

  function switchTab(id){
    currentTab = id;
    [...tabsEl.querySelectorAll("button")].forEach(b=>{
      const active = (b.dataset.tab===id);
      b.style.background = active ? "rgba(76,175,80,.28)" : "rgba(255,255,255,.10)";
      b.style.color      = active ? "#e9f6ec"           : "#ddd";
    });

    footerEl.style.display = (id === "logs") ? "" : "none";

    if (id === "logs") {
      refreshLogs();
    } else if (id === "overview") {
      renderOverview();
    } else if (id === "build") {
      renderBuild();
    } else if (id === "paths") {
      renderPaths();
    } else if (id === "tests") {
      preLog.textContent = "[Tests: Platzhalter – folgt]";
    } else {
      preLog.textContent = "";
    }
  }

  // ---- Logs ------------------------------------------------------------------
  let streamOn = false;
  function startStream(){
    if (streamOn) return;
    streamOn = true;
    refreshLogs();
    if (CB && typeof CB.on === "function") CB.on(onLogEntry);
  }
  function onLogEntry(e){
    if (!preLog || currentTab !== "logs") return;
    const line = formatEntry(e);
    if (!line) return;
    preLog.textContent += (preLog.textContent ? "\n" : "") + line;
    preLog.scrollTop = preLog.scrollHeight;
  }
  function formatEntry(e){
    try{
      if (typeof e === "string") return e.trim() ? e : "";
      if (Array.isArray(e)){
        const [ts,lvl,tag,...rest] = e;
        const msg = rest.map(toStr).join(" ").trim();
        if (!msg) return "";
        return `[${tsFmt(ts)}] ${(lvl||"LOG").toString().toUpperCase()}${tag ? " ["+tag+"]" : ""} ${msg}`;
      }
      const t   = e.ts || e.time || Date.now();
      const lvl = (e.level || e.lvl || e.type || "LOG").toString().toUpperCase();
      const tag = e.tag || e.scope || "";
      let payload = "";
      if (Array.isArray(e.args)) payload = e.args.map(toStr).join(" ");
      else if (e.message!=null)  payload = toStr(e.message);
      else if (e.text!=null)     payload = toStr(e.text);
      else if (e.msg!=null)      payload = toStr(e.msg);
      payload = payload.trim();
      if (!payload && !tag) return "";
      return `[${tsFmt(t)}] ${lvl}${tag ? " ["+tag+"]" : ""} ${payload}`.trim();
    }catch{ return ""; }
  }
  function refreshLogs(){
    try {
      const buf = (CB && CB.getBuffer && CB.getBuffer()) || window.__CBLOG_BUF || [];
      const lines = buf.map(formatEntry).filter(Boolean);
      preLog.textContent = lines.length ? lines.join("\n") : "[Keine Log-Einträge vorhanden]";
      preLog.scrollTop = preLog.scrollHeight;
    } catch (e) {
      preLog.textContent = "[Log konnte nicht gelesen werden]";
      try { console.warn(NS, "refreshLogs failed:", e); } catch {}
    }
  }
  async function copyLogs(){
    try{
      const text = preLog?.textContent || "";
      if (!text) return toast("Kein Log vorhanden");
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement("textarea"); ta.value=text; ta.style.position="fixed"; ta.style.opacity="0";
        document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
      }
      toast("Logs kopiert");
    }catch(e){
      toast("Kopieren fehlgeschlagen");
      try { console.warn(NS, "copyLogs failed:", e); } catch {}
    }
  }

  // ---- Übersicht (kleines Runtime-Panel) ------------------------------------
  let fpsAvg = 0, fpsSamples = [];
  (function trackFPS(){
    let last = performance.now();
    function tick(t){
      const dt = Math.max(1, t-last); last = t;
      const fps = 1000/dt;
      fpsSamples.push(fps); if (fpsSamples.length>30) fpsSamples.shift();
      fpsAvg = Math.round(fpsSamples.reduce((a,b)=>a+b,0)/fpsSamples.length);
      requestAnimationFrame(tick);
    }
    try { requestAnimationFrame(tick); } catch {}
  })();

  function renderOverview(){
    try{
      const canvas = $("#game");
      const size = canvas ? `${canvas.width||canvas.clientWidth||0}×${canvas.height||canvas.clientHeight||0}` : "–";
      const map   = canvas?.dataset?.map || window.__cb?.mapName || "unbekannt";
      const zoom  = (window.__cb?.camera?.zoom != null) ? window.__cb.camera.zoom.toFixed(2) : "–";
      const runtime = (performance.now()/1000).toFixed(1) + "s";

      preLog.textContent =
        `Runtime: ${runtime}\n`+
        `FPS (glatt): ${fpsAvg||"–"}\n`+
        `Canvas: ${size}\n`+
        `Map: ${map}\n`+
        `Zoom: ${zoom}\n`+
        `[Übersicht wird später erweitert]`;
    }catch(e){
      preLog.textContent = "[Übersicht nicht verfügbar]";
    }
  }

  // === REPLACE in assets/inspector/inspector.js ==============================
  // 1) Build-Tab – liest optional window.BUILD_CATEGORIES
  function renderBuild(){
    // UI-Container vorbereiten
    preLog.textContent = "";
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
            // kleine Rückmeldung
            try{
              preLog.textContent = `Aktives Build-Tool: ${it.id}\n(Event cb:build-select gesendet)`;
            }catch{}
          });
        }
        row.appendChild(btn);
      });
      wrap.appendChild(row);
    });

    // Ersetz den Log-Bereich durch unser kleines Build-UI
    bodyEl.innerHTML = "";
    bodyEl.appendChild(wrap);
    footerEl.style.display = "none"; // im Build-Tab brauchen wir die Log-Buttons nicht
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
  // === /REPLACE ===============================================================

  // ---- Toast -----------------------------------------------------------------
  function toast(msg){
    try{
      let t = $("#insp-toast");
      if(!t){
        t = el("div","", "");
        t.id = "insp-toast";
        t.style.cssText = "position:fixed;left:50%;bottom:12vh;transform:translateX(-50%);"+
          "background:rgba(0,0,0,.78);color:#fff;padding:8px 12px;border-radius:10px;"+
          "border:1px solid rgba(255,255,255,.12);font:12px/1.2 system-ui,Segoe UI,Arial,sans-serif;"+
          "z-index:2147483647;opacity:0;transition:opacity .15s ease";
        document.body.appendChild(t);
      }
      t.textContent = msg; t.style.opacity = "1";
      setTimeout(()=>{ t.style.opacity="0"; }, 900);
    }catch{}
  }

  // ---- Öffentliche API -------------------------------------------------------
  function open(){ buildUI(); root.style.display="block"; startStream(); try{ CB.info(`${NS} geöffnet (${VERSION})`);}catch{} }
  function close(){ if (!root) return; root.style.display="none"; }
  function toggle(){ if (!root || root.style.display==="none" || !root.style.display) open(); else close(); }

  window.GameUI = window.GameUI || {};
  if (window.GameUI.toggleInspector !== toggle) window.GameUI.toggleInspector = toggle;
  window.GameUI.openInspector  = open;
  window.GameUI.closeInspector = close;

  // ---- Auto-Open (nur auf Wunsch) -------------------------------------------
  try{
    if (/\binspector=1\b/.test(location.search)) setTimeout(open, 60);
    window.addEventListener("cb:inspector-open", open);
  }catch{}

  // ---- Mini-Failsafe-Badge ---------------------------------------------------
  (function ensureBadge(){
    try{
      if (document.getElementById("btn-inspector")) return;
      const b = el("button","", "🛠");
      b.title = "Inspector öffnen";
      b.style.cssText =
        "position:fixed;right:14px;bottom:14px;width:48px;height:48px;border:none;border-radius:50%;"+
        "background:rgba(30,30,30,.92);color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.35);z-index:2147483647;cursor:pointer";
      b.addEventListener("click", toggle);
      document.addEventListener("DOMContentLoaded", ()=>document.body.appendChild(b));
    }catch{}
  })();

  // ---- Event-Doku ------------------------------------------------------------
  //   window.dispatchEvent(new CustomEvent('cb:build-select', { detail:{ type:'house' } }));
  //   window.dispatchEvent(new CustomEvent('cb:paths:toggle'));
  //   window.dispatchEvent(new CustomEvent('cb:paths:reset'));
})();
