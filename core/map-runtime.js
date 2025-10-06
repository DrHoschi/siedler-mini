/* ============================================================================
 * Datei    : core/map-runtime.js
 * Projekt  : Neue Siedler
 * Version  : v1.1.0 (2025-10-06)
 * Zweck    : Sichtbare Karte rendern (leichtgewichtig, tolerant) + Zoom
 *
 * Unterstützte Formate (Normalisierung):
 *  [A] Dein Schema (wie map-mini.json):
 *      { width, height, tileSize, tileset, layers:[ {name,type:"tiles", fill? , data?}, ... ] }
 *      - "fill": string-Token (z.B. "terrain_r4_c0") → ganzer Layer mit einem Terrain-Typ
 *      - "data": array (optional); wenn Länge = width*height: pro Tile ein Token/Code/ID
 *
 *  [B] 2D tiles:  { width, height, tileSize, tiles:[[...],[...],...] }
 *  [C] Flat data: { w|width, h|height, ts|tileSize, data:[...] }
 *  [D] cells:     { cells:[[{type:'water'|'rock'|'grass'},...],...], tileSize }
 *
 * Rendering:
 *  - einfache Farbflächen pro Tile-Code (keine Sprites), dezentes Raster
 *  - Codes: 0/1=Grass, 2=Water, 3=Rock, 4=Sand, 5=Forest (heuristisch)
 *
 * Zoom/Pan:
 *  - Öffentliche API: MapRuntime.setView({scale,ox,oy}), MapRuntime.getView()
 *  - Hört auf cb:zoom:change (falls core/zoom.js verwendet wird)
 *
 * Events:
 *  - cb:map:loaded   { ok:true, width, height, tilesize }
 *  - cb:map:fallback { reason:'no-json'|'bad-format'|'fetch-failed' }
 * ============================================================================ */

(function(root, factory){
  root.MapRuntime = factory();
})(typeof window!=='undefined'?window:this, function(){

  // [00] State ----------------------------------------------------------------
  let _cv, _cx, _anim = 0, _running = false;
  let _ts = 32;           // default tile size (px)
  let _map = null;        // { w,h,ts,data:Int16Array }
  let _view = { scale: 1, ox: 0, oy: 0 }; // Zoom + Pan (Offsets in Tiles)

  // [01] Utils ----------------------------------------------------------------
  function emit(name, detail={}){ try{ window.dispatchEvent(new CustomEvent(name,{detail})); }catch(_){} }

  async function fetchJSON(url){
    const bust = (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    const res = await fetch(url + bust, { cache:'no-store' });
    if(!res.ok) throw new Error('HTTP '+res.status+' @ '+url);
    return await res.json();
  }

  // Terrain-Token → Code (heuristisch; passe gerne an dein Tileset an)
  function tokenToCode(tok){
    if(!tok || typeof tok!=='string') return 1; // grass
    const t = tok.toLowerCase();
    if (t.includes('water') || t.includes('sea') || t.includes('lake')) return 2;
    if (t.includes('rock')  || t.includes('mount')|| t.includes('ore') ) return 3;
    if (t.includes('sand')  || t.includes('beach')) return 4;
    if (t.includes('forest')|| t.includes('tree'))  return 5;
    return 1; // default grass
  }

  // [02] Normalisierung -------------------------------------------------------
  function normalize(raw){
    // === [A] Dein Schema =====================================================
    if (raw && typeof raw==='object' && Array.isArray(raw.layers) && (raw.width && raw.height)){
      const w = Number(raw.width), h = Number(raw.height);
      const ts = Number(raw.tileSize || raw.ts || 32);
      const data = new Int16Array(w*h); // Basis: grass

      // Layer "ground" suchen (oder ersten tiles-Layer verwenden)
      let ground = raw.layers.find(l => l && l.type==='tiles' && (l.name==='ground' || l.fill || l.data));
      if(!ground){
        ground = raw.layers.find(l => l && l.type==='tiles');
      }
      if (ground){
        // (A1) fill → ganzer Layer einheitlich
        if (typeof ground.fill === 'string'){
          const code = tokenToCode(ground.fill);
          for(let i=0;i<data.length;i++) data[i] = code;
        }
        // (A2) data → per Tile
        if (Array.isArray(ground.data) && ground.data.length){
          const len = Math.min(ground.data.length, data.length);
          for(let i=0;i<len;i++){
            const v = ground.data[i];
            // Zahlen direkt übernehmen, Strings über Token-Heuristik abbilden
            data[i] = (typeof v === 'number') ? v : tokenToCode(String(v));
          }
        }
      }
      return { w, h, ts, data };
    }

    // === [B] 2D tiles ========================================================
    if (raw && Array.isArray(raw.tiles) && Array.isArray(raw.tiles[0])) {
      const h = raw.tiles.length;
      const w = raw.tiles[0].length;
      const ts = Number(raw.tileSize || raw.ts || 32);
      const flat = new Int16Array(w*h);
      for(let y=0;y<h;y++) for(let x=0;x<w;x++) flat[y*w+x] = Number(raw.tiles[y][x]||0);
      return { w, h, ts, data: flat };
    }

    // === [C] Flat data =======================================================
    if (raw && Array.isArray(raw.data) && (raw.w||raw.width) && (raw.h||raw.height)) {
      const w = Number(raw.w || raw.width), h = Number(raw.h || raw.height);
      const ts = Number(raw.ts || raw.tileSize || 32);
      const flat = new Int16Array(w*h);
      for(let i=0;i<flat.length && i<raw.data.length;i++){
        const v = raw.data[i];
        flat[i] = (typeof v === 'number') ? v : tokenToCode(String(v));
      }
      return { w, h, ts, data: flat };
    }

    // === [D] cells[type] =====================================================
    if (raw && Array.isArray(raw.cells) && Array.isArray(raw.cells[0])) {
      const h = raw.cells.length;
      const w = raw.cells[0].length;
      const ts = Number(raw.tileSize || raw.ts || 32);
      const flat = new Int16Array(w*h);
      for(let y=0;y<h;y++) for(let x=0;x<w;x++){
        const cell = raw.cells[y][x];
        flat[y*w+x] = tokenToCode(cell && (cell.type || cell.t));
      }
      return { w, h, ts, data: flat };
    }

    return null;
  }

  // [03] View/Zoom/Pan --------------------------------------------------------
  function tsPx(){ return (_map?.ts || _ts) * _view.scale; }          // TileSize in Pixel inkl. Zoom
  function toScreenX(x){ return Math.floor((x - _view.ox) * tsPx()); } // Tile→Screen
  function toScreenY(y){ return Math.floor((y - _view.oy) * tsPx()); }

  function setView({ scale, ox, oy } = {}){
    if (typeof scale === 'number') _view.scale = Math.max(0.5, Math.min(3, scale));
    if (typeof ox === 'number')    _view.ox    = ox;
    if (typeof oy === 'number')    _view.oy    = oy;
  }
  function getView(){ return { ..._view }; }

  // Reagiere auf globalen Zoom (optional)
  window.addEventListener('cb:zoom:change', (ev)=>{
    const s = ev?.detail?.scale;
    if (typeof s === 'number') setView({ scale: s });
  });

  // [04] Rendering ------------------------------------------------------------
  function clearWhite(){
    _cx.save();
    _cx.fillStyle = '#ffffff';
    _cx.fillRect(0,0,_cv.width,_cv.height);
    _cx.restore();
  }

  function drawFallback(){
    const tpx = tsPx();
    _cx.save();
    _cx.fillStyle = '#2f7d32'; // grün
    _cx.fillRect(0,0,_cv.width,_cv.height);

    _cx.globalAlpha = 0.08;
    _cx.strokeStyle = '#000';
    for(let x=0;x<=_cv.width;x+=tpx){ _cx.beginPath(); _cx.moveTo(x,0); _cx.lineTo(x,_cv.height); _cx.stroke(); }
    for(let y=0;y<=_cv.height;y+=tpx){ _cx.beginPath(); _cx.moveTo(0,y); _cx.lineTo(_cv.width,y); _cx.stroke(); }
    _cx.restore();
  }

  function colorFor(code){
    // einfache Palette (passe gern an)
    if (code===2) return '#2a6fdb'; // Wasser
    if (code===3) return '#7b7b7b'; // Stein
    if (code===4) return '#d0b077'; // Sand
    if (code===5) return '#246b29'; // Wald
    return '#2f7d32';               // Grass
  }

  function drawMap(){
    const { w, h, data } = _map;
    _cx.save();

    // Hintergrund (Grass)
    _cx.fillStyle = '#2f7d32';
    _cx.fillRect(0,0,_cv.width,_cv.height);

    const tpx = tsPx();
    // Sichtbares Fenster grob bestimmen (Performance bei großen Maps)
    const minX = Math.max(0, Math.floor(_view.ox));
    const minY = Math.max(0, Math.floor(_view.oy));
    const maxX = Math.min(w-1, Math.ceil(_view.ox + _cv.width  / tpx));
    const maxY = Math.min(h-1, Math.ceil(_view.oy + _cv.height / tpx));

    for(let y=minY; y<=maxY; y++){
      for(let x=minX; x<=maxX; x++){
        const code = data[y*w+x]|0;
        if (code<=1) continue; // Grass/Hintergrund
        _cx.fillStyle = colorFor(code);
        _cx.fillRect(toScreenX(x), toScreenY(y), tpx, tpx);
      }
    }

    // Raster
    _cx.globalAlpha = 0.06;
    _cx.strokeStyle = '#000';
    // vertikal
    for(let x=minX; x<=maxX+1; x++){
      const sx = toScreenX(x);
      _cx.beginPath(); _cx.moveTo(sx,0); _cx.lineTo(sx,_cv.height); _cx.stroke();
    }
    // horizontal
    for(let y=minY; y<=maxY+1; y++){
      const sy = toScreenY(y);
      _cx.beginPath(); _cx.moveTo(0,sy); _cx.lineTo(_cv.width,sy); _cx.stroke();
    }

    _cx.restore();
  }

  // [05] Loop -----------------------------------------------------------------
  function loop(t){
    if(!_running){ return; }
    _anim = t;
    clearWhite();
    if(_map) drawMap();
    else drawFallback();
    requestAnimationFrame(loop);
  }

  // [06] Public API -----------------------------------------------------------
  async function init(canvasId='game', loader=fetchJSON){
    _cv = document.getElementById(canvasId);
    if(!_cv){ throw new Error('[MapRuntime] canvas #'+canvasId+' fehlt'); }
    _cx = _cv.getContext('2d', { alpha:false });

    const url = _cv.getAttribute('data-map');
    if(!url){
      emit('cb:map:fallback', { reason:'no-json' });
      return;
    }
    try{
      const raw  = await loader(url);
      const norm = normalize(raw);
      if(norm){
        _map = norm;
        _ts  = norm.ts || _ts;
        emit('cb:map:loaded', { ok:true, width:norm.w, height:norm.h, tilesize:norm.ts });
      } else {
        emit('cb:map:fallback', { reason:'bad-format' });
      }
    }catch(e){
      emit('cb:map:fallback', { reason:'fetch-failed', message: e?.message||String(e) });
    }
  }

  function start(){
    if(_running) return;
    _running = true;
    requestAnimationFrame(loop);
  }
  function stop(){ _running = false; }

  return { init, start, stop, setView, getView };
});
