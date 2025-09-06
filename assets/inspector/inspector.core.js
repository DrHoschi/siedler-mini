/* ============================================================================
 * Inspector Core (split) – v18.11.1
 *  - Erstellt Overlay + Tabs + Slot-Registry
 *  - Stellt API für Submodule bereit (mount/getSlot/signal)
 *  - Kein DOM-Append außerhalb des Overlays
 * ========================================================================== */
(function(){
  'use strict';

  const VERSION = 'v18.11.1';
  const MOD = '[inspector.core]';

  // --- Slots-Registry & Core-API -------------------------------------------
  const __SLOTS__ = Object.create(null);
  const __MOUNTED__ = Object.create(null); // tabId -> unmount()

  window.__INSPECTOR_CORE__ = window.__INSPECTOR_CORE__ || {};
  window.__INSPECTOR_CORE__.api = {
    mount(tabId, renderFn){
      if (typeof renderFn !== 'function') return;
      // Lazy: renderFn wird erst beim ersten Aktivieren ausgeführt
      __MOUNTED__[tabId] = null;
      // Wir rufen renderFn beim ersten ShowTab(tabId) auf.
      __ON_DEMAND_RENDER__[tabId] = renderFn;
    },
    getSlot(name){ return __SLOTS__[name] || null; },
    signal(name,payload){ 
      try{ document.dispatchEvent(new CustomEvent('ins:'+name,{detail:payload})); }catch(_){}
    },
    version: VERSION
  };

  // On-demand Registry der Tab-Renderer
  const __ON_DEMAND_RENDER__ = Object.create(null);

  // --- DOM aufbauen ---------------------------------------------------------
  const root = document.createElement('div');
  root.id = 'inspector';
  const wrap = document.createElement('div');
  wrap.className = 'ins-wrap';

  const panel = document.createElement('div');
  panel.className = 'ins-panel';

  // Header
  const head = document.createElement('div');
  head.className = 'ins-head';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'ins-title';
  const title = document.createElement('div');
  title.textContent = 'Inspector';
  const ver = document.createElement('div');
  ver.className = 'ins-ver';
  ver.textContent = VERSION;
  titleWrap.append(title, ver);

  const tabs = document.createElement('div');
  tabs.className = 'ins-tabs';

  const btnClose = document.createElement('button');
  btnClose.className = 'ins-close';
  btnClose.type = 'button';
  btnClose.textContent = 'Schließen';
  btnClose.addEventListener('click', close);

  head.append(titleWrap, tabs, btnClose);

  // Body (+ Pane-Container)
  const body = document.createElement('div');
  body.className = 'ins-body';

  // Footer
  const foot = document.createElement('div');
  foot.className = 'ins-foot';
  const footLeft = document.createElement('div');
  footLeft.className = 'muted';
  footLeft.textContent = 'Inspector ' + VERSION;
  foot.append(footLeft);

  panel.append(head, body, foot);
  wrap.append(panel);
  root.append(wrap);
  document.body.appendChild(root);

  // --- Tabs & Panes ---------------------------------------------------------
  const TAB_DEF = [
    { id:'logs',  label:'Logs'  },
    { id:'build', label:'Build' },
    { id:'paths', label:'Pfade' },
    { id:'tests', label:'Tests' },
  ];

  const panes = Object.create(null);

  TAB_DEF.forEach(def=>{
    const t = document.createElement('button');
    t.className = 'ins-tab';
    t.type = 'button';
    t.dataset.tab = def.id;
    t.textContent = def.label.toUpperCase();
    t.addEventListener('click', ()=> showTab(def.id));
    tabs.appendChild(t);

    const pane = document.createElement('div');
    pane.className = `ins-pane ins-pane-${def.id}`;
    pane.style.display = 'none';
    pane.setAttribute('role','tabpanel');

    // Slots je nach Tab
    if (def.id === 'logs'){
      pane.innerHTML = `
        <div id="ins-logs-controls" class="slot-logs-controls"></div>
        <div id="ins-logs-view" class="slot-logs-view"></div>
      `;
      __SLOTS__['logs-controls'] = pane.querySelector('#ins-logs-controls');
      __SLOTS__['logs-view']     = pane.querySelector('#ins-logs-view');
    }else{
      // Ein leerer Container für Submodule, sie können beliebige Strukturen einfügen
      const host = document.createElement('div');
      host.className = `slot-${def.id}-host`;
      pane.appendChild(host);
      __SLOTS__[`${def.id}-host`] = host;
    }

    panes[def.id] = pane;
    body.appendChild(pane);
  });

  // --- Helpers --------------------------------------------------------------
  function activateTabButton(id){
    tabs.querySelectorAll('.ins-tab').forEach(b=>{
      b.classList.toggle('active', b.dataset.tab === id);
    });
  }

  function showTab(id){
    // Sichtbarkeit
    Object.keys(panes).forEach(k=>{
      panes[k].style.display = (k===id) ? 'flex' : 'none';
      panes[k].style.flexDirection = 'column';
      panes[k].style.gap = '10px';
      panes[k].style.minHeight = '0'; // wichtig für Scrollinhalte
    });
    activateTabButton(id);

    // Erstes Mount, wenn noch nicht passiert
    if (__MOUNTED__[id] === null && typeof __ON_DEMAND_RENDER__[id] === 'function'){
      const unmount = __ON_DEMAND_RENDER__[id]();
      __MOUNTED__[id] = typeof unmount === 'function' ? unmount : undefined;
    }
  }

  // --- Public API (Bridge) --------------------------------------------------
  window.__INSPECTOR_API__ = window.__INSPECTOR_API__ || {};
  window.__INSPECTOR_API__.open = open;
  window.__INSPECTOR_API__.close = close;
  window.__INSPECTOR_API__.toggle = toggle;

  function open(){
    if (root.style.display === 'block') return;
    root.style.display = 'block';
    document.body.classList.add('inspector-open');
    try{ window.dispatchEvent(new CustomEvent('cb:inspector-open')); }catch(_){}
    showTab('logs'); // Default-Tab
  }
  function close(){
    if (root.style.display !== 'block') return;
    root.style.display = 'none';
    document.body.classList.remove('inspector-open');
    try{ window.dispatchEvent(new CustomEvent('cb:inspector-close')); }catch(_){}
  }
  function toggle(force){
    const willOpen = (force==null) ? (root.style.display!=='block') : !!force;
    willOpen ? open() : close();
  }

  // Kleines Diagnose-Badge (nur beim ersten Page-Load, wenn API noch nicht verdrahtet war)
  setTimeout(()=>{
    try{
      (window.CBLog?.info||console.log)(`${MOD} bereit (${VERSION})`);
    }catch(_){}
  },0);
})();
// === Height-Safety für Mobile/iOS (einmal setzen & bei Resize aktualisieren)
(function(){
  const root = document.getElementById('inspector');
  if(!root) return;

  function applyVH(){
    // reale Viewport-Höhe (iOS berücksichtigt Safe-Area in CSS schon via env())
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    root.style.setProperty('--ins-vh', vh + 'px');
  }
  applyVH();
  window.addEventListener('resize', applyVH, {passive:true});
})();
