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

/* ============================================================================
 * Datei   : core/overlay-hooks.js
 * Projekt : Neue Siedler
 * Version : v25.12.01-overlay-fix
 * Zweck   : Zentrales Overlay-System (Layers) + Bridge zu Game.render()
 * ============================================================================
 */
(() => {
  'use strict';
  const TAG  = '[overlay-hooks]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  let _globalEnabled = true;
  const _layers = Object.create(null);
  const DEFAULTS = { paths: true };

  function ensureLayer(name){
    return (_layers[name] ||= { enabled: (DEFAULTS[name] ?? true), fns: [] });
  }
  function register(name, fn){
    if (typeof fn !== 'function'){
      WARN('register: erwartet Funktion, bekommen:', typeof fn);
      return;
    }
    ensureLayer(name).fns.push(fn);
  }
  function enable(name, onOff){ ensureLayer(name).enabled = !!onOff; }
  function setGlobal(onOff){ _globalEnabled = !!onOff; }

  function draw(ctx, cam){
    if (!_globalEnabled || !ctx) return;
    const camera = cam || window.GameCamera?.getState?.() || {x:0,y:0,zoom:1};

    for (const key in _layers){
      if (!Object.prototype.hasOwnProperty.call(_layers, key)) continue;
      const L = _layers[key];
      if (!L.enabled) continue;

      for (const fn of L.fns){
        try {
          fn(ctx, camera);
        } catch(e){
          WARN('draw err in Layer', key, ':', e?.message || e);
        }
      }
    }
  }

  // 🔴 WICHTIGER NEUZUGANG: render() für Game.render()
  function render(){
    try{
      const canvas = document.getElementById('game');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cam = window.GameCamera?.getState?.()
               || window.GameCore?.state?.cam
               || {x:0,y:0,zoom:1};

      draw(ctx, cam);
    }catch(e){
      WARN('render() Fehler:', e?.message || e);
    }
  }

  // Public API
  window.OverlayHooks = window.OverlayHooks || {};
  window.OverlayHooks.register  = register;
  window.OverlayHooks.enable    = enable;
  window.OverlayHooks.setGlobal = setGlobal;
  window.OverlayHooks.draw      = draw;
  window.OverlayHooks.render    = render;   // 👈 NEU

  // --- Integration in alten Render-Shim (MapRuntime) -----------------------
  (function tryHookIntoRender(){
    try{
      window.Render?.setDraw?.(function(ctx){
        const cam = window.GameCamera?.getState?.()
                 || window.GameCore?.state?.cam
                 || {x:0,y:0,zoom:1};
        draw(ctx, cam);
      });
      LOG('an Render.setDraw gekoppelt (falls MapRuntime aktiv).');
    }catch(e){
      WARN('Render.setDraw nicht verfügbar (ist ok bei neuer Engine).');
    }
  })();

  // Optional: PathFinder- & AdFinder-Heatmap (falls vorhanden)
  (function autoRegisterPF(){
    function add(){
      if (window.PathFinder?.drawOverlay){
        register('paths', (ctx, cam)=>{
          if (!window.DEBUG_PATH_OVERLAY) return;
          window.PathFinder.drawOverlay(ctx, cam);
        });
        LOG('PathFinder-Overlay registriert.');
        return true;
      }
      return false;
    }
    if (!add()){
      let tries=0, t=setInterval(()=>{ if (add() || ++tries>30) clearInterval(t); }, 250);
    }
  })();

  (function autoRegisterAdFinderHeat(){
    if (!window.AdFinder?.getHeat) return;
    register('paths', (ctx, cam)=>{
      if (!window.DEBUG_PATH_OVERLAY) return;
      const heat = window.AdFinder.getHeat?.() || [];
      // … dein Heatmap-Zeichencode hier (optional) …
    });
    LOG('AdFinder-Heatmap registriert.');
  })();

  LOG('bereit v25.12.01-overlay-fix');
})();
