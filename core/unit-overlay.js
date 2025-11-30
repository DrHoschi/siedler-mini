/* ============================================================================
 * Datei    : core/unit-overlay.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v25.11.30-units-overlay
 * Zweck    : Zeichnet alle Träger/Units als Debug-Overlay über die Karte
 *
 * - Liest Unit-Positionen aus GameUnits.getUnits()
 * - Verwendet GameCamera für die Projektion
 * - Registriert sich bei OverlayHooks (Layer-Tab / Debug-Overlay)
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[units.overlay]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  /** Hilfsfunktionen **********************************************************/

  function getUnits(){
    try{
      return window.GameUnits?.getUnits?.() || [];
    }catch(e){
      WARN('getUnits failed:', e?.message||e);
      return [];
    }
  }

  /** Kamera holen – wir benutzen deine core/camera.js (GameCamera). */
  function getCamera(){
    if (window.GameCamera) return window.GameCamera;
    return null;
  }

  /**
   * Wandelt Tile-Koordinaten (tx,ty) in Canvas-Koordinaten um.
   * Nutzt, wenn vorhanden, GameCamera.tileToScreen / worldToScreen.
   * Fallback: einfache isometrische Projektion.
   */
  function tileToCanvas(tx, ty){
    const cam = getCamera();

    // Wenn deine Kamera eine passende Helper-Funktion hat, zuerst versuchen:
    try {
      if (cam && typeof cam.tileToScreen === 'function') {
        // Erwartet (tx,ty) und gibt {x,y} zurück
        return cam.tileToScreen(tx, ty);
      }
      if (cam && typeof cam.worldToScreen === 'function') {
        // Falls deine Weltkoordinaten = Tilekoordinaten sind
        return cam.worldToScreen(tx, ty);
      }
    } catch (e) {
      WARN('tileToCanvas via GameCamera failed', e?.message||e);
    }

    // Fallback: einfache Iso-Projektion
    const tileW = (cam && cam.tileWidth)  || 64;
    const tileH = (cam && cam.tileHeight) || 32;
    const camX  = (cam && cam.x) || 0;
    const camY  = (cam && cam.y) || 0;

    // Standard-Iso-Formel (wie bei Tiles): (tx-ty, tx+ty)
    const sx = (tx - ty) * (tileW / 2) - camX;
    const sy = (tx + ty) * (tileH / 2) - camY;

    return { x: sx, y: sy };
  }

  /** Zeichnet alle Units als kleine Kreise mit "C" auf dem Canvas. */
  function draw(ctx){
    const units = getUnits();
    if (!units.length) return;

    const cam = getCamera();
    const zoom = cam?.zoom || 1;

    ctx.save();
    ctx.scale(zoom, zoom);

    for (const u of units){
      if (u.type !== 'carrier') continue;

      // u.x / u.y sind Tile-Koordinaten (vgl. game.units.js)
      const p = tileToCanvas(u.x, u.y);
      const r = 6; // Radius in Pixeln

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20, 200, 255, 0.85)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#003344';
      ctx.stroke();

      ctx.font = '8px system-ui, sans-serif';
      ctx.fillStyle = '#001016';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C', p.x, p.y);
    }

    ctx.restore();
  }

  /**
   * Registriert sich beim Overlay-System.
   * Wir warten, bis OverlayHooks verfügbar sind (Layer-Tab / Debug-Layer).
   */
  function register(){
    function tryRegister(){
      if (!window.OverlayHooks || typeof window.OverlayHooks.register !== 'function'){
        return false;
      }
      try{
        window.OverlayHooks.register('units', (ctx)=>{
          draw(ctx);
        });
        LOG('Overlay-Layer "units" registriert');
        return true;
      }catch(e){
        WARN('register failed:', e?.message||e);
        return false;
      }
    }

    if (tryRegister()) return;

    // Polling, bis OverlayHooks vorhanden sind (max. ~4s)
    let tries = 0;
    const t = setInterval(() => {
      if (tryRegister()) {
        clearInterval(t);
      } else if (++tries > 40) {
        clearInterval(t);
        WARN('OverlayHooks nicht gefunden – Units-Layer nicht aktiv');
      }
    }, 100);
  }

  register();
  LOG('Modul geladen v25.11.30-units-overlay');
})();
