/* core/carriers.js — v16.5.2
   Carrier-Manager: spawn → Pfad (Hybrid-PF) → laufen → Ziel → idle
   Auto-Init PathFinder (holt Größe aus Game bei Bedarf)
   Overlay-Zeichnung via PathFinder.drawOverlay
*/
(function(){
  'use strict';

  var CR = (window.Carriers = window.Carriers || {});
  var _list = []; // {x,y, path:[{x,y}], seg:0, t:0..1, speedTilesPS, done}
  var SPEED = 2.0; // tiles/s

  function getTile(){ return (window.Game && Game.getTileSize && Game.getTileSize()) || 64; }

  function ensurePFReady(){
    try{
      if (window.PathFinder){
        if (!PathFinder.isReady || !PathFinder.isReady()){
          PathFinder.init(function(){
            var G=window.Game||{}, cm=G.currentMap||null;
            if (cm && cm.width && cm.height) return {w:cm.width|0, h:cm.height|0};
            // Fallback: versuche Dimensionen grob zu schätzen (nicht ideal, aber verhindert „ohne init“)
            return { w: (cm&&cm.width)|0 || 16, h: (cm&&cm.height)|0 || 10 };
          });
        }
        // Road-/Obstacle-Hooks updaten
        if (typeof PathFinder.setRoadMask==='function' && window.Game && Game.getRoadSet){
          PathFinder.setRoadMask(Game.getRoadSet());
        }
        if (typeof PathFinder.setObstacleProvider==='function' && window.Game && typeof Game.getObstacleAt==='function'){
          PathFinder.setObstacleProvider(Game.getObstacleAt);
        }
      }
    }catch(_){}
  }

  CR.spawn = function(opts){
    opts=opts||{};
    var sx=(opts.from&&opts.from.x)|0, sy=(opts.from&&opts.from.y)|0;
    var tx=(opts.to&&opts.to.x)|0,   ty=(opts.to&&opts.to.y)|0;

    ensurePFReady();

    var path = (window.PathFinder && PathFinder.findPath)
      ? PathFinder.findPath({from:{x:sx,y:sy}, to:{x:tx,y:ty}, mode:'auto'})
      : null;

    if (!path || path.length<2){
      console.warn('[carriers] kein Pfad', sx,sy, '→', tx,ty);
      return null;
    }

    try{ if (window.PathFinder && PathFinder.applyHeat) PathFinder.applyHeat(path); }catch(_){}

    var c = { x:sx, y:sy, path:path, seg:0, t:0, speedTilesPS:SPEED, done:false };
    _list.push(c);
    return c;
  };

  CR.tick = function(dt){
    if (!_list.length) return;
    for (var i=_list.length-1;i>=0;i--){
      var c=_list[i]; if (c.done) continue;
      var p=c.path, s=c.seg;
      if (s>=p.length-1){ c.done=true; continue; }
      var a=p[s], b=p[s+1];
      var dx=b.x-a.x, dy=b.y-a.y;
      var segLen = Math.sqrt(dx*dx + dy*dy) || 1;
      var adv = (c.speedTilesPS * dt) / segLen;
      c.t += adv;
      if (c.t>=1){
        c.seg++; c.t=0;
        if (c.seg>=p.length-1){ c.x=b.x; c.y=b.y; c.done=true; continue; }
        a=p[c.seg]; b=p[c.seg+1];
        dx=b.x-a.x; dy=b.y-a.y;
        segLen = Math.sqrt(dx*dx + dy*dy) || 1;
      }
      c.x = a.x + dx*c.t;
      c.y = a.y + dy*c.t;
    }
  };

  CR.draw = function(ctx, cam){
    try{ if (window.PathFinder && PathFinder.drawOverlay) PathFinder.drawOverlay(ctx, cam); }catch(_){}

    if (!_list.length) return;
    var tile = getTile();

    for (var i=0;i<_list.length;i++){
      var c=_list[i];
      var wx = c.x*tile + tile/2, wy = c.y*tile + tile/2;
      var sx = Math.floor((wx - cam.x)*cam.zoom);
      var sy = Math.floor((wy - cam.y)*cam.zoom);

      ctx.save();
      ctx.fillStyle = c.done ? 'rgba(255,255,0,.75)' : 'rgba(255,200,0,.95)';
      var r = Math.max(3, Math.floor(4*cam.zoom));
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2, false); ctx.fill();

      if (!c.done){
        ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = Math.max(1, Math.floor(1*cam.zoom));
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+r*1.5, sy); ctx.stroke();
      }
      ctx.restore();
    }
  };

  console.log('[carriers.js] Modul geladen (v16.5.2)');
})();
