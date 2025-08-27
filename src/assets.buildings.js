/* ============================================================================
   Datei:   src/assets.buildings.js
   Version: v16.1.0
   Zweck:   Zentrale Registry für Gebäude-Sprites (nur Client; kein Packen nötig)
   Hinweis: Nutzt *direkt* die Koordinaten aus dem Lumberjack-Atlas (Grid),
            damit wir unabhängig vom JSON-Format bleiben.
============================================================================ */

(function(){
  const BASE = './assets/buildings/lumberjack/';

  // Atlas-Bild (1024x1024). Die Koordinaten kommen aus deiner CSV.
  const ATLAS_URL = BASE + 'lumberjack_tiers_grid.png?v=1610';

  // CSV-Äquivalent – direkt im Code, damit sofort nutzbar.
  // id,name,tier,variant,role,frame.x,frame.y
  const LUMBERJACK = [
    { id:0, name:'lumberjack_wood0_ug0', tier:'Tier 1 (Holz)',       variant:'ug0', role:'BuildMenu', frame:{x:0,   y:0   , w:512, h:512} },
    { id:1, name:'lumberjack_wood0_ug1', tier:'Tier 1 (Holz)',       variant:'ug1', role:'Placed',    frame:{x:512, y:0   , w:512, h:512} },
    { id:2, name:'lumberjack_wood1_ug0', tier:'Tier 2 (Teil-Stein)', variant:'ug0', role:'BuildMenu', frame:{x:0,   y:512 , w:512, h:512} },
    { id:3, name:'lumberjack_wood1_ug1', tier:'Tier 2 (Teil-Stein)', variant:'ug1', role:'Placed',    frame:{x:512, y:512 , w:512, h:512} },
    { id:4, name:'lumberjack_wood2_ug0', tier:'Tier 3 (Stein)',      variant:'ug0', role:'BuildMenu', frame:{x:0,   y:1024, w:512, h:512} },
    { id:5, name:'lumberjack_wood2_ug1', tier:'Tier 3 (Stein)',      variant:'ug1', role:'Placed',    frame:{x:512, y:1024, w:512, h:512} },
  ];

  // Öffentliche API
  window.BuildingSprites = {
    version: 'v16.1.0',
    atlasURL: ATLAS_URL,
    lumberjack: LUMBERJACK,
    // Liefert BuildMenu-Varianten (ug0) als Buttonspezifikationen
    getBuildMenuEntries(){
      // eine Option pro Tier; nutzt die BuildMenu-Frames
      const tiers = [
        LUMBERJACK.find(s=>s.name==='lumberjack_wood0_ug0'),
        LUMBERJACK.find(s=>s.name==='lumberjack_wood1_ug0'),
        LUMBERJACK.find(s=>s.name==='lumberjack_wood2_ug0'),
      ];
      return tiers.map((s,i)=>({
        id:`lumberjack_t${i+1}`,
        label:`Holzfäller T${i+1}`,
        icon:{atlas:ATLAS_URL, frame:s.frame},
        placeSpriteName: LUMBERJACK.find(p=>p.variant==='ug1' && p.tier===s.tier)?.name || s.name
      }));
    }
  };

  if(window.AppLog) AppLog.ok(`Buildings-Atlas bereit (assets.buildings.js ${window.BuildingSprites.version})`);
})();
