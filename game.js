// game.js — v16.4.4 (ES5)
// Map, Pan/Zoom, Build-Mode + Ghost-Preview + Mini-Glue + Roads + Carrier-Loop
// + Auto-Carrier bei Farm/Holzfäller + Schmied-Fix
(function(){
  'use strict';
  var VERSION = 'v16.4.4';

  // ---------- logging ----------
  function ok(){ (window.CBLog && CBLog.ok ? CBLog.ok : console.log).apply(console, arguments); }
  function warn(){ (window.CBLog && CBLog.warn ? CBLog.warn : console.warn).apply(console, arguments); }
  function err(){ (window.CBLog && CBLog.err ? CBLog.err : console.error).apply(console, arguments); }

  // ---------- namespaces ----------
  var GL = (window.GameLoader = window.GameLoader || {});
  var Game = (window.Game = window.Game || {});

  // ---------- render state ----------
  var canvas=null, ctx=null, DPR=1, viewW=0, viewH=0;
  var engineReady=false, loopOn=false, lastTS=0;

  // ---------- map ----------
  var currentMap=null, tilesetImg=null, atlas=null;

  // ---------- camera ----------
  var cam = { x:0, y:0, zoom:1, minZ:0.5, maxZ:3 };

  // ---------- entities ----------
  var entities = []; // {key,x,y,w,h,img}

  // ---------- ghost ----------
  var ghost = null;

  // ---------- buildings ----------
  var BUILDINGS = {
    townhall:   { wTiles:2, hTiles:2, img:"assets/tex/building/Holz_Rathaus_1.png" },
    depot:      { wTiles:2, hTiles:2, img:"assets/tex/building/wood/depot_wood.png" },

    lumberjack: { wTiles:2, hTiles:2, img:"assets/tex/building/wood/lumberjack_wood.PNG" },
    farm:       { wTiles:2, hTiles:2, img:"assets/tex/building/wood/farm_wood.png" },
    mill:       { wTiles:2, hTiles:2, img:"assets/tex/building/wood/windmuehle_wood.PNG" },

    house0:     { wTiles:2, hTiles:2, img:"assets/tex/building/wood/Wohnhaus_wood0_ug0.png" },
    house1:     { wTiles:2, hTiles:2, img:"assets/tex/building/wood/Wohnhaus_wood1_ug0.png" },

    // Schmied (Fix) — Key "smith" + Alias "schmied"
    smith:      { wTiles:2, hTiles:2, img:"assets/tex/building/wood/Schmied_wood0.png" }
  };
  // UI-Kompatibilität: falls das UI "schmied" sendet → auf "smith" mappen
  function normalizeKey(k){ if(k==='schmied') return 'smith'; return k; }

  // ---------- tool ----------
  // mode: 'build'|'road'|'path'|'bulldozer'|null
  var tool = { mode:null, key:null };

  // ---------- roads (Set "x,y") ----------
  var _roadSet = new Set();

  // ---------- utils ----------
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function mapPx(){ if(!currentMap) return {w:0,h:0}; return {w: currentMap.width*currentMap.tile, h: currentMap.height*currentMap.tile}; }
  function worldToTile(px,py){ var t=currentMap.tile; return { x: Math.floor(px/t), y: Math.floor(py/t) }; }
  function tileToWorld(tx,ty){ var t=currentMap.tile; return { x: tx*t, y: ty*t }; }
  function rectsOverlap(a,b){ return !(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y); }

  function loadImage(src){
    return new Promise(function(res,rej){
      var triedAlt=false, i=new Image();
      i.onload=function(){ res(i); };
      i.onerror=function(){
        if (triedAlt) return rej(new Error("img "+src));
        triedAlt=true;
        if (src.slice(-4).toLowerCase()==='.png'){
          var alt = src.slice(0,-4) + (src.slice(-4)==='.png'?'.PNG':'.png');
          i.src = alt;
        } else { rej(new Error("img "+src)); }
      };
      i.src=src;
    });
  }
  function loadJSON(url){ return fetch(url).then(function(r){ if(!r.ok) throw new Error("http "+r.status+" "+url); return r.json(); }); }

  // ---------- placement ----------
  function canPlace(key, tx, ty){
    key = normalizeKey(key);
    var def = BUILDINGS[key]; if (!def || !currentMap) return false;
    if (tx<0 || ty<0 || tx+def.wTiles>currentMap.width || ty+def.hTiles>currentMap.height) return false;
    var t = currentMap.tile;
    var r = { x:tx*t, y:ty*t, w:def.wTiles*t, h:def.hTiles*t };
    for (var i=0;i<entities.length;i++){
      var e=entities[i];
      if (rectsOverlap(r, {x:e.x,y:e.y,w:e.w,h:e.h})) return false;
    }
    return true;
  }

  function placeBuilding(key, tx, ty){
    key = normalizeKey(key);
    var def = BUILDINGS[key]; if (!def) return false;
    var t = currentMap.tile;
    var pos = tileToWorld(tx,ty);
    var e = { key:key, x:pos.x, y:pos.y, w:def.wTiles*t, h:def.hTiles*t, img:def._img||null };
    entities.push(e);
    ok("[ok] Gebäude platziert:", key, "at", tx, ty);

    // Auto-Carrier: bei Farm & Holzfäller sofort einen Träger Richtung nächster Ablage senden
    if (key==='farm' || key==='lumberjack'){
      trySpawnAutoCarrier(tx, ty);
    }
    return true;
  }

  // ---------- Auto-Carrier Helfer ----------
  function nearestDrop(tx, ty){
    var best=null, bestD=1e9, t=currentMap.tile;
    for (var i=0;i<entities.length;i++){
      var e=entities[i];
      if (e.key==='townhall' || e.key==='depot'){
        var ex = Math.floor(e.x / t), ey = Math.floor(e.y / t);
        var d = Math.abs(ex - tx) + Math.abs(ey - ty);
        if (d<bestD){ bestD=d; best={tx:ex, ty:ey, key:e.key}; }
      }
    }
    return best;
  }
  function trySpawnAutoCarrier(fromTx, fromTy){
    if (!window.Carriers || !Carriers.spawn){ warn('[auto] Carriers.spawn fehlt'); return; }
    var dst = nearestDrop(fromTx, fromTy) || {tx:fromTx+2, ty:fromTy+2};
    var c = Carriers.spawn({ from:{x:fromTx, y:fromTy}, to:{x:dst.tx, y:dst.ty} });
    if (c) ok('[auto] Carrier gestartet von', fromTx, fromTy, 'nach', dst.tx, dst.ty, '('+(dst.key||'demo')+')');
    else   warn('[auto] Carrier-Start fehlgeschlagen (kein Pfad?)');
  }

  // ---------- public tool api ----------
  Game.setTool = function(mode, payload){
    if (mode === 'build'){
      var k = payload && payload.key || null;
      k = normalizeKey(k);
      tool.mode = 'build';
      tool.key = k;
      var def = k && BUILDINGS[k];
      ghost = def ? { key:k, x:0,y:0,w:0,h:0,img:def._img||null, ok:false } : null;
      drawMap();
      return;
    }
    tool.mode = mode || null;
    tool.key = null;
    ghost = null;
    ok('[ok] Tool gesetzt:', tool.mode||'none');
    drawMap();
  };
  Game.clearTool = function(){ tool.mode=null; tool.key=null; ghost=null; ok('[ok] Tool zurückgesetzt'); drawMap(); };

  // ---------- draw ----------
  function drawMap(){
    if(!ctx || !currentMap) return;
    var t=currentMap.tile, w=currentMap.width, h=currentMap.height;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // sichtfenster
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

    // Roads Overlay
    if (_roadSet.size){
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#8b8b8b';
      _roadSet.forEach(function(k){
        var s=k.split(','), tx=+s[0], ty=+s[1];
        if (tx<left||tx>=right||ty<top||ty>=bottom) return;
        var dx = Math.floor((tx*t - cam.x)*cam.zoom);
        var dy = Math.floor((ty*t - cam.y)*cam.zoom);
        var ds = Math.ceil(t*cam.zoom);
        ctx.fillRect(dx,dy,ds,ds);
      });
      ctx.restore();
    }

    // Entities
    for (var k=0;k<entities.length;k++){
      var e=entities[k];
      var dx = Math.floor((e.x - cam.x)*cam.zoom);
      var dy = Math.floor((e.y - cam.y)*cam.zoom);
      var dw = Math.ceil(e.w*cam.zoom);
      var dh = Math.ceil(e.h*cam.zoom);
      if (e.img) { try { ctx.drawImage(e.img, dx,dy,dw,dh); } catch(_){} }
      else { ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.fillRect(dx,dy,dw,dh); }
    }

    // Ghost
    if (ghost && tool.mode==='build' && tool.key){
      var gx = Math.floor((ghost.x - cam.x)*cam.zoom);
      var gy = Math.floor((ghost.y - cam.y)*cam.zoom);
      var gw = Math.ceil(ghost.w*cam.zoom);
      var gh = Math.ceil(ghost.h*cam.zoom);
      ctx.save();
      ctx.globalAlpha = 0.75;
      if (ghost.img){ try { ctx.drawImage(ghost.img, gx,gy,gw,gh); } catch(_){} }
      else { ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.fillRect(gx,gy,gw,gh); }
      ctx.restore();
      ctx.lineWidth = Math.max(2, Math.floor(2*cam.zoom));
      ctx.strokeStyle = ghost.ok ? "rgba(60,220,120,.95)" : "rgba(255,80,80,.95)";
      ctx.strokeRect(gx+0.5, gy+0.5, gw-1, gh-1);
    }

    // Carriers
    try{ if (window.Carriers && Carriers.draw) Carriers.draw(ctx, cam); }catch(_){}
  }

  // ---------- loop ----------
  function loop(ts){
    if (!loopOn) return;
    if (!lastTS) lastTS = ts;
    var dt = (ts - lastTS)/1000; lastTS = ts;

    try{ if (window.Carriers && Carriers.tick) Carriers.tick(dt); }catch(_){}
    drawMap();
    requestAnimationFrame(loop);
  }
  function startLoop(){
    if (loopOn) return;
    loopOn=true; lastTS=0;
    ok('[game] Renderloop gestartet (v'+VERSION+')');
    requestAnimationFrame(loop);
  }

  // ---------- fit/clamp/zoom ----------
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

  // ---------- roads ----------
  function setRoadAt(tx,ty,on){
    var k = tx+','+ty;
    var changed=false;
    if (on){ if(!_roadSet.has(k)){ _roadSet.add(k); changed=true; } }
    else   { if(_roadSet.delete(k)) changed=true; }
    if (changed){
      try{ if (window.PathFinder && PathFinder.invalidateRoads) PathFinder.invalidateRoads(); }catch(_){}
    }
  }

  // ---------- input ----------
  function updateGhostAtScreen(sx, sy){
    if (!(tool.mode==='build' && tool.key && currentMap)) return;
    var rect = canvas.getBoundingClientRect();
    var wx = cam.x + (sx - rect.left) / cam.zoom;
    var wy = cam.y + (sy - rect.top)  / cam.zoom;
    var tile = currentMap.tile;
    var tx = Math.floor(wx / tile);
    var ty = Math.floor(wy / tile);
    var def = BUILDINGS[tool.key];
    if (!def) return;
    if (!ghost) ghost = {};
    var pos = tileToWorld(tx,ty);
    ghost.key = tool.key;
    ghost.x = pos.x; ghost.y = pos.y;
    ghost.w = def.wTiles*tile; ghost.h = def.hTiles*tile;
    ghost.img = def._img || null;
    ghost.ok = canPlace(tool.key, tx, ty);
  }

  function bindInput(){
    var drag = { on:false, sx:0, sy:0, cx:0, cy:0, pinch:false, last:0 };

    canvas.addEventListener('mousedown', function(e){
      if (e.button===2){ Game.clearTool(); return; }
      drag.on=true; drag.pinch=false; drag.sx=e.clientX; drag.sy=e.clientY; drag.cx=cam.x; drag.cy=cam.y;
    });
    window.addEventListener('mousemove', function(e){
      if (!canvas) return;
      updateGhostAtScreen(e.clientX, e.clientY);
      if(!drag.on || drag.pinch) { drawMap(); return; }
      cam.x=drag.cx-(e.clientX-drag.sx)/cam.zoom; cam.y=drag.cy-(e.clientY-drag.sy)/cam.zoom; clampCam(); drawMap();
    });
    window.addEventListener('mouseup', function(){ drag.on=false; drag.pinch=false; });

    canvas.addEventListener('contextmenu', function(e){ e.preventDefault(); });

    canvas.addEventListener('wheel', function(e){
      e.preventDefault ? e.preventDefault() : (e.returnValue=false);
      var rect=canvas.getBoundingClientRect();
      zoomAt(e.deltaY<0?1.15:1/1.15, e.clientX-rect.left, e.clientY-rect.top);
    }, {passive:false});

    // Klickaktion
    canvas.addEventListener('click', function(e){
      var rect = canvas.getBoundingClientRect();
      var sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      var wx = cam.x + sx / cam.zoom, wy = cam.y + sy / cam.zoom;
      var tile = currentMap.tile;
      var tx = Math.floor(wx / tile), ty = Math.floor(wy / tile);

      if (tool.mode==='build' && tool.key){
        if (canPlace(tool.key, tx, ty)){
          placeBuilding(tool.key, tx, ty);
          updateGhostAtScreen(e.clientX, e.clientY);
          drawMap();
        } else {
          warn("[game] Platzierung nicht möglich.");
        }
        return;
      }
      if (tool.mode==='road' || tool.mode==='path'){
        setRoadAt(tx, ty, true); drawMap();
        return;
      }
      if (tool.mode==='bulldozer'){
        setRoadAt(tx, ty, false); drawMap();
        return;
      }
    });

    // Draggen zum Straßenmalen
    canvas.addEventListener('mousemove', function(e){
      if (!drag.on) return;
      if (tool.mode==='road' || tool.mode==='path'){
        var rect = canvas.getBoundingClientRect();
        var sx = e.clientX - rect.left, sy = e.clientY - rect.top;
        var wx = cam.x + sx / cam.zoom, wy = cam.y + sy / cam.zoom;
        var tile = currentMap.tile;
        var tx = Math.floor(wx / tile), ty = Math.floor(wy / tile);
        setRoadAt(tx, ty, true); drawMap();
      }
    });

    // Touch (Pan + Pinch)
    canvas.addEventListener('touchstart', function(e){
      if (e.touches.length===1){
        var t=e.touches[0];
        drag.on=true; drag.pinch=false; drag.sx=t.clientX; drag.sy=t.clientY; drag.cx=cam.x; drag.cy=cam.y;
        updateGhostAtScreen(t.clientX, t.clientY);
      } else if (e.touches.length>=2){
        drag.on=true; drag.pinch=true;
        var a=e.touches[0], b=e.touches[1];
        drag.last = Math.sqrt(Math.pow(a.clientX-b.clientX,2)+Math.pow(a.clientY-b.clientY,2));
      }
    }, {passive:true});
    canvas.addEventListener('touchmove', function(e){
      if (!drag.on) return;
      if (!drag.pinch && e.touches.length===1){
        var t=e.touches[0];
        cam.x=drag.cx-(t.clientX-drag.sx)/cam.zoom; cam.y=drag.cy-(t.clientY-drag.sy)/cam.zoom; clampCam();
        updateGhostAtScreen(t.clientX, t.clientY);
        drawMap();
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
      if(k==='escape'){ Game.clearTool(); return; }
      if(k==='arrowleft'||k==='a'){ cam.x-=step; } 
      else if(k==='arrowright'||k==='d'){ cam.x+=step; }
      else if(k==='arrowup'||k==='w'){ cam.y-=step; } 
      else if(k==='arrowdown'||k==='s'){ cam.y+=step; } 
      else return;
      clampCam(); drawMap();
    });
  }

  // ---------- engine init ----------
  function initEngine(){
    if (engineReady) return;
    canvas = document.getElementById('game') || document.getElementById('stage') || (function(){var c=document.createElement('canvas');c.id='game';document.body.appendChild(c);return c;})();
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', fit); fit();
    bindInput();
    engineReady=true; ok("game.js geladen, game.js "+VERSION);
    try{ window.dispatchEvent(new CustomEvent('cb:engine-ready',{detail:{v:VERSION}})); }catch(_){}
  }

  // ---------- loader / start ----------
  GL._start = function(mapUrl){
    return new Promise(function(resolve,reject){
      function start(){
        ok("GameLoader.start "+mapUrl);
        loadJSON(mapUrl).then(function(map){
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

          // Gebäude-Assets
          var preload = [];
          for (var k in BUILDINGS) if (BUILDINGS.hasOwnProperty(k)){
            (function(key){
              preload.push(loadImage(BUILDINGS[key].img).then(function(img){ BUILDINGS[key]._img=img; })
                .catch(function(e){ warn("Atlas/Textures nicht geladen: "+(e&&e.message?e.message:e)); }));
            })(k);
          }

          // Tileset/Atlas (optional)
          var TILESET_PNG  = './assets/tiles/tileset.terrain.png';
          var TILESET_JSON = './assets/tiles/tileset.terrain.json';

          Promise.all([ loadJSON(TILESET_JSON).catch(function(){return null;}), loadImage(TILESET_PNG).catch(function(){return null;}) ].concat(preload))
          .then(function(res){
            atlas = res[0]||null; tilesetImg = res[1]||null;
          })
          .then(function(){
            // Rathaus
            var cx = Math.floor(width/2), cy = Math.floor(height/2);
            if (canPlace('townhall', cx-1, cy-1)) placeBuilding('townhall', cx-1, cy-1);

            // Kamera zentrieren
            var center = tileToWorld(cx, cy);
            cam.zoom = 1;
            cam.x = clamp(center.x - viewW/2, 0, Math.max(0, mapPx().w - viewW));
            cam.y = clamp(center.y - viewH/2, 0, Math.max(0, mapPx().h - viewH));

            drawMap();
            startLoop();

            // Glue exposen
            Game.currentMap = currentMap; Game.cam = cam;

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

  // sofort init
  try{ initEngine(); }catch(e){ err('Engine-Init Fehler: '+e.message); }

  // expose version
  GL.version = VERSION;

  // ---------- Mini-Glue Getter ----------
  Game.getRoadSet  = function(){ return _roadSet; };
  Game.getTileSize = function(){ return (currentMap && currentMap.tile) || 64; };
  Game.getCamera   = function(){ return { x:cam.x, y:cam.y, zoom:cam.zoom }; };

  // (Basishook) PF-Init
  window.addEventListener('cb:game-started', function(){
    if (window.PathFinder && typeof PathFinder.init === 'function') {
      PathFinder.init(function(){
        var m = currentMap || {width:0,height:0};
        return { w: m.width|0, h: m.height|0 };
      });
    }
  });

  // === Patch A: robustes PF-Init mit Retry ===
  (function(){
    function tryInitPF(attempts){
      attempts = attempts || 0;
      var okPF = (window.PathFinder && typeof PathFinder.init === 'function');
      var okMap = (window.Game && Game.currentMap && Game.currentMap.width != null);
      if (okPF && okMap){
        PathFinder.init(function(){
          var m = Game.currentMap || {width:0,height:0};
          return { w: m.width|0, h: m.height|0 };
        });
        try { (window.CBLog && CBLog.ok ? CBLog.ok : console.log)('[boot] PathFinder.init OK (try '+attempts+')'); } catch(_){}
        return;
      }
      if (attempts < 50){ setTimeout(function(){ tryInitPF(attempts+1); }, 200); }
      else { try { (window.CBLog && CBLog.warn ? CBLog.warn : console.warn)('[boot] PathFinder.init ABGEBROCHEN'); } catch(_){ } }
    }
    window.addEventListener('cb:game-started', function(){ tryInitPF(0); });
    setTimeout(function(){ tryInitPF(0); }, 0);
  })();

  // === Patch B: optionaler Carrier-Autotest ===
  (function(){
    window.addEventListener('cb:game-started', function(){
      if (!window.DEV_CARRIER_AUTOTEST) return;
      setTimeout(function(){
        try {
          if (window.Carriers && typeof Carriers.spawn === 'function'){
            // Beispiel: Rathaus (Mitte) -> versetztes Ziel
            var m = Game.currentMap || {width:16,height:10};
            var cx=(m.width/2)|0, cy=(m.height/2)|0;
            Carriers.spawn({ from:{x:cx,y:cy}, to:{x:Math.min(cx+3,m.width-1), y:Math.min(cy+2,m.height-1)} });
            (window.CBLog && CBLog.ok ? CBLog.ok : console.log)('[dev] Carrier-Autotest gestartet');
          }
        } catch(e){
          (window.CBLog && CBLog.warn ? CBLog.warn : console.warn)('[dev] Autotest fehlgeschlagen:', e && e.message);
        }
      }, 500);
    });
  })();

})();
