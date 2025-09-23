/* ============================================================================
 * ui-build.categories.js — Kategorien + Items fürs Baumenü-Dock
 * Version: v1.2.0 (2025-09-23)
 * API: window.BUILD_CATEGORIES : Array<Category>
 * Category = { id, title, items: Array<Item> }
 * Item = { id, label, icon, kind? }
 * ========================================================================== */
(function(){
  'use strict';
  const MOD = "[ui-build.categories]";

  // Hinweis: Icons unter assets/icons/build/*.png
  // Lege dort deine Bilddateien ab (64x64 empfohlen).
  const CATS = [
    { id:'core', title:'Kern', items:[
      { id:'hq', label:'HQ (Holz)', icon:'assets/icons/build/hq.png', kind:'building' }
    ]},
    { id:'eco', title:'Wirtschaft', items:[
      { id:'lumberjack', label:'Holzfällerhütte', icon:'assets/icons/build/lumberjack.png', kind:'building' },
      { id:'fisher',     label:'Fischerhütte',    icon:'assets/icons/build/fisher.png',     kind:'building' },
      { id:'quarry',     label:'Steinbruch',      icon:'assets/icons/build/quarry.png',     kind:'building' }
    ]},
    { id:'admin', title:'Admin/Debug', items:[
      { id:'road',     label:'Weg (Test)',    icon:'assets/icons/build/road.png',   kind:'tool' },
      { id:'destroy',  label:'Abreißen',      icon:'assets/icons/build/delete.png', kind:'tool' }
    ]}
  ];

  window.BUILD_CATEGORIES = CATS;
  window.dispatchEvent(new CustomEvent('cb:build-categories-ready', { detail:{ categories: CATS } }));
  console?.log?.(MOD, "bereit", CATS);
})();
