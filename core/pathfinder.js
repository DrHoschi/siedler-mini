// core/pathfinder.js — v1.0.0 — A* Pfadfinder (ES5, ohne Deps)
(function(){
  'use strict';

  function ok(){ (window.CBLog && CBLog.ok ? CBLog.ok : console.log).apply(console, arguments); }

  var PF = {};
  var cfg = {
    getSize: function(){ return {w:0,h:0}; },
    isBlocked: function(tx,ty){ return false; },
    moveCost: function(tx,ty){ return 10; },  // Straße/Weg günstiger
    allowDiag: false
  };

  PF.init = function(opts){
    cfg.getSize   = (opts && opts.getSize)   || cfg.getSize;
    cfg.isBlocked = (opts && opts.isBlocked) || cfg.isBlocked;
    cfg.moveCost  = (opts && opts.moveCost)  || cfg.moveCost;
    cfg.allowDiag = !!(opts && opts.allowDiag);
    ok("[pathfinder] Modul geladen (v1.0.0)");
  };

  function key(tx,ty){ return tx+"|"+ty; }

  function heuristic(ax,ay,bx,by){
    var dx = Math.abs(ax-bx), dy = Math.abs(ay-by);
    if (!cfg.allowDiag) return 10*(dx+dy); // Manhattan * 10
    // Diagonal: 10 & 14
    var dmin = Math.min(dx,dy), dmax = Math.max(dx,dy);
    return 14*dmin + 10*(dmax-dmin);
  }

  function neighbors(x,y){
    var list = [
      {x:x+1,y:y},{x:x-1,y:y},{x:x,y:y+1},{x:x,y:y-1}
    ];
    if (cfg.allowDiag){
      list.push({x:x+1,y:y+1},{x:x-1,y:y+1},{x:x+1,y:y-1},{x:x-1,y:y-1});
    }
    return list;
  }

  PF.find = function(params){
    var sx=params.sx|0, sy=params.sy|0, gx=params.gx|0, gy=params.gy|0;
    var size = cfg.getSize(), W=size.w|0, H=size.h|0;
    var maxIter = Math.max(1000, params.maxIter|0 || 20000);

    function inBounds(x,y){ return x>=0 && y>=0 && x<W && y<H; }

    if (!inBounds(sx,sy) || !inBounds(gx,gy)) return null;
    if (cfg.isBlocked(gx,gy)) return null;

    var open = []; // (Array statt Heap: genügt hier)
    var openMap = {};
    var closed = {};
    var came   = {};
    var gScore = {};

    var sk = key(sx,sy), gk=key(gx,gy);
    gScore[sk] = 0;
    open.push({k:sk,x:sx,y:sy,f:heuristic(sx,sy,gx,gy)});
    openMap[sk]=true;

    var iter=0;
    while(open.length && iter++ < maxIter){
      // kleinstes f finden
      var bestIdx=0, best=open[0];
      for (var i=1;i<open.length;i++){
        if (open[i].f < best.f){ bestIdx=i; best=open[i]; }
      }
      var current = best; open.splice(bestIdx,1); delete openMap[current.k];
      if (current.k===gk){
        // reconstruct
        var path=[{x:gx,y:gy}], ck=gk;
        while(came[ck]){ ck=came[ck]; var parts=ck.split('|'); path.push({x:+parts[0],y:+parts[1]}); }
        path.reverse();
        return path;
      }
      closed[current.k]=true;

      var nb = neighbors(current.x,current.y);
      for (var n=0;n<nb.length;n++){
        var nx=nb[n].x, ny=nb[n].y, nk=key(nx,ny);
        if (!inBounds(nx,ny) || closed[nk]) continue;
        if (cfg.isBlocked(nx,ny)) continue;

        var step = 10; // 4-Nachbarn
        if (cfg.allowDiag){
          var diag = (nx!==current.x && ny!==current.y);
          step = diag ? 14 : 10;
        }
        var tileCost = cfg.moveCost(nx,ny) | 0;
        var tentative = (gScore[current.k]||1e9) + step + tileCost;

        if (!openMap[nk] || tentative < (gScore[nk]||1e12)){
          came[nk]=current.k;
          gScore[nk]=tentative;
          var f = tentative + heuristic(nx,ny,gx,gy);
          if (!openMap[nk]){ open.push({k:nk,x:nx,y:ny,f:f}); openMap[nk]=true; }
        }
      }
    }
    return null; // kein Pfad gefunden
  };

  window.PathFinder = PF;
})();
