/* ============================================================================
 * Datei    : core/unit.overlay.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v25.10.25-final
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
 *   – window.Game.getUnits?()  ODER window.__units/window.Game.__units (Fallback)
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
    // Versuch 1: icons-map.js
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
    // Versuch 2: Fallback-Tabelle
    return FALLBACK_ICONS[resId] || `assets/icons/resources/${String(resId).replace(/^res\./,'')}.png`;
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
      if (typeof window.Game?.getUnits === 'function') return window.Game.getUnits() || [];
      if (Array.isArray(window.Game?.__units)) return window.Game.__units;
      if (Array.isArray(window.__units)) return window.__units;
    }catch(_){}
    return [];
  }

  // Ein Carrier-Objekt in Weltpixel-Koordinaten (Mitte der Tile)
  function unitToWorldPx(u, ts){
    const cx = (u.x || 0) * ts + ts/2;
    const cy = (u.y || 0) * ts + ts/2;
    const resId = (u.carrying?.res) || (u.carry?.id) || null; // beide Varianten unterstützen
    return { x:cx, y:cy, resId };
  }

  // Zeichenroutine für einen Carrier
  function drawCarrier(ctx, uw, cam, ts){
    const z  = cam.zoom || 1;
    const sx = (uw.x - cam.x*ts) * z;
    const sy = (uw.y - cam.y*ts) * z;

    // Kreis (Schatten + weißer Kern)
    ctx.save();
    ctx.beginPath(); ctx.arc(sx, sy, Math.max(1, (RADIUS+1.5)*z), 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy, Math.max(1, RADIUS*z), 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();

    // Icon (falls Ressource getragen wird)
    if (uw.resId){
      const path = resIconPath(uw.resId);
      const img  = loadIcon(path);
      if (img && img.complete){
        const s = Math.max(8, ICON*z);
        ctx.drawImage(img, sx + (RADIUS+2)*z, sy - s - 2, s, s);
      }
    }

    ctx.restore();
  }

  // Hauptzeichenfunktion → wird von OverlayHooks im Render-Frame aufgerufen
  function draw(ctx){
    const cam = camState();
    const ts  = tilePx();
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
      // späten Load abwarten
      let tries=0, t=setInterval(()=>{
        if (window.OverlayHooks?.register){ clearInterval(t); registerNow(); }
        else if (++tries > 40) clearInterval(t);
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
