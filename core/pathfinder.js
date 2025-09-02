/* ============================================================================
 * core/pathfinder.js — v16.5.3
 * Projekt: Siedler-Mini
 * Zweck:
 *   - Hybrid-Pathfinding:
 *       • 'roads': 4-Nachbarn, bevorzugt Straßennetz (wenn vorhanden)
 *       • 'offroad': 8-Nachbarn (Diagonalen), ohne Straßenbevorzugung
 *       • 'auto': versucht 'roads', sonst 'offroad'
 *   - Heatmap (Trampelpfade) zur Visualisierung / Wiederverwendung
 *   - Overlay-Darstellung (optional) für Debug/Inspektor
 *
 * Öffentliche API:
 *   PathFinder.init(getMapSizeFn)
 *   PathFinder.setRoadMask(Set|null)              // Keys "x,y"
 *   PathFinder.setObstacleProvider(fn|null)       // fn(tx,ty)=>boolean (true = blockiert)
 *   PathFinder.invalidateRoads()                  // Platzhalter (Cache)
 *   PathFinder.applyHeat(path)                    // [{x,y},...]
 *   PathFinder.findPath({from:{x,y}, to:{x,y}, mode:'auto'|'offroad'|'roads'})
 *   PathFinder.drawOverlay(ctx, cam)              // cam: {x,y,zoom}, nutzt Game.getTileSize()
 *
 * Erwartete Game-Hooks (optional):
 *   Game.getTileSize() : number
 *   Game.getRoadSet()  : Set
 *   Game.getMapSize()  : {w,h}
 *   Game.getObstacleAt(tx,ty) : boolean
 *
 * Debug:
 *   window.DEBUG_PATH_OVERLAY = true → Heatmap & Pfadlinien sichtbar
 * ============================================================================
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // internes State
  // ---------------------------------------------------------------------------
  var PF = (window.PathFinder = window.PathFinder || {});
  var _w = 0, _h = 0;                // Map-Größe (Tiles)
  var _heat = null;                  // Float32Array[w*h]
  var _roadSet = null;               // Set("x,y") oder null
  var _blockerProvider = null;       // fn(tx,ty)=>true wenn blockiert
  var _lastPaths = [];               // für Overlay: Liste jüngster Pfade
  var _didLazyInit = false;          // einmaliger Lazy-Init-Schutz

  // sanfte Logs (fallen auf console.* zurück)
  function LOG(lvl, msg){
    try{
      if (window.CBLog){
        if (lvl==='ok')   return window.CBLog.ok(msg);
        if (lvl==='warn') return window.CBLog.warn(msg);
        if (lvl==='err')  return window.CBLog.err(msg);
        return window.CBLog.push(lvl||'log', msg);
      }
    }catch(_){}
    var c = (lvl==='err' ? 'error' : lvl==='warn' ? 'warn' : 'log');
    (console[c]||console.log)(msg);
  }

  // ---------------------------------------------------------------------------
  // Utilities / Gitter
  // ---------------------------------------------------------------------------
  function idx(x,y){ return y*_w + x; }
  function inb(x,y){ return x>=0 && y>=0 && x<_w && y<_h; }
  function key(x,y){ return x + ',' + y; }
  function isRoad(x,y){ return _roadSet && _roadSet.has(key(x,y)); }
  function isBlocked(x,y){
    if (!inb(x,y)) return true;
    if (_blockerProvider && _blockerProvider(x,y)) return true;
    return false;
  }

  function heuristic(x0,y0,x1,y1){
    // Octile (für 8-Nachbarn), guter Allrounder
    var dx = Math.abs(x1-x0), dy = Math.abs(y1-y0);
    var F = Math.SQRT2 - 1;
    return (dx<dy) ? F*dx + dy : F*dy + dx;
  }

  // 4-Nachbarn
  var N4 = [[1,0],[-1,0],[0,1],[0,-1]];
  // 8-Nachbarn (Diagonalen ohne "Ecken schneiden": beide Orthogonalen müssen frei sein)
  var N8 = [
    [1,0],[-1,0],[0,1],[0,-1],
    [1,1],[1,-1],[-1,1],[-1,-1]
  ];

  function neighborsRoad(x,y, out){
    for (var i=0;i<4;i++){
      var dx=N4[i][0], dy=N4[i][1], nx=x+dx, ny=y+dy;
      if (!inb(nx,ny)) continue;
      if (isBlocked(nx,ny)) continue;
      if (!isRoad(nx,ny)) continue;
      out.push([nx,ny,1]);
    }
    return out;
  }

  function neighborsOffroad(x,y,out){
    for (var i=0;i<N8.length;i++){
      var dx=N8[i][0], dy=N8[i][1], nx=x+dx, ny=y+dy;
      if (!inb(nx,ny)) continue;
      if (isBlocked(nx,ny)) continue;

      // Diagonalen nur erlauben, wenn beide orthogonalen Nachbarn nicht beide blockiert sind
      if (dx!==0 && dy!==0){
        var b1 = isBlocked(x+dx, y);
        var b2 = isBlocked(x, y+dy);
        if (b1 && b2) continue;
      }
      var cost = (dx===0 || dy===0) ? 1 : Math.SQRT2;
      // leichte Heatmap-Gewichtung (belaufene Felder werden minimal günstiger)
      if (_heat){
        var h = _heat[idx(nx,ny)] || 0;
        cost = Math.max(0.05, cost * (1.0 - Math.min(0.2, h*0.01)));
      }
      out.push([nx,ny,cost]);
    }
    return out;
  }

  // A* auf Grid
  function astar(sx,sy, tx,ty, mode){
    if (sx===tx && sy===ty) return [{x:sx,y:sy}];
    var open = new MinHeap();
    var g = new Float32Array(_w*_h); for (var i=0;i<g.length;i++) g[i]=Infinity;
    var came = new Int32Array(_w*_h); for (var j=0;j<came.length;j++) came[j]=-1;

    function push(x,y, gval, fval){ open.push({x:x,y:y,f:fval}); g[idx(x,y)]=gval; }
    function pop(){ return open.pop(); }

    push(sx,sy, 0, heuristic(sx,sy,tx,ty));
    var iter=0, maxIter = _w*_h*4;

    while (!open.empty() && iter++<maxIter){
      var cur = pop(); var cx=cur.x, cy=cur.y; var ci=idx(cx,cy);
      if (cx===tx && cy===ty){
        // reconstruct
        var path=[{x:tx,y:ty}];
        while (came[ci]!==-1){
          var pi=came[ci], py=(pi/_w)|0, px=(pi%_w)|0;
          path.push({x:px,y:py}); ci=pi;
        }
        path.reverse();
        return path;
      }
      var neigh=[];
      if (mode==='roads') neighborsRoad(cx,cy,neigh);
      else neighborsOffroad(cx,cy,neigh);

      for (var k=0;k<neigh.length;k++){
        var nx=neigh[k][0], ny=neigh[k][1], step=neigh[k][2];
        var ni=idx(nx,ny);
        var ng=g[ci]+step;
        if (ng<g[ni]){
          came[ni]=ci;
          g[ni]=ng;
          var h = heuristic(nx,ny,tx,ty);
          var f = ng + (mode==='roads'? (h*1.2) : h);
          open.push({x:nx,y:ny,f:f});
        }
      }
    }
    return null;
  }

  // kleiner Bin-Heap für Open-Liste
  function MinHeap(){
    this.a=[];
  }
  MinHeap.prototype.empty=function(){ return this.a.length===0; };
  MinHeap.prototype.push=function(n){
    var a=this.a; a.push(n); var i=a.length-1;
    while(i>0){ var p=((i-1)>>1); if (a[p].f<=n.f) break; a[i]=a[p]; i=p; }
    a[i]=n;
  };
  MinHeap.prototype.pop=function(){
    var a=this.a; var n=a[0]; var x=a.pop(); if(a.length){ var i=0;
      while(true){ var l=i*2+1, r=l+1, s=i;
        if (l<a.length && a[l].f<a[s].f) s=l;
        if (r<a.length && a[r].f<a[s].f) s=r;
        if (s===i) break; a[i]=a[s]; i=s;
      }
      // place x
      while(i>0){ var p=((i-1)>>1); if (a[p].f<=x.f) break; a[i]=a[p]; i=p; }
      a[i]=x;
    }
    return n;
  };

  // ---------------------------------------------------------------------------
  // Öffentliche API
  // ---------------------------------------------------------------------------
  PF.init = function(getMapSize){
    try{
      var s = getMapSize && getMapSize();
      _w = (s && s.w)|0; _h=(s && s.h)|0;
      if (_w<=0 || _h<=0){ LOG('warn', '[PF] init: ungültige Größe '+JSON.stringify(s)); return; }
      _heat = new Float32Array(_w*_h);
      LOG('ok', '[PF] init OK '+_w+'x'+_h);
    }catch(e){
      LOG('warn', '[PF] init Fehler: '+(e&&e.message));
    }
  };

  PF.setRoadMask = function(set){ _roadSet = set||null; };
  PF.setObstacleProvider = function(fn){ _blockerProvider = (typeof fn==='function') ? fn : null; };
  PF.invalidateRoads = function(){ /* später evtl. Cache leeren */ };

  PF.applyHeat = function(path){
    if (!_heat || !path) return;
    for (var i=0;i<path.length;i++){
      var p=path[i]; if (inb(p.x,p.y)) _heat[idx(p.x,p.y)] += 1;
    }
    _lastPaths.push(path);
    if (_lastPaths.length>6) _lastPaths.shift();
  };

  // --- LAZY-INIT: falls vergessen wurde, init() nachzuholen -------------------
  function tryLazyInit(){
    if (_didLazyInit) return;
    if (_w>0 && _h>0 && _heat) return;
    try{
      if (window.Game && typeof Game.getMapSize==='function'){
        PF.init(Game.getMapSize);
        _didLazyInit = true;
        if (window.Game && typeof Game.getObstacleAt==='function') PF.setObstacleProvider(Game.getObstacleAt);
        if (window.Game && typeof Game.getRoadSet==='function')   PF.setRoadMask(Game.getRoadSet());
        LOG('ok','[PF] Lazy-Init durchgeführt.');
      }
    }catch(_){}
  }

  PF.findPath = function(cfg){
    tryLazyInit();

    if (!cfg || !cfg.from || !cfg.to){
      LOG('warn','[PF] findPath: ungültige Parameter'); return null;
    }
    if (!_w || !_h || !_heat){
      LOG('warn','[PF] findPath ohne init() aufgerufen'); return null;
    }

    var sx=(cfg.from.x|0), sy=(cfg.from.y|0);
    var tx=(cfg.to.x|0),   ty=(cfg.to.y|0);
    var mode = cfg.mode || 'auto';

    if (isBlocked(sx,sy) || isBlocked(tx,ty)){
      LOG('warn','[PF] Start/Ziel blockiert'); return null;
    }

    var path=null;
    if (mode==='roads'){
      if (isRoad(sx,sy) && isRoad(tx,ty)){
        path = astar(sx,sy,tx,ty,'roads');
      } else {
        path = null;
      }
    } else if (mode==='offroad'){
      path = astar(sx,sy,tx,ty,'offroad');
    } else {
      // auto: erst roads, dann offroad
      if (isRoad(sx,sy) && isRoad(tx,ty)){
        path = astar(sx,sy,tx,ty,'roads');
      }
      if (!path) path = astar(sx,sy,tx,ty,'offroad');
    }

    if (path && path.length){
      PF.applyHeat(path);
      return path;
    } else {
      LOG('warn','[PF] kein Pfad '+sx+','+sy+' → '+tx+','+ty);
      return null;
    }
  };

  PF.drawOverlay = function(ctx, cam){
    try{
      if (!window.DEBUG_PATH_OVERLAY) return;
      if (!ctx || !_heat) return;
      var tile = (window.Game && Game.getTileSize) ? (Game.getTileSize()|0) : 64;

      // Heatmap
      var max=0; for (var i=0;i<_heat.length;i++) if (_heat[i]>max) max=_heat[i];
      if (max>0){
        for (var y=0;y<_h;y++){
          for (var x=0;x<_w;x++){
            var v=_heat[idx(x,y)]/max; if (v<=0) continue;
            var a = Math.min(0.35, 0.05 + v*0.3);
            ctx.fillStyle = 'rgba(255,0,0,'+a+')';
            ctx.fillRect(x*tile - cam.x*tile, y*tile - cam.y*tile, tile, tile);
          }
        }
      }
      // letzte Pfade
      ctx.lineWidth = Math.max(1, (2/cam.zoom));
      for (var i=0;i<_lastPaths.length;i++){
        var p=_lastPaths[i]; if (!p || p.length<2) continue;
        ctx.beginPath();
        for (var k=0;k<p.length;k++){
          var xx=p[k].x*tile - cam.x*tile + tile/2;
          var yy=p[k].y*tile - cam.y*tile + tile/2;
          if (k===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);
        }
        ctx.strokeStyle = 'rgba(0,128,255,0.9)';
        ctx.stroke();
      }
    }catch(_){}
  };

})();
