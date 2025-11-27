/* ============================================================================
 * Datei    : core/carrier.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v25.10.25-final+traces
 * Zweck    : Träger-Logik (Jobs annehmen → Ressource holen → ins HQ liefern)
 *
 * Events (emit):
 *   cb:carrier:job:accepted {res, from:{x,y}, to:{x,y}}
 *   cb:carrier:pickup:ok    {res, at:{x,y}}
 *   cb:carrier:pickup:fail  {res, at:{x,y}, reason}
 *   cb:carrier:deliver:ok   {res, qty, to:{x,y}}
 *   cb:carrier:idle         {id}
 *   cb:res:change           {res, delta, source:'carrier'} // Fallback
 *   cb:path:trace           {from:{x,y}, to:{x,y}}          // Weltpixel (Trampelpfad)
 *   cb:request-repaint      {}                              // nach Schritt
 * ============================================================================ */
(() => {
  'use strict';

  const LOG  = (...a)=> (window.CBLog?.ok   ?? console.log)('[carrier]', ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info)('[carrier]', ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)('[carrier]', ...a);

  const G = window.Game || {};

  // ... (DEIN GANZER BISHERIGER CODE UNVERÄNDERT BIS ZUM MOVEMENT-TEIL)

  // ---- Movement -------------------------------------------------------------
  // Vereinfachte Schrittlogik mit künstlicher Verlangsamung,
  // damit Träger nicht so "hektisch" wirken.
  function stepTowardFallback(u, tx, ty){
    // Alle N Frames einen Schritt machen
    const SKIP_FRAMES = 4; // 0 = jede Frame, 4 = nur alle 5 Frames
    if (u._moveSkip == null) u._moveSkip = 0;

    if (u._moveSkip > 0){
      u._moveSkip--;
      return false; // diese Frame keinen Schritt
    }
    u._moveSkip = SKIP_FRAMES;

    if (u.x === tx && u.y === ty) return true;

    if (u.x < tx && !G.isBlocked(u.x+1,u.y)) u.x++;
    else if (u.x > tx && !G.isBlocked(u.x-1,u.y)) u.x--;
    else if (u.y < ty && !G.isBlocked(u.x,u.y+1)) u.y++;
    else if (u.y > ty && !G.isBlocked(u.x,u.y-1)) u.y--;

    return (u.x === tx && u.y === ty);
  }

  function ensureCarryIcon(u){
    if (u._iconElm) return;
    const elm = document.createElement('div');
    elm.className = 'carrier-icon';
    document.body.appendChild(elm);
    u._iconElm = elm;
  }

  // ... (Rest deiner Datei unverändert – tick(), Export usw.)

})();
