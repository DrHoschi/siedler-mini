/* ============================================================================
 * ui-build.categories.js — Kategorien + Items fürs Baumenü-Dock
 * Version: v1.2.1 (ES5-kompatibel)
 * API: window.BUILD_CATEGORIES : Array<Category>
 * Category = { id, title, items: Array<Item> }
 * Item = { id, label, icon, kind? }
 * ========================================================================== */
(function(){
  'use strict';
  var MOD = "[ui-build.categories]";

  // Hinweis: Icons unter assets/icons/buildings/*.png
  // Lege dort deine Bilddateien ab (64x64 empfohlen).
  var CATS = [
    { id:'core', title:'Kern', items:[
      { id:'hq',          label:'HQ (Holz)',       icon:'assets/icons/buildings/hq.png',        kind:'building' }
    ]},
    { id:'eco', title:'Wirtschaft', items:[
      { id:'lumberjack',  label:'Holzfällerhütte', icon:'assets/icons/buildings/lumberjack.png', kind:'building' },
      { id:'fisher',      label:'Fischerhütte',    icon:'assets/icons/buildings/fisher.png',     kind:'building' },
      { id:'quarry',      label:'Steinbruch',      icon:'assets/icons/buildings/quarry.png',     kind:'building' }
    ]},
    { id:'admin', title:'Admin/Debug', items:[
      { id:'road',        label:'Weg (Test)',      icon:'assets/icons/build/road.png',           kind:'tool' },
      { id:'destroy',     label:'Abreißen',        icon:'assets/icons/build/delete.png',         kind:'tool' }
    ]}
  ];

  window.BUILD_CATEGORIES = CATS;

  try {
    window.dispatchEvent(new CustomEvent('cb:build-categories-ready', { detail:{ categories: CATS } }));
  } catch(e) { /* Safari kann das, Guard nur zur Sicherheit */ }

  if (window.console && typeof window.console.log === 'function') {
    window.console.log(MOD, "bereit", CATS);
  }
})();
