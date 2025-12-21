/* =====================================================================
 * core/game.map.js
 * v25.12.21-map-stable-nofetch
 *
 * ZIEL:
 * - iOS/Safari "lädt ewig" Fix: KEIN fetch(blob)/AbortController mehr.
 * - Tileset wird ausschließlich aus core/asset.js (Assets) gebunden.
 * - Wenn Tileset fehlt: Fallback-Renderer (farbige Tiles) => nie "schwarz".
 * - Singleton-Guard: verhindert doppelte Initialisierung (mehrfacher Watchdog, doppelte Logs).
 *
 * EVENT-BUS (nur Doppelpunkte):
 * - hört:   cb:game:start, cb:registry:ready
 * - sendet: cb:map:ready   (mapReady=true, egal ob Tileset oder Fallback)
 * ===================================================================== */
(function(){
  'use strict';

  // -------------------------------------------------------------------
  // SINGLETON-GUARD (verhindert doppelte Ausführung bei mehrfachen Includes)
  // -------------------------------------------------------------------
  if (window.__CB_CORE_MAP__ && window.__CB_CORE_MAP__.__v === 'v25.12.21-map-stable-nofetch') {
    return;
  }

  const Mod = window.__CB_CORE_MAP__ = window.__CB_CORE_MAP__ || {};
  Mod.__v = 'v25.12.21-map-stable-nofetch';

  // -------------------------------------------------------------------
  // HELPER: Logger
  // -------------------------------------------------------------------
  const TAG = '[map]';
  const LOG = (...a)=> console.log(TAG, ...a);
  const WARN = (...a)=> console.warn(TAG, ...a);

  // -------------------------------------------------------------------
  // HELPER: Bus (kompatibel zu euren cb:/req: Events)
  // -------------------------------------------------------------------
  function busEmit(type, detail){
    try{
      window.dispatchEvent(new CustomEvent(type, { detail }));
    }catch(e){
      // iOS fallback (sehr selten nötig)
      try{ window.dispatchEvent(new Event(type)); }catch(_){}
    }
  }
  function busOn(type, fn){
    window.addEventListener(type, fn);
    return ()=>window.removeEventListener(type, fn);
  }

  // -------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------
  let _canvas = null;
  let _ctx = null;
  let _map = null;           // { w,h, tiles[] ... } wie bei euch
  let _tileSize = 64;        // wird ggf. aus Registry übernommen
  let _tilesetImg = null;    // aus Assets
  let _tilesetReady = false;
  let _readyEmitted = false;

  // -------------------------------------------------------------------
  // CANVAS Setup
  // -------------------------------------------------------------------
  function ensureCanvas(){
    if (_canvas && _ctx) return;
    _canvas = document.getElementById('game');
    if (!_canvas){
      // euer Projekt nutzt id="game" für das Canvas (falls mal anders: anpassen)
      WARN('Canvas #game nicht gefunden – Map kann nicht rendern.');
      return;
    }
    _ctx = _canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', ()=>resizeCanvas());
  }

  function resizeCanvas(){
    if (!_canvas) return;
    // CSS-Size übernehmen (wie ihr es in anderen Modulen macht)
    const r = _canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));
    _canvas.width = w;
    _canvas.height = h;
  }

  // -------------------------------------------------------------------
  // TILESET aus Assets binden (KEIN fetch)
  // Erwartet core/asset.js: Assets.images['tileset.terrain'] oder ähnlich.
  // Wir sind defensiv: wir probieren mehrere Keys.
  // -------------------------------------------------------------------
  function bindTilesetFromAssets(){
    const A = window.Assets || window.asset || window.coreAssets;
    if (!A) return false;

    // häufige API-Formen:
    // - Assets.getImage(key)
    // - Assets.images[key]
    // - Assets.img[key]
    const keys = [
      'tileset.terrain',
      'tileset_terrain',
      'terrainTileset',
      'tilesetTerrain',
      'tileset',
      'terrain'
    ];

    let img = null;

    try{
      if (typeof A.getImage === 'function'){
        for (const k of keys){
          img = A.getImage(k);
          if (img) break;
        }
      }
    }catch(_){}

    if (!img){
      try{
        const pools = [A.images, A.img, A._images, A.cache];
        for (const pool of pools){
          if (!pool) continue;
          for (const k of keys){
            if (pool[k] instanceof HTMLImageElement) { img = pool[k]; break; }
          }
          if (img) break;
        }
      }catch(_){}
    }

    if (!img) return false;

    _tilesetImg = img;
    // ready wenn Bild geladen ist (complete && naturalWidth)
    _tilesetReady = !!(_tilesetImg.complete && _tilesetImg.naturalWidth > 0);
    if (_tilesetReady){
      LOG('Tileset gebunden ✓ (Assets)', { w:_tilesetImg.naturalWidth, h:_tilesetImg.naturalHeight });
    } else {
      // wenn Assets gerade noch lädt: onload abwarten
      _tilesetImg.addEventListener('load', ()=>{
        _tilesetReady = true;
        LOG('Tileset geladen ✓ (Assets onload)');
        tryEmitReady('tileset-onload');
      }, { once:true });
      _tilesetImg.addEventListener('error', ()=>{
        WARN('Tileset Fehler (Assets img error) – nutze Fallback-Farben.');
        _tilesetReady = false;
        tryEmitReady('tileset-error');
      }, { once:true });
    }
    return true;
  }

  // -------------------------------------------------------------------
  // MAP-DATEN holen (aus Game oder Registry)
  // Wir nehmen was verfügbar ist – ohne harte Annahmen.
  // -------------------------------------------------------------------
  function grabMapFromGame(){
    // mögliche Stellen im Projekt:
    // - window.Game.map
    // - window.Game.state.map
    // - window.GameWorld.map
    const G = window.Game || window.game || null;
    if (G?.map) return G.map;
    if (G?.state?.map) return G.state.map;
    if (window.GameWorld?.map) return window.GameWorld.map;
    return null;
  }

  // -------------------------------------------------------------------
  // FALLBACK-RENDERER (wenn Tileset fehlt)
  // - zeichnet grob grass/water/earth anhand tile-id
  // - sorgt dafür: niemals schwarzer Screen nur wegen Tileset
  // -------------------------------------------------------------------
  function drawFallback(){
    if (!_ctx || !_map) return;
    // einfache Palette
    const colors = {
      grass: '#5aa44a',
      water: '#3b7fb3',
      dirt:  '#8b6a3a',
      rock:  '#808080'
    };

    const w = _map.w || _map.width || 0;
    const h = _map.h || _map.height || 0;
    const tiles = _map.tiles || _map.data || _map.grid || [];

    // camera/offset: wir zeichnen erst mal "top-left" simpel.
    // (Euer echtes Rendering macht Kamera/Zoom – das bleibt in eurem Game-Loop.)
    // Hier nur: Fallback, damit man überhaupt was sieht.
    const size = _tileSize;

    for (let ty=0; ty<h; ty++){
      for (let tx=0; tx<w; tx++){
        const idx = ty*w + tx;
        const t = tiles[idx] ?? 0;

        // Heuristik: in euren Maps scheint Wasser in einem separaten Block zu sein.
        let c = colors.grass;
        if (t === 0) c = colors.grass;
        else if (t >= 200 && t < 300) c = colors.water;
        else if (t >= 50 && t < 120) c = colors.dirt;
        else if (t >= 120 && t < 160) c = colors.rock;

        _ctx.fillStyle = c;
        _ctx.fillRect(tx*size, ty*size, size, size);
      }
    }
  }

  // -------------------------------------------------------------------
  // ECHTES TILESET RENDERING (sehr minimal)
  // - nutzt ein klassisches Tileset-Sheet (Spalten/Zeilen)
  // - tile-id = index im Sheet
  // HINWEIS: Euer Projekt hat bereits komplexeres Rendern. Dieses Modul
  // ist absichtlich konservativ: wenn ihr schon einen Renderer habt,
  // könnt ihr diesen Teil später wieder ersetzen.
  // -------------------------------------------------------------------
  function drawTileset(){
    if (!_ctx || !_map || !_tilesetReady || !_tilesetImg) return false;

    const w = _map.w || _map.width || 0;
    const h = _map.h || _map.height || 0;
    const tiles = _map.tiles || _map.data || _map.grid || [];
    const size = _tileSize;

    const cols = Math.max(1, Math.floor(_tilesetImg.naturalWidth / size));

    for (let ty=0; ty<h; ty++){
      for (let tx=0; tx<w; tx++){
        const idx = ty*w + tx;
        const t = tiles[idx] ?? 0;
        const sx = (t % cols) * size;
        const sy = Math.floor(t / cols) * size;
        _ctx.drawImage(_tilesetImg, sx, sy, size, size, tx*size, ty*size, size, size);
      }
    }
    return true;
  }

  // -------------------------------------------------------------------
  // READY EMIT
  // - wichtig: setzt mapReady auch bei Tileset-Fehler, sonst hängt Cinematic ewig
  // -------------------------------------------------------------------
  function tryEmitReady(src){
    if (_readyEmitted) return;
    if (!_map) return;

    _readyEmitted = true;
    const detail = {
      mapReady: true,
      tilesetReady: _tilesetReady,
      src
    };
    LOG('cb:map:ready ✓', detail);
    busEmit('cb:map:ready', detail);
  }

  // -------------------------------------------------------------------
  // PUBLIC-ish tick: wird vom Game-Loop genutzt (wenn vorhanden)
  // - wenn ihr schon eine Render-Pipeline habt, könnt ihr hier nur "bindTilesetFromAssets"
  //   und "tryEmitReady" nutzen und euer eigenes Rendern laufen lassen.
  // -------------------------------------------------------------------
  function renderOnce(){
    ensureCanvas();
    _map = _map || grabMapFromGame();
    if (!_map){
      // Map kommt etwas später – kein Spam.
      return;
    }

    // TileSize ggf. aus Registry
    const R = window.Registry || window.registry || null;
    const ts = R?.tileSize || R?.map?.tileSize;
    if (typeof ts === 'number' && ts > 0) _tileSize = ts;

    // Tileset binden (falls noch nicht)
    if (!_tilesetImg) bindTilesetFromAssets();

    // Render
    if (_ctx){
      _ctx.clearRect(0,0,_canvas.width,_canvas.height);

      // wenn Tileset bereit: nutzen, sonst Fallback-Farben
      const ok = drawTileset();
      if (!ok) drawFallback();
    }

    tryEmitReady('renderOnce');
  }

  // -------------------------------------------------------------------
  // HOOKS
  // -------------------------------------------------------------------
  let _loopTimer = null;
  function startMiniLoop(){
    if (_loopTimer) return;
    // leichter Loop, damit nach Assets-Load direkt gerendert wird
    _loopTimer = window.setInterval(()=>{
      try{ renderOnce(); }catch(e){ WARN('renderOnce error', e); }
      // wenn ready emittiert, können wir Loop stoppen (aber lassen minimal laufen)
      if (_readyEmitted && _tilesetReady){
        // Stop wenn alles da – reduziert CPU
        window.clearInterval(_loopTimer);
        _loopTimer = null;
      }
    }, 200);
  }

  // Bei Spielstart
  busOn('cb:game:start', ()=>{
    startMiniLoop();
    // direkt einmal rendern
    try{ renderOnce(); }catch(e){ WARN('renderOnce error', e); }
  });

  // Bei Registry ready: tileSize/map könnte dann da sein
  busOn('cb:registry:ready', ()=>{
    startMiniLoop();
    try{ renderOnce(); }catch(e){ WARN('renderOnce error', e); }
  });

  // Falls jemand manuell initten will
  Mod.renderOnce = renderOnce;

  LOG('geladen ✓', Mod.__v);
})();