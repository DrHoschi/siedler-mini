// game.js — v16.1.22 (ES5)
// ---------------------------------------------------------
// Engine + Loader + Map-Renderer (Tiles) mit Pan & Zoom.
// Events: 'cb:engine-ready', 'cb:game-started'.
// ES5-kompatibel (iOS Safari).
// ---------------------------------------------------------
(function(){
  'use strict';
  var VERSION = 'v16.1.22';

  // ---- Logging --------------------------------------------------------------
  var log = {
    ok:   function(m){ return (window.CBLog && window.CBLog.ok   ? window.CBLog.ok   : console.log)(m); },
    warn: function(m){ return (window.CBLog && window.CBLog.warn ? window.CBLog.warn : console.warn)(m); },
    err:  function(m){ return (window.CBLog && window.CBLog.err  ? window.CBLog.err  : console.error)(m); }
  };

  // Public Namespace
  var GL = (window.GameLoader = window.GameLoader || {});

  // ---- Engine State ---------------------------------------------------------
  var engineReady = false;
  var canvas = null, ctx = null;
  var viewW = 0, viewH = 0, DPR = 1;

  // Kamera in Welt-Pixeln (linke obere Ecke) + Zoom
  var camera = { x: 0, y: 0, zoom: 1, minZ: 0.5, maxZ: 3.0 };

  // Tileset / Atlas – deine Pfade
  var TILESET_PNG  = './assets/tiles/tileset.terrain.png';
  var TILESET_JSON = './assets/tiles/tileset.terrain.json';

  // Map & Assets
  var currentMap = null;
  var tilesetImg = null;
  var atlas = null;

  // ---- Helpers --------------------------------------------------------------
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
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function mapPixelSize(){
    if (!currentMap) return { w:0, h:0 };
    return { w: currentMap.width * currentMap.tile, h: currentMap.height * currentMap.tile };
  }

  function clampCamera(){
    var sz = mapPixelSize();
    var maxX = Math.max(0, sz.w - viewW / camera.zoom);
    var maxY = Math.max(0, sz.h - viewH / camera.zoom);
    camera.x = clamp(camera.x, 0, maxX);
    camera.y = clamp(camera.y, 0, maxY);
  }

  // Bildschirm → Welt (vor Zoom/Offset)
  function screenToWorld(px, py){
    return {
      x: camera.x + px / camera.zoom,
      y: camera.y + py / camera.zoom
    };
  }

  // Zoom an einem Mittelpunkt (Weltkoordinate unter Cursor/Fingern halten)
  function zoomAt(factor, centerPx, centerPy){
    var pre = screenToWorld(centerPx, centerPy);
    camera.zoom = clamp(camera.zoom * factor, camera.minZ, camera.maxZ);
    var post = screenToWorld(centerPx, centerPy);
    camera.x += (pre.x - post.x);
    camera.y += (pre.y - post.y);
    clampCamera();
    renderMap();
  }

  // ---- Renderer -------------------------------------------------------------
  function renderMap(){
    if(!ctx || !currentMap) return;

    var tile = currentMap.tile;
    var w    = currentMap.width;
    var h    = currentMap.height;

    // Bildschirm löschen (physikalische Größe!)
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Sichtfenster in Tile-Koordinaten
    var left   = Math.floor(camera.x / tile);
    var top    = Math.floor(camera.y / tile);
    var right  = Math.ceil((camera.x + viewW / camera.zoom) / tile);
    var bottom = Math.ceil((camera.y + viewH / camera.zoom) / tile);

    left   = clamp(left,   0, w-1);
    top    = clamp(top,    0, h-1);
    right  = clamp(right,  0, w);
    bottom = clamp(bottom, 0, h);

    var layers = currentMap.layers || [];
    if (!layers.length){
      // Fallback: einfärben
      var colors = ['#5a7a39', '#6b8f3e', '#7aa346', '#90b45a'];
      for(var ty=top; ty<bottom; ty++){
        for(var tx=left; tx<right; tx++){
          var sx = Math.floor((tx*tile - camera.x) * camera.zoom);
          var sy = Math.floor((ty*tile - camera.y) * camera.zoom);
          var sz = Math.ceil(tile * camera.zoom);
          ctx.fillStyle = colors[(tx + ty) % colors.length];
          ctx.fillRect(sx, sy, sz, sz);
        }
      }
      return;
    }

    var L0 = layers[0];
    var data = L0.data || [];

    for (var ty2=top; ty2<bottom; ty2++){
      for (var tx2=left; tx2<right; tx2++){
        var i = ty2 * w + tx2;
        var idx = data[i]|0;

        var drawX = Math.floor((tx2*tile - camera.x) * camera.zoom);
        var drawY = Math.floor((ty2*tile - camera.y) * camera.zoom);
        var drawS = Math.ceil(tile * camera.zoom);

        if (atlas && tilesetImg && atlas.tiles && atlas.tiles[idx]){
          var t = atlas.tiles[idx];
          try {
            ctx.drawImage(tilesetImg, t.x, t.y, t.w, t.h, drawX, drawY, drawS, drawS);
          } catch(e){
            ctx.fillStyle = '#5a7a39';
            ctx.fillRect(drawX, drawY, drawS, drawS);
          }
        } else {
          ctx.fillStyle = '#5a7a39';
          ctx.fillRect(drawX, drawY, drawS, drawS);
        }
      }
    }
  }

  // ---- Engine-Init ----------------------------------------------------------
  function initEngine(){
    if (engineReady) return;

    canvas = document.getElementById('game')
          || document.getElementById('stage')
          || (function(){ var c = document.createElement('canvas'); c.id='game'; document.body.appendChild(c); return c; })();

    ctx = canvas.getContext('2d');

    function fit(){
      DPR = Math.max(1, Math.min(3, window.devicePixelRatio||1));
      var w = Math.max(320, Math.floor(window.innerWidth || document.documentElement.clientWidth || 800));
      var h = Math.max(240, Math.floor(window.innerHeight || document.documentElement.clientHeight || 600));
      canvas.width  = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      if (ctx.setTransform) ctx.setTransform(DPR,0,0,DPR,0,0);
      viewW = w; viewH = h;
      clampCamera();
      renderMap();
    }
    window.addEventListener('resize', fit);
    fit();

    // --- Input: Pan & Zoom ---------------------------------------------------
    var drag = { active:false, sx:0, sy:0, camX:0, camY:0, pinch:false, idA:null, idB:null, lastDist:0 };

    // Maus
    canvas.addEventListener('mousedown', function(e){
      drag.active = true; drag.pinch = false;
      drag.sx = e.clientX; drag.sy = e.clientY;
      drag.camX = camera.x; drag.camY = camera.y;
    });
    window.addEventListener('mousemove', function(e){
      if (!drag.active || drag.pinch) return;
      var dx = (e.clientX - drag.sx) / camera.zoom;
      var dy = (e.clientY - drag.sy) / camera.zoom;
      camera.x = drag.camX - dx;
      camera.y = drag.camY - dy;
      clampCamera();
      renderMap();
    });
    window.addEventListener('mouseup', function(){ drag.active=false; drag.pinch=false; });

    // Wheel-Zoom
    canvas.addEventListener('wheel', function(e){
      e.preventDefault ? e.preventDefault() : (e.returnValue=false);
      var factor = e.deltaY < 0 ? 1.15 : 1/1.15;
      var rect = canvas.getBoundingClientRect();
      var cx = (e.clientX - rect.left);
      var cy = (e.clientY - rect.top);
      zoomAt(factor, cx, cy);
    }, { passive:false });

    // Touch (Pan + Pinch)
    canvas.addEventListener('touchstart', function(e){
      if (e.touches.length === 1){
        var t = e.touches[0];
        drag.active = true; drag.pinch = false;
        drag.sx = t.clientX; drag.sy = t.clientY;
        drag.camX = camera.x; drag.camY = camera.y;
        drag.idA = t.identifier; drag.idB = null;
      } else if (e.touches.length >= 2){
        drag.active = true; drag.pinch = true;
        var a = e.touches[0], b = e.touches[1];
        drag.idA = a.identifier; drag.idB = b.identifier;
        drag.lastDist = Math.sqrt(Math.pow(a.clientX-b.clientX,2)+Math.pow(a.clientY-b.clientY,2));
        drag.camX = camera.x; drag.camY = camera.y;
      }
    }, { passive:true });

    canvas.addEventListener('touchmove', function(e){
      if (!drag.active) return;
      if (!drag.pinch && e.touches.length === 1){
        var t = e.touches[0];
        var dx = (t.clientX - drag.sx) / camera.zoom;
        var dy = (t.clientY - drag.sy) / camera.zoom;
        camera.x = drag.camX - dx;
        camera.y = drag.camY - dy;
        clampCamera();
        renderMap();
      } else if (e.touches.length >= 2){
        // Pinch
        var a = e.touches[0], b = e.touches[1];
        var dist = Math.sqrt(Math.pow(a.clientX-b.clientX,2)+Math.pow(a.clientY-b.clientY,2));
        if (drag.lastDist){
          var factor = dist / drag.lastDist;
          // Mittelpunkt
          var rect = canvas.getBoundingClientRect();
          var cx = ( (a.clientX + b.clientX)/2 ) - rect.left;
          var cy = ( (a.clientY + b.clientY)/2 ) - rect.top;
          zoomAt(factor, cx, cy);
        }
        drag.lastDist = dist;
      }
    }, { passive:true });

    window.addEventListener('touchend', function(){
      drag.active = false; drag.pinch = false; drag.lastDist = 0;
    });

    // Keyboard (Pfeile/WASD)
    window.addEventListener('keydown', function(e){
      var k = (e.key || '').toLowerCase();
      var step = Math.max(16, Math.floor(120 / camera.zoom));
      if (k==='arrowleft' || k==='a'){ camera.x -= step; }
      else if (k==='arrowright' || k==='d'){ camera.x += step; }
      else if (k==='arrowup' || k==='w'){ camera.y -= step; }
      else if (k==='arrowdown' || k==='s'){ camera.y += step; }
      else { return; }
      clampCamera();
      renderMap();
    });

    engineReady = true;
    log.ok("game.js geladen, game.js " + VERSION);
    try { window.dispatchEvent(new CustomEvent('cb:engine-ready', { detail:{ v: VERSION }})); } catch(_){}
    try { if (GL._flush) GL._flush(); } catch(_){}
  }

  // ---- Loader/Start ---------------------------------------------------------
  GL._start = function(mapUrl){
    return new Promise(function(resolve, reject){
      function startNow(){
        log.ok("GameLoader.start " + mapUrl);

        loadJSON(mapUrl).then(function(map){

          // Map normalisieren (width/height ODER w/h; tile/tileSize/tile_size)
          var width  = (map.width  != null ? map.width  : (map.w != null ? map.w : 16));
          var height = (map.height != null ? map.height : (map.h != null ? map.h : 10));
          var tile   = (map.tile   != null ? map.tile   :
                       (map.tileSize != null ? map.tileSize :
                       (map.tile_size != null ? map.tile_size : 32)));

          currentMap = {
            width:  width,
            height: height,
            tile:   tile,
            layers: map.layers ? map.layers :
                    (map.tiles ? [{ name:'ground', data: map.tiles }] : [])
          };

          // Kamera beim Start in die Mitte der Map setzen
          var sz = mapPixelSize();
          camera.zoom = 1;
          camera.x = clamp( (sz.w - viewW / camera.zoom) * 0.5, 0, Math.max(0, sz.w - viewW / camera.zoom) );
          camera.y = clamp( (sz.h - viewH / camera.zoom) * 0.5, 0, Math.max(0, sz.h - viewH / camera.zoom) );

          log.ok("Map geladen: " + width + "×" + height + " · Tile " + tile);

          // Atlas + Tileset
          Promise.all([ loadJSON(TILESET_JSON), loadImage(TILESET_PNG) ])
            .then(function(results){ atlas = results[0]; tilesetImg = results[1]; })
            .catch(function(e){ atlas=null; tilesetImg=null; log.warn("Atlas/Textures nicht geladen: " + e.message); })
            .then(function(){
              renderMap();
              log.ok("Game gestartet (" + mapUrl + ")");
              try { window.dispatchEvent(new CustomEvent('cb:game-started', { detail:{ map: mapUrl }})); } catch(_){}
              try { if (window.GameUI && typeof window.GameUI.onGameStarted === 'function') window.GameUI.onGameStarted(); } catch(_){}
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

  // Auto-Init
  try { initEngine(); } catch(e){ log.err('Engine-Init Fehler: ' + e.message); }

  // Version sichtbar
  GL.version = VERSION;
})();
