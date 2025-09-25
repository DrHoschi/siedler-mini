/* ============================================================================
 * Datei: core/game.js
 * Version: v1.2.0 (2025-09-25)
 * Zweck: Game-Loop, World-State, Map-Load, Ressourcen-Events
 * Leitplanken: cb:map:loading → cb:map:loaded → cb:game-start (erst nach Erfolg)
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
  window.CBLog = {
    ok:   (m)=>console.log("[OK] "   + m),
    info: (m)=>console.log("[INFO] " + m),
    warn: (m)=>console.warn("[WARN] "+ m),
    error:(m)=>console.error("[ERR] "+ m),
  };
  CBLog.info("[game] Hinweis: globaler CBLog nicht gefunden – Fallback aktiv");
}

/* (1) Konstanten/State ------------------------------------------------------- */
const GAME_MOD     = "[game]";
const GAME_VERSION = "v1.2.0";

const STATE = {
  tick: 0,
  map:  { url: null, data: null, loaded: false },
  resources: { wood: 0, stone: 0, fish: 0 }
};

/* (2) Helper (Events/Ressourcen) -------------------------------------------- */
function emitResChange(res, delta, source = "game") {
  STATE.resources[res] = (STATE.resources[res] || 0) + delta;
  window.dispatchEvent(new CustomEvent("cb:res:change", { detail: { res, delta, source } }));
}

/* (3) Map-Loading ------------------------------------------------------------ */
async function loadMap(url) {
  try {
    window.dispatchEvent(new CustomEvent("cb:map:loading", { detail: { url } }));
    CBLog.info(`${GAME_MOD} Map wird geladen: ${url}`);

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();

    STATE.map.url    = url;
    STATE.map.data   = json;
    STATE.map.loaded = true;

    window.dispatchEvent(new CustomEvent("cb:map:loaded", { detail: { url } }));
    CBLog.ok(`${GAME_MOD} Map geladen: ${url}`);
  } catch (err) {
    STATE.map.loaded = false;
    CBLog.error(`${GAME_MOD} Map-Load fehlgeschlagen: ${url} → ${err?.message || err}`);
    window.dispatchEvent(new CustomEvent("cb:map:error", { detail: { url, err } }));
    throw err;
  }
}

/* (4) Klasse Game (init/start/APIs) ----------------------------------------- */
class Game {
  static init() {
    CBLog.ok(`${GAME_MOD} Modul geladen (${GAME_VERSION})`);
    // TODO: Renderer/Canvas/Loop vorbereiten (falls notwendig)
  }

  /**
   * Startet das Spiel:
   *  - lädt Map (JSON)
   *  - setzt World-State
   *  - emittiert NACH Erfolg: cb:game-start
   */
  static async start(mapUrl) {
    CBLog.info(`${GAME_MOD} Start angefordert → ${mapUrl}`);
    await loadMap(mapUrl);

    // TODO: Welt/Renderer aus STATE.map.data aufbauen, Entities spawnen etc.

    window.dispatchEvent(new CustomEvent("cb:game-start", {
      detail: { mapUrl, seed: Date.now() }
    }));
    CBLog.ok(`${GAME_MOD} Spielstart abgeschlossen (map=${mapUrl})`);
  }

  static getObstacleAt(tx, ty) { return false; }

  static giveTestResources() {
    emitResChange("wood", 10, "test");
    emitResChange("stone", 5, "test");
    emitResChange("fish",  3, "test");
  }
}

/* (5) Exports ---------------------------------------------------------------- */
window.Game = Game;
