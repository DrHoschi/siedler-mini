/* ============================================================================
 * Datei   : ui/ui-map.js
 * Projekt : Neue Siedler
 * Version : v25.11.05-min
 * Zweck   : Kleiner Map-View-Helper (Input → req:place:confirm) + Debug-Grid
 *
 * Lauscht : cb:map:loaded, cb:game:frame
 * Sendet  : req:place:confirm (bei Klick)
 * Canvas  : <canvas id="game">
 * Hinweis : Das echte Kachel-Rendering macht die Runtime (bridge + core),
 *           hier nur Sichtprüfung (schwarzer BG + fein Grid).
 * ========================================================================== */
(function(){
  'use strict';
  const log  = (...a)=> (window.CBLog?.info||console.info)('[map]', ...a);
  const warn = (...a)=> (window.CBLog?.warn||console.warn)('[map]', ...a);

  const stage = document.getElementById('game');
  if(!stage){ warn('Kein #game Canvas gefunden.'); return; }
  const ctx = stage.getContext('2d');

  // Größe an Viewport binden (einfach)
  function resize(){
    stage.width  = stage.clientWidth  || stage.offsetWidth  || 800;
    stage.height = stage.clientHeight || stage.offsetHeight || 600;
  }
  resize(); window.addEventListener('resize', resize);

  function drawGrid(){
    const w = stage.width, h = stage.height;
    ctx.fillStyle = '#0b0d12'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    const tile = (window.Game?.tileSize) || 32;
    ctx.beginPath();
    for(let x=0; x<=w; x+=tile){ ctx.moveTo(x,0); ctx.lineTo(x,h); }
    for(let y=0; y<=h; y+=tile){ ctx.moveTo(0,y); ctx.lineTo(w,y); }
    ctx.stroke();
  }

  // Minimaler Klick → Platzier-Confirm
  stage.addEventListener('pointerdown', (ev)=>{
    if (ev.button != null && ev.button !== 0) return;
    const r = stage.getBoundingClientRect();
    const tile = (window.Game?.tileSize) || 32;
    const tx = Math.floor((ev.clientX - r.left)/tile);
    const ty = Math.floor((ev.clientY - r.top)/tile);
    window.dispatchEvent(new CustomEvent('req:place:confirm', { detail:{ tx, ty } }));
  }, {passive:true});

  // Debug: wenn Map geladen → einmal loggen
  window.addEventListener('cb:map:loaded', (ev)=>{
    log('Map geladen ✓', ev.detail);
  });

  // Pro Frame: falls noch kein echter Renderer aktiv ist → Grid zeigen
  window.addEventListener('cb:game:frame', ()=>{
    drawGrid();
  });
})();
