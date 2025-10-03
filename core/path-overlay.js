/* ============================================================================
 * Datei   : core/path-overlay.js
 * Projekt : Neue Siedler
 * Version : v1.1.0 (2025-10-04)
 * Zweck   : Einfaches Pfad-Overlay (Trampelpfade, Debug)
 * API     : PathOverlay.toggle(on?), PathOverlay.clear()
 * ============================================================================
 */
(function(root,factory){ root.PathOverlay = factory(); })(this, function(){
  'use strict';

  // ---------------------------- Zustand --------------------------------------
  let enabled = true;
  const traces = []; // {from:{x,y}, to:{x,y}}

  function cvs(){ return document.getElementById('overlay-paths'); }
  function ctx(){ const c=cvs(); return c? c.getContext('2d') : null; }

  function resizeToGame(){
    const c=cvs(); const g=document.getElementById('game');
    if (!c || !g) return;
    c.width  = g.width;
    c.height = g.height;
    c.style.position='absolute';
    c.style.left = g.style.left || '0px';
    c.style.top  = g.style.top  || '0px';
    c.style.zIndex = 40; // über Game, unter HUD
    c.style.pointerEvents = 'none';
  }

  function redraw(){
    const c = cvs(), x = ctx(); if (!c||!x) return;
    x.clearRect(0,0,c.width,c.height);
    if (!enabled) return;

    x.globalAlpha = 0.9;
    x.lineWidth = 2;
    for (const t of traces){
      x.beginPath();
      x.moveTo(t.from.x, t.from.y);
      x.lineTo(t.to.x,   t.to.y);
      x.stroke();
    }
  }

  function toggle(on){ enabled = (on===undefined)? !enabled : !!on; redraw(); }
  function clear(){ traces.length = 0; redraw(); }

  // ---------------------------- Events ---------------------------------------
  window.addEventListener('resize', resizeToGame);
  window.addEventListener('cb:path:overlay:on',  ()=>toggle(true));
  window.addEventListener('cb:path:overlay:off', ()=>toggle(false));
  window.addEventListener('cb:path:trace', (ev)=>{ traces.push(ev.detail); redraw(); });

  // einmal initial synchronisieren
  setTimeout(resizeToGame, 0);

  return { toggle, clear };
});
