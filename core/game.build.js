/* ============================================================================
 * Datei   : core/game.build.js
 * Projekt : Neue Siedler Engine – Build/Place System (Variante B)
 * Version : v25.11.29-buildsystem
 * Zweck   : Ghost-Handling, Platzierungsprüfung, Gebäude anlegen,
 *           Construction starten.
 * ========================================================================== */

(function(){

  const TAG = "[build]";

  // Interner Build-Status
  const Build = {
    selectedId : null,
    ghostX     : null,
    ghostY     : null,
    active     : false
  };

  // ---------------------------------------------------------------------------
  // BUILD.SELECT → UI-BuildMenu ruft das auf, wenn ein Gebäude gewählt wurde
  // ---------------------------------------------------------------------------
  Build.select = function(buildingId){
    Build.selectedId = buildingId;
    Build.active = true;

    console.info(TAG, "Select", buildingId);

    // ui-place.js wartet genau auf dieses Event:
    document.dispatchEvent(new CustomEvent("req:build:ghost-start", {
      detail: { id: buildingId }
    }));

    return true;
  };

  // ---------------------------------------------------------------------------
  // GHOST UPDATE → ui-place.js ruft updateGhost(x,y) auf
  // ---------------------------------------------------------------------------
  Build.updateGhost = function(tx, ty){
    if (!Build.active) return;
    Build.ghostX = tx;
    Build.ghostY = ty;

    // Renderer bekommt Ghost-Position
    window.Game?.renderer?.setGhost?.({
      id : Build.selectedId,
      x  : tx,
      y  : ty
    });
  };

  // ---------------------------------------------------------------------------
  // CAN PLACE CHECK
  // ---------------------------------------------------------------------------
  Build.canPlace = function(tx, ty){
    if (!Build.active || !Build.selectedId) return false;
    if (!window.Game?.map?._state) return false;

    const st = window.Game.map._state;
    const bdef = window.Game.buildings?.getDefinition(Build.selectedId);

    if (!bdef){
      console.warn(TAG, "Keine Definition für", Build.selectedId);
      return false;
    }

    const w = bdef.w || 3;
    const h = bdef.h || 3;

    // einfache Bounds-Prüfung
    if (tx < 0 || ty < 0 || tx + w > st.cols || ty + h > st.rows)
      return false;

    // Kollision mit bestehenden Gebäuden prüfen
    const all = window.Game.buildings.list || [];
    for (const b of all){
      if (tx < b.x + b.w &&
          tx + w > b.x &&
          ty < b.y + b.h &&
          ty + h > b.y)
        return false;
    }

    return true;
  };

  // ---------------------------------------------------------------------------
  // CONFIRM → ui-place.js ruft confirm() auf (Tap)
  // ---------------------------------------------------------------------------
  Build.confirm = function(tx, ty){
    if (!Build.canPlace(tx, ty)){
      console.warn(TAG, "Kann hier nicht bauen", tx, ty);
      return false;
    }

    const id = Build.selectedId;
    const def = window.Game.buildings.getDefinition(id);

    if (!def){
      console.error(TAG, "Fehlende building-definition", id);
      return false;
    }

    // Gebäude registrieren
    const newB = window.Game.buildings.add({
      id : id,
      x  : tx,
      y  : ty,
      w  : def.w || 3,
      h  : def.h || 3
    });

    console.info(TAG, "Gebäude platziert:", id, tx, ty, newB);

    // Construction starten
    window.Game.construction.start(newB);

    // UI informieren
    document.dispatchEvent(new CustomEvent("cb:build:place", {
      detail: { id, x: tx, y: ty, building: newB }
    }));

    // Ghost zurücksetzen
    Build.active = false;
    Build.selectedId = null;
    Build.ghostX = null;
    Build.ghostY = null;
    window.Game.renderer.clearGhost?.();

    return true;
  };

  // ---------------------------------------------------------------------------
  // EXPORT
  // ---------------------------------------------------------------------------
  window.GameBuild = Build;

})();
