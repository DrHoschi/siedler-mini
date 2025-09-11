/* ============================================================================
 * Datei: core.map.js
 * Projekt: Siedler-Mini
 * Version: v17.0.0
 * Zweck:
 *   - Karte laden (JSON) + Tileset/Atlas + Gebäude-Texturen vorladen
 *   - Kamera-Utilities (getCamera, clamp, tile<->world)
 *   - Map-State in GameCore.state pflegen (S.map, S.atlas, S.tilesetImg)
 *   - Auto-Spawn Townhall (wenn nicht vorhanden) und Kamera-Zentrierung
 *   - Events: 
 *       • ns.util.emit('cb:game-started', {map: url})
 *       • (engine-ready wird typ. vom Bootstrap gesendet)
 * Hinweise:
 *   - Keine DOM-Erzeugung (Canvas kommt aus Render/Input/Bootstrap)
 *   - Robust gegen fehlende Texturen → Fallback (Render macht Grünflächen)
 * ========================================================================== */
(function(ns){
  'use strict';
  if (!ns || !ns.state) { console.error('[map] GameCore.env fehlt'); return; }

  var S = ns.state;
  var U = ns.util;
  var E = null;  // wird bei init gesetzt

  // --------------------------- Helpers ---------------------------------------
  function loadJSON(url){
    return fetch(url).then(function(r){
      if (!r.ok) throw new Error('http '+r.status+' '+url);
      return r.json();
    });
  }
  function loadImage(src){
    return new Promise(function(res, rej){
      var i = new Image();
      i.onload = function(){ res(i); };
      i.onerror = function(){ rej(new Error('img '+src)); };
      i.src = src;
    });
  }

  function mapPixelSize(){
    if (!S.map) return {w:0,h:0};
    return { w: S.map.width*S.map.tile, h: S.map.height*S.map.tile };
  }

  function clampCam(){
    if (!S.map) return;
    var px = mapPixelSize();
    var maxX = Math.max(0, px.w - ns.__viewW__ / (S.cam.zoom||1)); // __viewW__/__viewH__ werden in Render gepflegt
    var maxY = Math.max(0, px.h - ns.__viewH__ / (S.cam.zoom||1));
    S.cam.x = U.clamp(S.cam.x, 0, maxX);
    S.cam.y = U.clamp(S.cam.y, 0, maxY);
  }

  function tileToWorld(tx,ty){ var t=S.map?.tile||64; return { x: tx*t, y: ty*t }; }
  function worldToTile(px,py){ var t=S.map?.tile||64; return { x: Math.floor(px/t), y: Math.floor(py/t) }; }

  // --------------------------- Public Getters --------------------------------
  function getTileSize(){ return S.map ? (S.map.tile|0) : 64; }
  function getMapSize(){ return S.map ? { w:S.map.width|0, h:S.map.height|0 } : { w:0, h:0 }; }
  function getCamera(){ return S.cam; }

  // --------------------------- Loader ----------------------------------------
  function normalizeMap(map){
    function pickNum(){ for (var i=0;i<arguments.length;i++){ var v=arguments[i]; if(v!==undefined && v!==null && !isNaN(v)) return Number(v);} }
    var ms = map.mapSize || map.size || null;
    var width  = pickNum(map.width, map.w,  ms && ms.w,  ms && ms.width)  || 16;
    var height = pickNum(map.height,map.h,  ms && ms.h,  ms && ms.height) || 10;
    var tile   = pickNum(map.tile, map.tileSize, map.tile_size, map.tilePX) || 64;
    return {
      width:width|0, height:height|0, tile:tile|0,
      layers: map.layers ? map.layers : (map.tiles ? [{name:'ground', data:map.tiles}] : [])
    };
  }

    function ensureTownhall(){
    // prüfe ob vorhanden
    for (var i=0;i<S.entities.length;i++){
      if (S.entities[i].key==='townhall') return;
    }
    var cx = (S.map.width/2)|0, cy = (S.map.height/2)|0;
    var can = ns.Entities.canPlace('townhall', cx-1, cy-1);
    if (can) ns.Entities.place('townhall', cx-1, cy-1);
  }

  function centerCameraOn(tx,ty){
    var t = getTileSize();
    var px = { x: tx*t, y: ty*t };
    // Render hinterlegt diese Vars; wenn nicht vorhanden, nutzen wir window
    var viewW = ns.__viewW__ || Math.max(320, Math.floor(window.innerWidth));
    var viewH = ns.__viewH__ || Math.max(240, Math.floor(window.innerHeight));
    S.cam.zoom = 1;
    S.cam.x = U.clamp(px.x - viewW/2, 0, Math.max(0, mapPixelSize().w - viewW));
    S.cam.y = U.clamp(px.y - viewH/2, 0, Math.max(0, mapPixelSize().h - viewH));
  }

  function preloadBuildingImages(){
    // Gebäude-Textures laden (falls vorhanden) – Fehler sind ok (Fallback im Render)
    var B = ns.Entities.BUILDINGS; var jobs=[];
    Object.keys(B).forEach(function(k){
      var def = B[k];
      jobs.push(
        loadImage(def.img).then(function(img){ def._img = img; })
        .catch(function(e){ ns.warn('[map] Texture fehlt:', def.img); })
      );
    });
    return Promise.allSettled(jobs);
  }

  function load(mapUrl){
    // Lazy-Resolve Entities (falls Reihenfolge anders eingebunden wurde)
    E = ns.Entities || E;
    if (!E) { ns.warn('[map] Entities fehlen – warte evtl. bis Script geladen ist'); }

    ns.ok('GameLoader.start', mapUrl);

    return loadJSON(mapUrl)
      .then(function(map){ S.map = normalizeMap(map); ns.ok('Map geladen:', S.map.width+'×'+S.map.height, '· Tile', S.map.tile); })
      .then(function(){
        // Tileset/Atlas laden
        var TILESET_PNG  = './assets/tiles/tileset.terrain.png';
        var TILESET_JSON = './assets/tiles/tileset.terrain.json';
        return Promise.all([
          loadJSON(TILESET_JSON).then(function(at){ S.atlas = at; }).catch(function(e){ S.atlas=null; ns.warn('[map] Atlas JSON nicht geladen:', e.message); }),
          loadImage(TILESET_PNG).then(function(img){ S.tilesetImg = img; }).catch(function(e){ S.tilesetImg=null; ns.warn('[map] Tileset PNG nicht geladen:', e.message); }),
          preloadBuildingImages()
        ]);
      })
      .then(function(){
        // Townhall auto + Kamera zentrieren
        ensureTownhall();
        var th = (function(){ for (var i=0;i<S.entities.length;i++){ if (S.entities[i].key==='townhall') return S.entities[i]; } return null; })();
        var cx = th ? (th.tx + (th.wTiles>>1)) : (S.map.width>>1);
        var cy = th ? (th.ty + (th.hTiles>>1)) : (S.map.height>>1);
        centerCameraOn(cx, cy);

        // Fertig → Spielstart-Event
        U.emit('cb:game-started', { map: mapUrl });
        if (window.GameUI && typeof window.GameUI.onGameStarted==='function') window.GameUI.onGameStarted();
        ns.ok('Game gestartet');
      })
      .catch(function(e){
        ns.err('Start fehlgeschlagen:', e && e.message);
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

  ns.ok('[map] Modul geladen (v17.0.0)');

})(window.GameCore = window.GameCore || {});
