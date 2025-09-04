/* ============================================================================
 *  assets/inspector/inspector.js — v18.7.1
 *  Projekt: Neue Siedler
 *  CODE_STYLE:
 *    - Ein Datei-Monolith (UI, Log-Stream, Bridge)
 *    - Defensive DOM-Erstellung (idempotent)
 *    - Harte Sichtbarkeits-Garantie: hoher z-index, pointer-events
 *    - Logging über CBLog; falls nicht vorhanden: schlanke Proxy-Konsole
 *  CHANGELOG:
 *    v18.7.1  Kein Auto-Open mehr. Optional via ?inspector=1 oder „Auto“-Pin.
 *              Stabilere Log-Pipeline + Puffer-Flush bei Open.
 * ==========================================================================*/

(function () {
  const VERSION = "v18.7.1";

  // ---------- Mini-Helfer
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "style" && typeof v === "string") n.style.cssText = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v != null) n.setAttribute(k, v);
    }
    for (const k of kids) n.appendChild(typeof k === "string" ? document.createTextNode(k) : k);
    return n;
  };
  const once = (fn) => { let done = false; return (...a)=>{ if(!done){ done=true; return fn(...a);} }; };

  // ---------- CBLog / Console Bridge
  const CBLog = (function makeCBLog(){
    const bus = [];
    const api = (type, ...a) => {
      const line = stamp(type, ...a);
      bus.push(line);
      (console[type] || console.log).call(console, ...a);
      window.dispatchEvent(new CustomEvent("cb:log", { detail: line }));
    };
    const stamp = (type, ...a) => {
      const ts = new Date();
      const pad = (n)=> String(n).padStart(2,"0");
      const h=`${pad(ts.getHours())}:${pad(ts.getMinutes())}:${pad(ts.getSeconds())}`;
      return `[${h}] ${type.toUpperCase().padEnd(4)} ${a.join(" ")}`;
    };
    api.getBuffer = ()=> bus.slice();
    // Falls bereits vorhanden, diese Implementierung nicht doppeln
    if (window.CBLog && typeof window.CBLog.getBuffer === "function") return window.CBLog;
    // Minimal-Proxy für console -> CBLog
    const wrap = (t)=> (...a)=> api(t, ...a);
    const prox = { info:wrap("info"), log:wrap("log"), warn:wrap("warn"), error:wrap("error"), getBuffer:api.getBuffer };
    window.CBLog = prox;
    prox.info("[CBLog] Polyfill aktiv (Inspector-Fallback)");
    return prox;
  })();

  // ---------- Zustand
  const state = {
    open: false,
    activeTab: "logs",
    el: null,
    auto: (localStorage.getItem("__cbInspectorAuto") === "1")
  };

  // ---------- UI erstellen (idempotent)
  function ensureUI() {
    if (state.el) return state.el;

    const root = el("div", {
      id: "inspector",
      style: `
        position:fixed; inset:auto 12px 96px 12px; 
        max-width:920px; margin:0 auto;
        z-index:2147483646; color:#e6e6e6;
        font: 14px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, sans-serif;
        pointer-events:auto; display:none;
      `
    });

    // Rahmen
    const panel = el("div", { style: `
      background:linear-gradient(180deg, rgba(28,28,30,.98), rgba(20,20,22,.98));
      border:1px solid rgba(255,255,255,.08);
      border-radius:14px;
      box-shadow:0 30px 80px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.03);
      overflow:hidden;
    `});

    const head = el("div", { style: `
      display:flex; align-items:center; gap:8px; padding:12px 12px 10px 16px;
      border-bottom:1px solid rgba(255,255,255,.06);
      position:relative;
    `},
      el("div", { style:"font-weight:700; letter-spacing:.2px;" }, "Inspector"),
      el("div", { style:"opacity:.65; font-size:12px; margin-left:6px;" }, VERSION),
      el("div", { style:"flex:1" }),
      // Auto-Pin
      el("button", {
        id:"ins-auto",
        title:"Inspector beim Laden automatisch öffnen (umschalten)",
        style: btnStyle(false),
        onclick(){
          state.auto = !state.auto;
          localStorage.setItem("__cbInspectorAuto", state.auto ? "1" : "0");
          this.style.cssText = btnStyle(state.auto);
        }
      }, "Auto"),
      // Close
      el("button", {
        title:"Schließen",
        style: btnStyle(false),
        onclick: close
      }, "Schließen")
    );

    const tabs = el("div", { style:"display:flex; gap:10px; padding:10px 12px 8px 12px; border-bottom:1px solid rgba(255,255,255,.06);" });
    const body = el("div", { id:"ins-body", style:"padding:12px; min-height:240px;" });

    panel.append(head, tabs, body);
    root.append(panel);
    document.body.appendChild(root);

    // Tabs
    const TAB_DEF = [
      { id:"overview", label:"Übersicht", render: renderOverview },
      { id:"logs",     label:"Logs",     render: renderLogs },
      { id:"build",    label:"Build",    render: renderBuild },
      { id:"paths",    label:"Pfade",    render: renderPaths },
      { id:"tests",    label:"Tests",    render: renderTests },
    ];
    TAB_DEF.forEach(t => {
      const b = el("button", {
        "data-tab": t.id,
        style: pillStyle(t.id==="logs"),
        onclick(){
          state.activeTab = t.id;
          // Buttons visuell aktualisieren
          [...tabs.children].forEach(btn=>{
            btn.style.cssText = pillStyle(btn.getAttribute("data-tab") === state.activeTab);
          });
          renderActive();
        }
      }, t.label);
      tabs.appendChild(b);
    });

    // Auto Button initialer Zustand
    $("#ins-auto", head).style.cssText = btnStyle(state.auto);

    state.el = root;
    return root;
  }

  // ---------- Styles
  function btnStyle(active){
    return `
      border:none; cursor:pointer; user-select:none;
      padding:8px 12px; border-radius:10px; 
      background:${active ? "rgba(90,200,120,.18)" : "rgba(255,255,255,.08)"};
      color:#fff; box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
    `;
  }
  function pillStyle(active){
    return `
      border:none; cursor:pointer; user-select:none;
      padding:8px 14px; border-radius:18px; font-weight:600;
      background:${active ? "rgba(120,200,255,.22)" : "rgba(255,255,255,.10)"};
      color:#eaeaea; box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
    `;
  }

  // ---------- Render-Tab-Body
  function renderActive(){
    const body = $("#ins-body", state.el);
    body.innerHTML = "";
    switch (state.activeTab){
      case "overview": renderOverview(body); break;
      case "logs":     renderLogs(body); break;
      case "build":    renderBuild(body); break;
      case "paths":    renderPaths(body); break;
      case "tests":    renderTests(body); break;
    }
  }

  function renderOverview(body){
    const rows = [
      ["Version (Inspector)", VERSION],
      ["Canvas", findCanvasInfo()],
      ["Map", window.Game?.map?.name || getCanvasDataMap() || "unbekannt"],
      ["FPS (wenn vorhanden)", window.Game?.stats?.fps?.toFixed?.(1) || "—"]
    ];
    body.appendChild(kvTable(rows));
  }

  function findCanvasInfo(){
    const c = $("#game");
    if (!c) return "—";
    return `${c.width || c.clientWidth}×${c.height || c.clientHeight} @${(window.devicePixelRatio||1)}x`;
  }
  function getCanvasDataMap(){
    return $("#game")?.getAttribute("data-map") || null;
  }
  function kvTable(rows){
    const wrap = el("div", { style:"display:grid; grid-template-columns: 160px 1fr; gap:8px; align-items:center;" });
    rows.forEach(([k,v])=>{
      wrap.append(
        el("div", { style:"opacity:.75;" }, k),
        el("div", {}, String(v))
      );
    });
    return wrap;
  }

  // LOGS
  let logBox, copyBtn, clearBtn, refreshBtn;
  function renderLogs(body){
    const box = el("pre", {
      id:"ins-logbox",
      style: `
        background:#131416; border:1px solid rgba(255,255,255,.08);
        border-radius:10px; padding:12px; margin-bottom:10px;
        max-height:48vh; overflow:auto; white-space:pre-wrap;
        font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      `
    }, "[Log wird geladen…]");

    const bar = el("div", { style:"display:flex; gap:10px;" },
      clearBtn = el("button", { style: btnStyle(false), onclick(){ setLogText(""); } }, "Leeren"),
      refreshBtn = el("button", { style: btnStyle(false), onclick(){ flushBufferIntoBox(true); } }, "Aktualisieren"),
      copyBtn = el("button", { style: btnStyle(false), onclick(){ copyLogs(); } }, "Kopieren")
    );

    body.append(box, bar);
    logBox = box;
    // Initial füllen
    flushBufferIntoBox(false);

    // Live-Stream abonnieren
    window.addEventListener("cb:log", onLogEvent);
  }
  function onLogEvent(ev){
    if (!logBox) return;
    const line = ev.detail || "";
    appendLine(line);
  }
  function flushBufferIntoBox(scrollEnd){
    if (!logBox) return;
    const buf = (window.CBLog?.getBuffer?.() || []);
    setLogText(buf.join("\n"));
    if (scrollEnd) logBox.scrollTop = logBox.scrollHeight;
  }
  function appendLine(line){
    if (logBox.textContent === "[Log wird geladen…]" || logBox.textContent === "[Keine Log-Einträge vorhanden]"){
      logBox.textContent = line;
    } else {
      logBox.textContent += (logBox.textContent.endsWith("\n") ? "" : "\n") + line;
    }
    logBox.scrollTop = logBox.scrollHeight;
  }
  function setLogText(txt){
    logBox.textContent = txt && txt.length ? txt : "[Keine Log-Einträge vorhanden]";
  }
  async function copyLogs(){
    try{
      await navigator.clipboard.writeText(logBox.textContent || "");
      (window.CBLog?.info||console.log)("[inspector.core] Logs kopiert");
    }catch(e){
      alert("Kopieren nicht möglich.");
    }
  }

  // Build (Platzhalter)
  function renderBuild(body){
    body.appendChild(el("div", {}, "Hier kommen Build-Infos (Tool, Vorschau, etc.)"));
  }

  // Pfade (Platzhalter)
  function renderPaths(body){
    body.appendChild(el("div", {}, "Pfad-Overlay / Heatmap (später)"));
  }

  // Tests (Platzhalter)
  function renderTests(body){
    body.appendChild(el("div", {}, "Schnelltests / Buttons folgen."));
  }

  // ---------- Open/Close
  function open() {
    ensureUI();
    // Tab sicherstellen
    const tabsRow = state.el.querySelectorAll("[data-tab]");
    tabsRow.forEach(btn=>{
      btn.style.cssText = pillStyle(btn.getAttribute("data-tab") === state.activeTab);
    });

    state.el.style.display = "block";
    state.open = true;
    renderActive();
    // Beim Öffnen Puffer in Log holen
    if (state.activeTab === "logs") flushBufferIntoBox(true);
    (window.CBLog?.info||console.log)(`[inspector.core] geöffnet (${VERSION})`);
  }
  function close() {
    if (!state.el) return;
    state.el.style.display = "none";
    state.open = false;
    // Listener lösen, wenn Logs aktiv waren
    window.removeEventListener("cb:log", onLogEvent);
  }
  function toggle() {
    if (state.open) close();
    else open();
  }

  // ---------- Öffentliche Bridge (für FABs/UX)
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = toggle;
  window.GameUI.openInspector   = open;
  window.GameUI.closeInspector  = close;

  // ---------- Start-Heuristik (ohne Auto-Open by default)
  const tryAuto = once(()=>{
    const wants = /\binspector=1\b/.test(location.search) || state.auto;
    if (wants) open();
  });

  // UI früh erstellen (damit FAB sofort funktioniert), aber NICHT automatisch öffnen
  ensureUI();
  // minimal verzögert Auto-Heuristik prüfen
  setTimeout(tryAuto, 50);

  (window.CBLog?.info||console.log)(`[inspector.core] bereit (${VERSION})`);
})();
