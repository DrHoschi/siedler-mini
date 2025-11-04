/* ============================================================================
 * Datei   : ui/ui-start.js
 * Version : v25.11.04
 * Zweck   : Startfenster (klein, 4 Buttons), Fade-Out direkt beim Start-Klick
 * Events  : cb:ui-ready, req:game:start, req:game:continue, req:game:reset
============================================================================ */
(function(){
  const LOG = (m)=> (window.CBLog?.ok || console.log)(`[ui-start] ${m}`);
  const root = document.getElementById("ui-root");

  // Panel
  const panel = document.createElement("div");
  panel.id = "start-panel";
  panel.innerHTML = `
    <div class="box wood-frame">
      <h1>Neue Siedler</h1>
      <div class="actions">
        <button id="btn-start">Spiel starten</button>
        <button id="btn-continue" title="Fortsetzen (falls Save vorhanden)">Weiterspielen</button>
        <button id="btn-reset" title="Alle Spielstände/Cache zurücksetzen">Reset</button>
        <button id="btn-fullscreen" title="Vollbild umschalten">Vollbild</button>
      </div>
    </div>
  `;
  root.appendChild(panel);

  // UI ready
  LOG("Startpanel bereit → cb:ui-ready");
  window.dispatchEvent(new CustomEvent("cb:ui-ready"));

  // Helper: Fullscreen (iOS Safari tolerant)
  async function toggleFullscreen(){
    const el = document.documentElement;
    try{
      if(!document.fullscreenElement){
        await (el.requestFullscreen?.() || el.webkitRequestFullscreen?.call(el));
      }else{
        await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
      }
    }catch(e){ LOG("ℹ️ Vollbild evtl. blockiert (iOS Restriktionen)."); }
  }

  // Start → sofort Body-Fade, Event raus, Panel weg
  panel.querySelector("#btn-start").addEventListener("click", ()=>{
    document.body.classList.add("is-started");     // sofort fade
    window.dispatchEvent(new CustomEvent("req:game:start"));
    panel.remove();
  });

  panel.querySelector("#btn-continue").addEventListener("click", ()=>{
    document.body.classList.add("is-started");     // gleicher Fade
    window.dispatchEvent(new CustomEvent("req:game:continue"));
    panel.remove();
  });

  panel.querySelector("#btn-reset").addEventListener("click", ()=>{
    try{ localStorage.clear(); }catch(e){}
    window.dispatchEvent(new CustomEvent("req:game:reset"));
    LOG("Reset ausgelöst");
  });

  panel.querySelector("#btn-fullscreen").addEventListener("click", toggleFullscreen);
})();

/* ============================================================================
 * Startpanel-Steuerung (sichtbar/unsichtbar) + Events
 * – Panel offen:   html.panel-open  (Splash sichtbar)
 * – Panel zu:      html (ohne Klasse)  (Splash weg)
 * ========================================================================== */
(function StartPanelController(){
  const html = document.documentElement;

  function openPanel(){
    const p = document.getElementById('start-panel');
    if (p) p.style.display = 'grid';
    html.classList.add('panel-open');
  }
  function closePanel(){
    const p = document.getElementById('start-panel');
    if (p) p.style.display = 'none';
    html.classList.remove('panel-open');
  }
  
 /* ===== Splash (Hintergrundbild) – verschwindet bei cb:ui-ready ===== */
    :root { --start-bg: url("assets/ui/start-bg.jpg"); } /* Pfad bei Bedarf anpassen */
    #start-splash{
      position: fixed; inset: 0;
      background: #111 center/cover no-repeat var(--start-bg);
      display: grid; place-items: center;
      z-index: 100; /* unter Startpanel */
    }

  // Buttons binden (IDs aus deinem Markup: Spiel starten, Weiterspielen, Reset, Vollbild)
  window.addEventListener('cb:ui-ready', ()=>{
    // Panel initial offen:
    openPanel();

    document.getElementById('btn-new')?.addEventListener('click', ()=>{
      // schließe Panel + starte Spiel
      closePanel();
      window.dispatchEvent(new CustomEvent('req:game:start', { detail:{ mode:'new' }}));
    });

    document.getElementById('btn-continue')?.addEventListener('click', ()=>{
      closePanel();
      window.dispatchEvent(new CustomEvent('req:game:start', { detail:{ mode:'continue' }}));
    });

    document.getElementById('btn-reset')?.addEventListener('click', ()=>{
      window.dispatchEvent(new CustomEvent('req:game:reset'));
    });

    document.getElementById('btn-full')?.addEventListener('click', ()=>{
      window.dispatchEvent(new CustomEvent('req:fullscreen:toggle'));
    });
  }, { once:true });

  // Wenn das Spiel startet → Panel zu, Splash weg
  window.addEventListener('cb:game:start', closePanel);

  // Wenn das Spiel pausiert wird → Panel wieder anzeigen
  window.addEventListener('cb:game:paused', openPanel);

  // Optional: ESC pausiert das Spiel → Panel wieder zeigen
  document.addEventListener('keydown', (ev)=>{
    if (ev.key === 'Escape') {
      window.dispatchEvent(new CustomEvent('req:game:pause'));
      // entweder Game reagiert und feuert cb:game:paused … oder wir öffnen direkt:
      setTimeout(()=>{ html.classList.contains('panel-open') || openPanel(); }, 50);
    }
  });
})();
