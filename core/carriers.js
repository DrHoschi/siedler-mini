/* 
============================================
Datei: core/carriers.js
Projekt: Siedler-Mini
Version: v16.3.1
Zweck: Träger-Logik (Carrier Agents, Pfade)
============================================
*/
(function(){
  'use strict';
  var Carriers = (window.Carriers = window.Carriers || {});

  var carriers = []; // {x,y,tx,ty,path,idx,speed,state,job}
  var tileSize = 64;
  var mapW=0,mapH=0;
  var onDrawOverlay = null; // optional (Game kann hier einen Drawer registrieren)

  // ===================== Init =====================
  Carriers.init = function(opts){
    opts = opts || {};
    tileSize = opts.tile || tileSize;
    mapW = opts.width || 0;
    mapH = opts.height|| 0;
    carriers.length=0;
  };

  Carriers.registerOverlay = function(drawFn){
    onDrawOverlay = drawFn;
  };

  // ===================== Spawning =====================
  Carriers.spawn = function(tx,ty){
    var c = { x:tx, y:ty, tx:tx, ty:ty, path:null, idx:0, speed:2/tileSize, state:'idle', job:null };
    carriers.push(c);
    return c;
  };

  Carriers.assignJob = function(c, job){
    if (!c) return false;
    c.job = job || null;
    c.state = job ? 'toSource' : 'idle';
    c.path = null; c.idx = 0;
    return true;
  };

  // ===================== Pathfinding =====================
  function findPathWrap(ax,ay,bx,by){
    if (!window.GamePathfinder || !GamePathfinder.findPath) return null;
    return GamePathfinder.findPath(ax,ay,bx,by);
  }

  // ===================== Carrier Update =====================
  function stepCarrier(c, dt){
    if (c.state==='idle'){ return; }

    var target = null;
    if (c.state==='toSource' && c.job){ target = c.job.from; }
    else if (c.state==='toTarget' && c.job){ target = c.job.to; }

    if (!c.path && target){
      c.path = findPathWrap(c.x,c.y, target[0], target[1]);
      c.idx = 0;
      if (!c.path){ c.state='idle'; c.job=null; return; }
    }

    if (!target){ c.state='idle'; c.job=null; return; }
    if (c.x===target[0] && c.y===target[1]){
      if (c.state==='toSource'){ c.state='toTarget'; c.path=null; c.idx=0; }
      else if (c.state==='toTarget'){ c.state='idle'; c.job=null; }
      return;
    }

    if (c.path && c.idx < c.path.length){
      var nx = c.path[c.idx][0], ny = c.path[c.idx][1];
      if (nx===c.x && ny===c.y){ c.idx++; return; }
      c.x = nx; c.y = ny; c.idx++;
    }
  }

  Carriers.update = function(dt){
    for (var i=0;i<carriers.length;i++) stepCarrier(carriers[i], dt);
  };

  Carriers.getAll = function(){ return carriers.slice(); };

  // ===================== Zeichnen =====================
  Carriers.drawOverlay = function(ctx, cam, zoom){
    if (typeof onDrawOverlay === 'function'){ onDrawOverlay(ctx, cam, zoom, tileSize, carriers); return; }
    ctx.save();
    ctx.lineWidth = Math.max(1, Math.round(1.5*zoom));
    ctx.strokeStyle = 'rgba(80,180,220,.75)';
    ctx.fillStyle = 'rgba(80,180,220,.15)';
    for (var i=0;i<carriers.length;i++){
      var c = carriers[i];
      var px = Math.floor((c.x*tileSize - cam.x)*zoom);
      var py = Math.floor((c.y*tileSize - cam.y)*zoom);
      ctx.beginPath();
      ctx.arc(px+tileSize*zoom/2, py+tileSize*zoom/2, Math.max(3, Math.round(4*zoom)), 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  };

  // ===================== Bootstrapping =====================
  Carriers.bootstrapForMap = function(map, isWalkableFn){
    if (!map) return;
    var t = map.tile || 64;
    Carriers.init({ tile:t, width:map.width, height:map.height });
    if (window.GamePathfinder && GamePathfinder.init){
      GamePathfinder.init(map, isWalkableFn);
    }
  };

  (window.CBLog?.ok || console.log)('[carriers.js] Modul geladen (v16.3.1)');
})();
