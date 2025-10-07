/* ============================================================================
 * Datei    : core/map-runtime.js
 * Projekt  : Neue Siedler
 * Version  : v1.2.1 (2025-10-07)
 * Zweck    : Karte rendern (Tileset-Atlas, Zoom/Pan, Retina-Resize) – robust
 *
 * Unterstützte Map-Formate (Normalisierung):
 *  [A] Eigenes Schema (wie map-test.json / map-mini.json):
 *      { width, height, tileSize, tileset:{image,atlas,alias?}, layers:[
 *          { name, type:"tiles", fill? , data? (len = w*h, number|string),
 *            runs? [ {x,y,w,h,token} ... ] }
 *        ] }
 *  [B] 2D tiles:  { width, height, tileSize, tiles:[[...],[...],...] }
 *  [C] Flat data: { w|width, h|height, ts|tileSize, data:[...] }
 *  [D] cells     : { cells:[[{type:'water'|'rock'|'grass'},...],...], tileSize }
 *
 * Events (emit):
 *  - cb:map:loaded   { ok:true, width, height, tilesize }
 *  - cb:map:fallback { reason:'no-json'|'bad-format'|'fetch-failed' }
 *
 * Externe Abhängigkeiten (optional):
 *  - core/zoom.js -> dispatch cb:zoom:change { scale }
 *
 * Changelog v1.2.1:
 *  - Retina-Resize (DPR) + Resize-Listener
 *  - Sichtfenster-Rendering (nur sichtbare Tiles)
 *  - Atlas-Renderer (PNG+JSON, tolerant für TexturePacker/Custom)
 *  - Fallback-Farben, wenn Token/Frame fehlt (keine „weiße“ Karte mehr)
 *  - Robust gegen 404 (loggt Warnung, rendert trotzdem farbig)
 * ============================================================================ */

(function(root, factory){
  root.MapRuntime = factory();
})(typeof window!=='undefined'?window:this, function(){

  // ---------------------------------------------------------------------------
  // [00] State / Utils
  // ---------------------------------------------------------------------------
  let _cv, _cx, _running = false, _anim = 0;
  let _map = null;               // { w,h,ts,layers[],tileset? }
  let _ts  = 32;                 // default tilesize
  let _view = { scale: 1, ox: 0, oy: 0 }; // Zoom+Pan (ox/oy in Tiles)

  function logOK (...a){ (window.CBLog?.ok    || console.log   )('[map]', ...a); }
  function logWarn(...a){ (window.CBLog?.warn  || console.warn )('[map]', ...a); }
  function logErr (...a){ (window.CBLog?.error || console.error)('[map]', ...a); }
  function emit(name, detail={}){ try{ window.dispatchEvent(new CustomEvent(name,{detail})); }catch(_){} }

  async function fetchJSON(url){
    const bust = (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    const res = await fetch(url + bust, { cache:'no-store' });
    if(!res.ok) throw new Error('HTTP '+res.status+' @ '+url);
    return await res.json();
  }
  async function loadImage(src){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload = ()=> resolve(img);
      img.onerror = ()=> reject(new Error('image load failed: '+src));
      img.src = src + (src.includes('?')?'&':'?') + 'v=' + Date.now();
    });
  }

  // Fallback-Mapping → Zahlencode für Farbrenderer
  function tokenToCode(tok){
    const t = (tok==null) ? '' : String(tok).toLowerCase();
    if (!t) return 1; // grass
    if (t.includes('water') || t.includes('sea') || t.includes('lake')) return 2;
    if (t.includes('rock')  || t.includes('mount')|| t.includes('ore') ) return 3;
    if (t.includes('sand')  || t.includes('beach')) return 4;
    if (t.includes('forest')|| t.includes('tree'))  return 5;
    if (t.includes('road')  || t.includes('path'))  return 6;
    return 1;
  }
  function colorFor(code){
    if (code===2) return '#2a6fdb'; // Wasser
    if (code===3) return '#7b7b7b'; // Stein
    if (code===4) return '#d0b077'; // Sand
    if (code===5) return '#246b29'; // Wald
    if (code===6) return '#9c7b49'; // Weg
    return '#2f7d32';               // Gras
  }

  // ---------------------------------------------------------------------------
  // [01] Normalisierung
  // ---------------------------------------------------------------------------
  function normalize(raw){
    // [A] Eigenes Schema: width/height/layers + optional tileset
    if (raw && typeof raw==='object' && Array.isArray(raw.layers) && (raw.width && raw.height)){
      const w = Number(raw.width), h = Number(raw.height);
      const ts = Number(raw.tileSize || raw.ts || 32);
      const layers = [];
      for (const L of raw.layers){
        if (!L || L.type !== 'tiles') continue;
        layers.push({
          name: String(L.name || ''),
          fill: (typeof L.fill === 'string') ? L.fill : null,
          data: (Array.isArray(L.data) && L.data.length) ? L.data.slice(0, w*h) : null,
          runs: (Array.isArray(L.runs) && L.runs.length) ? L.runs.slice() : null
        });
      }
      const tileset = raw.tileset ? { ...raw.tileset } : null;
      return { w, h, ts, layers, tileset };
    }
    // [B] 2D tiles
    if (raw && Array.isArray(raw.tiles) && Array.isArray(raw.tiles[0])) {
      const h = raw.tiles.length;
      const w = raw.tiles[0].length;
      const ts = Number(raw.tileSize || raw.ts || 32);
      const data = new Array(w*h);
      for(let y=0;y<h;y++) for(let x=0;x<w;x++) data[y*w+x] = raw.tiles[y][x];
      return { w, h, ts, layers:[{ name:'layer0', fill:null, data, runs:null }], tileset:null };
    }
    // [C] Flat data
    if (raw && Array.isArray(raw.data) && (raw.w||raw.width) && (raw.h||raw.height)) {
      const w = Number(raw.w || raw.width), h = Number(raw.h || raw.height);
      const ts = Number(raw.ts || raw.tileSize || 32);
      return { w, h, ts, layers:[{ name:'layer0', fill:null, data: raw.data.slice(0, w*h), runs:null }], tileset:null };
    }
    // [D] cells[type]
    if (raw && Array.isArray(raw.cells) && Array.isArray(raw.cells[0])) {
      const h = raw.cells.length;
      const w = raw.cells[0].length;
      const ts = Number(raw.tileSize || raw.ts || 32);
      const data = new Array(w*h);
      for(let y=0;y<h;y++) for(let x=0;x<w;x++){
        const cell = raw.cells[y][x];
        data[y*w+x] = (cell && (cell.type || cell.t)) || 'grass';
      }
      return { w, h, ts, layers:[{ name:'layer0', fill:null, data, runs:null }], tileset:null };
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // [02] Tileset-Atlas (optional)
  // ---------------------------------------------------------------------------
  let _atlas = { img:null, frames:null, alias:null };

  function indexFrames(rawFrames){
    // TexturePacker: { frames:{ key:{frame:{x,y,w,h}} } }
    if (!rawFrames) return null;
    if (Array.isArray(rawFrames)) {
      // [{filename,frame:{x,y,w,h}}, ...] → map
      const map = {};
      for (const f of rawFrames){
        if (f && f.filename) map[f.filename] = f.frame || f;
      }
      return map;
    }
    if (rawFrames.frames && typeof rawFrames.frames==='object') {
      const map = {};
      for (const k in rawFrames.frames){
        const f = rawFrames.frames[k];
        map[k] = f.frame || f;
      }
      return map;
    }
    // schon key->frame
    return rawFrames;
  }

  function resolveToken(token){
    if (!_atlas.frames) return null;
    const t = (typeof token==='string') ? token : String(token);
    const ali = (_atlas.alias && _atlas.alias[t]) ? _atlas.alias[t] : t;
    const f = _atlas.frames[ali];
    return f || null;
  }

  // ---------------------------------------------------------------------------
  // [03] View / Zoom / Pan / Retina
  // ---------------------------------------------------------------------------
  function tsPx(){ return (_map?.ts || _ts) * _view.scale; }
  function toScreenX(x){ return Math.floor((x - _view.ox) * tsPx()); }
  function toScreenY(y){ return Math.floor((y - _view.oy) * tsPx()); }

  function setView({ scale, ox, oy } = {}){
    if (typeof scale === 'number') _view.scale = Math.max(0.5, Math.min(3, scale));
    if (typeof ox === 'number')    _view.ox    = ox;
    if (typeof oy === 'number')    _view.oy    = oy;
  }
  function getView(){ return { ..._view }; }

  window.addEventListener('cb:zoom:change', (ev)=>{
    const s = ev?.detail?.scale;
    if (typeof s === 'number') setView({ scale: s });
  });

  function resizeCanvasToDPR(){
    if(!_cv) return;
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const rect = _cv.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    _cv.width  = Math.round(cssW * dpr);
    _cv.height = Math.round(cssH * dpr);
    _cx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize', resizeCanvasToDPR);

  // ---------------------------------------------------------------------------
  // [04] Rendering
  // ---------------------------------------------------------------------------
  function clearWhite(){
    _cx.save();
    _cx.fillStyle = '#ffffff';
    _cx.fillRect(0,0,_cv.width,_cv.height);
    _cx.restore();
  }

  function drawTile(token, sx, sy, size){
    if (_atlas.img && _atlas.frames){
      const fr = resolveToken(token);
      if (fr){
        const fx = fr.x ?? 0, fy = fr.y ?? 0, fw = fr.w ?? size, fh = fr.h ?? size;
        _cx.drawImage(_atlas.img, fx, fy, fw, fh, sx, sy, size, size);
        return;
      }
    }
    // Fallback – farbig
    const code = tokenToCode(token);
    _cx.fillStyle = colorFor(code);
    _cx.fillRect(sx, sy, size, size);
  }

  function drawLayerFill(token, minX, minY, maxX, maxY, tpx){
    for(let y=minY; y<=maxY; y++){
      for(let x=minX; x<=maxX; x++){
        drawTile(token, toScreenX(x), toScreenY(y), tpx);
      }
    }
  }
  function drawLayerData(data, minX, minY, maxX, maxY, tpx, w){
    for(let y=minY; y<=maxY; y++){
      const row = y*w;
      for(let x=minX; x<=maxX; x++){
        const token = data[row + x];
        if (token==null) continue;
        drawTile(token, toScreenX(x), toScreenY(y), tpx);
      }
    }
  }
  function drawLayerRuns(runs, minX, minY, maxX, maxY, tpx){
    for (const r of runs){
      const x0 = Math.max(minX, r.x|0);
      const y0 = Math.max(minY, r.y|0);
      const x1 = Math.min(maxX, (r.x|0)+(r.w|0)-1);
      const y1 = Math.min(maxY, (r.y|0)+(r.h|0)-1);
      if (x1 < x0 || y1 < y0) continue;
      for (let y=y0; y<=y1; y++){
        for (let x=x0; x<=x1; x++){
          drawTile(r.token, toScreenX(x), toScreenY(y), tpx);
        }
      }
    }
  }

  function drawFallback(){
    const tpx = tsPx();
    _cx.save();
    _cx.fillStyle = '#2f7d32';
    _cx.fillRect(0,0,_cv.width,_cv.height);
    _cx.globalAlpha = 0.08; _cx.strokeStyle = '#000';
    for(let x=0;x<=_cv.width;x+=tpx){ _cx.beginPath(); _cx.moveTo(x,0); _cx.lineTo(x,_cv.height); _cx.stroke(); }
    for(let y=0;y<=_cv.height;y+=tpx){ _cx.beginPath(); _cx.moveTo(0,y); _cx.lineTo(_cv.width,y); _cx.stroke(); }
    _cx.restore();
  }

  function drawMap(){
    const { w, h, layers } = _map;
    const tpx = tsPx();

    // Sichtfenster
    const minX = Math.max(0, Math.floor(_view.ox));
    const minY = Math.max(0, Math.floor(_view.oy));
    const maxX = Math.min(w-1, Math.ceil(_view.ox + _cv.width  / tpx));
    const maxY = Math.min(h-1, Math.ceil(_view.oy + _cv.height / tpx));

    // Hintergrund
    _cx.save();
    _cx.fillStyle = '#2f7d32';
    _cx.fillRect(0,0,_cv.width,_cv.height);

    for (const L of layers){
      if (L.fill) drawLayerFill(L.fill, minX, minY, maxX, maxY, tpx);
      if (L.data) drawLayerData(L.data, minX, minY, maxX, maxY, tpx, w);
      if (L.runs) drawLayerRuns(L.runs, minX, minY, maxX, maxY, tpx);
    }

    // Raster
    _cx.globalAlpha = 0.06; _cx.strokeStyle = '#000';
    for(let x=minX; x<=maxX+1; x++){ const sx = toScreenX(x); _cx.beginPath(); _cx.moveTo(sx,0); _cx.lineTo(sx,_cv.height); _cx.stroke(); }
    for(let y=minY; y<=maxY+1; y++){ const sy = toScreenY(y); _cx.beginPath(); _cx.moveTo(0,sy); _cx.lineTo(_cv.width,sy); _cx.stroke(); }

    _cx.restore();
  }

  // ---------------------------------------------------------------------------
  // [05] Loop / API
  // ---------------------------------------------------------------------------
  function loop(t){
    if(!_running) return;
    _anim = t;
    clearWhite();
    if(_map) drawMap(); else drawFallback();
    requestAnimationFrame(loop);
  }

  async function init(canvasId='game', loader=fetchJSON){
    _cv = document.getElementById(canvasId);
    if(!_cv) throw new Error('[MapRuntime] canvas #'+canvasId+' fehlt');
    _cx = _cv.getContext('2d', { alpha:false });

    // Erstes Retina-Resize und danach bei Änderungen
    resizeCanvasToDPR();

    const url = _cv.getAttribute('data-map');
    if(!url){ emit('cb:map:fallback', { reason:'no-json' }); return; }

    try{
      const raw  = await loader(url);
      const norm = normalize(raw);
      if(!norm){ emit('cb:map:fallback', { reason:'bad-format' }); return; }

      // Tileset laden (optional)
      _atlas = { img:null, frames:null, alias:null };
      if (norm.tileset && (norm.tileset.image || norm.tileset.atlas)){
        try{
          if (norm.tileset.atlas){
            const atlasRaw = await loader(norm.tileset.atlas);
            _atlas.frames = indexFrames(atlasRaw);
          }
          if (norm.tileset.image){
            _atlas.img = await loadImage(norm.tileset.image);
          }
          _atlas.alias = norm.tileset.alias || null;
          logOK('tileset ok');
        }catch(e){
          logWarn('tileset load failed → farbiges Fallback', e?.message||e);
        }
      }

      _map = { w:norm.w, h:norm.h, ts:(norm.ts||_ts), layers:norm.layers };
      _ts  = _map.ts;

      emit('cb:map:loaded', { ok:true, width:_map.w, height:_map.h, tilesize:_map.ts });
    }catch(e){
      emit('cb:map:fallback', { reason:'fetch-failed', message: e?.message||String(e) });
      logErr('map fetch failed', e);
    }
  }

  function start(){ if(_running) return; _running = true; requestAnimationFrame(loop); }
  function stop(){ _running = false; }

  // Public
  return { init, start, stop, setView, getView };
});
