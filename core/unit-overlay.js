/* ============================================================================
 * Datei   : core/unit-overlay.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v1.2.0 (2025-10-05)
 * Zweck   : Overlay-Canvas für Einheiten (Trägerpunkte + Ressource-Icon)
 * API     : UnitOverlay.start()
 * Hinweis : Erwartet ein <canvas id="overlay-units"> im DOM
 * ============================================================================ */
(function(root,factory){ root.UnitOverlay = factory(); })(this, function(){
  'use strict';
  const ID = 'overlay-units';
  const R  = 8;     // Grundradius
  const IS = 18;    // Icon-Kantenlänge

  const RES_ICON = {
    'res.wood' : 'assets/icons/resources/wood.png',
    'res.stone': 'assets/icons/resources/stone.png',
    'res.fish' : 'assets/icons/resources/fish.png'
  };

  const cache = Object.create(null);
  function icon(res){ if(!res) return null; const p=(window.UIResIcons||{})[res]||RES_ICON[res]; if(!p) return null; if(cache[p]) return cache[p]; const img=new Image(); img.src=p; return cache[p]=img; }

  function gameCanvas(){ return document.getElementById('game'); }
  function cvs(){ return document.getElementById(ID); }
  function ctx(){ const c=cvs(); return c?c.getContext('2d'):null; }

  function fit(){
    const g = gameCanvas(), c=cvs(); if(!g||!c) return;
    const dpr = Math.max(1, window.devicePixelRatio||1);

    c.style.position='absolute';
    c.style.left    = g.offsetLeft+'px';
    c.style.top     = g.offsetTop+'px';
    c.style.zIndex  = 50;
    c.style.pointerEvents='none';

    c.style.width  = g.clientWidth +'px';
    c.style.height = g.clientHeight+'px';
    c.width  = Math.round((g.clientWidth || g.width)  * dpr);
    c.height = Math.round((g.clientHeight|| g.height) * dpr);

    const x = c.getContext('2d');
    x.setTransform(dpr,0,0,dpr,0,0);
  }

  function drawOne(x, u, view){
    const sx = (u.x||0) - (view?.x||0);
    const sy = (u.y||0) - (view?.y||0);

    x.beginPath(); x.arc(sx, sy, R+1.5, 0, Math.PI*2); x.fillStyle='rgba(0,0,0,.65)'; x.fill();
    x.beginPath(); x.arc(sx, sy, R,      0, Math.PI*2); x.fillStyle='rgba(255,255,255,.95)'; x.fill();

    const res = u.carry?.id;
    if (res) {
      const img = icon(res);
      if (img && img.complete) x.drawImage(img, sx + R + 2, sy - IS - 2, IS, IS);
    }
  }

  function loop(){
    const c = cvs(), x = ctx(); if (!c||!x) return requestAnimationFrame(loop);
    x.clearRect(0,0,c.width,c.height);

    // Kamera/View vom Game holen (Map oder Fallback)
    const view = (window.Game?.map && { x:window.Game.map.camX||0, y:window.Game.map.camY||0 }) || {x:0,y:0};
    const arr  = window.Carriers?.list?.() || [];
    for (const u of arr) drawOne(x,u,view);

    requestAnimationFrame(loop);
  }

  function start(){
    fit();
    window.addEventListener('resize', fit);
    // wenn Canvasgröße per Code geändert wird (z.B. Orientierung) → leicht verzögert neu fitten
    window.addEventListener('cb:map:loaded', ()=>setTimeout(fit,0));
    requestAnimationFrame(loop);
  }

  return { start };
});
