/* 
========================================
 Datei: core/pathfinder.js
 Projekt: Siedler-Mini
 Version: v16.5.1
 Zweck: Hybrid-Pfadfinder (Straße+Offroad),
        Heatmap für Trampelpfade
========================================
*/

(function(){
  'use strict';
  var VERSION = 'v16.5.1';
  var PF = (window.PathFinder = window.PathFinder || {});

  // Map-Daten
  var mapW=0, mapH=0;
  var roadMask=null, obstacles=null;
  var heatmap=[];

  // Kosten
  var COST = { ortho:10, diag:14, road:6, heat:8, normal:10 };

  // Init
  PF.init = function(w,h){
    mapW=w; mapH=h;
    roadMask=new Uint8Array(w*h);
    obstacles=new Uint8Array(w*h);
    heatmap=new Float32Array(w*h);
    log("[PF] init OK",w,"x",h);
  };

  PF.setRoadMask = function(set){
    if(!roadMask) return;
    roadMask.fill(0);
    set.forEach(function(idx){ if(idx>=0 && idx<roadMask.length) roadMask[idx]=1; });
  };

  PF.setObstacles = function(cb){
    if(!obstacles) return;
    for(var i=0;i<obstacles.length;i++){
      var tx=i%mapW, ty=(i/mapW)|0;
      obstacles[i]= cb(tx,ty)?1:0;
    }
  };

  function idx(tx,ty){ return ty*mapW+tx; }

  function isBlocked(tx,ty){
    if(tx<0||ty<0||tx>=mapW||ty>=mapH) return true;
    return obstacles[idx(tx,ty)]===1;
  }

  // A* Pathfinding
  PF.findPath = function(from,to,mode){
    if(!mapW||!mapH) return null;
    var open=[], closed=new Uint8Array(mapW*mapH);
    var g=new Int32Array(mapW*mapH).fill(1e9);
    var prev=new Int32Array(mapW*mapH).fill(-1);

    function push(node,f){ open.push(node); }
    function pop(){ 
      var best=0; for(var i=1;i<open.length;i++){ if(open[i].f<open[best].f) best=i; }
      return open.splice(best,1)[0];
    }

    var sx=from.x, sy=from.y, ex=to.x, ey=to.y;
    var sidx=idx(sx,sy), eidx=idx(ex,ey);
    g[sidx]=0;
    push({i:sidx, x:sx, y:sy, f:0});

    var dirs=[ [1,0,COST.ortho],[0,1,COST.ortho],[-1,0,COST.ortho],[0,-1,COST.ortho],
               [1,1,COST.diag],[-1,1,COST.diag],[1,-1,COST.diag],[-1,-1,COST.diag] ];

    while(open.length){
      var cur=pop();
      if(cur.i===eidx){
        // reconstruct
        var path=[]; var c=cur.i;
        while(c!==-1){ path.push(c); c=prev[c]; }
        path.reverse();
        applyHeat(path);
        return path.map(function(i){return {x:i%mapW,y:(i/mapW)|0};});
      }
      if(closed[cur.i]) continue;
      closed[cur.i]=1;
      for(var d=0;d<dirs.length;d++){
        var nx=cur.x+dirs[d][0], ny=cur.y+dirs[d][1];
        if(nx<0||ny<0||nx>=mapW||ny>=mapH) continue;
        if(isBlocked(nx,ny)) continue;
        var nidx=idx(nx,ny);
        if(closed[nidx]) continue;
        var base=dirs[d][2];
        var cost=base;
        if(roadMask[nidx]) cost=COST.road;
        cost+= heatmap[nidx]*0.5; // heat beeinflusst
        var ng=g[cur.i]+cost;
        if(ng<g[nidx]){
          g[nidx]=ng;
          prev[nidx]=cur.i;
          var h=Math.abs(nx-ex)+Math.abs(ny-ey);
          push({i:nidx,x:nx,y:ny,f:ng+h});
        }
      }
    }
    warn("[PF] kein Pfad",sx,sy,"→",ex,ey);
    return null;
  };

  function applyHeat(path){
    if(!heatmap) return;
    path.forEach(function(p){
      var id=idx(p.x,p.y);
      heatmap[id]=Math.min(heatmap[id]+1,100);
    });
  }

  function log(){ (window.CBLog?.ok||console.log).apply(console,arguments); }
  function warn(){ (window.CBLog?.warn||console.warn).apply(console,arguments); }

  log("[pathfinder.js] geladen",VERSION);
})();
