/* ============================================================================
 * Datei    : ui/ui-place.js
 * Projekt  : Neue Siedler
 * Version  : v24.0.0 (2025-10-08)
 * Zweck    : Platziermodus-UI (Ghost, ✅/✖️, Grün/Rot-Tint). Berechnet Maus-
 *            position in Tile-Koordinaten, skaliert mit Zoom. Bestätigung
 *            lässt Serienbau aktiv; Abbrechen beendet Modus.
 *
 * Events (listen)
 *   - req:place:start  { buildingId }
 *   - cb:zoom:change   { scale }             → Größe/Position anpassen
 *   - cb:place:preview { gx,gy,w,h,valid }   → (optional) Validität aus Game
 *
 * Events (emit)
 *   - req:place:cursor { gx, gy }            → Game kann Validität prüfen
 *   - req:place:confirm{ buildingId, gx, gy }
 *   - req:place:cancel
 *
 * Hinweise
 *   - Wenn Game KEINE Vorschau liefert, wird alles als gültig (grün) angezeigt.
 *   - Gebäude-Icon wird aus Registry (iconsBase/buildings) geladen.
 * ========================================================================== */
(function(){
  'use strict';

  // -------------------------------------------------------------------------
  // [00] DOM & Utils
  // -------------------------------------------------------------------------
  const host = document.createElement('div');
  host.className = 'place-overlay';
  document.body.appendChild(host);

  host.innerHTML = `
    <div class="place-ghost" id="place-ghost" hidden>
      <div class="ghost-sprite"><div class="ghost-tint"></div></div>
      <button class="place-btn ok" title="Bestätigen" aria-label="Bestätigen">✓</button>
      <button class="place-btn cancel" title="Abbrechen" aria-label="Abbrechen">✕</button>
    </div>
  `;

  const $ghost  = host.querySelector('#place-ghost');
  const $sprite = host.querySelector('.ghost-sprite');
  const $tint   = host.querySelector('.ghost-tint');
  const $ok     = host.querySelector('.place-btn.ok');
  const $cancel = host.querySelector('.place-btn.cancel');

  function emit(name, detail={}){ window.dispatchEvent(new CustomEvent(name, { detail })); }
  const log = (...a)=> (window.CBLog?.ok || console.log)('[place]', ...a);

  function iconsBaseBuildings(){
    const base = (typeof Registry?.iconsBase === 'function' ? Registry.iconsBase() : '') || 'assets/icons/buildings/';
    return base.replace(/\/?$/,'/');
  }
  function getZoom(){ return (window.Zoom && typeof Zoom.scale === 'number') ? Zoom.scale : 1; }
  function tileSize(){ return (window.Game?.tileSize || 32) * getZoom(); }

  // -------------------------------------------------------------------------
  // [01] interner State
  // -------------------------------------------------------------------------
  let active = null;  // { id, w, h, file }
  let last   = { gx:0, gy:0, valid:true };

  // -------------------------------------------------------------------------
  // [02] Starten / Beenden
  // -------------------------------------------------------------------------
  window.addEventListener('req:place:start', (ev)=>{
    const id = ev?.detail?.buildingId;
    if (!id) return;

    // Gebäudedaten holen
    const b = (typeof Registry?.get === 'function') ? Registry.get('buildings', id) : null;
    if (!b){ log('building not found', id); return; }

    const w = b?.size?.w || 1;
    const h = b?.size?.h || 1;
    const file = (b.icon && typeof b.icon==='string') ? b.icon : `${b.id}.png`;

    active = { id, w, h, file };
    last   = { gx:0, gy:0, valid:true };

    // Sprite-Optik
    const tpx = tileSize();
    $sprite.style.width  = (w * tpx) + 'px';
    $sprite.style.height = (h * tpx) + 'px';
    $sprite.style.backgroundImage = `url(${iconsBaseBuildings()}${file})`;
    $sprite.style.backgroundSize  = 'cover';

    // Buttons positionieren (unten links/rechts am Ghost)
    positionButtons();

    // Sichtbar & Listener
    $ghost.hidden = false;
    window.addEventListener('mousemove', onMouseMove, { passive:true });
    window.addEventListener('keydown',   onKeyDown);
    window.addEventListener('cb:zoom:change', onZoomChanged);

    log('start', active);
  });

  function stop(){
    $ghost.hidden = true;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('keydown',   onKeyDown);
    window.removeEventListener('cb:zoom:change', onZoomChanged);
    active = null;
  }

  // -------------------------------------------------------------------------
  // [03] Maus / Zoom / Buttons
  // -------------------------------------------------------------------------
  function onMouseMove(e){
    if (!active) return;
    const tpx = tileSize();

    const gx = Math.max(0, Math.floor(e.clientX / tpx));
    const gy = Math.max(0, Math.floor(e.clientY / tpx));

    // Screen-Position (linke obere Ecke der Kachel)
    const sx = gx * tpx;
    const sy = gy * tpx;

    $sprite.style.transform = `translate(${sx}px, ${sy}px)`;
    positionButtons();

    // Validität standardmäßig „true“, bis Game anderes meldet
    last = { gx, gy, valid: true };
    setTint(true);

    // Game um Validität bitten (falls verfügbar)
    emit('req:place:cursor', { gx, gy, w: active.w, h: active.h, id: active.id });
  }

  function onZoomChanged(){
    if (!active) return;
    const tpx = tileSize();

    // aktuelle linke/obere Screen-Pos aus transform extrahieren (vereinfachend neu rechnen)
    const sx = last.gx * tpx;
    const sy = last.gy * tpx;

    $sprite.style.width  = (active.w * tpx) + 'px';
    $sprite.style.height = (active.h * tpx) + 'px';
    $sprite.style.transform = `translate(${sx}px, ${sy}px)`;
    positionButtons();
  }

  function onKeyDown(e){
    if (e.key === 'Escape' || e.key === 'Backspace'){
      emit('req:place:cancel');
      stop();
    }
    if (e.key === 'Enter'){
      confirmPlace();
    }
  }

  function positionButtons(){
    // Buttons relativ zum Ghost platzieren (unten links/rechts)
    const tpx = tileSize();
    const pad = Math.round(Math.max(6, tpx * 0.08));
    $ok.style.left     = pad + 'px';
    $ok.style.bottom   = pad + 'px';
    $cancel.style.right= pad + 'px';
    $cancel.style.bottom= pad + 'px';
  }

  $ok.addEventListener('click', confirmPlace);
  $cancel.addEventListener('click', ()=>{
    emit('req:place:cancel');
    stop();
  });

  function confirmPlace(){
    if (!active) return;
    // Serienbau: Modus bleibt aktiv!
    emit('req:place:confirm', { buildingId: active.id, gx: last.gx, gy: last.gy });
  }

  // -------------------------------------------------------------------------
  // [04] Vorschau/Validität (optional aus Game)
  // -------------------------------------------------------------------------
  window.addEventListener('cb:place:preview', (ev)=>{
    // Game kann hier valid:false melden → roter Tint
    const d = ev?.detail||{};
    if (!active) return;
    if (typeof d.gx === 'number' && typeof d.gy === 'number'){
      last.gx = d.gx; last.gy = d.gy;
    }
    const ok = (d.valid !== false);
    setTint(ok);
  });

  function setTint(valid){
    // nur Farbüberlagerung – das Gebäude-Sprite bleibt 1:1
    $tint.classList.toggle('is-invalid', !valid);
    $tint.classList.toggle('is-valid', !!valid);
  }

})();
