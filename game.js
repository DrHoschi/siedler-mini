// game.js — v16.1.26 (ES5) — Map, Pan/Zoom, Placement, Roads/Paths + Townhall-Auto
(function(){
  'use strict';
  var VERSION = 'v16.1.26';

  // logging
  function ok(){ (window.CBLog && CBLog.ok ? CBLog.ok : console.log).apply(console, arguments); }
  function warn(){ (window.CBLog && CBLog.warn ? CBLog.warn : console.warn).apply(console, arguments); }
  function err(){ (window.CBLog && CBLog.err ? CBLog.err : console.error).apply(console, arguments); }

  // public namespaces
  var GL = (window.GameLoader = window.GameLoader || {});
  var Game = (window.Game = window.Game || {});

  // render state
  var canvas=null, ctx=null, DPR=1, viewW=0, viewH=0;
  var engineReady=false;

  // map
  var currentMap=null, tilesetImg=null, atlas=null;

  // camera
  var cam = { x:0, y:0, zoom:1, minZ:0.5, maxZ:3 };

  // entities (Gebäude)
  var entities = []; // {key,x,y,w,h,img}

  // OVERLAY: Straßen & Wege (pro Tile bool)
  var over = { road:{}, path:{} };

  // building defs (Tilesize relativ zur Map-Tile)
  var BUILDINGS = {
    townhall:   { wTiles:2, hTiles:2, img:"assets/tex/building/Holz_Rathaus_1.png" },
    lumberjack: { wTiles:2, hTiles:2, img:"assets/tex/building/wood/lumberjack_wood.PNG" },
    farm:       { wTiles:2, hTiles:2, img:"assets/tex/building/wood/farm_wood.PNG" },
    mill:       { wTiles:2, hTiles:2, img:"assets/tex/building/wood/windmuehle_wood.PNG" },
    depot:      { wTiles:2, hTiles:2, img:"assets/tex/building/wood/depot_wood.PNG" },
    tree:       { wTiles:1, hTiles:1, img:"assets/tex/terrain/topdown_tree_needle0_ug0.jpeg" }
  };

  // sanfte Aliase für alte Schlüssel
  var BUILDING_ALIASES = { wood0:'lumberjack', factory:'mill' };
  function resolveBuildingKey(k){ return BUILDINGS[k] ? k : (BUILDING_ALIASES[k] || k); }

  // tool state
  var tool = { mode:null, key:null }; // 'build'|'road'|'path'|'bulldozer'

  // utils
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function loadImage(src){ return new Promise(function(res,rej){ var i=new Image(); i.onload=function(){res(i)}; i.onerror=function(){rej(new Error("img "+src))}; i.src=src; }); }
  function loadJSON(url){ return fetch(url).then(function(r){ if(!r.ok) throw new Error("http "+r.status+" "+url); return r.json(); }); }
  function mapPx(){ if(!currentMap) return {w:0,h:0}; return {w: currentMap.width*currentMap.tile, h: currentMap.height*currentMap.tile}; }
  function keyXY(tx,ty){ return tx + "," + ty; }

  // Normalisierung von Tool-Modi (falls UI "building" sendet)
  function normMode(m){
    m = (m||'').toLowerCase();
    if (m === 'building') m = 'build';
    return m;
  }

  // placement helpers
  function tileToWorld(tx,ty){ var t=currentMap.tile; return { x: tx*t, y: ty*t }; }
  function rectsOverlap(a,b){ return !(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y); }

  function canPlace(key, tx, ty){
    var def = BUILDINGS[key]; if (!def || !currentMap) return false;
    // map bounds
    if (tx<0 || ty<0 || tx+def.wTiles>currentMap.width || ty+def.hTiles>currentMap.height) return false;
    // collision mit anderen Gebäuden
    var t = currentMap.tile;
    var r = { x:tx*t, y:ty*t, w:def.wTiles*t, h:def.hTiles*t };
    for (var i=0;i<entities.length;i++){
      var e=entities[i];
      var er = { x:e.x, y:e.y, w:e.w, h:e.h };
      if (rectsOverlap(r,er)) return false;
    }
    return true;
  }

  function placeBuilding(key, tx, ty){
    var def = BUILDINGS[key]; if (!def) return false;
    var t = currentMap.tile;
    var pos = tileToWorld(tx,ty);
    var img = def._img;
    var e = { key:key, x:pos.x, y:pos.y, w:def.wTiles*t, h:def.hTiles*t, img:img };
    entities.push(e);
    ok("[ok] Gebäude platziert:", key, "at", tx, ty);
    return true;
  }

  // Hilfsfunktion: Bildschirmpos -> Platzieren
  function placeAtScreen(sx, sy){
    if (!currentMap){ warn("[build] Abgebrochen: keine Map geladen."); return; }
    var mode = normMode(tool.mode);
    if (mode !== 'build'){ warn("[build] Abgebrochen: falscher Modus:", tool.mode); return; }
    if (!tool.key){ warn("[build] Abgebrochen: kein Gebäude-Key gesetzt."); return; }

    var key = resolveBuildingKey(tool.key);
    if (!BUILDINGS[key]){ warn("[build] Unbekanntes Gebäude-Key:", key); return; }

    var wx = cam.x + sx / cam.zoom;
    var wy = cam.y + sy / cam.zoom;
    var tile = currentMap.tile;
    var tx = Math.floor(wx / tile);
    var ty = Math.floor(wy / tile);

    if (canPlace(key, tx, ty)){
      placeBuilding(key, tx, ty);
      drawMap();
    } else {
      warn("[build] Platzierung nicht möglich @", tx, ty, "für", key, "(Bounds? Kollision?)");
    }
  }

  // Straßen/Wege setzen
  function setRoad(tx,ty){ over.road[keyXY(tx,ty)] = true; }
  function setPath(tx,ty){ over.path[keyXY(tx,ty)] = true; }
  function clearOverlaysAt(tx,ty){
    delete over.road[keyXY(tx,ty)];
    delete over.path[keyXY(tx,ty)];
  }

  // Bulldozer – löscht Entity unter Tile + Overlays
  function bulldozeAt(tx,ty){
    var t = currentMap.tile;
    var rx = tx*t, ry = ty*t;
    for (var i=entities.length-1; i>=0; i--){
      var e=entities[i];
      if (rx >= e.x && rx < e.x+e.w && ry >= e.y && ry < e.y+e.h){
        entities.splice(i,1);
        ok("[ok] Abgerissen:", e.key, "at", tx, ty);
        break;
      }
    }
    clearOverlaysAt(tx,ty);
  }

  // Linienzeichnen (Bresenham) in Tile-Koordinaten
  function lineTiles(x0,y0,x1,y1, cb){
    var dx = Math.abs(x1-x0), sx = x0<x1 ? 1 : -1;
    var dy = -Math.abs(y1-y0), sy = y0<y1 ? 1 : -1;
    var err = dx + dy, e2;
    while(true){
      cb(x0,y0);
      if (x0===x1 && y0===y1) break;
      e2 = 2*err;
      if (e2 >= dy){ err += dy; x0 += sx; }
      if (e2 <= dx){ err += dx; y0 += sy; }
    }
  }

  // public tool api
  Game.setTool = function(mode, payload){
    mode = normMode(mode);
    if (mode === 'build'){
      var k = payload && payload.key;
      k = resolveBuildingKey(k);
      tool.mode = 'build';
      tool.key  = k;
      ok("[ok] Tool gesetzt (build): " + k);
    } else {
      tool.mode = mode;
      tool.key  = null;
      ok("[ok] Tool gesetzt: " + mode);
    }
  };

  // draw
  function drawMap(){
    if(!ctx || !currentMap) return;
    var t=currentMap.tile, w=currentMap.width, h=currentMap.height;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // sichtfenster (Tiles)
    var left   = Math.floor(cam.x / t);
    var top    = Math.floor(cam.y / t);
    var right  = Math.ceil((cam.x + viewW/cam.zoom) / t);
    var bottom = Math.ceil((cam.y + viewH/cam.zoom) / t);
    left=clamp(left,0,w-1); top=clamp(top,0,h-1); right=clamp(right,0,w); bottom=clamp(bottom,0,h);

    // Boden
    var layers=currentMap.layers||[];
    var colors=['#5a7a39','#6b8f3e','#7aa346','#90b45a'];
    if (!atlas || !tilesetImg || !layers.length){
      for (var ty=top; ty<bottom; ty++){
        for (var tx=left; tx<right; tx++){
          var sx = Math.floor((tx*t - cam.x)*cam.zoom);
          var sy = Math.floor((ty*t - cam.y)*cam.zoom);
          var ss = Math.ceil(t*cam.zoom);
          ctx.fillStyle = colors[(tx+ty)%colors.length];
          ctx.fillRect(sx,sy,ss,ss);
        }
      }
    } else {
      var L0=layers[0], data=L0.data||[];
      for (var ty2=top; ty2<bottom; ty2++){
        for (var tx2=left; tx2<right; tx2++){
          var i = ty2*w+tx2, idx=data[i]|0;
          var drawX = Math.floor((tx2*t - cam.x)*cam.zoom);
          var drawY = Math.floor((ty2*t - cam.y)*cam.zoom);
          var drawS = Math.ceil(t*cam.zoom);
          var ti = atlas.tiles && atlas.tiles[idx];
          if (ti){
            try { ctx.drawImage(tilesetImg, ti.x,ti.y,ti.w,ti.h, drawX,drawY,drawS,drawS); }
            catch(e){ ctx.fillStyle='#5a7a39'; ctx.fillRect(drawX,drawY,drawS,drawS); }
          } else { ctx.fillStyle='#5a7a39'; ctx.fillRect(drawX,drawY,drawS,drawS); }
        }
      }
    }

    // Overlays: Straße/Weg
    for (var ty3=top; ty3<bottom; ty3++){
      for (var tx3=left; tx3<right; tx3++){
        var kxy = keyXY(tx3,ty3);
        var hasRoad = !!over.road[kxy];
        var hasPath = !!over.path[kxy];
        if (!hasRoad && !hasPath) continue;

        var dx = Math.floor((tx3*t - cam.x)*cam.zoom);
        var dy = Math.floor((ty3*t - cam.y)*cam.zoom);
        var ds = Math.ceil(t*cam.zoom);

        if (hasPath){
          ctx.fillStyle = "rgba(210, 180, 140, 0.85)";
          ctx.fillRect(dx+Math.floor(0.10*ds), dy+Math.floor(0.10*ds), Math.floor(0.80*ds), Math.floor(0.80*ds));
        }
        if (hasRoad){
          ctx.fillStyle = "rgba(80, 80, 80, 0.92)";
          ctx.fillRect(dx+Math.floor(0.08*ds), dy+Math.floor(0.08*ds), Math.floor(0.84*ds), Math.floor(0.84*ds));
          ctx.strokeStyle = "rgba(255,255,255,0.08)";
          ctx.lineWidth = Math.max(1, Math.floor(2*cam.zoom));
          ctx.strokeRect(dx+0.5, dy+0.5, ds-1, ds-1);
        }
      }
    }

    // Entities oben drauf
    for (var k=0;k<entities.length;k++){
      var e=entities[k];
      var ex = Math.floor((e.x - cam.x)*cam.zoom);
      var ey = Math.floor((e.y - cam.y)*cam.zoom);
      var ew = Math.ceil(e.w*cam.zoom);
      var eh = Math.ceil(e.h*cam.zoom);
      if (e.img) {
        try { ctx.drawImage(e.img, ex,ey,ew,eh); }
        catch(_){
          ctx.strokeStyle = '#ffbf47'; ctx.lineWidth = Math.max(1, Math.floor(2*cam.zoom));
          ctx.strokeRect(ex+0.5, ey+0.5, ew-1, eh-1);
        }
      } else {
        ctx.fillStyle = "rgba(255, 223, 128, .18)"; ctx.fillRect(ex,ey,ew,eh);
        ctx.strokeStyle = '#ffbf47'; ctx.lineWidth = Math.max(1, Math.floor(2*cam.zoom));
        ctx.strokeRect(ex+0.5, ey+0.5, ew-1, eh-1);
      }
    }
  }

  // fit canvas / clamp camera
  function clampCam(){
    var size = mapPx();
    var maxX = Math.max(0, size.w - viewW/cam.zoom);
    var maxY = Math.max(0, size.h - viewH/cam.zoom);
    cam.x = clamp(cam.x, 0, maxX);
    cam.y = clamp(cam.y, 0, maxY);
  }
  function fit(){
    DPR = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    var w = Math.max(320, Math.floor(window.innerWidth || document.documentElement.clientWidth || 800));
    var h = Math.max(240, Math.floor(window.innerHeight || document.documentElement.clientHeight || 600));
    canvas.width=Math.floor(w*DPR); canvas.height=Math.floor(h*DPR);
    canvas.style.width=w+"px"; canvas.style.height=h+"px";
    if (ctx.setTransform) ctx.setTransform(DPR,0,0,DPR,0,0);
    viewW=w; viewH=h; clampCam(); drawMap();
  }

  // zoom helper
  function zoomAt(f, cx, cy){
    var preX = cam.x + cx / cam.zoom;
    var preY = cam.y + cy / cam.zoom;
    cam.zoom = clamp(cam.zoom*f, cam.minZ, cam.maxZ);
    var postX = cam.x + cx / cam.zoom;
    var postY = cam.y + cy / cam.zoom;
    cam.x += (preX - postX);
    cam.y += (preY - postY);
    clampCam(); drawMap();
  }

  // input
  function bindInput(){
    var drag = { on:false, sx:0, sy:0, cx:0, cy:0, pinch:false, last:0, tapStart:0, tapSX:0, tapSY:0,
                 painting:false, lastTileX:null, lastTileY:null };

    // Maus-Down: evtl. Painting starten
    canvas.addEventListener('mousedown', function(e){
      drag.on=true; drag.pinch=false; drag.sx=e.clientX; drag.sy=e.clientY; drag.cx=cam.x; drag.cy=cam.y;
      if (tool.mode==='road' || tool.mode==='path' || tool.mode==='bulldozer'){
        drag.painting = true;
        var rect = canvas.getBoundingClientRect();
        paintAtScreen(e.clientX-rect.left, e.clientY-rect.top, true);
      } else {
        drag.painting = false;
      }
    });

    // Maus-Move: entweder pannen oder malen
    window.addEventListener('mousemove', function(e){
      if (!drag.on) return;
      if (drag.painting && (tool.mode==='road' || tool.mode==='path' || tool.mode==='bulldozer')){
        var rect = canvas.getBoundingClientRect();
        paintAtScreen(e.clientX-rect.left, e.clientY-rect.top, false);
      } else if (!drag.pinch){
        cam.x=drag.cx-(e.clientX-drag.sx)/cam.zoom; cam.y=drag.cy-(e.clientY-drag.sy)/cam.zoom;
        clampCam(); drawMap();
      }
    });

    window.addEventListener('mouseup', function(){
      drag.on=false; drag.pinch=false; drag.painting=false; drag.lastTileX=null; drag.lastTileY=null;
    });

    // Wheel-Zoom
    canvas.addEventListener('wheel', function(e){
      e.preventDefault ? e.preventDefault() : (e.returnValue=false);
      var rect=canvas.getBoundingClientRect();
      zoomAt(e.deltaY<0?1.15:1/1.15, e.clientX-rect.left, e.clientY-rect.top);
    }, {passive:false});

    // Desktop-Klick: Gebäude platzieren
    canvas.addEventListener('click', function(e){
      var rect = canvas.getBoundingClientRect();
      placeAtScreen(e.clientX-rect.left, e.clientY-rect.top);
    });

    // Touch (Pan/Pinch/Tap & Painting)
    canvas.addEventListener('touchstart', function(e){
      if (e.touches.length===1){
        var t=e.touches[0];
        drag.on=true; drag.pinch=false;
        drag.sx=t.clientX; drag.sy=t.clientY; drag.cx=cam.x; drag.cy=cam.y;
        drag.tapStart = Date.now(); drag.tapSX=t.clientX; drag.tapSY=t.clientY;

        if (tool.mode==='road' || tool.mode==='path' || tool.mode==='bulldozer'){
          drag.painting = true;
          var rect = canvas.getBoundingClientRect();
          paintAtScreen(t.clientX-rect.left, t.clientY-rect.top, true);
        } else {
          drag.painting = false;
        }
      } else if (e.touches.length>=2){
        drag.on=true; drag.pinch=true; drag.painting=false;
        var a=e.touches[0], b=e.touches[1];
        drag.last = Math.sqrt(Math.pow(a.clientX-b.clientX,2)+Math.pow(a.clientY-b.clientY,2));
      }
    }, {passive:true});

    canvas.addEventListener('touchmove', function(e){
      if (!drag.on) return;
      if (drag.painting && e.touches.length===1 && (tool.mode==='road' || tool.mode==='path' || tool.mode==='bulldozer')){
        var t=e.touches[0], rect=canvas.getBoundingClientRect();
        paintAtScreen(t.clientX-rect.left, t.clientY-rect.top, false);
      } else if (!drag.pinch && e.touches.length===1){
        var t=e.touches[0];
        cam.x=drag.cx-(t.clientX-drag.sx)/cam.zoom; cam.y=drag.cy-(t.clientY-drag.sy)/cam.zoom;
        clampCam(); drawMap();
      } else if (e.touches.length>=2){
        var a=e.touches[0], b=e.touches[1];
        var d=Math.sqrt(Math.pow(a.clientX-b.clientX,2)+Math.pow(a.clientY-b.clientY,2));
        if (drag.last){
          var factor = d/drag.last; var r=canvas.getBoundingClientRect();
          zoomAt(factor, ((a.clientX+b.clientX)/2)-r.left, ((a.clientY+b.clientY)/2)-r.top);
        }
        drag.last=d;
      }
    }, {passive:true});

    window.addEventListener('touchend', function(){
      // kurzer Tap -> Gebäude setzen
      if (!drag.pinch && drag.tapStart && tool.key && normMode(tool.mode)==='build'){
        var dt = Date.now() - drag.tapStart;
        var dx = Math.abs((drag.tapSX||0) - (drag.sx||0));
        var dy = Math.abs((drag.tapSY||0) - (drag.sy||0));
        if (dt < 300 && dx < 6 && dy < 6){
          var rect=canvas.getBoundingClientRect();
          placeAtScreen(drag.tapSX-rect.left, drag.tapSY-rect.top);
        }
      }
      drag.on=false; drag.pinch=false; drag.last=0; drag.tapStart=0; drag.painting=false; drag.lastTileX=null; drag.lastTileY=null;
    });

    // Keyboard
    window.addEventListener('keydown', function(e){
      var k=(e.key||'').toLowerCase(), step=Math.max(16, Math.floor(120/cam.zoom));
      if(k==='arrowleft'||k==='a'){ cam.x-=step; } else if(k==='arrowright'||k==='d'){ cam.x+=step; }
      else if(k==='arrowup'||k==='w'){ cam.y-=step; } else if(k==='arrowdown'||k==='s'){ cam.y+=step; } else return;
      clampCam(); drawMap();
    });

    // Painting-Helfer: aus Bildschirmpos -> Tile, dann setzen/zeichnen
    function paintAtScreen(sx,sy, isStart){
      if (!currentMap) return;
      var wx = cam.x + sx / cam.zoom;
      var wy = cam.y + sy / cam.zoom;
      var t = currentMap.tile;
      var tx = Math.floor(wx / t);
      var ty = Math.floor(wy / t);
      tx = clamp(tx, 0, currentMap.width-1);
      ty = clamp(ty, 0, currentMap.height-1);

      if (isStart || drag.lastTileX===null){
        applyPaint(tx,ty);
        drag.lastTileX = tx; drag.lastTileY = ty;
      } else {
        // Linie zwischen letzter und aktueller Kachel
        lineTiles(drag.lastTileX, drag.lastTileY, tx, ty, applyPaint);
        drag.lastTileX = tx; drag.lastTileY = ty;
      }
      drawMap();
    }

    function applyPaint(tx,ty){
      if (tool.mode==='road') setRoad(tx,ty);
      else if (tool.mode==='path') setPath(tx,ty);
      else if (tool.mode==='bulldozer') bulldozeAt(tx,ty);
    }
  }

  // engine init
  function initEngine(){
    if (engineReady) return;
    canvas = document.getElementById('game') || document.getElementById('stage') || (function(){var c=document.createElement('canvas');c.id='game';document.body.appendChild(c);return c;})();
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', fit); fit();
    bindInput();
    engineReady=true; ok("game.js geladen, game.js "+VERSION);
    try{ window.dispatchEvent(new CustomEvent('cb:engine-ready',{detail:{v:VERSION}})); }catch(_){}
  }

  // loader / start
  GL._start = function(mapUrl){
    return new Promise(function(resolve,reject){
      function start(){
        ok("GameLoader.start "+mapUrl);
        loadJSON(mapUrl).then(function(map){
          // map normalisieren
          function pickNum(){ for (var i=0;i<arguments.length;i++){ var v=arguments[i]; if(v!==undefined && v!==null && !isNaN(v)) return Number(v);} }
          var ms = map.mapSize || map.size || null;
          var width  = pickNum(map.width, map.w,  ms && ms.w,  ms && ms.width)  || 16;
          var height = pickNum(map.height,map.h,  ms && ms.h,  ms && ms.height) || 10;
          var tile   = pickNum(map.tile, map.tileSize, map.tile_size, map.tilePX) || 64;

          currentMap = {
            width:width, height:height, tile:tile,
            layers: map.layers ? map.layers : (map.tiles ? [{name:'ground', data:map.tiles}] : [])
          };
          ok("Map geladen: "+width+"×"+height+" · Tile "+tile);

          // Assets für Gebäude vorbereiten
          var preload = [];
          for (var k in BUILDINGS) if (BUILDINGS.hasOwnProperty(k)){
            (function(key){
              preload.push(loadImage(BUILDINGS[key].img).then(function(img){ BUILDINGS[key]._img=img; }));
            })(k);
          }

          // Tileset/Atlas
          var TILESET_PNG  = './assets/tiles/tileset.terrain.png';
          var TILESET_JSON = './assets/tiles/tileset.terrain.json';

          Promise.all([ loadJSON(TILESET_JSON), loadImage(TILESET_PNG) ].concat(preload))
          .then(function(res){
            atlas = res[0]; tilesetImg = res[1];
          })
          .catch(function(e){ atlas=null; tilesetImg=null; warn("Atlas/Textures nicht geladen: "+(e&&e.message?e.message:e)); })
          .then(function(){
            // Rathaus auto-spawn in Kartenmitte (sofern noch nicht vorhanden)
            var cx = Math.floor(width/2), cy = Math.floor(height/2);
            if (!hasEntity('townhall')){
              if (canPlace('townhall', cx-1, cy-1)) placeBuilding('townhall', cx-1, cy-1);
            }
            // Kamera mittig aufs Rathaus
            var center = tileToWorld(cx, cy);
            cam.zoom = 1;
            cam.x = clamp(center.x - viewW/2, 0, Math.max(0, mapPx().w - viewW));
            cam.y = clamp(center.y - viewH/2, 0, Math.max(0, mapPx().h - viewH));

            drawMap();

            try{ window.dispatchEvent(new CustomEvent('cb:game-started',{detail:{map:mapUrl}})); }catch(_){}
            if (window.GameUI && typeof window.GameUI.onGameStarted==='function') window.GameUI.onGameStarted();
            ok("Game gestartet"); resolve(true);
          });
        }).catch(function(e){ err("Start fehlgeschlagen: "+e.message); reject(e); });
      }
      try{ if(!engineReady) initEngine(); start(); } catch(e){ err("Engine-Init Fehler: "+e.message); reject(e); }
    });
  };

  function hasEntity(key){
    for (var i=0;i<entities.length;i++) if (entities[i].key===key) return true;
    return false;
  }

  // boot
  try{ initEngine(); }catch(e){ err('Engine-Init Fehler: '+e.message); }

  // expose version
  GL.version = VERSION;
})();
