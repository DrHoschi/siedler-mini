/* ============================================================================
 * Datei   : core/game.place.js
 * Projekt : Neue Siedler
 * Version : v25.12.08-place-controller-step5
 * Zweck   : Platzier-/Ghost-Controller (Overlay, Buttons, Icons, Scaling)
 *
 * Lauscht (indirekt, via core.input.js):
 *  - GamePlace.onSetBuildTool(kind)
 *  - GamePlace.onPlaceBegin({w,h})
 *  - GamePlace.onCameraChange({x,y,zoom})
 *  - GamePlace.onHoverTile({tx,ty,sx,sy})
 *  - GamePlace.onMapClick({tx,ty,sx,sy})
 *  - GamePlace.onKeyEnter()
 *  - GamePlace.onKeyEscape()
 *
 * Nutzt:
 *  - window.CoreInput.placeAt(tx,ty,w,h)
 *  - window.CoreInput.resetTool()
 *  - Registry.get('buildings', id) / Registry.buildings
 *
 * NEU in step5:
 *  - canPlaceAt(tx,ty) nutzt optional Game.canPlaceBuildingAt(kind, tx, ty, w, h)
 *    → zentrale Platzier-Regeln im Game-Modul möglich
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[place]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log  )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn )(TAG, ...a);

  // ==========================================================================
  // State
  // ==========================================================================

  let currentTool = null;             // z.B. 'b.hq'
  let lastHover   = { tx:0, ty:0, sx:0, sy:0 };
  let lastSize    = { w:3, h:3 };
  let cam         = { x:0, y:0, zoom:1 };
  let tileSize    = 64;

  // Overlay / Ghost / Buttons
  let overlay   = null;
  let ghost     = null;
  let tint      = null;
  let btnOk     = null;
  let btnCancel = null;

  // ==========================================================================
  // Hilfen: TileSize & Kamera
  // ==========================================================================

  function ensureTileSize(){
    try{
      const ts = Number(window.Game?.tileSize) || 64;
      tileSize = ts|0 || 64;
    }catch{
      tileSize = 64;
    }
  }

  function updateTileScale(){
    ensureTileSize();
    if (!overlay) return;
    const tilePx = tileSize * (cam.zoom || 1);
    overlay.style.setProperty('--tilePx', `${tilePx}px`);
    updateGhostButtonsScale(tilePx);
  }

  // ==========================================================================
  // Hilfen: Registry / Building-Meta
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

  // ==========================================================================
  // Overlay / Ghost / Buttons – DOM erzeugen + steuern
  // ==========================================================================

  function ensureOverlay(){
    if (overlay && ghost && tint && btnOk && btnCancel) return;

    overlay = document.querySelector('#place-overlay') || overlay;
    if (!overlay){
      overlay = document.createElement('div');
      overlay.id='place-overlay';
      overlay.className='place-overlay';
      overlay.hidden=true;
      document.body.appendChild(overlay);
    }

    ghost = overlay.querySelector('#place-ghost') || overlay.querySelector('.ghost-sprite');
    if (!ghost){
      ghost=document.createElement('div');
      ghost.id='place-ghost';
      ghost.className='ghost-sprite';
      overlay.appendChild(ghost);
    }

    tint = ghost.querySelector('.ghost-tint');
    if (!tint){
      tint = document.createElement('div');
      tint.className='ghost-tint';
      ghost.appendChild(tint);
    }

    // Alte Buttons im Overlay direkt entfernen (falls falsch platziert)
    Array.from(overlay.querySelectorAll(':scope > .place-btn')).forEach(b=>b.remove());

    btnOk = ghost.querySelector('.place-btn.ok');
    if (!btnOk){
      btnOk=document.createElement('button');
      btnOk.className='place-btn ok';
      btnOk.textContent='✓';
      ghost.appendChild(btnOk);
    }

    btnCancel = ghost.querySelector('.place-btn.cancel');
    if (!btnCancel){
      btnCancel=document.createElement('button');
      btnCancel.className='place-btn cancel';
      btnCancel.textContent='✕';
      ghost.appendChild(btnCancel);
    }

    // Button-Events → CoreInput nutzen
    btnOk.onclick = () => {
      if (!currentTool) {
        WARN('Bestätigen ignoriert – kein aktives Tool');
        return;
      }
      const ci = window.CoreInput;
      if (!ci || typeof ci.placeAt!=='function'){
        WARN('CoreInput.placeAt nicht verfügbar');
        return;
      }
      ci.placeAt(lastHover.tx, lastHover.ty, lastSize.w, lastSize.h);
    };

    btnCancel.onclick = () => {
      const ci = window.CoreInput;
      if (!ci || typeof ci.resetTool!=='function'){
        WARN('CoreInput.resetTool nicht verfügbar');
        return;
      }
      ci.resetTool();
    };

    ensureTileSize();
    updateTileScale();
    updateGhostSprite();
  }

  function showOverlay(){
    ensureOverlay();
    if (overlay) overlay.hidden = false;
  }

  function hideOverlay(){
    if (overlay) overlay.hidden = true;
  }

  function updateGhostSprite(){
    ensureOverlay();
    if (!ghost) return;

    if (!currentTool) {
      ghost.style.backgroundImage='';
      return;
    }

    const meta = getBuildingMeta(currentTool);
    const url  = resolveBuildingIcon(meta);

    ghost.style.backgroundImage    = `url(${url})`;
    ghost.style.backgroundRepeat   = 'no-repeat';
    ghost.style.backgroundPosition = 'center center';
    ghost.style.backgroundSize     = 'cover';
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

  function setGhostSizeTiles(w,h){
    ensureOverlay();
    if (!ghost) return;
    ghost.style.setProperty('--wTiles', `${w}`);
    ghost.style.setProperty('--hTiles', `${h}`);
  }

  function setGhostScreenPos(sx, sy){
    ensureOverlay();
    if (!ghost) return;
    ghost.style.setProperty('--sx', `${sx}px`);
    ghost.style.setProperty('--sy', `${sy}px`);
  }

  function setGhostBuildable(can){
    ensureOverlay();
    if (tint){
      tint.classList.toggle('is-valid',  !!can);
      tint.classList.toggle('is-invalid', !can);
    }
    if (btnOk){
      btnOk.disabled = !can;
    }
  }

  // ==========================================================================
  // Hilfen: Raster-Snap & Platzier-Regeln
  // ==========================================================================

  function snapToGrid(p){
    ensureTileSize();
    const step = tileSize * (cam.zoom || 1);

    const gx = p.sx - (p.sx % step);
    const gy = p.sy - (p.sy % step);

    return { gx, gy };
  }

  /**
   * Platzier-Regeln:
   *  - Wenn Game.canPlaceBuildingAt(kind, tx, ty, w, h) existiert:
   *      → diese Funktion entscheidet (true/false)
   *  - Sonst: immer true (aktuelles Verhalten)
   */
  function canPlaceAt(tx,ty){
    // Patch F: wir wollen IMMER das gleiche Regelwerk nutzen.
    // - bevorzugt: window.GameRules.canPlaceBuildingAt(...) (liefert {ok, reason, ...})
    // - fallback:  window.Game.canPlaceBuildingAt(...) (legacy bool)
    try{
      // 1) zentrale Rules (liefert ok + reason)
      const GR = window.GameRules;
      if (GR && typeof GR.canPlaceBuildingAt === 'function'){
        const r = GR.canPlaceBuildingAt(currentTool, tx, ty, lastSize.w, lastSize.h, {
          withReason: true,
          source    : 'GamePlace'
        });
        // Debug: letzte Reason global merken (Inspector/Tests können das später anzeigen)
        window.__SIEDLER_LAST_PLACE_REASON = r?.reason || null;
        return !!r?.ok;
      }

      // 2) Legacy: Game kann nur bool liefern
      const g = window.Game;
      if (g && typeof g.canPlaceBuildingAt === 'function'){
        const ok = !!g.canPlaceBuildingAt(currentTool, tx, ty, lastSize.w, lastSize.h);
        window.__SIEDLER_LAST_PLACE_REASON = ok ? null : 'invalid';
        return ok;
      }
    }catch(e){
      WARN('canPlaceAt Fehler', e);
    }

    // Fallback: wie bisher – immer gültig
    window.__SIEDLER_LAST_PLACE_REASON = null;
    return true;
  }

  // ==========================================================================
  // Externes API – Aufrufe aus core.input.js
  // ==========================================================================

  const GamePlace = {

    onSetBuildTool(kind){
      currentTool = kind || null;
      INFO('onSetBuildTool', currentTool);

      if (currentTool){
        showOverlay();
        setGhostSizeTiles(lastSize.w, lastSize.h);
        updateGhostSprite();
        updateTileScale();
      } else {
        hideOverlay();
      }
    },

    onPlaceBegin(cfg){
      if (!cfg) return;
      if (typeof cfg.w === 'number') lastSize.w = cfg.w|0;
      if (typeof cfg.h === 'number') lastSize.h = cfg.h|0;
      INFO('onPlaceBegin', lastSize);

      if (currentTool){
        setGhostSizeTiles(lastSize.w, lastSize.h);
      }
    },

    onCameraChange(camState){
      if (!camState) return;
      cam.x    = camState.x    ?? cam.x;
      cam.y    = camState.y    ?? cam.y;
      cam.zoom = camState.zoom ?? cam.zoom;
      INFO('onCameraChange', cam);
      updateTileScale();
    },

    onHoverTile(p){
      if (!p) return;
      lastHover = p;

      if (!currentTool) return;

      const { gx, gy } = snapToGrid(p);
      setGhostScreenPos(gx, gy);

      const ok = canPlaceAt(p.tx,p.ty);
      setGhostBuildable(ok);
    },

    onMapClick(p){
      if (!p) return;
      lastHover = p;

      if (!currentTool) return;

      const { gx, gy } = snapToGrid(p);
      setGhostScreenPos(gx, gy);

      const ok = canPlaceAt(p.tx,p.ty);
      setGhostBuildable(ok);

      INFO('onMapClick (Ghost reposition)', p);
    },

    onKeyEnter(){
      INFO('onKeyEnter');
      // Platzieren übernimmt weiterhin CoreInput.placeAt()
      // (wird von core.input.js nach diesem Call ausgelöst)
    },

    onKeyEscape(){
      INFO('onKeyEscape');
      // Overlay wird über cb:set-build-tool(null) versteckt,
      // wenn CoreInput.resetTool() aufgerufen wird.
    }
  };

  window.GamePlace = GamePlace;
  OK('bereit v25.12.08-place-controller-step5');

})();
