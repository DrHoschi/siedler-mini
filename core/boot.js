/* ============================================================================
 * core/boot.js — Bootstrap
 * Version: v18.9.6 (2025-09-27)
 * Zweck: Assets → Registry → Game.init → Game.start(map) (hart abbrechen bei Fehler)
 * Events: cb:assets-ready, cb:registry:ready (aus registry), cb:game-start (aus game)
 * ============================================================================ */
if (!window.CBLog || typeof window.CBLog.ok !== "function") {
  window.CBLog = { ok:console.log, info:console.log, warn:console.warn, error:console.error };
}

const BOOT = "[boot]";
function mapUrl(){ return document.getElementById("game")?.dataset?.map || "data/maps/map-mini.json"; }

async function run(kind="new"){
  CBLog.info(`${BOOT} Startsequenz init (via cb:start:${kind})`);

  // 1) Assets
  CBLog.info(`${BOOT} [assets] Initialisierung…`);
  if (!window.Assets || typeof Assets.init !== "function"){
    CBLog.error(`${BOOT} Assets.init fehlt`); return;
  }
  await Assets.init();
  try{ window.dispatchEvent(new CustomEvent("cb:assets-ready")); }catch(_){}
  CBLog.ok(`[assets] bereit`);

  // 2) Registry
  CBLog.info(`${BOOT} [registry] laden…`);
  if (!window.Registry || typeof Registry.initFromData !== "function"){
    CBLog.error(`${BOOT} Registry.initFromData fehlt`); return;
  }
  await Registry.initFromData();

  // 3) Game
  if (!window.Game || typeof Game.init !== "function"){
    CBLog.error(`${BOOT} [game] init fehlt (keine Funktion)`); return;
  }
  Game.init();

  const url = mapUrl();
  CBLog.info(`${BOOT} [game] starte Map: ${url}`);
  if (typeof Game.start !== "function"){
    CBLog.error(`${BOOT} [game] start fehlt (keine Funktion)`); return;
  }

  // Watchdog: falls Game.start nie cb:game-start feuert, loggen wir einen Hinweis
  let started = false;
  const onStarted = ()=>{ started = true; };
  addEventListener("cb:game-start", onStarted, { once:true });

  try{
    await Game.start(url);  // core/game.js feuert selbst cb:game-start
  }catch(err){
    CBLog.error(`${BOOT} Game.start Fehler: ${err?.message||err}`); 
    removeEventListener("cb:game-start", onStarted);
    return;
  }

  setTimeout(()=>{
    if (!started){
      CBLog.warn(`${BOOT} Hinweis: cb:game-start kam nicht – bitte core/game.js prüfen`);
    }
  }, 250);

  CBLog.ok(`${BOOT} Spielstart abgeschlossen`);
}

// Wiring
addEventListener("cb:start:new",      ()=> run("new"));
addEventListener("cb:start:continue", ()=> run("continue"));
addEventListener("cb:start:reset",    ()=>{ try{localStorage.clear();}catch(_){ } location.reload(); });

CBLog.ok(`${BOOT} UI bereit – warte auf Start-Events (cb:start:*)`);
