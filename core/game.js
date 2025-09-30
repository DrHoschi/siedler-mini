// ============================================================================
// Datei   : core/game.js
// Projekt : Neue Siedler
// Version : v1.2.0
// Zweck   : Spiel-Engine – Map laden/zeichnen, Placements, Units, Loop
// API     : Game.init(canvas), Game.start(mapId), Game.getState(), Game.getResources()
// Events  : cb:map:loaded  { mapId, tile, size:{w,h} }
//           cb:res:change  { ...resources }
// Leitplanken (Punkt 1):
//   • Kamera-Pan & -Zoom nur auf Canvas (UI/HUD bleibt fix)
//   • Gebäude/Placements folgen der Kamera (Welt-Koordinaten)
//   • Zoom erfolgt um den Cursor (World-Punkt bleibt unter Maus)
// ============================================================================

(() => {
  // == Interner Zustand =======================================================
  const _state = {
    started: false,
    mapId: null,

    // Canvas & Kontext
    canvas: null,
    ctx: null,
    w: 0, h: 0,

    // Grid / Tile
    tile: 64,
    gridW: 32, gridH: 18,

    // Weltobjekte
    placements: [],                 // { x, y, id }   (x/y = Tile-Koords)
    hover: { x:-1, y:-1 },          // Tile unter Cursor
    selectedBuilding: null,

    // Ressourcen
    resources: { wood:0, stone:0, food:0, gold:0, pop:0 },

    // Map / Kamera / Loop
    map: null,                      // SiedlerMap-Instanz (map-runtime.js)
    rafId: 0,
    lastTs: 0,

    // Kamera-Livewerte (aus map)
    camX: 0,                        // World-Offset X (Pixel)
    camY: 0,                        // World-Offset Y (Pixel)
    zoom: 1,                        // Maßstab

    // Eingaben (Pan/Zoom)
    panActive: false,
    panStart: { x:0, y:0, camX:0, camY:0 },
  };

  // == Helpers / Events =======================================================
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[game]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[game]', ...a);
  const err  = (...a) => (window.CBLog?.err  || console.error)('[game]', ...a);
  const EVT  = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  const clamp = (v, mi, ma) => Math.min(ma, Math.max(mi, v));
  const snap  = (v, s) => Math.floor(v / s);

  // -- Screen <-> World Konvertierung ----------------------------------------
  function screenToCanvasPx(clientX, clientY){
    // Map CSS-Pixel -> Canvas-Pixel (DPR-sicher)
    const c = _state.canvas, rect = c.getBoundingClientRect();
    const sx = (clientX - rect.left) * (c.width  / rect.width);
    const sy = (clientY - rect.top)  * (c.height / rect.height);
    return { sx, sy };
  }
  function screenToWorld(clientX, clientY){
    // Canvas-Pixel -> Welt-Pixel (Kamera rückgängig)
    const { sx, sy } = screenToCanvasPx(clientX, clientY);
    const wx = sx / _state.zoom + _state.camX;
    const wy = sy / _state.zoom + _state.camY;
    return { wx, wy };
  }
  function worldToScreen(wx, wy){
    // Welt-Pixel -> Canvas-Pixel
    const sx = (wx - _state.camX) * _state.zoom;
    const sy = (wy - _state.camY) * _state.zoom;
    return { sx, sy };
  }

  // == Rendering ==============================================================

  function applyCameraTransform(){
    const { ctx, camX, camY, zoom } = _state;
    ctx.setTransform(zoom, 0, 0, zoom, -camX * zoom, -camY * zoom);
  }

  function frame(ts){
    if (!_state.started) return;
    const { ctx, canvas, map } = _state; if (!ctx || !canvas) return;

    // Zeitdelta (Sek.)
    const dt = _state.lastTs ? Math.min(0.1, (ts - _state.lastTs) / 1000) : 0;
    _state.lastTs = ts;

    // (A) Map zeichnen (inkl. Tiles, ggf. eigener Transform)
    map?.draw();

    // (B) Placements zeichnen (im Welt-Koordinatensystem)
    ctx.save();
    applyCameraTransform();
    drawPlacements(ctx, _state.tile);
    ctx.restore();

    // (C) Units updaten & zeichnen (sofern sie Welt-Koords nutzen, ebenfalls im Transform)
    if (window.Units?.update || window.Units?.draw){
      ctx.save();
      applyCameraTransform();
      window.Units?.update?.(dt);
      window.Units?.draw?.(ctx);
      ctx.restore();
    }

    _state.rafId = requestAnimationFrame(frame);
  }

  function drawPlacements(ctx, size){
    for (const p of _state.placements){
      const x = p.x * size, y = p.y * size;
      ctx.fillStyle   = 'rgba(192,161,107,.35)';
      ctx.strokeStyle = 'rgba(192,161,107,.9)';
      ctx.fillRect(x, y, size, size);
      ctx.strokeRect(x + .5, y + .5, size - 1, size - 1);
    }
  }

  // == Map laden ==============================================================
  async function loadMap(mapId){
    try{
      if (typeof mapId === 'string' && /\.json($|\?)/i.test(mapId)){
        const res = await fetch(mapId, { cache:'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        _state.tile  = Number(json.tile) || _state.tile;
        const size   = Array.isArray(json.size) ? json.size : [_state.gridW, _state.gridH];
        _state.gridW = Number(size[0]) || _state.gridW;
        _state.gridH = Number(size[1]) || _state.gridH;
        log('map geladen', { mapId, tile:_state.tile, grid:[_state.gridW,_state.gridH] });
      } else {
        log('map: kein JSON-Header → Default', { mapId });
      }
    } catch(e){
      warn('map laden fehlgeschlagen – nutze Default', e);
    }
    EVT('cb:map:loaded', { mapId, tile:_state.tile, size:{ w:_state.gridW, h:_state.gridH } });
  }

  // == Inputs (Resize / Hover / Pan / Zoom / Platzieren) ======================

  function onResize(){
    const c=_state.canvas; if (!c) return;
    _state.w = (c.width  = c.clientWidth  || c.width);
    _state.h = (c.height = c.clientHeight || c.height);
    _state.map?.setSize(_state.w, _state.h);

    // Kamera live aus Map übernehmen (falls Map sie verwaltet)
    if (_state.map){
      _state.camX = _state.map.camX ?? _state.camX;
      _state.camY = _state.map.camY ?? _state.camY;
      _state.zoom = _state.map.zoom ?? _state.zoom;
    }
  }

  function onPointerDown(ev){
    // Pan nur wenn kein Platziermodus aktiv ist
    if (!_state.selectedBuilding){
      _state.panActive = true;
      _state.canvas.setPointerCapture?.(ev.pointerId);
      _state.panStart.x   = ev.clientX;
      _state.panStart.y   = ev.clientY;
      _state.panStart.camX= _state.camX;
      _state.panStart.camY= _state.camY;
    }
  }

  function onPointerMove(ev){
    // Hover (immer): Cursor → Welt → Tile
    const wpos = screenToWorld(ev.clientX, ev.clientY);
    _state.hover.x = snap(wpos.wx, _state.tile);
    _state.hover.y = snap(wpos.wy, _state.tile);

    // Pan
    if (_state.panActive && !_state.selectedBuilding){
      const dx = (ev.clientX - _state.panStart.x) / _state.zoom;
      const dy = (ev.clientY - _state.panStart.y) / _state.zoom;
      _state.camX = _state.panStart.camX - dx;
      _state.camY = _state.panStart.camY - dy;

      // Map informieren (falls sie eigene Logik hält)
      if (_state.map){ _state.map.camX = _state.camX; _state.map.camY = _state.camY; }
    }
  }

  function onPointerUp(){
    _state.panActive = false;
  }

  function onWheel(ev){
    ev.preventDefault(); // verhindert Browser-Seitenzoom/Scroll
    const oldZoom = _state.zoom;
    const factor  = ev.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = clamp(oldZoom * factor, _state.map?.minZoom ?? 0.5, _state.map?.maxZoom ?? 3);

    if (newZoom === oldZoom) return;

    // Zoom um den Cursor: World-Punkt unter Cursor bleibt an gleicher Screen-Pos
    const before = screenToWorld(ev.clientX, ev.clientY); // wx/wy vor Zoom
    _state.zoom = newZoom;

    // Kamera so verschieben, dass (wx,wy) erneut unter Cursor liegt
    const afterS = screenToCanvasPx(ev.clientX, ev.clientY);
    _state.camX = before.wx - (afterS.sx / _state.zoom);
    _state.camY = before.wy - (afterS.sy / _state.zoom);

    // Map syncen
    if (_state.map){ _state.map.zoom = _state.zoom; _state.map.camX = _state.camX; _state.map.camY = _state.camY; }
  }

  function onClick(ev){
    // Nur wenn ein Gebäude selektiert ist, platzieren
    if(!_state.canvas || !_state.selectedBuilding) return;

    const wpos = screenToWorld(ev.clientX, ev.clientY);
    const gx   = snap(wpos.wx, _state.tile);
    const gy   = snap(wpos.wy, _state.tile);
    if (gx<0 || gy<0) return;

    _state.placements.push({ x:gx, y:gy, id:_state.selectedBuilding });
    log('placed', { id:_state.selectedBuilding, x:gx, y:gy });
  }

  // == Public API =============================================================

  function init(canvas){
    if(!canvas){ err('init: Canvas fehlt'); return; }
    _state.canvas = canvas;
    _state.ctx    = canvas.getContext('2d');

    // Canvas für Touch-Gesten: nur ans Spiel, nicht an den Browser
    _state.canvas.style.touchAction = 'none';

    // Map-Laufzeit anlegen (globaler SiedlerMap aus map-runtime.js)
    const dbg = document.getElementById('debug-map'); // optional
    _state.map = new window.SiedlerMap(canvas, _state.ctx, dbg);

    // Kamera-Startwerte aus Map übernehmen
    _state.camX = _state.map.camX ?? 0;
    _state.camY = _state.map.camY ?? 0;
    _state.zoom = _state.map.zoom ?? 1;

    // Units initialisieren
    window.Units?.init?.(_state.ctx, _state.tile);

    // Events
    onResize();
    window.addEventListener('resize', onResize);

    // Pointer (Pan/Hover/Place)
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup',   onPointerUp);
    canvas.addEventListener('click',       onClick);

    // Wheel-Zoom
    canvas.addEventListener('wheel', onWheel, { passive:false });

    // Auswahl aus Baumenü
    window.addEventListener('cb:build:select', (e) => {
      _state.selectedBuilding = e?.detail?.id || null;
      log('select building', _state.selectedBuilding);
    });

    log('init ✓');
  }

  async function start(mapId){
    _state.mapId  = mapId || _state.mapId || 'data/maps/map-mini.json';
    _state.started = true;

    // Map-Daten in Game-State (für HUD/Grid) und in SiedlerMap laden
    await loadMap(_state.mapId);
    await _state.map.loadMap(_state.mapId);
    _state.map.reload?.();          // Kamera reset (Map-eigene Logik)
    // Kamera nochmals abholen (für den Fall, dass reload() sie setzt)
    _state.camX = _state.map.camX ?? _state.camX;
    _state.camY = _state.map.camY ?? _state.camY;
    _state.zoom = _state.map.zoom ?? _state.zoom;

    onResize();                     // Größe weitergeben

    // **Demo-HQ & Träger** (bis das echte HQ-Placement aktiv ist)
    const HQpx = { x: (_state.gridW*_state.tile)/2, y: (_state.gridH*_state.tile)/2 };
    const spawn = { x: HQpx.x - _state.tile*4, y: HQpx.y - _state.tile*2 };
    window.Units?.spawnCarrier?.(spawn, HQpx);

    cancelAnimationFrame(_state.rafId);
    _state.lastTs = 0;
    _state.rafId  = requestAnimationFrame(frame);

    // HUD initial befüllen – sofort nach Start
    EVT('cb:res:change', { ..._state.resources });
  }

  function getState(){
    const { started, mapId, tile, gridW, gridH, placements, selectedBuilding } = _state;
    return { started, mapId, tile, gridW, gridH, placements: placements.slice(), selectedBuilding };
  }

  function getResources(){ return { ..._state.resources }; }

  window.Game = { init, start, getState, getResources };
})();
