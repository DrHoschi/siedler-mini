/* ============================================================================
 * Inspector Core – v18.12.3
 * - Overlay, Tabs, Slots-API
 * - Portrait: Tabs/Filter oben; Landscape: Sidebar links
 * - Öffnen/Schließen via Events:
 *     window.dispatchEvent(new Event('cb:inspector-open'))
 *     window.dispatchEvent(new Event('cb:inspector-close'))
 * - Exponiert: window.__INSPECTOR_CORE__.api: { mount(tab,fn), getSlot(name), signal(name,payload) }
 * ========================================================================== */
(function(){
  'use strict';

  const VER = 'v18.12.3';
  const MOD = '[inspector.core]';
  const log = (...a)=> (window.CBLog?.ok||console.log)(MOD, ...a);
  const warn = (...a)=> (window.CBLog?.warn||console.warn)(MOD, ...a);

  // --- Slots-Registry -------------------------------------------------------
  const __SLOTS__ = Object.create(null);
  const mounted = Object.create(null);

  // --- Root DOM -------------------------------------------------------------
  let root = document.getElementById('inspector');
  if (!root){
    root = document.createElement('div');
    root.id = 'inspector';
    document.body.appendChild(root);
  }

  // Build panel structure
  root.innerHTML = `
    <div class="ins-wrap">
      <div class="ins-panel">
        <div class="ins-head">
          <div class="ins-title">Inspector <span class="ins-ver">${VER}</span></div>
          <div class="ins-tabs" role="tablist" aria-label="Inspector Tabs">
            <button class="ins-tab" data-tab="logs">Logs</button>
            <button class="ins-tab" data-tab="build">Build</button>
            <button class="ins-tab" data-tab="paths">Pfade</button>
            <button class="ins-tab" data-tab="tests">Tests</button>
          </div>
          <button class="ins-close" aria-label="Schließen"></button>
        </div>
        <div class="ins-body">
          <aside class="ins-side" aria-label="Sidebar">
            <div class="ins-controls slot-logs-controls"></div>
          </aside>
          <main class="ins-main">
            <!-- Logs -->
            <section id="tab-logs" class="ins-pane active" role="tabpanel">
              <div id="ins-logs-controls" class="slot-logs-controls"></div>
              <div id="ins-logs-view" class="slot-logs-view"></div>
            </section>
            <!-- Build -->
            <section id="tab-build" class="ins-pane" role="tabpanel">
              <div id="ins-build" class="slot-build"></div>
            </section>
            <!-- Paths -->
            <section id="tab-paths" class="ins-pane" role="tabpanel">
              <div id="ins-paths" class="slot-paths"></div>
            </section>
            <!-- Tests -->
            <section id="tab-tests" class="ins-pane" role="tabpanel">
              <div id="ins-tests" class="slot-tests"></div>
            </section>
          </main>
        </div>
        <div class="ins-foot">
          <span class="muted">Tip: In Landscape stehen Tabs & Filter links als Sidebar.</span>
        </div>
      </div>
    </div>
  `;

  // Register slots
  __SLOTS__['logs-controls'] = root.querySelector('#ins-logs-controls');
  __SLOTS__['logs-view']     = root.querySelector('#ins-logs-view');
  __SLOTS__['build']         = root.querySelector('#ins-build');
  __SLOTS__['paths']         = root.querySelector('#ins-paths');
  __SLOTS__['tests']         = root.querySelector('#ins-tests');

  // --- API nach außen -------------------------------------------------------
  window.__INSPECTOR_CORE__ = window.__INSPECTOR_CORE__ || {};
  window.__INSPECTOR_CORE__.api = {
    mount(tabId, renderFn){
      if (typeof renderFn === 'function'){
        // Lazy wäre möglich; hier: sofort rendern
        mounted[tabId] = renderFn() || null;
      }
    },
    getSlot(name){ return __SLOTS__[name] || null; },
    signal(name, payload){
      try{
        document.dispatchEvent(new CustomEvent('ins:'+name, { detail: payload||null }));
      }catch(_){}
    }
  };

  // --- Open/Close + Tab-Switch ---------------------------------------------
  const btnClose = root.querySelector('.ins-close');
  const tabBtns  = Array.from(root.querySelectorAll('.ins-tab'));
  const panes    = {
    logs:  root.querySelector('#tab-logs'),
    build: root.querySelector('#tab-build'),
    paths: root.querySelector('#tab-paths'),
    tests: root.querySelector('#tab-tests'),
  };

  function setOpen(on){
    root.style.display = on ? 'flex' : 'none';
    document.body.classList.toggle('inspector-open', !!on);
    if (on){
      layoutUpdate();
      try{ window.dispatchEvent(new Event('cb:inspector-open')); }catch(_){}
      log('geöffnet', VER);
    }else{
      try{ window.dispatchEvent(new Event('cb:inspector-close')); }catch(_){}
      log('geschlossen');
    }
  }

  function activateTab(id){
    Object.keys(panes).forEach(key=>{
      panes[key].classList.toggle('active', key===id);
      tabBtns.find(b=>b.dataset.tab===key)?.classList.toggle('active', key===id);
    });
    layoutUpdate();
  }

  // Events
  btnClose.addEventListener('click', ()=> setOpen(false));
  tabBtns.forEach(b=> b.addEventListener('click', ()=> activateTab(b.dataset.tab)));

  window.addEventListener('cb:inspector-open', ()=> setOpen(true));
  window.addEventListener('cb:inspector-close',()=> setOpen(false));

  // NICHT automatisch öffnen!
  setOpen(false);

  // --- Layout Umschaltung (Portrait/Landscape) ------------------------------
  function layoutUpdate(){
    const land = window.innerWidth > window.innerHeight;
    root.classList.toggle('ins-land', land);
    // In Landscape: Filter der Logs zusätzlich in Sidebar spiegeln
    try{
      const side = root.querySelector('.ins-side .slot-logs-controls');
      const top  = root.querySelector('#ins-logs-controls');
      // Controls in beiden Bereichen sichtbar halten → klonen
      side.innerHTML = ''; if (top && top.firstChild) side.appendChild(top.firstChild.cloneNode(true));
    }catch(_){}
  }
  window.addEventListener('resize', layoutUpdate, {passive:true});
  window.addEventListener('orientationchange', layoutUpdate);

  log('bereit', VER);
})();
