// assets.js
// Zentrale Asset-Liste (case-sensitive, exakt wie auf GitHub!)
export const ASSETS = {
  tiles: {
    grass: 'assets/tex/topdown_grass.PNG',
    dirt:  'assets/tex/topdown_dirt.PNG',
    water: 'assets/tex/topdown_water.PNG',
    // auto-getretene Pfade (0..9):
    path: [
      'assets/tex/topdown_path0.PNG',
      'assets/tex/topdown_path1.PNG',
      'assets/tex/topdown_path2.PNG',
      'assets/tex/topdown_path3.PNG',
      'assets/tex/topdown_path4.PNG',
      'assets/tex/topdown_path5.PNG',
      'assets/tex/topdown_path6.PNG',
      'assets/tex/topdown_path7.PNG',
      'assets/tex/topdown_path8.PNG',
      'assets/tex/topdown_path9.PNG',
    ],
    // (optionale) Straßen
    road_straight: 'assets/tex/topdown_road_straight.PNG',
    road_corner:   'assets/tex/topdown_road_corner.PNG',
    road_t:        'assets/tex/topdown_road_t.PNG',
    road_cross:    'assets/tex/topdown_road_cross.PNG',
  },

  buildings: {
    // Holz-Variante (deine neuen Dateien)
    wood: {
      hq:               'assets/tex/building/wood/hq_wood.PNG',
      hq_ug1:           'assets/tex/building/wood/hq_wood_ug1.PNG',
      depot:            'assets/tex/building/wood/depot_wood.PNG',
      depot_ug:         'assets/tex/building/wood/depot_wood_ug.PNG',
      lumberjack:       'assets/tex/building/wood/lumberjack_wood.PNG',
      farm:             'assets/tex/building/wood/farm_wood.PNG',
      bakery:           'assets/tex/building/wood/baeckerei_wood.PNG',
      fisher:           'assets/tex/building/wood/fischer_wood1.PNG',
      stonebreaker:     'assets/tex/building/wood/stonebraker_wood.PNG',
      watermill:        'assets/tex/building/wood/wassermuehle_wood.PNG',
      windmill:         'assets/tex/building/wood/windmuehle_wood.PNG',
      house1:           'assets/tex/building/wood/haeuser_wood1.PNG',
      house1_ug1:       'assets/tex/building/wood/haeuser_wood1_ug1.PNG',
      house2:           'assets/tex/building/wood/haeuser_wood2.PNG',
    },

    // Platzhalter für spätere Stein-Variante
    stone: {}
  },

  units: {
    // Hier später Träger/Carrier ergänzen
  },

  ui: {
    // Hier Buttons/Icons pflegen
  }
};
