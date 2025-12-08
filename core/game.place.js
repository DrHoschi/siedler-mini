/* ============================================================================
 * Datei   : core/game.place.js
 * Projekt : Neue Siedler
 * Version : v25.12.xx-place-controller
 * Zweck   : Ghost-/Platzier-Controller (Bauen, Overlay, Buttons)
 * ========================================================================== */
(function(){
  'use strict';

  const TAG  = '[place]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log  )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn )(TAG, ...a);

  // hier die TEIL-2-Funktionen rein
  // + ein kleines API-Objekt:

  window.GamePlace = {
    onHoverTile(p){ /* später */ },
    onMapClick(p){ /* später */ },
    onSetBuildTool(kind){ /* später */ },
    onPlaceBegin(cfg){ /* später */ },
    onCameraChange(cam){ /* später */ },
    onKeyEnter(){ /* später */ },
    onKeyEscape(){ /* später */ }
  };

})();
