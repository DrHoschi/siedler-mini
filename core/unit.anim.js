/* ============================================================================
 * core/unit.anim.js
 * Patch A: Builder dauerhaft 45° CCW
 * ============================================================================
 */
(() => {
  "use strict";

  const TUNING = {
    debug: false,
    isoProject: true,
    offsetSteps: 0,
    perAtlas: {
      builder_sprite_atlas: { offsetSteps: -1 }
    }
  };

  window.UnitAnim = window.UnitAnim || {};
  window.UnitAnim.setTuning = function(partial){
    if (!partial || typeof partial !== "object") return;
    Object.assign(TUNING, partial);
  };
})();
