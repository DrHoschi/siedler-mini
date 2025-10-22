// ui/inspector/inspector.core.js – v18.14.5 (Baseline)
(function(){
  'use strict';
  const MOD='[inspector.core]';

  // Host erzeugen (wenn nicht vorhanden)
  function ensureHost(){
    let el = document.getElementById('inspector');
    if (el) return el;
    el = document.createElement('div'); el.id='inspector'; el.setAttribute('aria-hidden','true');
    el.innerHTML = `
      <div class="insp-frame">
        <div class="insp-header">
          <div class="insp-tabs" data-slot="tabs"></div>
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
    el.querySelector('.insp-close').addEventListener('click', ()=> API.close());
    return el;
  }

  const host = ensureHost();
  const slots = {
    tabs: host.querySelector('[data-slot="tabs"]'),
    view: host.querySelector('[data-slot="view"]'),
    logs: host.querySelector('[data-slot="logs-view"]'),
    build: host.querySelector('[data-slot="build-view"]'),
    paths: host.querySelector('[data-slot="paths-view"]'),
    res: host.querySelector('[data-slot="res-view"]'),
    tests: host.querySelector('[data-slot="tests-view"]')
  };

  // Tab-Header Helper
  const tabButtons = {};
  function addTabButton(id, label){
    if (tabButtons[id]) return;
    const b = document.createElement('button');
    b.className='insp-tab'; b.textContent=label; b.dataset.tab=id;
    b.addEventListener('click', ()=> setActiveTab(id));
    slots.tabs.appendChild(b);
    tabButtons[id]=b;
  }
  function setActiveTab(id){
    Object.entries(slots).forEach(([k,el])=>{
      if(!/-view$/.test(k)) return;
      const tab = k.replace('-view','');
      if (el) el.hidden = (tab !== id);
    });
    Object.entries(tabButtons).forEach(([k,b])=> b.classList.toggle('active', k===id));
    window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab:id } }));
  }

  // öffentliche API (kompatibel zum alten Split)
  const API = {
    open(tab){
      host.classList.add('open');
      host.style.display='block'; host.style.visibility='visible';
      host.style.opacity='1'; host.style.pointerEvents='auto';
      host.setAttribute('aria-hidden','false');
      document.body.classList.add('inspector-open');
      if (tab) setActiveTab(tab);
    },
    close(){
      host.classList.remove('open');
      host.style.display='none'; host.style.visibility='hidden';
      host.style.opacity='0'; host.style.pointerEvents='none';
      host.setAttribute('aria-hidden','true');
      document.body.classList.remove('inspector-open');
    },
    toggle(tab){ (getComputedStyle(host).display==='none') ? API.open(tab) : API.close(); },

    // Tab-Registration
    registerTab({id,title,onShow}){
      addTabButton(id, title||id);
      // initiales Rendern in den Slot
      const slot = slots[id] || slots.view;
      if (slot && typeof onShow==='function'){
        // leeren & rendern
        slot.innerHTML=''; onShow(slot);
      }
    },
    // Kompakte Helfer (wie früher)
    mount(id,onShow){ API.registerTab({ id, title:id, onShow }); },
    getSlot(name){ return slots[name] || document.querySelector(`[data-slot="${name}"]`); }
  };

  // global verfügbar (alte Namen bleiben gültig)
  window.Inspector = Object.assign(window.Inspector||{}, API);
  window.__INSPECTOR_CORE__ = { api: API };

  // Standard-Tabs (Header) – kannst du anpassen/erweitern
  addTabButton('logs','Logs');
  addTabButton('build','Build');
  addTabButton('paths','Pfade');
  addTabButton('res','Ress.');
  addTabButton('tests','Tests');

  // Startzustand → Logs sichtbar
  setActiveTab('logs');

  (window.CBLog?.info||console.info)(MOD,'bereit v%s','18.14.5');
  setTimeout(()=> window.dispatchEvent(new Event('inspector:ready')),0);
})();
