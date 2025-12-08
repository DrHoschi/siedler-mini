/* ============================================================================
 * Datei   : core/game.place.js
 * Projekt : Neue Siedler
 * Version : v25.12.08-place-controller-step3
 * Zweck   : Platzier-/Ghost-Controller (erste echte Logik)
 *
 * In diesem Schritt:
 *  - GamePlace bekommt alle Infos vom Input:
 *      onSetBuildTool, onPlaceBegin, onCameraChange,
 *      onHoverTile, onMapClick, onKeyEnter, onKeyEscape
 *  - GamePlace kümmert sich bereits um die GHOST-POSITION + Tint:
 *      → sx/sy setzen (CSS-Variablen)
 *      → is-valid / is-invalid Klasse + OK-Button enabled/disabled
 *
 * WICHTIG:
 *  - Overlay / Ghost / Buttons werden weiterhin von core.input.js angelegt.
 *    Wir greifen nur auf bestehende DOM-Elemente zu (KEIN neues HTML).
 *  - Bauen (cb:build:place) übernimmt vorerst weiter core.input.js.
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[place]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log  )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn )(TAG, ...a);

  // ==========================================================================
  // Interner State
  // ==========================================================================

  let currentTool = null;             // z.B. 'b.hq'
  let lastHover   = { tx:0, ty:0, sx:0, sy:0 };
  let lastSize    = { w:3, h:3 };
  let cam         = { x:0, y:0, zoom:1 };
  let tileSize    = 64;

  // DOM-Referenzen – werden NICHT erzeugt, nur aus bestehendem HTML geholt
  let overlay = null;
  let ghost   = null;
  let tint    = null;
  let btnOk   = null;

  // ==========================================================================
  // Hilfen: DOM & TileSize
  // ==========================================================================

  function ensureDom(){
    if (overlay && ghost && tint && btnOk) return;

    overlay = document.querySelector('#place-overlay');
    if (!overlay){
      WARN('ensureDom: #place-overlay nicht gefunden (Overlay noch nicht initialisiert?)');
      return;
    }

    ghost =
      overlay.querySelector('#place-ghost') ||
      overlay.querySelector('.ghost-sprite');
    if (!ghost){
      WARN('ensureDom: #place-ghost / .ghost-sprite nicht gefunden');
      return;
    }

    tint = ghost.querySelector('.ghost-tint');
    if (!tint){
      WARN('ensureDom: .ghost-tint nicht gefunden');
      // kein harter Fehler – wir können den Ghost auch ohne Tint bewegen
    }

    btnOk = ghost.querySelector('.place-btn.ok');
    // btnOk ist optional – wenn nicht da, können wir halt disable nicht setzen
  }

  function ensureTileSize(){
    try{
      const ts = Number(window.Game?.tileSize) || 64;
      tileSize = ts|0 || 64;
    }catch{
      tileSize = 64;
    }
  }

  function updateTileScale(){
    ensureDom();
    if (!overlay) return;

    const tilePx = tileSize * (cam.zoom || 1);
    overlay.style.setProperty('--tilePx', `${tilePx}px`);
  }

  // ==========================================================================
  // Hilfen: Ghost steuern (Position + Buildable-Tint)
  // ==========================================================================

  function setGhostScreenPos(sx, sy){
    ensureDom();
    if (!ghost) return;
    ghost.style.setProperty('--sx', `${sx}px`);
    ghost.style.setProperty('--sy', `${sy}px`);
  }

  function setGhostBuildable(can){
    ensureDom();
    if (tint){
      tint.classList.toggle('is-valid',  !!can);
      tint.classList.toggle('is-invalid', !can);
    }
    if (btnOk){
      btnOk.disabled = !can;
    }
  }

  function snapToGrid(p){
    ensureTileSize();
    const step = tileSize * (cam.zoom || 1);

    const gx = p.sx - (p.sx % step);
    const gy = p.sy - (p.sy % step);

    return { gx, gy };
  }

  // ==========================================================================
  // Externes API – wird von core.input.js aufgerufen
  // ==========================================================================

  const GamePlace = {

    /**
     * Build-Tool wurde gesetzt oder gelöscht.
     * kind: string oder null (z.B. 'b.hq', 'b.lumberjack', null)
     *
     * In diesem Schritt:
     *  - Wir merken uns nur das Tool.
     *  - Overlay anzeigen/ausblenden macht weiterhin core.input.js.
     */
    onSetBuildTool(kind){
      currentTool = kind || null;
      INFO('onSetBuildTool', currentTool);
    },

    /**
     * req:place:begin({w,h}) – Standardgebäudegröße.
     */
    onPlaceBegin(cfg){
      if (!cfg) return;
      if (typeof cfg.w === 'number') lastSize.w = cfg.w|0;
      if (typeof cfg.h === 'number') lastSize.h = cfg.h|0;
      INFO('onPlaceBegin', lastSize);
    },

    /**
     * cb:camera-change({x,y,zoom}) – für Zoom-basiertes Scaling.
     */
    onCameraChange(camState){
      if (!camState) return;
      cam.x    = camState.x    ?? cam.x;
      cam.y    = camState.y    ?? cam.y;
      cam.zoom = camState.zoom ?? cam.zoom;
      INFO('onCameraChange', cam);
      updateTileScale();
    },

    /**
     * Hover über die Map im Platziermodus.
     * p: {tx,ty,sx,sy}
     *
     * Aufgabe:
     *  - Ghost auf Tile-Raster schnappen (sx/sy → gx/gy)
     *  - Valid-Tint setzen (aktuell: immer gültig, wie im Input)
     */
    onHoverTile(p){
      if (!p) return;
      lastHover = p;

      if (!currentTool) return; // kein aktives Build-Tool → Ghost interessiert uns nicht

      const { gx, gy } = snapToGrid(p);
      setGhostScreenPos(gx, gy);

      // Später: echte Kollisionsprüfung; aktuell wie vorher: immer gültig
      setGhostBuildable(true);
    },

    /**
     * Klick auf freie Map im Platziermodus.
     * p: {tx,ty,sx,sy}
     *
     * Aufgabe in diesem Schritt:
     *  - Sicherstellen, dass ein TAP ohne vorherige Bewegung den Ghost
     *    ebenfalls auf diese Tile setzt.
     */
    onMapClick(p){
      if (!p) return;
      lastHover = p;

      if (!currentTool) return;

      const { gx, gy } = snapToGrid(p);
      setGhostScreenPos(gx, gy);
      setGhostBuildable(true);

      INFO('onMapClick (Ghost reposition)', p);
      // Bauen selbst passiert weiterhin über:
      //  - ✓-Button in core.input.js (placeAt)
      //  - Enter-Taste → placeAt in core.input.js
    },

    /**
     * ENTER im Platziermodus.
     * In einem späteren Schritt können wir hier zentral placen.
     */
    onKeyEnter(){
      INFO('onKeyEnter');
      // aktuell: core.input.js ruft weiterhin placeAt(lastHover.tx, lastHover.ty)
    },

    /**
     * ESC im Platziermodus.
     * Später können wir hier Ghost/Overlay schließen, Tool resetten usw.
     */
    onKeyEscape(){
      INFO('onKeyEscape');
      // aktuell: core.input.js macht noch resetTool() + hideOverlay().
    }
  };

  // Global verfügbar machen
  window.GamePlace = GamePlace;

  OK('bereit v25.12.08-place-controller-step3');

})();
