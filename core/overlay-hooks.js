/* ============================================================================
 * Datei   : core/overlay-hooks.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.03-overlayhooks-v2
 *
 * Zweck   :
 *   - Zentrales Overlay-Hooks-System
 *   - Ermöglicht Layer-Registrierung für zusätzliche Overlays
 *     (WorkArea-Kreise, Trampelpfade, Debug-Layer, ...)
 *
 *   API (global über window.OverlayHooks):
 *     - OverlayHooks.register(name, fn)
 *         fn(ctx, cam)   // cam: { x, y, zoom }
 *
 *     - OverlayHooks.enable(name, flag=true)
 *     - OverlayHooks.disable(name)
 *     - OverlayHooks.setGlobal(flag)
 *     - OverlayHooks.draw(ctx, camOverride?)
 *
 *   Debug:
 *     - OverlayHooks._layers        (internes Layer-Objekt)
 *     - OverlayHooks._getState()    → { global, layers }
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[overlay-hooks]';
  const LOG  = (window.CBLog?.info  || console.info ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------

  /** Globaler Schalter: alle Overlays an/aus */
  let _globalEnabled = true;

  /**
   * Layer-Registry:
   *  {
   *    name: { enabled: true/false, fn: (ctx,cam)=>void }
   *  }
   */
  const _layers = Object.create(null);

  function ensureLayer(name){
    if (!_layers[name]){
      _layers[name] = { enabled: true, fn: null };
    }
    return _layers[name];
  }

  // -------------------------------------------------------------------------
  // API-Funktionen
  // -------------------------------------------------------------------------

  /**
   * OverlayHooks.register(name, fn)
   *  - Registriert einen Zeichen-Callback für einen Layer
   */
  function register(name, fn){
    if (typeof fn !== 'function'){
      WARN('register: erwartet Funktion für Layer', name);
      return;
    }
    const layer = ensureLayer(name);
    layer.fn = fn;
    LOG('Layer registriert:', name);
  }

  /**
   * OverlayHooks.enable(name, flag=true)
   *  - Aktiviert/Deaktiviert einen einzelnen Layer
   */
  function enable(name, flag){
    const layer = ensureLayer(name);
    layer.enabled = (flag !== false);
    LOG('Layer', name, 'enabled =', !!layer.enabled);
  }

  /**
   * OverlayHooks.disable(name)
   *  - Kurzform für enable(name, false)
   */
  function disable(name){
    enable(name, false);
  }

  /**
   * OverlayHooks.setGlobal(flag)
   *  - Aktiviert/Deaktiviert alle Overlays global
   */
  function setGlobal(flag){
    _globalEnabled = !!flag;
    LOG('Global enabled =', _globalEnabled);
  }

  /**
   * OverlayHooks.draw(ctx, camOverride?)
   *  - Wird vom GameRenderer aufgerufen.
   *  - Verteilt den Zeichnungsvorgang an alle aktiven Layer.
   */
  function draw(ctx, camOverride){
    if (!ctx) return;
    if (!_globalEnabled) return;

    const cam =
      camOverride
      || (window.GameCamera && typeof window.GameCamera.getState === 'function'
          ? window.GameCamera.getState()
          : { x: 0, y: 0, zoom: 1 });

    for (const name in _layers){
      const layer = _layers[name];
      if (!layer || !layer.enabled || typeof layer.fn !== 'function') continue;

      try{
        layer.fn(ctx, cam);
      }catch(e){
        WARN('Fehler im Layer', name, ':', e);
      }
    }
  }

  // -------------------------------------------------------------------------
  // GLOBAL EXPORT
  // -------------------------------------------------------------------------

  // Falls schon etwas existiert, nicht zerstören (z. B. spätere Erweiterungen)
  const existing = window.OverlayHooks || {};

  window.OverlayHooks = Object.assign(existing, {
    register,
    enable,
    disable,
    setGlobal,
    draw,
    _layers,
    _getState: function(){
      return {
        global: _globalEnabled,
        layers: _layers
      };
    }
  });

  LOG('Modul geladen – OverlayHooks bereit.');

})();
