/*!
 * ui/inspector/inspector.api-compat.js  – v1.4.0
 * Zweck:
 *  - Stellt robust sicher, dass GameUI.open/close/toggleInspector vorhanden sind.
 *  - Nutzt Core-API wenn vorhanden, sonst DOM-Fallback (#inspector oder Varianten).
 *  - Verhindert doppelte Initialisierung & doppelte Button-Reaktionen.
 *  - Stabiler Toggle mit internem Status, damit 1× Klick öffnet, 1× Klick schließt.
 * Achtung: Inspector-Module selbst bleiben unberührt.
 */
(function(){
  'use strict';

  // ---- Doppel-Load verhindern ------------------------------------------------
  if (window.__INSPECTOR_COMPAT_ACTIVE__) {
    (console.warn||console.log)("[inspector.api-compat] bereits aktiv – zweites Laden ignoriert.");
    return;
  }
  window.__INSPECTOR_COMPAT_ACTIVE__ = true;

  const logI = (m)=> (window.CBLog?.info || console.log)(`[inspector.api-compat] ${m}`);
  const logW = (m)=> (window.CBLog?.warn || console.warn)(`[inspector.api-compat] ${m}`);

  // ---- Root-Erkennung (mehrere Varianten) -----------------------------------
  const ROOT_SELECTORS = [
    "#inspector", "#inspector-root", "#inspectorOverlay", "#ui-inspector",
    "#overlay-inspector", ".inspector-root", ".inspector-overlay", "[data-inspector-root]"
  ];
  function findRoot(){
    for (const sel of ROOT_SELECTORS){
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // ---- Zustand (damit Toggle deterministisch ist) ----------------------------
  let state = { isOpen: false, lastToggleTs: 0 };

  // ---- DOM-Fallback (setzt display & Klassen konsistent) ---------------------
  function domOpen(){
    const el = findRoot();
    if (!el) return false;
    el.style.display = el.style.display || "flex";
    if (el.style.display === "none") el.style.display = "flex";
    el.classList.add("is-open");
    el.setAttribute("aria-hidden","false");
    document.body.classList.add("inspector-open");
    try{ window.dispatchEvent(new CustomEvent("cb:inspector-open")); }catch(_){}
    state.isOpen = true;
    logI("domOpen() – Overlay sichtbar.");
    return true;
  }
  function domClose(){
    const el = findRoot();
    if (!el) return false;
    el.style.display = "none";
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden","true");
    document.body.classList.remove("inspector-open");
    try{ window.dispatchEvent(new CustomEvent("cb:inspector-close")); }catch(_){}
    state.isOpen = false;
    logI("domClose() – Overlay versteckt.");
    return true;
  }
  function domToggle(){
    // Klick-Entprellung: 60ms
    const now = performance.now ? performance.now() : Date.now();
    if (now - state.lastToggleTs < 60) return state.isOpen;
    state.lastToggleTs = now;

    // Zustand bevorzugt, sonst am DOM ablesen
    const el = findRoot();
    const visible = (el && (el.classList.contains("is-open") || (el.style.display && el.style.display!=="none")));
    const willOpen = (state.isOpen !== undefined) ? !state.isOpen : !visible;

    return willOpen ? domOpen() : domClose();
  }

  // ---- Core-API-Backup (falls vorhanden) ------------------------------------
  const ui0 = (window.GameUI = window.GameUI || {});
  const BACKUP = {
    open  : typeof ui0.openInspector   === "function" ? ui0.openInspector   : null,
    close : typeof ui0.closeInspector  === "function" ? ui0.closeInspector  : null,
    toggle: typeof ui0.toggleInspector === "function" ? ui0.toggleInspector : null,
    hasCore: !!(window.__INSPECTOR_CORE__ && window.__INSPECTOR_CORE__.api)
  };

  // ---- GameUI (neu binden, aber Core respektieren) --------------------------
  function bindGameUI(){
    const ui = (window.GameUI = window.GameUI || {});
    ui.openInspector   = BACKUP.open   || domOpen;
    ui.closeInspector  = BACKUP.close  || domClose;
    ui.toggleInspector = BACKUP.toggle || domToggle;
    logI(
      `gebunden – open:%s close:%s toggle:%s (core:%s)`,
      BACKUP.open?'core':'dom', BACKUP.close?'core':'dom', BACKUP.toggle?'core':'dom',
      BACKUP.hasCore?'ja':'nein'
    );
  }
  bindGameUI();

  // Wenn später etwas GameUI überschreibt → wiederherstellen
  window.addEventListener("cb:ui-ready", bindGameUI);
  window.addEventListener("DOMContentLoaded", bindGameUI);

  // Alte Eventnamen an GameUI weiterreichen (Kompat)
  window.addEventListener("inspector:open",  ()=> window.GameUI.openInspector());
  window.addEventListener("inspector:close", ()=> window.GameUI.closeInspector());
  window.addEventListener("inspector:toggle",()=> window.GameUI.toggleInspector());

  logI("bereit.");
})();
