/* ============================================================================
 * Datei   : core/core.input.js
 * Projekt : Neue Siedler
 * Version : v25.12.03-workarea-integrated-phase2-step4
 * Zweck   : Eingabe + High-Level-Events (Ghost/Overlay liegt in game.place.js)
 *
 * Lauscht : cb:set-build-tool(kind)
 *           req:place-begin({w,h})
 *           cb:camera-change({x,y,zoom})
 *
 * Sendet  : cb:hover-tile(...)
 *           cb:build:place(...)
 *           cb:building:menu-open(...)
 *
 * Zuständigkeit:
 *  - Pointer / Keyboard einfangen
 *  - screen → tile umrechnen
 *  - Gebäude-Klick erkennen
 *  - WorkArea-Klick an GameWorkArea delegieren
 *  - Build-Platzierung via cb:build:place abfeuern
 *  - Ghost/Overlay-Steuerung an window.GamePlace delegieren
 * ========================================================================== */
(() => {
  'use strict';

  const TAG  = '[input]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log  )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn )(TAG, ...a);

  // kleine DOM-Hilfen
  const rect = el => el?.getBoundingClientRect?.() ?? {left:0, top:0, width:0, height:0};

  // ==========================================================================
  // TEIL 1: INPUT-BASIS
  // ==========================================================================

  // ------------------------------ State -------------------------------------
  let canvas   = null;
  let tileSize = 64;
  const cam = { x:0, y:0, zoom:1 };

  let buildTool  = null;
  let lastHover  = { tx:0, ty:0, sx:0, sy:0 };
  let lastSize   = { w:3, h:3 };
  let hoverValid = false;

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

  // Stub – echte Kollisionsregeln können später in eigenes Modul
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
  // 1.3 Reset & Place – bleibt hier, Ghost/Overlay in GamePlace
  // --------------------------------------------------------------------------

  function resetTool(){
    buildTool  = null;
    hoverValid = false;

    window.__SIEDLER_PLACE_ACTIVE = false;

    try{
      if (canvas) canvas.style.cursor='default';
      // Informiere Rest vom System, dass Tool deaktiviert wurde
      window.dispatchEvent(new CustomEvent('cb:set-build-tool',{detail:{kind:null}}));
    }catch{}

    // GamePlace bekommt via cb:set-build-tool(null) Bescheid und versteckt Overlay.
  }

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
    resetTool();
  }

  // --------------------------------------------------------------------------
  // 1.4 POINTER HANDLING
  // --------------------------------------------------------------------------

  function bindPointer(){
    if (!canvas) return;

    canvas.addEventListener('pointermove', ev=>{
      const p = screenToTile(ev.clientX, ev.clientY);
      lastHover = p;
      hoverValid=true;

      // Cursor-Logik inkl. WorkArea-Auswahl
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

      // Ghost/Overlay-Bewegung an GamePlace delegieren (falls vorhanden)
      if (buildTool && window.GamePlace?.onHoverTile){
        try {
          GamePlace.onHoverTile(p);
        } catch(e){
          WARN('GamePlace.onHoverTile Fehler', e);
        }
      } else {
        // Fallback: minimal – kein Ghost, aber hover-Event bleibt
        // (kannPlaceAt könnte trotzdem für Logging genutzt werden)
        canPlaceAt(p.tx,p.ty);
      }

      window.dispatchEvent(new CustomEvent('cb:hover-tile',{
        detail:{ tx:p.tx, ty:p.ty, screenX:p.sx, screenY:p.sy }
      }));
    },{passive:true});

    canvas.addEventListener('pointerdown', (ev)=>{
      if (ev.button != null && ev.button !== 0) return;

      const p = screenToTile(ev.clientX, ev.clientY);

      // 1) WorkArea-Klick?
      if (handleWorkAreaClick(p, ev)) {
        return;
      }

      // 2) Gebäude-Klick?
      const b = findBuildingAt(p.tx, p.ty);

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

        INFO('cb:building:menu-open →', detail);

        try {
          window.dispatchEvent(new CustomEvent('cb:building:menu-open', { detail }));
        } catch (e) {
          console.warn('[core.input] cb:building:menu-open dispatch fehlgeschlagen', e);
        }

        ev.preventDefault?.();
        return;
      }

      // 3) Kein Gebäude → ggf. Platziermodus
      if (!buildTool) {
        // Normaler Map-Klick ohne Tool
        return;
      }

      // Klick-Info an GamePlace weiterreichen (wenn vorhanden)
      if (window.GamePlace?.onMapClick){
        try {
          GamePlace.onMapClick(p);
        } catch(e){
          WARN('GamePlace.onMapClick Fehler', e);
        }
      } else {
        // Fallback: lastHover wenigstens updaten
        if (!hoverValid) {
          lastHover = p;
          hoverValid = true;
        }
      }

      // Bestätigen geschieht über ✓-Button (im Overlay) oder ENTER
      ev.preventDefault?.();
    }, { passive:false });

    canvas.addEventListener('contextmenu', ev=>{
      if (buildTool){
        ev.preventDefault();
        resetTool();
      }
    });
  }

  // --------------------------------------------------------------------------
  // 1.5 GLOBAL BINDINGS
  // --------------------------------------------------------------------------

  function bindGlobal(){

    addEventListener('cb:set-build-tool', ev=>{
      const d = ev?.detail||{};
      buildTool = d.kind ?? d.type ?? null;

      window.__SIEDLER_PLACE_ACTIVE = !!buildTool;

      if (canvas) canvas.style.cursor = buildTool ? 'crosshair' : 'default';

      // GamePlace über Tool-Wechsel informieren
      if (window.GamePlace?.onSetBuildTool){
        try { GamePlace.onSetBuildTool(buildTool); }
        catch(e){ WARN('GamePlace.onSetBuildTool Fehler', e); }
      }
    });

    addEventListener('req:place-begin', ev=>{
      const d = ev?.detail||{};
      if (d.w) lastSize.w=d.w|0;
      if (d.h) lastSize.h=d.h|0;
      hoverValid=false;

      // GamePlace über Place-Begin informieren
      if (window.GamePlace?.onPlaceBegin){
        try { GamePlace.onPlaceBegin({w:lastSize.w, h:lastSize.h}); }
        catch(e){ WARN('GamePlace.onPlaceBegin Fehler', e); }
      }
    });

    addEventListener('cb:camera-change', ev=>{
      const d = ev?.detail||{};
      if (d.x!=null)   cam.x   = d.x;
      if (d.y!=null)   cam.y   = d.y;
      if (d.zoom!=null)cam.zoom= d.zoom;

      // GamePlace über Kamera-Änderung informieren
      if (window.GamePlace?.onCameraChange){
        try { GamePlace.onCameraChange({x:cam.x, y:cam.y, zoom:cam.zoom}); }
        catch(e){ WARN('GamePlace.onCameraChange Fehler', e); }
      }
    });

    addEventListener('keydown', e=>{
      if (!buildTool) return;

      if (e.key==='Escape'){
        if (window.GamePlace?.onKeyEscape){
          try { GamePlace.onKeyEscape(); }
          catch(err){ WARN('GamePlace.onKeyEscape Fehler', err); }
        }
        resetTool();
      }

      if (e.key==='Enter' && hoverValid){
        if (window.GamePlace?.onKeyEnter){
          try { GamePlace.onKeyEnter(); }
          catch(err){ WARN('GamePlace.onKeyEnter Fehler', err); }
        }
        placeAt(lastHover.tx,lastHover.ty);
      }
    });
  }

  // ==========================================================================
  // TEIL 3: WORKAREA-INTEGRATION
  // ==========================================================================

  function handleWorkAreaClick(p, ev){
    if(!window.GameWorkArea || !GameWorkArea.isSelecting()) return false;

    try {
      ev.preventDefault?.();
      GameWorkArea.applySelectionTile(p.tx, p.ty);
    } catch(e){
      WARN('WorkArea-Klick-Fehler', e);
      return false;
    }
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

    tileSize=getTileSize();

    bindGlobal();
    bindPointer();

    window.__SIEDLER_PLACE_ACTIVE=false;
    OK('bereit v25.12.03-workarea-integrated-phase2-step4');
  }

  // Kleines API nach außen (für Buttons im Overlay etc.)
  window.CoreInput = {
    placeAt,
    resetTool,
    getLastHover: ()=>({...lastHover}),
    getCurrentTool: ()=>buildTool
  };

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init,{once:true});
  } else init();

})();
