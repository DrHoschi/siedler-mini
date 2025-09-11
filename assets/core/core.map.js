/* ============================================================================
 * Datei: assets/core/core.map.js
 * Aufgabe: Map laden + Tileset zeichnen (als Drawer für Render)
 * Erwartet: <canvas id="game" data-map="assets/maps/map-mini.json">
 * Öffentliche API (am window.Game Namespace):
 *   Game.Map.load(json)     // Map-Daten übernehmen
 *   Game.Map.draw(ctx,cam)  // vom Renderer pro Frame aufgerufen
 *   Game.Map.getSize()      // {cols, rows}
 * ========================================================================== */
(function(){
  'use strict';

  const MOD = '[map]';
  const ok  = (m)=> (window.CBLog?.ok   || console.log)(MOD+' '+m);
  const err = (m)=> (window.CBLog?.err  || console.error)(MOD+' '+m);
  const warn= (m)=> (window.CBLog?.warn || console.warn)(MOD+' '+m);

  // --- interner State --------------------------------------------------------
  const S = {
    tilesetUrl: 'assets/tiles/tileset.terrain.png',
    tilesetImg: null,
    tilePx: 64,           // Basistilegröße in px (unskaliert)
    map: null,            // Map-JSON (siehe assets/maps/map-mini.json)
    loaded: false
  };

  // --- Tileset laden ---------------------------------------------------------
  function loadTileset(url){
    return new Promise((resolve,reject)=>{
      const img = new Image();
      img.onload = ()=>{ S.tilesetImg = img; ok('Tileset geladen'); resolve(); };
      img.onerror= ()=> reject(new Error('Tileset nicht erreichbar: '+url));
      img.src = url + (url.includes('?')?'&':'?') + 'v=' + Date.now(); // Cache buster
    });
  }

  // --- Map laden (falls Bootstrap JSON liefert) ------------------------------
  async function loadMap(json){
    try{
      S.map = json || S.map;
      if (!S.map || !Array.isArray(S.map.layers)) throw new Error('ungültige Map');

      // optional: Tileset-Pfad aus Map überschreiben
      if (S.map.tileset) S.tilesetUrl = S.map.tileset;

      if (!S.tilesetImg) await loadTileset(S.tilesetUrl);
      S.loaded = true;
      ok('Map übernommen ('+(S.map.cols||'?')+'×'+(S.map.rows||'?')+')');
    }catch(e){
      S.loaded = false;
      err('Map-Load fehlgeschlagen: '+(e&&e.message||e));
    }
  }

  // --- Drawer: zeichnet die gesamte Map -------------------------------------
  function draw(ctx, cam){
    // Fallback-Hintergrund, falls irgendwas noch nicht da ist
    if (!S.loaded || !S.map || !S.tilesetImg){
      ctx.save();
      ctx.fillStyle = '#0e1411';
      ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
      ctx.restore();
      return;
    }

    const tileBase = S.tilePx;              // 64
    const tilePx   = Math.round(tileBase * (cam.zoom || 1));

    // Sichtbereich in KACHELN bestimmen
    const colsOnScreen = Math.ceil(ctx.canvas.width  / tilePx) + 2;
    const rowsOnScreen = Math.ceil(ctx.canvas.height / tilePx) + 2;
    const startCol = Math.max(0, Math.floor(cam.x));
    const startRow = Math.max(0, Math.floor(cam.y));

    // Annahme: S.map.layers[0] ist Terrain als int[][]
    const L = S.map.layers && S.map.layers[0];
    if (!L || !Array.isArray(L.data)) return;

    // Tileset-Atlas: wir nehmen 8×8 Tiles à 64px (anpassbar)
    const ts = S.tilesetImg;
    const atlasCols = Math.floor(ts.width  / tileBase);

    ctx.save();
    for (let r = 0; r < rowsOnScreen; r++){
      const mr = startRow + r; if (mr >= L.rows) break;
      for (let c = 0; c < colsOnScreen; c++){
        const mc = startCol + c; if (mc >= L.cols) break;
        const id = L.data[mr][mc] | 0;     // Tile-ID (0-basiert)

        // Quelle im Tileset berechnen
        const sx = (id % atlasCols) * tileBase;
        const sy = Math.floor(id / atlasCols) * tileBase;

        // Ziel auf dem Canvas
        const dx = Math.round((mc - cam.x) * tilePx);
        const dy = Math.round((mr - cam.y) * tilePx);

        ctx.drawImage(ts, sx, sy, tileBase, tileBase, dx, dy, tilePx, tilePx);
      }
    }
    ctx.restore();
  }

  function getSize(){
    if (!S.map) return { cols:0, rows:0 };
    const L = S.map.layers && S.map.layers[0];
    return { cols: L?.cols|0, rows: L?.rows|0 };
  }

  // --- Wiring zum Renderer ---------------------------------------------------
  function wireToRenderer(){
    try{
      window.Render?.setMapDrawer(draw);
    }catch(e){ warn('Renderer nicht verfügbar: '+(e&&e.message)); }
  }

  // --- Boot-Hook: auf cb:game-start Map vom Canvas laden --------------------
  async function bootHook(){
    const cvs = document.getElementById('game');
    const url = cvs?.getAttribute('data-map');
    if (!url){ warn('kein data-map am Canvas'); return; }
    try{
      const res = await fetch(url, { cache:'no-store' });
      const json = await res.json();
      await loadMap(json);
      wireToRenderer();
      ok('bereit – Drawer registriert');
      // gleich ein Frame anfordern
      try{ window.dispatchEvent(new Event('cb:render-frame')); }catch(_){}
    }catch(e){
      err('Map laden fehlgeschlagen: '+(e&&e.message||e));
    }
  }

  // --- Export ---------------------------------------------------------------
  window.Game = window.Game || {};
  Game.Map = { load: loadMap, draw, getSize };

  // Map-Drawer sofort registrieren (falls Renderer schon da ist)
  wireToRenderer();

  // Auf Start warten
  window.addEventListener('cb:game-start', bootHook, { once:false });
})();
