/* ============================================================================
 * Datei    : ui/ui-place.js
 * Projekt  : Neue Siedler
 * Version  : v25.11.16-camera-std
 * Zweck    : Platziermodus-UI (DOM-Ghost mit OK/Cancel) – kompatibel zu
 *            neuem Kamera-Standard (cb:camera-change/update, req:camera:zoomAt)
 *
 * Lauscht  :
 *   - req:place:start   { buildingId }
 *   - cb:place:preview  { tx,ty,w,h,valid }     → Validität vom Core
 *   - cb:place:done                         → nach erfolgreicher Platzierung
 *   - cb:camera-change {x,y,zoom}           → Kamera A
 *   - cb:camera:update {x,y,zoom}           → Kamera B (Input nutzt das)
 *
 * Sendet   :
 *   - req:place:cursor  { tx, ty, w, h, id }
 *   - req:place:confirm { tx, ty }
 *   - req:place:cancel
 *
 * Wichtige Änderungen ggü. Altversion:
 *   ✓ Kein Zoom.js / kein cb:zoom:change mehr
 *   ✓ Tilegröße auf dem Bildschirm = Game.tileSize * cam.zoom
 *   ✓ screenToTile() rechnet mit cam.{x,y,zoom} (World-Space exakt)
 *   ✓ Re-Layout des Ghosts bei Kamera-Änderungen
 *   ✓ Entfernt: globaler cb:set-build-tool Dispatch am Dateiende (Fehltrigger)
 * ========================================================================== */
(function(){
  'use strict';

  /* ------------------------------ DOM-Grundgerüst ------------------------- */
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

  /* --------------------------------- Utils -------------------------------- */
  const emit = (name, detail={}) => window.dispatchEvent(new CustomEvent(name, { detail }));
  const LOG  = (...a)=> (window.CBLog?.ok || console.log)('[place]', ...a);

  const baseTileSize = () => (window.Game?.getTileSize ? window.Game.getTileSize() : (window.Game?.tileSize || 64));

  // Kamera-Status (World-Pixel)
  const cam = { x:0, y:0, zoom:1 };
  function onCamera(ev){
    const d = ev?.detail||{};
    if (typeof d.x==='number')    cam.x = d.x;
    if (typeof d.y==='number')    cam.y = d.y;
    if (typeof d.zoom==='number') cam.zoom = Math.max(0.1, d.zoom||1);
    // Ghost an neue Kamera anpassen (Größe & Position behalten)
    resizeSprite();
    if (active) updateSpritePositionFromTile(last.tx, last.ty);
  }
  window.addEventListener('cb:camera-change', onCamera);
  window.addEventListener('cb:camera:update', onCamera);

  // Bildschirm-Tilegröße (in CSS-px) = BasisTile * Zoom
  const tileSizePx = () => baseTileSize() * cam.zoom;

  // Hilfsrechner: Screen → Tile (berücksichtigt Kamera & Canvas-Rect)
  function screenToTile(clientX, clientY){
    const rect = $canvas?.getBoundingClientRect();
    if (!rect) return { tx:0, ty:0, sx:0, sy:0 };

    // Screen-Koords relativ zum Canvas
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;

    // Screen → World → Tile
    const worldX = (sx / cam.zoom) + cam.x;
    const worldY = (sy / cam.zoom) + cam.y;
    const tW = baseTileSize();
    const tx = Math.max(0, Math.floor(worldX / tW));
    const ty = Math.max(0, Math.floor(worldY / tW));

    // Tile-TopLeft zurück in Screen-Koords (für Ghost-Translate)
    const screenX = (tx * tW - cam.x) * cam.zoom + rect.left;
    const screenY = (ty * tW - cam.y) * cam.zoom + rect.top;

    return { tx, ty, sx: screenX, sy: screenY };
  }

  // Aus vorhandenen Tile-Koords die Screen-Position berechnen
  function updateSpritePositionFromTile(tx, ty){
    const rect = $canvas?.getBoundingClientRect();
    if (!rect) return;
    const tW = baseTileSize();
    const screenX = (tx * tW - cam.x) * cam.zoom + rect.left;
    const screenY = (ty * tW - cam.y) * cam.zoom + rect.top;
    $sprite.style.transform = `translate(${screenX}px, ${screenY}px)`;
  }

  /* --------------------------------- State -------------------------------- */
  let active = null; // { id, w, h, file }
  let last   = { tx:0, ty:0, valid:true };

  /* ------------------------------ Lifecycle -------------------------------- */
  window.addEventListener('req:place:start', (ev)=>{
    const id = ev?.detail?.buildingId;
    if (!id) return;

    const b = (typeof Registry?.get === 'function') ? Registry.get('buildings', id) : null;
    if (!b){ LOG('building not found', id); return; }

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

    LOG('start', active);
  });

  function stop(){
    $ghost.hidden = true;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('keydown',   onKeyDown);
    active = null;
  }

  /* ------------------------------ Darstellung ----------------------------- */
  function resizeSprite(){
    if (!active) return;
    const tpx = tileSizePx();
    $sprite.style.setProperty('--w', (active.w * tpx) + 'px');
    $sprite.style.setProperty('--h', (active.h * tpx) + 'px');

    // Fallbacks (falls CSS-Variablen im Theme nicht genutzt werden)
    $sprite.style.width  = (active.w * tpx) + 'px';
    $sprite.style.height = (active.h * tpx) + 'px';

    $sprite.style.backgroundImage = `url(${iconsBaseBuildings()}${active.file})`;
    $sprite.style.backgroundSize  = 'cover';
    positionButtons();
  }

  function positionButtons(){
    const tpx = tileSizePx();
    const pad = Math.round(Math.max(6, tpx * 0.08));
    $ok.style.left      = pad + 'px';
    $ok.style.bottom    = pad + 'px';
    $cancel.style.right = pad + 'px';
    $cancel.style.bottom= pad + 'px';
  }

  function iconsBaseBuildings(){
    const base = (typeof Registry?.iconsBase === 'function' ? Registry.iconsBase() : '') || 'assets/icons/buildings/';
    return base.replace(/\/?$/,'/');
  }

  function centerGhostOnScreen(){
    if (!active) return;
    const rect = $canvas?.getBoundingClientRect();
    const cssW = rect ? rect.width  : window.innerWidth;
    const cssH = rect ? rect.height : window.innerHeight;

    // Weltmittelpunkt des Canvas
    const worldCenterX = cam.x + (cssW / cam.zoom) * 0.5;
    const worldCenterY = cam.y + (cssH / cam.zoom) * 0.5;

    const tW = baseTileSize();
    const tx = Math.max(0, Math.floor(worldCenterX / tW) - Math.floor(active.w/2));
    const ty = Math.max(0, Math.floor(worldCenterY / tW) - Math.floor(active.h/2));

    last.tx = tx; last.ty = ty;
    updateSpritePositionFromTile(tx, ty);
    setTint(true);
  }

  /* ------------------------------- Input ---------------------------------- */
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

  function onKeyDown(e){
    if (e.key === 'Escape' || e.key === 'Backspace'){
      emit('req:place:cancel'); stop();
    }
    if (e.key === 'Enter'){
      confirmPlace();
    }
  }

  $ok.addEventListener('click', confirmPlace);
  $cancel.addEventListener('click', ()=>{ emit('req:place:cancel'); stop(); });

  function confirmPlace(){
    if (!active) return;
    emit('req:place:confirm', { tx: last.tx, ty: last.ty });
    // Bei Erfolg kommt cb:place:done; zur Sicherheit hier schon mal schließen:
    stop();
  }

  // Nach erfolgreicher Platzierung vom Game schließen
  window.addEventListener('cb:place:done', stop);

  /* ------------------------------ Preview-Tint ----------------------------- */
  window.addEventListener('cb:place:preview', (ev)=>{
    const d = ev?.detail||{};
    if (!active) return;
    if (typeof d.tx === 'number' && typeof d.ty === 'number'){
      last.tx = d.tx; last.ty = d.ty;
      updateSpritePositionFromTile(last.tx, last.ty);
    }
    setTint(d.valid !== false);
  });

  function setTint(valid){
    $tint.classList.toggle('is-invalid', !valid);
    $tint.classList.toggle('is-valid', !!valid);
  }
})();
