// ============================================================================
// Datei   : core/game.js
// Projekt : Neue Siedler
// Version : v1.5.0
// Zweck   : Spiel-Engine – Map laden/zeichnen, Placements, Units, Loop
// API     : Game.init(canvas), Game.start(mapId), Game.getState(), Game.getResources()
// Events  : cb:map:loaded    { mapId, tile, size:{w,h} }
//           cb:res:change    { ...resources }
//           cb:place:preview { id,gx,gy,sx,sy,size,invalid, w,h, door:{dx,dy} }
//           cb:place:confirm { id,gx,gy } (von UI)
//           cb:place:cancel  { }         (von UI)
// Notes   : Platzieren mit Preview+Confirm (✅/❌)
//           Platzierregeln: Bounds, 3×3-Footprint, Abstand 1, Terrainverbote (Wasser)
//           Icons aus Registry; Kamera-Clamp an Kartenrand
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
    placements: [],                 // { id, x, y, w, h, door:{dx,dy} } – x/y = Tile-Ursprung (oben links)
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

    // Icons (Registry)
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

// == Building-Definitionen (aus Registry) ===================================
// Wrapper: akzeptiert Registry-Format (size:[w,h], entrances:[[dx,dy],...])
function getBuildingDef(id){
  const raw = window.Registry?.getBuildingDef?.(id) || window.Registry?.byId?.(id) || null;

  // Defaults
  let w = 3, h = 3;
  let entrances = [[1,3]];             // falls 3x3 → Tür unten mittig (vor dem Gebäude)
  let door = { dx:1, dy:1 };           // erste Entrance als "Haupttür" für UI
  const blockedTerrains = ['water'];

  if (raw){
    if (Array.isArray(raw.size)) { w = +raw.size[0]||3; h = +raw.size[1]||3; }
    else if (raw.size && typeof raw.size === 'object') {
      w = +raw.size.w||3; h = +raw.size.h||3;
    }
    if (Array.isArray(raw.entrances) && raw.entrances.length){
      entrances = raw.entrances.map(e => [ (e[0]|0), (e[1]|0) ]);
    } else {
      entrances = [[ Math.floor(Math.max(1,w)-1), h ]]; // Fallback: unten mittig, vor dem Gebäude
    }
    door = { dx: entrances[0][0], dy: entrances[0][1] };
  }

  return {
    id: String(id),
    size: { w: Math.max(1, w|0), h: Math.max(1, h|0) },
    entrances,
    door,
    blockedTerrains
  };
}

  // == Platzier-/Bounds-Helper ==============================================
  function inBoundsTile(gx, gy){
    return gx >= 0 && gy >= 0 && gx < _state.gridW && gy < _state.gridH;
  }
  function inBoundsFootprint(gx, gy, w, h){
    return inBoundsTile(gx, gy) && inBoundsTile(gx + w - 1, gy + h - 1);
  }
  function isFree(gx, gy){ return !_state.occupied.has(keyXY(gx,gy)); }

  // Belegt ALLE Tiles des Footprints
  function occupyFootprint(g0, h0, w, h){
    for (let dy=0; dy<h; dy++){
      for (let dx=0; dx<w; dx++){
        _state.occupied.add(keyXY(g0+dx, h0+dy));
      }
    }
  }
  function rebuildOccupied(){
    _state.occupied.clear();
    for (const p of _state.placements){
      occupyFootprint(p.x, p.y, p.w, p.h);
    }
  }

  // Terraincheck via Map, wenn vorhanden
// helper: Terrain/Belegung für Footprint-Kacheln
function tileBlocked(gx, gy, def){
  if (!inBoundsTile(gx,gy)) return true;
  if (!isFree(gx,gy))       return true;
  if (isBlockedByTerrain(gx,gy,def)) return true;
  return false;
}

// ersetzt deine bisherige canPlaceAtFootprint(...)
function canPlaceAtFootprint(g0, h0, id){
  const def = getBuildingDef(id);
  const { w, h } = def.size;

  // 1) Bounds
  if (!inBoundsFootprint(g0, h0, w, h)) return false;

  // 2) Footprint: frei + kein verbotenes Terrain (z.B. Wasser)
  for (let dy=0; dy<h; dy++){
    for (let dx=0; dx<w; dx++){
      if (tileBlocked(g0+dx, h0+dy, def)) return false;
    }
  }

  // 3) Mindestabstand 1
  if (anyOccupiedWithinMargin(g0, h0, w, h, 1)) return false;

  // 4) Mindestens EINE Entrance erreichbar
  //    Achtung: dy==h bedeutet Kachel VOR dem Gebäude (unterer Rand) → hier nur Terrain prüfen.
  let entranceOk = false;
  for (const [dx,dy] of (def.entrances||[])){
    const ex = g0 + (dx|0);
    const ey = h0 + (dy|0);
    if (!inBoundsTile(ex,ey)) continue;
    if (!isBlockedByTerrain(ex,ey,def)) { entranceOk = true; break; }
  }
  if (!entranceOk) return false;

  return true;
}

  // Abstandsradius (Chebyshev-Distanz) um den Footprint
  function anyOccupiedWithinMargin(g0, h0, w, h, margin=1){
    for (let y=h0 - margin; y<=h0 + h - 1 + margin; y++){
      for (let x=g0 - margin; x<=g0 + w - 1 + margin; x++){
        // Innerer Bereich ist der Platz selbst → der wird in der Prüfung separat behandelt
        const isInside = (x>=g0 && y>=h0 && x<=g0+w-1 && y<=h0+h-1);
        if (!isInside){
          if (inBoundsTile(x,y) && _state.occupied.has(keyXY(x,y))) return true;
        }
      }
    }
    return false;
  }

  // **Zentrale Regelprüfung**
  function canPlaceAtFootprint(g0, h0, id){
    const def = getBuildingDef(id);
    const { w, h } = def.size;

    // 1) Bounds
    if (!inBoundsFootprint(g0, h0, w, h)) return false;

    // 2) Kollisionen im Footprint (frei?)
    for (let dy=0; dy<h; dy++){
      for (let dx=0; dx<w; dx++){
        const gx = g0 + dx, gy = h0 + dy;
        if (!isFree(gx,gy)) return false;
        if (isBlockedByTerrain(gx,gy,def)) return false;
      }
    }

    // 3) Abstand 1 rundherum
    if (anyOccupiedWithinMargin(g0, h0, w, h, 1)) return false;

    return true;
  }

  // == Kamera-Clamp ==========================================================
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

  // == Projektion ============================================================
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

  // == Icons (Registry) ======================================================
  function buildIconMap(){
    if (_state.iconMap) return _state.iconMap;
    const map = new Map();
    try{
      let list = window.Registry?.list?.('building') || window.Registry?.get?.('buildings');
      if (Array.isArray(list)){
        for (const b of list){
          const id   = String(b.id);
          const icon = b.icon || b.iconUrl || null;
          if (icon) map.set(id, icon);
        }
      }
    }catch(e){}
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
    const img = new Image();
    _state.imgCache.set(url, 'loading');
    img.onload = ()=>_state.imgCache.set(url, img);
    img.onerror= ()=>_state.imgCache.set(url, 'error');
    img.src = url;
    return null;
  }

  // == Rendering =============================================================
  function frame(ts){
    if(!_state.started) return;
    const {ctx,canvas,map}=_state; if(!ctx||!canvas) return;

    syncCamFromMap();
    const dt=_state.lastTs?Math.min(0.1,(ts-_state.lastTs)/1000):0;
    _state.lastTs=ts;

    // A) Map
    map?.draw();

    // B) Weltobjekte + Ghost
    ctx.save();
    drawGhost(ctx);
    drawPlacements(ctx);
    window.Units && drawUnitsWithProjection(ctx, dt);
    ctx.restore();

    _state.rafId = requestAnimationFrame(frame);
  }

  // -- Render-Helfer ---------------------------------------------------------
  function drawRect(ctx, sx, sy, w, h, ok){
    ctx.fillStyle   = ok ? 'rgba(120,200,120,.22)' : 'rgba(200,80,80,.22)';
    ctx.strokeStyle = ok ? 'rgba(120,200,120,.85)' : 'rgba(200,80,80,.9)';
    ctx.fillRect(sx,sy,w,h);
    ctx.strokeRect(sx+.5, sy+.5, w-1, h-1);
  }
  function drawIcon(ctx, img, sx, sy, s){
    const pad = Math.max(4, Math.floor(s*0.1));
    ctx.drawImage(img, sx+pad, sy+pad, s-2*pad, s-2*pad);
  }

  function drawPlacements(ctx){
    for(const p of _state.placements){
      const s = _state.tile * _state.zoom;
      const {sx,sy} = worldToScreen(p.x*_state.tile, p.y*_state.tile);

      // Footprint-Rahmen (dezent)
      drawRect(ctx, sx, sy, p.w*s, p.h*s, true);

      // Icon mittig auf Ursprungskachel
      const img = getIconImage(p.id);
      if (img){
        drawIcon(ctx, img, sx, sy, s);
      }
    }
  }

  function drawGhost(ctx){
    let gx=-1, gy=-1, id=_state.selectedBuilding;
    if (_state.preview){ gx=_state.preview.gx; gy=_state.preview.gy; id=_state.preview.id; }
    else if (id && inBoundsTile(_state.hover.x,_state.hover.y)){ gx=_state.hover.x; gy=_state.hover.y; }

    if (!inBoundsTile(gx,gy) || !id){
      if (_state.preview && !inBoundsTile(gx,gy)) EVT('cb:place:preview', { invalid:true });
      return;
    }

    const def = getBuildingDef(id);
    const s   = _state.tile * _state.zoom;
    const pos = worldToScreen(gx*_state.tile, gy*_state.tile);
    const ok  = canPlaceAtFootprint(gx, gy, id);

    // Footprint (komplett, grün/rot)
    drawRect(ctx, pos.sx, pos.sy, def.size.w*s, def.size.h*s, ok);

    // Icon auf Ursprungskachel
    const img = getIconImage(id);
    if (img){
      ctx.save();
      ctx.globalAlpha = ok ? 0.9 : 0.7;
      drawIcon(ctx, img, pos.sx, pos.sy, s);
      ctx.restore();
    }

    EVT('cb:place:preview', {
      id, gx, gy, sx:pos.sx, sy:pos.sy, size:s, invalid:!ok,
      w:def.size.w, h:def.size.h, door:{...def.door}
    });
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

      // akzeptiert size:[w,h] ODER rows/cols (kompatibel zu map-runtime.js)
      const w = Number((Array.isArray(json.size)? json.size[0] : json.cols));
      const h = Number((Array.isArray(json.size)? json.size[1] : json.rows));
      _state.gridW = w || _state.gridW;
      _state.gridH = h || _state.gridH;

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

      const ok = canPlaceAtFootprint(gx,gy,_state.selectedBuilding);
      if (!ok){
        _state.preview = null;
        EVT('cb:place:preview', { invalid:true });
      } else {
        _state.preview = { id:_state.selectedBuilding, gx, gy };
        const def = getBuildingDef(_state.selectedBuilding);
        const { sx, sy } = worldToScreen(gx*_state.tile, gy*_state.tile);
        EVT('cb:place:preview', {
          id:_state.preview.id, gx, gy, sx, sy, size: _state.tile * _state.zoom, invalid:false,
          w:def.size.w, h:def.size.h, door:{...def.door}
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
      _state.preview = null;
      EVT('cb:place:preview', { invalid:true });
      log('select building', _state.selectedBuilding);
    });

    // Confirm/Cancel von der UI (Serienbau aktiv)
    window.addEventListener('cb:place:confirm', (e)=>{
      const d = e.detail || {};
      if (_state.preview && d && d.gx===_state.preview.gx && d.gy===_state.preview.gy){
        const def = getBuildingDef(_state.preview.id);
        if (canPlaceAtFootprint(d.gx, d.gy, _state.preview.id)){
          _state.placements.push({ id:_state.preview.id, x:d.gx, y:d.gy, w:def.size.w, h:def.size.h, door:{...def.door} });
          occupyFootprint(d.gx, d.gy, def.size.w, def.size.h);
          log('placed ✓', { id:_state.preview.id, x:d.gx, y:d.gy, w:def.size.w, h:def.size.h });
        } else {
          warn('confirm: Position inzwischen unplazierbar');
        }
      }
      _state.preview = null;                       // Serienbau: Building bleibt selektiert
      EVT('cb:place:preview', { invalid:true });   // Buttons einklappen bis nächster Tap
    });

    window.addEventListener('cb:place:cancel', ()=>{
      _state.preview = null;
      _state.selectedBuilding = null;              // Baumodus verlassen
      EVT('cb:place:preview', { invalid:true });
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
