/* ============================================================================
 * Datei    : core/map-runtime.js
 * Projekt  : Neue Siedler
 * Version  : v1.0.0 (2025-10-06)
 * Zweck    : Sichtbare Karte rendern (leichtgewichtig, tolerant)
 *
 * Kann:
 *   • Map-URL direkt vom <canvas id="game" data-map="..."> lesen
 *   • JSON laden und grob interpretieren (mehrere gängige Formen)
 *   • Fallback: sofort eine grüne Fläche + Raster zeichnen (damit man was sieht)
 *
 * Öffentliche API:
 *   MapRuntime.init(canvasId = 'game', loader = fetchJSON)
 *   MapRuntime.start()    -> startet den Render-Loop (idempotent)
 *   MapRuntime.stop()     -> stoppt den Render-Loop
 *
 * Interne Annahmen:
 *   • Es gibt ein <canvas id="game"> im DOM
 *   • Optional: data-map-Attribut mit JSON-Pfad
 *
 * Events:
 *   • cb:map:loaded   { ok:true, width, height, tilesize }
 *   • cb:map:fallback { reason:'no-json'|'bad-format' }
 * ============================================================================
 */

(function(root, factory){
  root.MapRuntime = factory();
})(typeof window!=='undefined'?window:this, function(){

  // ---- interne State --------------------------------------------------------
  let _cv, _cx, _anim = 0, _running = false, _ts = 32;
  let _map = null; // normalisierte Map: {w,h,ts, data:Int16Array or fn(x,y)->code}

  // ---- Utilities ------------------------------------------------------------
  function emit(name, detail={}){ try{ window.dispatchEvent(new CustomEvent(name,{detail})); }catch(_){} }
  async function fetchJSON(url){
    const bust = (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    const res = await fetch(url + bust, { cache:'no-store' });
    if(!res.ok) throw new Error('HTTP '+res.status+' @ '+url);
    return await res.json();
  }

  // ---- Normalisierung verschiedener Map-Formate -----------------------------
  // Akzeptierte Formen:
  //  A) { width, height, tileSize, tiles:[[0,1,...], ...] }
  //  B) { w, h, ts, data:[...flat...] }  (Array/Numerisch)
  //  C) { cells:[[{type:'grass'|'water'|'rock'},...], ...], tileSize }
  function normalize(raw){
    // A) tiles: 2D
    if (raw && Array.isArray(raw.tiles) && Array.isArray(raw.tiles[0])) {
      const h = raw.tiles.length;
      const w = raw.tiles[0].length;
      const ts = Number(raw.tileSize || raw.ts || 32);
      const flat = new Int16Array(w*h);
      for(let y=0;y<h;y++) for(let x=0;x<w;x++) flat[y*w+x] = Number(raw.tiles[y][x]||0);
      return { w, h, ts, data: flat };
    }
    // B) data: flat
    if (raw && Array.isArray(raw.data) && (raw.w||raw.width) && (raw.h||raw.height)) {
      const w = Number(raw.w || raw.width), h = Number(raw.h || raw.height);
      const ts = Number(raw.ts || raw.tileSize || 32);
      const flat = new Int16Array(w*h);
      for(let i=0;i<flat.length && i<raw.data.length;i++) flat[i] = Number(raw.data[i]||0);
      return { w, h, ts, data: flat };
    }
    // C) cells: 2D objects mit type
    if (raw && Array.isArray(raw.cells) && Array.isArray(raw.cells[0])) {
      const h = raw.cells.length;
      const w = raw.cells[0].length;
      const ts = Number(raw.tileSize || raw.ts || 32);
      const encode = (cell)=> {
        const t = (cell&&cell.type)||'grass';
        if (t==='water') return 2;
        if (t==='rock'||t==='stone') return 3;
        return 1; // grass
      };
      const flat = new Int16Array(w*h);
      for(let y=0;y<h;y++) for(let x=0;x<w;x++) flat[y*w+x] = encode(raw.cells[y][x]);
      return { w, h, ts, data: flat };
    }
    return null;
  }

  // ---- Render Helpers -------------------------------------------------------
  function clearWhite(){
    _cx.save();
    _cx.fillStyle = '#ffffff';
    _cx.fillRect(0,0,_cv.width,_cv.height);
    _cx.restore();
  }
  function drawFallback(){
    // einfache „Wiese“ + Raster
    const ts = _ts;
    _cx.save();
    _cx.fillStyle = '#2f7d32'; // grün
    _cx.fillRect(0,0,_cv.width,_cv.height);

    _cx.globalAlpha = 0.08;
    _cx.strokeStyle = '#000';
    for(let x=0;x<=_cv.width;x+=ts){ _cx.beginPath(); _cx.moveTo(x,0); _cx.lineTo(x,_cv.height); _cx.stroke(); }
    for(let y=0;y<=_cv.height;y+=ts){ _cx.beginPath(); _cx.moveTo(0,y); _cx.lineTo(_cv.width,y); _cx.stroke(); }
    _cx.restore();
  }
  function drawMap(){
    const { w, h, ts, data } = _map;
    _cx.save();
    // Hintergrund
    _cx.fillStyle = '#2f7d32'; _cx.fillRect(0,0,_cv.width,_cv.height);

    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const code = data[y*w+x]|0;
        if(code===0){ /* leer → gras */ continue; }
        if(code===1){ /* grass marker: nix */ continue; }
        if(code===2){ // water
          _cx.fillStyle = '#2a6fdb';
          _cx.fillRect(x*ts, y*ts, ts, ts);
        } else if(code===3){ // rock
          _cx.fillStyle = '#7b7b7b';
          _cx.fillRect(x*ts, y*ts, ts, ts);
        } else {
          // unbekannter Code → leicht absetzen
          _cx.fillStyle = '#3d8b40';
          _cx.fillRect(x*ts, y*ts, ts, ts);
        }
      }
    }

    // dezentes Raster
    _cx.globalAlpha = 0.06;
    _cx.strokeStyle = '#000';
    for(let x=0;x<=w*ts;x+=ts){ _cx.beginPath(); _cx.moveTo(x,0); _cx.lineTo(x,h*ts); _cx.stroke(); }
    for(let y=0;y<=h*ts;y+=ts){ _cx.beginPath(); _cx.moveTo(0,y); _cx.lineTo(w*ts,y); _cx.stroke(); }

    _cx.restore();
  }

  // ---- Loop -----------------------------------------------------------------
  function loop(t){
    if(!_running){ return; }
    _anim = t;
    clearWhite();
    if(_map) drawMap();
    else drawFallback();
    requestAnimationFrame(loop);
  }

  // ---- Public ---------------------------------------------------------------
  async function init(canvasId='game', loader=fetchJSON){
    _cv = document.getElementById(canvasId);
    if(!_cv){ throw new Error('[MapRuntime] canvas #'+canvasId+' fehlt'); }
    _cx = _cv.getContext('2d', { alpha:false });

    // Versuche Map zu laden
    const url = _cv.getAttribute('data-map');
    if(!url){
      emit('cb:map:fallback', { reason:'no-json' });
      return; // Fallback-Renderer zeigt grün+Raster
    }
    try{
      const raw = await loader(url);
      const norm = normalize(raw);
      if(norm){
        _map = norm;
        _ts = norm.ts||_ts;
        emit('cb:map:loaded', { ok:true, width:norm.w, height:norm.h, tilesize:norm.ts });
      }else{
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
  function stop(){
    _running = false;
  }

  return { init, start, stop };
});
