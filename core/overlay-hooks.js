/* ============================================================================
 * Datei   : core/overlay-hooks.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.15-overlayhooks-v3 (adds OverlayHooks.render + auto overlay canvas)
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
  // DEFAULT OVERLAY CANVAS RENDERER
  // -------------------------------------------------------------------------
  // In deinem Projekt ruft core/game.js pro Frame OverlayHooks.render() auf.
  // Früher gab es mehrere Varianten (drawOverlays im Renderer, eigenes Canvas,
  // etc.). Damit wir ENDLICH konsistent sind, liefern wir hier render():
  //   - nutzt das vorhandene <canvas id="overlay">
  //   - synchronisiert Größe zum Game-Canvas
  //   - cleared Screen-Space (Identity Transform)
  //   - ruft danach draw(ctx) auf (Layer entscheiden selbst, ob sie Transform setzen)
  //
  // WICHTIG:
  // - Overlays wie path-traces.overlay.js rechnen Kamera selbst in Screen-Space um.
  // - PathOverlay setzt aktuell im draw() selbst ctx.setTransform(...) wie GameMap.
  // → Deshalb lassen wir hier absichtlich Identity (kein Welt-Transform).

  let _overlayCanvas = null;
  let _overlayCtx    = null;

  function _resolveOverlay(){
    if (_overlayCanvas && _overlayCtx) return true;
    _overlayCanvas = document.getElementById('overlay');
    if (!_overlayCanvas) return false;
    _overlayCtx = _overlayCanvas.getContext('2d');
    return !!_overlayCtx;
  }

  function _syncOverlaySize(){
    if (!_overlayCanvas) return;

    // Referenz: Game-Canvas (falls vorhanden), sonst ClientSize des Overlay-Canvas
    const gameCanvas =
      window.Game?.canvas
      || document.getElementById('game')
      || document.querySelector('canvas#game');

    const ref = gameCanvas || _overlayCanvas;
    const cssW = Math.max(0, ref.clientWidth  | 0);
    const cssH = Math.max(0, ref.clientHeight | 0);
    if (!cssW || !cssH) return;

    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(cssW * dpr));
    const h = Math.max(1, Math.floor(cssH * dpr));

    if (_overlayCanvas.width !== w || _overlayCanvas.height !== h){
      _overlayCanvas.width  = w;
      _overlayCanvas.height = h;
      _overlayCanvas.style.width  = cssW + 'px';
      _overlayCanvas.style.height = cssH + 'px';
    }
  }

  function render(){
    if (!_globalEnabled) return;
    if (!_resolveOverlay()) return;

    _syncOverlaySize();

    // Clear in Screen-Space
    _overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
    _overlayCtx.clearRect(0, 0, _overlayCanvas.width, _overlayCanvas.height);

    // Zeichnen (Layer setzen Transform selbst, falls sie Welt-Koordinaten brauchen)
    draw(_overlayCtx);
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
    render,
    _layers,
    _getState: function(){
      return {
        global: _globalEnabled,
        layers: _layers
      };
    }
  });

  LOG('Modul geladen – OverlayHooks bereit (API: register/enable/disable/draw/render).');

})();
