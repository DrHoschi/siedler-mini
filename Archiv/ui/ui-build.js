/* ============================================================================
 * ui-build.js — Baumenü-Modul (Tab-Dock)
 * Version: v1.0.0
 * ============================================================================
 */
(function(){
  'use strict';
  const dock = document.createElement('div');
  dock.id = 'build-dock';
  dock.innerHTML = '<h3>Baumenü</h3>';
  dock.style = 'position:fixed; bottom:0; left:0; width:100%; background:#122238; color:white;';
  document.body.appendChild(dock);
  if (window.BuildCategories) {
    const catList = document.createElement('ul');
    for (const cat of BuildCategories) {
      const li = document.createElement('li');
      li.textContent = cat.label;
      li.style = 'display:inline-block; margin:5px; background:#1f2f48; padding:4px 10px;';
      catList.appendChild(li);
    }
    dock.appendChild(catList);
  }
})();
