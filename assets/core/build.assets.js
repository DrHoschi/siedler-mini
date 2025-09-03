/* ============================================================================
 * build.assets.js — Zentrale Asset-Map fürs Bau-Menü (Icons/Fallbacks)
 * Version: v1.0.0
 * Projekt: Siedler-Mini
 *
 * Zweck
 *   - Einheitliche Stelle, an der UI-Icons für das Bau-Dock definiert sind.
 *   - Später leicht austauschbar (Sprite-Atlas, generierte Sheets, …).
 *
 * API (global)
 *   window.BUILD_ASSETS : {
 *     ui: { buildMarker, ... },
 *     building: { hq, depot, farm, ... }
 *   }
 *   (Pfadangaben sind relativ zur Seite)
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[build.assets]';

  // sanfte Logs
  function ok(m){ try{ (window.CBLog?.ok||console.log)(m);}catch(_){ console.log(m);} }

  // Fallback-Marker (kleines generisches Icon aus deinem Repo)
  var FALLBACK_ICON = 'assets/icons/icons_spritesheet_64.png'; // wird nur als Platzhalter genutzt

  // Du hast bereits diverse Building-Texturen unter assets/tex/building/wood/.
  // Für UI-Icons verwenden wir vorerst diese. Später ersetzen wir das durch echte
  // 48×48/64×64-Icons aus einem UI-Sprite.
  var building = {
    hq:            'assets/tex/building/wood/hq_wood.PNG',
    depot:         'assets/tex/building/wood/depot_wood.png',
    farm:          'assets/tex/building/wood/farm_wood.png',
    fischer:       'assets/tex/building/wood/fischer_wood1.PNG',
    wassermuehle:  'assets/tex/building/wood/wassermuehle_wood.PNG',
    windmuehle:    'assets/tex/building/wood/windmuehle_wood.PNG',
    baeckerei:     'assets/tex/building/wood/baecker_wood.png',
    lumberjack:    'assets/tex/building/wood/lumberjack_wood.PNG',
    stonebraker:   'assets/tex/building/wood/stonebraker_wood.PNG',
    haeuser1:      'assets/tex/building/wood/Wohnhaus_wood0_ug0.png',
    haeuser2:      'assets/tex/building/wood/Wohnhaus_wood1_ug0.png'
  };

  // UI-Sektion
  var ui = {
    buildMarker: FALLBACK_ICON
  };

  // Global exportieren
  window.BUILD_ASSETS = { ui:ui, building:building };

  ok(MOD+' bereit (v1.0.0)');
})();
