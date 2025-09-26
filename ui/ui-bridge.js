/* ============================================================================
 * Datei: ui/ui-bridge.js
 * Version: v18.8.0 (2025-09-25)
 * Zweck: Brücke zwischen UI (Build-Dock/HUD) und Engine/Registry
 * Leitplanken:
 *   - KEIN Abbruch, wenn UIBuild noch nicht da → sanft warten (Ready-Events/Retry)
 *   - Zentrale CBLog-Nutzung (kommt aus index)
 *   - Verkabelt Build-Dock an DOM + Registry, leitet Events weiter (cb:build:select → Engine)
 * Struktur:
 *   (0) Logger-Guard
 *   (1) Konstanten/State
 *   (2) Helper (DOM/Retry)
 *   (3) Kern-Verkabelung (wireOnce)
 *   (4) Event-Wiring (Ready/Start/Registry)
 *   (5) Exports
 * ========================================================================== */

if (!window.InspectorAPI) window.InspectorAPI = { toggle(){ (CBLog?.info||console.log)("[ui-bridge] InspectorAPI Fallback"); } };
if (!window.Inspector)    window.Inspector    = window.InspectorAPI;

/* (0) Logger-Guard ----------------------------------------------------------- */
if (!window.CBLog || typeof window.CBLog.ok !== "function") {
  window.CBLog = { ok:console.log, info:console.log, warn:console.warn, error:console.error };
  CBLog.info("[ui-bridge] Hinweis: globaler CBLog nicht gefunden – Fallback aktiv");
}

/* (1) Konstanten/State ------------------------------------------------------- */
const UIBR_MOD = "[ui-bridge]";
const UIBR_VER = "v18.8.0";

const UIBR_STATE = {
  wired: false,
  attempts: 0,
  maxAttempts: 40,         // ~4s bei 100ms Intervall
  retryTimer: null,
  root: null               // #build-dock
};

/* (2) Helper (DOM/Retry) ---------------------------------------------------- */
function $(sel, root=document){ return root.querySelector(sel); }

function clearRetry(){
  if (UIBR_STATE.retryTimer){
    clearInterval(UIBR_STATE.retryTimer);
    UIBR_STATE.retryTimer = null;
  }
}

function startRetryLoop(wireFn){
  clearRetry();
  UIBR_STATE.attempts = 0;
  UIBR_STATE.retryTimer = setInterval(()=>{
    if (UIBR_STATE.wired) return clearRetry();
    UIBR_STATE.attempts++;
    if (wireFn()) {
      clearRetry();
    } else if (UIBR_STATE.attempts >= UIBR_STATE.maxAttempts) {
      clearRetry();
      CBLog.warn(`${UIBR_MOD} UIBuild nach ${UIBR_STATE.maxAttempts} Versuchen nicht verfügbar – bleibe passiv (warte auf Ready-Events)`);
    }
  }, 100);
}

/* (3) Kern-Verkabelung (wireOnce) ------------------------------------------- */
/**
 * Versucht, genau EINMAL alles zu verdrahten.
 * @returns {boolean} true = erfolgreich verdrahtet
 */
function wireOnce(){
  if (UIBR_STATE.wired) return true;

  // 3.1 Voraussetzungen prüfen
  if (!window.UIBuild){
    CBLog.warn(`${UIBR_MOD} UIBuild noch nicht verfügbar – warte/versuche erneut`);
    return false;
  }
  UIBR_STATE.root = UIBR_STATE.root || $("#build-dock");
  if (!UIBR_STATE.root){
    CBLog.error(`${UIBR_MOD} Root #build-dock fehlt`);
    return false;
  }

  // 3.2 Build-Dock initialisieren (idempotent – ui-build.js handelt das ab)
  try {
    UIBuild.init(UIBR_STATE.root);
  } catch(e) {
    CBLog.warn(`${UIBR_MOD} UIBuild.init hat geworfen: ${e?.message || e}`);
    // trotzdem weiter verkabeln – UIBuild könnte sich später fangen
  }

  // 3.3 Events vom Build-Dock → Engine / Inspector
  // Auswahl eines Bau-Items:
  window.addEventListener("cb:build:select", (ev)=>{
    const id = ev?.detail?.id;
    if (!id) return;
    // Hier könnte die Engine einen „Place“-Modus starten:
    // z.B. GameCore?.placeMode?.start(id) – solange nicht vorhanden, loggen wir nur:
    CBLog.info(`${UIBR_MOD} Auswahl übergeben: building=${id}`);
  });

  // Build-Dock offen → ggf. re-rendern (Registry-Änderungen nach Start)
  window.addEventListener("cb:build:open", ()=>{
    try { UIBuild.rerender?.(); } catch(_) {}
  });

  // Registry ready → Build-Dock neu rendern
  window.addEventListener("cb:registry:ready", ()=>{
    try { UIBuild.rerender?.(); } catch(_) {}
    CBLog.ok(`${UIBR_MOD} Registry-Änderungen an Build-Dock weitergereicht`);
  });

  // Assets ready (optional) → evtl. Icons neu laden
  window.addEventListener("cb:assets-ready", ()=>{
    try { UIBuild.rerender?.(); } catch(_) {}
  });

  // 3.4 Done
  UIBR_STATE.wired = true;
  CBLog.ok(`${UIBR_MOD} Verkabelung aktiv (${UIBR_VER})`);
  return true;
}

/* (4) Event-Wiring (Ready/Start/Registry) ----------------------------------- */
// a) Sofort versuchen, falls Reihenfolge korrekt ist
if (!wireOnce()){
  // b) Auf UIBuild-Ready warten
  window.addEventListener("cb:UIBuild:ready", ()=> wireOnce(), { once:true });

  // c) Nach UI-Ready noch mal probieren (falls ui-build.js erst später init'd)
  window.addEventListener("cb:ui-ready", ()=> wireOnce(), { once:true });

  // d) Sicherheitsnetz: Retry-Loop (bis zu maxAttempts)
  startRetryLoop(wireOnce);
}

// e) Nach Spielstart ggf. HUD/Build refreshen (nur UI-seitig)
window.addEventListener("cb:game-start", ()=>{
  try { UIBuild.rerender?.(); } catch(_) {}
});

/* (5) Exports ---------------------------------------------------------------- */
// keine externen Methoden – Bridge wirkt ausschließlich über Events/Side-Effects
