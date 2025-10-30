/* ============================================================================
 * Datei   : inspector/ui-inspector-v1.js
 * Version : v25.11.01
 * Zweck   : Inspector-CORE – öffnet/schließt Overlay, verwaltet Events & Flags.
 * Struktur: IMPORTS → KONSTANTEN → HILFSFUNKTIONEN → KLASSE → INIT → EXPORT
 * ========================================================================= */
(() => {
  /* --- Konstanten --------------------------------------------------------- */
  const INSP = {
    CLASS_ACTIVE: "is-inspector",
    CLASS_LEGACY: "inspector-open",
    EVT_OPEN: "cb:insp:open",
    EVT_CLOSE: "cb:insp:close"
  };

  /* --- Hilfsfunktionen ---------------------------------------------------- */
  const host = () => document.querySelector("#inspector, #inspector-overlay");
  const setActive = (on) => {
    document.body.classList.toggle(INSP.CLASS_ACTIVE, on);
    document.body.classList.toggle(INSP.CLASS_LEGACY, on);
    const h = host();
    if (h) h.setAttribute("aria-hidden", on ? "false" : "true");
  };

  /* --- Klasse ------------------------------------------------------------- */
  class UIInspector {
    static open()  { setActive(true);  window.dispatchEvent(new CustomEvent(INSP.EVT_OPEN));  }
    static close() { setActive(false); window.dispatchEvent(new CustomEvent(INSP.EVT_CLOSE)); }
    static toggle(){ UIInspector.isOpen() ? UIInspector.close() : UIInspector.open(); }
    static isOpen(){ return document.body.classList.contains(INSP.CLASS_ACTIVE); }

    static log(type, msg){
      try{ window.dispatchEvent(new CustomEvent("cb:insp:log",{detail:{type,msg,time:Date.now()}})); }catch{}
      console[type==="error"?"error":"log"](`[insp] ${msg}`);
    }
  }

  /* --- Init --------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    setActive(false);
    document.getElementById("btn-inspector")?.addEventListener("click", () => UIInspector.toggle());
    window.addEventListener("keydown", (e)=> e.key==="Escape" && UIInspector.isOpen() && UIInspector.close());
    window.UIInspector = UIInspector;
    window.dispatchEvent(new CustomEvent("cb:insp:core:ready",{detail:{version:"v25.11.01"}}));
    console.log("[insp] Core bereit.");
  });
})();
