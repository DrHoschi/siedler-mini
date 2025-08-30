/* ============================================================================
 * js/ui.js — Baumenü & Interaktion (ES5 kompatibel)
 * Unten links angedockte Build-Bar, platzieren per Klick auf die Karte.
 * UI bleibt im Vordergrund (eigener DOM-Layer), Canvas zoomt unabhängig.
 * Globale Hotspots:
 *   • window.UI.selectTool(type|null)
 *   • Baumenü: HQ, Depot, Woodcutter (Beispiele)
 * ========================================================================== */
(function () {
  if (window.UI) return;

  var CSS = "" +
  "#buildBar{position:fixed;left:8px;bottom:8px;z-index:99980;display:flex;flex-wrap:wrap;gap:6px;max-width:96vw}" +
  "#buildBar button{background:#0f1b29;border:1px solid #1b2a40;color:#cfe3ff;border-radius:10px;padding:8px 10px;cursor:pointer}" +
  "#buildBar button.active{outline:2px solid #3d74ff}" +
  "#buildHint{position:fixed;left:8px;bottom:56px;color:#cfe3ff;background:#0f1d31;border:1px solid #1e2d42;border-radius:8px;padding:4px 8px;font:12px system-ui}";

  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // Build-Bar erzeugen
  var bar = document.createElement('div'); bar.id='buildBar';
  bar.innerHTML = '' +
    '<button data-tool="">(Aus)</button>' +
    '<button data-tool="hq">HQ (2x2)</button>' +
    '<button data-tool="depot">Depot (2x2)</button>' +
    '<button data-tool="woodcutter">Holzfäller (1x1)</button>';
  document.body.appendChild(bar);

  var hint = document.createElement('div'); hint.id='buildHint'; hint.textContent='Werkzeug: (Aus)';
  document.body.appendChild(hint);

  var tool = ''; // '', 'hq', 'depot', 'woodcutter'

  function selectTool(t){
    tool = t || '';
    var btns = bar.querySelectorAll('button');
    for (var i=0;i<btns.length;i++){
      var b = btns[i];
      var active = (b.dataset && b.dataset.tool === tool);
      if (b.classList && b.classList.toggle) b.classList.toggle('active', active);
    }
    hint.textContent = 'Werkzeug: ' + (tool || '(Aus)');
    try { console.log('[ui] Tool:', tool || '(Aus)'); } catch(e){}
  }

  bar.addEventListener('click', function(ev){
    var btn = ev.target && (ev.target.closest ? ev.target.closest('button') : null);
    if (!btn) {
      // Fallback ohne .closest
      var t = ev.target;
      while (t && t !== bar && !(t.tagName && t.tagName.toLowerCase()==='button')) t = t.parentNode;
      if (t && t.tagName && t.tagName.toLowerCase()==='button') btn = t;
    }
    if (!btn) return;
    selectTool((btn.dataset && btn.dataset.tool) || '');
  });

  // Platzierung per Klick auf Canvas
  var canvas = document.getElementById('stage');
  if (canvas && canvas.addEventListener) {
    canvas.addEventListener('click', function(ev){
      if (!tool) return;
      var S = window.World && window.World.state; if (!S) return;

      // Screen -> World -> Tile
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var x = (ev.clientX - rect.left) * dpr;
      var y = (ev.clientY - rect.top ) * dpr;

      // Inverse worldToScreen:
      var z = S.camera.zoom;
      var wx = (x - (canvas.width/2)) / z + S.camera.x;
      var wy = (y - (canvas.height/2)) / z + S.camera.y;

      var tx = Math.floor(wx / S.tile);
      var ty = Math.floor(wy / S.tile);

      var w=1, h=1;
      if (tool==='hq' || tool==='depot'){ w=2; h=2; }

      if (window.World && typeof window.World.placeBuilding === 'function' &&
          window.World.placeBuilding(tool, tx, ty, w, h)) {

        if (tool==='hq' && window.World && typeof window.World.addUnit === 'function') {
          var px = tx*S.tile + S.tile*0.5, py = ty*S.tile + S.tile*0.5;
          window.World.addUnit('carrier', px+S.tile*2, py, '#ff0');
        }
      } else {
        try { console.warn('[ui] Platzierung nicht möglich @', tx, ty); } catch(e){}
      }
    });
  }

  window.UI = { selectTool: selectTool };
})();
