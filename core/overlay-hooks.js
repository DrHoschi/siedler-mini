/* ============================================================================
 * Datei    : assets/core/overlay-hooks.js
 * Projekt  : Neue Siedler
 * Version  : v25.10.25-final
 * Zweck    : Zentrale Overlay-Registry (draw(ctx, cam)) – ohne eigene Loop
 * API      : OverlayHooks.register(name, fn), .enable(name,bool), .setGlobal(bool), .draw(ctx,cam)
 * Integration:
 *   – Render.setDraw((ctx)=> OverlayHooks.draw(ctx, GameCamera?.getState?.()))
 *   – Event: cb:toggle-path-overlay {enabled} schaltet "paths"-Layer & DEBUG_PATH_OVERLAY
 * ============================================================================ */
(function(){
  'use strict';
  const MOD = '[overlay-hooks]';
  const ok   = (window.CBLog?.ok   || console.log).bind(console, MOD);
  const warn = (window.CBLog?.warn || console.warn).bind(console, MOD);

  let _globalEnabled = true;
  const _layers = Object.create(null);
  const DEFAULTS = { paths: true };

  function ensureLayer(name){
    return (_layers[name] ||= { enabled: (DEFAULTS[name] ?? true), fns: [] });
  }
  function register(name, fn){
    if (typeof fn !== 'function'){ warn('register: erwartet Funktion'); return; }
    ensureLayer(name).fns.push(fn);
  }
  function enable(name, onOff){ ensureLayer(name).enabled = !!onOff; }
  function setGlobal(onOff){ _globalEnabled = !!onOff; }

  function draw(ctx, cam){
    if (!_globalEnabled) return;
    for (const k in _layers){
      if (!Object.prototype.hasOwnProperty.call(_layers,k)) continue;
      const L = _layers[k]; if (!L.enabled) continue;
      for (const fn of L.fns){ try{ fn(ctx, cam||{}); }catch(e){ warn('draw err:', e?.message||e); } }
    }
  }

  // Public
  window.OverlayHooks = window.OverlayHooks || {};
  window.OverlayHooks.register = register;
  window.OverlayHooks.enable   = enable;
  window.OverlayHooks.setGlobal= setGlobal;
  window.OverlayHooks.draw     = draw;

  // --- Integration in Render-Shim -------------------------------------------
  (function tryHookIntoRender(){
    try{
      window.Render?.setDraw?.(function(ctx){
        const cam = window.GameCamera?.getState?.() || window.GameCore?.state?.cam || {x:0,y:0,zoom:1};
        draw(ctx, cam);
      });
      ok('an Render.setDraw gekoppelt.');
    }catch(e){ warn('Render.setDraw nicht verfügbar (noch nicht geladen?)'); }
  })();

  // --- Optional: PathFinder (legacy) ----------------------------------------
  (function autoRegisterPF(){
    function add(){
      if (window.PathFinder?.drawOverlay){
        register('paths', function(ctx, cam){
          if (!window.DEBUG_PATH_OVERLAY) return;
          window.PathFinder.drawOverlay(ctx, cam);
        });
        ok('PathFinder-Overlay registriert.');
        return true;
      }
      return false;
    }
    if (!add()){
      let tries=0, t=setInterval(()=>{ if (add() || ++tries>30) clearInterval(t); }, 250);
    }
  })();

  // --- Optional: AdFinder-Heatmap (neu) -------------------------------------
  (function autoRegisterAdFinderHeat(){
    if (!window.AdFinder?.getHeat) return;
    register('paths', function(ctx, cam){
      if (!window.DEBUG_PATH_OVERLAY) return;
      const heat = window.AdFinder.getHeat?.(); if (!heat?.data) return;
      const T = (window.Entities?.state?.tile || window.Game?.tileSize || 64) * (cam?.zoom || 1);
      ctx.save(); ctx.globalAlpha = 0.25;
      for (let y=0,i=0; y<heat.height; y++){
        for (let x=0; x<heat.width; x++, i++){
          const v = Number(heat.data[i]||0); if (!v) continue;
          ctx.fillStyle = `rgba(${Math.min(255,Math.floor(255*v))}, ${Math.min(255,Math.floor(200*(1-v)))}, 0, 0.6)`;
          const sx = (x - (cam?.x||0)) * (T/(cam?.zoom||1));
          const sy = (y - (cam?.y||0)) * (T/(cam?.zoom||1));
          ctx.fillRect(sx, sy, T, T);
        }
      }
      ctx.restore();
    });
    ok('AdFinder-Heatmap registriert.');
  })();

  // --- Events ---------------------------------------------------------------
  // Neuer Standard: cb:toggle-path-overlay {enabled}
  window.addEventListener('cb:toggle-path-overlay', (e)=>{
    const on = !!(e?.detail?.enabled);
    window.DEBUG_PATH_OVERLAY = on;
    enable('paths', on);
    ok('paths=', on?'AN':'AUS');
    try{ window.dispatchEvent(new Event('cb:request-repaint')); }catch{}
  });

  // Legacy-Events (no-op / Log)
  window.addEventListener('cb:paths:toggle', ()=> ok('event: paths.toggle'));
  window.addEventListener('cb:paths:reset',  ()=> ok('event: paths.reset'));

  ok('bereit (v25.10.25-final)');
})();
