/* ============================================================================
 * Datei   : ui/ui-place-overlay.js
 * Version : v25.11.14-final
 * Zweck   : Ghost-Vorschau + Bestätigen/Abbrechen für Gebäudeplatzierung
 *
 * Lauscht : req:place:start {buildingId,w,h}
 *           req:place:cancel
 *           cb:game:start (für Canvas-Ref/Tilegröße)
 * Sendet  : cb:place:preview {id,x,y,w,h}
 *           cb:place:confirm {id,x,y,w,h}
 *           cb:place:cancel  {via:'ui'|'esc'|'api'}
 * Hinweise:
 *  - Zeichnet NICHT in den Canvas, sondern ein DOM-Overlay darüber.
 *  - Snap auf Kachelraster; ESC beendet; Click bestätigt.
 *  - Kacheln werden als CSS-Grid „ghost“ gerendert.
 * ========================================================================== */
(function () {
  'use strict';

  const LOG = (...a)=>(window.CBLog?.info||console.info)('[place]', ...a);
  const EMIT=(n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}));

  let cvs=null, cvsRect=null, tile=64;
  let placing=false, cur={ id:null, w:1, h:1, gx:0, gy:0 };

  // ---------- DOM overlay ----------
  const host = document.createElement('div');
  host.id = 'place-overlay';
  host.setAttribute('aria-hidden', 'true');
  host.style.display = 'none';
  document.body.appendChild(host);

  const ghost = document.createElement('div');
  ghost.className = 'place-ghost';
  host.appendChild(ghost);

  const cta = document.createElement('div');
  cta.className = 'place-cta';
  cta.innerHTML = `
    <button type="button" class="btn btn-ok"    data-ok>✔</button>
    <button type="button" class="btn btn-cancel" data-cancel>✖</button>`;
  host.appendChild(cta);

  function refreshCanvasRect(){
    if (!cvs) cvs = document.getElementById('game');
    if (!cvs) return false;
    cvsRect = cvs.getBoundingClientRect();
    // Tilegröße bestmöglich ermitteln
    try {
      tile = (window.Game?.state?.tile?.w) || (window.Game?.state?.tileSize) || 64;
    } catch(_) {}
    return true;
  }

  function show(){ host.style.display='block'; host.setAttribute('aria-hidden','false'); }
  function hide(){ host.style.display='none'; host.setAttribute('aria-hidden','true'); }

  function updateGhost(){
    // CSS-Grid für w×h
    ghost.style.setProperty('--gw', cur.w);
    ghost.style.setProperty('--gh', cur.h);
    // Position
    const px = cvsRect.left + cur.gx * tile;
    const py = cvsRect.top  + cur.gy * tile;
    ghost.style.transform = `translate(${px}px, ${py}px)`;
    // CTA neben die Ghost
    cta.style.transform = `translate(${px + cur.w*tile + 8}px, ${py}px)`;
    EMIT('cb:place:preview', { id:cur.id, x:cur.gx, y:cur.gy, w:cur.w, h:cur.h });
  }

  function pointerToGrid(ev){
    const x = Math.floor((ev.clientX - cvsRect.left) / tile);
    const y = Math.floor((ev.clientY - cvsRect.top)  / tile);
    // Klammern auf Mapgrenzen (falls Game.state bekannt)
    const cols = window.Game?.state?.cols || 9999;
    const rows = window.Game?.state?.rows || 9999;
    cur.gx = Math.max(0, Math.min(cols - cur.w, x));
    cur.gy = Math.max(0, Math.min(rows - cur.h, y));
  }

  // ---------- Events ----------
  window.addEventListener('cb:game:start', ()=>{ refreshCanvasRect(); });

  window.addEventListener('resize', ()=>{ if(placing){ refreshCanvasRect(); updateGhost(); }});
  window.addEventListener('scroll', ()=>{ if(placing){ refreshCanvasRect(); updateGhost(); }});

  document.addEventListener('pointermove', (ev)=>{
    if (!placing || !cvsRect) return;
    pointerToGrid(ev); updateGhost();
  }, { passive:true });

  document.addEventListener('keydown', (ev)=>{
    if (!placing) return;
    if (ev.key === 'Escape'){
      placing = false; hide();
      EMIT('cb:place:cancel', { via:'esc' });
    }
  });

  cta.addEventListener('click', (ev)=>{
    if (!placing) return;
    if (ev.target.closest('[data-cancel]')) {
      placing = false; hide();
      EMIT('cb:place:cancel', { via:'ui' });
    }
    if (ev.target.closest('[data-ok]')) {
      placing = false; hide();
      EMIT('cb:place:confirm', { id:cur.id, x:cur.gx, y:cur.gy, w:cur.w, h:cur.h });
    }
  });

  // Start aus dem Build-Hook
  window.addEventListener('req:place:start', (e)=>{
    const d = e.detail||{};
    if (!refreshCanvasRect()) return;
    cur.id = d.buildingId || d.id || 'unknown';
    cur.w  = Math.max(1, d.w|0 || 1);
    cur.h  = Math.max(1, d.h|0 || 1);
    placing = true;
    show();
    updateGhost();
    LOG('start', cur.id, `${cur.w}x${cur.h}`);
  });

  window.addEventListener('req:place:cancel', ()=>{
    if (!placing) return;
    placing=false; hide();
    EMIT('cb:place:cancel', { via:'api' });
  });

  LOG('overlay bereit');
})();
