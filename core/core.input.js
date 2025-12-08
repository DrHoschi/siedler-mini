/* ============================================================================
 * Datei   : core/core.input.js
 * Projekt : Neue Siedler
 * Version : v25.12.03-workarea-integrated-phase2-step2
 * Zweck   : Eingabe + Platzier-Ghost + OK/Cancel direkt am Ghost
 *
 * Lauscht : cb:set-build-tool(kind)
 *           req:place-begin({w,h})
 *           cb:camera-change({x,y,zoom})
 *
 * Sendet  : cb:hover-tile(...)
 *           cb:build:place(...)
 *
 * Erweiterungen in dieser Final-Version:
 *  ✔ Ghost zeigt JE NACH Gebäude das echte Building-Icon
 *  ✔ Ghost skaliert korrekt mit Zoom
 *  ✔ OK/Cancel-Buttons skalieren mit Zoom mit
 *  ✔ Tint bleibt wie bisher (rot/grün)
 *  ✔ Voll kompatibel zu Kamera-Blockierung (__SIEDLER_PLACE_ACTIVE)
 *  ✔ Klick-Unterstützung für GameWorkArea (Arbeitsbereich setzen)
 *  ✔ Cursor-Kreuz auch bei aktiver WorkArea-Auswahl
 *
 * Phase 2 – Schritt 2:
 *  - Wie Step1, aber:
 *    → ruft zusätzlich window.GamePlace.* auf (falls vorhanden):
 *       onSetBuildTool, onPlaceBegin, onCameraChange,
 *       onHoverTile, onMapClick, onKeyEnter, onKeyEscape
 *  - Alte Ghost-/Place-Logik bleibt vollständig aktiv (Fallback).
 * ========================================================================== */
(() => {
  'use strict';

  const TAG  = '[input]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log  )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn )(TAG, ...a);

  // kleine DOM-Hilfen
  const q   = (s, r=document)=> r.querySelector(s);
  const qa  = (s, r=document)=> Array.from(r.querySelectorAll(s));
  const rect = el => el?.getBoundingClientRect?.() ?? {left:0, top:0, width:0, height:0};

  // ==========================================================================
  // TEIL 1: INPUT-BASIS
  //   - State (Canvas, Kamera, aktives Build-Tool)
  //   - Koordinaten-Umrechnung (screen → tile)
  //   - Pointer/Keyboard-Handling
  //   - Gebäude unter der Maus finden
  // ==========================================================================

  // ------------------------------ State -------------------------------------
  let canvas   = null;
  let tileSize = 64;
  const cam = { x:0, y:0, zoom:1 };

  let buildTool  = null;
  let lastHover  = { tx:0, ty:0, sx:0, sy:0 };
  let lastSize   = { w:3, h:3 };
  let hoverValid = false;

  // ------------------------------ DOM refs (für TEIL 2) ---------------------
  let overlay, ghost, tint, btnOk, btnCancel;

  // --------------------------------------------------------------------------
  // 1.1 Koordinaten & TileSize
  // --------------------------------------------------------------------------

  function getTileSize(){
    try{return Number(window.Game?.tileSize)||64;}catch{return 64;}
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

  function canPlaceAt(){ return true; }

  // --------------------------------------------------------------------------
  // 1.2 Gebäude an der aktuellen Tile finden (für Klick aufs Gebäude)
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // 1.3 Reset & Place – aktuell noch hier, später nach GamePlace
  // --------------------------------------------------------------------------

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

  function placeAt(tx,ty,w=lastSize.w,h=lastSize.h){
    const detail = {
      // WICHTIG: alter Tag, den dein Game-Listener akzeptiert
      __src: 'input-v25.11.14',
      buildingId: buildTool,
      x: tx|0,
      y: ty|0,
      w: w|0,
      h: h|0
    };
    OK('cb:build:place', detail);
    window.dispatchEvent(new CustomEvent('cb:build:place', { detail }));
    hideOverlay();
    resetTool();
  }

  // --------------------------------------------------------------------------
  // 1.4 POINTER HANDLING
  //   - nutzt TEIL 2 (Ghost) & TEIL 3 (WorkArea-Hook)
  // --------------------------------------------------------------------------

  function bindPointer(){
    if (!canvas) return;

    canvas.addEventListener('pointermove', ev=>{
      const p = screenToTile(ev.clientX, ev.clientY);
      lastHover = p;
      hoverValid=true;

      // NEU: Cursor-Logik auch für WorkArea-Auswahl
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
        // Wenn irgendwas schiefgeht, Cursor lieber nicht verändern
      }

      const step = tileSize * cam.zoom;
      const gx = p.sx - (p.sx % step);
      const gy = p.sy - (p.sy % step);

      // NEU: Info auch an GamePlace weiterreichen (wenn vorhanden)
      if (buildTool && window.GamePlace?.onHoverTile){
        try { GamePlace.onHoverTile(p); } catch(e){ WARN('GamePlace.onHoverTile Fehler', e); }
      }

      // Bestehende Ghost-Logik bleibt aktiv (Fallback)
      setGhostScreenPos(gx,gy);
      setGhostBuildable(canPlaceAt(p.tx,p.ty));

      window.dispatchEvent(new CustomEvent('cb:hover-tile',{
        detail:{ tx:p.tx, ty:p.ty, screenX:p.sx, screenY:p.sy }
      }));
    },{passive:true});

    canvas.addEventListener('pointerdown', (ev)=>{
      if (ev.button != null && ev.button !== 0) return;

      // ZUERST: Prüfen, ob gerade ein Arbeitsbereich gesetzt werden soll
      const p = screenToTile(ev.clientX, ev.clientY);

      if (handleWorkAreaClick(p, ev)) {
        // Klick wurde zum Verschieben des Arbeitsbereichs benutzt
        return;
      }

      // Danach: prüfen, ob auf ein bestehendes Gebäude geklickt wurde
      const b = findBuildingAt(p.tx, p.ty);

      // 🔍 Debug:
      INFO('pointerdown → tile', p.tx, p.ty, 'building:', b && b.id);

      if (b) {
        const detail = {
          id      : b.id,
          uid     : b.uid || null,
          x       : b.x | 0,
          y       : b.y | 0,
          w       : (b.w | 0) || 1,
          h       : (b.h | 0) || 1,
          status  : b.status  || '',
          label   : b.label   || '',
          category: b.category|| ''
        };

        INFO('cb:building:menu-open →', detail);  // 🔍 Debug

        try {
          window.dispatchEvent(new CustomEvent('cb:building:menu-open', { detail }));
        } catch (e) {
          console.warn('[core.input] cb:building:menu-open dispatch fehlgeschlagen', e);
        }

        // Klick wurde für das Gebäude-Menü verwendet → Platzier-Logik NICHT ausführen
        ev.preventDefault?.();
        return;
      }

      // ----------------------------------------------------
      // Kein Gebäude getroffen → ggf. Platziermodus bedienen
      // ----------------------------------------------------
      if (!buildTool) {
        // Normaler Map-Klick ohne Tool: aktuell keine Extra-Logik
        return;
      }

      // NEU: Klick-Info an GamePlace weiterreichen (wenn vorhanden)
      if (window.GamePlace?.onMapClick){
        try { GamePlace.onMapClick(p); } catch(e){ WARN('GamePlace.onMapClick Fehler', e); }
      }

      // Platziermodus aktiv → Position merken (Ghost bleibt über ✓-Button steuerbar)
      if (!hoverValid) {
        lastHover = p;
        hoverValid = true;
      }

      // Bestätigen geschieht NUR über ✓-Button (kein Auto-Place hier)
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

  // --------------------------------------------------------------------------
  // 1.5 GLOBAL BINDINGS (cb:set-build-tool, req:place:begin, Kamera, Keyboard)
  // --------------------------------------------------------------------------

  function bindGlobal(){

    addEventListener('cb:set-build-tool', ev=>{
      const d = ev?.detail||{};
      buildTool = d.kind ?? d.type ?? null;

      window.__SIEDLER_PLACE_ACTIVE = !!buildTool;

      if (canvas) canvas.style.cursor = buildTool ? 'crosshair' : 'default';

      // NEU: GamePlace über Tool-Wechsel informieren
      if (window.GamePlace?.onSetBuildTool){
        try { GamePlace.onSetBuildTool(buildTool); } catch(e){ WARN('GamePlace.onSetBuildTool Fehler', e); }
      }

      // Bestehende Overlay-Logik bleibt aktiv
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

      // NEU: GamePlace über Place-Begin informieren
      if (window.GamePlace?.onPlaceBegin){
        try { GamePlace.onPlaceBegin({w:lastSize.w, h:lastSize.h}); } catch(e){ WARN('GamePlace.onPlaceBegin Fehler', e); }
      }
    });

    addEventListener('cb:camera-change', ev=>{
      const d = ev?.detail||{};
      if (d.x!=null) cam.x=d.x;
      if (d.y!=null) cam.y=d.y;
      if (d.zoom!=null) cam.zoom=d.zoom;
      updateTilePxByCamera();

      // NEU: GamePlace über Kamera-Änderung informieren
      if (window.GamePlace?.onCameraChange){
        try { GamePlace.onCameraChange({x:cam.x, y:cam.y, zoom:cam.zoom}); } catch(e){ WARN('GamePlace.onCameraChange Fehler', e); }
      }
    });

    addEventListener('keydown', e=>{
      if (!buildTool) return;

      if (e.key==='Escape'){
        // NEU: GamePlace über ESC informieren
        if (window.GamePlace?.onKeyEscape){
          try { GamePlace.onKeyEscape(); } catch(err){ WARN('GamePlace.onKeyEscape Fehler', err); }
        }
        hideOverlay();
        resetTool();
      }

      if (e.key==='Enter' && hoverValid){
        // NEU: GamePlace über Enter informieren
        if (window.GamePlace?.onKeyEnter){
          try { GamePlace.onKeyEnter(); } catch(err){ WARN('GamePlace.onKeyEnter Fehler', err); }
        }
        // Bestehende Logik: direkt platzieren
        placeAt(lastHover.tx,lastHover.ty);
      }
    });
  }

  // ==========================================================================
  // TEIL 2: PLATZIER- / GHOST-CONTROLLER
  //   - Registry/Meta (Icons)
  //   - Overlay/Ghost (DOM, CSS)
  //   - OK/Cancel-Buttons
  //   - benutzt placeAt()/resetTool aus TEIL 1
  //   - wird später nach core/game.place.js verschoben
  // ==========================================================================

  // BUILDING META / ICONS ----------------------------------------------------

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
    ensureOverlay();
    if (!buildTool) {
      ghost.style.backgroundImage='';
      return;
    }

    const meta = getBuildingMeta(buildTool);
    const url  = resolveBuildingIcon(meta);

    ghost.style.backgroundImage    = `url(${url})`;
    ghost.style.backgroundRepeat   = 'no-repeat';
    ghost.style.backgroundPosition = 'center center';
    ghost.style.backgroundSize     = 'cover'; // Gebäude vollflächig im Ghost
  }

  function updateGhostButtonsScale(tilePx){
    if (!btnOk || !btnCancel) return;

    const size = Math.max(24, Math.min(72, tilePx * 0.6));
    const font = Math.round(size * 0.45);

    [btnOk, btnCancel].forEach(btn => {
      btn.style.width      = size+'px';
      btn.style.height     = size+'px';
      btn.style.minWidth   = size+'px';
      btn.style.minHeight  = size+'px';
      btn.style.fontSize   = font+'px';
      btn.style.lineHeight = size+'px';
    });
  }

  // OVERLAY & GHOST INITIALISIERUNG -----------------------------------------

  function ensureOverlay(){
    if (overlay && ghost && tint && btnOk && btnCancel) return;

    overlay = q('#place-overlay') || overlay;
    if (!overlay){
      overlay = document.createElement('div');
      overlay.id='place-overlay';
      overlay.className='place-overlay';
      overlay.hidden=true;
      document.body.appendChild(overlay);
    }

    ghost = q('#place-ghost', overlay) || q('.ghost-sprite', overlay);
    if (!ghost){
      ghost=document.createElement('div');
      ghost.id='place-ghost';
      ghost.className='ghost-sprite';
      overlay.appendChild(ghost);
    }

    tint = q('.ghost-tint', ghost);
    if (!tint){
      tint = document.createElement('div');
      tint.className='ghost-tint';
      ghost.appendChild(tint);
    }

    // Buttons innen im Ghost
    qa(':scope > .place-btn', overlay).forEach(b=>b.remove());

    btnOk = q('.place-btn.ok', ghost);
    if (!btnOk){
      btnOk=document.createElement('button');
      btnOk.className='place-btn ok';
      btnOk.textContent='✓';
      ghost.appendChild(btnOk);
    }

    btnCancel = q('.place-btn.cancel', ghost);
    if (!btnCancel){
      btnCancel=document.createElement('button');
      btnCancel.className='place-btn cancel';
      btnCancel.textContent='✕';
      ghost.appendChild(btnCancel);
    }

    // Button-Handler
    btnOk.onclick = () => {
      if (!buildTool || !hoverValid) { WARN('Bestätigen ignoriert'); return; }
      placeAt(lastHover.tx, lastHover.ty);
    };
    btnCancel.onclick = () => { hideOverlay(); resetTool(); };

    updateGhostSprite();
    updateGhostButtonsScale(tileSize * cam.zoom);
  }

  function showOverlay(){ ensureOverlay(); overlay.hidden=false; }
  function hideOverlay(){ if (overlay) overlay.hidden=true; }

  // GHOST / CAMERA-SYNC ------------------------------------------------------

  function setGhostSizeTiles(w,h){
    ensureOverlay();
    ghost.style.setProperty('--wTiles', `${w}`);
    ghost.style.setProperty('--hTiles', `${h}`);
  }

  function setGhostScreenPos(sx,sy){
    ensureOverlay();
    ghost.style.setProperty('--sx', `${sx}px`);
    ghost.style.setProperty('--sy', `${sy}px`);
  }

  function setGhostBuildable(can){
    tint.classList.toggle('is-valid', !!can);
    tint.classList.toggle('is-invalid', !can);
    btnOk.disabled = !can;
  }

  function updateTilePxByCamera(){
    const tilePx = tileSize * cam.zoom;
    (overlay||document.documentElement)
      .style.setProperty('--tilePx', `${tilePx}px`);
    updateGhostButtonsScale(tilePx);
  }

  // ==========================================================================
  // TEIL 3: WORKAREA-INTEGRATION
  //   - Input → GameWorkArea weiterreichen, wenn Selektionsmodus aktiv
  // ==========================================================================

  function handleWorkAreaClick(p, ev){
    if(!GameWorkArea || !GameWorkArea.isSelecting()) return false;

    ev.preventDefault();
    GameWorkArea.applySelectionTile(p.tx, p.ty);
    return true;
  }

  // ==========================================================================
  // INIT
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
    OK('bereit v25.12.03-workarea-integrated-phase2-step2');
  }

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init,{once:true});
  } else init();

})();
