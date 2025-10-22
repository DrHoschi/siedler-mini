// ui/inspector/inspector.core.js – v18.14.6 (Baseline+Fix: Tab-Mapping & Views)
(function(){
  'use strict';
  const MOD='[inspector.core]';

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
    tabs : host.querySelector('[data-slot="tabs"]'),
    view : host.querySelector('[data-slot="view"]'),
    logs : host.querySelector('[data-slot="logs-view"]'),
    build: host.querySelector('[data-slot="build-view"]'),
    paths: host.querySelector('[data-slot="paths-view"]'),
    res  : host.querySelector('[data-slot="res-view"]'),
    tests: host.querySelector('[data-slot="tests-view"]')
  };
  const views = { logs: slots.logs, build: slots.build, paths: slots.paths, res: slots.res, tests: slots.tests };

  function normalizeId(id){
    if (!id) return 'logs';
    const s = String(id).toLowerCase().trim();
    if (s === 'ress.' || s === 'ress' || s === 'resources' || s === 'resource') return 'res';
    if (s === 'pfade' || s === 'path' || s === 'pfad' || s === 'paths') return 'paths';
    if (s === 'event' || s === 'events') return 'tests';
    return s;
  }

  const tabButtons = {};
  function addTabButton(id, label){
    const norm = normalizeId(id);
    if (tabButtons[norm]) { if (label) tabButtons[norm].textContent = label; return; }
    const b = document.createElement('button');
    b.className = 'insp-tab';
    b.textContent = label || norm;
    b.dataset.tab = norm;
    b.addEventListener('click', ()=> setActiveTab(norm));
    slots.tabs.appendChild(b);
    tabButtons[norm] = b;
  }

  function setActiveTab(id){
    const norm = normalizeId(id);
    Object.entries(views).forEach(([k,el])=>{ if (el) el.hidden = (k !== norm); });
    Object.entries(tabButtons).forEach(([k,b])=> b.classList.toggle('active', k === norm));
    window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab: norm } }));
  }

  const API = {
    open(tab){
      host.classList.add('open');
      host.style.display='block'; host.style.visibility='visible';
      host.style.opacity='1'; host.style.pointerEvents='auto';
      host.setAttribute('aria-hidden','false');
      document.body.classList.add('inspector-open');
      setActiveTab(tab || 'logs');
    },
    close(){
      host.classList.remove('open');
      host.style.display='none'; host.style.visibility='hidden';
      host.style.opacity='0'; host.style.pointerEvents='none';
      host.setAttribute('aria-hidden','true');
      document.body.classList.remove('inspector-open');
    },
    toggle(tab){ (getComputedStyle(host).display==='none') ? API.open(tab) : API.close(); },

    registerTab({id, title, onShow}){
      const norm = normalizeId(id);
      addTabButton(norm, title || id);
      const slot = views[norm] || slots.view;
      if (slot && typeof onShow === 'function'){ slot.innerHTML = ''; onShow(slot); }
    },
    mount(id,onShow){ API.registerTab({ id, title:id, onShow }); },
    getSlot(name){ return slots[name] || document.querySelector(`[data-slot="${name}"]`); }
  };

  window.Inspector = Object.assign(window.Inspector||{}, API);
  window.__INSPECTOR_CORE__ = { api: API };

  addTabButton('logs','Logs');
  addTabButton('build','Build');
  addTabButton('paths','Pfade');
  addTabButton('res','Ress.');
  addTabButton('tests','Tests');

  setActiveTab('logs');

  (window.CBLog?.info||console.info)(MOD,'bereit v%s','18.14.6');
  setTimeout(()=> window.dispatchEvent(new Event('inspector:ready')),0);
})();
