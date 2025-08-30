// game.js — v16.1.21 (ES5)
// ---------------------------------------------------------
// Initialisiert die Engine, registriert GameLoader._start(mapUrl)
// und sendet Events ('cb:engine-ready', 'cb:game-started').
// Zeichnet eine Map (Tiles) – mit Fallback, falls Atlas fehlt.
// ---------------------------------------------------------
(function(){
  'use strict';
  var VERSION = 'v16.1.21';

  // ---- Logging Helper -------------------------------------------------------
  var log = {
    ok:   function(m){ return (window.CBLog && window.CBLog.ok   ? window.CBLog.ok   : console.log)(m); },
    warn: function(m){ return (window.CBLog && window.CBLog.warn ? window.CBLog.warn : console.warn)(m); },
    err:  function(m){ return (window.CBLog && window.CBLog.err  ? window.CBLog.err  : console.error)(m); },
    raw:  function(m){ return (window.CBLog && window.CBLog.push ? window.CBLog.push : console.log)('LOG', m); }
  };

  // Public Namespace
  var GL = (window.GameLoader = window.GameLoader || {});

  // Engine State
  var engineReady = false;
  var canvas = null, ctx = null;

  // Tileset / Atlas – deine Pfade
  var TILESET_PNG  = './assets/tiles/tileset.terrain.png';
  var TILESET_JSON = './assets/tiles/tileset.terrain.json';

  // aktuelle Map & Assets
  var currentMap = null;
  var tilesetImg = null;
  var atlas = null;

  // -- Utils ------------------------------------------------------------------
  function loadImage(src){
    return new Promise(function(resolve, reject){
      var img = new Image();
      img.onload = function(){ resolve(img); };
      img.onerror = function(){ reject(new Error('Bild konnte nicht geladen werden: '+src)); };
      img.src = src;
    });
  }

  function loadJSON(url){
    return fetch(url).then(function(r){
      if(!r.ok) throw new Error('HTTP '+r.status+' beim Laden: '+url);
      return r.json();
    });
  }

  // -- Minimal-Renderer (Kacheln) --------------------------------------------
  function renderMap(){
    if(!ctx || !currentMap) return;

    var width  = currentMap.width;
    var height = currentMap.height;
    var tile   = currentMap.tile;

    ctx.clearRect(0,0,canvas.width,canvas.height);

    if(!atlas || !tilesetImg){
      // Fallback: einfache Farbkacheln
      var colors = ['#5a7a39', '#6b8f3e', '#7aa346', '#90b45a'];
      for(var y=0; y<height; y++){
        for(var x=0; x<width; x++){
          ctx.fillStyle = colors[(x + y) % colors.length];
          ctx.fillRect(x*tile, y*tile, tile, tile);
        }
      }
      return;
    }

    // Wenn ein Layer mit tileIndices vorhanden ist:
    var layers = currentMap.layers || [];
    if (!layers.length){
      // alles gras
      for(var yy=0; yy<height; yy++){
        for(var xx=0; xx<width; xx++){
          drawTileIndex(0, xx, yy, tile);
        }
      }
      return;
    }

    // simplestes Rendering: nur erster Layer
    var L0 = layers[0];
    var data = L0.data || [];
    for (var i=0;i<data.length;i++){
      var idx = data[i]|0;
      var tx = i % width;
      var ty = Math.floor(i / width);
      drawTileIndex(idx, tx, ty, tile);
    }
  }

  // Zeichnet eine Tile basierend auf atlas (index -> src rect)
  function drawTileIndex(idx, tx, ty, tile){
    // atlas-Format erwartet: atlas.tiles[idx] = {x,y,w,h}
    var t = atlas && atlas.tiles ? atlas.tiles[idx] : null;
    if (!t){
      // Fallback: einfärben
      ctx.fillStyle = '#5a7a39';
      ctx.fillRect(tx*tile, ty*tile, tile, tile);
      return;
    }
    try {
      ctx.drawImage(tilesetImg, t.x, t.y, t.w, t.h, tx*tile, ty*tile, tile, tile);
    } catch(e){
      // falls out-of-bounds o.ä.
      ctx.fillStyle = '#5a7a39';
      ctx.fillRect(tx*tile, ty*tile, tile, tile);
    }
  }

  // -- Engine-Init ------------------------------------------------------------
  function initEngine(){
    if (engineReady) return;

    canvas = document.getElementById('game')
          || document.getElementById('stage')
          || (function(){ var c = document.createElement('canvas'); c.id='game'; document.body.appendChild(c); return c; })();

    ctx = canvas.getContext('2d');

    function fit(){
      var dpr = Math.max(1, Math.min(3, window.devicePixelRatio||1));
      var w = Math.max(320, Math.floor(window.innerWidth || document.documentElement.clientWidth || 800));
      var h = Math.max(240, Math.floor(window.innerHeight || document.documentElement.clientHeight || 600));
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      if (ctx.setTransform) ctx.setTransform(dpr,0,0,dpr,0,0);
      if (currentMap) renderMap();
    }
    window.addEventListener('resize', fit);
    fit();

    engineReady = true;
    log.ok("game.js geladen, game.js " + VERSION);
    try {
      window.dispatchEvent(new CustomEvent('cb:engine-ready', { detail:{ v: VERSION }}));
    } catch(_){}
    try {
      if (GL._flush) GL._flush();
    } catch(_){}
  }

  // -- Public Start -----------------------------------------------------------
  GL._start = function(mapUrl){
    return new Promise(function(resolve, reject){
      function startNow(){
        log.ok("GameLoader.start " + mapUrl);

        // 1) Map laden/normalisieren
        loadJSON(mapUrl).then(function(map){

          // --- Map normalisieren (unterstützt width/height ODER w/h) ---
          var width  = (map.width  != null ? map.width  : (map.w != null ? map.w : 16));
          var height = (map.height != null ? map.height : (map.h != null ? map.h : 10));
          var tile   = (map.tile   != null ? map.tile   :
                       (map.tileSize != null ? map.tileSize :
                       (map.tile_size != null ? map.tile_size : 32)));

          currentMap = {
            width:  width,
            height: height,
            tile:   tile,
            // Layer-Formate abdecken:
            layers:  map.layers ? map.layers
                    : (map.tiles ? [{ name: 'ground', data: map.tiles }] : [])
          };

          log.ok("Map geladen: " + width + "×" + height + " · Tile " + tile);

          // 2) Atlas + Tileset
          Promise.all([ loadJSON(TILESET_JSON), loadImage(TILESET_PNG) ])
            .then(function(results){
              atlas = results[0];
              tilesetImg = results[1];
            })
            .catch(function(e){
              atlas = null; tilesetImg = null;
              log.warn("Atlas/Textures nicht geladen: " + e.message);
            })
            .then(function(){
              // 3) Render
              renderMap();
              // 4) Events/Logs
              log.ok("Game gestartet (" + mapUrl + ")");
              try {
                window.dispatchEvent(new CustomEvent('cb:game-started', { detail:{ map: mapUrl }}));
              } catch(_){}
              try {
                if (window.GameUI && typeof window.GameUI.onGameStarted === 'function'){
                  window.GameUI.onGameStarted();
                }
              } catch(_){}
              resolve(true);
            });

        }).catch(function(e){
          log.err("Start fehlgeschlagen: " + e.message);
          reject(e);
        });
      }

      try{
        if(!engineReady) initEngine();
        startNow();
      }catch(e){
        log.err("Engine-Init Fehler: " + e.message);
        reject(e);
      }
    });
  };

  // Auto-Init sofort beim Laden der Datei
  try { initEngine(); } catch(e){ log.err('Engine-Init Fehler: ' + e.message); }

  // Globale Version sichtbar machen (optional)
  GL.version = VERSION;
})();
