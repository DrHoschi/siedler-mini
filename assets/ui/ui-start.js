// ui-start.js  v17.8.8
// Zentriertes Start-Panel. Entfernt Legacy-Buttons oben links und
// blockiert NICHT die Map (kein Fullscreen-Overlay).

(function(){
  const log = (m,...a)=>(window.CBLog?.info||console.log)(`[ui-start] ${m}`,...a);

  // 1) Sicher: Reste/Legacy-Buttons entfernen (oben links)
  try{
    const legacySel = [
      '#btnStart','.ui-start-inline','.ui-start-legacy',
      '.start-inline','.start-debug'
    ].join(',');
    document.querySelectorAll(legacySel).forEach(n=>n.remove());
  }catch(_){}

  // 2) Panel schon vorhanden?
  if (document.querySelector('.ui-start')) {
    log('bereits initialisiert'); 
    return;
  }

  // 3) DOM aufbauen
  const wrap = document.createElement('div');
  wrap.className = 'ui-start';
  wrap.innerHTML = `
    <div class="ui-start-panel" role="dialog" aria-label="Startmenü">
      <div class="ui-start-head">Neue Siedler</div>
      <div class="ui-start-body">
        <button class="ui-start-btn is-primary" data-act="new">Neues Spiel</button>
        <button class="ui-start-btn" data-act="resume">Weiterspielen</button>
        <button class="ui-start-btn" data-act="reset">Reset</button>
        <button class="ui-start-btn" data-act="fs">Fullscreen</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  // 4) Aktionen
  const act = (name)=>{
    switch(name){
      case 'new':
        // Start-Panel sofort schließen
        hide();
        // Engine starten
        window.dispatchEvent(new CustomEvent('cb:game-start'));
        log('Start klick (Neues Spiel)');
        break;
      case 'resume':
        hide();
        window.dispatchEvent(new CustomEvent('cb:game-resume'));
        log('Start klick (Weiterspielen)');
        break;
      case 'reset':
        // Welt/State löschen (falls vorhanden)
        try{ localStorage.clear(); }catch(_){}
        hide();
        window.dispatchEvent(new CustomEvent('cb:game-reset'));
        log('Reset ausgeführt');
        break;
      case 'fs':
        try{
          const el = document.documentElement;
          if (!document.fullscreenElement) el.requestFullscreen?.();
          else document.exitFullscreen?.();
        }catch(e){ console.warn('[ui-start] Fullscreen failed', e); }
        break;
    }
  };

  wrap.addEventListener('click', (ev)=>{
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    act(b.getAttribute('data-act'));
  });

  function hide(){
    wrap.style.display = 'none';
    // Kleiner Fokus-Nudge auf Canvas, damit iOS den Scroll nicht festhält
    try{ document.getElementById('game')?.focus?.(); }catch(_){}
    (window.CBLog?.ok||console.log)('[ui-start] Start-UI geschlossen (v17.8.8).');
  }

  (window.CBLog?.ok||console.log)('[ui-start] geladen (v17.8.8)');
})();
