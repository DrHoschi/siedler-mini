/* ============================================================================
 * assets/core/overlay-hooks.js — v17.7.7
 * Projekt: Neue Siedler
 * Zweck:
 *   - Zentrale Overlay-Zeichnung im Render-Loop
 *   - Registry für Overlay-Callbacks (z.B. PathFinder.drawOverlay)
 *   - Ein/Aus pro Layer + global
 *   - Kompatibel: funktioniert auch, wenn einzelne Systeme fehlen
 *
 * Öffentliche API (global):
 *   window.OverlayHooks.register(layerName, drawFn)   // drawFn(ctx, cam)
 *   window.OverlayHooks.enable(layerName, onOff)      // boolean
 *   window.OverlayHooks.setGlobal(onOff)              // boolean
 *   window.OverlayHooks.draw(ctx, cam)                // vom Renderer pro Frame aufrufen
 *
 * CODE-STYLE: sanfte Logs, defensive Checks, keine Abhängigkeiten
 * ========================================================================== */

(function(){
  'use strict';

  var MOD = '[overlay-hooks]';
  var ok   = (window.CBLog?.ok   || console.log).bind(console, MOD);
  var warn = (window.CBLog?.warn || console.warn).bind(console, MOD);

  var _globalEnabled = true;
  var _layers = Object.create(null);
  // Default-Konfig
  var DEFAULTS = {
    'paths': true,   // Pfad-Overlay (PathFinder / Heatmap)
  };

  function ensureLayer(name){
    if (!_layers[name]){
      _layers[name] = { enabled: (DEFAULTS[name]!==undefined ? !!DEFAULTS[name] : true), fns: [] };
    }
    return _layers[name];
  }

  function register(name, fn){
    if (typeof fn !== 'function'){ warn('register: erwartet Funktion'); return; }
    var L = ensureLayer(name);
    L.fns.push(fn);
  }

  function enable(name, onOff){
    var L = ensureLayer(name);
    L.enabled = !!onOff;
  }

  function setGlobal(onOff){ _globalEnabled = !!onOff; }

  function draw(ctx, cam){
    try{
      if (!_globalEnabled) return;
      for (var k in _layers){
        if (!Object.prototype.hasOwnProperty.call(_layers,k)) continue;
        var L = _layers[k];
        if (!L.enabled) continue;
        var list = L.fns;
        for (var i=0;i<list.length;i++){
          try { list[i] && list[i](ctx, cam); } catch(e){ warn('draw err:', e && e.message); }
        }
      }
    }catch(e){
      warn('draw root err:', e && e.message);
    }
  }

  // Public API
  window.OverlayHooks = window.OverlayHooks || {};
  window.OverlayHooks.register = register;
  window.OverlayHooks.enable   = enable;
  window.OverlayHooks.setGlobal= setGlobal;
  window.OverlayHooks.draw     = draw;

  // Convenience: PathFinder-Overlay automatisch registrieren, wenn vorhanden
  function tryAutoRegisterPF(){
    try{
      if (window.PathFinder && typeof PathFinder.drawOverlay === 'function'){
        register('paths', function(ctx, cam){
          if (!window.DEBUG_PATH_OVERLAY) return;
          PathFinder.drawOverlay(ctx, cam);
        });
        ok('PathFinder-Overlay registriert.');
        return true;
      }
    }catch(_){}
    return false;
  }
  if (!tryAutoRegisterPF()){
    // Später erneut probieren (falls PF später geladen wird)
    var tries=0, t=setInterval(function(){
      tries++; if (tryAutoRegisterPF() || tries>30) clearInterval(t);
    }, 250);
  }

  // Event-Bridges (optional)
  window.addEventListener('cb:paths:toggle', function(){
    // Nur Flag toggeln (eigentliche Zeichnung checkt window.DEBUG_PATH_OVERLAY)
    ok('event: paths.toggle');
  });
  window.addEventListener('cb:paths:reset', function(){
    // Hier nichts tun – Heatmap-Reset macht PF-intern (über eigenes Event oder API)
    ok('event: paths.reset');
  });

  ok('bereit (v17.7.7)');
})();
