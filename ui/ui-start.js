/* ============================================================================
 * Datei: ui/ui-start.js
 * Version: v18.9.5 (2025-09-27)
 * Zweck: Startpanel-Steuerung + sichere Guards (Overlay-BG, Fade-Out)
 * Struktur:
 *   (0) Logger-Guard (1) Cache/Refs (2) Show/Hide (3) Button-Events (4) Reaktionen
 * ============================================================================ */

/* (0) Logger-Guard ----------------------------------------------------------- */
if (!window.CBLog || typeof window.CBLog.ok !== "function") {
  window.CBLog = { ok:console.log, info:console.log, warn:console.warn, error:console.error };
}

/* (1) Cache/Refs ------------------------------------------------------------- */
const MOD = "[ui-start]";
const elPanel = () => document.getElementById("start-panel");
const elBg    = () => document.getElementById("bg-start");

/* (2) Show/Hide -------------------------------------------------------------- */
function showStart(){
  const p = elPanel(); if (!p) return;
  p.classList.remove("hide"); p.removeAttribute("hidden"); p.setAttribute("aria-hidden","false");
}
function hideStart(){
  const p = elPanel(); if (!p) return;
  p.classList.add("hide"); p.setAttribute("hidden",""); p.setAttribute("aria-hidden","true");
  const bg = elBg(); if (bg){ bg.classList.add("fadeout"); setTimeout(()=> bg.setAttribute("aria-hidden","true"), 600); }
}

/* (3) Button-Events ---------------------------------------------------------- */
(function wireButtons(){
  const $ = (id)=>document.getElementById(id);
  const p = elPanel(); if (!p){ CBLog.warn(`${MOD} Panel fehlt`); return; }

  $("btnStartNew")?.addEventListener("click", ()=>{
    window.dispatchEvent(new CustomEvent("cb:start:new"));
    hideStart();
  });
  $("btnStartResume")?.addEventListener("click", ()=>{
    window.dispatchEvent(new CustomEvent("cb:start:continue"));
    hideStart();
  });
  $("btnStartReset")?.addEventListener("click", ()=>{
    try{ localStorage.clear(); }catch(_){}
    window.dispatchEvent(new CustomEvent("cb:start:reset"));
  });
  $("btnStartFullscreen")?.addEventListener("click", ()=>{
    const el = document.documentElement;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    try{ fn && fn.call(el); }catch(_){}
    window.dispatchEvent(new CustomEvent("cb:start:fullscreen"));
  });

  CBLog.ok(`${MOD} bereit`);
})();

/* (4) Reaktionen ------------------------------------------------------------- */
// Falls UI früher als index meldet
addEventListener("cb:ui-ready", ()=> showStart());
// Bei erfolgreichem Map-Load zusätzlich BG sauber ausfaden (bestätigt)
addEventListener("cb:map:loaded", ()=> hideStart());
