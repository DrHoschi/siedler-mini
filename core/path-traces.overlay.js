/* ============================================================================
 * Datei   : core/path-traces.overlay.js
 * Projekt : Neue Siedler
 * Version : v25.10.25-final
 * Zweck   : Trampelpfad-Overlay (Debug) – integriert in OverlayHooks/Render
 * API     : PathTraces.add({from:{x,y}, to:{x,y}}), .clear(), .toggle(on?)
 * Events  : 
 *   IN:  cb:path:trace {from:{x,y}, to:{x,y}}
 *        cb:path:overlay:on / cb:path:overlay:off
 * Hinweis: Kein eigenes Canvas, kein globaler Name-Konflikt mit PathOverlay.
 * ============================================================================ */
(() => {
  'use strict';
  const TAG  = '[traces]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);

  const traces = [];  // Weltpixel {from:{x,y}, to:{x,y}}
  let enabled = true;

  function draw(ctx, cam={x:0,y:0,zoom:1}){
    if (!enabled || !traces.length) return;
    const z = cam.zoom || 1, ox = cam.x||0, oy = cam.y||0;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = Math.max(1, 2*z);
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.9)';

    for (const t of traces){
      const ax = (t.from.x - ox) * z;
      const ay = (t.from.y - oy) * z;
      const bx = (t.to.x   - ox) * z;
      const by = (t.to.y   - oy) * z;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.restore();
  }

  // OverlayHooks-Layer registrieren
  (function register(){
    if (!window.OverlayHooks?.register){
      // Falls OverlayHooks noch nicht geladen, später erneut versuchen
      let tries=0, t=setInterval(()=>{
        if (window.OverlayHooks?.register){ clearInterval(t); registerNow(); }
        else if (++tries>20) clearInterval(t);
      }, 200);
      return;
    }
    registerNow();
  })();

  function registerNow(){
    try {
      window.OverlayHooks.register('traces', (ctx)=>{
        const cam = window.GameCamera?.getState?.() || {x:0,y:0,zoom:1};
        draw(ctx, cam);
      });
      LOG('Overlay-Layer "traces" registriert');
    } catch {}
  }

  // Public (kein Konflikt mit PathOverlay-Namen)
  window.PathTraces = {
    add(t){ if (t?.from && t?.to) traces.push({ from:{...t.from}, to:{...t.to} }); },
    clear(){ traces.length = 0; },
    toggle(on){ enabled = (on===undefined) ? !enabled : !!on; }
  };

  // Event-Kompatibilität (alte Sender dürfen bleiben)
  window.addEventListener('cb:path:trace', (ev)=>{ const d=ev?.detail; if(d?.from&&d?.to) window.PathTraces.add(d); });
  window.addEventListener('cb:path:overlay:on',  ()=> window.PathTraces.toggle(true));
  window.addEventListener('cb:path:overlay:off', ()=> window.PathTraces.toggle(false));

  LOG('bereit v25.10.25-final');
})();
