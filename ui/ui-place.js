/* ============================================================================
 * Datei    : ui/ui-place.js
 * Projekt  : Neue Siedler
 * Version  : v24.1.0 (2025-10-08)
 * Zweck    : Platziermodus-UI (Ghost, ✅/✖️, Grün/Rot-Tint). Zentriert
 *            sichtbar starten; Maus/Touch; Canvas-Offsets; Zoom-responsiv.
 *
 * Events (listen)
 *   - req:place:start   { buildingId }
 *   - cb:zoom:change    { scale }             → Größe/Position anpassen
 *   - cb:place:preview  { gx,gy,w,h,valid }   → Validität vom Core
 *
 * Events (emit)
 *   - req:place:cursor  { gx, gy, w, h, id }  → Core kann Validität prüfen
 *   - req:place:confirm { buildingId, gx, gy }
 *   - req:place:cancel
 * ========================================================================== */
(function(){
  'use strict';

  // -------------------------------------------------------------------------
  // [00] DOM & Utils
  // -------------------------------------------------------------------------
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

  // Maus/Touch → Kachelkoordinaten relativ zum Canvas
  function screenToGrid(clientX, clientY){
    const rect = $canvas?.getBoundingClientRect();
    if (!rect) return { gx:0, gy:0 };
    const tpx = tileSize();
    const x = Math.max(0, clientX - rect.left);
    const y = Math.max(0, clientY - rect.top);
    return { gx: Math.floor(x / tpx), gy: Math.floor(y / tpx) };
  }

  // -------------------------------------------------------------------------
  // [01] State
  // -------------------------------------------------------------------------
  let active = null; // { id, w, h, file }
  let last   = { gx:0, gy:0, valid:true };

  // -------------------------------------------------------------------------
  // [02] Start / Stop
  // -------------------------------------------------------------------------
  window.addEventListener('req:place:start', (ev)=>{
    const id = ev?.detail?.buildingId;
    if (!id) return;

    // Gebäudedaten
    const b = (typeof Registry?.get === 'function') ? Registry.get('buildings', id) : null;
    if (!b){ log('building not found', id); return; }

    const w = (b?.size?.w || b?.size?.[0] || 1);
    const h = (b?.size?.h || b?.size?.[1] || 1);
    const file = (b.icon && typeof b.icon==='string') ? b.icon : `${b.id}.png`;

    active = { id, w, h, file };
    last   = { gx:0, gy:0, valid:true };

    // Sprite-Optik
    resizeSprite();

    // zentriert sichtbar starten (falls noch keine Bewegung)
    centerGhostOnScreen();

    // Sichtbar & Listener
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

  // -------------------------------------------------------------------------
  // [03] Darstellung / Position / Buttons
  // -------------------------------------------------------------------------
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
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;

    // auf Tile-Snap zur Mitte (ungefähr)
    const sx = Math.max(0, Math.floor((cx - (active.w*tpx)/2) / tpx) * tpx);
    const sy = Math.max(0, Math.floor((cy - (active.h*tpx)/2) / tpx) * tpx);

    $sprite.style.transform = `translate(${sx}px, ${sy}px)`;

    // last.gx/gy auf Basis der Canvas-Position bestimmen
    const rect = $canvas?.getBoundingClientRect();
    if (rect){
      last.gx = Math.floor((sx - rect.left) / tpx);
      last.gy = Math.floor((sy - rect.top)  / tpx);
    } else {
      last.gx = 0; last.gy = 0;
    }

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
    const { gx, gy } = screenToGrid(e.clientX, e.clientY);
    moveToGrid(gx, gy);
  }

  function onTouchMove(e){
    if (!active) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    const { gx, gy } = screenToGrid(t.clientX, t.clientY);
    moveToGrid(gx, gy);
  }

  function moveToGrid(gx, gy){
    const tpx = tileSize();
    const rect = $canvas?.getBoundingClientRect();
    const sx = (rect ? rect.left : 0) + gx * tpx;
    const sy = (rect ? rect.top  : 0) + gy * tpx;

    $sprite.style.transform = `translate(${sx}px, ${sy}px)`;
    positionButtons();

    last = { gx, gy, valid:true };
    setTint(true);

    emit('req:place:cursor', { gx, gy, w: active.w, h: active.h, id: active.id });
  }

  function onZoomChanged(){ resizeSprite(); }

  function onKeyDown(e){
    if (e.key === 'Escape' || e.key === 'Backspace'){
      emit('req:place:cancel');
      stop();
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
    // Serienbau: Modus bleibt aktiv
    emit('req:place:confirm', { buildingId: active.id, gx: last.gx, gy: last.gy });
  }

  // -------------------------------------------------------------------------
  // [04] Validitäts-Vorschau (rot/grün)
  // -------------------------------------------------------------------------
  window.addEventListener('cb:place:preview', (ev)=>{
    const d = ev?.detail||{};
    if (!active) return;
    if (typeof d.gx === 'number' && typeof d.gy === 'number'){
      last.gx = d.gx; last.gy = d.gy;
    }
    setTint(d.valid !== false);
  });

  function setTint(valid){
    $tint.classList.toggle('is-invalid', !valid);
    $tint.classList.toggle('is-valid', !!valid);
  }
})();
