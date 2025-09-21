/* ============================================================================
 * ui-buttons.js — Steuerleiste (Bauen, Abbrechen etc.)
 * ============================================================================
 */
(function(){
  'use strict';
  const panel = document.createElement('div');
  panel.id = 'build-buttons';
  panel.style = 'position:fixed; top:10px; left:10px; z-index:10;';
  const btnBuild = document.createElement('button');
  btnBuild.textContent = 'Bauen';
  btnBuild.onclick = () => {
    document.getElementById('build-dock')?.classList.toggle('hidden');
  };
  panel.appendChild(btnBuild);
  document.body.appendChild(panel);
})();
