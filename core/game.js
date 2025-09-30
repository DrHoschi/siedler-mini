// ============================================================================
// Datei : core/game.js
// Projekt: Neue Siedler
// Version: v1.1.0
// Zweck : Spiel-Engine – Map laden/zeichnen, Placements, Units, Loop
// API   : Game.init(canvas), Game.start(mapId), Game.getState(), Game.getResources()
// Events: cb:map:loaded  { mapId, tile, size:{w,h} }
//         cb:res:change  { ...resources }
// ============================================================================
(() => {
  // ------------------------ interner Zustand ------------------------
  const _state = {
    started: false,
    mapId: null,
    canvas: null,
    ctx: null,
    w: 0, h: 0,
    tile: 64,
    gridW: 32, gridH: 18,
    placements: [],                 // { x, y, id }
    hover: { x:-1, y:-1 },
    selectedBuilding: null,
    resources: { wood:0, stone:0, food:0, gold:0, pop:0 },

    // NEU
    map: null,                      // SiedlerMap-Instanz
    rafId: 0,
    lastTs: 0
  };

  // ------------------------ Helpers/Events -------------------------
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[game]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[game]', ...a);
  const err  = (...a) => (window.CBLog?.err  || console.error)('[game]', ...a);
  const EVT  = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
  const gridSnap = (px, size) => Math.floor(px / size);

  // ------------------------ Rendering --------------------------------
  function frame(ts){
    if (!_state.started) return;
    const { ctx, canvas, map } = _state; if (!ctx || !canvas) return;

    // Zeitdelta (Sek.)
    const dt = _state.lastTs ? Math.min(0.1, (ts - _state.lastTs) / 1000) : 0;
    _state.lastTs = ts;

    // Map zeichnen (inkl. Camera/Zoom)
    map?.draw();

    // Placements (Debug – Rechtecke auf Tile-Gitter)
    drawPlacements(ctx, _state.tile);

    // Units updaten & zeichnen
    window.Units?.update?.(dt);
    window.Units?.draw?.(ctx);

    _state.rafId = requestAnimationFrame(frame);
  }

  function drawPlacements(ctx, size){
    for (const p of _state.placements){
      const x=p.x*size, y=p.y*size;
      ctx.fillStyle='rgba(192,161,107,.35)'; ctx.fillRect(x,y,size,size);
      ctx.strokeStyle='rgba(192,161,107,.9)'; ctx.strokeRect(x+.5,y+.5,size-1,size-1);
    }
  }

  // ------------------------ Map laden --------------------------------
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
    } catch(e){ warn('map laden fehlgeschlagen – nutze Default', e); }
    EVT('cb:map:loaded', { mapId, tile:_state.tile, size:{ w:_state.gridW, h:_state.gridH } });
  }

  // ------------------------ Inputs (Canvas) --------------------------
  function onResize(){
    const c=_state.canvas; if (!c) return;
    _state.w = (c.width  = c.clientWidth  || c.width);
    _state.h = (c.height = c.clientHeight || c.height);
    _state.map?.setSize(_state.w, _state.h);
  }
  function onMouseMove(ev){
    const r=_state.canvas?.getBoundingClientRect(); if(!r) return;
    _state.hover.x = gridSnap(ev.clientX - r.left, _state.tile);
    _state.hover.y = gridSnap(ev.clientY - r.top,  _state.tile);
  }
  function onClick(ev){
    if(!_state.canvas || !_state.selectedBuilding) return;
    const r=_state.canvas.getBoundingClientRect();
    const gx = gridSnap(ev.clientX - r.left + _state.map.camX*_state.map.zoom, _state.tile);
    const gy = gridSnap(ev.clientY - r.top  + _state.map.camY*_state.map.zoom, _state.tile);
    if (gx<0 || gy<0) return;
    _state.placements.push({ x:gx, y:gy, id:_state.selectedBuilding });
    log('placed', { id:_state.selectedBuilding, x:gx, y:gy });
  }

  // ------------------------ Public API --------------------------------
  function init(canvas){
    if(!canvas){ err('init: Canvas fehlt'); return; }
    _state.canvas = canvas;
    _state.ctx    = canvas.getContext('2d');

    // Map-Laufzeit anlegen (globaler SiedlerMap aus map-runtime.js)
    const dbg = document.getElementById('debug-map'); // optional
    _state.map = new window.SiedlerMap(canvas, _state.ctx, dbg);

    // Units initialisieren
    window.Units?.init?.(_state.ctx, _state.tile);

    onResize();
    window.addEventListener('resize', onResize);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    window.addEventListener('cb:build:select', (e) => { _state.selectedBuilding = e?.detail?.id || null; log('select building', _state.selectedBuilding); });
    log('init ✓');
  }

  async function start(mapId){
    _state.mapId  = mapId || _state.mapId || 'data/maps/map-mini.json';
    _state.started = true;

    // Map-Daten in Game-State (für HUD/Grid) und in SiedlerMap laden
    await loadMap(_state.mapId);
    await _state.map.loadMap(_state.mapId);
    _state.map.reload();           // Kamera reset
    onResize();                    // Größe weitergeben

    // **Demo-HQ & Träger** (solange kein echtes HQ platziert wurde):
    const HQ = { x: (_state.gridW*_state.tile)/2, y: (_state.gridH*_state.tile)/2 };
    const spawn = { x: HQ.x - _state.tile*4, y: HQ.y - _state.tile*2 };
    window.Units?.spawnCarrier?.(spawn, HQ);

    cancelAnimationFrame(_state.rafId);
    _state.lastTs = 0;
    _state.rafId = requestAnimationFrame(frame);

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
