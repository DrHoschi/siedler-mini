/* v17.8.7 – Start-Panel Logik
   - zentriertes Panel im Inspector-Stil
   - kein Vollbild-Overlay; Map bleibt sichtbar
   - sauberes Entfernen beim Start
   - cb:game-start wird dispatcht
   - Safety: style.css & alte Overlays entfernen
*/
(function(){
  const log = (window.CBLog?.ok || console.log);
  const warn = (window.CBLog?.warn || console.warn);

  // ---- Safety Sweep -------------------------------------------------------
  // 1) Uralte style.css (macht alles dunkel) entfernen, falls noch vorhanden.
  try{
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{
      const href = (link.getAttribute('href')||'').toLowerCase();
      if (/\bstyle\.css\b/.test(href)) {
        warn('[ui-start] Entferne altes style.css:', href);
        link.remove();
      }
    });
  }catch(_){}

  // 2) Eventuelle Blocker vom Inspector-Fallback weg.
  try{
    document.getElementById('inspector-fallback')?.remove();
  }catch(_){}

  // ---- DOM für Start-Panel ------------------------------------------------
  const root = document.createElement('div');
  root.className = 'ui-start';
  root.setAttribute('aria-label','Startmenü');

  const bg = document.createElement('div');
  bg.className = 'ui-start-bg';

  const panel = document.createElement('div');
  panel.className = 'ui-start-panel';

  panel.innerHTML = `
    <header>Neue Siedler</header>
    <div class="actions">
      <button id="actNew" class="primary">Neues Spiel</button>
      <button id="actContinue">Weiterspielen</button>
      <button id="actReset">Reset</button>
      <button id="actFullscreen">Fullscreen</button>
    </div>
  `;

  root.append(bg, panel);
  document.body.appendChild(root);

  // ---- Helpers ------------------------------------------------------------
  function closeStart(removeOnly=false){
    root.classList.add('hidden');
    // Fokus auf Spielfeld
    const cvs = document.getElementById('game');
    if (cvs) { try{ cvs.focus({preventScroll:true}); }catch(_){} }

    // Nach der Transition DOM aufräumen
    setTimeout(()=>{
      root.remove();
      // wirklich alles weg, was blockieren könnte
      try{ document.getElementById('inspector-fallback')?.remove(); }catch(_){}
      // Body-Klasse entfernen, falls von früher vorhanden
      document.body.classList.remove('start-open');
    }, 250);

    if (!removeOnly){
      // Das ist Dein Start-Signal für Bootstrap/Spiel
      window.dispatchEvent(new CustomEvent('cb:game-start'));
      log('[ui-start] cb:game-start dispatcht');
    }
  }

  // ---- Aktionen -----------------------------------------------------------
  panel.querySelector('#actNew') .addEventListener('click', ()=>{ log('[ui-start] Start klick (Neues Spiel)'); closeStart(false); });
  panel.querySelector('#actContinue').addEventListener('click', ()=>{ log('[ui-start] Start klick (Weiterspielen)'); closeStart(false); });
  panel.querySelector('#actReset').addEventListener('click', ()=>{
    try{ localStorage.clear(); }catch(_){}
    log('[ui-start] Reset – Speicher gelöscht');
  });
  panel.querySelector('#actFullscreen').addEventListener('click', async ()=>{
    try{
      if (document.fullscreenElement) { await document.exitFullscreen(); }
      else { await document.documentElement.requestFullscreen(); }
    }catch(e){ warn('[ui-start] Fullscreen failed', e); }
  });

  // Klick neben das Panel schließt nur das Panel (ohne Spielstart)
  bg.addEventListener('click', ()=> closeStart(true));

  // Markierung für FAB-Offsets o.ä.
  document.body.classList.add('start-open');

  log('[ui-start] geladen (v17.8.7)');
})();
