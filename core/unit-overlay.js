/* ============================================================================
 * Datei    : core/unit.overlay.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v25.11.29-units-overlay-b1
 * Zweck    : Einheiten-Overlay (Carrier-Punkt + getragenes Ressourcen-Icon)
 * Architektur:
 *   – Kein eigenes Canvas, keine eigene RAF-Loop.
 *   – Zeichnet im Render-Frame über OverlayHooks (gleiche Kamera/Zoom).
 *   – Robust gegenüber fehlenden Gettern (nutzt mehrere Quellen).
 *
 * Erwartet/Optionale Abhängigkeiten:
 *   – window.OverlayHooks.register(name, fn)  (assets/core/overlay-hooks.js)
 *   – window.GameCamera.getState()            (core/camera.js)
 *   – window.Game.tileSize                    (core/game.js)
 *   – window.Game.getUnits?()  ODER window.Game.units
 *     ODER window.Game.__units/window.__units (Fallback)
 *   – core/icons-map.js  → resolveIcon()/getIconSafe() (optional)
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[unit.overlay]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // Darstellung
  const RADIUS = 8;   // Kreisradius in Weltpixeln (vor Zoom)
  const ICON   = 18;  // Icongröße (px, vor Zoom)

  // Icon-Auflösung: bevorzugt icons-map.js, sonst statische Fallbacks
  const FALLBACK_ICONS = {
    'res.wood' : 'assets/icons/resources/wood.png',
    'res.stone': 'assets/icons/resources/stone.png',
    'res.fish' : 'assets/icons/resources/fish.png'
  };
  const _imgCache = new Map();
  function resIconPath(resId){
    try{
      if (window.resolveIcon) {
        const p = window.resolveIcon(String(resId).replace(/^res\./,''));
        if (p) return p;
      }
      if (window.getIconSafe) {
        const p = window.getIconSafe(String(resId).replace(/^res\./,''));
        if (p) return p;
      }
    }catch(_){}
    return FALLBACK_ICONS[resId] ||
           `assets/icons/resources/${String(resId).replace(/^res\./,'')}.png`;
  }
  function loadIcon(path){
    if (!path) return null;
    if (_imgCache.has(path)) return _imgCache.get(path);
    const img = new Image(); img.src = path;
    _imgCache.set(path, img);
    return img;
  }

  // Kamera/Zoom holen
  function camState(){
    return window.GameCamera?.getState?.() || { x:0, y:0, zoom:1 };
  }

  // TileSize → Weltpixel
  function tilePx(){
    return window.Game?.tileSize || window.Entities?.state?.tile || 64;
  }

  // Units beschaffen (robust)
  function getUnits(){
    try{
      // 1) Bevorzugt: offizieller Getter
      if (typeof window.Game?.getUnits === 'function'){
        return window.Game.getUnits() || [];
      }

      // 2) Direkte Liste an Game gehängt
      if (Array.isArray(window.Game?.units)){
        return window.Game.units;
      }

      // 3) Fallbacks für ältere Varianten
      if (Array.isArray(window.Game?.__units)) return window.Game.__units;
      if (Array.isArray(window.__units))      return window.__units;
    }catch(_){}
    return [];
  }

  // Ein Carrier-Objekt in Weltpixel-Koordinaten (Mitte der Tile)
  function unitToWorldPx(u, ts){
    const cx = (u.x || 0) * ts + ts/2;
    const cy = (u.y || 0) * ts + ts/2;
    const resId = (u.carrying?.res) || (u.carry?.id) || null;
    return { x:cx, y:cy, resId };
  }

  // Zeichenroutine für einen Carrier
  function drawCarrier(ctx, uw, cam, ts){
    const z  = cam.zoom || 1;

    // uw.x / uw.y sind Weltpixel, cam.x / cam.y ebenfalls
    const sx = (uw.x - cam.x) * z;
    const sy = (uw.y - cam.y) * z;

    ctx.save();

    // Schatten
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(1, (RADIUS+1.5)*z), 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fill();

    // Weißer Kern
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(1, RADIUS*z), 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();

    // Icon (falls Ressource getragen wird)
    if (uw.resId){
      const path = resIconPath(uw.resId);
      const img  = loadIcon(path);
      if (img && img.complete){
        const s = Math.max(10, ICON*z);
        ctx.drawImage(img, sx + (RADIUS+4)*z, sy - s - 4, s, s);
      }
    }

    ctx.restore();
  }

  // Hauptzeichenfunktion → wird von OverlayHooks im Render-Frame aufgerufen
  function draw(ctx){
    const cam   = camState();
    const ts    = tilePx();
    const units = getUnits();
    if (!units.length) return;

    try{
      for (const u of units){
        const uw = unitToWorldPx(u, ts);
        drawCarrier(ctx, uw, cam, ts);
      }
    }catch(e){
      WARN('draw error:', e?.message||e);
    }
  }

  // Registrierung am Overlay-System
  function register(){
    if (!window.OverlayHooks?.register){
      let tries = 0;
      const t = setInterval(()=>{
        if (window.OverlayHooks?.register){
          clearInterval(t);
          registerNow();
        } else if (++tries > 40){
          clearInterval(t);
        }
      }, 100);
      return;
    }
    registerNow();
  }

  function registerNow(){
    try{
      window.OverlayHooks.register('units', (ctx)=>{
        draw(ctx); // Kamera wird intern gelesen
      });
      LOG('Overlay-Layer "units" registriert');
    }catch(e){
      WARN('register failed:', e?.message||e);
    }
  }

  register();
})();
