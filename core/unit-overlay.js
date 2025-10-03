/* ============================================================================
 * Datei   : core/unit-overlay.js
 * Projekt : Neue Siedler
 * Version : v1.0.0 (2025-10-04)
 * Zweck   : Zeichnet Träger (Punkte) auf separatem Canvas + Ressource-Icon
 * Hinweis : Erwartet ein <canvas id="overlay-units"> über dem Game-Canvas
 * ============================================================================ */
(function(root,factory){ root.UnitOverlay = factory(); })(this, function(){
  'use strict';

  // --------------------------------- Konstanten ------------------------------
  const CANVAS_ID = 'overlay-units';
  const DOT_RADIUS = 4;   // Punktgröße
  const ICON_SIZE  = 16;  // Kantenlänge des kleinen Ressource-Icons

  // Versuch, sinnvolle Default-Pfade für Resource-Icons zu nutzen
  const RES_ICON = {
    'res.wood' : 'assets/icons/resources/wood.png',
    'res.stone': 'assets/icons/resources/stone.png',
    'res.fish' : 'assets/icons/resources/fish.png'
  };

  // --------------------------------- Helfer ----------------------------------
  const cacheImg = Object.create(null);
  function loadIcon(path){
    if (!path) return null;
    if (cacheImg[path]) return cacheImg[path];
    const img = new Image(); img.src = path; cacheImg[path] = img; return img;
  }
  function resIcon(resId){
    // erlaubt, global Pfade zu überschreiben: window.UIResIcons['res.wood']=...
    const override = (window.UIResIcons||{})[resId];
    return loadIcon(override || RES_ICON[resId] || '');
  }

  function cvs(){ return document.getElementById(CANVAS_ID); }
  function ctx(){ const c=cvs(); return c? c.getContext('2d') : null; }
  function fitToGame(){
    const cu = cvs(), g = document.getElementById('game');
    if (!cu || !g) return;
    cu.width  = g.width;
    cu.height = g.height;
    cu.style.position='absolute';
    cu.style.left = g.style.left || '0px';
    cu.style.top  = g.style.top  || '0px';
    cu.style.zIndex = 50;        // über Pfad-Overlay
    cu.style.pointerEvents = 'none';
  }

  // --------------------------------- Render ----------------------------------
  function draw(){
    const c = cvs(), x = ctx(); if (!c||!x) return;
    x.clearRect(0,0,c.width,c.height);

    const list = (window.Carriers?.list?.() || []);
    for (const u of list){
      // Punkt
      x.beginPath();
      x.arc(u.x||0, u.y||0, DOT_RADIUS, 0, Math.PI*2);
      x.fill();

      // Icon (wenn trägt)
      const resId = u.carry?.id;
      if (resId){
        const img = resIcon(resId);
        if (img && img.complete){
          x.drawImage(img, (u.x||0)+6, (u.y||0)-ICON_SIZE-2, ICON_SIZE, ICON_SIZE);
        }
      }
    }
    requestAnimationFrame(draw);
  }

  // --------------------------------- API/Hauptlogik --------------------------
  const api = {
    start(){
      fitToGame();
      requestAnimationFrame(draw);
      window.addEventListener('resize', fitToGame);
    }
  };

  return api;
});
