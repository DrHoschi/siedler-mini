/* ============================================================================
 * Datei   : core/render.shim.js
 * Projekt : Neue Siedler – Engine
 * Version : v25.10.25-final
 *
 * Zweck   : PASSIVER Render-Shim (keine eigene RAF-Loop)
 *           – hält Kompatibilität (window.Render.*)
 *           – reagiert auf cb:request-repaint und malt genau einen Frame
 *           – nimmt Kamera-States entgegen (setCameraState), ohne selbst zu steuern
 *
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Hauptlogik → Exports
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[render/shim]';
  const LOG  = (...a)=> (window.CBLog?.info  ?? console.log )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn)(TAG, ...a);

  let active = false;

  // letzter bekannter Kamerastand (nur informativ; GameCamera rendert ohnehin)
  const camState = { x:0, y:0, zoom:1 };

  // Optionaler, benutzerdefinierter Draw-Hook (z. B. UI/HUD)
  let extraDraw = null; // fn(ctx) oder null

  function repaintOnce(){
    // Map zuerst
    try { window.MapRuntime?.draw?.(); } catch(e){ WARN('MapRuntime.draw Fehler:', e?.message||e); }
    // Entities danach
    try { window.drawEntities && typeof window.drawEntities === 'function' && window.drawEntities(window.__ctx__); } catch{}
    // Optionaler Zusatz (HUD, Debug etc.)
    try { extraDraw && extraDraw(window.__ctx__); } catch(e){ WARN('extraDraw Fehler:', e?.message||e); }
  }

  // --- Öffentliche API -------------------------------------------------------
  function init(){
    if (active) return;
    active = true;
    LOG('aktiviert (passiv – ohne eigene Loop).');
  }

  function stop(){
    active = false;
    LOG('gestoppt (Shim).');
  }

  /** Kamera-Status entgegennehmen (Kompatibilität für Aufrufer) */
  function setCameraState({x,y,zoom} = {}){
    if (typeof x === 'number')   camState.x = x;
    if (typeof y === 'number')   camState.y = y;
    if (typeof zoom === 'number')camState.zoom = zoom;
    // Keine eigene Steuerung – nur als Sink/Debug sinnvoll.
  }

  /** Einmal neu zeichnen (Map → Entities → optional extraDraw) */
  function repaint(){
    if (!active) return;
    repaintOnce();
  }

  /** Zusatz-Zeichner registrieren (HUD o. ä.) */
  function setDraw(fn){
    extraDraw = (typeof fn === 'function') ? fn : null;
  }

  // --- Event-Wiring ----------------------------------------------------------
  // Soft-Repaint auf Anfrage (z. B. nach Assets-Ready, Platzierung etc.)
  window.addEventListener('cb:request-repaint', ()=> repaint());

  // Exports (Kompatibilität wahren)
  window.Render = window.Render || {};
  window.Render.init            = init;
  window.Render.stop            = stop;
  window.Render.repaint         = repaint;
  window.Render.setDraw         = setDraw;
  window.Render.setCameraState  = setCameraState; // von core/camera.js genutzt

  // Nicht automatisch starten – Game steuert den Renderfluss.
  WARN('geladen – passiver Shim. Game steuert die Render-Loop.');
})();
