/*
============================================================
Datei: tools/dev-inspector.js
Projekt: Siedler-Mini
Version: 16.1.19
Zweck: Developer-Inspector (toggle per FAB, Live-Runtime)
============================================================
*/

/* 1) Imports */ // – keine
/* 2) Konstanten / Meta */
const DEV_INSP_VERSION = "16.1.19";

/* 3) Hilfsfunktionen */
function ensurePanel() {
  let panel = document.getElementById("cb-dev-inspector");
  if (panel) return panel;
  panel = document.createElement("div");
  panel.id = "cb-dev-inspector";
  Object.assign(panel.style, {
    position: "fixed",
    right: "calc(16px + env(safe-area-inset-right, 0px))",
    bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
    width: "340px",
    maxHeight: "60vh",
    overflow: "auto",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.5)",
    color: "#e6f2ed",
    boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
    backdropFilter: "blur(6px)",
    zIndex: "900",     // unter dem Start-Panel
    display: "none"
  });
  const h = document.createElement("div");
  h.textContent = "Inspector";
  h.style.fontWeight = "700";
  h.style.marginBottom = "8px";

  const pre = document.createElement("pre");
  pre.id = "cb-dev-inspector-pre";
  pre.style.whiteSpace = "pre-wrap";
  pre.style.fontSize = "12px";
  pre.style.margin = "0";

  panel.append(h, pre);
  document.body.append(panel);
  return panel;
}

function renderInspector() {
  const pre = document.getElementById("cb-dev-inspector-pre");
  if (!pre) return;
  const rt = (window.__cb && window.__cb.runtime) || null;
  const data = rt ? {
    version: DEV_INSP_VERSION,
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
  pre.textContent = JSON.stringify(data, null, 2);
}

/* 4) Klassen */ // – keine

/* 5) Hauptlogik */
(function initDevInspector(){
  (window.CBLog?.ok || console.log)(`[inspector] Modul geladen (v${DEV_INSP_VERSION})`);
  ensurePanel();

  window.GameInspector = window.GameInspector || {};
  window.GameInspector.toggle = function(){
    const panel = ensurePanel();
    const isOpen = panel.style.display !== "none";
    if (isOpen) {
      panel.style.display = "none";
    } else {
      renderInspector();
      panel.style.display = "block";
    }
  };

  window.addEventListener('cb:runtime-tick', () => {
    const panel = document.getElementById("cb-dev-inspector");
    if (panel && panel.style.display !== "none") renderInspector();
  });
  window.addEventListener('cb:game-started', renderInspector);
})();
