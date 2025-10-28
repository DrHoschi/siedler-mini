/* ============================================================================
 * Datei   : demo/button.bind.js
 * Version : v25.10.28-clean
 * Zweck   : Verdrahtung der Demo-Buttons (Start / Inspector)
 * Hinweise: Nur Demo-Glue – keine Spiel-Logik.
 * ========================================================================= */

const $ = (sel, root=document)=> root.querySelector(sel);
const emit = (name)=> dispatchEvent(new CustomEvent(name));

(function setupStartpanel(){
  const btnStart = $('#btn-start-game');
  const btnInsp  = $('#btn-open-inspector');

  btnStart?.addEventListener('click', ()=>{
    $('#start')?.setAttribute('hidden','');
    $('#game-root')?.removeAttribute('hidden');
    window.UIInspector?.log?.({type:'info', message:'Demo: Spielbereich sichtbar'});
  });

  btnInsp?.addEventListener('click', ()=>{
    if (window.UIInspector?.toggle){ window.UIInspector.toggle(); return; }
    emit('req:insp:toggle'); emit('req:inspector:toggle');
  });
})();

// ESC schließt
addEventListener('keydown', (ev)=>{
  if (ev.key==='Escape'){
    if (document.body.classList.contains('is-inspector') ||
        document.body.classList.contains('inspector-open')){
      window.UIInspector?.close?.();
      emit('req:insp:close'); emit('req:inspector:close');
    }
  }
});

// DOM ready: Host absichern (optional)
document.addEventListener('DOMContentLoaded', ()=>{
  if (!document.querySelector('#inspector')){
    const host = document.createElement('div'); host.id='inspector'; host.hidden=true;
    document.body.appendChild(host);
  }
  window.UIInspector?.log?.({type:'info', message:'Demo geladen (Inspector verfügbar)'});
});
