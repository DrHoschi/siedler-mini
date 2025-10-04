/* ============================================================================
 * Datei   : core/unit-overlay.js
 * Zweck   : Zeichnet Träger (Punkte) + Ressource-Icon auf Overlay-Canvas
 * ============================================================================
 */
(function(root,factory){ root.UnitOverlay = factory(); })(this, function(){
  'use strict';

  const CANVAS_ID   = 'overlay-units';
  const BASE_RADIUS = 8;    // Basis-Radius in CSS px
  const ICON_SIZE   = 18;   // Basis-Kantenlänge in CSS px

  const RES_ICON = {
    'res.wood' : 'assets/icons/resources/wood.png',
    'res.stone': 'assets/icons/resources/stone.png',
    'res.fish' : 'assets/icons/resources/fish.png'
  };
  const imgCache = Object.create(null);
  function getIcon(path){ if (!path) return null;
    if (imgCache[path]) return imgCache[path];
    const i = new Image(); i.src = path; imgCache[path] = i; return i;
  }
  function resIcon(resId){
    const ovr = (window.UIResIcons||{})[resId];
    return getIcon(ovr || RES_ICON[resId] || '');
  }

  let $c=null, ctx=null, raf=0;

  function ensureCanvas(){
    $c = document.getElementById(CANVAS_ID);
    if (!$c){
      $c = document.createElement('canvas');
      $c.id = CANVAS_ID;
      // wichtig für iOS-Touch
      $c.style.touchAction = 'none';
      $c.style.pointerEvents = 'none';
      const app = document.getElementById('app') || document.body;
      app.appendChild($c);
    }
    if (!ctx) ctx = $c.getContext('2d');
  }

  function fitToGame(){
    ensureCanvas();
    const g = document.getElementById('game');
    if (!g || !ctx) return;

    // Position exakt auf den Game-Canvas legen
    const r = g.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio||1);

    // CSS-Positionierung (über absolut, an #app relativ)
    const appRect = (document.getElementById('app')||document.body).getBoundingClientRect();
    const left = r.left - appRect.left;
    const top  = r.top  - appRect.top;

    $c.style.position = 'absolute';
    $c.style.left = left + 'px';
    $c.style.top  = top  + 'px';
    $c.style.width  = g.width + 'px';
    $c.style.height = g.height + 'px';
    $c.style.zIndex = 50;
    $c.width  = Math.round(g.width  * dpr);
    $c.height = Math.round(g.height * dpr);

    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function draw(){
    if (!ctx || !$c) return;

    ctx.clearRect(0,0,$c.width,$c.height);

    // Kamera/Zoom vom Game lesen
    const map  = (window.Game?.map) || {};
    const camX = Number(map.camX)||0, camY = Number(map.camY)||0;
    const zoom = Math.max(0.5, Math.min(3, Number(map.zoom)||1));

    const R  = BASE_RADIUS * zoom;
    const IS = ICON_SIZE   * zoom;

    const units = (window.Carriers?.list?.()||[]);
    for (const u of units){
      const sx = (u.x||0) - camX;
      const sy = (u.y||0) - camY;

      // Outline
      ctx.beginPath(); ctx.arc(sx, sy, R+1.5, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fill();

      // Punkt
      ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill();

      // Ressource-Icon
      const resId = u.carry?.id;
      if (resId){
        const img = resIcon(resId);
        if (img && img.complete){
          ctx.drawImage(img, sx + R + 2, sy - IS - 2, IS, IS);
        }
      }
    }

    raf = requestAnimationFrame(draw);
  }

  // API
  function start(){
    fitToGame();
    if (!raf) raf = requestAnimationFrame(draw);

    // Reaktionen auf Resize/Scroll/Zoom
    window.addEventListener('resize', fitToGame);
    window.addEventListener('scroll', fitToGame, { passive:true });
    window.addEventListener('cb:map:zoom', fitToGame);
    window.addEventListener('cb:map:scroll', fitToGame);
  }

  return { start, fit:fitToGame };
});
