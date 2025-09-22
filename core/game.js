/* ============================================================================
 * Datei: core/game.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: Game-Loop, World-State, Ressourcen-Events.
 * Datum: 2025-09-21
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * Hinweis: Debug/Inspector NIE entfernen. Ereignisse nutzen (cb:*).
 * ============================================================================ */

// --- CBLog (Fallback) --------------------------------------------------------
window.CBLog = window.CBLog || {
  ok:   (...a)=>console.log('✅', ...a),
  info: (...a)=>console.log('ℹ️', ...a),
  warn: (...a)=>console.warn('⚠️', ...a),
  error:(...a)=>console.error('❌', ...a),
};

const GAME_VERSION="v1.0.0";
const STATE={tick:0,resources:{wood:0,stone:0,fish:0}};
function emitResChange(res,delta,source='game'){STATE.resources[res]=(STATE.resources[res]||0)+delta;window.dispatchEvent(new CustomEvent('cb:res:change',{ detail:{ res, delta, source } }));}
class Game{
  static init(){ CBLog.ok("[game] Modul geladen ("+GAME_VERSION+")"); }
  static start(mapId){ CBLog.info("[game] Start", mapId); window.dispatchEvent(new CustomEvent('cb:game-start',{ detail:{ mapId, seed: Date.now() } })); }
  static getObstacleAt(tx,ty){ return false; }
  static giveTestResources(){ emitResChange('wood',10,'test'); emitResChange('stone',5,'test'); }
}
window.Game = Game;
