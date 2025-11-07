/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler
 * Version : v25.11.13-final (Tileset-accept)
 * Zweck   : Game.start akzeptiert tileset aus der Map-Bridge
 * ========================================================================== */

window.Game = window.Game || {};

(function(){
  'use strict';
  const TAG = '[game]';
  const INFO = (...a)=> (window.CBLog?.info || console.info)(TAG, ...a);

  const state = {
    map: null,
    tileset: null,
    tilesetUrl: null,
    // ... dein bisheriger State ...
  };

  // Wichtig: zweites Argument (options) erlaubt tileset-Übergabe
  Game.start = function(map, options = {}){
    state.map = map || null;
    state.tileset    = options.tileset    || state.tileset || null;
    state.tilesetUrl = options.tilesetUrl || state.tilesetUrl || null;

    // (Optional) Sanity-Log:
    if (!state.tileset) {
      console.warn('[game]', 'Tileset fehlt – Renderer wird ggf. nichts zeichnen.');
    } else {
      INFO('Tileset bereit:', state.tilesetUrl || '(inline)');
    }

    // ---- ab hier dein bestehender Start/Renderer/Loop ----
    // initRenderer();
    // startLoop();
  };

  // Falls du per Ereignis starten willst:
  addEventListener('cb:map:ready', (e)=>{
    const d = e.detail || {};
    Game.start(d.map, { tileset: d.tileset, tilesetUrl: d.tilesetUrl });
  });

})();
