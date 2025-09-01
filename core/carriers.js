// core/carriers.js — v16.4.2
// Minimaler Carrier-Manager: Pfad holen (PathFinder), entlanglaufen, im Game-Canvas zeichnen.
// Public API:
//   Carriers.spawn({from:{x,y}, to:{x,y}, speedPX?})
//   Carriers.clear()
//   Carriers.setSpeed(pxPerSec)
//   Carriers.tick(dt)         // vom Game-Loop aufrufen
//   Carriers.draw(ctx, cam)   // vom Game-Loop NACH dem Map/Entities-Draw aufrufen
(function(){
  'use strict';

  var VERSION = 'v16.4.2';
  var log  = (window.CBLog && CBLog.ok  ? CBLog.ok  : console.log);
  var warn = (window.CBLog && CBLog.warn? CBLog.warn: console.warn);

  var carriers = []; // {px,py,path,idx,speed}
  var defaultSpeed = 60; // px/sec
  var tilePX = 64;

  function getTilePX(){
    try{ if (window.Game && typeof Game.getTileSize==='function') return Game.getTileSize()||64; }catch(_){}
    return 64;
  }
  function toWorld(tx,ty){ return { x: tx*tilePX + tilePX/2, y: ty*tilePX + tilePX/2 }; }

  function step(c, dt){
    if (!c.path || c.idx>=c.path.length) return true;
    var t = c.path[c.idx];
    var target = toWorld(t.x, t.y);
    var dx = target.x - c.px;
    var dy = target.y - c.py;
    var dist = Math.sqrt(dx*dx + dy*dy);
    var stepLen = c.speed * dt;

    if (dist <= stepLen){
      c.px = target.x; c.py = target.y; c.idx++;
      return (c.idx>=c.path.length);
    }else{
      c.px += (dx/dist)*stepLen; c.py += (dy/dist)*stepLen;
      return false;
    }
  }

  function tick(dt){
    for (var i=carriers.length-1;i>=0;i--){
      if (step(carriers[i], dt)) carriers.splice(i,1);
    }
  }

  function worldToScreen(wx, wy){
    try{
      if (window.Game && typeof Game.getCamera==='function'){
        var cam = Game.getCamera();
        return { x: Math.floor((wx - cam.x)*cam.zoom), y: Math.floor((wy - cam.y)*cam.zoom) };
      }
    }catch(_){}
    return {x:wx, y:wy};
  }

  function draw(ctx){
    if (!ctx || !carriers.length) return;
    ctx.save();
    for (var i=0;i<carriers.length;i++){
      var c = carriers[i];
      var s = worldToScreen(c.px, c.py);
      // gelber Punkt mit Rand
      ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI*2); ctx.closePath();
      ctx.fillStyle = '#ffe08a'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#6b4f1d'; ctx.stroke();
    }
    ctx.restore();
  }

  function spawn(job){
    if (!job || !job.from || !job.to) { warn('[carriers] spawn: invalid job', job); return null; }
    if (!window.PathFinder || !PathFinder.find){ warn('[carriers] PathFinder fehlt'); return null; }
    var path = PathFinder.find(job.from, job.to, { preferRoads:true });
    if (!path || path.length<2){ warn('[carriers] kein Pfad', job); return null; }

    var startW = toWorld(path[0].x, path[0].y);
    var c = {
      path: path,
      idx: 1,
      px: startW.x,
      py: startW.y,
      speed: Math.max(10, (job.speedPX|0) || defaultSpeed)
    };
    carriers.push(c);
    return c;
  }

  function clear(){ carriers.length=0; }
  function setSpeed(px){ defaultSpeed = Math.max(10, px|0); }

  function init(){
    tilePX = getTilePX();
    log('[carriers] bereit (v'+VERSION+')');
  }
  setTimeout(init, 0);

  window.Carriers = {
    spawn: spawn,
    clear: clear,
    setSpeed: setSpeed,
    tick: tick,
    draw: draw,
    version: VERSION
  };
})();
