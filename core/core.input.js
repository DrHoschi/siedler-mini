/* ============================================================================
 * Datei   : core/core.input.js
 * Projekt : Neue Siedler
 * Version : v25.12.08-workarea-integrated-v6
 * Zweck   : Eingabe + Platzier-Ghost + OK/Cancel direkt am Ghost
 *
 * Lauscht : cb:set-build-tool(kind)
 *           req:place:begin({w,h})
 *           cb:camera-change({x,y,zoom})
 *
 * Sendet  : cb:hover-tile(...)
 *           cb:build:place(...)
 *
 * WICHTIG:
 *  - Verwendet DEINE bestehenden Ghost-/Button-Elemente aus dem HTML:
 *      #place-overlay
 *      .place-ghost  /  #place-ghost
 *      .place-ghost-tint
 *      .place-ghost-ok
 *      .place-ghost-cancel
 *  - Es wird NICHTS Neues mehr erzeugt, nur Event-Handler angehängt.
 *  - Platzieren NUR über ✓ oder Enter, kein Auto-Place.
 *  - WorkArea-Clicks laufen über GameWorkArea.handleSelection.
 * ========================================================================== */
(() => {
  'use strict';

  const TAG  = '[input]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log  )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn )(TAG, ...a);

  // ------------------------------ State -------------------------------------
  let canvas   = null;
  let tileSize = 64;
  const cam = { x:0, y:0, zoom:1 };

  let buildTool  = null;
  let lastHover  = { tx:0, ty:0, sx:0, sy:0 };
  let lastSize   = { w:3, h:3 };
  let hoverValid = false;

  // ------------------------------ DOM refs ----------------------------------
  let overlay, ghost, tint, btnOk, btnCancel;

  const q    = (s, r=document)=> r.querySelector(s);
  const rect = el => el?.getBoundingClientRect?.() ?? {left:0, top:0, width:0, height:0};

  // ==========================================================================
  //  BUILDING META / ICONS
  // ==========================================================================

  function getBuildingMeta(id){
    if (!id) return null;
    let b=null;

    try{
      if (window.Registry && typeof window.Registry.get === 'function'){
        b = window.Registry.get('buildings', id);
      } else if (window.Registry?.buildings){
        b = window.Registry.buildings.find(x => x.id === id);
      }
    }catch(e){}

    return b || { id, icon:null };
  }

  function resolveBuildingIcon(meta){
    if (!meta) return '';
    if (meta.icon) return meta.icon;

    return `assets/icons/buildings/${meta.id}.png`;
  }

  function updateGhostSprite(){
    if (!ghost) return;
    if (!buildTool) {
      ghost.style.backgroundImage='';
      return;
    }

    const meta = getBuildingMeta(buildTool);
    const url  = resolveBuildingIcon(meta);

    ghost.style.backgroundImage    = `url(${url})`;
    ghost.style.backgroundRepeat   = 'no-repeat';
    ghost.style.backgroundPosition = 'center center';
    ghost.style.backgroundSize     = 'cover';
  }

  // ==========================================================================
  //  OVERLAY / GHOST
  // ==========================================================================

  /**
   * Wichtig:
   *  - Holt nur vorhandene Elemente aus dem DOM.
   *  - Erzeugt KEINE neuen Buttons / Ghosts mehr.
   */
  function ensureOverlay(){
    if (overlay && ghost && tint && btnOk && btnCancel) return;

    overlay = q('#place-overlay');
    if (!overlay){
      WARN('Overlay #place-overlay nicht gefunden – Ghost/Buttons nicht verfügbar');
      return;
    }

    ghost = q('.place-ghost', overlay) || q('#place-ghost', overlay);
    if (!ghost){
      WARN('Ghost (.place-ghost / #place-ghost) nicht gefunden');
      return;
    }

    tint = q('.place-ghost-tint', ghost);
    if (!tint){
      WARN('Tint .place-ghost-tint nicht gefunden');
    }

    btnOk = q('.place-ghost-ok', ghost);
    if (!btnOk){
      WARN('OK-Button .place-ghost-ok nicht gefunden');
    }

    btnCancel = q('.place-ghost-cancel', ghost);
    if (!btnCancel){
      WARN('Cancel-Button .place-ghost-cancel nicht gefunden');
    }

    // Event-Handler NUR EINMAL anhängen
    if (btnOk){
      btnOk.addEventListener('click', ()=>{
        if (!buildTool || !hoverValid) { WARN('✓ ignoriert (kein Tool / keine Position)'); return; }
        placeAt(lastHover.tx,lastHover.ty);
      });
    }

    if (btnCancel){
      btnCancel.addEventListener('click', ()=>{
        hideOverlay();
        resetTool();
      });
    }

    updateGhostSprite();
    updateGhostButtonsScale(tileSize * cam.zoom);
  }

  function showOverlay(){
    ensureOverlay();
    if (!overlay || !ghost) return;
    overlay.style.display = 'block';
    ghost.style.display   = 'block';
  }

  function hideOverlay(){
    if (!overlay || !ghost) return;
    overlay.style.display = 'none';
    ghost.style.display   = 'none';
  }

  function setGhostSizeTiles(w,h){
    if (!ghost) return;
    ghost.style.setProperty('--w-tiles', w);
    ghost.style.setProperty('--h-tiles', h);
  }

  function setGhostScreenPos(sx,sy){
    if (!ghost) return;
    ghost.style.setProperty('--sx', `${sx}px`);
    ghost.style.setProperty('--sy', `${sy}px`);
  }

  function setGhostBuildable(can){
    if (!tint) return;
    tint.classList.toggle('ok', !!can);
    tint.classList.toggle('bad', !can);
    if (btnOk) btnOk.disabled = !can;
  }

  function updateGhostButtonsScale(tilePx){
    if (!ghost) return;
    const scale = Math.min(1.4, Math.max(0.6, tilePx / 64));
    ghost.style.setProperty('--btnScale', `${scale}`);
  }

  function updateTilePxByCamera(){
    const tilePx = tileSize * cam.zoom;
    ghost?.style.setProperty('--tile-px', `${tilePx}px`);
    updateGhostButtonsScale(tilePx);
  }

  // ==========================================================================
  //  KOORDINATEN / BUILDINGS
  // ==========================================================================

  function getTileSize(){
    const ts =
      (window.Game?.map?.tileSize) ||
      (window.GameMap?._state?.map?.tileSize) ||
      64;
    return ts|0 || 64;
  }

  function screenToTile(clientX,clientY){
    const r = rect(canvas);
    const sx = clientX - r.left;
    const sy = clientY - r.top;

    const worldX = cam.x + (sx / cam.zoom);
    const worldY = cam.y + (sy / cam.zoom);

    let tx = Math.floor(worldX / tileSize);
    let ty = Math.floor(worldY / tileSize);

    if (tx<0) tx=0;
    if (ty<0) ty=0;

    return {tx,ty,sx,sy};
  }

  function canPlaceAt(/*tx,ty*/){
    // TODO: echte Kollisionsprüfung einbauen
    return true;
  }

  function findBuildingAt(tx, ty){
    const list = (window.Game && Array.isArray(window.Game.buildings))
      ? window.Game.buildings
      : [];

    for (const b of list){
      if (!b) continue;

      const bx = (b.x | 0);
      const by = (b.y | 0);
      const bw = (b.w | 0) || 1;
      const bh = (b.h | 0) || 1;

      const inX = tx >= bx && tx < bx + bw;
      const inY = ty >= by && ty < by + bh;

      if (inX && inY) return b;
    }
    return null;
  }

  // ==========================================================================
  //  RESET / PLACE
  // ==========================================================================

  function resetTool(){
    buildTool=null;
    hoverValid=false;
    hideOverlay();

    window.__SIEDLER_PLACE_ACTIVE=false;

    try{
      if (canvas) canvas.style.cursor='default';
      window.dispatchEvent(new CustomEvent('cb:set-build-tool',{detail:{kind:null}}));
    }catch{}
  }

  /**
   * Zentrale Place-Funktion:
   *  - sendet cb:build:place im alten Format (__src + buildingId,...)
   *  - wird von ✓-Button UND von Enter genutzt
   */
  function placeAt(tx,ty,w=lastSize.w,h=lastSize.h){
    const detail = {
      __src     : 'input-v25.11.14',
      buildingId: buildTool,
      x         : tx|0,
      y         : ty|0,
      w         : w|0,
      h         : h|0
    };
    OK('cb:build:place', detail);
    window.dispatchEvent(new CustomEvent('cb:build:place', { detail }));
    hideOverlay();
    resetTool();
  }

  // ---------------------------------------------------------------------------
  // WorkArea: Klick auf die Karte im "Arbeitsbereich setzen"-Modus
  // ---------------------------------------------------------------------------
  function handleWorkAreaClick(p, ev){
    const gw = window.GameWorkArea;
    if (!gw || typeof gw.isSelecting !== 'function' || !gw.isSelecting()) return false;

    try {
      ev.preventDefault?.();
      gw.applySelectionTile(p.tx, p.ty);
    } catch (e){
      (window.CBLog?.warn || console.warn)(
        '[input]',
        'WorkArea-Klick-Fehler',
        e
      );
    }

    return true;
  }

  // ==========================================================================
  //  POINTER HANDLING
  // ==========================================================================

  function bindPointer(){
    if (!canvas) return;

    canvas.addEventListener('pointermove', ev=>{
      const p = screenToTile(ev.clientX, ev.clientY);
      lastHover = p;
      hoverValid=true;

      // Cursor-Logik auch für WorkArea-Auswahl
      try {
        const gw = window.GameWorkArea;
        const selecting =
          gw && typeof gw.isSelecting === 'function'
            ? !!gw.isSelecting()
            : false;

        if (canvas) {
          canvas.style.cursor = (buildTool || selecting) ? 'crosshair' : 'default';
        }
      } catch(e){
        // im Zweifel Cursor nicht verändern
      }

      if (buildTool){
        const step = tileSize * cam.zoom;
        const gx = p.sx - (p.sx % step);
        const gy = p.sy - (p.sy % step);
        setGhostScreenPos(gx,gy);
        setGhostBuildable(canPlaceAt(p.tx,p.ty));
      }

      window.dispatchEvent(new CustomEvent('cb:hover-tile',{
        detail:{ tx:p.tx, ty:p.ty, screenX:p.sx, screenY:p.sy }
      }));
    },{passive:true});

    canvas.addEventListener('pointerdown', (ev)=>{
      if (ev.button != null && ev.button !== 0) return;

      const p = screenToTile(ev.clientX, ev.clientY);
      lastHover = p;
      hoverValid = true;

      // 1) WorkArea-Modus hat Vorrang
      if (handleWorkAreaClick(p, ev)) {
        return;
      }

      // 2) Prüfen, ob auf ein bestehendes Gebäude geklickt wurde
      const b = findBuildingAt(p.tx, p.ty);

      INFO('pointerdown → tile', p.tx, p.ty, 'building:', b && b.id);

      if (b) {
        const meta = getBuildingMeta(b.id);

        const detail = {
          id      : b.id,
          uid     : b.uid || null,
          x       : b.x | 0,
          y       : b.y | 0,
          w       : (b.w | 0) || 1,
          h       : (b.h | 0) || 1,
          status  : b.status  || '',
          label   : meta?.label   || b.label   || '',
          category: meta?.category|| b.category|| ''
        };

        INFO('cb:building:menu-open →', detail);

        try {
          window.dispatchEvent(new CustomEvent('cb:building:menu-open', { detail }));
        } catch (e) {
          console.warn('[core.input] cb:building:menu-open dispatch fehlgeschlagen', e);
        }

        ev.preventDefault?.();
        return;
      }

      // 3) Kein Gebäude getroffen → nur Ghost verschieben, NICHT auto-placen
      if (!buildTool) {
        return;
      }

      if (!canPlaceAt(p.tx, p.ty)){
        ev.preventDefault?.();
        WARN('Platzierung nicht erlaubt bei', p.tx, p.ty);
        setGhostBuildable(false);
        return;
      }

      const step = tileSize * cam.zoom;
      const gx = p.sx - (p.sx % step);
      const gy = p.sy - (p.sy % step);
      setGhostScreenPos(gx,gy);
      setGhostBuildable(true);

      ev.preventDefault?.();
    }, { passive:false });

    canvas.addEventListener('contextmenu', ev=>{
      if (buildTool){
        ev.preventDefault();
        hideOverlay();
        resetTool();
      }
    });
  }

  // ==========================================================================
  //  GLOBAL BINDINGS
  // ==========================================================================

  function bindGlobal(){

    addEventListener('cb:set-build-tool', ev=>{
      const d = ev?.detail||{};
      buildTool = d.kind ?? d.type ?? null;

      window.__SIEDLER_PLACE_ACTIVE = !!buildTool;

      if (canvas) canvas.style.cursor = buildTool ? 'crosshair' : 'default';

      if (buildTool){
        showOverlay();
        setGhostSizeTiles(lastSize.w,lastSize.h);
        updateGhostSprite();
        updateGhostButtonsScale(tileSize * cam.zoom);
      } else hideOverlay();
    });

    addEventListener('req:place:begin', ev=>{
      const d = ev?.detail||{};
      if (d.w) lastSize.w=d.w|0;
      if (d.h) lastSize.h=d.h|0;
      setGhostSizeTiles(lastSize.w,lastSize.h);
      hoverValid=false;
    });

    addEventListener('cb:camera-change', ev=>{
      const d = ev?.detail||{};
      if (d.x!=null) cam.x=d.x;
      if (d.y!=null) cam.y=d.y;
      if (d.zoom!=null) cam.zoom=d.zoom;
      updateTilePxByCamera();
    });

    addEventListener('keydown', e=>{
      if (!buildTool) return;
      if (e.key==='Escape'){ hideOverlay(); resetTool(); }
      if (e.key==='Enter' && hoverValid){ placeAt(lastHover.tx,lastHover.ty); }
    });
  }

  // ==========================================================================
  //  INIT
  // ==========================================================================

  function init(){
    canvas = document.getElementById('game')
      || document.querySelector('canvas[data-role="map"]')
      || document.querySelector('canvas');

    if (!canvas){ WARN('Canvas #game nicht gefunden'); return; }

    ensureOverlay();
    tileSize=getTileSize();
    updateTilePxByCamera();

    bindGlobal();
    bindPointer();

    window.__SIEDLER_PLACE_ACTIVE=false;
    OK('bereit v25.12.08-workarea-integrated-v6');
  }

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init,{once:true});
  } else init();

})();
