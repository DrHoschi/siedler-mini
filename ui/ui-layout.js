\
/* ============================================================================
 * Datei   : ui/ui-layout.js
 * Projekt : Neue Siedler
 * Version : v25.12.18-layout-fix1
 * Zweck   : UI-Layout zuverlässig aktivieren, sobald das Spiel wirklich läuft.
 *
 * PROBLEM (ist bei dir gerade exakt sichtbar im Inspector → Layer):
 *   - #ui-root 402x0, #hud-root 0x0, #build-dock 0x0
 *   - Ursache: body hat NICHT die Klasse "is-playing"
 *   - In ui/css/ui-layout-*.css werden HUD/BuildDock dann weggekapselt (0x0).
 *
 * WARUM KANN DAS "PLÖTZLICH" PASSIEREN, OBWOHL ES FRÜHER GING?
 *   - iOS/Safari Cache + Lade-Reihenfolge:
 *     cb:game:start kann früher feuern als dieses Script geladen ist.
 *     Dann verpasst man den Event → Klasse wird nie gesetzt.
 *
 * LÖSUNG (minimal, rückbaubar, ohne Boot zu ändern):
 *   - Wir hängen Listener an cb:game:start und cb:game:reset.
 *   - Zusätzlich ein "Self-Heal": nach dem Laden prüfen wir, ob Game bereits
 *     existiert (window.Game / window.GameMap). Falls ja, setzen wir is-playing
 *     nachträglich. Das verändert NICHT das Spiel, nur die Sichtbarkeit der UI.
 *
 * Events:
 *   - cb:ui-ready / cb:ui:ready -> Layout AUS (Startscreen sichtbar)
 *   - cb:game:start             -> Layout AN  (HUD/Build sichtbar)
 *   - cb:game:reset             -> Layout AUS
 * ========================================================================== */

(function LayoutGlue(){
  'use strict';

  const TAG  = '[layout]';
  const info = (m, o)=> (window.CBLog?.info || console.info)(TAG, m, o ?? '');
  const warn = (m, o)=> (window.CBLog?.warn || console.warn)(TAG, m, o ?? '');

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function enable(){
    if (!document.body) return;
    document.body.classList.add('is-playing');
    document.documentElement.classList.add('is-playing');
    info('aktiv (body.is-playing)');
  }

  function disable(){
    if (!document.body) return;
    document.body.classList.remove('is-playing');
    document.documentElement.classList.remove('is-playing');
    info('inaktiv (Startscreen sichtbar)');
  }

  // ---------------------------------------------------------------------------
  // Event Wiring (idempotent)
  // ---------------------------------------------------------------------------
  if (window.__LAYOUT_GLUE_WIRED__) {
    // Falls das Script doppelt geladen wird: keine Doppel-Listener.
    warn('bereits verdrahtet – skip');
    return;
  }
  window.__LAYOUT_GLUE_WIRED__ = true;

  // Ready -> AUS (beide Aliasse)
  window.addEventListener('cb:ui-ready',  disable, { passive:true });
  window.addEventListener('cb:ui:ready',  disable, { passive:true });

  // Game start -> AN (wichtigster Trigger)
  window.addEventListener('cb:game:start', enable,  { passive:true });

  // Reset -> AUS
  window.addEventListener('cb:game:reset', disable, { passive:true });

  // ---------------------------------------------------------------------------
  // Self-Heal: Wenn cb:game:start schon lief, bevor dieses Script geladen wurde,
  // versuchen wir das gefahrlos zu erkennen und setzen is-playing nachträglich.
  //
  // Heuristik:
  //   - window.GameMap existiert und hat render/init
  //   - UND entweder window.Game existiert oder Tick/Runtime-Module aktiv sind
  //
  // Das ist bewusst konservativ: lieber UI aktivieren, wenn das Spiel sichtbar ist.
  // ---------------------------------------------------------------------------
  function selfHeal(){
    try{
      const hasMap = !!(window.GameMap && (window.GameMap.render || window.GameMap.init));
      const hasGame = !!window.Game;
      const already = document.body?.classList?.contains('is-playing');

      if (!already && hasMap && (hasGame || window.CarrierRuntime || window.GameCamera)) {
        enable();
        info('self-heal: is-playing nachträglich gesetzt');
      }
    } catch(e){
      warn('self-heal failed', e);
    }
  }

  // 1) direkt nach Script-Load
  setTimeout(selfHeal, 0);
  // 2) nochmal nach kurzem Delay (Safari/Canvas/Init)
  setTimeout(selfHeal, 250);

  // Debug/Manuell (für Konsole)
  window.LayoutGlue = { enable, disable, selfHeal };

  // Startzustand: AUS, bis wir Start erkennen
  disable();
})();
