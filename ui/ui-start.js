/* ============================================================================
 * Datei   : ui/ui-start.js
 * Projekt : Neue Siedler
 * Version : v25.11.13-final2 (no-autoplay, robust splash, singleton)
 * Zweck   : Startpanel/Splash steuern, OHNE automatisch body.is-playing zu setzen
 *
 * WICHTIG
 * - Startpanel bleibt sichtbar, bis der Nutzer aktiv startet (Button)
 *   ODER bis ein Event 'req:ui:startpanel:hide' kommt.
 * - Splash-Hintergrund wird gesetzt, wenn gefunden (mehrere Pfad-Kandidaten).
 * - Alle Aktionen sind idempotent/guarded, um Doppel-Includes zu überleben.
 * ========================================================================== */
(function(){
  'use strict';
  const TAG = '[ui-start]';

  // --------------------------- Singleton-Guard -------------------------------
  if (window.__UI_START__) {
    console.info(TAG, 'bereits initialisiert – ignoriere Doppel-Init');
    return;
  }
  window.__UI_START__ = true;

  // --------------------------- Konfiguration --------------------------------
  // IDs/Selektoren für das Startpanel & Start-Button
  const START_PANEL_CANDIDATES = ['#start-panel', '#startpanel', '[data-role="startpanel"]', '#ui-start'];
  const START_BUTTON_CANDIDATES = ['#btn-start', '[data-action="start"]', '.js-start'];

  // Mögliche Pfade fürs Splash-Bild (relativ zur index.html)
  const SPLASH_CANDIDATES = [
    'assets/ui/start-bg.jpg',
    'assets/ui/start.jpg',
    'assets/ui/start-bg.png',
    'assets/ui/start.png'
  ];

  // --------------------------- Logging Helpers ------------------------------
  const INFO = (...a)=> (window.CBLog?.info || console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn || console.warn)(TAG, ...a);

  // --------------------------- State ----------------------------------------
  let mounted = false;
  const warned = new Set();

  function warnOnce(key, ...msg){
    if (warned.has(key)) return;
    warned.add(key);
    WARN(...msg);
  }

  // --------------------------- DOM Helpers ----------------------------------
  function qsAny(selectors){
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  function setSplashBackground(url){
    // Variante 1: CSS-Variable (für body::before oder .start-bg)
    document.documentElement.style.setProperty('--splash-url', `url("${url}")`);
    // Variante 2 (Fallback): direkt aufs Body-Background, falls Variable nicht genutzt wird
    // (wird nur gesetzt, wenn noch kein explizites BG gesetzt ist)
    const cs = getComputedStyle(document.body);
    const hasBg = cs.backgroundImage && cs.backgroundImage !== 'none';
    if (!hasBg) {
      document.body.style.backgroundImage = `url("${url}")`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center center';
      document.body.style.backgroundRepeat = 'no-repeat';
    }
  }

  async function resolveSplash(){
    // Lade nacheinander die Kandidaten (HEAD via fetch ist nicht überall erlaubt → Image-Probe)
    for (const url of SPLASH_CANDIDATES) {
      const ok = await new Promise((resolve) => {
        const img = new Image();
        img.onload = ()=> resolve(true);
        img.onerror = ()=> resolve(false);
        img.src = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(); // Cache-Bust
      });
      if (ok) { setSplashBackground(url); return true; }
    }
    warnOnce('splash-missing', '⚠️ Splash-Bild nicht gefunden (Kandidaten):', SPLASH_CANDIDATES.join(', '));
    return false;
  }

  function showStartPanel(panel){
    if (!panel) return;
    panel.classList.remove('is-hidden');
    panel.hidden = false;
    panel.style.display = ''; // falls irgendwo display:none gesetzt wurde
  }

  function hideStartPanel(panel){
    if (!panel) return;
    panel.classList.add('is-hidden');
    panel.hidden = true;
  }

  function enterPlay(panel){
    // NICHT automatisch beim HUD-Ready!
    // is-playing setzen nur hier beim bewussten Start.
    document.body.classList.add('is-playing');
    hideStartPanel(panel);
    // UI ist bereit → kann optional vom Boot ausgewertet werden
    window.dispatchEvent(new CustomEvent('cb:ui-ready', { detail:{ panel:'start' }}));
  }

  function wireStartButton(panel){
    const btn = qsAny(START_BUTTON_CANDIDATES);
    if (!btn) return;
    btn.addEventListener('click', ()=> enterPlay(panel), { once:true });
  }

  function mount(){
    if (mounted) return;
    mounted = true;

    const panel = qsAny(START_PANEL_CANDIDATES);
    if (!panel) {
      warnOnce('no-start-panel', 'Kein Startpanel im DOM gefunden (erwartet einen der Selektoren):', START_PANEL_CANDIDATES.join(', '));
    } else {
      showStartPanel(panel);
      wireStartButton(panel);
    }

    // Externes Signal erlaubt weiterhin den Start (z. B. Tastatur/Ereignis)
    window.addEventListener('req:ui:startpanel:hide', ()=> enterPlay(panel), { once:true });

    // Splash asynchron auflösen (nicht blockierend)
    resolveSplash();

    INFO('bereit (no-autoplay; wartet auf Button oder req:ui:startpanel:hide)');
  }

  // Mount bei DOMContentLoaded (einmalig)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once:true });
  } else {
    // DOM bereits bereit
    mount();
  }
})();
