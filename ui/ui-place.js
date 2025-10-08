/* ============================================================================
 * Datei    : ui/ui-place.js
 * Projekt  : Neue Siedler
 * Version  : v24.2.0 (2025-10-08)
 * Zweck    : Platziermodus-UI (Ghost, ✅/✖️, Grün/Rot-Tint). Zentriert
 *            sichtbar starten; Maus/Touch; Canvas-Offsets; Zoom-responsiv.
 *
 * Events (listen)
 *   - req:place:start   { buildingId }
 *   - cb:zoom:change    { scale }             → Größe/Position anpassen
 *   - cb:place:preview  { tx,ty,w,h,valid }   → Validität vom Core
 *
 * Events (emit)
 *   - req:place:cursor  { tx, ty, w, h, id }  → Core kann Validität prüfen
 *   - req:place:confirm { tx, ty }            → angepasst an core/game.js
 *   - req:place:cancel
 * ========================================================================== */
(function(){
  'use strict';

  const overlay = document.createElement('div');
  overlay.className = 'place-overlay';
  document.body.appendChild(overlay);

  overlay.innerHTML = `
    <div class="place-ghost" id="place-ghost" hidden>
      <div class="ghost-sprite"><div class="ghost-tint"></div></div>
      <button class="place-btn ok" title="Bestätigen" aria-label="Bestätigen">✓</button>
      <button class="place-btn cancel" title="Abbrechen" aria-label="Abbrechen">✕</button>
    </div>
  `;

  const $ghost  = overlay.querySelector('#place-ghost');
  const $sprite = overlay.querySelector('.ghost-sprite');
  const $tint   = overlay.querySelector('.ghost-tint');
  const $ok     = overlay.querySelector('.place-btn.ok');
  const $cancel = overlay.querySelector('.place-btn.cancel');

  const $canvas = document.getElementById('game');

  function emit(name, detail={}){ window.dispatchEvent(new CustomEvent(name, { detail })); }
  const log = (...a)=> (window.CBLog?.ok || console.log)('[place]', ...a);

  function iconsBaseBuildings(){
    const base = (typeof Registry?.iconsBase === 'function' ? Registry.iconsBase() : '') || 'assets/icons/buildings/';
    return base.replace(/\/?$/,'/');
  }
  function getZoom(){ return (window.Zoom && typeof Zoom.scale === 'number') ? Zoom.scale : 1; }
  function baseTileSize(){ return window.Game?.tileSize || 32; }
  function tileSize(){ return baseTileSize() * getZoom(); }

  // Screen → Tile relativ ZUM CANVAS (nicht zum Fenster)
  function screenToTile(clientX, clientY){
    const rect = $canvas?.getBoundingClientRect();
    if (!rect) return { tx:0, ty:0, sx:0, sy:0 };
    const tpx = tileSize();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const tx = Math.max(0, Math.floor(x / tpx));
    const ty = Math.max(0, Math.floor(y / tpx));
    return { tx, ty, sx: rect.left + tx*tpx, sy: rect.top + ty*tpx };
  }

  // ---------------------------- State ---------------------------------------
  let active = null; // { id, w, h, file }
  let last   = { tx:0, ty:0, valid:true };

  // ---------------------------- Start / Stop --------------------------------
  window.addEventListener('req:place:start', (ev)=>{
    const id = ev?.detail?.buildingId;
    if (!id) return;

    const b = (typeof Registry?.get === 'function') ? Registry.get('buildings', id) : null;
    if (!b){ log('building not found', id); return; }

    const w = (b?.size?.w || b?.size?.[0] || 1);
    const h = (b?.size?.h || b?.size?.[1] || 1);
    const file = (b.icon && typeof b.icon==='string') ? b.icon : `${b.id}.png`;

    active = { id, w, h, file };
    last   = { tx:0, ty:0, valid:true };

    resizeSprite();
    centerGhostOnScreen();

    $ghost.hidden = false;
    window.addEventListener('mousemove', onMouseMove, { passive:true });
    window.addEventListener('touchmove', onTouchMove, { passive:true });
    window.addEventListener('keydown',   onKeyDown);
    window.addEventListener('cb:zoom:change', onZoomChanged);

    log('start', active);
  });

  function stop(){
    $ghost.hidden = true;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('keydown',   onKeyDown);
    window.removeEventListener('cb:zoom:change', onZoomChanged);
    active = null;
  }

  // ---------------------------- Darstellung ---------------------------------
  function resizeSprite(){
    if (!active) return;
    const tpx = tileSize();
    $sprite.style.width  = (active.w * tpx) + 'px';
    $sprite.style.height = (active.h * tpx) + 'px';
    $sprite.style.backgroundImage = `url(${iconsBaseBuildings()}${active.file})`;
    $sprite.style.backgroundSize  = 'cover';
    positionButtons();
  }

  function centerGhostOnScreen(){
    if (!active) return;
    const tpx = tileSize();
    const rect = $canvas?.getBoundingClientRect();
    const cx = (rect ? rect.left + rect.width/2 : window.innerWidth/2);
    const cy = (rect ? rect.top  + rect.height/2: window.innerHeight/2);

    // snap auf Kachel
    const tx = Math.max(0, Math.floor((cx - (rect?.left||0)) / tpx) - Math.floor(active.w/2));
    const ty = Math.max(0, Math.floor((cy - (rect?.top ||0)) / tpx) - Math.floor(active.h/2));
    const sx = (rect ? rect.left : 0) + tx*tpx;
    const sy = (rect ? rect.top  : 0) + ty*tpx;

    $sprite.style.transform = `translate(${sx}px, ${sy}px)`;
    last.tx = tx; last.ty = ty;
    setTint(true);
  }

  function positionButtons(){
    const tpx = tileSize();
    const pad = Math.round(Math.max(6, tpx * 0.08));
    $ok.style.left      = pad + 'px';
    $ok.style.bottom    = pad + 'px';
    $cancel.style.right = pad + 'px';
    $cancel.style.bottom= pad + 'px';
  }

  function onMouseMove(e){
    if (!active) return;
    const { tx, ty, sx, sy } = screenToTile(e.clientX, e.clientY);
    $sprite.style.transform = `translate(${sx}px, ${sy}px)`;
    positionButtons();
    last = { tx, ty, valid:true };
    setTint(true);
    emit('req:place:cursor', { tx, ty, w: active.w, h: active.h, id: active.id });
  }

  function onTouchMove(e){
    if (!active) return;
    const t = e.touches && e.touches[0]; if (!t) return;
    const { tx, ty, sx, sy } = screenToTile(t.clientX, t.clientY);
    $sprite.style.transform = `translate(${sx}px, ${sy}px)`;
    positionButtons();
    last = { tx, ty, valid:true };
    setTint(true);
    emit('req:place:cursor', { tx, ty, w: active.w, h: active.h, id: active.id });
  }

  function onZoomChanged(){ resizeSprite(); }

  function onKeyDown(e){
    if (e.key === 'Escape' || e.key === 'Backspace'){
      emit('req:place:cancel'); stop();
    }
    if (e.key === 'Enter'){
      confirmPlace();
    }
  }

  $ok.addEventListener('click', confirmPlace);
  $cancel.addEventListener('click', ()=>{
    emit('req:place:cancel'); stop();
  });

  function confirmPlace(){
    if (!active) return;
    emit('req:place:confirm', { tx: last.tx, ty: last.ty }); // <— an game.js angepasst
  }

  // Vorschau (rot/grün) vom Core
  window.addEventListener('cb:place:preview', (ev)=>{
    const d = ev?.detail||{};
    if (!active) return;
    if (typeof d.tx === 'number' && typeof d.ty === 'number'){
      last.tx = d.tx; last.ty = d.ty;
    }
    setTint(d.valid !== false);
  });

  function setTint(valid){
    $tint.classList.toggle('is-invalid', !valid);
    $tint.classList.toggle('is-valid', !!valid);
  }
})();
