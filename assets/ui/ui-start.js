/* ============================================================================
 * UI Start Panel (Overlay) – v17.8.4
 * - feuert 'cb:ui-ready' beim Laden
 * - feuert 'cb:game-start' beim Start
 * - verhindert Doppel-Start
 * - blendet Overlay weich aus und entfernt es
 * ========================================================================== */
(function(){
  const log = (t,...a)=> (window.CBLog?.info||console.log)(`[ui-start] ${t}`, ...a);
  const warn= (t,...a)=> (window.CBLog?.warn||console.warn)(`[ui-start] ${t}`, ...a);
  const ok  = (t,...a)=> (window.CBLog?.ok  ||console.log)(`[ui-start] ${t}`, ...a);

  const onReady = ()=>{
    const panel = document.querySelector('.ui-start');
    const bg    = document.querySelector('.ui-start-bg');
    const btn   = document.getElementById('btnStart');

    // Signal: UI ist bereit
    try{ window.dispatchEvent(new CustomEvent('cb:ui-ready')); }catch(_){}
    log('geladen (v17.8.4)');

    if(!panel || !btn){
      warn('Startpanel oder Button nicht gefunden – überspringe Overlay.');
      try{ window.dispatchEvent(new CustomEvent('cb:game-start')); ok('cb:game-start (auto)'); }catch(_){}
      return;
    }

    // Fallback falls Background fehlt (z.B. falscher Pfad)
    if(bg){
      const cs = getComputedStyle(bg);
      const hasImg = (cs.backgroundImage && cs.backgroundImage !== 'none');
      if(!hasImg){ panel.classList.add('no-bg'); }
    }

    let started = false;
    const startGame = ()=>{
      if(started) return;
      started = true;
      ok('Start klick');
      // Spielstart-Ereignis (von deiner Engine/Bootstrap abgefangen)
      try{ window.dispatchEvent(new CustomEvent('cb:game-start')); ok('cb:game-start dispatcht'); }catch(_){}

      // weich ausblenden und entfernen
      panel.classList.add('is-hidden');
      setTimeout(()=>{ panel.remove(); }, 320);
    };

    // Klick + Enter/Space
    btn.addEventListener('click', startGame, {once:true});
    btn.addEventListener('keydown', (ev)=>{
      if(ev.key === 'Enter' || ev.key === ' '){
        ev.preventDefault(); startGame();
      }
    });

    // Sicherheit: spätestens nach 30s automatisch starten (keine Blockade)
    setTimeout(()=>{ if(!started){ warn('Auto-Start (Timeout)'); startGame(); }}, 30000);
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', onReady, {once:true});
  }else{
    onReady();
  }
})();
