/* ============================================================================
 * Datei   : ui/ui-inspector.js
 * Projekt : Neue Siedler
 * Version : v25.10.31-final (FAB-Only Toggle, stable flags/aria/debounce)
 * Zweck   : Vollbild-Inspector zuverlässig öffnen/schließen
 * Lauscht : Click auf #btn-inspector, Escape-Key
 * Sendet  : cb:insp:open, cb:insp:close, cb:insp:tab:change (optional)
 *
 * Architektur-Hinweise:
 *  - Single Source of Truth ist das Body-Flag ".is-inspector".
 *    (Legacy ".inspector-open" wird synchron mitgeführt.)
 *  - Overlay-Host darf #inspector ODER #inspector-overlay heißen.
 *  - FAB (#btn-inspector) bleibt IMMER sichtbar (Variante A) und toggelt nur.
 *  - Keine Abhängigkeit zu window.Inspector.* nötig; reine UI-Schicht.
 *  - Defensive Init (idempotent), Debounce gegen Doppelklicks, Escape schließt.
 * ============================================================================ */

/* ============================= [1] IMPORTS ================================ */
// keine

/* ======================= [2] KONSTANTEN & META ============================ */
const MOD_NAME    = "[inspector]";
const MOD_VERSION = "v25.10.31-final";
const OPEN_FLAG   = "is-inspector";     // neuer Standard
const LEGACY_FLAG = "inspector-open";   // legacy (Kompatibilität)
const EVT_OPEN    = "cb:insp:open";
const EVT_CLOSE   = "cb:insp:close";

const SELECTORS = {
  fab:   "#btn-inspector",
  hostA: "#inspector",
  hostB: "#inspector-overlay"
};

let _busy = false; // Debounce

/* ======================== [3] HILFSFUNKTIONEN ============================= */
function logOk (m){ (window.CBLog?.ok   || console.log   )(`${MOD_NAME} ${m}`); }
function logInfo(m){ (window.CBLog?.info || console.info )(`${MOD_NAME} ${m}`); }
function logWarn(m){ (window.CBLog?.warn || console.warn )(`${MOD_NAME} ${m}`); }

function $(sel, root=document){ return root.querySelector(sel); }
function dispatch(name, detail={}){ window.dispatchEvent(new CustomEvent(name, { detail })); }

/** Body-Flags konsistent setzen/löschen */
function setInspectorActive(active){
  const b = document.body;
  b.classList.toggle(OPEN_FLAG,   !!active);
  b.classList.toggle(LEGACY_FLAG, !!active);     // Legacy-Selektoren bleiben funktionsfähig
}

/** Overlay-Host wählen (#inspector ODER #inspector-overlay) */
function getHost(){ return $(SELECTORS.hostA) || $(SELECTORS.hostB); }

/** ARIA/Interaktion sauber setzen */
function setAria(host, visible){
  if(!host) return;
  host.setAttribute("aria-hidden", visible ? "false" : "true");
  host.removeAttribute("inert");
  host.classList.remove("inert");
}

/** Harte Rücksetzung beim Start (verhindert hängen gebliebene Flags) */
function hardReset(){
  setInspectorActive(false);
  setAria(getHost(), false);
}

/* ============================= [4] KLASSE ================================= */
class UIInspector {
  /** Öffnet den Inspector (optional mit Tab-Wechsel) */
  static open(tab){
    if(_busy) return; _busy = true;
    try{
      setInspectorActive(true);
      setAria(getHost(), true);
      if(tab) dispatch("cb:insp:tab:change", { tab });
      dispatch(EVT_OPEN, { tab: tab || "Logs" });
      logInfo(`geöffnet (${MOD_VERSION})`);
    } finally { setTimeout(()=>{ _busy = false; }, 120); }
  }

  /** Schließt den Inspector */
  static close(){
    if(_busy) return; _busy = true;
    try{
      setInspectorActive(false);
      setAria(getHost(), false);
      dispatch(EVT_CLOSE, {});
      logInfo("geschlossen");
    } finally { setTimeout(()=>{ _busy = false; }, 120); }
  }

  /** Toggle (für FAB) */
  static toggle(){
    const active = document.body.classList.contains(OPEN_FLAG)
                || document.body.classList.contains(LEGACY_FLAG);
    active ? UIInspector.close() : UIInspector.open();
  }

  /** Idempotente Initialisierung */
  static init(){
    logOk(`Modul geladen (${MOD_VERSION})`);

    // (1) FAB immer sichtbar, immer Toggle
    const fab = $(SELECTORS.fab);
    if(fab){
      fab.removeEventListener("click", UIInspector.toggle); // doppelte Bindung verhindern
      fab.addEventListener("click", UIInspector.toggle);
    } else {
      logWarn("FAB #btn-inspector nicht gefunden (index.demo.html prüfen).");
    }

    // (2) Escape schließt
    window.removeEventListener("keydown", _onKeyEsc);
    window.addEventListener("keydown", _onKeyEsc, { passive:true });

    // (3) Startzustand hart zurücksetzen
    hardReset();
  }
}

/* ========================= [5] HAUPTLOGIK (Init) ========================== */
function _onKeyEsc(e){
  if(e.key === "Escape"){
    const isOpen = document.body.classList.contains(OPEN_FLAG)
                || document.body.classList.contains(LEGACY_FLAG);
    if(isOpen) UIInspector.close();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  try{ UIInspector.init(); } catch(err){ logWarn(`Init-Fehler: ${err?.message||err}`); }
});

/* =============================== [6] EXPORTS ============================== */
window.UIInspector = UIInspector; // Debug/Inspector ist fester Bestandteil (nicht entfernen)
