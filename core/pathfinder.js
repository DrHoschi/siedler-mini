/* core/pathfinder.js — v16.5.2
   Hybrid-PF (Roads bevorzugt → 4-Nb, sonst Offroad → 8-Nb + Diagonalen)
   Auto-Init (Map-Größe aus Game), Heatmap/Trampelpfade, Overlay
   Obstacle-Provider + Road-Maske
*/
(function(){
  'use strict';

  var PF = (window.PathFinder = window.PathFinder || {});
  var _w=0, _h=0, _ready=false;
  var _heat = null;             // Float32Array[w*h]
  var _roadSet = null;          // Set("x,y") oder null
  var _blockerProvider = null;  // fn(tx,ty) => true, wenn blockiert
  var _lastPaths = [];

  function idx(x,y){ return y*_w + x; }
  function inb(x,y){ return x>=0 && y>=0 && x<_w && y<_h; }
  function key(x,y){ return x+','+y; }
  function isRoad(x,y){ return _roadSet && _roadSet.has(key(x,y)); }

  function isBlocked(x,y){
    if (!inb(x,y)) return true;
    if (_blockerProvider && _blockerProvider(x,y)) return true;
    return false;
  }

  // ---- Init / Auto-Init ----------------------------------------------------
  function sizeFromGame(){
    var G = window.Game || {};
    var cm = G.currentMap || null;
    if (cm && cm.width && cm.height) return {w:cm.width|0, h:cm.height|0};
    // Fallback: versuche Layer-Array
    if (cm && cm.layers && cm.layers.length){
      var w = cm.width|0, h = cm.height|0;
      if (w>0 && h>0) return {w:w, h:h};
    }
    return null;
  }

  function doInit(getMapSize){
    var s = null;
    try { s = (typeof getMapSize==='function') ? getMapSize() : null; }catch(_){}
    if (!s) s = sizeFromGame();
    if (!s || !s.w || !s.h){ console.warn('[PF] init: keine Map-Größe verfügbar'); _ready=false; return; }
    _w = s.w|0; _h = s.h|0;
    _heat = new Float32Array(_w*_h);
    _ready = true;
    console.log('[PF] init OK', _w+'x'+_h);
  }

  function ensureReady(getMapSize){
    if (_ready && _w>0 && _h>0) return true;
    doInit(getMapSize);
    return _ready;
  }

  PF.init = function(getMapSize){ doInit(getMapSize); };
  PF.isReady = function(){ return _ready && _w>0 && _h>0; };
  PF.setRoadMask = function(set){ _roadSet = set || null; };
  PF.setObstacleProvider = function(fn){ _blockerProvider = (typeof fn==='function') ? fn : null; };
  PF.invalidateRoads = function(){ /* optional: Road-Cache leeren */ };

  PF.applyHeat = function(path){
    if (!_heat || !path || !path.length) return;
    for (var i=0;i<path.length;i++){
      var p = path[i]; var id = idx(p.x,p.y);
      if (id>=0 && id<_heat.length){
        var v = _heat[id] + 1.0;
        _heat[id] = v>50 ? 50 : v;
      }
    }
  };

  // ---- Road-Connectivity (BFS 4-Nb) ----------------------------------------
  function roadConnected(sx,sy, tx,ty){
    if (!_roadSet) return false;
    if (!isRoad(sx,sy) || !isRoad(tx,ty)) return false;
    var cap=_w*_h, qx=new Int16Array(cap), qy=new Int16Array(cap), h=0,t=0;
    var seen = new Uint8Array(_w*_h);
    qx[h]=sx; qy[h]=sy; h++; seen[idx(sx,sy)]=1;
    var dx=[1,-1,0,0], dy=[0,0,1,-1];
    while(t<h){
      var x=qx[t], y=qy[t]; t++;
      if (x===tx && y===ty) return true;
      for (var k=0;k<4;k++){
        var nx=x+dx[k], ny=y+dy[k];
        if (!inb(nx,ny)) continue;
        var id=idx(nx,ny); if (seen[id]) continue;
        if (!_roadSet.has(key(nx,ny))) continue;
        seen[id]=1; qx[h]=nx; qy[h]=ny; h++;
      }
    }
    return false;
  }

  // ---- A* Road-only (4-Nb) --------------------------------------------------
  function findPathRoads(sx,sy, tx,ty){
    var cap=_w*_h, ox=new Int16Array(cap), oy=new Int16Array(cap), oh=0;
    var og=new Int32Array(_w*_h); for(var i=0;i<og.length;i++) og[i]=1e9;
    var cameX=new Int16Array(_w*_h), cameY=new Int16Array(_w*_h);
    var inOpen=new Uint8Array(_w*_h), closed=new Uint8Array(_w*_h);

    function push(x,y){ var id=idx(x,y); if(inOpen[id])return; inOpen[id]=1; ox[oh]=x; oy[oh]=y; oh++; }
    function pop(){
      var best=-1, bestF=1e9, bx=0,by=0;
      for (var i=0;i<oh;i++){
        var x=ox[i], y=oy[i], id=idx(x,y); if(!inOpen[id]) continue;
        var g=og[id], h=(Math.abs(x-tx)+Math.abs(y-ty))*10, f=g+h;
        if (f<bestF){ bestF=f; best=i; bx=x; by=y; }
      }
      if (best<0) return null;
      inOpen[idx(bx,by)]=0;
      return {x:bx,y:by};
    }

    og[idx(sx,sy)]=0; push(sx,sy);
    var dx=[1,-1,0,0], dy=[0,0,1,-1];

    while(true){
      var cur=pop(); if(!cur) break;
      if (cur.x===tx && cur.y===ty) return reconstruct(cameX,cameY,sx,sy,tx,ty);
      closed[idx(cur.x,cur.y)]=1;
      for (var k=0;k<4;k++){
        var nx=cur.x+dx[k], ny=cur.y+dy[k];
        if (!inb(nx,ny)) continue;
        var id=idx(nx,ny);
        if (closed[id]) continue;
        if (!isRoad(nx,ny)) continue;
        var step=10;
        var newG = og[idx(cur.x,cur.y)] + step;
        if (newG < og[id]){
          cameX[id]=cur.x; cameY[id]=cur.y; og[id]=newG; push(nx,ny);
        }
      }
    }
    return null;
  }

  // ---- A* Offroad (8-Nb + Diagonale) ---------------------------------------
  function findPathOffroad(sx,sy, tx,ty){
    var cap=_w*_h, og=new Int32Array(_w*_h); for(var i=0;i<og.length;i++) og[i]=1e9;
    var cameX=new Int16Array(_w*_h), cameY=new Int16Array(_w*_h);
    var inOpen=new Uint8Array(_w*_h), closed=new Uint8Array(_w*_h);
    var qx=new Int16Array(cap), qy=new Int16Array(cap), qh=0;

    function push(x,y){ var id=idx(x,y); if(inOpen[id])return; inOpen[id]=1; qx[qh]=x; qy[qh]=y; qh++; }
    function bestPop(){
      var best=-1,bF=1e9,bx=0,by=0;
      for (var i=0;i<qh;i++){
        var x=qx[i], y=qy[i], id=idx(x,y); if(!inOpen[id]) continue;
        var g=og[id], dx=Math.abs(x-tx), dy=Math.abs(y-ty);
        var h = (Math.max(dx,dy)*14); // grobe Chebyshev-Heuristik
        var f = g+h; if (f<bF){ bF=f; best=i; bx=x; by=y; }
      }
      if (best<0) return null;
      inOpen[idx(bx,by)]=0;
      return {x:bx,y:by};
    }

    og[idx(sx,sy)]=0; push(sx,sy);
    var dirs = [
      [1,0,10],[-1,0,10],[0,1,10],[0,-1,10],
      [1,1,14],[-1,1,14],[1,-1,14],[-1,-1,14]
    ];

    while(true){
      var cur = bestPop(); if(!cur) break;
      if (cur.x===tx && cur.y===ty) return reconstruct(cameX,cameY,sx,sy,tx,ty);
      closed[idx(cur.x,cur.y)]=1;

      for (var k=0;k<dirs.length;k++){
        var nx=cur.x+dirs[k][0], ny=cur.y+dirs[k][1], base=dirs[k][2];
        if (!inb(nx,ny)) continue;
        var id=idx(nx,ny);
        if (closed[id]) continue;
        if (isBlocked(nx,ny)) continue;

        var costMul = 1.0;
        if (isRoad(nx,ny)) costMul *= 0.6;  // Straße bevorzugen
        var heat = _heat ? _heat[id] : 0;
        if (heat>0){ var bias = 1.0 - Math.min(0.4, heat*0.02); costMul *= bias; }

        var step = Math.floor(base * costMul);
        var newG = og[idx(cur.x,cur.y)] + (step||1);
        if (newG < og[id]){
          cameX[id]=cur.x; cameY[id]=cur.y; og[id]=newG; push(nx,ny);
        }
      }
    }
    return null;
  }

  function reconstruct(cX,cY, sx,sy, tx,ty){
    var out=[], x=tx, y=ty, guard=_w*_h+10;
    while(guard-- > 0){
      out.push({x:x,y:y});
      if (x===sx && y===sy) break;
      var id=idx(x,y), px=cX[id], py=cY[id];
      if (px===0 && py===0 && !(x===sx && y===sy)) return null;
      x=px; y=py;
    }
    out.reverse();
    return out;
  }

  // ---- Public Find ----------------------------------------------------------
  PF.findPath = function(opts){
    opts = opts||{};
    if (!ensureReady(opts.getMapSize)){
      console.warn('[PF] findPath ohne init'); return null;
    }
    var sx=(opts.from&&opts.from.x)|0, sy=(opts.from&&opts.from.y)|0;
    var tx=(opts.to&&opts.to.x)|0,   ty=(opts.to&&opts.to.y)|0;
    var mode = opts.mode||'auto';
    _lastPaths.length=0;

    // 1) Road-only, wenn verbunden
    if (mode!=='offroad' && _roadSet && roadConnected(sx,sy,tx,ty)){
      var r = findPathRoads(sx,sy,tx,ty);
      if (r && r.length){ _lastPaths.push({path:r, type:'road'}); return r; }
    }
    // 2) Offroad
    var o = findPathOffroad(sx,sy,tx,ty);
    if (o && o.length){ _lastPaths.push({path:o, type:'offroad'}); return o; }

    return null;
  };

  // ---- Overlay --------------------------------------------------------------
  PF.drawOverlay = function(ctx, cam){
    if (!window.DEBUG_PATH_OVERLAY) return;
    var tile = (window.Game && Game.getTileSize && Game.getTileSize()) || 64;

    // Heat
    if (_heat){
      ctx.save(); ctx.globalAlpha = 0.25;
      for (var y=0;y<_h;y++){
        for (var x=0;x<_w;x++){
          var v = _heat[idx(x,y)]; if (v<=0) continue;
          var dx = Math.floor((x*tile - cam.x)*cam.zoom);
          var dy = Math.floor((y*tile - cam.y)*cam.zoom);
          var ds = Math.ceil(tile*cam.zoom);
          var a = Math.min(0.45, 0.08 + v*0.02);
          ctx.fillStyle = 'rgba(255,215,64,'+a.toFixed(3)+')';
          ctx.fillRect(dx,dy,ds,ds);
        }
      }
      ctx.restore();
    }

    // Pfade
    for (var i=0;i<_lastPaths.length;i++){
      var P=_lastPaths[i]; var path=P.path; if(!path||path.length<2) continue;
      ctx.save();
      ctx.lineWidth = Math.max(2, Math.floor(2*cam.zoom));
      ctx.strokeStyle = P.type==='road' ? 'rgba(120,200,255,.95)' : 'rgba(255,170,60,.95)';
      ctx.beginPath();
      for (var k=0;k<path.length;k++){
        var x = path[k].x*tile + tile/2;
        var y = path[k].y*tile + tile/2;
        var sx = Math.floor((x - cam.x)*cam.zoom);
        var sy = Math.floor((y - cam.y)*cam.zoom);
        if (k===0) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy);
      }
      ctx.stroke();
      ctx.restore();
    }
  };

})();
