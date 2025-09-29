// ============================================================================
// Datei : core/game.js
// Projekt: Neue Siedler
// Version: v1.0.1
// Zweck : Gekapselte Spiel-Engine (Raster, Map-Load, Platzierung, Loop)
// API   : Game.init(canvas), Game.start(mapId), Game.getState(), Game.getResources()
// Events: cb:map:loaded  { mapId, tile, size:{w,h} }
//         cb:res:change  { wood, stone, fish, gold, pop }
// ============================================================================
(() => {
  // ------------------------ interner Zustand ------------------------
  const _state = {
    started: false,
    mapId: null,
    canvas: null,
    ctx: null,
    w: 0, h: 0,
    tile: 40, gridW: 32, gridH: 18,
    placements: [],                 // { x, y, id }
    hover: { x:-1, y:-1 },
    selectedBuilding: null,         // aus cb:build:select
    resources: { wood:0, stone:0, fish:0, gold:0, pop:0 },
    rafId: 0
  };

  // ------------------------ kleine Helpers -------------------------
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[game]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[game]', ...a);
  const err  = (...a) => (window.CBLog?.err  || console.error)('[game]', ...a);
  const EVT  = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
  const gridSnap = (px, size) => Math.floor(px / size);

  // ------------------------ Rendering --------------------------------
  function drawBackground(ctx, w, h) { ctx.fillStyle = '#1a1d21'; ctx.fillRect(0, 0, w, h); }
  function drawGrid(ctx, w, h, size) {
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    for (let x=0; x<=w; x+=size){ ctx.beginPath(); ctx.moveTo(x+.5,0); ctx.lineTo(x+.5,h); ctx.stroke(); }
    for (let y=0; y<=h; y+=size){ ctx.beginPath(); ctx.moveTo(0,y+.5); ctx.lineTo(w,y+.5); ctx.stroke(); }
  }
  function drawPlacements(ctx, size){
    for (const p of _state.placements){
      const x=p.x*size, y=p.y*size;
      ctx.fillStyle='rgba(192,161,107,.35)'; ctx.fillRect(x,y,size,size);
      ctx.strokeStyle='rgba(192,161,107,.9)'; ctx.strokeRect(x+.5,y+.5,size-1,size-1);
    }
  }
  function drawHover(ctx, size){
    if (_state.hover.x<0 || _state.hover.y<0) return;
    const x=_state.hover.x*size, y=_state.hover.y*size;
    ctx.strokeStyle='rgba(77,163,255,.9)'; ctx.lineWidth=2; ctx.strokeRect(x+1.5,y+1.5,size-3,size-3);
  }

  function frame(){
    if (!_state.started) return;
    const { ctx, w, h, tile } = _state; if (!ctx) return;
    drawBackground(ctx, w, h); drawGrid(ctx, w, h, tile); drawPlacements(ctx, tile); drawHover(ctx, tile);
    _state.rafId = requestAnimationFrame(frame);
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

  // ------------------------ Events/Inputs ----------------------------
  function onResize(){
    const c=_state.canvas; if (!c) return;
    _state.w = (c.width  = c.clientWidth  || c.width);
    _state.h = (c.height = c.clientHeight || c.height);
  }
  function onMouseMove(ev){
    const r=_state.canvas?.getBoundingClientRect(); if(!r) return;
    _state.hover.x = gridSnap(ev.clientX - r.left, _state.tile);
    _state.hover.y = gridSnap(ev.clientY - r.top,  _state.tile);
  }
  function onClick(ev){
    if(!_state.canvas || !_state.selectedBuilding) return;
    const r=_state.canvas.getBoundingClientRect();
    const gx = gridSnap(ev.clientX - r.left, _state.tile);
    const gy = gridSnap(ev.clientY - r.top,  _state.tile);
    if (gx<0 || gy<0) return;
    _state.placements.push({ x:gx, y:gy, id:_state.selectedBuilding });
    log('placed', { id:_state.selectedBuilding, x:gx, y:gy });
    // (Platzierungs-Event/Ökonomie kommt später – HUD-Init ist separat)
  }

  // ------------------------ Public API --------------------------------
  function init(canvas){
    if(!canvas){ err('init: Canvas fehlt'); return; }
    _state.canvas = canvas;
    _state.ctx    = canvas.getContext('2d');
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
    await loadMap(_state.mapId);
    cancelAnimationFrame(_state.rafId);
    _state.rafId = requestAnimationFrame(frame);
    // HUD initial befüllen – SOFORT nach Start (siehe Lastenheft: HUD reagiert auf cb:res:change)
    EVT('cb:res:change', { ..._state.resources });
  }

  function getState(){
    const { started, mapId, tile, gridW, gridH, placements, selectedBuilding } = _state;
    return { started, mapId, tile, gridW, gridH, placements: placements.slice(), selectedBuilding };
  }
  function getResources(){ return { ..._state.resources }; }

  window.Game = { init, start, getState, getResources };
})();
