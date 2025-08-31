/* 
============================================
Datei: core/camera.js
Projekt: Siedler-Mini
Version: v16.3.1
Zweck: Kameralogik (Pan/Zoom)
============================================
*/
(function(){
  'use strict';

  var Cam = (window.GameCamera = window.GameCamera || {});
  var cam = { x:0, y:0, zoom:1, minZ:0.5, maxZ:3 };

  // ===================== Getter =====================
  Cam.get = function(){ return Object.assign({}, cam); };

  // ===================== Setter =====================
  Cam.set = function(nx,ny,nz){
    if (typeof nx==='number') cam.x = nx;
    if (typeof ny==='number') cam.y = ny;
    if (typeof nz==='number') cam.zoom = Math.max(cam.minZ, Math.min(cam.maxZ, nz));
  };

  Cam.pan = function(dx,dy){ cam.x+=dx; cam.y+=dy; };
  Cam.zoomAt = function(f, cx, cy, viewW, viewH){
    var preX = cam.x + cx / cam.zoom;
    var preY = cam.y + cy / cam.zoom;
    cam.zoom = Math.max(cam.minZ, Math.min(cam.maxZ, cam.zoom*f));
    var postX = cam.x + cx / cam.zoom;
    var postY = cam.y + cy / cam.zoom;
    cam.x += (preX - postX);
    cam.y += (preY - postY);
  };

  Cam.clamp = function(mapW,mapH,tile,viewW,viewH){
    var maxX = Math.max(0, mapW*tile - viewW/cam.zoom);
    var maxY = Math.max(0, mapH*tile - viewH/cam.zoom);
    cam.x = Math.max(0, Math.min(cam.x, maxX));
    cam.y = Math.max(0, Math.min(cam.y, maxY));
  };

  (window.CBLog?.ok || console.log)('[camera.js] Modul geladen (v16.3.1)');
})();
