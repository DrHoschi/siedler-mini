/* ============================================================================
 * Datei: core/game.js
 * Version: v18.9.6 (2025-09-27)
 * Zweck: Vereinheitlichter Game-Core
 *   - nutzt vorhandene Engine (GameCore/Engine) ODER Minimal-Engine (Fallback)
 *   - stellt immer die Legacy-API bereit: Game.init(), Game.start(mapUrl)
 * Ereignisse:
 *   cb:map:loading  {url}
 *   cb:map:loaded   {url}
 *   cb:map:error    {url,err}
 *   cb:game-start   {mapUrl, seed}
 * Leitplanken:
 *   - keine Hard-Abhängigkeit auf fremde Dateien
 *   - keine Crashes bei fehlender Map/Assets (klare Logs)
 *   - idempotente init()
 * Struktur:
 *   (0) Logger-Guard
 *   (1) State
 *   (2) Utility (emit, fetchJSON)
 *   (3) MinimalEngine (Fallback)
 *   (4) Adapter auf vorhandene Engines (GameCore/Engine)
 *   (5) Öffentliche API (Game)
 *   (6) Export
 * ========================================================================== */

/* (0) Logger-Guard ----------------------------------------------------------- */
if (!window.CBLog || typeof window.CBLog.ok !== "function") {
  window.CBLog = { ok:console.log, info:console.log, warn:console.warn, error:console.error };
  CBLog.info("[game] Hinweis: globaler CBLog nicht gefunden – Fallback aktiv");
}
const GM_MOD = "[game]";
const logOK = (m)=> (CBLog.ok||console.log)(`${GM_MOD} ${m}`);
const logI  = (m)=> (CBLog.info||console.log)(`${GM_MOD} ${m}`);
const logW  = (m)=> (CBLog.warn||console.warn)(`${GM_MOD} ${m}`);
const logE  = (m)=> (CBLog.error||console.error)(`${GM_MOD} ${m}`);

/* (1) State ------------------------------------------------------------------ */
const GAME_VERSION = "v18.9.6";
const STATE = {
  inited:  false,
  started: false,
  tick: 0,
  map: { url:null, data:null, loaded:false },
  resources: { wood:0, stone:0, fish:0 }
};

/* (2) Utility ---------------------------------------------------------------- */
function emit(name, detail){ try{ window.dispatchEvent(new CustomEvent(name,{detail})) }catch(_){} }
async function fetchJSON(url){
  const r = await fetch(url, { cache:"no-store" });
  if (!r.ok) throw new Error(`${url} → ${r.status} ${r.statusText||""}`.trim());
  return await r.json();
}
function emitResChange(res, delta, source="game"){
  STATE.resources[res] = (STATE.resources[res]||0) + delta;
  emit("cb:res:change", { res, delta, source });
}

/* (3) MinimalEngine (Fallback) ---------------------------------------------- */
const MinimalEngine = {
  init(){
    if (STATE.inited) return;
    STATE.inited = true;
    logOK(`init (MinimalEngine ${GAME_VERSION})`);
    // TODO: Renderer/Loop vorbereiten (später)
  },
  async start(mapUrl){
    logI(`Start → lade Map ${mapUrl}`);
    try{
      emit("cb:map:loading", { url: mapUrl });
      const json = await fetchJSON(mapUrl);
      STATE.map.url = mapUrl;
      STATE.map.data = json;
      STATE.map.loaded = true;
      emit("cb:map:loaded", { url: mapUrl });
      logOK(`Map geladen (${json?.name || "unnamed"})`);
    }catch(e){
      STATE.map.loaded = false;
      emit("cb:map:error", { url: mapUrl, err: e });
      logE(`Map-Load fehlgeschlagen: ${e?.message||e}`);
      return; // nicht werfen → UI/Boot bleibt lebendig
    }
    STATE.started = true;
    emit("cb:game-start", { mapUrl, seed: Date.now() });
    logOK(`Spielstart abgeschlossen (map=${mapUrl})`);
  },
  getObstacleAt(){ return false; }
};

/* (4) Adapter auf vorhandene Engines ---------------------------------------- */
function detectExternalEngine(){
  const GC  = window.GameCore;
  const ENG = window.Engine || (GC && GC.Engine);
  const api = { init:null, start:null, label:null };

  if (GC && typeof GC.start === "function"){
    api.init  = GC.init?.bind(GC);
    api.start = GC.start.bind(GC);
    api.label = "GameCore";
    return api;
  }
  if (ENG && typeof ENG.start === "function"){
    api.init  = ENG.init?.bind(ENG);
    api.start = ENG.start.bind(ENG);
    api.label = (window.Engine? "Engine":"GameCore.Engine");
    return api;
  }
  return null;
}

/* (5) Öffentliche API (Game) ------------------------------------------------ */
const Game = {
  init(){
    if (STATE.inited) { logW("init ignoriert – bereits initialisiert"); return; }

    const ext = detectExternalEngine();
    if (ext && typeof ext.init === "function"){
      try { ext.init(); logOK(`init via ${ext.label}`); }
      catch(e){ logW(`init via ${ext.label} fehlgeschlagen: ${e?.message||e}. Nutze MinimalEngine.`); MinimalEngine.init(); }
    } else {
      MinimalEngine.init();
    }
  },

  async start(mapUrl){
    const ext = detectExternalEngine();
    if (ext && typeof ext.start === "function"){
      logI(`delegiere Start an ${ext.label}: ${mapUrl}`);
      try{
        // Safety: falls externe Engine cb:game-start NICHT sendet, übernehmen wir es.
        let fired = false;
        const once = ()=>{ fired = true; };
        addEventListener("cb:game-start", once, { once:true });

        await ext.start(mapUrl);

        setTimeout(()=>{
          if (!fired){
            emit("cb:game-start", { mapUrl, seed: Date.now() });
            logW(`cb:game-start ergänzt (via ${ext.label})`);
          }
        }, 0);
        logOK(`Spielstart abgeschlossen (via ${ext.label})`);
      }catch(e){
        logE(`Start via ${ext.label} fehlgeschlagen: ${e?.message||e}`);
        emit("cb:map:error", { url: mapUrl, err: e });
      }
      return;
    }
    // Fallback
    await MinimalEngine.start(mapUrl);
  },

  getObstacleAt(tx,ty){ return MinimalEngine.getObstacleAt(tx,ty); },
  giveTestResources(){
    emitResChange("wood", 10, "test");
    emitResChange("stone", 5,  "test");
    emitResChange("fish",  3,  "test");
  }
};

/* (6) Export ----------------------------------------------------------------- */
window.Game = Game;
// Diagnose-Ping: im Inspector sofort sichtbar, ob dieses Script aktiv ist.
(CBLog.ok||console.log)(`[game] core/game.js aktiv (${typeof Game?.start})`);
