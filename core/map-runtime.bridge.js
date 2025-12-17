/* ============================================================================
 * Datei   : core/map-runtime.bridge.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.17-deprecated-safe-shim
 *
 * STATUS: DEPRECATED / SICHERHEITS-SHIM
 *
 * Warum?
 *  - In der aktuellen Architektur lädt core/game.map.js Map+Tileset selbständig
 *    (default: data/maps/map-epoch1.json + assets/tiles/tileset.terrain.png)
 *  - Dieses Bridge-Skript stammt aus einem älteren Prototyp, der ein
 *    window.Game.start(map, ...) voraussetzt.
 *  - Im aktuellen Projekt existiert Game.start NICHT → früher entstand dadurch
 *    nur Rauschen / Warnungen (und potentiell doppelte Map-Fetches).
 *
 * Ziel:
 *  - Selbst wenn das Script versehentlich eingebunden ist (Cache, alte index.html),
 *    darf es NICHTS kaputt machen.
 *  - Optional kann man es gezielt aktivieren (Debug/Legacy) via:
 *      window.__ENABLE_MAP_BRIDGE__ = true;
 *
 * Hinweis:
 *  - Wenn du es nicht brauchst: Datei kann gelöscht werden.
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[map-bridge]';
  const INFO = (...a)=> (window.CBLog?.info  || console.info )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  || console.warn )(TAG, ...a);

  // Opt-In: Nur wenn explizit aktiviert.
  if (!window.__ENABLE_MAP_BRIDGE__){
    INFO('deprecated shim aktiv – Bridge ist standardmäßig deaktiviert.');
    return;
  }

  // Sicherheits-Guard: Wenn modernes GameMap vorhanden ist, niemals eingreifen.
  if (window.GameMap && typeof window.GameMap.init === 'function'){
    WARN('Bridge deaktiviert: GameMap ist aktiv (modern pipeline).');
    return;
  }

  // Legacy-Pfad: Nur wenn Game.start existiert.
  if (!window.Game || typeof window.Game.start !== 'function'){
    WARN('Bridge deaktiviert: window.Game.start fehlt.');
    return;
  }

  // Falls ihr das jemals wieder nutzen wollt: hier müsste der alte Code rein.
  // Bewusst leer gelassen, damit es kein "halb-aktiv" gibt.
  WARN('Bridge opt-in ist gesetzt, aber Legacy-Implementierung ist entfernt.');
})();
