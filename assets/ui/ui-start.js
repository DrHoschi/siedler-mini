/* ============================================================================
 * UI Start Overlay (v17.8.4)
 *  - Initialisiert Start-Button
 *  - Blendt Overlay mit Fade aus und ENTFERNT es aus dem DOM
 *  - Dispatcht 'cb:game-start' nach dem Entfernen
 *  - Kein Layer bleibt darüber liegen -> Canvas und Map sichtbar
 * ========================================================================== */

(function(){
  const log = (window.CBLog?.info || console.log).bind(console);
  const ok  = (window.CBLog?.ok   || console.log).bind(console);
  const warn= (window.CBLog?.warn || console.warn).bind(console);

  let startEl, btnEl, removed = false;

  function byId(id){ return document.getElementById(id); }

  function removeStartOverlay(){
    if (!startEl || removed) return;
    // Fade, dann endgültig entfernen
    startEl.classList.add('is-fading');
    setTimeout(() => {
      startEl.classList.add('is-hidden');
      try{ startEl.remove(); }catch(_){}
      removed = true;
      document.body.classList.add('has-game-started');
      // Jetzt das Spiel offiziell starten
      try{
        window.dispatchEvent(new CustomEvent('cb:game-start'));
      }catch(err){
        warn('[ui-start] Konnte cb:game-start nicht dispatchen:', err);
      }
    }, 280);
  }

  function onStartClick(){
    ok('[ui-start] Start gedrückt – Overlay wird entfernt');
    removeStartOverlay();
  }

  // Externes, einmaliges Wegklicken erlauben (z.B. aus Tests/Inspector)
  window.HideStartOverlayOnce = function(){
    onStartClick();
  };

  // Init, sobald DOM bereit
  function init(){
    startEl = byId('start-panel');
    if (!startEl){
      warn('[ui-start] #start-panel nicht gefunden (Overlay bereits entfernt?)');
      document.body.classList.add('has-game-started');
      return;
    }
    btnEl = startEl.querySelector('#btnStart');
    if (btnEl){
      btnEl.addEventListener('click', onStartClick, { once:true });
    }else{
      warn('[ui-start] #btnStart fehlt – entferne Overlay vorsorglich');
      removeStartOverlay();
      return;
    }

    log('[ui-start] geladen (v17.8.4)');

    // Falls ein Reload stattfand und das Spiel schon initialisiert ist,
    // Overlay sofort entfernen (Sicherheitsnetz)
    if (window.__gameAlreadyRunning){
      removeStartOverlay();
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  }else{
    init();
  }
})();
