/* ============================================================================
 * Datei: core/game.js
 * Version: v18.9.4 (2025-09-26)
 * Zweck: Game-Loop, World-State, Map-Load, Ressourcen-Events
 * Leitplanken:
 *   cb:map:loading → cb:map:loaded → cb:game-start (nach Erfolg)
 * Struktur:
 *   (0) Logger-Guard
 *   (1) Konstanten/State
 *   (2) Helper (Events/Ressourcen)
 *   (3) Map-Loading
 *   (4) Klasse Game (init/start/APIs)
 *   (5) Exports
 * ========================================================================== */

/* (0) Logger-Guard ----------------------------------------------------------- */
if (!window.CBLog || typeof window.CBLog.ok !== "function") {
  window.CBLog = { ok:console.log, info:console.log, warn:console.warn, error:console.error };
  CBLog.info("[game] Hinweis: globaler CBLog nicht gefunden – Fallback aktiv");
}

/* (1) Konstanten/State ------------------------------------------------------- */
const GAME_MOD     = "[game]";
const GAME_VERSION = "v18.9.4";

const STATE = {
  tick: 0,
  map:  { url: null, data: null, loaded: false },
  resources: { wood: 0, stone: 0, fish: 0 }
};

/* (2) Helper (Events/Ressourcen) -------------------------------------------- */
function emitResChange(res, delta, source = "game") {
  STATE.resources[res] = (STATE.resources[res] || 0) + delta;
  try { window.dispatchEvent(new CustomEvent("cb:res:change", { detail: { res, delta, source } })); } catch(_){}
}

/* (3) Map-Loading ------------------------------------------------------------ */
async function loadMap(url) {
  try {
    try { window.dispatchEvent(new CustomEvent("cb:map:loading", { detail: { url } })); } catch(_){}
    (CBLog.info||console.log)(`${GAME_MOD} Map wird geladen: ${url}`);

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();

    STATE.map.url    = url;
    STATE.map.data   = json;
    STATE.map.loaded = true;

    try { window.dispatchEvent(new CustomEvent("cb:map:loaded", { detail: { url } })); } catch(_){}
    (CBLog.ok||console.log)(`${GAME_MOD} Map geladen: ${json?.name || url}`);
  } catch (err) {
    STATE.map.loaded = false;
    (CBLog.error||console.error)(`${GAME_MOD} Map-Load fehlgeschlagen: ${url} → ${err?.message || err}`);
    try { window.dispatchEvent(new CustomEvent("cb:map:error", { detail: { url, err } })); } catch(_){}
    throw err;
  }
}

/* (4) Klasse Game (init/start/APIs) ----------------------------------------- */
class Game {
  static init() {
    (CBLog.ok||console.log)(`${GAME_MOD} Modul geladen (${GAME_VERSION})`);
    // TODO: Renderer/Canvas/Loop vorbereiten
  }

  /**
   * Startet das Spiel:
   *  - lädt Map (JSON)
   *  - setzt World-State
   *  - emittiert NACH Erfolg: cb:game-start
   */
  static async start(mapUrl) {
    (CBLog.info||console.log)(`${GAME_MOD} Start angefordert → ${mapUrl}`);
    await loadMap(mapUrl);

    // TODO: Welt/Renderer aus STATE.map.data aufbauen

    try {
      window.dispatchEvent(new CustomEvent("cb:game-start", {
        detail: { mapUrl, seed: Date.now() }
      }));
    } catch(_){}
    (CBLog.ok||console.log)(`${GAME_MOD} Spielstart abgeschlossen (map=${mapUrl})`);
  }

  static getObstacleAt(tx, ty){ return false; }
  static giveTestResources(){
    emitResChange("wood", 10, "test");
    emitResChange("stone", 5, "test");
    emitResChange("fish",  3, "test");
  }
}

/* (5) Exports ---------------------------------------------------------------- */
window.Game = Game;
