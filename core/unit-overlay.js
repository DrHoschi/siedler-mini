/* ============================================================================
 * Datei   : core/unit-overlay.js
 * Projekt : Neue Siedler
 * Version : v1.2.1 (2025-10-04)
 * Zweck   : Zeichnet Träger (Punkte) + Ressource-Icon über dem Game-Canvas
 * Hinweis : Erwartet ein <canvas id="overlay-units"> direkt über #game.
 * ============================================================================ */
(function(root,factory){ root.UnitOverlay = factory(); })(this, function(){
  'use strict';

  const CANVAS_ID   = 'overlay-units';
  const BASE_RADIUS = 8;
  const ICON_SIZE   = 18;

  const RES_ICON = {
    'res.wood' : 'assets/icons/resources/wood.png',
    'res.stone': 'assets/icons/resources/stone.png',
    'res.fish' : 'assets/icons/resources/fish.png'
  };

  // --- Helpers ----------------------------------------------------------------
  const cacheImg = Object.create(null);
  function loadIcon(path){
    if (!path) return null;
    if (cacheImg[path]) return cacheImg[path];
    const img = new Image(); img.src = path; cacheImg[path] = img; return img;
  }
  function resIcon(resId){
    const override = (window.UIResIcons||{})[resId];
    return loadIcon(override || RES_ICON[resId] || '');
  }

  function cvs(){ return document.getElementById(CANVAS_ID); }
  function ctx(){ const c=cvs(); return c ? c.getContext('2d') : null; }

  /** Canvas exakt auf #game „klemmen“ (DPR-korrigiert) */
  function fitToGame(){
    const cu = cvs(), g = document.getElementById('game');
    if (!cu || !g) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // CSS-Größe an Game-Canvas koppeln (wir zeichnen in CSS-Pixeln)
    cu.style.position = 'absolute';
    cu.style.left     = '0';
    cu.style.top      = '0';
    cu.style.zIndex   = '50';
    cu.style.pointerEvents = 'none';

    cu.style.width  = g.width  + 'px';
    cu.style.height = g.height + 'px';
    cu.width  = Math.round(g.width  * dpr);
    cu.height = Math.round(g.height * dpr);

    const x = ctx();
    if (x) x.setTransform(dpr,0,0,dpr,0,0);
  }

  // --- Render -----------------------------------------------------------------
  function draw(){
    const c = cvs(), x = ctx(); if (!c||!x) return;
    x.clearRect(0,0,c.width,c.height);

    // Kamera-/View-Offset des Renderers (Fallback 0/0)
    const view = (window.Game?.map?.view) || (window.Game?.cam) || { x:0, y:0 };

    const list = (window.Carriers?.list?.() || []);
    for (const u of list){
      const sx = (u.x||0) - (view.x||0);
      const sy = (u.y||0) - (view.y||0);

      // Punkt: dunkle Outline + helle Füllung
      x.beginPath(); x.arc(sx, sy, BASE_RADIUS + 1.5, 0, Math.PI*2); x.fillStyle='rgba(0,0,0,.65)'; x.fill();
      x.beginPath(); x.arc(sx, sy, BASE_RADIUS, 0, Math.PI*2);       x.fillStyle='rgba(255,255,255,.95)'; x.fill();

      // Icon (wenn Ressource getragen wird)
      const resId = u.carry?.id;
      if (resId){
        const img = resIcon(resId);
        if (img && img.complete){
          x.drawImage(img, sx + BASE_RADIUS + 2, sy - ICON_SIZE - 2, ICON_SIZE, ICON_SIZE);
        }
      }
    }
    requestAnimationFrame(draw);
  }

  // --- API --------------------------------------------------------------------
  const api = {
    start(){
      // Canvas anlegen, falls nicht vorhanden
      if (!document.getElementById(CANVAS_ID)){
        const cv = document.createElement('canvas');
        cv.id = CANVAS_ID;
        // direkt neben #game in denselben Container
        (document.getElementById('game')?.parentElement || document.body).appendChild(cv);
      }
      fitToGame();
      requestAnimationFrame(draw);
      window.addEventListener('resize', fitToGame);
    }
  };
  return api;
});
