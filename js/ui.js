/* 
============================================================
Datei: js/ui.js
Projekt: Siedler-Mini
Version: v16.1.20
Zweck : UI-Hilfsfunktionen (Tool-Auswahl etc.), robust
============================================================
*/
function selectTool(t){
  tool = t || '';
  var host = (typeof bar !== 'undefined' && bar) ? bar : document;
  var btns = (host.querySelectorAll ? host.querySelectorAll('button') : []);
  for (var i=0;i<btns.length;i++){
    var b = btns[i];
    var isActive = (b.dataset && b.dataset.tool === tool);
    if (b.classList && b.classList.toggle) b.classList.toggle('active', isActive);
  }
  if (typeof hint !== 'undefined' && hint) {
    hint.textContent = 'Werkzeug: ' + (tool || '(Aus)');
  }
  try { console.log('[ui] Tool:', tool || '(Aus)'); } catch(e){}
}
