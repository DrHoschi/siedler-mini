// ============================================================================
// Datei   : ui/ui-start.js
// Projekt : Neue Siedler
// Version : v1.0.7 (2025-10-05)
// Zweck   : Startpanel steuern + bei Spielstart ALLE Start-BGs zuverlässig
//           ausblenden, Canvas/HUD/Build sichtbar schalten.
// Events  :
//    OUT  -> cb:ui-ready
//    IN   -> cb:start:new, cb:start:continue, cb:game-start
//
// Änderungen (v1.0.7):
//   [A] Start-Hintergrund robust entfernen (DIV/Body/HTML-Backgrounds), inkl. Fallback.
//   [B] Idempotenz: Mehrfaches Aufrufen schadet nicht (Flag _started).
//   [C] Canvas/HUD/Build nach vorn; Hidden/Visibility sicher entfernen.
//   [D] Button-Wiring tolerant: data-action, bekannte IDs, Text-Match ("Neues Spiel").
// ============================================================================
(() => {
  // ---------------------------------------------------------------------------
  // [00] Helpers
  // ---------------------------------------------------------------------------
  const log = (...a) => (window.CBLog?.ok || console.log)('[ui-start]', ...a);
  const EVT = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
  const $   = (s, r=document) => r.querySelector(s);

  // interne Einmal-Schutzflagge (idempotent)
  let _started = false;

  // ---------------------------------------------------------------------------
  // [01] UI meldet sich bereit → cb:ui-ready
  // ---------------------------------------------------------------------------
  requestAnimationFrame(() => { log('ready → cb:ui-ready'); EVT('cb:ui-ready'); });

  // ---------------------------------------------------------------------------
  // [02] Buttons robust finden & verdrahten
  // ---------------------------------------------------------------------------
  const btnNew  =
      $('[data-action="start"], #btn-new, #btn-start, button.start, button[data-start="new"]')
      || [...document.querySelectorAll('button,a')].find(el => /Neues Spiel/i.test(el.textContent||''));
  const btnCont =
      $('[data-action="continue"], #btn-continue')
      || [...document.querySelectorAll('button,a')].find(el => /Weiter/i.test(el.textContent||''));

  if (btnNew)  btnNew.addEventListener('click',  e => { e.preventDefault(); EVT('cb:start:new');      log('click start:new'); });
  if (btnCont) btnCont.addEventListener('click', e => { e.preventDefault(); EVT('cb:start:continue'); log('click start:continue'); });

  // ---------------------------------------------------------------------------
  // [03] Startoberflächen schließen + Spiel-UI zeigen (Hauptschalter)
  //       -> wird auf cb:game-start UND cb:start:new gelegt (idempotent)
  // ---------------------------------------------------------------------------
  function hideStartSurfaces(){
    if (_started) { return; }   // schon erledigt
    _started = true;

    // 3.1: Klassenmarkierung für CSS-Regeln
    document.body.classList.add('is-playing');

    // 3.2: Alle typischen Start-Container hart ausblenden
    const selectorsToHide = [
      // Panels/Container
      '#start-panel', '#panel-start', '.start-panel', '#start',
      // Hintergründe/Hero
      '#start-bg', '#bg-start', '.start-bg', '#hero', '.hero', '#bg',
      // zusätzliche häufige IDs/Klassen aus früheren Builds
      '#start-background', '.start-background'
    ];
    selectorsToHide.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.display    = 'none';
        el.style.opacity    = '0';
        el.style.visibility = 'hidden';
        el.setAttribute('hidden','hidden');
        el.classList.add('hidden');
      });
    });

    // 3.3: Body/HTML-Backgrounds deaktivieren (Fallback gegen CSS-Hintergründe)
    document.body.style.background       = 'none';
    document.body.style.backgroundImage  = 'none';
    document.documentElement.style.background      = 'none';
    document.documentElement.style.backgroundImage = 'none';

    // 3.4: Canvas nach vorn & sichtbar
    const canvas = document.getElementById('game');
    if (canvas){
      canvas.style.visibility = 'visible';
      canvas.style.opacity    = '1';
      canvas.style.zIndex     = '10';
      // Vorsichtshalber Interaktionen nicht blockieren:
      canvas.style.pointerEvents = 'auto';
    }

    // 3.5: HUD & Build sichtbar schalten
    const hud  = document.getElementById('hud-top');
    const dock = document.getElementById('build-dock');
    if (hud){  hud.hidden  = false; hud.classList.remove('hidden'); hud.style.zIndex = '48'; }
    if (dock){ dock.hidden = false; dock.classList.remove('hidden'); dock.style.zIndex = '46'; }

    // 3.6: „Bauen“-Button (falls vorhanden) sicher über Canvas
    const btnBuild = document.getElementById('btn-build');
    if (btnBuild){ btnBuild.style.zIndex = '47'; }

    log('game-start → Start-BG/Panel zuverlässig ausgeblendet, Canvas/HUD/Build sichtbar');
  }

  // ---------------------------------------------------------------------------
  // [04] Events, die den UI-Switch auslösen
  // ---------------------------------------------------------------------------
  // a) Sofort beim „Neues Spiel“-Klick UI umschalten (falls Engine-Start etwas verzögert)
  window.addEventListener('cb:start:new', hideStartSurfaces);
  // b) Spätestens beim tatsächlichen Game-Start (Engine hat begonnen)
  window.addEventListener('cb:game-start', hideStartSurfaces);

  // (Optional) Auch „Weiterspielen“ könnte direkt umschalten – falls gewünscht:
  // window.addEventListener('cb:start:continue', hideStartSurfaces);
})();
