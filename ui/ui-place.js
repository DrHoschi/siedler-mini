/* ============================================================================
 * Datei   : ui/ui-place.js
 * Projekt : Neue Siedler
 * Version : v1.5.0 (2025-10-05)
 * Zweck   : Overlay mit ✓/✕ zum Bestätigen/Abbrechen der aktuellen Platzierung.
 * UI-Logik:
 *  - Mount bei erstem Gebrauch; bleibt bestehen (display none ↔ block).
 *  - Reagiert auf cb:place:preview und zeigt/positioniert die Buttons.
 *  - Sendet cb:place:confirm (gx,gy) / cb:place:cancel.
 * ============================================================================ */

(() => {
  const log = (...a)=>(window.CBLog?.ok||console.log)('[ui-place]',...a);

  let host=null, okBtn=null, cancelBtn=null;
  let last={ gx:-1, gy:-1, invalid:true, sx:0, sy:0, size:64 };

  function ensureMount(){
    if (host) return;
    host = document.createElement('div');
    host.id = 'ui-place-glue';
    host.style.position='absolute';
    host.style.left='0'; host.style.top='0';
    host.style.zIndex='100';
    host.style.pointerEvents='none';
    host.style.display='none';

    const wrap = document.createElement('div');
    wrap.style.position='absolute';
    wrap.style.pointerEvents='auto';
    wrap.style.display='flex';
    wrap.style.gap='8px';
    wrap.style.transform='translate(-50%, -100%)';

    okBtn = document.createElement('button');
    okBtn.className='ui-btn ok';
    okBtn.textContent='✓';
    okBtn.style.minWidth='40px'; okBtn.style.minHeight='40px';

    cancelBtn = document.createElement('button');
    cancelBtn.className='ui-btn cancel';
    cancelBtn.textContent='✕';
    cancelBtn.style.minWidth='40px'; cancelBtn.style.minHeight='40px';

    wrap.appendChild(okBtn);
    wrap.appendChild(cancelBtn);
    host.appendChild(wrap);

    const app = document.getElementById('app') || document.body;
    app.appendChild(host);

    okBtn.addEventListener('click', (e)=>{
      e.stopPropagation(); e.preventDefault();
      if (last.invalid) return;
      window.dispatchEvent(new CustomEvent('cb:place:confirm',{ detail:{ gx:last.gx, gy:last.gy } }));
    });
    cancelBtn.addEventListener('click', (e)=>{
      e.stopPropagation(); e.preventDefault();
      window.dispatchEvent(new CustomEvent('cb:place:cancel'));
    });

    log('mount ok');
  }

  function updatePos(){
    if (!host) return;
    // Buttons zentriert oberhalb der Ghost-Kachel
    const x = last.sx + last.size*0.5;
    const y = last.sy;
    host.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  window.addEventListener('cb:place:preview', (ev)=>{
    ensureMount();
    const d = ev.detail || {};
    // invalid → Buttons verstecken
    if (d.invalid){
      host.style.display='none';
      last.invalid=true;
      return;
    }
    last = {
      gx: d.gx|0, gy:d.gy|0, invalid:false,
      sx: +d.sx||0, sy:+d.sy||0, size:+d.size||64
    };
    updatePos();
    host.style.display='block';
  });

  // Beim Start Bauen-Select → Buttons erstmal ausblenden
  window.addEventListener('cb:build:select', ()=>{
    ensureMount();
    host.style.display='none';
  });

})();
