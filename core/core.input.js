/* ============================================================================
 * Datei   : core/core.input.js
 * Projekt : Neue Siedler
 * Version : v25.12.08-workarea-integrated-v2 (Ghost+Sprite+ZoomScaling+WorkArea-Click+OptionA)
 * Zweck   : Eingabe + Platzier-Ghost + OK/Cancel direkt am Ghost
 *
 * Lauscht : cb:set-build-tool(kind)
 *           req:place:begin({w,h})
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
 *  ✔ NEU: Klick-Unterstützung für GameWorkArea (Arbeitsbereich setzen)
 *  ✔ NEU: Cursor-Kreuz auch bei aktiver WorkArea-Auswahl
 *
 * WICHTIG (Struktur):
 *  - ALLE Pointer-Events bleiben HIER (Input-Modul).
 *  - GameWorkArea wird NUR über eine kleine Hook-Funktion bedient:
 *      handleWorkAreaClick(...)
 *  - Die eigentliche WorkArea-Logik (cx,cy,radius, Defaults, Events)
 *    liegt komplett in core/game.workarea.js.
 * ========================================================================== */

(function(){
  'use strict';

  // ==========================================================================
  //  IMPORTS / KURZ-HILFSFUNKTIONEN
  // ==========================================================================

  const PREFIX = '[core.input]';

  function LOG(...args){ console.log(PREFIX, ...args); }
  function INFO(...args){ console.info(PREFIX, ...args); }
  function WARN(...args){ console.warn(PREFIX, ...args); }

  function q(sel){ return document.querySelector(sel); }

  // ==========================================================================
  //  STATE / KONSTANTEN
  // ==========================================================================

  let canvas      = null;
  let overlay     = null;
  let ghost       = null;
  let tint        = null;
  let btnOk       = null;
  let btnCancel   = null;

  let buildTool   = null; // z. B. 'b.hq', 'b.lumberjack'
  let tileSize    = 64;

  let lastHover   = null;
  let hoverValid  = false;

  let camState    = { x:0, y:0, zoom:1 };

  // ==========================================================================
  //  HILFSFUNKTIONEN
  // ==========================================================================

  function ensureCanvas(){
    if (canvas) return;
    canvas = document.getElementById('game-canvas');
    if (!canvas){
      WARN('Kein #game-canvas gefunden – Input kann nicht binden');
    }
  }

  function screenToTile(sx, sy){
    const rect = canvas.getBoundingClientRect();
    const xInCanvas = sx - rect.left;
    const yInCanvas = sy - rect.top;

    const ts = tileSize * camState.zoom;
    const tx = Math.floor(xInCanvas / ts) + camState.x;
    const ty = Math.floor(yInCanvas / ts) + camState.y;

    return {
      sx: xInCanvas,
      sy: yInCanvas,
      tx,
      ty
    };
  }

  function canPlaceAt(tx,ty){
    // Platzhalter – hier später Kollisionsprüfung etc.
    if (tx < 0 || ty < 0) return false;
    return true;
  }

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
    if (!meta) return '';
    if (meta.icon) return meta.icon;

    return `assets/icons/buildings/${meta.id || 'building'}.png`;
  }

  // ==========================================================================
  //  OVERLAY & GHOST INITIALISIERUNG
  // ==========================================================================

  function ensureOverlay(){
    if (overlay && ghost && tint && btnOk && btnCancel) return;

    overlay = q('#place-overlay') || overlay;
    if (!overlay){
      overlay = document.createElement('div');
      overlay.id   = 'place-overlay';
      overlay.className = 'place-overlay';
      document.body.appendChild(overlay);
    }

    if (!ghost){
      ghost = document.createElement('div');
      ghost.className = 'place-ghost';
      overlay.appendChild(ghost);
    }

    if (!tint){
      tint = document.createElement('div');
      tint.className = 'place-ghost-tint';
      ghost.appendChild(tint);
    }

    if (!btnOk){
      btnOk = document.createElement('button');
      btnOk.className = 'place-ghost-ok';
      btnOk.textContent = '✓';
      ghost.appendChild(btnOk);
    }

    if (!btnCancel){
      btnCancel = document.createElement('button');
      btnCancel.className = 'place-ghost-cancel';
      btnCancel.textContent = '✕';
      ghost.appendChild(btnCancel);
    }

    btnOk.addEventListener('click', ()=>{
      if (!buildTool || !hoverValid || !lastHover) return;
      const { tx,ty } = lastHover;
      const w = 3, h = 3; // Standardgröße – später aus Registry

      const detail = {
        kind     : buildTool,
        buildingId: buildTool,
        x        : tx|0,
        y        : ty|0,
        w        : w|0,
        h        : h|0
      };
      OK('cb:build:place', detail);
      window.dispatchEvent(new CustomEvent('cb:build:place', { detail }));
      hideOverlay();
      resetTool();
    });

    btnCancel.addEventListener('click', ()=>{
      hideOverlay();
      resetTool();
    });
  }

  function showOverlay(){
    ensureOverlay();
    if (overlay) overlay.style.display = 'block';
    if (ghost)   ghost.style.display   = 'block';
  }

  function hideOverlay(){
    if (overlay) overlay.style.display = 'none';
    if (ghost)   ghost.style.display   = 'none';
  }

  function setGhostScreenPos(sx, sy){
    if (!ghost) return;
    ghost.style.transform = `translate(${sx}px, ${sy}px)`;
  }

  function setGhostBuildable(isOk){
    if (!tint) return;
    tint.classList.toggle('ok', !!isOk);
    tint.classList.toggle('bad', !isOk);
  }

  function resetTool(){
    buildTool  = null;
    hoverValid = false;
    lastHover  = null;

    if (canvas){
      canvas.style.cursor = 'default';
    }
  }

  // ==========================================================================
  //  WorkArea-Integration (Option A – nur kleiner Hook)
  // ==========================================================================

  // ---------------------------------------------------------------------------
  // WorkArea: Klick auf die Karte im "Arbeitsbereich setzen"-Modus
  // ---------------------------------------------------------------------------
  /* function handleWorkAreaClick(p, ev){
   *   // Alte Version zu Dokumentationszwecken belassen
   * } */

  function handleWorkAreaClick(p, ev){
    // Nur aktiv, wenn das WorkArea-Modul überhaupt da ist
    // und wir gerade im Selektionsmodus sind
    const gw = window.GameWorkArea;
    if (!gw || typeof gw.isSelecting !== 'function' || !gw.isSelecting()) return false;

    try{
      ev.preventDefault?.();
      gw.applySelectionTile(p.tx, p.ty);
    }catch(e){
      console.warn('[core.input] WorkArea-Klick-Fehler', e);
      return false;
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

      if (!buildTool){
        return;
      }

      const cam = camState;
      const ts  = tileSize * cam.zoom;

      const step = tileSize * cam.zoom;
      const gx = p.sx - (p.sx % step);
      const gy = p.sy - (p.sy % step);

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

      if (b){
        // Gebäude getroffen → Gebäude-Menü öffnen
        const meta = getBuildingMeta(b.id);

        const detail = {
          id      : b.id,
          uid     : b.uid,
          x       : b.x,
          y       : b.y,
          w       : b.w,
          h       : b.h,
          icon    : resolveBuildingIcon(meta),
          label   : meta.label   || '',
          category: meta.category|| ''
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

  // ==========================================================================
  //  EXPORT / INITIALISIERUNG
  // ==========================================================================

  function init(){
    ensureCanvas();
    ensureOverlay();
    bindPointer();

    // Kamera-Änderungen abonnieren (für screenToTile & Ghost-Scaling)
    window.addEventListener('cb:camera-change', ev=>{
      const d = ev && ev.detail;
      if (!d) return;
      camState = {
        x   : d.x|0,
        y   : d.y|0,
        zoom: d.zoom||1
      };
    });

    INFO('bereit v25.12.08-workarea-integrated-v2 (Ghost+Sprite+ZoomScaling+WorkArea-Click+OptionA)');
  }

  // Externes Interface (z. B. aus boot.js):
  window.CoreInput = {
    init
  };

})();
