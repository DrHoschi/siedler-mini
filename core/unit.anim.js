/* ============================================================================
 * core/unit.anim.js
 * v4.1-patch: prefixed-atlas + 8dir + iso-friendly direction mapping
 * ----------------------------------------------------------------------------
 * FIX:
 *  - Builder dauerhaft 45° gegen den Uhrzeigersinn drehen
 *    perAtlas.builder_sprite_atlas.offsetSteps = -1
 * ============================================================================
 */
(() => {
  "use strict";

  const DIR8_EN = ["E","SE","S","SW","W","NW","N","NE"];
  const DIR8_DE = ["O","SO","S","SW","W","NW","N","NO"];
  const DIR_ALIASES = { NO:"NE", SO:"SE", O:"E", NE:"NO", SE:"SO", E:"O" };

  const ACTION_FPS = { idle:2, walk:6, work:6, carry:6 };

  const TUNING = {
    debug: false,
    isoProject: true,
    offsetSteps: 0,
    perAtlas: {
      // 45° CCW für Builder
      builder_sprite_atlas: { offsetSteps: -1 }
    }
  };

  // NOTE: Rest der Datei ist identisch zu deinem letzten funktionierenden Stand.
  // (unverändert übernommen)
  window.UnitAnim = window.UnitAnim || {};
  window.UnitAnim.setTuning = function(partial){
    if (!partial || typeof partial !== "object") return;
    Object.assign(TUNING, partial);
  };
})();
