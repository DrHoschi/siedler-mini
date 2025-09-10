// Neue Siedler – Start-Panel v17.8.6
(function(){
  const root = document.getElementById('start-panel');
  if(!root){ return; }

  const $ = (sel) => root.querySelector(sel);
  const btnNew   = $('#btnStartNew');
  const btnRes   = $('#btnStartResume');
  const btnReset = $('#btnStartReset');
  const btnFs    = $('#btnStartFullscreen');

  // Kartensteuerung
  function hideStartPanel(){
    // nicht hart entfernen; erst weich ausblenden und dann Element löschen
    root.classList.add('is-hidden');
    setTimeout(()=> root.remove(), 400);
  }

  function dispatchGameStart(){
    // kompatibel zum existierenden Bootstrapping
    window.dispatchEvent(new CustomEvent('cb:game-start'));
    (window.CBLog?.ok || console.log)('[ui-start] cb:game-start dispatcht');
  }

  // Aktionen
  btnNew?.addEventListener('click', ()=>{
    (window.CBLog?.info||console.log)('[ui-start] Start klick (Neues Spiel)');
    dispatchGameStart();
    hideStartPanel();
  });

  btnRes?.addEventListener('click', ()=>{
    (window.CBLog?.info||console.log)('[ui-start] Weiterspielen');
    dispatchGameStart(); // später: echten Resume-Hook nutzen
    hideStartPanel();
  });

  btnReset?.addEventListener('click', ()=>{
    (window.CBLog?.info||console.log)('[ui-start] Reset angefordert');
    try{ window.dispatchEvent(new CustomEvent('tests:reset-world')); }catch(_){}
  });

  btnFs?.addEventListener('click', async ()=>{
    try{
      if (!document.fullscreenElement){
        await document.documentElement.requestFullscreen();
      }else{
        await document.exitFullscreen();
      }
    }catch(e){ (console.warn||console.log)('Fullscreen failed', e); }
  });

  // Sicherheit: Beim ersten Tap irgendwo auf den Screen -> Fokus ins Spiel
  window.addEventListener('pointerdown', ()=> {
    try{ document.getElementById('game')?.focus({preventScroll:true}); }catch(_){}
  }, { once:true });

  (window.CBLog?.ok||console.log)('[ui-start] geladen (v17.8.6)');
})();
