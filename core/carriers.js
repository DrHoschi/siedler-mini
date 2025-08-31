// core/carriers.js — v1.0.0 — Carrier/Porter Agenten (ES5, ohne Deps)
(function(){
  'use strict';

  function ok(){ (window.CBLog && CBLog.ok ? CBLog.ok : console.log).apply(console, arguments); }

  var CR = {};
  var U = {
    toWorld: function(tx,ty){ return {x:tx*64,y:ty*64}; },
    toTile:  function(px,py){ return {x:Math.floor(px/64),y:Math.floor(py/64)}; },
    markTrail: function(tx,ty,a){},
    requestPath: function(sx,sy,gx,gy){ return null; }
  };

  var list = []; // {id, tx,ty, x,y, speed, path, i, state}
  var _id = 1;

  CR.init = function(opts){
    U.toWorld     = (opts && opts.toWorld)     || U.toWorld;
    U.toTile      = (opts && opts.toTile)      || U.toTile;
    U.markTrail   = (opts && opts.markTrail)   || U.markTrail;
    U.requestPath = (opts && opts.requestPath) || U.requestPath;
    ok("[carriers] Modul geladen (v1.0.0)");
  };

  CR.spawn = function(opt){
    var tx=opt.tx|0, ty=opt.ty|0, speedTiles = Math.max(0.5, +opt.speedTilesPerSec || 4);
    var w = U.toWorld(tx,ty);
    var c = {
      id:_id++,
      tx:tx, ty:ty,
      x:w.x+32, y:w.y+32,                 // Tile-Mitte
      speed: speedTiles,                  // Tiles/Sekunde
      path:null, i:0,
      state:'idle'
    };
    list.push(c);
    return c.id;
  };

  CR.orderMove = function(id, target){
    var c = get(id); if (!c) return false;
    var path = U.requestPath(c.tx, c.ty, target.gx|0, target.gy|0);
    if (!path || path.length<2){ c.state='idle'; c.path=null; c.i=0; return false; }
    c.path = path; c.i = 1; c.state='walking'; // index 1 = erste Zielkachel
    return true;
  };

  function get(id){
    for (var i=0;i<list.length;i++) if (list[i].id===id) return list[i];
    return null;
  }

  CR.update = function(dt){
    for (var i=0;i<list.length;i++){
      var c=list[i];
      if (c.state!=='walking' || !c.path || c.i>=c.path.length) { c.state='idle'; continue; }
      var tgt = c.path[c.i];
      var wCur = U.toWorld(c.tx,c.ty);
      var wTgt = U.toWorld(tgt.x,tgt.y);
      var cx = wCur.x + 32, cy = wCur.y + 32; // von Tile-Mitte
      var txw = wTgt.x + 32, tyw = wTgt.y + 32; // zu Tile-Mitte

      var dx = txw - cx, dy = tyw - cy;
      var dist = Math.sqrt(dx*dx + dy*dy) || 1;
      var stepPxPerSec = c.speed * 64; // Tiles/s -> px/s
      var step = stepPxPerSec * dt;

      if (step >= dist){
        // Zieltile erreicht
        c.tx = tgt.x; c.ty = tgt.y;
        var w2 = U.toWorld(c.tx,c.ty); c.x = w2.x+32; c.y=w2.y+32;
        U.markTrail(c.tx,c.ty,1.0);
        c.i++;
        if (c.i>=c.path.length){ c.state='idle'; c.path=null; c.i=0; }
      } else {
        // nur Interpolations-Pos (optional sichtbar in draw)
        var nx = cx + dx/dist * step, ny = cy + dy/dist * step;
        c.x = nx; c.y = ny;
        // Spur auf aktueller Tile
        U.markTrail(c.tx,c.ty, 0.05);
      }
    }
  };

  CR.draw = function(ctx, cam, tile, zoom){
    if (!ctx) return;
    for (var i=0;i<list.length;i++){
      var c = list[i];
      var dx = Math.floor((c.x - cam.x)*zoom);
      var dy = Math.floor((c.y - cam.y)*zoom);
      var r = Math.max(2, Math.floor(3*zoom));
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath(); ctx.arc(dx,dy,r,0,Math.PI*2); ctx.fill();
      if (c.state==='walking'){
        ctx.strokeStyle="rgba(255,255,255,0.35)";
        ctx.beginPath(); ctx.moveTo(dx,dy); ctx.lineTo(dx,dy-r*2-2); ctx.stroke();
      }
    }
  };

  CR.serialize = function(){
    var out=[];
    for (var i=0;i<list.length;i++){
      var c=list[i];
      out.push({
        id:c.id, tx:c.tx, ty:c.ty,
        x:c.x, y:c.y, speed:c.speed,
        state:c.state,
        path:c.path, i:c.i
      });
    }
    return out;
  };

  CR.deserialize = function(arr){
    list = [];
    if (!arr || !arr.length) return;
    for (var i=0;i<arr.length;i++){
      var a = arr[i];
      list.push({
        id:a.id|0, tx:a.tx|0, ty:a.ty|0,
        x:+a.x||0, y:+a.y||0, speed:+a.speed||4,
        state:a.state||'idle',
        path:a.path||null, i:a.i|0
      });
      if (a.id>=_id) _id=a.id+1;
    }
  };

  // Expose
  window.Carriers = CR;
})();
