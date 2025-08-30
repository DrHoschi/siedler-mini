/*
============================================================
Datei: tools/dev-inspector.js
Projekt: Siedler-Mini
Version: 16.1.19
Zweck: Developer-Inspector (Tabs: Live-Daten & Logs)
============================================================
*/

/* 1) Imports */
// – keine externen Importe

/* 2) Konstanten / Meta */
const DEV_INSP_VERSION = "16.1.19";

/* 3) Hilfsfunktionen */
// ----------------------------------------------
// Safe: Log-Puffer initialisieren & Konsole einmal patchen
// ----------------------------------------------
(function ensureLogBuffer(){
  window.__cbLogBuffer = window.__cbLogBuffer || [];
  if (window.__cb?.consolePatched) return;
  const orig = {
    log:   console.log.bind(console),
    info:  console.info?.bind(console)  || console.log.bind(console),
    warn:  console.warn?.bind(console)  || console.log.bind(console),
    error: console.error?.bind(console) || console.log.bind(console)
  };
  const push = (lvl, args) => {
    try {
      const t = new Date().toTimeString().slice(0,8);
      const line = `[${t}] ${lvl.toUpperCase()} ${args.map(a =>
        (typeof a === 'string' ? a : JSON.stringify(a))
      ).join(' ')}`;
      window.__cbLogBuffer.push(line);
      if (window.__cbLogBuffer.length > 5000) window.__cbLogBuffer.splice(0, 1000); // Ringpuffer
    } catch(e) {}
  };
  console.log   = (...a)=>{ push('log',   a); orig.log(...a); };
  console.info  = (...a)=>{ push('info',  a); orig.info(...a); };
  console.warn  = (...a)=>{ push('warn',  a); orig.warn(...a); };
  console.error = (...a)=>{ push('error', a); orig.error(...a); };
  window.__cb = window.__cb || {};
  window.__cb.consolePatched = true;
})();

function getLogText() {
  // bevorzugt CBLog.dump(), sonst __cbLogBuffer
  try {
    if (window.CBLog?.dump) return window.CBLog.dump();
  } catch(e) {}
  return (window.__cbLogBuffer || []).join("\n");
}

function oneV(v){ return v ? `v${String(v).replace(/^v+/, '')}` : '?'; }

function ensurePanel() {
  let wrap = document.getElementById("cb-dev-inspector");
  if (wrap) return wrap;

  wrap = document.createElement("div");
  wrap.id = "cb-dev-inspector";
  Object.assign(wrap.style, {
    position: "fixed",
    right: "calc(16px + env(safe-area-inset-right, 0px))",
    bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
    width: "360px",
    maxHeight: "65vh",
    overflow: "hidden",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.55)",
    color: "#e6f2ed",
    boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
    backdropFilter: "blur(6px)",
    zIndex: "900",          // unter dem Start-Panel
    display: "none"
  });

  // Header
  const h = document.createElement("div");
  h.textContent = `Inspector (${oneV(DEV_INSP_VERSION)})`;
  h.style.fontWeight = "700";
  h.style.marginBottom = "8px";

  // Tabs
  const tabs = document.createElement("div");
  tabs.style.display = "flex";
  tabs.style.gap = "6px";
  tabs.style.marginBottom = "8px";

  const tabBtn = (label, id) => {
    const b = document.createElement("button");
    Object.assign(b.style, {
      padding: "6px 10px",
      borderRadius: "8px",
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(0,0,0,0.25)",
      color: "#e6f2ed",
      cursor: "pointer",
      fontSize: "13px"
    });
    b.textContent = label;
    b.dataset.tab = id;
    return b;
  };
  const btnLive = tabBtn("Live", "live");
  const btnLogs = tabBtn("Logs", "logs");
  tabs.append(btnLive, btnLogs);

  // Content Areas
  const liveBox = document.createElement("pre");
  liveBox.id = "cb-dev-inspector-live";
  liveBox.style.whiteSpace = "pre-wrap";
  liveBox.style.fontSize = "12px";
  liveBox.style.margin = "0";
  liveBox.style.maxHeight = "45vh";
  liveBox.style.overflow = "auto";

  const logsBoxWrap = document.createElement("div");
  logsBoxWrap.id = "cb-dev-inspector-logs-wrap";
  logsBoxWrap.style.display = "none";

  // Log Buttons
  const logButtons = document.createElement("div");
  logButtons.style.display = "flex";
  logButtons.style.gap = "8px";
  logButtons.style.marginBottom = "6px";

  const btnCopy = tabBtn("📋 Kopieren", "copy");
  const btnExport = tabBtn("⬇️ Export (.txt)", "export");
  const btnClear = tabBtn("🗑️ Leeren", "clear");
  [btnCopy, btnExport, btnClear].forEach(b => { b.style.fontSize = "12px"; b.style.padding = "6px 8px"; });
  logButtons.append(btnCopy, btnExport, btnClear);

  const logsBox = document.createElement("textarea");
  logsBox.id = "cb-dev-inspector-logs";
  logsBox.readOnly = true;
  Object.assign(logsBox.style, {
    width: "100%",
    height: "40vh",
    resize: "none",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.25)",
    color: "#bfe5d6",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "12px",
    padding: "8px",
    boxSizing: "border-box"
  });

  logsBoxWrap.append(logButtons, logsBox);

  // Append
  wrap.append(h, tabs, liveBox, logsBoxWrap);
  document.body.append(wrap);

  // Tab Switching
  function showTab(id){
    if (id === "live"){
      liveBox.style.display = "block";
      logsBoxWrap.style.display = "none";
    } else {
      liveBox.style.display = "none";
      logsBoxWrap.style.display = "block";
      // beim Öffnen Logs aktualisieren
      logsBox.value = getLogText();
      logsBox.scrollTop = logsBox.scrollHeight;
    }
    // leichte visuelle Aktivierung
    [btnLive, btnLogs].forEach(b=>{
      b.style.background = (b.dataset.tab === id) ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.25)";
    });
  }
  btnLive.addEventListener("click", ()=>showTab("live"));
  btnLogs.addEventListener("click", ()=>showTab("logs"));
  showTab("live");

  // Log Buttons Aktionen
  btnCopy.addEventListener("click", async ()=>{
    try {
      await navigator.clipboard.writeText(getLogText());
      (window.CBLog?.ok || console.log)("[inspector] Logs kopiert.");
    } catch(e) {
      (window.CBLog?.warn || console.warn)("[inspector] Clipboard fehlgeschlagen.");
    }
  });
  btnExport.addEventListener("click", ()=>{
    try {
      const blob = new Blob([getLogText()], {type: "text/plain"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `siedler-mini-logs-${Date.now()}.txt`;
      document.body.append(a);
      a.click();
      a.remove();
    } catch(e) {
      (window.CBLog?.warn || console.warn)("[inspector] Export fehlgeschlagen.");
    }
  });
  btnClear.addEventListener("click", ()=>{
    window.__cbLogBuffer = [];
    if (window.CBLog?.clear) try{ window.CBLog.clear(); } catch(e){}
    logsBox.value = "";
    (window.CBLog?.ok || console.log)("[inspector] Logs geleert.");
  });

  return wrap;
}

function renderLive() {
  const live = document.getElementById("cb-dev-inspector-live");
  if (!live) return;
  const rt = (window.__cb && window.__cb.runtime) || null;
  const data = rt ? {
    index: rt.indexVersion,
    game: rt.version,
    canvas: { pxW: rt.canvas.pxW, pxH: rt.canvas.pxH, cssW: rt.canvas.cssW, cssH: rt.canvas.cssH },
    dpr: rt.dpr,
    fps: (rt.fps === null ? "—" : rt.fps),
    map: rt.map,
    mapSize: rt.mapSize,
    tile: rt.tile,
    perfNow: rt.perfNow
  } : { note: "Keine Runtime-Daten. Spiel noch nicht gestartet?" };
  live.textContent = JSON.stringify(data, null, 2);
}

/* 4) Klassen */
// – keine

/* 5) Hauptlogik */
(function initDevInspector(){
  (window.CBLog?.ok || console.log)(`[inspector] Modul geladen (${oneV(DEV_INSP_VERSION)})`);
  ensurePanel();

  window.GameInspector = window.GameInspector || {};
  window.GameInspector.toggle = function(){
    const panel = ensurePanel();
    panel.style.display = (panel.style.display !== "none") ? "none" : "block";
    if (panel.style.display !== "none") renderLive();
  };

  // Live-Update, wenn Runtime tickt und Panel offen ist
  window.addEventListener('cb:runtime-tick', () => {
    const panel = document.getElementById("cb-dev-inspector");
    if (panel && panel.style.display !== "none") renderLive();
  });
  window.addEventListener('cb:game-started', renderLive);
})();
