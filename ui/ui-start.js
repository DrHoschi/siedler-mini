/* ============================================================================
 * Datei: ui/ui-start.js
 * Version: v18.9.1 (2025-09-26)
 * Zweck: Startpanel steuert Spielstart/Continue/Reset/Vollbild (saubere Event-Kette)
 * Leitplanken:
 *   - Buttons lösen NUR Events aus: cb:start:new|continue|reset|fullscreen
 *   - Panel wird erst bei cb:game-start geschlossen (nicht vorher)
 *   - Idempotent: bindet nur einmal; kollidiert nicht mit index-Bindings
 *   - Optionaler Fallback (abschaltbar): cb:game-start emittieren, falls Core still ist
 * Struktur:
 *   (0) Logger-Guard
 *   (1) Konstanten/State
 *   (2) Helper (DOM/emit)
 *   (3) Panel-Steuerung (show/hide)
 *   (4) Button-Wiring (einmalig)
 *   (5) Event-Wiring (cb:game-start etc.)
 *   (6) Optional: Fallback-Mechanik (aus)
 *   (7) Init (DOM Ready)
 * ========================================================================== */

/* (0) Logger-Guard ----------------------------------------------------------- */
if (!window.CBLog || typeof window.CBLog.ok !== "function") {
  window.CBLog = { ok:console.log, info:console.log, warn:console.warn, error:console.error };
}
const MOD = "[ui-start]";
const logI = (m)=> (window.CBLog?.info||console.log)(`${MOD} ${m}`);
const logO = (m)=> (window.CBLog?.ok  ||console.log)(`${MOD} ${m}`);
const logW = (m)=> (window.CBLog?.warn||console.warn)(`${MOD} ${m}`);

/* (1) Konstanten/State ------------------------------------------------------- */
const VER = "v18.9.1";
const SEL = {
  panel:           "#start-panel",
  btnNew:          "#btnStartNew",
  btnResume:       "#btnStartResume",
  btnReset:        "#btnStartReset",
  btnFullscreen:   "#btnStartFullscreen",
};
const STATE = {
  wired: false,
  closed: false,
  fallbackEnabled: false,  // ← bei Bedarf auf true setzen
  fallbackT1: 250,
  fallbackT2: 1200
};

/* (2) Helper (DOM/emit) ----------------------------------------------------- */
const $ = (s, r=document)=> r.querySelector(s);
function emit(name, detail){ try{ window.dispatchEvent(new CustomEvent(name,{detail})); }catch(_){} }

/* (3) Panel-Steuerung ------------------------------------------------------- */
function hidePanel(){
  const p = $(SEL.panel);
  if (!p) return;
  p.classList.add("hide");
  p.setAttribute("hidden","");
  STATE.closed = true;
}
function showPanel(){
  const p = $(SEL.panel);
  if (!p) return;
  p.classList.remove("hide");
  p.removeAttribute("hidden");
  STATE.closed = false;
}

/* (4) Button-Wiring (einmalig) ---------------------------------------------- */
function wireButtonsOnce(){
  if (STATE.wired) return true;

  const panel = $(SEL.panel);
  if (!panel){
    logW("Start-Panel (#start-panel) fehlt – index sollte es liefern.");
    return false;
  }

  // Schutz: wenn index die Buttons schon gebunden hat, respektieren wir das.
  // (Wir markieren unsere Bindings mit __uiStartBound)
  const btnNew  = $(SEL.btnNew, panel);
  const btnRes  = $(SEL.btnResume, panel);
  const btnRst  = $(SEL.btnReset, panel);
  const btnFS   = $(SEL.btnFullscreen, panel);

  if (!btnNew || !btnRes || !btnRst || !btnFS){
    logW("Buttons fehlen oder IDs abweichend – prüfe index.html (btnStart*)");
  }

  function bind(btn, handler){
    if (!btn) return;
    if (btn.__uiStartBound) return;
    btn.addEventListener("click", handler);
    btn.__uiStartBound = true;
  }

  bind(btnNew, ()=>{ emit("cb:start:new");        if (STATE.fallbackEnabled) scheduleFallback(); });
  bind(btnRes, ()=>{ emit("cb:start:continue");   if (STATE.fallbackEnabled) scheduleFallback(); });
  bind(btnRst, ()=>{ try{ localStorage.clear(); }catch(_){} emit("cb:start:reset"); });
  bind(btnFS,  ()=>{
    const el = document.documentElement;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (fn) try{ fn.call(el); }catch(_){}
    emit("cb:start:fullscreen");
  });

  STATE.wired = true;
  return true;
}

/* (5) Event-Wiring ----------------------------------------------------------- */
// Wenn das Spiel erfolgreich startet → Panel schließen
window.addEventListener("cb:game-start", ()=>{
  hidePanel();
});

// Optional (Info): Assets/Registry sind bereit
window.addEventListener("cb:assets-ready",  ()=> logI("assets-ready"));
window.addEventListener("cb:registry:ready",()=> logI("registry-ready"));

/* (6) Optional: Fallback-Mechanik ------------------------------------------- */
function scheduleFallback(){
  // Nur aktiv, wenn eingeschaltet und Panel noch offen
  if (!STATE.fallbackEnabled || STATE.closed) return;

  setTimeout(()=>{
    if (STATE.closed) return;
    logW("Core hat cb:game-start noch nicht gesendet → Fallback-Versuch 1");
    emit("cb:game-start", { from:"ui-start", fallback:true, t:STATE.fallbackT1 });
    hidePanel();
  }, STATE.fallbackT1);

  setTimeout(()=>{
    if (STATE.closed) return;
    logW("Core weiterhin still → Fallback-Versuch 2");
    emit("cb:game-start", { from:"ui-start", fallback:true, t:STATE.fallbackT2 });
    hidePanel();
  }, STATE.fallbackT2);
}

/* (7) Init (DOM Ready) ------------------------------------------------------ */
(function init(){
  const ready = ()=> {
    // Panel beim Load sichtbar (Index blendet es initial ein)
    showPanel();

    // Buttons binden, falls noch ungebunden (kollisionsfrei zur index)
    wireButtonsOnce();

    logO(`bereit (${VER})`);
  };

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", ready, { once:true });
  } else {
    ready();
  }
})();
