/* ============================================================================
 * world.js — Welt/State + Platzierungslogik
 * Minimaler State, auf den Renderer & UI zugreifen.
 * Globale Exports: window.World
 * ========================================================================== */
(() => {
  if (window.World) return;

  const S = {
    mapUrl : null,
    map    : null,       // Map JSON
    rows   : 0,
    cols   : 0,
    tile   : 64,
    camera : { x:0, y:0, zoom:1 },
    buildings: [],       // {type, tx, ty, w, h}
    units     : [],      // {job, x, y, dirX, dirY, color}
  };

  function fromMap(map, mapUrl){
    S.mapUrl = mapUrl;
    S.map = map;
    S.rows = Number.isFinite(map.rows)     ? map.rows : 16;
    S.cols = Number.isFinite(map.cols)     ? map.cols : 16;
    S.tile = Number.isFinite(map.tileSize) ? map.tileSize :
             Number.isFinite(map.tile)     ? map.tile :
             64;
    // Kamera grob mittig
    S.camera.zoom = 1;
    S.camera.x = (S.cols * S.tile)/2;
    S.camera.y = (S.rows * S.tile)/2;
    // Reset oder beibehalten? — wir behalten bestehende Objekte
    return S;
  }

  function canPlace(tx, ty, w=1, h=1){
    if (tx<0 || ty<0 || tx+w> S.cols || ty+h> S.rows) return false;
    // simple Kollision: keine Überschneidung
    return !S.buildings.some(b => !(tx+w<=b.tx || b.tx+b.w<=tx || ty+h<=b.ty || b.ty+b.h<=ty));
  }

  function placeBuilding(type, tx, ty, w=1, h=1){
    if (!canPlace(tx,ty,w,h)) return false;
    S.buildings.push({type, tx, ty, w, h});
    console.log('[world] Gebäude platziert:', type, `@ ${tx},${ty} (${w}x${h})`);
    return true;
  }

  function addUnit(job, x, y, color='#ff0'){
    S.units.push({job, x, y, dirX:0, dirY:0, color});
  }

  window.World = { state:S, fromMap, canPlace, placeBuilding, addUnit };
})();
