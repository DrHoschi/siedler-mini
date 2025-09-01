/* core/carriers.js — v16.5.1
   Träger-Manager: spawn → A*-Pfad → laufen → Ziel → idle
   Lazy-Init des PathFinders (holt Mapgröße aus Game)
*/
(function(){
  'use strict';

  var CR = (window.Carriers = window.Carriers || {});
  var _list = []; // {x,y, path:[{x,y}], seg:0, t:0, speedTilesPS, done}
  var SPEED = 2.0; // tiles/sec

  function getTile(){ return (window.Game && Game.getTileSize && Game.getTileSize()) || 64; }

  // Liefert Mapgröße für PF.ensureInit()
  function getMapSize(){
    var gm = (window.Game && Game.currentMap) ? Game.currentMap : null;
    if (!gm && window.Game && typeof Game.getMapSize==='function') return Game.getMapSize();
    if (gm) return { w:(gm.width|0), h:(gm.height|0) };
    // Fallback (verhindert harte Crashes, aber Logik braucht echte Map)
    return { w:16, h:10 };
  }

  function ensurePFReady(){
    if (!window.PathFinder){ console.warn('[carriers] PathFinder fehlt'); return false; }
    if (PathFinder.isReady) return true;
    var ok = PathFinder.ensureInit(getMapSize);
    if (ok) console.log('[carriers] PathFinder lazy-init durchgeführt');
    return ok;
  }

  CR.spawn = function(opts){
    opts=opts||{};
    var sx=(opts.from&&opts.from.x)|0, sy=(opts.from&&opts.from.y)|0;
    var tx=(opts.to&&opts.to.x)|0,   ty=(opts.to&&opts.to.y)|0;

    if (!ensurePFReady()){ console.warn('[carriers] PF nicht bereit – spawn abgebrochen'); return null; }

    try{
      if (PathFinder.setRoadMask && window.Game && Game.getRoadSet){
        PathFinder.setRoadMask(Game.getRoadSet());
      }
      if (PathFinder.setObstacleProvider && window.Game && typeof Game.getObstacleAt==='function'){
        PathFinder.setObstacleProvider(Game.getObstacleAt);
      }
    }catch(_){}

    var path = (PathFinder.findPath ? PathFinder.findPath({from:{x:sx,y:sy}, to:{x:tx,y:ty}, mode:'auto'}) : null);
    if (!path || path.length<2){ console.warn('[carriers] kein Pfad', sx,sy,'→',tx,ty); return null; }

    try{ if (PathFinder.applyHeat) PathFinder.applyHeat(path); }catch(_){}

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
      var segLen = Math.sqrt(dx*dx+dy*dy) || 1;
      var adv = (c.speedTilesPS * dt) / segLen;
      c.t += adv;
      if (c.t>=1){ c.seg++; c.t=0; if (c.seg>=p.length-1){ c.x=b.x; c.y=b.y; c.done=true; continue; } a=p[c.seg]; b=p[c.seg+1]; dx=b.x-a.x; dy=b.y-a.y; segLen=Math.sqrt(dx*dx+dy*dy)||1; }
      c.x = a.x + dx*c.t;
      c.y = a.y + dy*c.t;
    }
  };

  CR.draw = function(ctx, cam){
    try{ if (window.PathFinder && PathFinder.drawOverlay) PathFinder.drawOverlay(ctx, cam); }catch(_){}
    if (!_list.length) return;
    var tile=getTile();
    for (var i=0;i<_list.length;i++){
      var c=_list[i];
      var wx=c.x*tile+tile/2, wy=c.y*tile+tile/2;
      var sx=Math.floor((wx-cam.x)*cam.zoom), sy=Math.floor((wy-cam.y)*cam.zoom);
      ctx.save();
      ctx.fillStyle = c.done ? 'rgba(255,255,0,.7)' : 'rgba(255,200,0,.95)';
      var r=Math.max(3, Math.floor(4*cam.zoom));
      ctx.beginPath(); ctx.arc(sx,sy,r,0,Math.PI*2,false); ctx.fill();
      ctx.restore();
    }
  };

  console.log('[carriers.js] Modul geladen (v16.5.1)');
})();
