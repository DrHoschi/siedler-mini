// game.js — v16.2.2 — Map, Pan/Zoom, Placement, Roads/Paths, Ghost, QuickSave + Carrier/Pathfinder Hooks + Cancel (ESC/Right-Click)
(function(){
  'use strict';
  var VERSION = 'v16.2.2';

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

  // Overlays: Wege/Straßen + Trails (Carrier-Spuren)
  var over = { road:{}, path:{}, trail:{} };

  // building defs (Tilesize relativ zur Map-Tile)
  var BUILDINGS = {
    townhall:   { wTiles:2, hTiles:2, img:"assets/tex/building/Holz_Rathaus_1.png" },
    depot:      { wTiles:2, hTiles:2, img:"assets/tex/building/wood/depot_wood.png" },
    lumberjack: { wTiles:2, hTiles:2, img:"assets/tex/building/wood/lumberjack_wood.PNG" },
    farm:       { wTiles:2, hTiles:2, img:"assets/tex/building/wood/farm_wood.png" },
    mill:       { wTiles:2, hTiles:2, img:"assets/tex/building/wood/windmuehle_wood.PNG" },
    watermill:  { wTiles:2, hTiles:2, img:"assets/tex/building/wood/wassermuehle_wood.PNG" },
    bakery:      { wTiles:2, hTiles:2, img:"assets/tex/building/wood/baecker_wood.png" },
    blacksmith:  { wTiles:2, hTiles:2, img:"assets/tex/building/wood/Schmied_wood0.png" },
    stonecutter: { wTiles:2, hTiles:2, img:"assets/tex/building/wood/steinmetz_wood.png" },
    house0:     { wTiles:2, hTiles:2, img:"assets/tex/building/wood/Wohnhaus_wood0_ug0.png" },
    house1:     { wTiles:2, hTiles:2, img:"assets/tex/building/wood/Wohnhaus_wood1_ug0.png" },
    watchtower: { wTiles:2, hTiles:2, img:"assets/tex/building/wood/wachturm _wood.png" }, // Achtung: Leerzeichen im Dateinamen!
    tree:       { wTiles:1, hTiles:1, img:"assets/tex/terrain/topdown_tree_needle0_ug0.jpeg" }
  };

  // sanfte Aliase (deutsch/alt → intern)
  var BUILDING_ALIASES = {
    holzfaeller:'lumberjack', baecker:'bakery', schmied:'blacksmith', steinmetz:'stonecutter',
    wohnhaus0:'house0', wohnhaus1:'house1', wachturm:'watchtower', windmuehle:'mill',
    wassermuehle:'watermill', lager:'depot', rathaus:'townhall',
    // Alt-Bestand
    wood0:'lumberjack', factory:'mill'
  };
  function resolveBuildingKey(k){ return BUILDINGS[k] ? k : (BUILDING_ALIASES[k] || k); }

  // tool state
  var tool = { mode:null, key:null }; // 'build'|'road'|'path'|'bulldozer'

  // ghost preview (für Bauen)
  var ghost = { on:false, tx:0, ty:0, key:null, can:false };

  // utils
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function loadImage(src){ return new Promise(function(res,rej){ var i=new Image(); i.onload=function(){res(i)}; i.onerror=function(){rej(new Error("img "+src))}; i.src=src; }); }
  function loadJSON(url){ return fetch(url).then(function(r){ if(!r.ok) throw new Error("http "+r.status+" "+url); return r.json(); }); }
  function mapPx(){ if(!currentMap) return {w:0,h:0}; return {w: currentMap.width*currentMap.tile, h: currentMap.height*currentMap.tile}; }
  function keyXY(tx,ty){ return tx + "," + ty; }
  function normMode(m){ m=(m||'').toLowerCase(); return m==='building'?'build':m; } // UI-Schutz
  function worldToTile(px,py){ var t=currentMap.tile; return {x:Math.floor(px/t), y:Math.floor(py/t)}; }
  function tileToWorld(tx,ty){ var t=currentMap.tile; return { x: tx*t, y: ty*t }; }
  function rectsOverlap(a,b){ return !(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y); }

  // placement helpers
  function canPlace(key, tx, ty){
    var def = BUILDINGS[key]; if (!def || !currentMap) return false;
    // map bounds
    if (tx<0 || ty<0 || tx+def.wTiles>currentMap.width || ty+def.hTiles>currentMap.height) return false;
    // simple collision mit anderen Entities
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

  function placeAtScreen(sx, sy){
    if (!currentMap){ warn("[build] Abgebrochen: keine Map geladen."); return; }
    var mode = normMode(tool.mode);
    if (mode !== 'build'){ warn("[build] Abgebrochen: falscher Modus:", tool.mode); return; }
    if (!tool.key){ warn("[build] Abgebrochen: kein Gebäude-Key gesetzt."); return; }
    var key = resolveBuildingKey(tool.key);
    if (!BUILDINGS[key]){ warn("[build] Unbekanntes Gebäude-Key:", key); return; }
    var wx = cam.x + sx / cam.zoom, wy = cam.y + sy / cam.zoom;
    var t  = currentMap.tile;
    var tx = Math.floor(wx / t), ty = Math.floor(wy / t);
    if (canPlace(key, tx, ty)){ placeBuilding(key, tx, ty); drawMap(); }
    else { warn("[build] Platzierung nicht möglich @", tx, ty, "für", key, "(Bounds? Kollision?)"); }
  }

  // Ghost aktualisieren
  function updateGhostFromScreen(sx, sy){
    ghost.on = false;
    if (!currentMap) return;
    var mode = normMode(tool.mode);
    if (mode !== 'build' || !tool.key) return;

    var wx = cam.x + sx / cam.zoom;
    var wy = cam.y + sy / cam.zoom;
    var t  = currentMap.tile;
    var tx = Math.floor(wx / t);
    var ty = Math.floor(wy / t);

    var key = resolveBuildingKey(tool.key);
    if (!BUILDINGS[key]) return;

    tx = Math.max(0, Math.min(currentMap.width - 1, tx));
    ty = Math.max(0, Math.min(currentMap.height - 1, ty));

    ghost.on  = true;
    ghost.tx  = tx;  ghost.ty  = ty;
    ghost.key = key; ghost.can = canPlace(key, tx, ty);
  }

  // Overlays (Straße/Weg/Trail)
  function setRoad(tx,ty){ over.road[keyXY(tx,ty)] = true; }
  function setPath(tx,ty){ over.path[keyXY(tx,ty)] = true; }
  function clearOverlaysAt(tx,ty){ delete over.road[keyXY(tx,ty)]; delete over.path[keyXY(tx,ty)]; }
  function markTrail(tx,ty,amount){
    var k = keyXY(tx,ty);
    var v = (over.trail[k]||0) + (+amount||0.05);
    over.trail[k] = Math.max(0, Math.min(1.0, v));
  }
  function decayTrails(dt){
    var keys = Object.keys(over.trail);
    if (!keys.length) return;
    var keep = {};
    var factor = Math.pow(0.5, dt/10); // Halbwertszeit ~10s
    for (var i=0;i<keys.length;i++){
      var k=keys[i], v=over.trail[k]*factor;
      if (v>0.02){ keep[k]=v; }
    }
    over.trail = keep;
  }

  // public tool api
  Game.setTool = function(mode, payload){
    mode = normMode(mode);
    if (mode === 'build'){
      var k = payload && payload.key; k = resolveBuildingKey(k);
      tool.mode = 'build'; tool.key  = k; ok("[ok] Tool gesetzt (build): " + k);
    } else {
      tool.mode = mode; tool.key  = null; ok("[ok] Tool gesetzt: " + mode);
    }
  };

  // NEU: Tool leeren/abbrechen (ESC & Rechtsklick)
  Game.clearTool = function(){
    tool.mode = null;
    tool.key  = null;
    ghost.on = false;
    ghost.key = null;
    ok("[ok] Tool abgewählt");
    drawMap();
  };

  // draw
  function drawMap(){
    if(!ctx || !currentMap) return;
    var t=currentMap.tile, w=currentMap.width, h=currentMap.height;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // sichtfenster bounds (in Tiles)
    var left   = Math.floor(cam.x / t);
    var top    = Math.floor(cam.y / t);
    var right  = Math.ceil((cam.x + viewW/cam.zoom) / t);
    var bottom = Math.ceil((cam.y + viewH/cam.zoom) / t);
    left=Math.max(0,Math.min(w-1,left)); top=Math.max(0,Math.min(h-1,top));
    right=Math.max(0,Math.min(w,right)); bottom=Math.max(0,Math.min(h,bottom));

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

    // Overlays: Weg/Straße
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

    // Trails (Carrier-Laufspuren)
    var trailKeys = Object.keys(over.trail);
    for (var it=0; it<trailKeys.length; it++){
      var k = trailKeys[it];
      var parts = k.split(','); var tx4=+parts[0], ty4=+parts[1];
      if (tx4<left || tx4>=right || ty4<top || ty4>=bottom) continue;
      var strength = over.trail[k]; if (!strength) continue;
      var dx4 = Math.floor((tx4*t - cam.x)*cam.zoom);
      var dy4 = Math.floor((ty4*t - cam.y)*cam.zoom);
      var ds4 = Math.ceil(t*cam.zoom);
      var band = Math.floor(0.36*ds4);
      var off  = Math.floor((ds4 - band)/2);
      ctx.fillStyle = "rgba(255,255,255," + Math.min(0.6, 0.08 + 0.5*strength) + ")";
      ctx.fillRect(dx4+off, dy4+off, band, band);
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

    // Carrier (kleine Marker)
    if (window.Carriers && Carriers.draw){
      Carriers.draw(ctx, cam, t, cam.zoom);
    }

    // Ghost-Vorschau (nach Entities)
    if (ghost.on && ghost.key && BUILDINGS[ghost.key]){
      var tG   = currentMap.tile;
      var defG = BUILDINGS[ghost.key];
      var gx   = ghost.tx * tG, gy = ghost.ty * tG;
      var gw   = defG.wTiles * tG, gh = defG.hTiles * tG;

      var dxG = Math.floor((gx - cam.x) * cam.zoom);
      var dyG = Math.floor((gy - cam.y) * cam.zoom);
      var dwG = Math.ceil(gw * cam.zoom);
      var dhG = Math.ceil(gh * cam.zoom);

      if (defG._img){
        ctx.globalAlpha = ghost.can ? 0.65 : 0.35;
        try { ctx.drawImage(defG._img, dxG, dyG, dwG, dhG); } catch(_){}
        ctx.globalAlpha = 1;
      }
      ctx.lineWidth = Math.max(1, Math.floor(2 * cam.zoom));
      ctx.strokeStyle = ghost.can ? 'rgba(60,200,120,0.95)' : 'rgba(220,70,60,0.95)';
      ctx.strokeRect(dxG + 0.5, dyG + 0.5, dwG - 1, dhG - 1);
      ctx.fillStyle = ghost.can ? 'rgba(60,200,120,0.12)' : 'rgba(220,70,60,0.12)';
      ctx.fillRect(dxG, dyG, dwG, dhG);
    }
  }

  // fit / clamp camera
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

    // Rechtsklick: Tool abwählen
    canvas.addEventListener('contextmenu', function(e){
      e.preventDefault ? e.preventDefault() : (e.returnValue = false);
      Game.clearTool();
      return false;
    });

    // Ghost bei Mausbewegung
    canvas.addEventListener('mousemove', function(e){
      var rect = canvas.getBoundingClientRect();
      updateGhostFromScreen(e.clientX - rect.left, e.clientY - rect.top);
      drawMap();
    });

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

    canvas.addEventListener('wheel', function(e){
      e.preventDefault ? e.preventDefault() : (e.returnValue=false);
      var rect=canvas.getBoundingClientRect();
      zoomAt(e.deltaY<0?1.15:1/1.15, e.clientX-rect.left, e.clientY-rect.top);
    }, {passive:false});

    // Klick: Bauen
    canvas.addEventListener('click', function(e){
      var rect = canvas.getBoundingClientRect();
      placeAtScreen(e.clientX-rect.left, e.clientY-rect.top);
    });

    // Touch
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
        var r = canvas.getBoundingClientRect();
        updateGhostFromScreen(t.clientX - r.left, t.clientY - r.top);
      } else if (e.touches.length>=2){
        var a=e.touches[0], b=e.touches[1];
        var d=Math.sqrt(Math.pow(a.clientX-b.clientX,2)+Math.pow(a.clientY-b.clientY,2));
        if (drag.last){
          var factor = d/drag.last; var r2=canvas.getBoundingClientRect();
          zoomAt(factor, ((a.clientX+b.clientX)/2)-r2.left, ((a.clientY+b.clientY)/2)-r2.top);
        }
        drag.last=d;
      }
    }, {passive:true});

    window.addEventListener('touchend', function(){
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
      ghost.on=false;
    });

    // Keyboard
    window.addEventListener('keydown', function(e){
      var k=(e.key||'').toLowerCase();

      // Abbrechen: ESC -> Tool abwählen
      if (k === 'escape') {
        Game.clearTool();
        return;
      }

      // QuickSave/Load
      if (k === 's' && (e.ctrlKey || e.metaKey || (!e.altKey && !e.shiftKey))){
        e.preventDefault && e.preventDefault(); quickSave(); return;
      }
      if (k === 'l' && (e.ctrlKey || e.metaKey || (!e.altKey && !e.shiftKey))){
        e.preventDefault && e.preventDefault(); quickLoad(); return;
      }

      // Debug: Carrier-Spawn (C) und Move-Ziel (M = View-Mitte)
      if (k==='c' && window.Carriers) { spawnCarrierAtCenter(); return; }
      if (k==='m' && window.Carriers){
        var cx = cam.x + viewW/2/cam.zoom, cy = cam.y + viewH/2/cam.zoom;
        var tt = worldToTile(cx,cy);
        if (_demoCarrierId) Carriers.orderMove(_demoCarrierId, {gx:tt.x, gy:tt.y});
        return;
      }

      var step=Math.max(16, Math.floor(120/cam.zoom));
      if(k==='arrowleft'||k==='a'){ cam.x-=step; } 
      else if(k==='arrowright'||k==='d'){ cam.x+=step; }
      else if(k==='arrowup'||k==='w'){ cam.y-=step; } 
      else if(k==='arrowdown'||k==='s'){ cam.y+=step; } 
      else return;
      clampCam(); drawMap();
    });

    // Painting-Helpers
    function paintAtScreen(sx,sy, isStart){
      if (!currentMap) return;
      var wx = cam.x + sx / cam.zoom, wy = cam.y + sy / cam.zoom;
      var t = currentMap.tile;
      var tx = Math.max(0, Math.min(currentMap.width-1,  Math.floor(wx/t)));
      var ty = Math.max(0, Math.min(currentMap.height-1, Math.floor(wy/t)));
      if (isStart || drag.lastTileX===null){
        applyPaint(tx,ty);
        drag.lastTileX = tx; drag.lastTileY = ty;
      } else {
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

  // Linie (Bresenham) in Tile-Koordinaten
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

  // Bulldozer
  function bulldozeAt(tx,ty){
    var t = currentMap.tile, rx = tx*t, ry = ty*t;
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

  // QuickSave / QuickLoad
  function serializeWorld(){
    var ents = [];
    for (var i=0;i<entities.length;i++){
      var e = entities[i];
      ents.push({ key:e.key, x:e.x, y:e.y, w:e.w, h:e.h });
    }
    var out = {
      entities: ents,
      over: { road: over.road, path: over.path },
      trail: over.trail,
      cam: { x: cam.x, y: cam.y, zoom: cam.zoom }
    };
    if (window.Carriers && Carriers.serialize){
      out.carriers = Carriers.serialize();
    }
    return out;
  }

  function deserializeWorld(snap){
    if (!snap) return;
    entities = [];
    var ents = snap.entities || [];
    for (var i=0;i<ents.length;i++){
      var e = ents[i];
      var def = BUILDINGS[e.key];
      entities.push({
        key:e.key, x:e.x, y:e.y, w:e.w, h:e.h, img: def ? def._img : null
      });
    }
    over.road = snap.over && snap.over.road ? snap.over.road : {};
    over.path = snap.over && snap.over.path ? snap.over.path : {};
    over.trail= snap.trail || {};
    if (snap.cam){
      cam.x = +snap.cam.x || cam.x;
      cam.y = +snap.cam.y || cam.y;
      cam.zoom = +snap.cam.zoom || cam.zoom;
      clampCam();
    }
    if (window.Carriers && Carriers.deserialize){
      Carriers.deserialize(snap.carriers || []);
    }
    drawMap();
  }

  function quickSave(){
    try{ localStorage.setItem('siedler-mini.save', JSON.stringify(serializeWorld())); ok('[ok] Save geschrieben'); }
    catch(e){ err('[err] Save fehlgeschlagen: ' + (e && e.message ? e.message : e)); }
  }
  function quickLoad(){
    try{
      var raw = localStorage.getItem('siedler-mini.save');
      if (!raw){ warn('[warn] Kein Save gefunden'); return; }
      deserializeWorld(JSON.parse(raw));
      ok('[ok] Save geladen');
    } catch(e){ err('[err] Load fehlgeschlagen: ' + (e && e.message ? e.message : e)); }
  }
  Game.save = quickSave; Game.load = quickLoad;

  // Ticker
  var _lastTs=0, _demoCarrierId=null;
  function tick(ts){
    if (!_lastTs) _lastTs = ts;
    var dt = Math.min(0.05, (ts - _lastTs)/1000);
    _lastTs = ts;

    if (window.Carriers && Carriers.update){
      Carriers.update(dt);
    }
    decayTrails(dt);

    drawMap();
    requestAnimationFrame(tick);
  }

  function spawnCarrierAtCenter(){
    if (!window.Carriers || !currentMap) return;
    var cx = Math.floor(currentMap.width/2), cy = Math.floor(currentMap.height/2);
    if (!_demoCarrierId){
      _demoCarrierId = Carriers.spawn({ tx:cx, ty:cy, speedTilesPerSec:4 });
      ok('[ok] Carrier gespawnt @', cx, cy);
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
            cam.x = Math.max(0, Math.min(mapPx().w - viewW, center.x - viewW/2));
            cam.y = Math.max(0, Math.min(mapPx().h - viewH, center.y - viewH/2));

            // PathFinder/Carriers initialisieren
            if (window.PathFinder){
              PathFinder.init({
                getSize: function(){ return {w: currentMap.width, h: currentMap.height}; },
                isBlocked: function(tx,ty){
                  // blockiert, wenn ein Entity-Rechteck die Tile belegt
                  var t=currentMap.tile, rx=tx*t, ry=ty*t;
                  for (var i=0;i<entities.length;i++){
                    var e=entities[i];
                    if (rx < e.x+e.w && rx+t > e.x && ry < e.y+e.h && ry+t > e.y) return true;
                  }
                  return false;
                },
                moveCost: function(tx,ty){
                  var k=keyXY(tx,ty);
                  if (over.road[k]) return 4;
                  if (over.path[k]) return 6;
                  return 10;
                },
                allowDiag: false
              });
            }
            if (window.Carriers){
              Carriers.init({
                toWorld: function(tx,ty){ return tileToWorld(tx,ty); },
                toTile:  function(px,py){ return worldToTile(px,py); },
                markTrail: markTrail,
                requestPath: function(sx,sy,gx,gy){
                  if (!window.PathFinder) return null;
                  return PathFinder.find({sx:sx,sy:sy,gx:gx,gy:gy, maxIter: 20000});
                }
              });
              // Demo: 1 Carrier in der Mitte
              _demoCarrierId = Carriers.spawn({ tx:cx, ty:cy, speedTilesPerSec:4 });
            }

            drawMap();

            try{ window.dispatchEvent(new CustomEvent('cb:game-started',{detail:{map:mapUrl}})); }catch(_){}
            if (window.GameUI && typeof window.GameUI.onGameStarted==='function') window.GameUI.onGameStarted();
            ok("Game gestartet");

            // Ticker starten (für Carrier/Trails)
            requestAnimationFrame(tick);

            resolve(true);
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
