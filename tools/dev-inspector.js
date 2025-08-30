/*
============================================================
Datei: tools/dev-inspector.js
Projekt: Siedler-Mini
Version: v16.1.19
Zweck: Einfacher Developer-Inspector (toggle per FAB)
============================================================
*/

/* 1) Imports */
// (keine externen Importe)

/* 2) Konstanten / Meta */
const DEV_INSP_VERSION = "v16.1.19";

/* 3) Hilfsfunktionen */
function ensurePanel() {
  let panel = document.getElementById("cb-dev-inspector");
  if (panel) return panel;

  panel = document.createElement("div");
  panel.id = "cb-dev-inspector";
  Object.assign(panel.style, {
    position: "fixed",
    right: "16px",
    bottom: "96px",
    width: "320px",
    maxHeight: "60vh",
    overflow: "auto",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.5)",
    color: "#e6f2ed",
    boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
    backdropFilter: "blur(6px)",
    zIndex: "1200",
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
  pre.textContent = "No data.";

  panel.append(h, pre);
  document.body.append(panel);
  return panel;
}

function renderInspector() {
  const pre = document.getElementById("cb-dev-inspector-pre");
  if (!pre) return;
  const data = {
    version: DEV_INSP_VERSION,
    indexVersion: window.__cb?.indexVersion,
    canvas: {
      size: (() => {
        const c = document.getElementById("game");
        return c ? { w: c.width, h: c.height, cssW: c.style.width, cssH: c.style.height } : null;
      })()
    },
    map: window.__cb?.selectedMap || null,
    dpr: window.devicePixelRatio || 1,
    perfNow: Math.round(performance.now())
  };
  pre.textContent = JSON.stringify(data, null, 2);
}

/* 4) Klassen */
// (nicht nötig)

/* 5) Hauptlogik */
(function initDevInspector(){
  (window.CBLog?.ok || console.log)(`[inspector] Modul geladen (v${DEV_INSP_VERSION})`);

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

  // Automatisch aktualisieren, wenn Spiel gestartet wurde
  window.addEventListener('cb:game-started', renderInspector);
})();

/* 6) Exports */
// (API an window.GameInspector)
