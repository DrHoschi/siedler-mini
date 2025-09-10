// ui-start.js — v17.8.8
(function(){
  const id = 'start-panel';
  /** Doppelte Inits verhindern */
  if (document.getElementById(id)?.dataset.ready === '1'){
    return;
  }

  // Grundgerüst (leicht, DOM bleibt klein)
  let wrap = document.getElementById(id);
  if (!wrap){
    wrap = document.createElement('div');
    wrap.id = id;
    wrap.className = 'ui-start';
    document.body.prepend(wrap);
  }
  wrap.dataset.ready = '1';

  // Background-Layer
  let bg = wrap.querySelector('.ui-start-bg');
  if (!bg){
    bg = document.createElement('div');
    bg.className = 'ui-start-bg';
    wrap.appendChild(bg);
  }

  // Panel
  let panel = wrap.querySelector('.ui-start-panel');
  if (!panel){
    panel = document.createElement('div');
    panel.className = 'ui-start-panel';
    panel.innerHTML = `
      <div class="ui-start-head">Neue Siedler</div>
      <div class="ui-start-actions">
        <button type="button" data-act="new">Neues Spiel</button>
        <button type="button" data-act="resume">Weiterspielen</button>
        <button type="button" data-act="reset">Reset</button>
        <button type="button" data-act="fs">Fullscreen</button>
      </div>`;
    wrap.appendChild(panel);
  }

  // Klicks (delegiert)
  panel.addEventListener('click', async (ev)=>{
    const btn = ev.target.closest('button[data-act]');
    if (!btn) return;

    const act = btn.dataset.act;
    if (act === 'new'){
      (window.CBLog?.info||console.log)('[ui-start] Start klick (Neues Spiel)');
      // Layer schließen
      wrap.classList.add('hidden');

      // Fokus auf Canvas (verhindert iOS-Scroll-Jump)
      const cv = document.getElementById('game');
      cv?.focus?.();

      // Event für Spielstart
      window.dispatchEvent(new CustomEvent('cb:game-start'));

    } else if (act === 'resume'){
      window.dispatchEvent(new CustomEvent('cb:resume'));
      wrap.classList.add('hidden');

    } else if (act === 'reset'){
      try{
        localStorage.clear();
        location.reload();
      }catch(_){}

    } else if (act === 'fs'){
      const el = document.documentElement;
      try{
        await (el.requestFullscreen?.() || el.webkitRequestFullscreen?.());
      }catch(e){ console.warn('[ui-start] Fullscreen failed', e); }
    }
  });

  (window.CBLog?.ok||console.log)('[ui-start] geladen (v17.8.8)');
})();
