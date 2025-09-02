// ============================================================================
// game.js — v16.5.5 (ES5)  [ROOT-VERSION]
// Projekt: Siedler-Mini
// Inhalt:
//   • Engine/Renderer (Map, Camera, Input)
//   • Gebäude-Placement, Obstacles (nur Innenfläche blockiert – kein Puffer),
//     Produktion mit Carrier-Glue (mit Tür-/Exit-Kacheln)
//   • PUBLIC API: Game.getTileSize(), Game.getCamera(), Game.getRoadSet(),
//                  Game.getObstacleAt(), Game.setTool(...),
//                  Game.tileToWorld(), Game.worldToTile()
//   • Add-ons (integriert):
//       - Sicheres PathFinder.init() nach Map-Load (Poll → einmalig)
//       - Inspector-Events: cb:toggle-path-overlay / cb:add-resources / cb:pf-heat-reset
//       - Separates Overlay-Canvas (#pf-overlay) mit eigenem Loop (Debug)
//       - Fallback Game.addResources(type, amount)
// Hinweise:
//   • Pfad-Overlay-Schalter/Settings liegen im Inspector (empfohlen).
// ============================================================================
(function(){
  'use strict';

  var VERSION = 'v16.5.5';

  // --- logging helpers -------------------------------------------------------
  function ok(){ (window.CBLog && CBLog.ok ? CBLog.ok : console.log).apply(console, arguments); }
  function warn(){ (window.CBLog && CBLog.warn ? CBLog.warn : console.warn).apply(console, arguments); }
  function err(){ (window.CBLog && CBLog.err ? CBLog.err : console.error).apply(console, arguments); }

  // public namespaces
  var GL = (window.GameLoader = window.GameLoader || {});
  var Game = (window.Game = window.Game || {});

  // render state --------------------------------------------------------------
  var canvas=null, ctx=null, DPR=1, viewW=0, viewH=0;
  var engineReady=false;

  // map -----------------------------------------------------------------------
  var currentMap=null, tilesetImg=null, atlas=null;

  // camera --------------------------------------------------------------------
  var cam = { x:0, y:0, zoom:1, minZ:0.5, maxZ:3 };

  // entities (Gebäude) --------------------------------------------------------
  // e: { id, key, tx,ty, wTiles,hTiles, x,y,w,h, img, stock:{}, prod?:{type,rate,cap,keep}, tickAcc }
  var entities = [];
  var nextEntityId = 1;

  // obstacles grid (tile-blocker) — NUR Innenfläche blockieren ----------------
  var obstW=0, obstH=0, obstacles=null;  // Uint8Array
  function allocObstacles(w,h){ obstW=w|0; obstH=h|0; obstacles = new Uint8Array(obstW*obstH); }
  function obIdx(x,y){ return y*obstW + x; }
  function inb(x,y){ return x>=0 && y>=0 && x<obstW && y<obstH; }
  function setBlocked(x,y){ if(inb(x,y)) obstacles[obIdx(x,y)] = 1; }
  function clearObstacles(){ if(!obstacles) return; obstacles.fill(0); }

  // road/path data (Straßenmasken) -------------------------------------------
  var roadSet = new Set(); // optional: kann leer sein
  Game.getRoadSet = function(){ return roadSet; };

  // tool state ----------------------------------------------------------------
  var tool = { mode:null, key:null }; // mode: 'build'|'road'|'path'|'bulldozer'

  // assets buildings definition (Tilesize relativ zur Map-Tile) ---------------
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

  // alias mapping (de → en keys) ---------------------------------------------
  var ALIAS = { schmied:'smith', rathaus:'townhall', holzfaeller:'lumberjack', bauernhof:'farm', wohnhaus0:'house0', wohnhaus1:'house1' };

  // utils ---------------------------------------------------------------------
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function loadImage(src){ return new Promise(function(res,rej){ var i=new Image(); i.onload=function(){res(i)}; i.onerror=function(){rej(new Error("img "+src))}; i.src=src; }); }
  function loadJSON(url){ return fetch(url).then(function(r){ if(!r.ok) throw new Error("http "+r.status+" "+url); return r.json(); }); }
  function mapPx(){ if(!currentMap) return {w:0,h:0}; return {w: currentMap.width*currentMap.tile, h: currentMap.height*currentMap.tile}; }

  // coords --------------------------------------------------------------------
  function worldToTile(px,py){ var t=currentMap.tile; return { x: Math.floor(px/t), y: Math.floor(py/t) }; }
  function tileToWorld(tx,ty){ var t=currentMap.tile; return { x: tx*t, y: ty*t }; }
  Game.worldToTile = function(px,py){ return worldToTile(px,py); };
  Game.tileToWorld = function(tx,ty){ return tileToWorld(tx,ty); };

  function rectsOverlap(a,b){ return !(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y); }

  // --- PUBLIC API (needed by PF/Carriers/UI) ---------------------------------
  Game.getTileSize = function(){ return currentMap ? currentMap.tile : 64; };
  Game.getCamera   = function(){ return cam; };
  Game.getObstacleAt = function(tx,ty){
    if (!obstacles) return false;
    if (!inb(tx,ty)) return true;
    return obstacles[obIdx(tx,ty)] === 1;
  };

  // --- Placement rules -------------------------------------------------------
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

  // NUR Innenfläche blockieren (kein „+1“-Puffer, damit Tür-Kacheln frei bleiben)
  function registerObstaclesFromEntities(){
    if (!currentMap) return;
    if (!obstacles || obstW!==currentMap.width || obstH!==currentMap.height){
      allocObstacles(currentMap.width, currentMap.height);
    } else {
      clearObstacles();
    }
    for (var i=0;i<entities.length;i++){
      var e=entities[i];
      for (var y=e.ty; y<e.ty+e.hTiles; y++){
        for (var x=e.tx; x<e.tx+e.wTiles; x++){
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
    if (def.prod){
      e.prod = { type:def.prod.type, rate:def.prod.rate, cap:def.prod.cap, keep:def.prod.keep };
    }
    entities.push(e);
    registerObstaclesFromEntities(); // -> Obstacles aktualisieren
    ok("[ok] Gebäude platziert:", key, "at", tx, ty);
    return true;
  }

  // --- draw map/entities -----------------------------------------------------
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
      // Fallback-Farbkacheln
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
      // Tileset/Atlas zeichnen
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

  // fit canvas / clamp camera -------------------------------------------------
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

  // zoom helper ---------------------------------------------------------------
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

  // input ---------------------------------------------------------------------
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

  // ---------------- Tür-/Exit-Kacheln (für Carrier-Start/Ziel) ---------------
  // Bevorzugt Straßen, sonst begehbare Randkacheln am Gebäude.
  function pickExitTileForBuilding(e){
    var cand = [];
    var w = e.wTiles|0, h=e.hTiles|0;

    for (var y=e.ty-1; y<=e.ty+h; y++){
      for (var x=e.tx-1; x<=e.tx+w; x++){
        var isInside = (x>=e.tx && x<e.tx+w && y>=e.ty && y<e.ty+h);
        if (isInside) continue;
        var onHorizontal = (y===e.ty-1 || y===e.ty+h);
        var onVertical   = (x===e.tx-1 || x===e.tx+w);
        if (!(onHorizontal || onVertical)) continue;
        if (!Game.getObstacleAt(x,y)){
          var key = x+','+y;
          var road = Game.getRoadSet && Game.getRoadSet().has(key);
          var distCenter = Math.abs(x - (e.tx + (w>>1))) + Math.abs(y - (e.ty + (h>>1)));
          cand.push({x:x,y:y, road: road?1:0, d:distCenter});
        }
      }
    }
    if (cand.length){
      cand.sort(function(a,b){ if (b.road!==a.road) return b.road - a.road; return a.d - b.d; });
      return {x:cand[0].x, y:cand[0].y};
    }
    // Fallback: 2er Radius
    var best=null, bestD=1e9;
    for (var yy=e.ty-2; yy<=e.ty+h+1; yy++){
      for (var xx=e.tx-2; xx<=e.tx+w+1; xx++){
        if (!inb(xx,yy)) continue;
        if (!Game.getObstacleAt(xx,yy)){
          var d=Math.abs(xx-(e.tx+(w>>1)))+Math.abs(yy-(e.ty+(h>>1)));
          if (d<bestD){bestD=d; best={x:xx,y:yy};}
        }
      }
    }
    return best;
  }
  function pickEntryTileForDrop(e){ return pickExitTileForBuilding(e); }

  // --- Produktion / Überschuss / Carrier-Glue --------------------------------
  var lastTS = performance.now();
  function tick(){
    var now = performance.now();
    var dt = Math.min(0.1, (now - lastTS)/1000); // clamp dt
    lastTS = now;

    tickProduction(dt);               // Produktion
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
        // Quelle: begehbare Exit-Kachel
        var srcDoor = pickExitTileForBuilding(e) || { x:e.tx+Math.floor(e.wTiles/2), y:e.ty+Math.floor(e.hTiles/2) };

        // Ziel: nächstes Depot/HQ/TH (Zentroid), dann Entry-Kachel bestimmen
        var dstCenter = findNearestDrop(srcDoor.x, srcDoor.y);
        var dstDoor = null;
        if (dstCenter){
          var targetE = null;
          for (var ii=0; ii<entities.length; ii++){
            var ee = entities[ii];
            var cx = ee.tx + Math.floor(ee.wTiles/2);
            var cy = ee.ty + Math.floor(ee.hTiles/2);
            if (cx===dstCenter.x && cy===dstCenter.y){ targetE=ee; break; }
          }
          if (targetE) dstDoor = pickEntryTileForDrop(targetE);
        }

        var src = srcDoor;
        var dst = dstDoor || dstCenter;

        if (dst){
          // simple throttle
          e._sendAcc = (e._sendAcc||0) + dt;
          if (e._sendAcc > 1.0){
            e._sendAcc = 0;
            var c = trySpawnCarrier(src, dst);
            if (c){
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
    return best;
  }

  function getFirstEntity(key){
    for (var i=0;i<entities.length;i++) if(entities[i].key===key) return entities[i];
    return null;
  }

  // engine init ---------------------------------------------------------------
  function initEngine(){
    if (engineReady) return;
    canvas = document.getElementById('game') || document.getElementById('stage') || (function(){var c=document.createElement('canvas');c.id='game';document.body.appendChild(c);return c;})();
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', fit); fit();
    bindInput();
    engineReady=true; ok("game.js geladen, "+VERSION);
    try{ window.dispatchEvent(new CustomEvent('cb:engine-ready',{detail:{v:VERSION}})); }catch(_){}
    requestAnimationFrame(tick);
  }

  // loader / start ------------------------------------------------------------
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

  // helpers for obstacles when bulldozing or placing/removing roads -----------
  Game.notifyRoadChanged = function(tx,ty,isRoad){
    var k = tx+','+ty;
    if (isRoad) roadSet.add(k); else roadSet.delete(k);
    try{ if (window.PathFinder && PathFinder.invalidateRoads) PathFinder.invalidateRoads(); }catch(_){}
  };

  // --- boot ------------------------------------------------------------------
  try{ initEngine(); }catch(e){ err('Engine-Init Fehler: '+e.message); }

  // expose current map & version ----------------------------------------------
  GL.version = VERSION;
  Game.currentMap = currentMap;

  // ===========================================================================
  //  ADD-ONS: PF-Init + Inspector-Events + separates Overlay-Canvas
  // ===========================================================================
  if (typeof Game.getMapSize!=='function'){
    Game.getMapSize = function(){
      try { var m = currentMap; if (m && m.width && m.height) return { w:m.width|0, h:m.height|0 }; }
      catch(_){}
      return { w:0, h:0 };
    };
  }

  var pfReady=false;
  function tryPFInit(){
    if (pfReady) return;
    try{
      if (!window.PathFinder || !PathFinder.init) return;
      var s = Game.getMapSize(); if (!s || !s.w || !s.h) return;
      PathFinder.init(Game.getMapSize);
      try{ if (Game.getObstacleAt && PathFinder.setObstacleProvider) PathFinder.setObstacleProvider(Game.getObstacleAt); }catch(_){}
      try{ if (Game.getRoadSet && PathFinder.setRoadMask) PathFinder.setRoadMask(Game.getRoadSet()); }catch(_){}
      pfReady=true; ok('[PF] init OK '+s.w+'x'+s.h+' (v16.5.5)');
    }catch(e){ warn('[PF] init Fehler (monolith): '+(e&&e.message)); }
  }
  var pfTimer = setInterval(function(){ if (pfReady) return clearInterval(pfTimer); tryPFInit(); }, 200);

  window.addEventListener('cb:toggle-path-overlay', function(e){
    var enabled = !!(e && e.detail && e.detail.enabled);
    window.DEBUG_PATH_OVERLAY = enabled;
    ok('[game] overlay='+(enabled?'AN':'AUS'));
  });

  window.addEventListener('cb:pf-heat-reset', function(){
    try{
      if (window.PathFinder && typeof PathFinder.resetHeat==='function'){
        PathFinder.resetHeat();
        ok('[PF] Heatmap reset (via event).');
      } else {
        warn('[PF] resetHeat() nicht verfügbar.');
      }
    }catch(_){}
  });

  if (typeof Game.addResources!=='function'){
    Game.resources = Game.resources || { wood:0, stone:0, food:0, gold:0 };
    Game.addResources = function(type, amount){
      var t = String(type||'').toLowerCase(); var n=(amount|0)||0;
      if (!t || !n) return false;
      if (!Object.prototype.hasOwnProperty.call(Game.resources, t)) Game.resources[t]=0;
      Game.resources[t]+=n;
      ok('[res] +'+n+' '+t+' (store='+Game.resources[t]+')');
      return true;
    };
    ok('[game] Game.addResources bereit (fallback)');
  }

  // Separates PF-Overlay auf eigenem Canvas (#pf-overlay) ---------------------
  var overlayCanvas = null, overlayCtx = null;
  function ensureOverlayCanvas(){
    if (overlayCanvas && overlayCtx) return;
    var base = document.getElementById('game') || document.querySelector('canvas');
    if (!base) return;
    overlayCanvas = document.getElementById('pf-overlay');
    if (!overlayCanvas){
      overlayCanvas = document.createElement('canvas');
      overlayCanvas.id = 'pf-overlay';
      overlayCanvas.style.position = 'absolute';
      overlayCanvas.style.left = base.offsetLeft+'px';
      overlayCanvas.style.top = base.offsetTop+'px';
      overlayCanvas.style.pointerEvents = 'none';
      overlayCanvas.style.zIndex = (parseInt(getComputedStyle(base).zIndex||'0',10)+1).toString();
      (base.parentElement || document.body).appendChild(overlayCanvas);
    }
    overlayCtx = overlayCanvas.getContext('2d');
    syncOverlaySize();
    window.addEventListener('resize', syncOverlaySize);
    window.addEventListener('orientationchange', syncOverlaySize);
  }
  function syncOverlaySize(){
    var base = document.getElementById('game') || document.querySelector('canvas');
    if (!base || !overlayCanvas) return;
    var rect = base.getBoundingClientRect();
    overlayCanvas.width  = Math.max(1, Math.floor(rect.width));
    overlayCanvas.height = Math.max(1, Math.floor(rect.height));
    overlayCanvas.style.left = Math.floor(rect.left + window.scrollX) + 'px';
    overlayCanvas.style.top  = Math.floor(rect.top  + window.scrollY) + 'px';
    overlayCanvas.style.width  = overlayCanvas.width + 'px';
    overlayCanvas.style.height = overlayCanvas.height + 'px';
  }
  function clearOverlay(){ if (!overlayCtx || !overlayCanvas) return; overlayCtx.clearRect(0,0, overlayCanvas.width, overlayCanvas.height); }
  var rafId = 0;
  function overlayLoop(){
    rafId = window.requestAnimationFrame(overlayLoop);
    if (!window.DEBUG_PATH_OVERLAY){ clearOverlay(); return; }
    ensureOverlayCanvas(); if (!overlayCtx) return;
    syncOverlaySize();
    try{ if (window.PathFinder && PathFinder.drawOverlay) PathFinder.drawOverlay(overlayCtx, Game.getCamera()); }catch(_){}
  }
  if ('requestAnimationFrame' in window){ if (rafId) cancelAnimationFrame(rafId); rafId = requestAnimationFrame(overlayLoop); }
  window.addEventListener('cb:request-repaint', function(){ /* Overlay loop tickt ohnehin */ });

})();  // end IIFE
