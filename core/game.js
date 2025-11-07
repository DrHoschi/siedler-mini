/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler
 * Version : v25.11.13-final3
 * Zweck   : Sichtbares Rendern der Karte (Canvas-Init, Loop, Tiled- & Simple-Map)
 *
 * Lauscht : cb:map:ready  → Game.start(map,{tileset,tilesetUrl})
 *          cb:game:start  → (Fallback) falls Bridge nicht emitten konnte
 * Sendet  : (keine neuen Events)
 *
 * Hinweise:
 *  - Kein Debug/Hack. Sauberer, deterministischer Renderer mit Guards.
 *  - Unterstützte Map-Formate:
 *      (A) Tiled JSON: { width,height,tilewidth,tileheight, layers:[{type:'tilelayer', data:[...]}],
 *                        tilesets:[{ firstgid, image, columns, tilewidth,tileheight, ... }] }
 *      (B) Simple Map: { cols,rows,tileSize || tile, layer || grid:[[...]], tilesetIndexing:'row-major' }
 *  - Bild wird NICHT nachgeladen (das macht die Bridge); hier nur Nutzung.
 * ========================================================================== */

window.Game = window.Game || {};

(function(){
  'use strict';
  const TAG  = '[game]';
  const INFO = (...a)=> (window.CBLog?.info || console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn || console.warn)(TAG, ...a);

  // ------------------------------- State ------------------------------------
  const state = {
    map: null,
    tileset: null,
    tilesetUrl: null,

    // Canvas / Context
    canvas: null,
    ctx: null,

    // Map-Geom
    cols: 0,
    rows: 0,
    tileW: 64,
    tileH: 64,

    // Tiled: firstgid + columns zur GID-Schnittberechnung
    firstGid: 1,
    tsCols: 0,     // Spalten im Tileset-Bild
    tsRows: 0,     // Reihen im Tileset-Bild

    // Layers
    layers: [],    // normalisierte Tile-Layer (integers, 0 = leer)

    // Loop
    running: false,
    rafId: 0,
  };

  // ----------------------------- Canvas-Setup -------------------------------
  function ensureCanvas() {
    if (state.canvas && state.ctx) return;
    const cvs = document.getElementById('game');
    if (!cvs) throw new Error('#game Canvas fehlt');
    const ctx = cvs.getContext('2d', { alpha: false });

    // Render-Qualität für Pixelgrafik
    ctx.imageSmoothingEnabled = false;

    state.canvas = cvs;
    state.ctx = ctx;

    // Resize → Attributgröße auf Viewport setzen
    function resize(){
      const w = Math.floor(window.innerWidth);
      const h = Math.floor(window.innerHeight);
      if (cvs.width !== w || cvs.height !== h) {
        cvs.width = w; cvs.height = h;
      }
    }
    window.addEventListener('resize', resize);
    resize();
  }

  // --------------------------- Map-Normalisierung ---------------------------
  function normalizeFromTiled(map) {
    // Geometrie
    state.cols  = Number(map.width  || map.cols || 0);
    state.rows  = Number(map.height || map.rows || 0);
    state.tileW = Number(map.tilewidth  || map.tileW || map.tile || 64);
    state.tileH = Number(map.tileheight || map.tileH || map.tile || 64);

    // firstgid / tileset columns ableiten (falls vorhanden)
    if (Array.isArray(map.tilesets) && map.tilesets.length) {
      const ts0 = map.tilesets[0];
      state.firstGid = Number(ts0.firstgid || 1);

      // Spalten im Bild: Tiled liefert columns, sonst selbst ableiten
      if (Number.isFinite(ts0.columns)) {
        state.tsCols = Number(ts0.columns);
      } else if (state.tileset && state.tileset.width && state.tileW) {
        state.tsCols = Math.max(1, Math.floor(state.tileset.width / state.tileW));
      }
      if (state.tsCols && state.tileset && state.tileH) {
        state.tsRows = Math.max(1, Math.floor(state.tileset.height / state.tileH));
      }
    } else {
      // Fallback falls kein tilesets[] vorhanden (wir haben aber das Bild)
      state.firstGid = 1;
      if (state.tileset && state.tileset.width && state.tileW) {
        state.tsCols = Math.max(1, Math.floor(state.tileset.width / state.tileW));
        state.tsRows = Math.max(1, Math.floor(state.tileset.height / state.tileH));
      }
    }

    // Layer-Daten extrahieren (nur tilelayer)
    state.layers = [];
    if (Array.isArray(map.layers)) {
      for (const L of map.layers) {
        if (L?.type === 'tilelayer' && Array.isArray(L.data)) {
          // Tiled erlaubt 0 = leer
          state.layers.push({
            name: L.name || 'layer',
            data: L.data.slice(0) // flach, length = width*height
          });
        }
      }
    }
  }

  function normalizeFromSimple(map) {
    state.cols  = Number(map.cols || map.width  || 0);
    state.rows  = Number(map.rows || map.height || 0);
    state.tileW = Number(map.tileSize || map.tile || map.tileW || 64);
    state.tileH = Number(map.tileSize || map.tile || map.tileH || 64);

    // Tileset-Grid aus Bildgröße ableiten
    if (state.tileset && state.tileset.width && state.tileW) {
      state.tsCols = Math.max(1, Math.floor(state.tileset.width / state.tileW));
      state.tsRows = Math.max(1, Math.floor(state.tileset.height / state.tileH));
    } else {
      state.tsCols = state.tsCols || 1;
      state.tsRows = state.tsRows || 1;
    }
    state.firstGid = 1;

    // Layer normalisieren
    const layer = map.layer || map.grid || null;
    if (Array.isArray(layer)) {
      // erlaubt 2D-Array [rows][cols] oder flach
      if (Array.isArray(layer[0])) {
        // 2D -> flatten row-major
        const flat = [];
        for (let r=0; r<layer.length; r++) {
          for (let c=0; c<layer[r].length; c++) flat.push(layer[r][c]|0);
        }
        state.layers = [{ name:'layer0', data: flat }];
      } else {
        state.layers = [{ name:'layer0', data: layer.map(v=>v|0) }];
      }
    } else {
      // Falls nix da ist: ein leerer Layer, damit der Loop läuft
      state.layers = [{ name:'layer0', data: new Array(state.cols*state.rows).fill(0) }];
    }
  }

  function normalizeMap(map){
    // Entscheide: Tiled vs. Simple
    if (Array.isArray(map?.layers) && (map?.tilewidth || map?.tileheight || map?.tilesets)) {
      normalizeFromTiled(map);
    } else {
      normalizeFromSimple(map);
    }

    // Sanity
    if (!state.cols || !state.rows) {
      WARN('Map-Geometrie unklar – setze 1x1 als Fallback');
      state.cols = state.cols || 1;
      state.rows = state.rows || 1;
    }
    if (!state.tsCols) {
      // immer noch 0? → wenigstens 1 setzen, damit Division nicht platzt
      state.tsCols = 1;
      state.tsRows = 1;
    }
  }

  // ------------------------------- Drawing ----------------------------------
  function clear() {
    const c = state.canvas; const ctx = state.ctx;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = '#101418'; // dunkles UI-Hintergrundgrau
    ctx.fillRect(0,0,c.width,c.height);
  }

  function drawTile(gid, dx, dy) {
    // gid=0 → leer
    if (!gid) return;

    const img = state.tileset;
    if (!img) return;

    // Tiled: gid beginnt bei firstgid
    const index = Math.max(0, (gid|0) - (state.firstGid|0));
    const sxIndex = index % state.tsCols;
    const syIndex = Math.floor(index / state.tsCols);

    const sx = sxIndex * state.tileW;
    const sy = syIndex * state.tileH;

    state.ctx.drawImage(
      img,
      sx, sy, state.tileW, state.tileH,
      dx, dy, state.tileW, state.tileH
    );
  }

  function drawLayers() {
    const ctx = state.ctx;
    const { cols, rows, tileW, tileH } = state;

    // einfache Kamera (0,0) – später mit translate/scale erweiterbar
    ctx.setTransform(1,0,0,1,0,0);

    for (const L of state.layers) {
      const data = L.data;
      if (!Array.isArray(data)) continue;

      // flaches Array im Row-major: idx = y*cols + x
      let i = 0;
      for (let y=0; y<rows; y++) {
        const py = y * tileH;
        for (let x=0; x<cols; x++, i++) {
          const px = x * tileW;
          const gid = data[i]|0;
          drawTile(gid, px, py);
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

  // ------------------------------- Public API -------------------------------
  Game.start = function(map, options = {}){
    // 1) Canvas besorgen
    ensureCanvas();

    // 2) Tileset annehmen
    state.tileset    = options.tileset    || state.tileset || null;
    state.tilesetUrl = options.tilesetUrl || state.tilesetUrl || null;
    if (state.tileset) {
      INFO('Tileset bereit:', state.tilesetUrl || '(inline)');
    } else {
      WARN('Tileset fehlt – es wird ggf. nichts gezeichnet.');
    }

    // 3) Map normalisieren
    state.map = map || null;
    try {
      normalizeMap(state.map);
    } catch (e) {
      WARN('Map-Normalisierung fehlgeschlagen:', e?.message || e);
      // Minimal-Map, damit nichts abstürzt
      state.cols = state.rows = 1; state.tileW = state.tileH = 64;
      state.layers = [{ name:'layer0', data:[0] }];
    }

    // 4) Loop starten (einmalig)
    if (!state.running) {
      state.running = true;
      state.rafId = requestAnimationFrame(frame);
    }
  };

  // Map-Bridge ruft dies idealerweise zuerst:
  addEventListener('cb:map:ready', (e)=>{
    const d = e.detail || {};
    Game.start(d.map, { tileset: d.tileset, tilesetUrl: d.tilesetUrl });
  });

  // Fallback: Falls jemand direkt cb:game:start feuert (ohne Bridge),
  // starte wenigstens die Loop, damit ein späteres cb:map:ready sofort sichtbar wird.
  addEventListener('cb:game:start', ()=>{
    ensureCanvas();
    if (!state.running) { state.running = true; state.rafId = requestAnimationFrame(frame); }
  }, { once: true });

})();
