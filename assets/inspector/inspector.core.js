/* ============================================================================
 * Datei: assets/inspector/inspector.core.js
 * Projekt: Siedler-Mini
 * Version: v18.13.0
 *
 * Zweck:
 *  - Zentrales Overlay (ein Fenster, keine Fallback-Duplikate)
 *  - Tabs: Logs / Tests / Ressourcen / Pfade
 *  - Slot-API für Split-Module (logs/tests/resources/paths)
 *  - Public API auf window.__INSPECTOR_API__ (open/close/toggle)
 *
 * Events:
 *  - sendet:   cb:inspector-open / cb:inspector-close / cb:inspector-tab
 *  - empfängt: (keine Pflicht)
 *
 * Abhängigkeiten:
 *  - CSS: assets/inspector/inspector.css
 *  - Split-Module registrieren sich via core.api.mount(tabId, renderFn)
 * ========================================================================= */
(function(){
  'use strict';

  if (window.__INSPECTOR_CORE__) return; // Doppel-Init verhindern

  const MOD = '[inspector.core]';
  const VER = 'v18.13.0';
  const log = (...a)=> (window.CBLog?.info || console.log)(MOD, ...a);

  // ---- DOM erstellen -------------------------------------------------------
  const root = document.createElement('div');
  root.id = 'inspector';
  root.style.display = 'none'; // wird bei open() auf flex gesetzt
  root.innerHTML = `
    <div class="ins-wrap">
      <div class="ins-panel" role="dialog" aria-modal="true" aria-label="Inspector">
        <div class="ins-head">
          <div class="ins-title">
            <span>Inspector</span>
            <span class="ins-ver">${VER}</span>
          </div>
          <div class="ins-tabs" role="tablist" aria-label="Inspector Tabs">
            <button class="ins-tab active" data-tab="logs" aria-selected="true" role="tab">Logs</button>
            <button class="ins-tab" data-tab="tests" role="tab">Tests</button>
            <button class="ins-tab" data-tab="resources" role="tab">Ressourcen</button>
            <button class="ins-tab" data-tab="paths" role="tab">Pfade</button>
          </div>
          <button class="ins-close" aria-label="Schließen"></button>
        </div>

        <div class="ins-body">
          <!-- Pane: LOGS -->
          <section class="ins-pane active" data-pane="logs" role="tabpanel" aria-labelledby="tab-logs">
            <div class="slot-logs-controls" id="ins-logs-controls"></div>
            <div class="slot-logs-view" id="ins-logs-view"></div>
          </section>

          <!-- Pane: TESTS -->
          <section class="ins-pane" data-pane="tests" role="tabpanel" aria-labelledby="tab-tests">
            <div class="slot-tests" id="ins-tests"></div>
          </section>

          <!-- Pane: RESSOURCEN -->
          <section class="ins-pane" data-pane="resources" role="tabpanel" aria-labelledby="tab-resources">
            <div class="slot-res" id="ins-res"></div>
          </section>

          <!-- Pane: PFADE -->
          <section class="ins-pane" data-pane="paths" role="tabpanel" aria-labelledby="tab-paths">
            <div class="slot-paths" id="ins-paths"></div>
          </section>
        </div>

        <div class="ins-foot">
          <span class="muted">© Inspector – Siedler-Mini</span>
        </div>
      </div>
    </div>`;
  document.body.appendChild(root);

  // ---- State ---------------------------------------------------------------
  const el = {
    root,
    tabs: Array.from(root.querySelectorAll('.ins-tab')),
    panes: Array.from(root.querySelectorAll('.ins-pane')),
    btnClose: root.querySelector('.ins-close'),
  };

  let currentTab = 'logs';
  let isOpen = false;

  // ---- Tab-Steuerung -------------------------------------------------------
  function setTab(name){
    currentTab = name;
    el.tabs.forEach(b=>{
      const on = b.dataset.tab === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    el.panes.forEach(p=>{
      p.classList.toggle('active', p.dataset.pane === name);
    });
    // Event an Außenwelt
    try{ window.dispatchEvent(new CustomEvent('cb:inspector-tab', { detail:{ tab:name }})); }catch(_){}
  }

  el.tabs.forEach(btn=>{
    btn.addEventListener('click', ()=> setTab(btn.dataset.tab));
  });

  // ---- Öffnen/Schließen ----------------------------------------------------
  function open(){
    if (isOpen) return;
    isOpen = true;
    document.body.classList.add('inspector-open');
    el.root.style.display = 'flex';
    setTab(currentTab || 'logs');
    try{ window.dispatchEvent(new Event('cb:inspector-open')); }catch(_){}
  }
  function close(){
    if (!isOpen) return;
    isOpen = false;
    document.body.classList.remove('inspector-open');
    el.root.style.display = 'none';
    try{ window.dispatchEvent(new Event('cb:inspector-close')); }catch(_){}
  }
  function toggle(force){
    (force == null ? !isOpen : !!force) ? open() : close();
  }

  el.btnClose.addEventListener('click', close);

  // ESC schließt
  window.addEventListener('keydown', (ev)=>{
    if (!isOpen) return;
    if (ev.key === 'Escape') close();
  });

  // ---- Slot-API für Split-Module ------------------------------------------
  const mounts = new Map(); // tabId -> unmount()
  const api = {
    mount(tabId, renderFn){
      // Aufrufen, sobald Tab das erste Mal sichtbar wird
      if (typeof renderFn !== 'function') return;
      // Lazy: sofort mounten, aber Pane existiert bereits
      const unmount = renderFn();
      mounts.set(tabId, (typeof unmount === 'function') ? unmount : null);
      return api;
    },
    getSlot(name){
      // unterstützte IDs (siehe Markup)
      switch(name){
        case 'logs-controls': return document.getElementById('ins-logs-controls');
        case 'logs-view':     return document.getElementById('ins-logs-view');
        case 'tests':         return document.getElementById('ins-tests');
        case 'resources':     return document.getElementById('ins-res');
        case 'paths':         return document.getElementById('ins-paths');
        default: return document.getElementById(name) || null;
      }
    },
    signal(name, payload){
      // einfache Verteilstelle, falls ein Modul anderen informieren will
      try{ window.dispatchEvent(new CustomEvent(`ins:${name}`, { detail: payload })); }catch(_){}
    }
  };

  // ---- Externes API bereitstellen -----------------------------------------
  window.__INSPECTOR_CORE__ = { api, version: VER };
  window.__INSPECTOR_API__  = { open, close, toggle };

  // Diagnose
  log('bereit', VER);

  // NICHT auto-openen!
})();
