/*
 * ============================================================
 * Neue Siedler – Unit Movement Helpers
 * File: core/unit.movement.js
 * Version: v4.7a-unitdir-central-2026-01-06
 * ------------------------------------------------------------
 * Ziel:
 *  - ZENTRALER, EINDEUTIGER Fix für "Unit läuft immer Richtung Ost".
 *  - Richtung (dir/dir8) wird IMMER im Movement gesetzt.
 *  - Animation liest NUR NOCH unit.dir (bzw. u._dir8 als Alias).
 *
 * Hintergrund:
 *  - Tiere setzten ihre Richtung bereits zuverlässig.
 *  - Einige Humanoide/Worker bewegen sich (u.x/u.y ändern sich),
 *    aber es wurde bisher KEIN Richtungstoken gesetzt → Fallback in UnitAnim
 *    → Default wurde (bei euch) häufig "E".
 *
 * Dieses Helper-Modul stellt eine einzige, zentrale Funktion bereit,
 * die überall im Movement aufgerufen werden kann.
 * ============================================================
 */

(function(){
  'use strict';

  /** Safe: returns "S" if nothing can be computed. */
  function _dir8FromDelta(dx, dy){
    const UA = window.UnitAnim;
    if (UA && typeof UA.dir8FromDelta === 'function'){
      return UA.dir8FromDelta(dx, dy);
    }

    // Minimal-Fallback (sollte praktisch nie gebraucht werden)
    const x = Number(dx) || 0;
    const y = Number(dy) || 0;
    if (Math.abs(x) < 1e-6 && Math.abs(y) < 1e-6) return 'S';
    const ang = Math.atan2(y, x);
    let deg = (ang * 180) / Math.PI;
    if (deg < 0) deg += 360;
    const idx = Math.round(deg / 45) % 8;
    return (['E','SE','S','SW','W','NW','N','NE'][idx]) || 'S';
  }

  /**
   * Setzt die Richtung auf der Unit.
   * - dir wird IMMER im EN-Scheme gesetzt: "N","NE","E","SE","S","SW","W","NW".
   * - Zusätzlich schreiben wir u._dir8 als Alias (manche Renderer/Debug nutzen das).
   */
  function updateDirFromDelta(u, dx, dy){
    if (!u) return;
    if (!(Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6)) return;
    const dir = _dir8FromDelta(dx, dy);
    u.dir = dir;
    u._dir8 = dir; // Alias, damit alte Teile/Debug es sehen
  }

  /**
   * Convenience: Richtung aus (target - pos) ableiten.
   * target: {x,y} in Tile- oder World-Koords (egal, solange gleiche Einheit wie u.x/u.y)
   */
  function updateDirTowardsTarget(u, target){
    if (!u || !target) return;
    const dx = (target.x - u.x);
    const dy = (target.y - u.y);
    updateDirFromDelta(u, dx, dy);
  }

  // Global export (keine Module im Projekt)
  window.UnitMovement = {
    dir8FromDelta: _dir8FromDelta,
    updateDirFromDelta,
    updateDirTowardsTarget
  };
})();
