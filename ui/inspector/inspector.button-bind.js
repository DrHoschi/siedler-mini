/* ============================================================================
 * Datei: assets/inspector/inspector.button-bind.js
 * Version: v18.9.1 (2025-09-26)
 * Zweck: Den 🩺-Button robust an den Inspector togglen – unabhängig von Lade-Reihenfolge
 * Leitplanken:
 *   - Bevorzugt InspectorAPI.toggle() → Fallback: UIInspector.toggle()
 *   - Letzter Fallback (nur wenn gar nichts da ist): Root direkt toggeln
 *   - Idempotent: mehrfaches Laden/Retry ohne Doppelbindung
 * Struktur:
 *   (0) Logger-Guard
 *   (1) Konstanten/State
 *   (2) Helper (findRoot, callAPI, bindButton, ensureGameUI)
 *   (3) Boot (DOMContentLoaded + Retries + Core-Ready)
 *   (4) Exports
 * ============================================================================ */

/* (0) Logger-Guard ----------------------------------------------------------- */
if (!window.CBLog || typeof window.CBLog.ok !== "function") {
  window.CBLog = { ok:console.log, info:console.log, warn:console.warn, error:console.error };
}
const BIND_MOD = "[insp-bind]";
const logI = (m)=> (window.CBLog?.info||console.log)(`${BIND_MOD} ${m}`);
const logW = (m)=> (window.CBLog?.warn||console.warn)(`${BIND_MOD} ${m}`);

/* (1) Konstanten/State ------------------------------------------------------- */
const BIND_VER = "v18.9.1";
const ROOT_SELECTORS = [
  "#inspector", "#inspector-root", "#inspectorOverlay", "#ui-inspector",
  "#overlay-inspector", ".inspector-root", ".inspector-overlay", "[data-inspector-root]"
];
let bound = false;

/* (2) Helper ----------------------------------------------------------------- */
function findRoot(){
  for (const sel of ROOT_SELECTORS){
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function lastResortToggle(){
  const r = findRoot();
  if (!r) { logW("Kein Inspector-Root gefunden (last resort)"); return; }
  const visible = r.classList.contains("is-open") || (r.style.display && r.style.display !== "none");
  if (visible) {
    r.classList.remove("is-open");
    r.style.display = "none";
    logI("Root → close (fallback)");
  } else {
    // konsistent mit ui/ui-inspector.js → display:block
    r.classList.add("is-open");
    r.style.display = "block";
    // nach vorne holen (falls nötig)
    try { document.body.appendChild(r); } catch(_) {}
    r.style.zIndex = "2147483647";
    logI("Root → open (fallback)");
  }
}

function callAPI(){
  // 1) Bevorzugt: echte API
  if (window.InspectorAPI && typeof window.InspectorAPI.toggle === "function"){
    window.InspectorAPI.toggle();
    return;
  }
  // 2) Fallback: UIInspector
  if (window.UIInspector && typeof window.UIInspector.toggle === "function"){
    window.UIInspector.toggle();
    return;
  }
  // 3) Events feuern (legacy/neu) – kann von anderen Listeners aufgefangen werden
  ["inspector:toggle","cb:inspector-toggle","cb:inspector:toggle"].forEach((n)=>{
    try { window.dispatchEvent(new CustomEvent(n, { detail:{ from:"insp-bind" } })); } catch(_) {}
  });
  // 4) Letzter Fallback: Root direkt
  lastResortToggle();
}

function bindButton(){
  if (bound) return true;
  const btn = document.querySelector('#btn-inspector button,[data-action="toggle-inspector"],[aria-label="Inspector"]');
  if (!btn) return false;
  btn.addEventListener("click", (ev)=>{ ev.preventDefault(); try{ callAPI(); }catch(e){ console.error(e); } }, true);
  btn.__inspBound = true;
  bound = true;
  logI(`Button-Handler gebunden (${BIND_VER})`);
  return true;
}

function ensureGameUI(){
  // Nicht überschreiben, nur ergänzen
  window.GameUI = window.GameUI || {};
  if (typeof window.GameUI.toggleInspector !== "function"){
    window.GameUI.toggleInspector = callAPI;
    logI("GameUI.toggleInspector bereit");
  }
}

/* (3) Boot ------------------------------------------------------------------- */
// a) Standard: DOM fertig → binden
document.addEventListener("DOMContentLoaded", ()=>{
  ensureGameUI();
  bindButton();
});

// b) Retries für späte DOM-/Script-Fälle
[0, 250, 1000, 2500].forEach((delay)=>{
  setTimeout(()=>{ ensureGameUI(); bindButton(); }, delay);
});

// c) Wenn der echte Core sich meldet, nochmal sicher binden
window.addEventListener("cb:inspector:core-ready", ()=>{
  ensureGameUI();
  bindButton();
  logI("Core-Ready empfangen – Bind validiert");
});

/* (4) Exports ---------------------------------------------------------------- */
// keine (reine Side-Effect-Bindings)
