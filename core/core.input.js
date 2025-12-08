/* ============================================================================
 * Datei   : core/core.input.js
 * Projekt : Neue Siedler
 * Version : v25.12.03-workarea-integrated-phase1
 * Zweck   : Zentrale Eingabe + Platzier-Ghost + WorkArea-Click-Weiterleitung
 *
 * Lauscht : cb:set-build-tool(kind)
 *           req:place:begin({w,h})
 *           cb:camera-change({x,y,zoom})
 *
 * Sendet  : cb:hover-tile(...)
 *           cb:build:place(...)
 *
 * Erweiterungen:
 *  ✔ Ghost zeigt JE NACH Gebäude das echte Building-Icon
 *  ✔ Ghost skaliert korrekt mit Zoom
 *  ✔ OK/Cancel-Buttons skalieren mit Zoom mit
 *  ✔ Tint bleibt wie bisher (rot/grün)
 *  ✔ Voll kompatibel zu Kamera-Blockierung (__SIEDLER_PLACE_ACTIVE)
 *  ✔ Klick-Unterstützung für GameWorkArea (Arbeitsbereich setzen)
 *  ✔ Cursor-Kreuz auch bei aktiver WorkArea-Auswahl
 *
 * Phase 1 – Aufteilung in logische Blöcke:
 *   TEIL 1: Input-Basis (State, Koordinaten, Pointer/Keyboard)
 *   TEIL 2: Platzier-/Ghost-Controller (Overlay, Buttons, cb:build:place)
 *   TEIL 3: WorkArea-Integration (Weiterreichen an GameWorkArea)
 *
 *  WICHTIG: Verhält sich identisch zu v25.12.03-workarea-integrated,
 *           nur strukturierter kommentiert.
 * ========================================================================== */
(() => {
  'use strict';

  const TAG  = '[input]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log  )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn )(TAG, ...a);

  const q   = (s, r=document)=> r.querySelector(s);
  const qa  = (s, r=document)=> Array.from(r.querySelectorAll(s));
  const rect = el => el?.getBoundingClientRect?.() ?? {left:0, top:0, width:0, height:0};

  // ========================================================================
  // TEIL 1: INPUT-BASIS
  //   - Gemeinsamer State (Canvas, Kamera, aktives Build-Tool)
  //   - Koordinaten-Umrechnung (screen → tile)
  //   - Gebäude-Erkennung unter der Maus
  //   - Pointer- und Keyboard-Events
  // ========================================================================

  // ------------------------------------------------------------------------
  // 1.1 Gemeinsamer State (wird von TEIL 1 + 2 + 3 benutzt)
  // ------------------------------------------------------------------------
  let canvas   = null;           // Ziel-Canvas für Pointer-Events
  let tileSize = 64;             // Basis-Tilegröße (wird aus Game geholt)
  const cam = { x:0, y:0, zoom:1 }; // Kamera-Offset + Zoom

  let buildTool  = null;         // z. B. "b.hq", "b.lumberjack"
  let lastHover  = { tx:0, ty:0, sx:0, sy:0 }; // letzte Hover-Position
  let lastSize   = { w:3, h:3 }; // Standardgebäudegröße (Tiles)
  let hoverValid = false;        // ob lastHover eine gültige Position enthält

  // DOM-Referenzen für TEIL 2 (Platzier-/Ghost-Controller)
  let overlay, ghost, tint, btnOk, btnCancel;

  // ------------------------------------------------------------------------
  // 1.2 Koordinaten / TileSize / Gebäude-Erkennung
  // ------------------------------------------------------------------------

  function getTileSize(){
    try{
      return Number(window.Game?.tileSize) || 64;
    }catch{
      return 64;
    }
  }

  /**
   * Rechnet Bildschirmkoordinaten → Tile-Koordinaten
   * (unter Berücksichtigung von Kamera-Offset und Zoom).
   */
  function screenToTile(clientX,clientY){
    const r  = rect(canvas);
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

  // Platzhalter – hier später echte Kollisionsprüfung einbauen
  function canPlaceAt(){ return true; }

  /**
   * Sucht in Game.buildings ein vorhandenes Gebäude auf dieser Tile.
   * Wird für "Gebäude-Menü öffnen" verwendet.
   */
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

  // ------------------------------------------------------------------------
  // 1.3 Reset & Keyboard (ESC / ENTER)
  // ------------------------------------------------------------------------

  /**
   * Beendet den Platziermodus:
   *  - Build-Tool löschen
   *  - Overlay ausblenden
   *  - __SIEDLER_PLACE_ACTIVE zurücksetzen
   *  - cb:set-build-tool(kind:null) senden
   */
  function resetTool(){
    buildTool  = null;
    hoverValid = false;
    hideOverlay();

    window.__SIEDLER_PLACE_ACTIVE = false;

    try{
      if (canvas) canvas.style.cursor = 'default';
      window.dispatchEvent(
        new CustomEvent('cb:set-build-tool',{detail:{kind:null}})
      );
    }catch{}
  }

  /**
   * Zentrale Place-Funktion:
   *  - sendet cb:build:place im etablierten Format
   *  - wird von ✓-Button UND Enter-Taste genutzt
   */
  function placeAt(tx,ty,w=lastSize.w,h=lastSize.h){
    const detail = {
      __src     : 'input-v25.11.14',   // Tag für das Game-Baumodul
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

  // Keyboard-Logik (ESC/ENTER) wird in bindGlobal() registriert (s.u.).

  // ------------------------------------------------------------------------
  // 1.4 Pointer-Handling (Mouse/Touch auf der Map-Canvas)
  //   - nutzt TEIL 2 (Ghost) und TEIL 3 (WorkArea-Hook)
  // ------------------------------------------------------------------------

  function bindPointer(){
    if (!canvas) return;

    // --------------------- Hover-Bewegung ---------------------
    canvas.addEventListener('pointermove', ev=>{
      const p = screenToTile(ev.clientX, ev.clientY);
      lastHover  = p;
      hoverValid = true;

      // Cursor-Logik inkl. WorkArea-Selektionsmodus
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
      const gx   = p.sx - (p.sx % step);
      const gy   = p.sy - (p.sy % step);

      // Ghost-Position & Tint nur wenn ein Build-Tool aktiv ist
      if (buildTool){
        setGhostScreenPos(gx,gy);
        setGhostBuildable(canPlaceAt(p.tx,p.ty));
      }

      window.dispatchEvent(new CustomEvent('cb:hover-tile',{
        detail:{ tx:p.tx, ty:p.ty, screenX:p.sx, screenY:p.sy }
      }));
    },{passive:true});

    // --------------------- Klick/Tap --------------------------
    canvas.addEventListener('pointerdown', (ev)=>{
      if (ev.button != null && ev.button !== 0) return; // nur Linksklick

      const p = screenToTile(ev.clientX, ev.clientY);

      // 1) WorkArea hat Vorrang (wenn Selektionsmodus aktiv)
      if (handleWorkAreaClick(p, ev)) {
        // Klick wurde zum Verschieben des Arbeitsbereichs benutzt
        return;
      }

      // 2) Gebäude getroffen? → Gebäude-Menü öffnen
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
          window.dispatchEvent(
            new CustomEvent('cb:building:menu-open', { detail })
          );
        } catch (e) {
          console.warn('[core.input] cb:building:menu-open dispatch fehlgeschlagen', e);
        }

        // Klick wurde für das Gebäude-Menü verwendet → KEINE Platzierlogik
        ev.preventDefault?.();
        return;
      }

      // 3) Kein Gebäude getroffen → ggf. aktiven Platziermodus bedienen
      if (!buildTool) {
        // Normaler Map-Klick ohne Tool: aktuell keine Extra-Logik
        return;
      }

      // Platziermodus aktiv → Position merken (Ghost bleibt über ✓-Button steuerbar)
      if (!hoverValid) {
        lastHover  = p;
        hoverValid = true;
      }

      // WICHTIG: Es wird NICHT automatisch gebaut.
      // Bauen nur über:
      //   - ✓-Button (btnOk.onclick → placeAt)
      //   - Enter-Taste (keydown → placeAt)
      ev.preventDefault?.();
    }, { passive:false });

    // Rechtsklick → Platziermodus abbrechen
    canvas.addEventListener('contextmenu', ev=>{
      if (buildTool){
        ev.preventDefault();
        hideOverlay();
        resetTool();
      }
    });
  }

  // ------------------------------------------------------------------------
  // 1.5 Globale Events (Build-Tool setzen, Kamera, Keyboard)
  // ------------------------------------------------------------------------

  function bindGlobal(){

    // Aus dem Build-Menü: Tool aktivieren/deaktivieren
    addEventListener('cb:set-build-tool', ev=>{
      const d = ev?.detail || {};
      buildTool = d.kind ?? d.type ?? null;

      window.__SIEDLER_PLACE_ACTIVE = !!buildTool;

      if (canvas) canvas.style.cursor = buildTool ? 'crosshair' : 'default';

      if (buildTool){
        showOverlay();
        setGhostSizeTiles(lastSize.w,lastSize.h);
        updateGhostSprite();
        updateGhostButtonsScale(tileSize * cam.zoom);
      } else {
        hideOverlay();
      }
    });

    // Bau-Logik teilt uns mit, welche Standardgröße das Gebäude hat
    addEventListener('req:place:begin', ev=>{
      const d = ev?.detail || {};
      if (d.w) lastSize.w = d.w|0;
      if (d.h) lastSize.h = d.h|0;
      setGhostSizeTiles(lastSize.w,lastSize.h);
      hoverValid=false;
    });

    // Kamera-Änderungen (Panning/Zoom)
    addEventListener('cb:camera-change', ev=>{
      const d = ev?.detail || {};
      if (d.x != null)  cam.x   = d.x;
      if (d.y != null)  cam.y   = d.y;
      if (d.zoom != null) cam.zoom = d.zoom;
      updateTilePxByCamera();
    });

    // Keyboard: ESC / ENTER
    addEventListener('keydown', e=>{
      if (!buildTool) return;
      if (e.key === 'Escape'){
        hideOverlay();
        resetTool();
      }
      if (e.key === 'Enter' && hoverValid){
        placeAt(lastHover.tx,lastHover.ty);
      }
    });
  }

  // ========================================================================
  // TEIL 2: PLATZIER- / GHOST-CONTROLLER
  //   - Registry/Meta (Icons)
  //   - Ghost-Overlay (DOM, CSS-Variablen)
  //   - Buttons ✓ / ✕
  //   - sendet cb:build:place über placeAt()
  // ========================================================================

  // ------------------------------------------------------------------------
  // 2.1 Building-Meta / Icon
  // ------------------------------------------------------------------------

  function getBuildingMeta(id){
    if (!id) return null;
    let b = null;

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
    if (!meta)   return '';
    if (meta.icon) return meta.icon;

    return `assets/icons/buildings/${meta.id}.png`;
  }

  function updateGhostSprite(){
    ensureOverlay();
    if (!buildTool) {
      ghost.style.backgroundImage = '';
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

  // ------------------------------------------------------------------------
  // 2.2 Overlay & Ghost Initialisierung
  // ------------------------------------------------------------------------

  /**
   * Sorgt dafür, dass Overlay/Ghost/Buttons existieren.
   * Falls das HTML sie noch nicht enthält, werden sie einmalig erzeugt.
   */
  function ensureOverlay(){
    if (overlay && ghost && tint && btnOk && btnCancel) return;

    overlay = q('#place-overlay') || overlay;
    if (!overlay){
      overlay = document.createElement('div');
      overlay.id        = 'place-overlay';
      overlay.className = 'place-overlay';
      overlay.hidden    = true;
      document.body.appendChild(overlay);
    }

    ghost = q('#place-ghost', overlay) || q('.ghost-sprite', overlay);
    if (!ghost){
      ghost = document.createElement('div');
      ghost.id        = 'place-ghost';
      ghost.className = 'ghost-sprite';
      overlay.appendChild(ghost);
    }

    tint = q('.ghost-tint', ghost);
    if (!tint){
      tint = document.createElement('div');
      tint.className = 'ghost-tint';
      ghost.appendChild(tint);
    }

    // Buttons innen im Ghost – alte Varianten außerhalb entfernen
    qa(':scope > .place-btn', overlay).forEach(b => b.remove());

    btnOk = q('.place-btn.ok', ghost);
    if (!btnOk){
      btnOk = document.createElement('button');
      btnOk.className   = 'place-btn ok';
      btnOk.textContent = '✓';
      ghost.appendChild(btnOk);
    }

    btnCancel = q('.place-btn.cancel', ghost);
    if (!btnCancel){
      btnCancel = document.createElement('button');
      btnCancel.className   = 'place-btn cancel';
      btnCancel.textContent = '✕';
      ghost.appendChild(btnCancel);
    }

    // Button-Handler (nutzen placeAt()/resetTool aus TEIL 1)
    btnOk.onclick = () => {
      if (!buildTool || !hoverValid) {
        WARN('Bestätigen ignoriert (kein Tool oder keine gültige Position)');
        return;
      }
      placeAt(lastHover.tx, lastHover.ty);
    };
    btnCancel.onclick = () => { hideOverlay(); resetTool(); };

    updateGhostSprite();
    updateGhostButtonsScale(tileSize * cam.zoom);
  }

  function showOverlay(){
    ensureOverlay();
    overlay.hidden = false;
  }

  function hideOverlay(){
    if (overlay) overlay.hidden = true;
  }

  // ------------------------------------------------------------------------
  // 2.3 Ghost / Kamera-Sync (CSS-Variablen)
  // ------------------------------------------------------------------------

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

  // ========================================================================
  // TEIL 3: WORKAREA-INTEGRATION
  //   - Reicht Klicks im Selektionsmodus an GameWorkArea weiter.
  //   - Die eigentliche Logik (Abstand, Radius, etc.) liegt in game.workarea.js
  // ========================================================================

  /**
   * Wird aus pointerdown() aufgerufen:
   *  - Wenn GameWorkArea existiert UND isSelecting() true liefert,
   *    wird der Klick an GameWorkArea.applySelectionTile(tx,ty) weitergegeben.
   *  - Gibt true zurück, wenn das Event verbraucht wurde.
   */
  function handleWorkAreaClick(p, ev){
    if (!GameWorkArea || !GameWorkArea.isSelecting()) return false;

    ev.preventDefault();
    GameWorkArea.applySelectionTile(p.tx, p.ty);
    return true;
  }

  // ========================================================================
  // INIT: Canvas finden, Overlay vorbereiten, Events binden
  // ========================================================================

  function init(){
    canvas = document.getElementById('game')
      || document.querySelector('canvas[data-role="map"]')
      || document.querySelector('canvas');

    if (!canvas){
      WARN('Canvas #game nicht gefunden');
      return;
    }

    ensureOverlay();
    tileSize = getTileSize();
    updateTilePxByCamera();

    bindGlobal();
    bindPointer();

    window.__SIEDLER_PLACE_ACTIVE = false;
    OK('bereit v25.12.03-workarea-integrated-phase1');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }

})();
