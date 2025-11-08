/* ============================================================================
 * Datei   : ui/ui-place-overlay.js
 * Projekt : Neue Siedler
 * Version : v25.11.14
 * Zweck   : Platzieren-Overlay (Ghost + Confirm/Cancel) über dem #game Canvas
 *
 * Events  :
 *   Lauscht : cb:game:start, req:place:start, req:place:cancel, req:place:confirm
 *             pointermove/click auf Overlay
 *   Sendet  : cb:place:preview {x,y,valid,reason}
 *             cb:place:cancel
 *             cb:place:done   {id,x,y,w,h}
 *
 * Hinweise :
 *   – Zeichnet NICHT ins Game-Canvas, sondern in ein zweites Canvas (#place).
 *   – Skaliert/verschiebt sich automatisch auf Größe/Position von #game.
 *   – Validierung: minimal (Map-Grenzen). Später Game.canPlace(...) einklinken.
 * ========================================================================== */
(function(){
  'use strict';

  const TAG  = '[place]';
  const log  = (m,...a)=>(window.CBLog?.info||console.info)(TAG, m, ...a);
  const warn = (m,...a)=>(window.CBLog?.warn||console.warn)(TAG, m, ...a);

  // --------------------------- DOM-Hilfen -----------------------------------
  const $ = (sel,root=document)=>root.querySelector(sel);

  let overlay, ctx, ui, btnOk, btnCancel;
  let active = false;
  let placing = { id:null, w:1, h:1, tile:64, x:0, y:0, valid:false };
  let mapInfo = { cols:32, rows:32, tile:64 }; // wird bei Start normalisiert

  function ensureMount(){
    const host = document.body;

    if (!overlay){
      overlay = document.createElement('canvas');
      overlay.id = 'place';
      overlay.setAttribute('aria-hidden','true');
      overlay.className = 'place-overlay';
      host.appendChild(overlay);
      ctx = overlay.getContext('2d');
    }
    if (!ui){
      ui = document.createElement('div');
      ui.id = 'place-ui';
      ui.className = 'place-ui';
      ui.innerHTML = `
        <button class="btn btn-ok"     aria-label="Platzieren bestätigen">✅</button>
        <button class="btn btn-cancel" aria-label="Abbrechen">✖️</button>
      `;
      host.appendChild(ui);
      btnOk     = $('.btn-ok', ui);
      btnCancel = $('.btn-cancel', ui);
      btnOk.addEventListener('click', confirmPlace);
      btnCancel.addEventListener('click', cancelPlace);
    }
    resizeToGame();
  }

  // #game → Größe/Position spiegeln
  function resizeToGame(){
    const game = $('#game'); if (!game) return;
    const r = game.getBoundingClientRect();
    overlay.style.position = 'fixed';
    overlay.style.left = r.left + 'px';
    overlay.style.top  = r.top  + 'px';
    overlay.width  = Math.max(1, Math.round(r.width));
    overlay.height = Math.max(1, Math.round(r.height));
    ui.style.position = 'fixed';
    ui.style.left = (r.left + 12) + 'px';
    ui.style.top  = (r.top  + 12) + 'px';
  }
  window.addEventListener('resize', resizeToGame);
  window.addEventListener('orientationchange', resizeToGame);

  // --------------------------- Koordinaten ----------------------------------
  // Map/Tile Infos aus Game-State ableiten (fallbacks robust)
  function pullMapInfo(){
    try{
      const g = window.Game && window.Game.state || {};
      const tile = g.tileSize || 64;
      const cols = g.cols || mapInfo.cols;
      const rows = g.rows || mapInfo.rows;
      mapInfo = { cols, rows, tile };
      placing.tile = tile;
    }catch(e){}
  }

  function eventToTile(ev){
    const game = $('#game'); if (!game) return {tx:0, ty:0};
    const r = game.getBoundingClientRect();
    // Hier KEINE Kameraskalierung/Scroll nötig, weil Overlay deckungsgleich ist
    const x = Math.max(0, Math.min(r.width,  ev.clientX - r.left));
    const y = Math.max(0, Math.min(r.height, ev.clientY - r.top ));
    const tx = Math.floor(x / placing.tile);
    const ty = Math.floor(y / placing.tile);
    return { tx, ty };
  }

  // --------------------------- Zeichnen -------------------------------------
  function redraw(){
    if (!ctx) return;
    ctx.clearRect(0,0,overlay.width,overlay.height);

    if (!active) return;

    const t = placing.tile;
    // Raster leicht andeuten (nur rund um Ghost, dezent)
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#000';
    ctx.fillRect(placing.x*t, placing.y*t, placing.w*t, placing.h*t);
    ctx.restore();

    // Ghost-Rand
    ctx.save();
    ctx.lineWidth = 2;
    ctx.setLineDash([6,4]);
    ctx.strokeStyle = placing.valid ? '#14d914' : '#ff6666';
    ctx.strokeRect(placing.x*t + 1, placing.y*t + 1, placing.w*t - 2, placing.h*t - 2);
    ctx.restore();
  }

  function validity(tx,ty){
    const ok =
      tx >= 0 && ty >= 0 &&
      tx + placing.w <= mapInfo.cols &&
      ty + placing.h <= mapInfo.rows;
    return { ok, reason: ok ? null : 'Außerhalb der Karte' };
  }

  // --------------------------- Flow -----------------------------------------
  function startPlace(detail){
    ensureMount();
    pullMapInfo();
    placing.id = detail?.buildingId || detail?.id || 'unknown';
    placing.w  = detail?.w|0 || 1;
    placing.h  = detail?.h|0 || 1;
    active = true;
    overlay.classList.add('is-active');
    ui.classList.add('is-active');
    overlay.addEventListener('pointermove', onMove);
    overlay.addEventListener('click',       onClick);
    log('an', { id: placing.id, w: placing.w, h: placing.h });
    redraw();
  }

  function cancelPlace(){
    if (!active) return;
    active = false;
    overlay.classList.remove('is-active');
    ui.classList.remove('is-active');
    overlay.removeEventListener('pointermove', onMove);
    overlay.removeEventListener('click', onClick);
    window.dispatchEvent(new CustomEvent('cb:place:cancel'));
    log('aus');
    redraw();
  }

  function confirmPlace(){
    if (!active || !placing.valid) return;
    const payload = { id: placing.id, x: placing.x, y: placing.y, w: placing.w, h: placing.h };
    window.dispatchEvent(new CustomEvent('cb:place:done', { detail: payload }));
    // Übergib an Game-Logic:
    window.dispatchEvent(new CustomEvent('req:place:confirm', { detail: payload }));
    active = false;
    overlay.classList.remove('is-active');
    ui.classList.remove('is-active');
    overlay.removeEventListener('pointermove', onMove);
    overlay.removeEventListener('click', onClick);
    redraw();
  }

  function onMove(ev){
    const {tx,ty} = eventToTile(ev);
    placing.x = tx; placing.y = ty;
    const v = validity(tx,ty);
    placing.valid = v.ok;
    window.dispatchEvent(new CustomEvent('cb:place:preview', { detail: { x:tx, y:ty, valid:v.ok, reason:v.reason }}));
    redraw();
  }
  function onClick(){
    // Ein-Klick-Bedienung: Klick = Confirm (wenn gültig), sonst ignorieren
    if (placing.valid) confirmPlace();
  }

  // --------------------------- Event-Wiring ---------------------------------
  window.addEventListener('cb:game:start', resizeToGame, { once:true });
  window.addEventListener('req:place:start',   e => startPlace(e?.detail||{}));
  window.addEventListener('req:place:cancel',  cancelPlace);
  window.addEventListener('req:place:confirm', confirmPlace);

  // Sicherheits-Init
  ensureMount();
})();
