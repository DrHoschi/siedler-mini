// game.js — v16.5.1 (ES5)
// Map, Pan/Zoom, Building-Placement, Entities, Produktion/Überschuss, Obstacles(+1 Puffer), Carrier-Glue
(function(){
  'use strict';

  var VERSION = 'v16.5.1';

  // --- logging helpers ---
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
  // e: { id, key, tx,ty, wTiles,hTiles, x,y,w,h, img, stock:{}, prod?:{type,rate,cap,keep}, tickAcc }
  var entities = [];
  var nextEntityId = 1;

  // obstacles grid (tile-blocker) inkl. 1-Tile-Puffer um Gebäude
  var obstW=0, obstH=0, obstacles=null;  // Uint8Array
  function allocObstacles(w,h){ obstW=w|0; obstH=h|0; obstacles = new Uint8Array(obstW*obstH); }
  function obIdx(x,y){ return y*obstW + x; }
  function inb(x,y){ return x>=0 && y>=0 && x<obstW && y<obstH; }
  function setBlocked(x,y){ if(inb(x,y)) obstacles[obIdx(x,y)] = 1; }
  function clearObstacles(){ if(!obstacles) return; for(var i=0;i<obstacles.length;i++) obstacles[i]=0; }

  // road/path data (wenn du Straßen/Tiles als Road markierst, pflegen wir ein Set("x,y"))
  var roadSet = new Set(); // optional: kann leer sein

  // tool state
  var tool = { mode:null, key:null }; // mode: 'build'|'road'|'path'|'bulldozer'

  // assets buildings definition (Tilesize relativ zur Map-Tile)
  var BUILDINGS = {
    townhall:  { wTiles:2, hTiles:2, img:"assets/tex/building/Holz_Rathaus_1.png" },
    hq:        { wTiles:2, hTiles:2, img:"assets/tex/building/wood/hq_wood.PNG" },
    depot:     { wTiles:2, hTiles:2, img:"assets/tex/building/wood/depot_wood.png" },
    lumberjack:{ wTiles:2, hTiles:2, img:"assets/tex/building/wood/lumberjack_wood.PNG",
      prod:{ type:'wood', rate:0.35, cap:20, keep:6 } },
    farm:      { wTiles:2, hTiles:2, img:"assets/tex/building/wood/farm_wood.png",
      prod:{ type:'grain', rate:0.30, cap:20, keep:6 } },
    mill:      { wTiles:2, hTiles:2, img:"assets/tex/building/wood/windmuehle_wood.PNG" },
    smith:     { wTiles:2, hTiles:2, img:"assets/tex/building/wood/Schmied_wood0.png" },
    house0:    { wTiles:2, hTiles:2, img:"assets/tex/building/wood/Wohnhaus_wood0_ug0.png" },
    house1:    { wTiles:2, hTiles:2, img:"assets/tex/building/wood/Wohnhaus_wood1_ug0.png" },
    tree:      { wTiles:1, hTiles:1, img:"assets/tex/terrain/topdown_tree_needle0_ug0.jpeg" }
  };

  // alias mapping (de → en keys)
  var ALIAS = { schmied:'smith', rathaus:'townhall', holzfaeller:'lumberjack', bauernhof:'farm', wohnhaus0:'house0', wohnhaus1:'house1' };

  // utils
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function loadImage(src){ return new Promise(function(res,rej){ var i=new Image(); i.onload=function(){res(i)}; i.onerror=function(){rej(new Error("img "+src))}; i.src=src; }); }
  function loadJSON(url){ return fetch(url).then(function(r){ if(!r.ok) throw new Error("http "+r.status+" "+url); return r.json(); }); }
  function mapPx(){ if(!currentMap) return {w:0,h:0}; return {w: currentMap.width*currentMap.tile, h: currentMap.height*currentMap.tile}; }

  // coords
  function worldToTile(px,py){ var t=currentMap.tile; return { x: Math.floor(px/t), y: Math.floor(py/t) }; }
  function tileToWorld(tx,ty){ var t=currentMap.tile; return { x: tx*t, y: ty*t }; }

  function rectsOverlap(a,b){ return !(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y); }

  // --- PUBLIC API (needed by PF/Carriers/UI) ---
  Game.getTileSize = function(){ return currentMap ? currentMap.tile : 64; };
  Game.getCamera   = function(){ return cam; };
  Game.getRoadSet  = function(){ return roadSet; };

  // *** HIER: Blocker-Provider inkl. 1 Tile Puffer um Gebäude ***
  Game.getObstacleAt = function(tx,ty){
    if (!obstacles) return false;
    if (!inb(tx,ty)) return true;
    return obstacles[obIdx(tx,ty)] === 1;
  };

  // --- Placement rules ---
  function resolveKey(key){ if(BUILDINGS[key]) return key; if(ALIAS[key]) return ALIAS[key]; return key; }

  function canPlace(key, tx, ty){
    var def = BUILDINGS[key = resolveKey(key)]; if (!def || !currentMap) return false;
    // bounds
    if (tx<0 || ty<0 || tx+def.wTiles>currentMap.width || ty+def.hTiles>currentMap.height) return false;
    // collision with other entities
    var t = currentMap.tile, r = { x:tx*t, y:ty*t, w:def.wTiles*t, h:def.hTiles*t };
    for (var i=0;i<entities.length;i++){
      var e=entities[i];
      var er = { x:e.x, y:e.y, w:e.w, h:e.h };
      if (rectsOverlap(r,er)) return false;
    }
    return true;
  }

  function registerObstaclesFromEntities(){
    if (!currentMap) return;
    if (!obstacles || obstW!==currentMap.width || obstH!==currentMap.height){
      allocObstacles(currentMap.width, currentMap.height);
    } else {
      clearObstacles();
    }
    // Gebäude + 1 Tile Puffer markieren
    for (var i=0;i<entities.length;i++){
      var e=entities[i];
      var px = Math.max(0, e.tx-1), py = Math.max(0, e.ty-1);
      var pw = Math.min(obstW-1, e.tx + e.wTiles), ph = Math.min(obstH-1, e.ty + e.hTiles);
      for (var y=py; y<=ph; y++){
        for (var x=px; x<=pw; x++){
          setBlocked(x,y);
        }
      }
    }
  }

  function placeBuilding(key, tx, ty){
    key = resolveKey(key);
    var def = BUILDINGS[key]; if (!def) return false;
    var t = currentMap.tile;
    var pos = tileToWorld(tx,ty);
    var img = def._img;
    var e = {
      id: nextEntityId++,
      key:key, tx:tx, ty:ty, wTiles:def.wTiles, hTiles:def.hTiles,
      x:pos.x, y:pos.y, w:def.wTiles*t, h:def.hTiles*t,
      img:img, stock:{}, tickAcc:0
    };
    // Produktionsprofil (optional je nach Gebäude)
    if (def.prod){
      e.prod = { type:def.prod.type, rate:def.prod.rate, cap:def.prod.cap, keep:def.prod.keep };
    }
    entities.push(e);
    registerObstaclesFromEntities(); // -> Obstacles aktualisieren
    ok("[ok] Gebäude platziert:", key, "at", tx, ty);
    // Auto-Überschuss-Transport: wird in tickProduction() getriggert, wenn überschuss vorhanden
    return true;
  }

  // --- draw map/entities ---
  function drawMap(){
    if(!ctx || !currentMap) return;
    var t=currentMap.tile, w=currentMap.width, h=currentMap.height;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // sichtfenster bounds (in Tiles)
    var left   = Math.floor(cam.x / t);
    var top    = Math.floor(cam.y / t);
    var right  = Math.ceil((cam.x + viewW/cam.zoom) / t);
    var bottom = Math.ceil((cam.y + viewH/cam.zoom) / t);
    left=clamp(left,0,w-1); top=clamp(top,0,h-1); right=clamp(right,0,w); bottom=clamp(bottom,0,h);

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

    // Entities oben drauf
    for (var k=0;k<entities.length;k++){
      var e=entities[k];
      var dx = Math.floor((e.x - cam.x)*cam.zoom);
      var dy = Math.floor((e.y - cam.y)*cam.zoom);
      var dw = Math.ceil(e.w*cam.zoom);
      var dh = Math.ceil(e.h*cam.zoom);
      if (e.img) { try { ctx.drawImage(e.img, dx,dy,dw,dh); } catch(_){} }
      else { ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.fillRect(dx,dy,dw,dh); }
    }

    // Carrier layer
    try{ if (window.Carriers && Carriers.draw) Carriers.draw(ctx, cam); }catch(_){}
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
    var drag = { on:false, sx:0, sy:0, cx:0, cy:0, pinch:false, last:0 };

    canvas.addEventListener('mousedown', function(e){ drag.on=true; drag.pinch=false; drag.sx=e.clientX; drag.sy=e.clientY; drag.cx=cam.x; drag.cy=cam.y; });
    window.addEventListener('mousemove', function(e){ if(!drag.on || drag.pinch) return; cam.x=drag.cx-(e.clientX-drag.sx)/cam.zoom; cam.y=drag.cy-(e.clientY-drag.sy)/cam.zoom; clampCam(); drawMap(); });
    window.addEventListener('mouseup', function(){ drag.on=false; drag.pinch=false; });

    canvas.addEventListener('wheel', function(e){ e.preventDefault?e.preventDefault():(e.returnValue=false); var rect=canvas.getBoundingClientRect(); zoomAt(e.deltaY<0?1.15:1/1.15, e.clientX-rect.left, e.clientY-rect.top); }, {passive:false});

    // Tap/Klick für Platzierung
    canvas.addEventListener('click', function(e){
      if (tool.mode!=='build' || !tool.key || !currentMap) return;
      var rect = canvas.getBoundingClientRect();
      var sx = e.clientX - rect.left;
      var sy = e.clientY - rect.top;
      var wx = cam.x + sx / cam.zoom;
      var wy = cam.y + sy / cam.zoom;
      var tile = currentMap.tile;
      var tx = Math.floor(wx / tile);
      var ty = Math.floor(wy / tile);
      if (canPlace(tool.key, tx, ty)){
        placeBuilding(tool.key, tx, ty);
        drawMap();
      } else {
        warn("[game] Platzierung nicht möglich.");
      }
    });

    // Touch (Pan + Pinch)
    canvas.addEventListener('touchstart', function(e){
      if (e.touches.length===1){
        var t=e.touches[0]; drag.on=true; drag.pinch=false; drag.sx=t.clientX; drag.sy=t.clientY; drag.cx=cam.x; drag.cy=cam.y;
      } else if (e.touches.length>=2){
        drag.on=true; drag.pinch=true;
        var a=e.touches[0], b=e.touches[1];
        drag.last = Math.sqrt(Math.pow(a.clientX-b.clientX,2)+Math.pow(a.clientY-b.clientY,2));
      }
    }, {passive:true});
    canvas.addEventListener('touchmove', function(e){
      if (!drag.on) return;
      if (!drag.pinch && e.touches.length===1){
        var t=e.touches[0]; cam.x=drag.cx-(t.clientX-drag.sx)/cam.zoom; cam.y=drag.cy-(t.clientY-drag.sy)/cam.zoom; clampCam(); drawMap();
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
    window.addEventListener('touchend', function(){ drag.on=false; drag.pinch=false; drag.last=0; });

    // Keyboard
    window.addEventListener('keydown', function(e){
      var k=(e.key||'').toLowerCase(), step=Math.max(16, Math.floor(120/cam.zoom));
      if(k==='arrowleft'||k==='a'){ cam.x-=step; } else if(k==='arrowright'||k==='d'){ cam.x+=step; }
      else if(k==='arrowup'||k==='w'){ cam.y-=step; } else if(k==='arrowdown'||k==='s'){ cam.y+=step; } else return;
      clampCam(); drawMap();
    });
  }

  // Game tool API
  Game.setTool = function(mode, payload){
    if (mode === 'build'){ tool.mode='build'; tool.key = payload && payload.key; }
    else { tool.mode = mode; tool.key = null; }
    if (mode===null){ ok('[ok] Tool zurückgesetzt'); }
  };

  // --- Produktion / Überschuss / Carrier-Glue ---
  // sehr einfacher Sim-Tick – ruft auch Carriers.tick auf
  var lastTS = performance.now();
  function tick(){
    var now = performance.now();
    var dt = Math.min(0.1, (now - lastTS)/1000); // clamp dt
    lastTS = now;

    // Produktion
    tickProduction(dt);

    // Carrier bewegen
    try{ if (window.Carriers && Carriers.tick) Carriers.tick(dt); }catch(_){}

    drawMap();
    requestAnimationFrame(tick);
  }

  function tickProduction(dt){
    for (var i=0;i<entities.length;i++){
      var e=entities[i];
      if (!e.prod) continue;
      // produzieren
      e.tickAcc = (e.tickAcc||0) + dt*e.prod.rate;
      if (e.tickAcc >= 1){
        var add = Math.floor(e.tickAcc); e.tickAcc -= add;
        var t = e.prod.type;
        var cur = (e.stock[t]|0);
        var cap = e.prod.cap|0;
        if (cur < cap){ e.stock[t] = Math.min(cap, cur+add); }
      }
      // Überschuss versenden
      var type = e.prod.type, keep = e.prod.keep|0;
      var have = (e.stock[type]|0);
      if (have > keep){
        // Ziel = nearest depot/townhall/hq
        var src = { x:e.tx+Math.floor(e.wTiles/2), y:e.ty+Math.floor(e.hTiles/2) };
        var dst = findNearestDrop(src.x, src.y); // tiles
        if (dst){
          // nur einmal pro Sek. versuchen → simple throttle
          e._sendAcc = (e._sendAcc||0) + dt;
          if (e._sendAcc > 1.0){
            e._sendAcc = 0;
            var c = trySpawnCarrier(src, dst);
            if (c){
              // reduziere Lager um z.B. 1 Einheit (Demo)
              e.stock[type] = Math.max(keep, e.stock[type]-1);
              ok('[auto] Carrier gestartet von', src.x,src.y, 'nach', dst.x,dst.y);
            }
          }
        }
      }
    }
  }

  function trySpawnCarrier(from, to){
    try{
      if (window.PathFinder && PathFinder.setRoadMask && Game.getRoadSet) PathFinder.setRoadMask(Game.getRoadSet());
      if (window.PathFinder && PathFinder.setObstacleProvider) PathFinder.setObstacleProvider(Game.getObstacleAt);
      if (window.Carriers && Carriers.spawn){
        return Carriers.spawn({ from:from, to:to });
      }
    }catch(_){}
    return null;
  }

  function findNearestDrop(sx,sy){
    var best=null, bestD=1e9;
    for (var i=0;i<entities.length;i++){
      var e=entities[i];
      if (e.key!=='depot' && e.key!=='townhall' && e.key!=='hq') continue;
      var cx = e.tx + Math.floor(e.wTiles/2);
      var cy = e.ty + Math.floor(e.hTiles/2);
      var d = Math.abs(cx-sx) + Math.abs(cy-sy);
      if (d < bestD){ bestD=d; best={x:cx,y:cy}; }
    }
    // falls kein Depot/HQ existiert → townhall fallback (sollte vorhanden sein)
    if (!best){
      var th = getFirstEntity('townhall');
      if (th) best = { x: th.tx+Math.floor(th.wTiles/2), y: th.ty+Math.floor(th.hTiles/2) };
    }
    return best;
  }

  function getFirstEntity(key){
    for (var i=0;i<entities.length;i++) if(entities[i].key===key) return entities[i];
    return null;
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
    requestAnimationFrame(tick);
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

          // Obstacles init
          allocObstacles(width,height);
          clearObstacles();

          // Assets für Gebäude vorbereiten
          var preload = [];
          for (var k in BUILDINGS) if (BUILDINGS.hasOwnProperty(k)){
            (function(key){
              preload.push(loadImage(BUILDINGS[key].img).then(function(img){ BUILDINGS[key]._img=img; })
              .catch(function(e){ warn("Atlas/Textures nicht geladen: "+(e&&e.message?e.message:e)); }));
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
            if (!getFirstEntity('townhall')){
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

  // helpers for obstacles when bulldozing or placing/removing roads
  Game.notifyRoadChanged = function(tx,ty,isRoad){
    var k = tx+','+ty;
    if (isRoad) roadSet.add(k); else roadSet.delete(k);
    try{ if (window.PathFinder && PathFinder.invalidateRoads) PathFinder.invalidateRoads(); }catch(_){}
  };

  // --- boot ---
  try{ initEngine(); }catch(e){ err('Engine-Init Fehler: '+e.message); }

  // expose current map & version
  GL.version = VERSION;
  Game.currentMap = currentMap;

})();
