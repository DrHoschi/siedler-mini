/* ============================================================================
 * UI-Start – v17.8.6
 * - Start-Overlay initialisieren
 * - Klick auf "Spiel starten" blendet Overlay aus, entfernt es
 * - Events: cb:ui-ready (beim Setup), cb:game-start (beim Start)
 * ========================================================================== */

(function(){
  const log = (msg)=> (window.CBLog?.info || console.log)(`[ui-start] ${msg}`);

  // DOM-Hooks
  const startEl  = document.getElementById('start-panel');   // .ui-start
  const btnStart = document.getElementById('btnStart');

  if(!startEl || !btnStart){
    console.warn('[ui-start] Startpanel-Elemente fehlen.');
    return;
  }

  // Marker & Initial-Event
  document.body.classList.add('ui-start-mounted');
  log('geladen (v17.8.6)');
  window.dispatchEvent(new CustomEvent('cb:ui-ready'));

  // Start-Klick
  const onStart = ()=>{
    try{
      log('Start klick');
      // Spielstart-Ereignis an Engine/Bootstrap
      window.dispatchEvent(new CustomEvent('cb:game-start'));

      // UI: Overlay sauber ausblenden und danach entfernen
      startEl.classList.add('is-hiding');
      // Sicherheitsnetz: auch wenn transitionend ausbleibt -> nach 400ms entfernen
      const removeNow = ()=>{
        if(startEl && startEl.parentNode){
          startEl.parentNode.removeChild(startEl);
          document.body.classList.remove('ui-start-mounted');
          document.body.classList.add('ui-start-removed'); // Marker, falls gewünscht
        }
      };
      const once = ()=>{ startEl.removeEventListener('transitionend', once); removeNow(); };
      startEl.addEventListener('transitionend', once);
      setTimeout(removeNow, 400);
    }catch(err){
      console.error('[ui-start] Fehler beim Start:', err);
    }
  };

  btnStart.addEventListener('click', onStart);
  // Tastatur: Enter/Space auf Button
  btnStart.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault(); onStart();
    }
  });
})();
