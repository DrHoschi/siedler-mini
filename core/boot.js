/* ============================================================================
 * Datei: core/boot.js — GameBoot
 * Version: v18.9.3 (2025-09-26)
 * Zweck: Startsequenz orchestrieren (Assets → Registry → Game → Map)
 * Leitplanken:
 *   - Reagiert auf cb:start:new|continue (nur EIN Start gleichzeitig)
 *   - Liefert klare Logs + Events (cb:assets-ready, cb:registry:ready, cb:game-start)
 *   - Nutzt Canvas data-map als Quelle; Fallback auf data/maps/map-mini.json
 * Struktur:
 *   (0) Logger-Guard
 *   (1) Konstanten/Helpers
 *   (2) Startsequenz (async)
 *   (3) Event-Wiring + Guard
 * ============================================================================ */

/* (0) Logger-Guard ----------------------------------------------------------- */
if (!window.CBLog || typeof window.CBLog.ok !== "function") {
  window.CBLog = { ok:console.log, info:console.log, warn:console.warn, error:console.error };
}
const BOOT_MOD = "[boot]";
const logOK = (m)=> (CBLog.ok||console.log)(`${BOOT_MOD} ${m}`);
const logI  = (m)=> (CBLog.info||console.log)(`${BOOT_MOD} ${m}`);
const logW  = (m)=> (CBLog.warn||console.warn)(`${BOOT_MOD} ${m}`);
const logE  = (m)=> (CBLog.error||console.error)(`${BOOT_MOD} ${m}`);

/* (1) Konstanten/Helpers ----------------------------------------------------- */
function getCanvasMapUrl(){
  const el = document.querySelector('#game');
  const url = el?.dataset?.map || "data/maps/map-mini.json";
  return url;
}
async function safeCall(obj, fnName, label){
  try{
    const fn = obj && obj[fnName];
    if (typeof fn === "function") {
      logI(`${label}…`);
      const out = await fn.call(obj);
      return out;
    } else {
      logW(`${label} übersprungen (keine Funktion)`);
    }
  }catch(e){
    logE(`${label} Fehler: ${e?.message||e}`);
    throw e;
  }
}

/* (2) Startsequenz (async) --------------------------------------------------- */
async function startSequence(trigger){
  logI(`Startsequenz init (via ${trigger})`);

  // 1) Assets
  await safeCall(window.Assets, "init", "[assets] Initialisierung");

  // 2) Registry
  if (window.Registry?.initFromData) {
    await safeCall(window.Registry, "initFromData", "[registry] laden");
  } else if (window.Registry?.init) {
    await safeCall(window.Registry, "init", "[registry] init");
  } else {
    logW("[registry] keine init-Funktion gefunden");
  }
  try { window.dispatchEvent(new CustomEvent("cb:registry:ready")); } catch(_){}

  // 3) Game
  await safeCall(window.Game, "init", "[game] init");

// 4) Map starten
const mapUrl = getCanvasMapUrl();
logI(`[game] starte Map: ${mapUrl}`);
if (window.Game?.start) {
  await window.Game.start(mapUrl);   // <— mapUrl wirklich übergeben!
} else {
  logW("[game] start (Map) übersprungen (keine Funktion)");
}
  // 5) Erfolgssignal
  try {
    window.dispatchEvent(new CustomEvent("cb:game-start", { detail:{ mapUrl, trigger } }));
  } catch(_) {}
  logOK("Spielstart abgeschlossen");
}

/* (3) Event-Wiring + Guard --------------------------------------------------- */
let __bootStarting = false;

window.addEventListener("cb:ui-ready", () => {
  logOK("UI bereit – warte auf Start-Events (cb:start:*)");
});

async function guardedStart(trigger){
  if (__bootStarting) {
    logW(`Start ignoriert (${trigger}) – bereits im Gange`);
    return;
  }
  __bootStarting = true;
  try {
    await startSequence(trigger);
  } catch(e) {
    logE(`Startsequenz abgebrochen: ${e?.message||e}`);
    try { window.dispatchEvent(new CustomEvent("cb:boot-error", { detail:{ err:e } })); } catch(_){}
  } finally {
    __bootStarting = false;
  }
}

window.addEventListener("cb:start:new",      ()=> guardedStart("cb:start:new"));
window.addEventListener("cb:start:continue", ()=> guardedStart("cb:start:continue"));
window.addEventListener("cb:start:reset",    ()=> logW("Reset angefordert"));
window.addEventListener("cb:start:fullscreen",()=> logI("Fullscreen angefordert"));
