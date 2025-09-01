/* 
========================================
 Datei: core/carriers.js
 Projekt: Siedler-Mini
 Version: v16.5.1
 Zweck: Carrier-Logik (Träger bewegen
        sich über PathFinder)
========================================
*/

(function(){
  'use strict';
  var VERSION = 'v16.5.1';
  var Car = (window.Carriers = window.Carriers || {});

  var carriers=[];
  var ctx=null, cam=null;

  Car.spawn = function(job){
    if(!window.PathFinder){ warn("PathFinder fehlt"); return; }
    var path=PathFinder.findPath(job.from,job.to,'auto');
    if(!path||path.length<2){ warn("[carriers] kein Pfad",job.from.x,job.from.y,"→",job.to.x,job.to.y); return; }
    carriers.push({ path:path, pos:0, t:0 });
    log("[carriers] spawn OK",job.from,"→",job.to);
  };

  Car.tick = function(dt){
    for(var i=0;i<carriers.length;i++){
      var c=carriers[i];
      if(c.pos>=c.path.length-1) continue;
      c.t+=dt*2;
      if(c.t>=1){
        c.t=0; c.pos++;
      }
    }
  };

  Car.draw = function(gctx,gcam){
    ctx=gctx; cam=gcam;
    carriers.forEach(drawCarrier);
  };

  function drawCarrier(c){
    var p=c.path[c.pos];
    if(!p) return;
    var x=(p.x*64-cam.x)*cam.zoom;
    var y=(p.y*64-cam.y)*cam.zoom;
    var s=8*cam.zoom;
    ctx.fillStyle="yellow";
    ctx.beginPath();
    ctx.arc(x+s,y+s,s,0,Math.PI*2);
    ctx.fill();
  }

  function log(){ (window.CBLog?.ok||console.log).apply(console,arguments); }
  function warn(){ (window.CBLog?.warn||console.warn).apply(console,arguments); }

  log("[carriers.js] Modul geladen",VERSION);
})();
