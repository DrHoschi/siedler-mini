/* ============================================================================
 * Datei: core/boot.js
 * Version: v18.9.5 (2025-09-27)
 * Zweck: Bootstrap – Assets/Registry laden, Game starten, Events routen
 * Leitplanken:
 *   - hört auf cb:start:* Events (aus ui-start.js)
 *   - kein hartes Error-Log, wenn optionale APIs fehlen (nur WARN)
 *   - Events in Reihenfolge: cb:assets-ready → cb:registry:ready → cb:map:loaded → cb:game-start
 * Struktur: (0) Logger-Guard (1) Konstanten (2) Helper (3) Startsequenz (4) Event-Wiring
 * ============================================================================ */

/* (0) Logger-Guard ----------------------------------------------------------- */
if (!window.CBLog || typeof window.CBLog.ok !== "function") {
  window.CBLog = {
    ok:   (m)=>console.log("✅", m),
    info: (m)=>console.log("ℹ️", m),
    warn: (m)=>console.warn("⚠️", m),
    error:(m)=>console.error("❌", m),
  };
  CBLog.info("[boot] Hinweis: globaler CBLog nicht gefunden – Fallback aktiv");
}

/* (1) Konstanten ------------------------------------------------------------- */
const BOOT_MOD = "[boot]";
const BOOT_VER = "v18.9.5";

/* (2) Helper ----------------------------------------------------------------- */
function getCanvasMapUrl() {
  const el = document.getElementById("game");
  return el?.dataset?.map || "data/maps/map-mini.json";
}
async function safeCall(obj, fnName, ...args){
  try {
    const fn = obj && obj[fnName];
    if (typeof fn === "function") return await fn.apply(obj, args);
    CBLog.warn(`${BOOT_MOD} [${obj?.constructor?.name?.toLowerCase?.()||'game'}] ${fnName} übersprungen (keine Funktion)`);
  } catch (err) {
    CBLog.error(`${BOOT_MOD} Fehler in ${fnName}: ${err?.message || err}`);
    throw err;
  }
}

/* (3) Startsequenz ----------------------------------------------------------- */
async function runStartSequence(kind="new"){
  CBLog.info(`${BOOT_MOD} Startsequenz init (via cb:start:${kind})`);

  // 1) Assets
  CBLog.info(`${BOOT_MOD} [assets] Initialisierung…`);
  await safeCall(window.Assets, "init");
  window.dispatchEvent(new CustomEvent("cb:assets-ready"));
  CBLog.ok(`[assets] bereit – ${window.Assets?.summary ? window.Assets.summary() : "Assets im Cache"}`);

  // 2) Registry
  CBLog.info(`${BOOT_MOD} [registry] laden…`);
  await safeCall(window.Registry, "initFromData");
  // Registry sendet selbst cb:registry:ready (unser Code in core/registry.js)

  // 3) Game
  await safeCall(window.Game, "init");
  const mapUrl = getCanvasMapUrl();
  CBLog.info(`${BOOT_MOD} [game] starte Map: ${mapUrl}`);
  await safeCall(window.Game, "start", mapUrl);

  CBLog.ok(`${BOOT_MOD} Spielstart abgeschlossen`);
}

/* (4) Event-Wiring ----------------------------------------------------------- */
(function wire(){
  CBLog.ok(`${BOOT_MOD} UI bereit – warte auf Start-Events (cb:start:*) [${BOOT_VER}]`);

  // „Neues Spiel“
  addEventListener("cb:start:new",       ()=> runStartSequence("new"));
  // „Weiterspielen“
  addEventListener("cb:start:continue",  ()=> runStartSequence("continue"));
  // „Reset“
  addEventListener("cb:start:reset",     async ()=>{
    try{ localStorage.clear(); }catch(_){}
    location.reload();
  });
})();
