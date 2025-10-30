/* ============================================================================
 * Datei   : inspector/ui-inspector-v1.js
 * Version : v25.11.01
 * Zweck   : Inspector-CORE – öffnet/schließt Overlay, verwaltet Flags & Events
 * Struktur: KONSTANTEN → HILFSFUNKTIONEN → KLASSE → INIT/EXPORT
 * ========================================================================== */
(() => {
  /* --- Konstanten --------------------------------------------------------- */
  const INSP = {
    CLASS_ACTIVE : "is-inspector",   // neuer Standard
    CLASS_LEGACY : "inspector-open", // Legacy-Komp.
    EVT_OPEN     : "cb:insp:open",
    EVT_CLOSE    : "cb:insp:close"
  };

  /* --- Hilfsfunktionen ---------------------------------------------------- */
  const host = () => document.querySelector("#inspector, #inspector-overlay");
  const setActive = (on) => {
    document.body.classList.toggle(INSP.CLASS_ACTIVE, on);
    document.body.classList.toggle(INSP.CLASS_LEGACY, on);
    const h = host(); if (h) h.setAttribute("aria-hidden", on ? "false" : "true");
  };

  /* --- Öffentliche API ---------------------------------------------------- */
  class UIInspector {
    static open()  { setActive(true);  window.dispatchEvent(new CustomEvent(INSP.EVT_OPEN));  }
    static close() { setActive(false); window.dispatchEvent(new CustomEvent(INSP.EVT_CLOSE)); }
    static toggle(){ UIInspector.isOpen() ? UIInspector.close() : UIInspector.open(); }
    static isOpen(){ return document.body.classList.contains(INSP.CLASS_ACTIVE); }

    // Komfort: PathOverlay/Heatmap-Events
    static pathOverlay(on=true){ window.dispatchEvent(new CustomEvent(on?'cb:path:overlay:on':'cb:path:overlay:off')); }
    static heatmap(on=true){ window.dispatchEvent(new CustomEvent(on?'cb:path:heatmap:on':'cb:path:heatmap:off')); }
  }

  /* --- Init --------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    setActive(false);
    // FAB
    document.getElementById("btn-inspector")?.addEventListener("click", () => UIInspector.toggle());
    // ESC schließt
    window.addEventListener("keydown", (e)=> e.key==="Escape" && UIInspector.isOpen() && UIInspector.close());
    // Export
    window.UIInspector = UIInspector;
    window.dispatchEvent(new CustomEvent("cb:insp:core:ready",{detail:{version:"v25.11.01"}}));
    console.log("[insp] Core bereit.");
  });
})();
