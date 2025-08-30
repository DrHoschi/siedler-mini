/* 
============================================================
Datei: tools/debug-tools.js
Projekt: Siedler-Mini
Version: v16.1.20
Zweck : Debug-/Dev-Toolbar, robust gegen fehlendes DOM
============================================================
*/

/* 1) Hilfsfunktionen */
function getDevBar(){
  return document.getElementById('dt-bar')
      || document.getElementById('dev-toolbar')
      || document.querySelector('[data-dev-bar]')
      || null;
}

/* Beispiel: Toggle-Button aktualisieren */
function updateToggleBtn(){
  var bar = getDevBar();
  if (!bar) return; // wichtig: keine Toolbar → nichts tun

  var t = bar.querySelector('#dt-toggle');
  if (t) t.innerHTML = (state.minimized ? "▢ Max" : "▣ Min");

  var r = (window.Assets && Assets.report ? Assets.report() : { missing: [] });
  var b = bar.querySelector('#dt-badge-missing');
  if (b) b.textContent = String(r.missing.length);
}

/* weitere Funktionen analog absichern ... */
