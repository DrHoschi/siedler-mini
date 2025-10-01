// ============================================================================
// Datei : ui/ui-start.js
// Version: v1.0.6 (clean)
// Zweck : Startpanel steuern + bei Spielstart BG/Panel ausblenden,
//         Canvas/HUD/Build sichtbar schalten
// Events: cb:ui-ready, cb:start:new/continue, cb:game-start
// ============================================================================
(() => {
  const log  = (...a) => (window.CBLog?.ok || console.log)('[ui-start]', ...a);
  const EVT  = (name, detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));
  const $    = (s, r=document)=>r.querySelector(s);

  // (1) UI meldet sich bereit
  requestAnimationFrame(()=>{ log('ready → cb:ui-ready'); EVT('cb:ui-ready'); });

  // (2) Buttons robust finden
  const btnNew  = $('[data-action="start"], #btn-new, #btn-start, button.start, button[data-start="new"]')
               || [...document.querySelectorAll('button,a')].find(el => /Neues Spiel/i.test(el.textContent||''));
  const btnCont = $('[data-action="continue"], #btn-continue')
               || [...document.querySelectorAll('button,a')].find(el => /Weiter/i.test(el.textContent||''));

  if (btnNew)  btnNew.addEventListener('click',  e => { e.preventDefault(); EVT('cb:start:new');      log('click start:new'); });
  if (btnCont) btnCont.addEventListener('click', e => { e.preventDefault(); EVT('cb:start:continue'); log('click start:continue'); });

  // (3) Startoberflächen schließen + Spiel-UI zeigen
  function hideStartSurfaces(){
    document.body.classList.add('is-playing');

    const selectorsToHide = [
      '#start-panel', '#panel-start', '.start-panel', '#start',
      '#start-bg', '#bg-start', '.start-bg', '#hero', '.hero', '#bg'
    ];
    selectorsToHide.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.display = 'none';
        el.setAttribute('hidden','hidden');
        el.classList.add('hidden');
      });
    });

    // Canvas nach vorn & sichtbar
    const canvas = document.getElementById('game');
    if (canvas){
      canvas.style.visibility = 'visible';
      canvas.style.opacity = '1';
      canvas.style.zIndex = 1;
    }

    // HUD & Build sichtbar schalten
    const hud  = document.getElementById('hud-top');
    const dock = document.getElementById('build-dock');
    if (hud){  hud.hidden  = false; hud.classList.remove('hidden'); }
    if (dock){ dock.hidden = false; dock.classList.remove('hidden'); }

    log('game-start → BG/Panel ausgeblendet, HUD/Build sichtbar');
  }

  // (4) Spielstart-Signal → UI umschalten
  window.addEventListener('cb:game-start', hideStartSurfaces);
})();
