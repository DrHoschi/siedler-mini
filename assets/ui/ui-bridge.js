/* 
========================================
 Datei: assets/ui/ui-bridge.js
 Projekt: Siedler-Mini
 Version: v17.8.0
 Zweck: Brücke für Build/Inspector-FABs
========================================
*/

window.GameUI = window.GameUI || {};

// Toggle Build
window.GameUI.toggleBuild = function(force){
  const ev = new CustomEvent(force ? 'cb:build-open' : 'cb:build-toggle');
  window.dispatchEvent(ev);
  (window.CBLog?.ok||console.log)("[ui-bridge] Build toggle", force);
};

// Toggle Inspector – NICHT doppelt überschreiben
window.GameUI.toggleInspector = function(force){
  const ev = new CustomEvent('cb:inspector-toggle',{detail:{force}});
  window.dispatchEvent(ev);
  (window.CBLog?.ok||console.log)("[ui-bridge] Inspector toggle", force);
};
