/* ============================================================================
 * Datei    : core/unit-overlay.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v25.11.30-units-overlay
 * Zweck    : Zeichnet alle Träger/Units als Debug-Overlay über die Karte
 *
 * - Liest Unit-Positionen aus GameUnits.getUnits()
 * - Verwendet Kamera aus window.Camera / MapRuntime
 * - Registriert sich bei OverlayHooks (Layer-Tab / Debug-Overlay)
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[units.overlay]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // Einfacher Zugriff auf Units
  function getUnits(){
    try{
      return window.GameUnits?.getUnits?.() || [];
    }catch(e){
      WARN('getUnits failed:', e?.message||e);
      return [];
    }
  }

  // Kamera / Map-Helfer holen
  function getCamera(){
    // MapRuntime hat meist eine getCamera()-API
    if (window.MapRuntime?.getCamera){
      return window.MapRuntime.getCamera();
    }
    // Fallback: globale Camera
    if (window.Camera){
      return window.Camera;
    }
    return null;
  }

  /**
   * Wandelt Tile-Koordinaten (tx,ty) in Canvas-Koordinaten um.
   * Hier nutzen wir MapRuntime / Camera, damit Zoom und Offset stimmen.
   */
  function tileToCanvas(tx, ty){
    const cam = getCamera();
    if (!cam){
      return { x: tx * 32, y: ty * 32 }; // sehr grober Fallback
    }

    // Falls MapRuntime eine Helper-Funktion hat:
    if (window.MapRuntime?.tileToCanvas){
      return window.MapRuntime.tileToCanvas(tx, ty, cam);
    }

    // Vereinfachtes Beispiel: isometrische Projektion über Camera
    const tileW = cam.tileWidth  || 64;
    const tileH = cam.tileHeight || 32;

    // World (iso) → Screen
    const sx = (tx - ty) * (tileW / 2);
    const sy = (tx + ty) * (tileH / 2);

    return {
      x: sx - (cam.x || 0),
      y: sy - (cam.y || 0)
    };
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

      // Kreis
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20, 200, 255, 0.85)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#003344';
      ctx.stroke();

      // kleines "C" für Carrier
      ctx.font = '8px sans-serif';
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
    // Wenn OverlayHooks noch nicht da sind, wiederholt versuchen
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
