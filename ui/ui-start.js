// ============================================================================
// Datei   : ui/ui-start.js
// Version : v1.0.7
// Zweck   : Startpanel/BG ausblenden, Canvas/HUD/Build sichtbar (idempotent)
// Events  : cb:ui-ready (out), cb:start:new (in), cb:game-start (in)
// ============================================================================
(() => {
  const log = (...a) => (window.CBLog?.ok || console.log)('[ui-start]', ...a);
  const EVT = (name, detail) => window.dispatchEvent(new CustomEvent(name,{detail}));
  const $   = (s, r=document) => r.querySelector(s);

  let _started = false;

  // [1] UI ready → einmalig melden
  requestAnimationFrame(()=>{ log('ready → cb:ui-ready'); EVT('cb:ui-ready'); });

  // [2] Buttons tolerant finden
  const btnNew  = $('[data-action="start"], #btn-new, #btn-start, button.start, button[data-start="new"]')
               || [...document.querySelectorAll('button,a')].find(el => /Neues Spiel/i.test(el.textContent||''));
  const btnCont = $('[data-action="continue"], #btn-continue')
               || [...document.querySelectorAll('button,a')].find(el => /Weiter/i.test(el.textContent||''));

  if (btnNew)  btnNew.addEventListener('click',  e => { e.preventDefault(); EVT('cb:start:new');      log('click start:new'); });
  if (btnCont) btnCont.addEventListener('click', e => { e.preventDefault(); EVT('cb:start:continue'); log('click start:continue'); });

  // [3] Hauptschalter: Start-BG/Panel weg, Spiel-UI an (idempotent)
  function hideStartSurfaces(){
    if (_started) return;
    _started = true;

    // 3.1 Spielzustand-Klasse → CSS killt BG zuverlässig
    document.body.classList.add('is-playing');

    // 3.2 Alle typischen Start-Container hart ausblenden
    [
      '#start-panel','#panel-start','.start-panel','#start',
      '#start-bg','#bg-start','.start-bg','#hero','.hero','#bg',
      '#start-background','.start-background'
    ].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.display='none'; el.style.opacity='0'; el.style.visibility='hidden';
        el.setAttribute('hidden','hidden'); el.classList.add('hidden');
      });
    });

    // 3.3 Fallback: Body/HTML Background-Images entfernen (falls per CSS gesetzt)
    document.body.style.backgroundImage  = 'none';
    document.documentElement.style.backgroundImage = 'none';
    document.body.style.background       = 'none';
    document.documentElement.style.background = 'none';

    // 3.4 Canvas/HUD/Build sichtbar & vorn
    const cvs = document.getElementById('game');
    if (cvs){ cvs.style.visibility='visible'; cvs.style.opacity='1'; cvs.style.zIndex='10'; cvs.style.pointerEvents='auto'; }
    const hud  = document.getElementById('hud-top');
    const dock = document.getElementById('build-dock');
    if (hud){  hud.hidden=false;  hud.classList.remove('hidden'); hud.style.zIndex='48'; }
    if (dock){ dock.hidden=false; dock.classList.remove('hidden'); dock.style.zIndex='46'; }
    const btnBuild = document.getElementById('btn-build');
    if (btnBuild) btnBuild.style.zIndex = '47';

    log('game-start → BG/Panel ausgeblendet, Canvas/HUD/Build sichtbar');
  }

  // [4] Events, die den Schalter auslösen
  window.addEventListener('cb:start:new',  hideStartSurfaces);  // sofort bei Klick
  window.addEventListener('cb:game-start', hideStartSurfaces);  // spätestens beim Engine-Start
})();
