/* ============================================================================
 * Datei   : core/game-v2.js
 * Projekt : Neue Siedler
 * Version : v25.11.17-final.2
 * Build   : quadratisches Layout (CSS-Rect) · DPR-Backbuffer · Focus-Zoom
 *           View-Culling · Dual-Camera-Events · Wheel-Zoom (Desktop)
 *
 * Zweck   : Ein einziger, robuster Renderer für die Kachel-Map + einfache
 *           Gebäude-Visualisierung (Platzhalterrechteck) – komplett an das
 *           CSS-Layout (#game) gekoppelt. Funktioniert 1:1 mit der
 *           map-runtime.bridge.js (die Map+Tileset lädt und cb:map:ready feuert).
 *
 * WICHTIG
 * - Größe/Position kommen NICHT aus innerWidth/innerHeight, sondern aus dem
 *   tatsächlichen CSS-Rechteck des Canvas (#game) → getBoundingClientRect().
 *   Damit respektiert der Renderer ui-layout.css (quadratisches Feld links).
 * - Backing-Store = CSS-Größe × DPR → knackig scharf, kein „Mini-Canvas“.
 * - Bitte nur EINEN Renderer laden (diesen). Nicht zusätzlich core.map.js etc.
 * - Für die Datenübergabe sorgt die Bridge: cb:map:ready → Game.start(map,{...}).
 * ========================================================================== */

window.Game = window.Game || {};
(function(){
  'use strict';

  /* ==========================================================================
   * 0) LOGGING / HILFSALIASE
   * ======================================================================== */
  const TAG  = '[game]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error?? console.error)(TAG, ...a);

  /* ==========================================================================
   * 1) KONSTANTEN & ANZEIGE-PRÄFERENZEN
   * ======================================================================== */
  // Hinweis: Die eigentliche QUADRAT-Fläche bestimmt ui-layout.css.
  // Hier steuern wir nur die *Fit*-Strategie, wie die Welt auf die Fläche
  // initial eingepasst wird. 'cover' = füllt Quadrat, 'contain' = alles sichtbar.
  const VIEW_PREF = { fit: 'cover' }; // 'cover' oder 'contain'

  /* ==========================================================================
   * 2) MODUL-STATUS (STATE)
   * ======================================================================== */
  const S = {
    // Map / Tileset
    map:null, tileset:null, tilesetUrl:null,
    cols:0, rows:0, tileW:64, tileH:64,
    firstGid:1, tsCols:1, tsRows:1,
    layers:[],

    // Canvas/Context (+DPR) – größengeführt vom tatsächlichen CSS-Rect
    canvas:null, ctx:null,
    cssW:0, cssH:0, dpr:1,

    // Kamera (World-Pixel) + Zoom
    cam:{ x:0, y:0, zoom:1 },

    // Gebäude-Platzhalter (x/y in Tiles)
    buildings: [],

    // Laufsteuerung
    running:false, rafId:0,

    // Beobachter für CSS-Größe (#game)
    resizeObs:null,

    // einmaliger Initial-Fit durchgeführt?
    didInitialFit:false,
  };

  /* ==========================================================================
   * 3) HILFSFUNKTIONEN
   * ======================================================================== */

  // 3.1 Tileset-Raster ableiten
  function deriveTsGrid(){
    if (S.tileset && S.tileW && S.tileH){
      S.tsCols = Math.max(1, Math.floor(S.tileset.width  / S.tileW));
      S.tsRows = Math.max(1, Math.floor(S.tileset.height / S.tileH));
    }
  }

  // 3.2 Map-Normalisierung (Tiled oder "simple")
  function normalizeFromTiled(map){
    S.cols  = Number(map.width||0);
    S.rows  = Number(map.height||0);
    S.tileW = Number(map.tilewidth||64);
    S.tileH = Number(map.tileheight||64);

    if (Array.isArray(map.tilesets) && map.tilesets.length){
      const ts0 = map.tilesets[0];
      S.firstGid = Number(ts0.firstgid||1);
      if (Number.isFinite(ts0.columns)) S.tsCols = Number(ts0.columns);
    }
    deriveTsGrid();

    S.layers = [];
    if (Array.isArray(map.layers)){
      for (const L of map.layers){
        if (L?.type==='tilelayer' && Array.isArray(L.data)){
          S.layers.push({ name:L.name||'layer', data: L.data.slice(0) });
        }
      }
    }
  }

  function normalizeFromSimple(map){
    if (Array.isArray(map.size) && map.size.length>=2){
      S.tileW = Number(map.size[0])||64;
      S.tileH = Number(map.size[1])||64;
    }
    const grid = map.tiles;
    S.rows = grid.length; S.cols = grid[0].length;

    const flat = new Array(S.cols * S.rows);
    let i=0;
    for (let r=0;r<S.rows;r++){
      for (let c=0;c<S.cols;c++){
        flat[i++] = grid[r][c]|0;
      }
    }
    S.layers = [{ name:'layer0', data:flat }];
    S.firstGid = 1; S.tsCols = 1; S.tsRows = 1;
    deriveTsGrid();
    INFO('Map (simple) normalisiert:', { cols:S.cols, rows:S.rows, tile:[S.tileW,S.tileH], tsCols:S.tsCols });
  }

  function normalizeMap(map){
    const looksTiled  = Array.isArray(map?.layers) && (map.tilewidth||map.tileheight||map.tilesets);
    const looksSimple = Array.isArray(map?.tiles) && Array.isArray(map?.tiles[0]);
    if (looksTiled) normalizeFromTiled(map);
    else if (looksSimple) normalizeFromSimple(map);
    else {
      WARN('Unbekanntes Map-Format → 1x1-Fallback');
      S.cols=S.rows=1; S.layers=[{name:'layer0',data:[0]}];
    }

    // Globale TileSize-API (einige Module greifen darauf zu)
    window.Game.tileSize    = S.tileW;
    window.Game.getTileSize = ()=> S.tileW;
  }

  // 3.3 Canvas & DPR exakt an CSS-Rechteck koppeln
  function ensureCanvas(){
    if (S.canvas && S.ctx) return;

    const el = document.getElementById('game');
    if (!el) throw new Error('#game Canvas fehlt');

    const ctx = el.getContext('2d', { alpha:false });
    ctx.imageSmoothingEnabled = false;

    S.canvas = el; S.ctx = ctx;
    S.dpr = (window.devicePixelRatio || 1);

    // a) Sofort initiale Größe an CSS-Rect ausrichten
    resizeToCssRect();

    // b) CSS-Änderungen beobachten (nicht innerWidth, sondern echtes Layout)
    if (typeof ResizeObserver === 'function'){
      S.resizeObs = new ResizeObserver(()=> resizeToCssRect());
      S.resizeObs.observe(S.canvas);
    } else {
      // Fallback: auf Fenster reagieren
      addEventListener('resize', resizeToCssRect);
      addEventListener('orientationchange', resizeToCssRect);
    }

    // Desktop-Komfort: STRG/Cmd + Mausrad = Zoom am Mausfokus
    // ABER nur, wenn KEINE externe Kamera (GameCamera) aktiv ist.
    // Sonst würden zwei Systeme gleichzeitig zoomen → "Sprung"-Effekt.
    if (!window.GameCamera && !S.canvas.__wheelZoomWired){
      S.canvas.__wheelZoomWired = true;
      S.canvas.addEventListener('wheel', (ev)=>{
        if (!ev.ctrlKey && !ev.metaKey) return;
        ev.preventDefault();
        const factor = ev.deltaY < 0 ? 1.1 : 1/1.1;
        zoomAt(ev.clientX, ev.clientY, S.cam.zoom * factor);
      }, { passive:false });
    }

    OK('Canvas init (DPR=', S.dpr, ' CSS=', S.cssW+'x'+S.cssH,
       ' BS=', S.canvas.width+'x'+S.canvas.height, ')');
  }

  function resizeToCssRect(){
    if (!S.canvas) return;

    const cssRect = S.canvas.getBoundingClientRect();
    const cssW = Math.max(0, Math.floor(cssRect.width));
    const cssH = Math.max(0, Math.floor(cssRect.height));

    const dpr = (window.devicePixelRatio || 1);
    const backW = Math.max(1, Math.floor(cssW * dpr));
    const backH = Math.max(1, Math.floor(cssH * dpr));

    if (S.canvas.width !== backW)  S.canvas.width  = backW;
    if (S.canvas.height !== backH) S.canvas.height = backH;

    S.cssW = cssW;
    S.cssH = cssH;
    S.dpr  = dpr;

    // WICHTIG:
    // - Wenn #game noch display:none ist, sind cssW/cssH = 0.
    // - Dann warten wir einfach, bis das Layout das Canvas sichtbar macht.
    if (!cssW || !cssH) {
      // Noch kein sinnvolles Layout → kein fitToMap()
      return;
    }

    // Erste Chance für initiales Fit, sobald Map *und* sinnvolle Größe da sind:
    if (S.map && !S.didInitialFit){
      try {
        fitToMap(VIEW_PREF.fit);
        S.didInitialFit = true;
      } catch(e){
        WARN('fitToMap@resize fail', e);
      }
    }
  }

  // 3.4 Kamera-Transform / Clear
  function clear(){
    const c=S.canvas, ctx=S.ctx;
    ctx.setTransform(1,0,0,1,0,0);              // Reset
    ctx.fillStyle='#101418';
    ctx.fillRect(0,0,c.width,c.height);         // Backing-Store (DPR) füllen
  }

  function applyCamera(){
    const {x,y,zoom} = S.cam;
    // Nur Weltzoom, DPR ist bereits im Backing-Store berücksichtigt
    S.ctx.setTransform(zoom,0,0,zoom, -x*zoom, -y*zoom);
  }

  // 3.5 Initiales Einpassen (contain/cover) in die CSS-Fläche
  function fitToMap(strategy='cover') {
    const worldW = S.cols * S.tileW;
    const worldH = S.rows * S.tileH;
    if (!worldW || !worldH) return;

    const cssW = S.cssW;
    const cssH = S.cssH;

    // Wenn das CSS-Rect (noch) 0×0 ist (z.B. weil #game display:none),
    // brechen wir ab und warten auf den nächsten resizeToCssRect()-Call.
    if (!cssW || !cssH) {
      WARN('fitToMap: CSS-Rect ist noch 0×0 – warte auf sichtbares Layout.');
      return;
    }

    const zContain = Math.min(cssW/worldW, cssH/worldH);
    const zCover   = Math.max(cssW/worldW, cssH/worldH);
    const z        = (strategy === 'contain') ? zContain : zCover;

    S.cam.zoom = clamp(z, 0.1, 6);

    const viewW = cssW / S.cam.zoom;
    const viewH = cssH / S.cam.zoom;

    // zentrieren
    S.cam.x = Math.max(0, (worldW - viewW) * 0.5);
    S.cam.y = Math.max(0, (worldH - viewH) * 0.5);
  }

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  // 3.6 Fokus-gesperrter Zoom (am Finger/Mauspunkt)
  function zoomAt(clientX, clientY, nextZoom) {
    const c = S.canvas; if (!c) return;
    const rect = c.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;

    const wxBefore = (cx / S.cam.zoom) + S.cam.x;
    const wyBefore = (cy / S.cam.zoom) + S.cam.y;

    const z = clamp(nextZoom || 1, 0.1, 6);
    S.cam.zoom = z;

    S.cam.x = wxBefore - (cx / z);
    S.cam.y = wyBefore - (cy / z);
  }

  /* ==========================================================================
   * 4) ZEICHNEN
   * ======================================================================== */
  function drawTile(gid, dx, dy){
    if (!gid) return;
    const img=S.tileset; if (!img) return;
    const index = (gid|0) - (S.firstGid|0);
    if (index < 0) return;

    const sx = (index % S.tsCols) * S.tileW;
    const sy = Math.floor(index / S.tsCols) * S.tileH;
    S.ctx.drawImage(img, sx,sy,S.tileW,S.tileH, dx,dy,S.tileW,S.tileH);
  }

  // Sichtfenster → Tile-Range (mit 1-Tile Puffer)
  function drawLayersCulled(){
    const { cols, rows, tileW, tileH } = S;
    if (!cols || !rows) return;

    const viewW = S.cssW / S.cam.zoom;
    const viewH = S.cssH / S.cam.zoom;
    const vx0   = S.cam.x;
    const vy0   = S.cam.y;
    const vx1   = vx0 + viewW;
    const vy1   = vy0 + viewH;

    const tx0 = Math.max(0, ((vx0 / tileW) | 0) - 1);
    const ty0 = Math.max(0, ((vy0 / tileH) | 0) - 1);
    const tx1 = Math.min(cols-1, ((vx1 / tileW) | 0) + 1);
    const ty1 = Math.min(rows-1, ((vy1 / tileH) | 0) + 1);

    for (const L of S.layers){
      const data=L.data; if(!Array.isArray(data)) continue;

      for (let y=ty0; y<=ty1; y++){
        const rowIndex = y * cols;
        const py = y * tileH;                 // ★ korrektes Y
        for (let x=tx0; x<=tx1; x++){
          const px = x * tileW;
          const gid = data[rowIndex + x] | 0;
          drawTile(gid, px, py);
        }
      }
    }
  }

  function drawBuildings(){
  const ctx = S.ctx;
  const {tileW, tileH} = S;

  ctx.save();
  for (const b of S.buildings){
    // Sprite vorhanden?
    const spr = S.buildingSprites?.[b.id];
    const px = b.x * tileW;
    const py = b.y * tileH;
    const pw = (b.w || 1) * tileW;
    const ph = (b.h || 1) * tileH;

    if (spr && spr.complete){
      ctx.drawImage(spr, px, py, pw, ph);
    } else {
      // Fallback: leicht getöntes Rechteck
      ctx.fillStyle='rgba(255,200,140,0.25)';
      ctx.fillRect(px,py,pw,ph);
      ctx.strokeStyle='rgba(0,0,0,0.35)';
      ctx.lineWidth = 2 / Math.max(1, S.cam.zoom);
      ctx.strokeRect(px+1,py+1,pw-2,ph-2);
    }
  }
  ctx.restore();
}

  function frame(){
    if (!S.running) return;
    clear();
    applyCamera();
    drawLayersCulled();
    drawBuildings();
    S.rafId = requestAnimationFrame(frame);
  }

  /* ==========================================================================
   * 5) PLATZIEREN (API intern)
   * ======================================================================== */
 // Gebäude-Sprites laden (Icon-Lookup wie beim Ghost)
S.buildingSprites = {};

function loadBuildingSprite(id){
  if (S.buildingSprites[id]) return;
  const img = new Image();
  
  // selbes Schema wie unser Ghost
  const url = `assets/icons/buildings/${id}.png`;
  img.src = url;

  S.buildingSprites[id] = img;
}
  
  function placeInternal(id,x,y,opt={}){
    const w=(opt.w|0)||3, h=(opt.h|0)||3;
    if (!(Number.isFinite(x)&&Number.isFinite(y) && x>=0 && y>=0)){
      return { ok:false, reason:'invalid_xy' };
    }
    S.buildings.push({ id, x:x|0, y:y|0, w, h });
    window.dispatchEvent(new CustomEvent('cb:build:placed', { detail:{ id, x:x|0, y:y|0, w, h } }));
    return { ok:true, id, x:x|0, y:y|0, w, h };
  }

  /* ==========================================================================
   * 6) HAUPTLOGIK / PUBLIC API
   * ======================================================================== */
  const Game = window.Game;

  Game.start = function(map, opt={}){
    try {
      ensureCanvas();

      S.tileset    = opt.tileset    || S.tileset || null;
      S.tilesetUrl = opt.tilesetUrl || S.tilesetUrl || null;
      if (S.tileset) INFO('Tileset bereit:', S.tilesetUrl || '(inline)'); else WARN('Tileset fehlt');

      S.map = map || null;
      try { normalizeMap(S.map); } catch(e){ WARN('Map-Normalisierung fehlgeschlagen:', e?.message||e); }

      // Initial-Fit NICHT erzwingen, solange das CSS-Rect evtl. noch 0×0 ist.
      // Wir resetten nur das Flag und lassen resizeToCssRect() den ersten
      // sinnvollen Fit auslösen, sobald Layout+Map bereit sind.
      S.didInitialFit = false;
      resizeToCssRect();   // versucht ggf. sofort zu fitten

      if (!S.running){
        S.running = true;
        S.rafId = requestAnimationFrame(frame);
      }
    } catch (e) {
      ERR('Game.start Fehler:', e?.message||e);
    }
  };

  Game.placeBuilding = function(id,x,y,opt){
    const r=placeInternal(id,x,y,opt||{});
    if(!r.ok) WARN('placeBuilding fail',r);
    return r;
  };

  // Debug/Diagnose für Inspector
  window.Game.__dbg = {
    state: S,
    resize: ()=> resizeToCssRect(),
    fitToMap: (mode)=> fitToMap(mode||VIEW_PREF.fit),
    zoomAt
  };

  /* ==========================================================================
   * 7) EVENT-BRIDGES
   * ======================================================================== */

  // Map kommt über die Bridge
  addEventListener('cb:map:ready', (e)=>{
    const d=e.detail||{};
    Game.start(d.map, { tileset:d.tileset, tilesetUrl:d.tilesetUrl });
  });

  // Boot → Renderloop sicher starten
  addEventListener('cb:game:start', ()=>{
    try{
      ensureCanvas();
      if(!S.running){ S.running=true; S.rafId=requestAnimationFrame(frame); }
    } catch(e){
      ERR('cb:game:start Fehler:', e?.message||e);
    }
  }, { once:true });

  // Kamera (beide Varianten akzeptieren)
  function onCamera(e){
    const d=e?.detail||{};
    if (typeof d.x==='number')    S.cam.x = d.x;
    if (typeof d.y==='number')    S.cam.y = d.y;
    if (typeof d.zoom==='number') S.cam.zoom = clamp(d.zoom||1, 0.1, 6);
    // Zeichnung erfolgt im RAF
  }
  addEventListener('cb:camera-change', onCamera);
  addEventListener('cb:camera:update', onCamera);

  // Fokus-Zoom via Event (z. B. Pinch-Handler)
  addEventListener('req:camera:zoomAt', (e)=>{
    const d=e.detail||{};
    if (typeof d.cx==='number' && typeof d.cy==='number' && typeof d.zoom==='number') {
      zoomAt(d.cx, d.cy, d.zoom);
    }
  });

  // Platzieren: nur vom neuen Input annehmen
  addEventListener('cb:build:place', (e)=>{
    const d=e.detail||{};
    if (d.__src !== 'input-v25.11.14'){ WARN('Ignoriere ungetaggte Platzierung', d); return; }
    const xi=d.x|0, yi=d.y|0, wi=(d.w|0)||3, hi=(d.h|0)||3;
    const res = Game.placeBuilding(d.buildingId || d.kind, xi, yi, { w:wi, h:hi });
    INFO('Platzierung (akzeptiert)', res);
  });

  OK('Modul geladen (', 'v25.11.17-final.2', ')');

  /* ==========================================================================
   * 8) EXPORTS (nach STYLE-Vorgabe)
   * ======================================================================== */
  // Bereits oben via window.Game verbunden.
  // Zusätzliche Exports hier eintragen, falls du sie später brauchst:
  // window.Game.someHelper = () => {};
})();
