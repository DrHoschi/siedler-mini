// ============================================================================
// Datei   : core/game.js
// Projekt : Neue Siedler
// Version : v1.3.2
// Zweck   : Spiel-Engine – Map laden/zeichnen, Placements, Units, Loop
// API     : Game.init(canvas), Game.start(mapId), Game.getState(), Game.getResources()
// Events  : cb:map:loaded  { mapId, tile, size:{w,h} }
//           cb:res:change  { ...resources }
// Notes   : Pan/Zoom nur auf Canvas; Weltobjekte werden per world→screen gezeichnet
//           NEU v1.3.2: Map-Bounds für Hover/Platzieren + Kamera-Clamp
// ============================================================================

(() => {
  // == State =================================================================
  const _state = {
    started: false,
    mapId  : null,

    // Canvas
    canvas : null,
    ctx    : null,
    w:0, h:0,

    // Grid/Tiles
    tile : 64,
    gridW: 32, gridH: 18,

    // Weltobjekte
    placements: [],                 // { x, y, id }  (Tile-Koords!)
    hover: { x:-1, y:-1 },          // Tile unter Cursor
    selectedBuilding: null,

    // Ressourcen
    resources: { wood:0, stone:0, food:0, gold:0, pop:0 },

    // Map / Kamera / Loop
    map  : null,                    // SiedlerMap-Instanz
    camX : 0,                       // Welt-Offset in Pixel
    camY : 0,
    zoom : 1,
    rafId: 0, lastTs: 0,

    // Eingaben
    panActive: false,
    panStart : { x:0, y:0, camX:0, camY:0 },

    // Pinch
    pointers: new Map(),            // pointerId -> {x,y}
    pinch   : { active:false, d0:1, zoom0:1, center:{x:0,y:0} },
  };

  // == Utils / Events ========================================================
  const log  = (...a)=>(window.CBLog?.ok  || console.log)('[game]', ...a);
  const warn = (...a)=>(window.CBLog?.warn|| console.warn)('[game]', ...a);
  const err  = (...a)=>(window.CBLog?.err || console.error)('[game]', ...a);
  const EVT  = (n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}));

  const clamp = (v,mi,ma)=>Math.min(ma,Math.max(mi,v));
  const snap  = (v,s)=>Math.floor(v/s);

  // -- Bounds-Helper ---------------------------------------------------------
  // Kachelkoordinaten innerhalb der Karte?
  function inBoundsTile(gx, gy){
    return gx >= 0 && gy >= 0 && gx < _state.gridW && gy < _state.gridH;
  }

  // Kamera innerhalb der Karte halten (sichtbares Fenster wird berücksichtigt)
  function clampCameraToMap(){
    const worldW = _state.gridW * _state.tile;
    const worldH = _state.gridH * _state.tile;
    const viewW  = _state.w / Math.max(1e-6, _state.zoom);
    const viewH  = _state.h / Math.max(1e-6, _state.zoom);

    // Wenn View größer als Welt ist → in der Mitte „einrasten“
    const maxX = Math.max(0, worldW - viewW);
    const maxY = Math.max(0, worldH - viewH);

    _state.camX = clamp(_state.camX, 0, maxX);
    _state.camY = clamp(_state.camY, 0, maxY);

    if (_state.map){ _state.map.camX=_state.camX; _state.map.camY=_state.camY; }
  }

  // -- Koord.-Projektion -----------------------------------------------------
  function screenToCanvasPx(clientX, clientY){
    const c=_state.canvas, r=c.getBoundingClientRect();
    return {
      sx: (clientX - r.left) * (c.width  / r.width),
      sy: (clientY - r.top ) * (c.height / r.height),
    };
  }
  function screenToWorld(clientX, clientY){
    const {sx,sy}=screenToCanvasPx(clientX,clientY);
    return { wx: sx/_state.zoom + _state.camX, wy: sy/_state.zoom + _state.camY };
  }
  function worldToScreen(wx, wy){
    return { sx: (wx - _state.camX)*_state.zoom, sy: (wy - _state.camY)*_state.zoom };
  }

  // -- Kamera mit Map synchronisieren ---------------------------------------
  function syncCamFromMap(){
    const m = _state.map; if (!m) return;
    const mx = m.camX; const my = m.camY; const mz = m.zoom;
    if (typeof mx === 'number') _state.camX = mx;
    if (typeof my === 'number') _state.camY = my;
    if (typeof mz === 'number') _state.zoom = mz;
    clampCameraToMap(); // Safety, falls Map nicht clamped
  }

  // == Rendering =============================================================
  function frame(ts){
    if(!_state.started) return;
    const {ctx,canvas,map}=_state; if(!ctx||!canvas) return;

    // Map → Kamera abgleichen (falls Map intern Pan/Zoom ändert)
    syncCamFromMap();

    const dt=_state.lastTs?Math.min(0.1,(ts-_state.lastTs)/1000):0;
    _state.lastTs=ts;

    // A) Map (eigenes Rendering)
    map?.draw();

    // B) Weltobjekte (projektiert)
    ctx.save();
    drawPlacements(ctx);
    window.Units && drawUnitsWithProjection(ctx, dt);
    ctx.restore();

    _state.rafId = requestAnimationFrame(frame);
  }

  function drawPlacements(ctx){
    const s = _state.tile * _state.zoom;  // sichtbare Kachelgröße
    for(const p of _state.placements){
      const {sx,sy} = worldToScreen(p.x*_state.tile, p.y*_state.tile);
      ctx.fillStyle   = 'rgba(192,161,107,.35)';
      ctx.strokeStyle = 'rgba(192,161,107,.9)';
      ctx.fillRect(sx, sy, s, s);
      ctx.strokeRect(sx+.5, sy+.5, s-1, s-1);
    }
  }
  function drawUnitsWithProjection(ctx, dt){
    window.Units?.update?.(dt, { zoom:_state.zoom, camX:_state.camX, camY:_state.camY });
    window.Units?.drawProjected?.(ctx, (wx,wy)=>worldToScreen(wx,wy)); // optional API
  }

  // == Map laden =============================================================
  async function loadMap(mapId){
    try{
      if (typeof mapId==='string' && /\.json($|\?)/i.test(mapId)){
        const res = await fetch(mapId,{cache:'no-cache'});
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        _state.tile  = Number(json.tile) || _state.tile;
        const size   = Array.isArray(json.size) ? json.size : [_state.gridW,_state.gridH];
        _state.gridW = Number(size[0]) || _state.gridW;
        _state.gridH = Number(size[1]) || _state.gridH;
        log('map geladen', { mapId, tile:_state.tile, grid:[_state.gridW,_state.gridH] });
      } else {
        log('map: kein JSON → Default', { mapId });
      }
    } catch(e){ warn('map laden fehlgeschlagen', e); }
    EVT('cb:map:loaded', { mapId, tile:_state.tile, size:{ w:_state.gridW, h:_state.gridH } });
  }

  // == Inputs (Resize / Pan / Pinch / Zoom / Platzieren) =====================
  function onResize(){
    const c=_state.canvas; if(!c) return;
    _state.w = (c.width  = c.clientWidth  || c.width);
    _state.h = (c.height = c.clientHeight || c.height);
    _state.map?.setSize(_state.w,_state.h);

    // Kamera aus Map spiegeln und clampen
    if (_state.map){
      _state.camX = _state.map.camX ?? _state.camX;
      _state.camY = _state.map.camY ?? _state.camY;
      _state.zoom = _state.map.zoom ?? _state.zoom;
      clampCameraToMap();
    }
  }

  // -- Pointer-Bookkeeping (Pan/Pinch) --------------------------------------
  function rememberPointer(ev){ _state.pointers.set(ev.pointerId, {x:ev.clientX, y:ev.clientY}); }
  function forgetPointer(ev){ _state.pointers.delete(ev.pointerId); if(_state.pointers.size<2) _state.pinch.active=false; }

  function tryStartPinch(){
    if (_state.pointers.size!==2) return false;
    const [a,b] = [..._state.pointers.values()];
    const dx=a.x-b.x, dy=a.y-b.y;
    _state.pinch.active = true;
    _state.pinch.d0     = Math.hypot(dx,dy);
    _state.pinch.zoom0  = _state.zoom;
    _state.pinch.center = { x:(a.x+b.x)/2, y:(a.y+b.y)/2 };
    return true;
  }

  function onPointerDown(ev){
    rememberPointer(ev);

    // 2 Finger → Pinch-Setup
    if (_state.pointers.size===2 && tryStartPinch()) return;

    // 1 Finger → Pan nur, wenn kein Platziermodus aktiv
    if (!_state.selectedBuilding && !_state.pinch.active){
      _state.panActive = true;
      _state.canvas.setPointerCapture?.(ev.pointerId);
      _state.panStart = { x:ev.clientX, y:ev.clientY, camX:_state.camX, camY:_state.camY };
    }
  }

  function onPointerMove(ev){
    rememberPointer(ev);

    // -- Hover (Tile unter Cursor) – nur innerhalb der Map zeigen ------------
    {
      const wpos = screenToWorld(ev.clientX, ev.clientY);
      const gx = snap(wpos.wx, _state.tile);
      const gy = snap(wpos.wy, _state.tile);
      if (inBoundsTile(gx, gy)) {
        _state.hover.x = gx;
        _state.hover.y = gy;
      } else {
        _state.hover.x = -1;
        _state.hover.y = -1;
      }
    }

    // -- Pinch-Zoom ----------------------------------------------------------
    if (_state.pinch.active && _state.pointers.size===2){
      const [a,b] = [..._state.pointers.values()];
      const dist  = Math.hypot(a.x-b.x, a.y-b.y);
      const factor= dist / Math.max(1,_state.pinch.d0);
      const newZ  = clamp(_state.pinch.zoom0 * factor, _state.map?.minZoom ?? 0.5, _state.map?.maxZoom ?? 3);

      // Zoom um Zentrum stabilisieren
      const before = screenToWorld(_state.pinch.center.x, _state.pinch.center.y);
      _state.zoom  = newZ;
      const cs     = screenToCanvasPx(_state.pinch.center.x, _state.pinch.center.y);
      _state.camX  = before.wx - (cs.sx / _state.zoom);
      _state.camY  = before.wy - (cs.sy / _state.zoom);

      clampCameraToMap();
      if (_state.map){ _state.map.zoom=_state.zoom; _state.map.camX=_state.camX; _state.map.camY=_state.camY; }
      return;
    }

    // -- Pan -----------------------------------------------------------------
    if (_state.panActive && !_state.selectedBuilding){
      const dx = (ev.clientX - _state.panStart.x) / _state.zoom;
      const dy = (ev.clientY - _state.panStart.y) / _state.zoom;
      _state.camX = _state.panStart.camX - dx;
      _state.camY = _state.panStart.camY - dy;
      clampCameraToMap();
      if (_state.map){ _state.map.camX=_state.camX; _state.map.camY=_state.camY; }
    }
  }

  function onPointerUp(ev){
    forgetPointer(ev);
    _state.panActive = false;
  }

  function onWheel(ev){
    // Desktop-Scroll-Zoom
    ev.preventDefault();
    const old = _state.zoom;
    const fac = ev.deltaY<0 ? 1.1 : 0.9;
    const nz  = clamp(old*fac, _state.map?.minZoom ?? 0.5, _state.map?.maxZoom ?? 3);
    if (nz===old) return;

    const before = screenToWorld(ev.clientX, ev.clientY);
    _state.zoom  = nz;
    const cs     = screenToCanvasPx(ev.clientX, ev.clientY);
    _state.camX  = before.wx - (cs.sx / _state.zoom);
    _state.camY  = before.wy - (cs.sy / _state.zoom);
    clampCameraToMap();
    if (_state.map){ _state.map.zoom=_state.zoom; _state.map.camX=_state.camX; _state.map.camY=_state.camY; }
  }

  function onClick(ev){
    if(!_state.selectedBuilding) return;
    const wpos = screenToWorld(ev.clientX, ev.clientY);
    const gx   = snap(wpos.wx, _state.tile);
    const gy   = snap(wpos.wy, _state.tile);

    // Nur innerhalb der Karte bauen
    if (!inBoundsTile(gx, gy)) {
      // optional: (window.CBLog?.warn||console.warn)('[game] außerhalb der Map → ignoriert', {gx,gy});
      return;
    }

    _state.placements.push({ x:gx, y:gy, id:_state.selectedBuilding });
    log('placed', { id:_state.selectedBuilding, x:gx, y:gy });
  }

  // == Public API ============================================================
  function init(canvas){
    if(!canvas){ err('init: Canvas fehlt'); return; }
    _state.canvas = canvas;
    _state.ctx    = canvas.getContext('2d');

    // Mobile: Gesten an uns (Pan/Pinch)
    _state.canvas.style.touchAction = 'none';

    // Map (Runtime)
    const dbg = document.getElementById('debug-map'); // optional
    _state.map = new window.SiedlerMap(canvas, _state.ctx, dbg);

    // Kamera-Startwerte
    _state.camX = _state.map.camX ?? 0;
    _state.camY = _state.map.camY ?? 0;
    _state.zoom = _state.map.zoom ?? 1;

    // Units
    window.Units?.init?.(_state.ctx, _state.tile);

    // Events
    onResize();
    window.addEventListener('resize', onResize);

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup',   onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive:false });
    canvas.addEventListener('click', onClick);

    window.addEventListener('cb:build:select', (e)=>{
      _state.selectedBuilding = e?.detail?.id || null;
      log('select building', _state.selectedBuilding);
    });

    log('init ✓');
  }

  async function start(mapId){
    _state.mapId  = mapId || _state.mapId || 'data/maps/map-mini.json';
    _state.started = true;

    await loadMap(_state.mapId);
    await _state.map.loadMap(_state.mapId);
    _state.map.reload?.();

    // Kamera nach reload() spiegeln + clampen
    _state.camX = _state.map.camX ?? _state.camX;
    _state.camY = _state.map.camY ?? _state.camY;
    _state.zoom = _state.map.zoom ?? _state.zoom;
    onResize(); // setzt Size & clamped Cam

    // Demo: HQ-Carrier bis echter Startflow steht
    const HQpx  = { x: (_state.gridW*_state.tile)/2, y: (_state.gridH*_state.tile)/2 };
    const spawn = { x: HQpx.x - _state.tile*4, y: HQpx.y - _state.tile*2 };
    window.Units?.spawnCarrier?.(spawn, HQpx);

    cancelAnimationFrame(_state.rafId);
    _state.lastTs = 0;
    _state.rafId  = requestAnimationFrame(frame);

    EVT('cb:res:change', { ..._state.resources });
  }

  function getState(){
    const { started, mapId, tile, gridW, gridH, placements, selectedBuilding } = _state;
    return { started, mapId, tile, gridW, gridH, placements: placements.slice(), selectedBuilding };
  }
  function getResources(){ return { ..._state.resources }; }

  window.Game = { init, start, getState, getResources };
})();
