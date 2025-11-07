/* ============================================================================
 * Datei   : ui/ui-start.js
 * Projekt : Neue Siedler
 * Version : v25.11.13-final+singleton+warn-once
 * Zweck   : Startpanel/Splash-Bild + Layout-Switch → body.is-playing
 * ========================================================================== */
(function(){
  'use strict';
  const TAG = '[ui-start]';

  if (window.__UI_START__) {
    console.info(TAG, 'bereits initialisiert – ignoriere Doppel-Init');
    return;
  }
  window.__UI_START__ = true;

  const WARN = (...a)=> (window.CBLog?.warn || console.warn)(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info || console.info)(TAG, ...a);

  const warnOnceKeys = new Set();
  function warnOnce(key, ...msg){
    if (warnOnceKeys.has(key)) return;
    warnOnceKeys.add(key);
    WARN(...msg);
  }

  function ensureSplash(){
    const url = '../../assets/ui/start-bg.jpg';
    const img = new Image();
    img.onload = ()=> { document.body.style.setProperty('--splash-url', `url("${url}")`); };
    img.onerror = ()=> warnOnce('splash-missing', '⚠️ Splash-Bild nicht gefunden:', url);
    img.src = url;
  }

  function enterPlay(){
    document.body.classList.add('is-playing');
    window.dispatchEvent(new CustomEvent('cb:ui-ready', { detail:{ panel:'start' }}));
  }

  // Öffnen → Assets + Registry warten (Start übernimmt Boot)
  window.addEventListener('cb:hud-ready', ()=> {
    // Dein aktueller Flow schaltet hier bereits ins Spiel
    document.body.classList.add('is-playing');
  }, { once:true });

  // Optional: Splash prüfen
  ensureSplash();

  INFO('bereit');
})();
