/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler
 * Version : v25.11.13-final4
 * Zweck   : Sichtbares Rendern der Karte (Canvas-Init, Loop)
 *
 * Unterstützte Map-Formate:
 *   (A) Tiled JSON:
 *       - keys: width,height,tilewidth,tileheight,layers[],tilesets[]
 *   (B) Simple JSON (DEIN Format):
 *       - keys: size:[tileW,tileH], tiles:number[][]  (2D-Array)
 *       - optional: objects[], spawns[], metadata
 *
 * Lauscht : cb:map:ready  → Game.start(map,{tileset,tilesetUrl})
 *          cb:game:start  → Fallback (Loop startet, falls Map später kommt)
 * ========================================================================== */

window.Game = window.Game || {};

(function(){
  'use strict';
  const TAG  = '[game]';
  const INFO = (...a)=> (window.CBLog?.info || console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn || console.warn)(TAG, ...a);

  // -------------------------------- State -----------------------------------
  const state = {
    map: null,
    tileset: null,
    tilesetUrl: null,

    // Canvas
    canvas: null,
    ctx: null,

    // Geometrie
    cols: 0,
    rows: 0,
    tileW: 64,
    tileH: 64,

    // Tileset-Raster
    firstGid: 1,
    tsCols: 0,
    tsRows: 0,

    // Layer (normalisiert als flaches Int-Array)
    layers: [],

    // Loop
    running: false,
    rafId: 0,
  };

  // ---------------------------- Canvas / Resize ------------------------------
  function ensureCanvas(){
    if (state.canvas && state.ctx) return;
    const cvs = document.getElementById('game');
    if (!cvs) throw new Error('#game Canvas fehlt');
    const ctx = cvs.getContext('2d', { alpha:false });
    ctx.imageSmoothingEnabled = false;
    state.canvas = cvs;
    state.ctx = ctx;

    function resize(){
      const w = Math.floor(window.innerWidth);
      const h = Math.floor(window.innerHeight);
      if (cvs.width !== w || cvs.height !== h) { cvs.width = w; cvs.height = h; }
    }
    window.addEventListener('resize', resize);
    resize();
  }

  // --------------------------- Map-Normalisierung ----------------------------
  function deriveTilesetGrid(){
    // Spalten/Zeilen im Tileset-Bild ableiten, falls noch nicht gesetzt
    if (state.tileset && state.tileW && state.tileH) {
      state.tsCols = state.tsCols || Math.max(1, Math.floor(state.tileset.width  / state.tileW));
      state.tsRows = state.tsRows || Math.max(1, Math.floor(state.tileset.height / state.tileH));
    }
    if (!state.tsCols) { state.tsCols = 1; state.tsRows = 1; }
  }

  function normalizeFromTiled(map){
    state.cols  = Number(map.width  || 0);
    state.rows  = Number(map.height || 0);
    state.tileW = Number(map.tilewidth  || 64);
    state.tileH = Number(map.tileheight || 64);

    // Tileset-Raster
    if (Array.isArray(map.tilesets) && map.tilesets.length){
      const ts0 = map.tilesets[0];
      state.firstGid = Number(ts0.firstgid || 1);
      if (Number.isFinite(ts0.columns)) state.tsCols = Number(ts0.columns);
    }
    deriveTilesetGrid();

    // Tile-Layer übernehmen
    state.layers = [];
    if (Array.isArray(map.layers)){
      for (const L of map.layers){
        if (L?.type === 'tilelayer' && Array.isArray(L.data)){
          state.layers.push({ name: L.name || 'layer', data: L.data.slice(0) });
        }
      }
    }
  }

  // --------- SIMPLE FORMAT (dein Schema): { size:[w,h], tiles:number[][] } ---
  function normalizeFromSimple(map){
    // 1) Tilegröße aus size:[tileW,tileH]
    if (Array.isArray(map.size) && map.size.length >= 2){
      state.tileW = Number(map.size[0]) || 64;
      state.tileH = Number(map.size[1]) || 64;
    }

    // 2) Geometrie aus tiles (2D)
    const grid2D = map.tiles;
    if (!Array.isArray(grid2D) || !Array.isArray(grid2D[0])) {
      throw new Error('Simple-Map erwartet "tiles" als 2D-Array');
    }
    state.rows = grid2D.length;
    state.cols = grid2D[0].length;

    // 3) Tileset-Raster vom Bild ableiten
    state.firstGid = 1;
    state.tsCols = 0; state.tsRows = 0;
    deriveTilesetGrid();

    // 4) Zu flachem Array normalisieren (row-major)
    const flat = new Array(state.cols * state.rows);
    let i = 0;
    for (let r=0; r<state.rows; r++){
      const row = grid2D[r];
      if (!Array.isArray(row) || row.length !== state.cols){
        throw new Error(`Zeile ${r} hat Länge ${row?.length||0}, erwartet ${state.cols}`);
      }
      for (let c=0; c<state.cols; c++) flat[i++] = row[c]|0;
    }
    state.layers = [{ name:'layer0', data: flat }];

    INFO('Map (simple) normalisiert:',
      { cols:state.cols, rows:state.rows, tile:[state.tileW,state.tileH], tsCols:state.tsCols });
  }

  function normalizeMap(map){
    // Erkennung: Tiled vs. Simple
    const looksTiled =
      Array.isArray(map?.layers) &&
      (Number.isFinite(map?.tilewidth) || Number.isFinite(map?.tileheight) || Array.isArray(map?.tilesets));

    const looksSimple =
      Array.isArray(map?.tiles) && Array.isArray(map?.tiles[0]) && Array.isArray(map?.size);

    if (looksTiled) {
      normalizeFromTiled(map);
    } else if (looksSimple) {
      normalizeFromSimple(map);
    } else {
      // Letzter Versuch: sehr generisch (falls nur "grid" o.ä. existiert)
      const grid = map?.tiles || map?.grid;
      if (Array.isArray(grid) && Array.isArray(grid[0])) {
        // Tilegröße fallback
        if (Array.isArray(map?.size) && map.size.length>=2){
          state.tileW = Number(map.size[0]) || 64;
          state.tileH = Number(map.size[1]) || 64;
        }
        state.rows = grid.length;
        state.cols = grid[0].length;
        const flat = [];
        for (let r=0; r<state.rows; r++) for (let c=0; c<state.cols; c++) flat.push(grid[r][c]|0);
        state.layers = [{ name:'layer0', data: flat }];
        deriveTilesetGrid();
      } else {
        throw new Error('Unbekanntes Map-Format – erwarte Tiled oder {size,tiles}');
      }
    }

    // Sanity
    if (!state.cols || !state.rows){
      WARN('Map-Geometrie unklar – setze 1x1');
      state.cols = state.cols || 1;
      state.rows = state.rows || 1;
      state.layers = [{ name:'layer0', data:[0] }];
    }
  }

  // -------------------------------- Drawing ---------------------------------
  function clear(){
    const c = state.canvas, ctx = state.ctx;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = '#101418';
    ctx.fillRect(0,0,c.width,c.height);
  }

  function drawTile(gid, dx, dy){
    if (!gid) return;                  // 0 = leer
    const img = state.tileset; if (!img) return;

    // gid (1-basiert) → Index im Tileset (0-basiert)
    const index = Math.max(0, (gid|0) - (state.firstGid|0));
    const sxIndex = index % state.tsCols;
    const syIndex = Math.floor(index / state.tsCols);

    const sx = sxIndex * state.tileW;
    const sy = syIndex * state.tileH;

    state.ctx.drawImage(img, sx, sy, state.tileW, state.tileH, dx, dy, state.tileW, state.tileH);
  }

  function drawLayers(){
    const { cols, rows, tileW, tileH } = state;
    const ctx = state.ctx;
    ctx.setTransform(1,0,0,1,0,0); // (später Kamera)

    for (const L of state.layers){
      const data = L.data; if (!Array.isArray(data)) continue;
      let i = 0;
      for (let y=0; y<rows; y++){
        const py = y * tileH;
        for (let x=0; x<cols; x++, i++){
          const px = x * tileW;
          drawTile(data[i]|0, px, py);
        }
      }
    }
  }

  function frame(){
    if (!state.running) return;
    clear();
    drawLayers();
    state.rafId = requestAnimationFrame(frame);
  }

  // ------------------------------- Public API --------------------------------
  Game.start = function(map, options = {}){
    ensureCanvas();
    state.tileset    = options.tileset    || state.tileset || null;
    state.tilesetUrl = options.tilesetUrl || state.tilesetUrl || null;
    if (state.tileset) INFO('Tileset bereit:', state.tilesetUrl || '(inline)');
    else WARN('Tileset fehlt – es wird ggf. nichts gezeichnet.');

    state.map = map || null;
    try {
      normalizeMap(state.map);
    } catch (e) {
      WARN('Map-Normalisierung fehlgeschlagen:', e?.message || e);
      // Minimal-Fallback
      state.cols = state.rows = 1; state.tileW = state.tileH = 64;
      state.layers = [{ name:'layer0', data:[0] }];
      deriveTilesetGrid();
    }

    if (!state.running){
      state.running = true;
      state.rafId = requestAnimationFrame(frame);
    }
  };

  // Bridge liefert Map + Tileset
  addEventListener('cb:map:ready', (e)=>{
    const d = e.detail || {};
    Game.start(d.map, { tileset: d.tileset, tilesetUrl: d.tilesetUrl });
  });

  // Fallback: Loop laufen lassen, falls Map später kommt
  addEventListener('cb:game:start', ()=>{
    ensureCanvas();
    if (!state.running){ state.running = true; state.rafId = requestAnimationFrame(frame); }
  }, { once:true });

})();
