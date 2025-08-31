/*! core/pathfinder.js v16.3.0 — A* auf Kachelraster (ES5) */
(function(){
  'use strict';
  var PF = (window.GamePathfinder = window.GamePathfinder || {});

  var gridW=0, gridH=0, walk=null; // walk[y][x] = true/false
  var allowDiag = true;            // Diagonalen erlauben
  var diagCost  = 1.41421356237;   // √2
  var orthoCost = 1.0;

  function inBounds(x,y){ return x>=0 && y>=0 && x<gridW && y<gridH; }

  PF.init = function(map, isWalkableFn){
    gridW = map && map.width  || 0;
    gridH = map && map.height || 0;
    walk = new Array(gridH);
    for (var y=0;y<gridH;y++){
      walk[y] = new Array(gridW);
      for (var x=0;x<gridW;x++){
        walk[y][x] = !!(isWalkableFn ? isWalkableFn(x,y) : true);
      }
    }
  };

  PF.rebuild = function(updateFn){
    // optional: einzelne Felder neu setzen
    if (!updateFn || !walk) return;
    for (var y=0;y<gridH;y++) for (var x=0;x<gridW;x++){
      var v = updateFn(x,y, walk[y][x]);
      if (typeof v==='boolean') walk[y][x] = v;
    }
  };

  PF.setDiagonal = function(v){ allowDiag = !!v; };

  function neighbors(x,y){
    var res = [
      [x+1,y, orthoCost],[x-1,y, orthoCost],[x,y+1, orthoCost],[x,y-1, orthoCost]
    ];
    if (allowDiag){
      res.push([x+1,y+1, diagCost],[x-1,y+1, diagCost],[x+1,y-1, diagCost],[x-1,y-1, diagCost]);
    }
    return res;
  }

  function heuristic(ax,ay,bx,by){
    // Octile-Heuristik (gut für 8-Nachbarn)
    var dx = Math.abs(ax-bx), dy = Math.abs(ay-by);
    var F = diagCost - orthoCost;
    return (dx<dy) ? F*dx + dy : F*dy + dx;
  }

  PF.findPath = function(sx,sy,tx,ty, opts){
    if (!walk || !inBounds(sx,sy) || !inBounds(tx,ty)) return null;
    if (!walk[sy][sx] || !walk[ty][tx]) return null;

    var w=gridW,h=gridH;
    var open = [];
    var came = new Array(h), g=new Array(h), f=new Array(h);
    for (var y=0;y<h;y++){ came[y]=new Array(w); g[y]=new Array(w); f[y]=new Array(w); }
    function push(o){ open.push(o); }
    function pop(){ // einfache PriorityQueue (linear) reicht für kleine Karten
      var bi=0,bf=open[0].f,i;
      for(i=1;i<open.length;i++){ if(open[i].f<bf){ bf=open[i].f; bi=i; } }
      return open.splice(bi,1)[0];
    }
    function key(x,y){ return x+'#'+y; }

    g[sy][sx]=0; f[sy][sx]=heuristic(sx,sy,tx,ty);
    push({x:sx,y:sy,f:f[sy][sx]});
    var closed = Object.create(null);

    while (open.length){
      var cur = pop();
      var cx=cur.x, cy=cur.y;
      var ck=key(cx,cy);
      if (cx===tx && cy===ty){
        // rekonstruieren
        var path=[[tx,ty]];
        while (came[cy][cx]){
          var p=came[cy][cx]; cx=p[0]; cy=p[1]; path.push([cx,cy]);
        }
        path.reverse();
        return path;
      }
      closed[ck]=1;

      var ns = neighbors(cx,cy);
      for (var i=0;i<ns.length;i++){
        var nx=ns[i][0], ny=ns[i][1], cost=ns[i][2];
        if (!inBounds(nx,ny) || !walk[ny][nx]) continue;
        if (closed[key(nx,ny)]) continue;

        var ng = (g[cy][cx]||0) + cost;
        if (g[ny][nx]===undefined || ng < g[ny][nx]){
          came[ny][nx] = [cx,cy];
          g[ny][nx] = ng;
          f[ny][nx] = ng + heuristic(nx,ny,tx,ty);
          // falls schon in open → aktualisieren; sonst push
          var found=false;
          for (var j=0;j<open.length;j++){ if (open[j].x===nx && open[j].y===ny){ open[j].f=f[ny][nx]; found=true; break; } }
          if (!found) push({x:nx,y:ny,f:f[ny][nx]});
        }
      }
    }
    return null; // kein Pfad
  };

  PF.debugIsWalkable = function(x,y){ return !!(walk && inBounds(x,y) && walk[y][x]); };

  // expose
  if (!window.GamePathfinder) window.GamePathfinder = PF;
})();
