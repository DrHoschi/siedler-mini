/* ============================================================================
 * ui/inspector/inspector.ensure-host.js
 * Stellt sicher, dass ein Inspector-Overlay existiert (id="inspector")
 * – erzeugt minimalen DOM + Close-Button + Slots, falls nicht vorhanden.
 * – ergänzt open/close/toggle API nur, wenn sie fehlt.
 * ========================================================================== */
(function(){
  'use strict';
  const LOG = (window.CBLog?.info||console.info).bind(console,'[insp-host]');

  function createHost(){
    // Grundgerüst
    const wrap = document.createElement('div');
    wrap.id = 'inspector';
    wrap.setAttribute('aria-hidden','true');
    wrap.style.display = 'none'; // geschlossen
    wrap.innerHTML = `
      <div class="insp-frame">
        <div class="insp-header">
          <div class="insp-tabs" data-slot="tabs">
            <button class="insp-tab" data-tab="logs">Logs</button>
            <button class="insp-tab" data-tab="build">Build</button>
            <button class="insp-tab" data-tab="paths">Pfade</button>
            <button class="insp-tab" data-tab="res">Ress.</button>
            <button class="insp-tab" data-tab="tests">Tests</button>
          </div>
          <button class="insp-close" type="button" title="Schließen">Schließen</button>
        </div>
        <div class="insp-content" data-slot="view">
          <div data-slot="logs-view"></div>
          <div data-slot="build-view" hidden></div>
          <div data-slot="paths-view" hidden></div>
          <div data-slot="res-view" hidden></div>
          <div data-slot="tests-view" hidden></div>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    // Tabs rudimentär schalten (damit erstmal was passiert)
    const tabs = wrap.querySelector('[data-slot="tabs"]');
    const views = {
      logs: wrap.querySelector('[data-slot="logs-view"]'),
      build: wrap.querySelector('[data-slot="build-view"]'),
      paths: wrap.querySelector('[data-slot="paths-view"]'),
      res: wrap.querySelector('[data-slot="res-view"]'),
      tests: wrap.querySelector('[data-slot="tests-view"]'),
    };
    function show(tab){
      Object.entries(views).forEach(([k,el])=>{
        if(!el) return;
        el.hidden = (k!==tab);
      });
      tabs.querySelectorAll('.insp-tab').forEach(b=>{
        b.classList.toggle('active', b.dataset.tab===tab);
      });
      // Broadcast für deine echten Inhalte:
      window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab } }));
    }
    tabs.addEventListener('click', (e)=>{
      const b = e.target.closest('.insp-tab'); if(!b) return;
      show(b.dataset.tab);
    });

    // Close-Button
    wrap.querySelector('.insp-close')?.addEventListener('click', ()=> toggle(false));

    // Öffnen/Schließen (nur ergänzen, wenn deine API fehlt)
    const insp = (window.Inspector ||= {});
    if (typeof insp.open !== 'function' || typeof insp.close !== 'function' || typeof insp.toggle !== 'function'){
      function setOpen(on){
        wrap.classList.toggle('open', !!on);
        wrap.style.display       = on ? 'block' : 'none';
        wrap.style.visibility    = on ? 'visible' : 'hidden';
        wrap.style.opacity       = on ? '1' : '0';
        wrap.style.pointerEvents = on ? 'auto' : 'none';
        wrap.setAttribute('aria-hidden', on ? 'false' : 'true');
        document.body.classList.toggle('inspector-open', !!on);
        if(on) show('logs');
      }
      function open(tab){ setOpen(true); if(tab) show(tab); }
      function close(){ setOpen(false); }
      function toggle(v){ setOpen(typeof v==='boolean' ? v : wrap.style.display==='none'); }
      if(typeof insp.open!=='function') insp.open = open;
      if(typeof insp.close!=='function') insp.close = close;
      if(typeof insp.toggle!=='function') insp.toggle = toggle;
    }

    // Signal
    setTimeout(()=> window.dispatchEvent(new Event('inspector:ready')), 0);
    LOG('Host erzeugt + API ergänzt');
    return wrap;
  }

  function start(){
    const exist = document.getElementById('inspector')
               || document.getElementById('inspector-overlay');
    if(!exist){ createHost(); }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  }else{
    start();
  }
})();
