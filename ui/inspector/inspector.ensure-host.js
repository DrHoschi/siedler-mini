/* ui/inspector/inspector.ensure-host.js
 * Erzeugt #inspector + Minimal-Tabs/Slots, falls kein Host existiert.
 * Ergänzt Inspector.open/close/toggle nur, wenn sie fehlen.
 */
(function(){
  'use strict';
  const LOG=(window.CBLog?.info||console.info).bind(console,'[insp-host]');

  function makeHost(){
    const el=document.createElement('div');
    el.id='inspector';
    el.setAttribute('aria-hidden','true');
    el.style.display='none';
    el.innerHTML=`
      <div class="insp-frame">
        <div class="insp-header">
          <div class="insp-tabs" data-slot="tabs">
            <button class="insp-tab" data-tab="logs">Logs</button>
            <button class="insp-tab" data-tab="build">Build</button>
            <button class="insp-tab" data-tab="paths">Pfade</button>
            <button class="insp-tab" data-tab="res">Ress.</button>
            <button class="insp-tab" data-tab="tests">Tests</button>
          </div>
          <button class="insp-close" type="button">Schließen</button>
        </div>
        <div class="insp-content" data-slot="view">
          <div data-slot="logs-view"></div>
          <div data-slot="build-view" hidden></div>
          <div data-slot="paths-view" hidden></div>
          <div data-slot="res-view" hidden></div>
          <div data-slot="tests-view" hidden></div>
        </div>
      </div>`;
    document.body.appendChild(el);

    // Tabs minimal schalten + Event für deine echten Inhalte
    const tabs=el.querySelector('[data-slot="tabs"]');
    const views={
      logs: el.querySelector('[data-slot="logs-view"]'),
      build:el.querySelector('[data-slot="build-view"]'),
      paths:el.querySelector('[data-slot="paths-view"]'),
      res:  el.querySelector('[data-slot="res-view"]'),
      tests:el.querySelector('[data-slot="tests-view"]')
    };
    function show(tab){
      Object.entries(views).forEach(([k,v])=> v && (v.hidden=(k!==tab)));
      tabs.querySelectorAll('.insp-tab').forEach(b=> b.classList.toggle('active', b.dataset.tab===tab));
      window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab } }));
    }
    tabs.addEventListener('click', e=>{
      const b=e.target.closest('.insp-tab'); if(!b) return;
      show(b.dataset.tab);
    });
    el.querySelector('.insp-close')?.addEventListener('click', ()=>toggle(false));

    // API nur ergänzen, wenn nicht vorhanden
    const insp=(window.Inspector ||= {});
    function setOpen(on){
      el.classList.toggle('open', !!on);
      el.style.display = on?'block':'none';
      el.style.visibility = on?'visible':'hidden';
      el.style.opacity = on?'1':'0';
      el.style.pointerEvents = on?'auto':'none';
      el.setAttribute('aria-hidden', on?'false':'true');
      document.body.classList.toggle('inspector-open', !!on);
      if(on) show('logs');
    }
    function open(tab){ setOpen(true); if(tab) show(tab); }
    function close(){ setOpen(false); }
    function toggle(v){ setOpen(typeof v==='boolean' ? v : getComputedStyle(el).display==='none'); }

    if(typeof insp.open!=='function')   insp.open=open;
    if(typeof insp.close!=='function')  insp.close=close;
    if(typeof insp.toggle!=='function') insp.toggle=toggle;

    // Ready-Signal (für spätere Tabs)
    setTimeout(()=> window.dispatchEvent(new Event('inspector:ready')),0);
    LOG('Host erzeugt + API ggf. ergänzt');
  }

  function start(){
    const exists = document.getElementById('inspector') || document.getElementById('inspector-overlay');
    if(!exists) makeHost();
  }
  (document.readyState==='loading') ? document.addEventListener('DOMContentLoaded', start) : start();
})();
