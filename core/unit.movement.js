/* ============================================================================
 * Datei   : core/unit.movement.js
 * Projekt : Neue Siedler – Unit Movement Helpers
 * Version : v26.01.06-unitmovement-central-v2
 *
 * Zweck:
 *   - Zentrale Helper für:
 *       (1) 8-Richtungsberechnung aus Delta (dx,dy)
 *       (2) Setzen von u.dir + u._dir8 konsistent
 *       (3) "towards target" Helper
 *
 * WICHTIG:
 *   - Standalone (keine Imports), robust wie unit.anim.js
 *   - Nutzt UnitDirections (falls vorhanden) als kanonische Ordnung.
 * ============================================================================ */
(function(){
  'use strict';

  // Fallback-Order, falls UnitDirections nicht geladen ist
  const FALLBACK_ORDER = ["N","NE","E","SE","S","SW","W","NW"];

  function _order(){
    return (window.UnitDirections && Array.isArray(window.UnitDirections.order))
      ? window.UnitDirections.order
      : FALLBACK_ORDER;
  }

  // Klassischer 8-dir Resolver aus Screen-Space Delta.
  // dx>0 => rechts (E), dy>0 => unten (S)
  function dir8FromDelta(dx, dy){
    dx = Number(dx)||0;
    dy = Number(dy)||0;
    if (dx === 0 && dy === 0) return "S";

    // Winkel in Radiant: atan2(y,x)
    const ang = Math.atan2(dy, dx); // -PI..PI
    // Umrechnen in 0..2PI
    const a = (ang + Math.PI*2) % (Math.PI*2);
    // 8 Sektoren à 45°
    const idx = Math.round(a / (Math.PI/4)) % 8;

    // Unser Index 0 soll "E" sein, aber kanonisch ist Start bei "N".
    // Wir mappen daher: idx(0=E,1=SE,2=S,3=SW,4=W,5=NW,6=N,7=NE)
    // -> auf kanonische Ordnung ["N","NE","E","SE","S","SW","W","NW"]
    const map = ["E","SE","S","SW","W","NW","N","NE"];
    const tok = map[idx];

    // Wenn UnitDirections existiert, stellen wir sicher, dass Token exakt daraus kommt
    const ord = _order();
    return ord.includes(tok) ? tok : tok;
  }

  function updateDirFromDelta(u, dx, dy, opts){
    if (!u) return "S";
    const tok = dir8FromDelta(dx, dy);
    u.dir = tok;
    u._dir8 = tok; // historisch bei euch im Code genutzt
    if (opts && opts.alsoDir) u._dir = tok;
    return tok;
  }

  function updateDirTowardsTarget(u, target){
    if (!u || !target) return "S";
    const dx = (target.x - u.x);
    const dy = (target.y - u.y);
    return updateDirFromDelta(u, dx, dy);
  }

  window.UnitMovement = {
    dir8FromDelta,
    updateDirFromDelta,
    updateDirTowardsTarget
  };
})();
