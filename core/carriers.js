/* core/carriers.js — v16.5.1
   Träger-Manager:
     - spawn({from:{x,y}, to:{x,y}}) → A*-Pfad via PathFinder (Hybrid)
     - tick(dt) bewegt Carrier entlang der Tiles (diagonal möglich)
     - draw(ctx, cam) zeichnet Carrier-Punkt + optionales PF-Overlay
     - Carrier idlen am Ziel (kein Auto-Return)
*/
(function(){
  'use strict';

  var CR = (window.Carriers = window.Carriers || {});
  var _list = []; // {x,y, path:[{x,y}], seg:0, t:0..1, speedTilesPS, done}
  var SPEED = 2.0; // tiles / sec

  function getTile(){ return (window.Game && Game.getTileSize && Game.getTileSize()) || 64; }

  CR.spawn = function(opts){
    opts=opts||{};
    var sx=(opts.from&&opts.from.x)|0, sy=(opts.from&&opts.from.y)|0;
    var tx=(opts.to&&opts.to.x)|0,   ty=(opts.to&&opts.to.y)|0;

    // PF vorbereiten
    try{
      if (window.PathFinder){
        if (typeof PathFinder.setRoadMask==='function' && window.Game && Game.getRoadSet){
          PathFinder.setRoadMask(Game.getRoadSet());
        }
        if (typeof PathFinder.setObstacleProvider==='function'){
          if (window.Game && typeof Game.getObstacleAt==='function'){
            PathFinder.setObstacleProvider(Game.getObstacleAt);
          } else {
            PathFinder.setObstacleProvider(null);
          }
        }
      }
    }catch(_){}

    var path = (window.PathFinder && PathFinder.findPath) ? PathFinder.findPath({from:{x:sx,y:sy}, to:{x:tx,y:ty}, mode:'auto'}) : null;
    if (!path || path.length<2){ console.warn('[carriers] kein Pfad', sx,sy,'→',tx,ty); return null; }

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
      var segLen=Math.sqrt(dx*dx+dy*dy);
      var adv = (c.speedTilesPS * dt) / (segLen||1);
      c.t += adv;

      if (c.t>=1){
        c.seg++; c.t=0;
        if (c.seg>=p.length-1){ c.x=b.x; c.y=b.y; c.done=true; continue; }
        a=p[c.seg]; b=p[c.seg+1]; dx=b.x-a.x; dy=b.y-a.y; segLen=Math.sqrt(dx*dx+dy*dy);
      }
      c.x = a.x + dx*c.t;
      c.y = a.y + dy*c.t;
    }
  };

  CR.draw = function(ctx, cam){
    // PF-Overlay falls aktiv
    try{ if (window.PathFinder && PathFinder.drawOverlay) PathFinder.drawOverlay(ctx, cam); }catch(_){}

    if (!_list.length) return;
    var tile=getTile();
    for (var i=0;i<_list.length;i++){
      var c=_list[i], wx=c.x*tile+tile/2, wy=c.y*tile+tile/2;
      var sx=Math.floor((wx - cam.x)*cam.zoom), sy=Math.floor((wy - cam.y)*cam.zoom);

      ctx.save();
      ctx.fillStyle = c.done ? 'rgba(255,255,0,.7)' : 'rgba(255,200,0,.95)';
      var r=Math.max(3, Math.floor(4*cam.zoom));
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2, false); ctx.fill();

      if (!c.done){
        ctx.strokeStyle='rgba(0,0,0,.45)';
        ctx.lineWidth=Math.max(1, Math.floor(1*cam.zoom));
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+r*1.5, sy); ctx.stroke();
      }
      ctx.restore();
    }
  };

  console.log('[carriers.js] Modul geladen (v16.5.1)');
})();
