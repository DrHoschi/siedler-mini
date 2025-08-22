/* ============================================================================
 * js/ui.js — Baumenü & Interaktion
 * Unten links angedockte Build-Bar, platzieren per Klick auf die Karte.
 * UI bleibt im Vordergrund (eigener DOM-Layer), Canvas zoomt unabhängig.
 * Globale Hotspots:
 *   • window.UI.selectTool(type|null)
 *   • Baumenü: HQ, Depot, Woodcutter (Beispiele)
 * ========================================================================== */
(() => {
  if (window.UI) return;

  const CSS = `
  #buildBar{position:fixed;left:8px;bottom:8px;z-index:99980;display:flex;flex-wrap:wrap;gap:6px;max-width:96vw}
  #buildBar button{background:#0f1b29;border:1px solid #1b2a40;color:#cfe3ff;border-radius:10px;padding:8px 10px;cursor:pointer}
  #buildBar button.active{outline:2px solid #3d74ff}
  #buildHint{position:fixed;left:8px;bottom:56px;color:#cfe3ff;background:#0f1d31;border:1px solid #1e2d42;border-radius:8px;padding:4px 8px;font:12px system-ui}
  `;
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);

  // Build-Bar erzeugen
  const bar = document.createElement('div'); bar.id='buildBar';
  bar.innerHTML = `
    <button data-tool="">(Aus)</button>
    <button data-tool="hq">HQ (2x2)</button>
    <button data-tool="depot">Depot (2x2)</button>
    <button data-tool="woodcutter">Holzfäller (1x1)</button>
  `;
  document.body.appendChild(bar);

  const hint = document.createElement('div'); hint.id='buildHint'; hint.textContent='Werkzeug: (Aus)';
  document.body.appendChild(hint);

  let tool = ''; // '', 'hq', 'depot', 'woodcutter'

  function selectTool(t){
    tool = t || '';
    bar.querySelectorAll('button').forEach(b=>b.classList.toggle('active', b.dataset.tool===tool));
    hint.textContent = 'Werkzeug: ' + (tool || '(Aus)');
    console.log('[ui] Tool:', tool || '(Aus)');
  }

  bar.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('button'); if (!btn) return;
    selectTool(btn.dataset.tool || '');
  });

  // Platzierung per Klick auf Canvas
  const canvas = document.getElementById('stage');
  canvas?.addEventListener('click', (ev)=>{
    if (!tool) return;
    const S = window.World?.state; if (!S) return;

    // Screen -> World -> Tile
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (window.devicePixelRatio||1);
    const y = (ev.clientY - rect.top ) * (window.devicePixelRatio||1);

    // Inverse worldToScreen:
    const z = S.camera.zoom;
    const wx = (x - (canvas.width/2)) / z + S.camera.x;
    const wy = (y - (canvas.height/2)) / z + S.camera.y;

    const tx = Math.floor(wx / S.tile);
    const ty = Math.floor(wy / S.tile);

    let w=1, h=1;
    if (tool==='hq' || tool==='depot'){ w=2; h=2; }

    if (window.World.placeBuilding(tool, tx, ty, w, h)) {
      // Option: bei HQ gleich ein Worker‑Pünktchen daneben spawnen
      if (tool==='hq') {
        const px = tx*S.tile + S.tile*0.5, py = ty*S.tile + S.tile*0.5;
        window.World.addUnit('carrier', px+S.tile*2, py, '#ff0');
      }
    } else {
      console.warn('[ui] Platzierung nicht möglich @', tx, ty);
    }
  });

  window.UI = { selectTool };
})();
