/* ============================================================================
 * Datei   : ui/ui-map.js
 * Projekt : Neue Siedler
 * Zweck   : Canvas-Renderer (quadratische Map) + Platzier-Input
 * Ereign. : lauscht auf cb:game:start, req:map:init, cb:place:preview
 *           sendet  req:place:cursor, req:place:confirm
 * Canvas  : <canvas id="game">
 * patch   : bridge for #game vs #game-canvas + data-map vs data-map-url
 * ============================================================================ */
(function(){
  'use strict';

  const log = (...a)=> (window.CBLog?.info||console.info)('[map]', ...a);
  const $c = document.getElementById('game') || document.getElementById('game-canvas');     // <canvas id="game">   // 1) Canvas finden (neu zuerst, dann alt)
  if (!$cv) { console.warn('[map] canvas#game fehlt'); return; }
  if(!$c){ log('kein Canvas gefunden (#game oder #game-canvas)'); return; }

  const ctx = $cv.getContext('2d');

  // Viewport: quadratisch in den verfügbaren Bereich einpassen
  function resizeSquare(){
    // Nimm tatsächliche Pixelgröße des Viewports
    const W = document.documentElement.clientWidth;
    const H = document.documentElement.clientHeight;
    // Platz für HUD/Dock wird via CSS frei gelassen – wir füllen einfach
    const S = Math.min(W, H);         // quadratisch
    $cv.width = S;                    // Gerätepixel
    $cv.height = S;
    $cv.style.width = S + 'px';       // CSS-Pixel (keine Skew)
    $cv.style.height = S + 'px';
  }
  addEventListener('resize', resizeSquare);

  // --- State ----------------------------------------------------------------
  let preview = { tx:-1, ty:-1, valid:false };
  const tile = Game.tileSize || 32;

  // Previews aus Game übernehmen
  addEventListener('cb:place:preview', (ev)=>{
    const { tx, ty, valid } = ev.detail || {};
    preview.tx = tx; preview.ty = ty; preview.valid = !!valid;
    draw();
  });

  // Einfacher Render (Placeholder): dunkler Hintergrund, Grid, Preview-Ghost
  function draw(){
    const w = $cv.width, h = $cv.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#181b20';
    ctx.fillRect(0,0,w,h);

    // Grid (optional dezent)
    ctx.strokeStyle = '#242933';
    ctx.lineWidth = 1;
    for (let x=0; x<=w; x+=tile) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for (let y=0; y<=h; y+=tile) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

    // Preview-Ghost
    if (preview.tx>=0 && preview.ty>=0){
      ctx.fillStyle = preview.valid ? 'rgba(60,200,120,0.35)' : 'rgba(200,60,60,0.35)';
      ctx.fillRect(preview.tx*tile, preview.ty*tile, tile, tile);
      ctx.strokeStyle = preview.valid ? 'rgba(60,200,120,0.8)' : 'rgba(200,60,60,0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(preview.tx*tile+0.5, preview.ty*tile+0.5, tile-1, tile-1);
    }
  }

  // --- Input → Platzier-Flow -------------------------------------------------
  let placing = false;    // “wir befinden uns im Platzieren”
  let currentId = null;   // nur für UI-Feedback

  // Bridge: reagiert auf deinen Start aus ui-build (siehe Patch in #2)
  addEventListener('req:place:start', (ev)=>{
    currentId = ev.detail?.buildingId || null;
    placing = !!currentId;
  });

  function clientToTile(ev){
    const rect = $cv.getBoundingClientRect();
    const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
    const cy = (ev.touches ? ev.touches[0].clientY : ev.clientY) - rect.top;
    const tx = Math.max(0, Math.floor(cx / tile));
    const ty = Math.max(0, Math.floor(cy / tile));
    return { tx, ty };
  }
  function sendCursor(ev){
    if (!placing || !currentId) return;
    const { tx, ty } = clientToTile(ev);
    dispatchEvent(new CustomEvent('req:place:cursor', { detail:{ tx, ty, id:currentId } }));
  }
  function sendConfirm(ev){
    if (!placing || !currentId) return;
    ev.preventDefault();
    const { tx, ty } = clientToTile(ev);
    dispatchEvent(new CustomEvent('req:place:confirm', { detail:{ tx, ty } }));
  }

  $cv.addEventListener('mousemove', sendCursor, { passive:true });
  $cv.addEventListener('click',     sendConfirm);
  // Touch
  $cv.addEventListener('touchmove', sendCursor,  { passive:true });
  $cv.addEventListener('touchend',  sendConfirm, { passive:false });

  // Wenn Platzieren beendet → Preview weg
  addEventListener('cb:place:done', ()=>{ placing=false; currentId=null; preview.tx=preview.ty=-1; draw(); });

  // --- Boot-Wiring -----------------------------------------------------------
  function init(){
    resizeSquare();
    draw();
  }
  addEventListener('req:map:init', init, { once:true });
  addEventListener('cb:game:start', ()=>{ init(); }, { once:true });

  // Fallback falls `req:map:init` nie kommt
  if (document.readyState !== 'loading') resizeSquare(); else addEventListener('DOMContentLoaded', resizeSquare, { once:true });

  console.log('[map] bereit');
})();
