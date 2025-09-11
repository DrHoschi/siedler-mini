/* ============================================================================
 * Datei: assets/core/core.map.js
 * Projekt: Siedler-Mini
 * Version: v17.0.1
 * Zweck:
 *   - Karte laden (JSON) + Tileset/Atlas + Gebäude-Texturen vorladen
 *   - Kamera-Utilities (getCamera, clamp, tile<->world)
 *   - Map-State in GameCore.state pflegen (S.map, S.atlas, S.tilesetImg)
 *   - Auto-Spawn Townhall + Kamera-Zentrierung
 *   - Renderer-Integration (MapDrawer + CameraProvider), robust gegen Lade-Reihenfolge
 * Events:
 *   - ns.util.emit('cb:game-started', { map: url })
 * ========================================================================== */
(function (ns) {
  'use strict';
  if (!ns || !ns.state) { console.error('[map] GameCore.env fehlt'); return; }

  var S = ns.state;
  var U = ns.util;
  var E = null; // Entities-Lazy

  // --------------------------- Loader-Helfer ---------------------------------
  function loadJSON(url){
    return fetch(url).then(function(r){
      if (!r.ok) throw new Error('http ' + r.status + ' ' + url);
      return r.json();
    });
  }
  function loadImage(src){
    return new Promise(function(res, rej){
      var i = new Image();
      i.onload = function(){ res(i); };
      i.onerror = function(){ rej(new Error('img ' + src)); };
      i.src = src;
    });
  }

  // --------------------------- Map/Camera Utils ------------------------------
  function mapPixelSize(){
    if (!S.map) return { w:0, h:0 };
    return { w: S.map.width * S.map.tile, h: S.map.height * S.map.tile };
  }
  function clampCam(){
    if (!S.map) return;
    var px = mapPixelSize();
    var z  = S.cam.zoom || 1;
    var maxX = Math.max(0, px.w - (ns.__viewW__  || window.innerWidth ) / z);
    var maxY = Math.max(0, px.h - (ns.__viewH__  || window.innerHeight) / z);
    S.cam.x = U.clamp(S.cam.x, 0, maxX);
    S.cam.y = U.clamp(S.cam.y, 0, maxY);
  }
  function tileToWorld(tx,ty){ var t=S.map?.tile||64; return { x: tx*t, y: ty*t }; }
  function worldToTile(px,py){ var t=S.map?.tile||64; return { x: (px/t)|0, y: (py/t)|0 }; }

  function getTileSize(){ return S.map ? (S.map.tile|0) : 64; }
  function getMapSize(){ return S.map ? { w:S.map.width|0, h:S.map.height|0 } : { w:0, h:0 }; }
  function getCamera(){  return S.cam; }

  function normalizeMap(map){
    function pickNum(){ for (var i=0;i<arguments.length;i++){ var v=arguments[i]; if(v!==undefined && v!==null && !isNaN(v)) return Number(v);} }
    var ms = map.mapSize || map.size || null;
    var width  = pickNum(map.width,  map.w,  ms && ms.w,  ms && ms.width)  || 16;
    var height = pickNum(map.height, map.h,  ms && ms.h,  ms && ms.height) || 10;
    var tile   = pickNum(map.tile,   map.tileSize, map.tile_size, map.tilePX) || 64;
    return {
      width: width|0, height: height|0, tile: tile|0,
      layers: map.layers ? map.layers : (map.tiles ? [{ name:'ground', data: map.tiles }] : [])
    };
  }

  // --------------------------- Renderer-Integration --------------------------
  // 1) Drawer (einfacher Tileset-Renderer)
  function drawMapWithTileset(ctx, cam) {
    if (!S.map || !S.tilesetImg) return;
    var img  = S.tilesetImg;
    var tile = S.map.tile|0;

    var cols = Math.max(1, (img.width / tile) | 0);

    var layer = (S.map.layers && S.map.layers[0] && S.map.layers[0].data) ? S.map.layers[0].data : null;
    if (!layer) return;

    var camX = cam && cam.x ? cam.x : 0;     // Tile-Koordinaten
    var camY = cam && cam.y ? cam.y : 0;
    var zoom = cam && cam.zoom ? cam.zoom : 1;

    var viewW = (ctx.canvas && ctx.canvas.width)  || 800;
    var viewH = (ctx.canvas && ctx.canvas.height) || 600;

    var tW = S.map.width|0, tH = S.map.height|0;

    var startX = Math.max(0, Math.floor(camX));
    var startY = Math.max(0, Math.floor(camY));
    var endX   = Math.min(tW-1, Math.ceil(camX + (viewW / (tile*zoom))) + 1);
    var endY   = Math.min(tH-1, Math.ceil(camY + (viewH / (tile*zoom))) + 1);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (var ty = startY; ty <= endY; ty++) {
      for (var tx = startX; tx <= endX; tx++) {
        var idx = ty * tW + tx;
        var id  = (layer[idx] | 0);
        if (id <= 0) continue;          // 0/leer = nichts
        id = id - 1;                     // 1-basiert -> 0-basiert

        var sx = (id % cols) * tile;
        var sy = ((id / cols) | 0) * tile;

        var dx = Math.round((tx - camX) * tile);
        var dy = Math.round((ty - camY) * tile);
        var dw = Math.round(tile * zoom);
        var dh = Math.round(tile * zoom);

        ctx.drawImage(img, sx, sy, tile, tile, dx, dy, dw, dh);
      }
    }

    ctx.restore();
  }

  // 2) Camera-Provider (Renderer erwartet Tile-Koordinaten)
  function cameraForRender(){
    var t = S.map?.tile || 64;
    return { x:(S.cam.x||0)/t, y:(S.cam.y||0)/t, zoom:S.cam.zoom||1 };
  }

  // 3) Wiring – sicher/Idempotent, egal wann Render kommt
  var _wired = false;
  function wireRendererIfPossible(){
    if (_wired) return;
    if (!window.Render || typeof Render.setMapDrawer!=='function' || typeof Render.setCameraProvider!=='function') {
      return; // Render noch nicht bereit
    }
    try {
      Render.setCameraProvider(cameraForRender);
      Render.setMapDrawer(drawMapWithTileset);
      _wired = true;
      (ns.ok||console.log)('[map] Render verkabelt');
    } catch(e){
      (ns.warn||console.warn)('[map] Render-Wiring fehlgeschlagen:', e && e.message);
    }
  }
  // auf „render-ready“ warten, falls Render später kommt
  try { window.addEventListener('cb:render-ready', wireRendererIfPossible, { once:false }); } catch(_){}

  // --------------------------- Entities / Kamera -----------------------------
  function ensureTownhall(){
    for (var i=0;i<S.entities.length;i++){
      if (S.entities[i].key==='townhall') return;
    }
    var cx = (S.map.width/2)|0, cy = (S.map.height/2)|0;
    var can = ns.Entities && ns.Entities.canPlace && ns.Entities.canPlace('townhall', cx-1, cy-1);
    if (can && ns.Entities && ns.Entities.place) ns.Entities.place('townhall', cx-1, cy-1);
  }
  function centerCameraOn(tx,ty){
    var t = getTileSize();
    var px = { x: tx*t, y: ty*t };
    var viewW = ns.__viewW__ || Math.max(320, Math.floor(window.innerWidth));
    var viewH = ns.__viewH__ || Math.max(240, Math.floor(window.innerHeight));
    S.cam.zoom = 1;
    S.cam.x = U.clamp(px.x - viewW/2, 0, Math.max(0, mapPixelSize().w - viewW));
    S.cam.y = U.clamp(px.y - viewH/2, 0, Math.max(0, mapPixelSize().h - viewH));
  }
  function preloadBuildingImages(){
    var B = ns.Entities && ns.Entities.BUILDINGS || {};
    var jobs = [];
    Object.keys(B).forEach(function(k){
      var def = B[k];
      if (!def || !def.img) return;
      jobs.push(
        loadImage(def.img).then(function(img){ def._img = img; })
          .catch(function(e){ (ns.warn||console.warn)('[map] Texture fehlt:', def.img); })
      );
    });
    return Promise.allSettled(jobs);
  }

  // --------------------------- Map laden -------------------------------------
  function load(mapUrl){
    // Entities ggf. nachziehen
    E = ns.Entities || E;

    (ns.ok||console.log)('GameLoader.start', mapUrl);

    return loadJSON(mapUrl)
      .then(function(map){
        S.map = normalizeMap(map);
        (ns.ok||console.log)('Map geladen:', S.map.width+'×'+S.map.height, '· Tile', S.map.tile);
      })
      .then(function(){
        var TILESET_PNG  = './assets/tiles/tileset.terrain.png';
        var TILESET_JSON = './assets/tiles/tileset.terrain.json';
        return Promise.all([
          loadJSON(TILESET_JSON).then(function(at){ S.atlas = at; })
            .catch(function(e){ S.atlas=null; (ns.warn||console.warn)('[map] Atlas JSON nicht geladen:', e.message); }),
          loadImage(TILESET_PNG).then(function(img){ S.tilesetImg = img; })
            .catch(function(e){ S.tilesetImg=null; (ns.warn||console.warn)('[map] Tileset PNG nicht geladen:', e.message); }),
          preloadBuildingImages()
        ]);
      })
      .then(function(){
        ensureTownhall();
        var th = (function(){ for (var i=0;i<S.entities.length;i++){ if (S.entities[i].key==='townhall') return S.entities[i]; } return null; })();
        var cx = th ? (th.tx + (th.wTiles>>1)) : (S.map.width>>1);
        var cy = th ? (th.ty + (th.hTiles>>1)) : (S.map.height>>1);
        centerCameraOn(cx, cy);

        // JETZT den Renderer sicher verkabeln (falls Render inzwischen geladen wurde)
        wireRendererIfPossible();

        // und falls Render erst danach „ready“ meldet, greift der Listener oben
        U.emit('cb:game-started', { map: mapUrl });
        if (window.GameUI && typeof window.GameUI.onGameStarted==='function') window.GameUI.onGameStarted();
        (ns.ok||console.log)('Game gestartet');
      })
      .catch(function(e){
        (ns.err||console.error)('Start fehlgeschlagen:', e && e.message);
        throw e;
      });
  }

  // --------------------------- Export ----------------------------------------
  ns.Map = {
    load: load,
    getTileSize: getTileSize,
    getMapSize: getMapSize,
    getCamera: getCamera,
    tileToWorld: tileToWorld,
    worldToTile: worldToTile,
    clampCam: clampCam
  };

  (ns.ok||console.log)('[map] Modul geladen (v17.0.1)');

})(window.GameCore = window.GameCore || {});
