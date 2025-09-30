// ============================================================================
// Datei   : core/game.js
// Projekt : Neue Siedler
// Version : v1.4.1
// Zweck   : Spiel-Engine – Map laden/zeichnen, Placements, Units, Loop
// API     : Game.init(canvas), Game.start(mapId), Game.getState(), Game.getResources()
// Events  : cb:map:loaded   { mapId, tile, size:{w,h} }
//           cb:res:change   { ...resources }
//           cb:place:preview{ id,gx,gy,sx,sy,size,invalid }
//           cb:place:confirm{ id,gx,gy } (von UI)
//           cb:place:cancel { }         (von UI)
// Notes   : Platzieren mit Preview+Confirm (✅/❌), Exit bei Cancel/Confirm,
//           Platzierprüfung (Map-Bounds + Kollision), Icons über Registry
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
    occupied : new Set(),           // "x,y" → schnell prüfen ob belegt
    hover: { x:-1, y:-1 },          // Tile unter Cursor
    selectedBuilding: null,         // aktuell gewählter Gebäudetyp
    preview: null,                  // { id,gx,gy } – wartet auf ✅/❌

    // Ressourcen
    resources: { wood:0, stone:0, food:0, gold:0, pop:0 },

    // Map / Kamera / Loop
    map  : null,
    camX : 0,
    camY : 0,
    zoom : 1,
    rafId: 0, lastTs: 0,

    // Eingaben
    panActive: false,
    panStart : { x:0, y:0, camX:0, camY:0 },

    // Pinch
    pointers: new Map(),            // pointerId -> {x,y}
    pinch   : { active:false, d0:1, zoom0:1, center:{x:0,y:0} },

    // Tap-Tracking (für Preview)
    tapStart: { x:0, y:0 },

    // Icon-Cache
    iconMap : null,                 // id -> url
    imgCache: new Map(),            // url -> HTMLImageElement | 'loading' | 'error'
  };

  // == Utils / Events ========================================================
  const log  = (...a)=>(window.CBLog?.ok  || console.log)('[game]', ...a);
  const warn = (...a)=>(window.CBLog?.warn|| console.warn)('[game]', ...a);
  const err  = (...a)=>(window.CBLog?.err || console.error)('[game]', ...a);
  const EVT  = (n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}));

  const clamp = (v,mi,ma)=>Math.min(ma,Math.max(mi,v));
  const snap  = (v,s)=>Math.floor(v/s);
  const EPS   = 1e-6;

  const keyXY = (x,y)=>`${x},${y}`;

  // -- Platzier-/Bounds-Helper ----------------------------------------------
  function inBoundsTile(gx, gy){
    return gx >= 0 && gy >= 0 && gx < _state.gridW && gy < _state.gridH;
  }
  function isFree(gx, gy){
    return !_state.occupied.has(keyXY(gx,gy));
  }
  function canPlaceAt(gx, gy, id){
    if (!inBoundsTile(gx,gy)) return false;
    if (!isFree(gx,gy))       return false;
    // optional Map-spezifische Prüfung
    try{
      if (_state.map?.canPlace && !_state.map.canPlace(gx,gy,id)) return false;
    }catch(e){ /* defensiv: ignoriere Fehler */ }
    return true;
  }

  function occupy(gx,gy){ _state.occupied.add(keyXY(gx,gy)); }
  function rebuildOccupied(){
    _state.occupied.clear();
    for (const p of _state.placements) occupy(p.x,p.y);
  }

  // -- Kamera-Clamp ----------------------------------------------------------
  function clampCameraToMap(){
    const worldW = _state.gridW * _state.tile;
    const worldH = _state.gridH * _state.tile;
    const viewW  = _state.w / Math.max(EPS, _state.zoom);
    const viewH  = _state.h / Math.max(EPS, _state.zoom);

    let maxX = worldW - viewW;
    let maxY = worldH - viewH;
    if (Math.abs(maxX) < EPS) maxX = 0;
    if (Math.abs(maxY) < EPS) maxY = 0;

    if (maxX < 0){ _state.camX = (worldW - viewW)*.5; } else { _state.camX = clamp(_state.camX, 0, maxX); }
    if (maxY < 0){ _state.camY = (worldH - viewH)*.5; } else { _state.camY = clamp(_state.camY, 0, maxY); }

    if (_state.map){ _state.map.camX=_state.camX; _state.map.camY=_state.camY; }
  }

  // -- Projektion ------------------------------------------------------------
  function screenToCanvasPx(clientX, clientY){
    const c=_state.canvas, r=c.getBoundingClientRect();
    return { sx:(clientX-r.left)*(c.width/r.width), sy:(clientY-r.top)*(c.height/r.height) };
  }
  function screenToWorld(clientX, clientY){
    const {sx,sy}=screenToCanvasPx(clientX,clientY);
    return { wx: sx/_state.zoom + _state.camX, wy: sy/_state.zoom + _state.camY };
  }
  function worldToScreen(wx, wy){
    return { sx:(wx-_state.camX)*_state.zoom, sy:(wy-_state.camY)*_state.zoom };
  }
  function syncCamFromMap(){
    const m=_state.map; if(!m) return;
    if (typeof m.camX==='number') _state.camX=m.camX;
    if (typeof m.camY==='number') _state.camY=m.camY;
    if (typeof m.zoom==='number') _state.zoom=m.zoom;
    clampCameraToMap();
  }

  // -- Icons (Registry) ------------------------------------------------------
  function buildIconMap(){
    if (_state.iconMap) return _state.iconMap;
    const map = new Map();
    try{
      // bevorzugt: Registry.list('building')
      let list = window.Registry?.list?.('building');
      if (!Array.isArray(list)){
        // Fallback: Registry.get('buildings')
        list = window.Registry?.get?.('buildings');
      }
      if (Array.isArray(list)){
        for (const b of list){
          const id   = String(b.id);
          const icon = b.icon || b.iconUrl || null; // laut Monolith: normalisiert
          if (icon) map.set(id, icon);
        }
      }
    }catch(e){ /* egal */ }
    _state.iconMap = map;
    return map;
  }
  function getIconUrl(id){
    const map = buildIconMap();
    return map.get(id) || null;
  }
  function getIconImage(id){
    const url = getIconUrl(id);
    if (!url) return null;
    const c = _state.imgCache.get(url);
    if (c && c instanceof HTMLImageElement) return c;
    if (c === 'loading' || c === 'error') return null;

    // Laden starten
    const img = new Image();
    _state.imgCache.set(url, 'loading');
    img.onload = ()=>_state.imgCache.set(url, img);
    img.onerror= ()=>_state.imgCache.set(url, 'error');
    img.src = url;
    return null; // beim nächsten Frame verfügbar
  }

  // == Rendering =============================================================
  function frame(ts){
    if(!_state.started) return;
    const {ctx,canvas,map}=_state; if(!ctx||!canvas) return;

    syncCamFromMap();
    const dt=_state.lastTs?Math.min(0.1,(ts-_state.lastTs)/1000):0;
    _state.lastTs=ts;

    // Map
    map?.draw();

    // Weltobjekte + Ghost
    ctx.save();
    drawGhost(ctx);
    drawPlacements(ctx);
    window.Units && drawUnitsWithProjection(ctx, dt);
    ctx.restore();

    _state.rafId = requestAnimationFrame(frame);
  }

  function drawRectTile(ctx, sx, sy, s, ok){
    if (ok){
      ctx.fillStyle = 'rgba(120,200,120,.28)';
      ctx.strokeStyle = 'rgba(120,200,120,.85)';
    }else{
      ctx.fillStyle = 'rgba(200,80,80,.28)';
      ctx.strokeStyle = 'rgba(200,80,80,.9)';
    }
    ctx.fillRect(sx,sy,s,s);
    ctx.strokeRect(sx+.5, sy+.5, s-1, s-1);
  }

  function drawIcon(ctx, img, sx, sy, s){
    // Icon mittig im Tile, mit kleinem Margin
    const pad = Math.max(4, Math.floor(s*0.1));
    const w = s - pad*2;
    const h = s - pad*2;
    ctx.drawImage(img, sx+pad, sy+pad, w, h);
  }

  function drawPlacements(ctx){
    const s = _state.tile * _state.zoom;
    for(const p of _state.placements){
      const {sx,sy} = worldToScreen(p.x*_state.tile, p.y*_state.tile);
      const img = getIconImage(p.id);
      if (img) {
        drawIcon(ctx, img, sx, sy, s);
      } else {
        // bis Icon geladen ist: dezente Kachel
        drawRectTile(ctx, sx, sy, s, true);
      }
    }
  }

  function drawGhost(ctx){
    const s  = _state.tile * _state.zoom;
    let gx=-1, gy=-1, id=_state.selectedBuilding;

    if (_state.preview){ gx=_state.preview.gx; gy=_state.preview.gy; id=_state.preview.id; }
    else if (id && inBoundsTile(_state.hover.x,_state.hover.y)){
      gx=_state.hover.x; gy=_state.hover.y;
    }
    if (!inBoundsTile(gx,gy) || !id) {
      // UI ggf. verstecken, wenn Preview aktiv aber jetzt ungültig
      if (_state.preview && !inBoundsTile(gx,gy)) EVT('cb:place:preview', { invalid:true });
      return;
    }

    const {sx,sy} = worldToScreen(gx*_state.tile, gy*_state.tile);
    const ok = canPlaceAt(gx,gy,id);

    // Ghost mit Icon (halbtransparent) oder Quadrat
    const img = getIconImage(id);
    ctx.save();
    ctx.globalAlpha = ok ? 0.85 : 0.6;
    if (img) drawIcon(ctx, img, sx, sy, s);
    else     drawRectTile(ctx, sx, sy, s, ok);
    ctx.restore();

    // Buttons nur anzeigen, wenn Platzierung gültig ist
    EVT('cb:place:preview', { id, gx, gy, sx, sy, size: s, invalid: !ok });
  }

  function drawUnitsWithProjection(ctx, dt){
    window.Units?.update?.(dt, { zoom:_state.zoom, camX:_state.camX, camY:_state.camY });
    window.Units?.drawProjected?.(ctx, (wx,wy)=>worldToScreen(wx,wy));
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

  // == Inputs (Resize / Pan / Pinch / Zoom / Preview-Tap) ====================
  function onResize(){
    const c=_state.canvas; if(!c) return;
    _state.w = (c.width  = c.clientWidth  || c.width);
    _state.h = (c.height = c.clientHeight || c.height);
    _state.map?.setSize(_state.w,_state.h);

    if (_state.map){
      _state.camX = _state.map.camX ?? _state.camX;
      _state.camY = _state.map.camY ?? _state.camY;
      _state.zoom = _state.map.zoom ?? _state.zoom;
      clampCameraToMap();
    }
  }

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

    if (_state.pointers.size===2 && tryStartPinch()) return;

    if (_state.selectedBuilding){
      _state.tapStart.x = ev.clientX;
      _state.tapStart.y = ev.clientY;
      _state.panActive  = false;
    } else if (!_state.pinch.active){
      _state.panActive = true;
      _state.canvas.setPointerCapture?.(ev.pointerId);
      _state.panStart = { x:ev.clientX, y:ev.clientY, camX:_state.camX, camY:_state.camY };
    }
  }

  function onPointerMove(ev){
    rememberPointer(ev);

    // Hover (nur innerhalb der Map)
    {
      const wpos = screenToWorld(ev.clientX, ev.clientY);
      const gx = snap(wpos.wx, _state.tile);
      const gy = snap(wpos.wy, _state.tile);
      if (inBoundsTile(gx, gy)) { _state.hover.x=gx; _state.hover.y=gy; }
      else                      { _state.hover.x=-1; _state.hover.y=-1; }
    }

    // Pinch
    if (_state.pinch.active && _state.pointers.size===2){
      const [a,b] = [..._state.pointers.values()];
      const dist  = Math.hypot(a.x-b.x, a.y-b.y);
      const factor= dist / Math.max(1,_state.pinch.d0);
      const newZ  = clamp(_state.pinch.zoom0 * factor, _state.map?.minZoom ?? 0.5, _state.map?.maxZoom ?? 3);

      const before = screenToWorld(_state.pinch.center.x, _state.pinch.center.y);
      _state.zoom  = newZ;
      const cs     = screenToCanvasPx(_state.pinch.center.x, _state.pinch.center.y);
      _state.camX  = before.wx - (cs.sx / _state.zoom);
      _state.camY  = before.wy - (cs.sy / _state.zoom);

      clampCameraToMap();
      if (_state.map){ _state.map.zoom=_state.zoom; _state.map.camX=_state.camX; _state.map.camY=_state.camY; }
      return;
    }

    // Pan
    if (_state.panActive && !_state.selectedBuilding){
      const dx = (ev.clientX - _state.panStart.x) / Math.max(EPS,_state.zoom);
      const dy = (ev.clientY - _state.panStart.y) / Math.max(EPS,_state.zoom);
      _state.camX = _state.panStart.camX - dx;
      _state.camY = _state.panStart.camY - dy;
      clampCameraToMap();
      if (_state.map){ _state.map.camX=_state.camX; _state.map.camY=_state.camY; }
    }
  }

  function onPointerUp(ev){
    const wasPlacing = !!_state.selectedBuilding;
    const wasPinch   = _state.pinch.active;

    forgetPointer(ev);

    // Tap-Schwelle
    const moved = Math.hypot(ev.clientX - _state.tapStart.x, ev.clientY - _state.tapStart.y);
    const isTap = moved < 8;

    // Preview erzeugen (fixieren), nicht sofort bauen
    if (wasPlacing && !wasPinch && isTap){
      const wpos = screenToWorld(ev.clientX, ev.clientY);
      const gx   = snap(wpos.wx, _state.tile);
      const gy   = snap(wpos.wy, _state.tile);

      const ok = canPlaceAt(gx,gy,_state.selectedBuilding);
      if (!ok){
        _state.preview = null;
        EVT('cb:place:preview', { invalid:true });
      } else {
        _state.preview = { id:_state.selectedBuilding, gx, gy };
        const { sx, sy } = worldToScreen(gx*_state.tile, gy*_state.tile);
        EVT('cb:place:preview', {
          id:_state.preview.id, gx, gy, sx, sy, size: _state.tile * _state.zoom, invalid:false
        });
      }
    }

    _state.panActive = false;
  }

  function onWheel(ev){
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

  // == Public API ============================================================
  function init(canvas){
    if(!canvas){ err('init: Canvas fehlt'); return; }
    _state.canvas = canvas;
    _state.ctx    = canvas.getContext('2d');

    // Mobile/Safari: Gesten an uns
    _state.canvas.style.touchAction = 'none';
    _state.canvas.addEventListener('touchstart', (e)=>e.preventDefault(), {passive:false});
    _state.canvas.addEventListener('touchmove',  (e)=>e.preventDefault(), {passive:false});
    _state.canvas.addEventListener('touchend',   (e)=>e.preventDefault(), {passive:false});

    // Map (Runtime)
    const dbg = document.getElementById('debug-map'); // optional
    _state.map = new window.SiedlerMap(canvas, _state.ctx, dbg);

    // Kamera-Start
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

    // Auswahl aus Baumenü
    window.addEventListener('cb:build:select', (e)=>{
      _state.selectedBuilding = e?.detail?.id || null;
      _state.preview = null;                           // alte Preview verwerfen
      EVT('cb:place:preview', { invalid:true });      // UI verstecken
      log('select building', _state.selectedBuilding);
    });

    // Confirm/Cancel von der UI
    window.addEventListener('cb:place:confirm', (e)=>{
      const d = e.detail || {};
      if (_state.preview && d && d.gx===_state.preview.gx && d.gy===_state.preview.gy){
        // Safety: kann sich in der Zwischenzeit was geändert haben?
        if (canPlaceAt(d.gx, d.gy, _state.preview.id)){
          _state.placements.push({ x:d.gx, y:d.gy, id:_state.preview.id });
          occupy(d.gx, d.gy);
          log('placed ✓', { id:_state.preview.id, x:d.gx, y:d.gy });
        } else {
          warn('confirm: Position inzwischen unplazierbar');
        }
      }
      _state.preview = null;
      _state.selectedBuilding = null;                 // <<< Baumodus verlassen
      EVT('cb:place:preview', { invalid:true });      // UI schließen
    });

    window.addEventListener('cb:place:cancel', ()=>{
      _state.preview = null;
      _state.selectedBuilding = null;                 // <<< Baumodus verlassen
      EVT('cb:place:preview', { invalid:true });      // UI schließen
      log('place canceled');
    });

    log('init ✓');
  }

  async function start(mapId){
    _state.mapId  = mapId || _state.mapId || 'data/maps/map-mini.json';
    _state.started = true;

    await loadMap(_state.mapId);
    await _state.map.loadMap(_state.mapId);
    _state.map.reload?.();

    _state.camX = _state.map.camX ?? _state.camX;
    _state.camY = _state.map.camY ?? _state.camY;
    _state.zoom = _state.map.zoom ?? _state.zoom;
    onResize();

    // falls Placements aus Savegame: Occupied aufbauen
    rebuildOccupied();

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
