/* ============================================================================
 * Inspector Core – v18.13.5
 *  - Baut Overlay, Header, Tabs und definierte Slots
 *  - Exponiert eine kleine Core-API für Tab-Module
 *  - Robuste Fallbacks, keine body-Duplikate
 *  - Keine Auto-Open-Logik (öffnet nur über GameUI / Button)
 * ========================================================================== */
(function () {
  'use strict';

  const MOD = '[inspector.core]';
  const VER = 'v18.13.5';

  // Sanfte Logger
  const ok   = (...a)=> (window.CBLog?.ok   || console.log).call(console, MOD, ...a);
  const warn = (...a)=> (window.CBLog?.warn || console.warn).call(console, MOD, ...a);

  // --- interner State -------------------------------------------------------
  let rootEl   = null;   // #inspector
  let wrapEl   = null;   // .ins-wrap
  let panelEl  = null;   // .ins-panel
  let bodyEl   = null;   // .ins-body
  let footEl   = null;   // .ins-foot
  let tabs = [
    { id:'logs',      title:'Logs' },
    { id:'resources', title:'Ressourcen' },
    { id:'paths',     title:'Pfade' },
    { id:'tests',     title:'Tests' },
  ];
  let activeTab = 'logs';

  // Slot-Map: pro Tab definierte Slot-Container
  // (Die Module mounten ausschließlich IN diese Slots.)
  const SLOT_DEFS = {
    logs:      ['logs-controls','logs-view'],
    resources: ['resources-controls','resources-view'],
    paths:     ['paths-controls','paths-view'],
    tests:     ['tests-controls','tests-view'],
  };

  // --- DOM-Bau --------------------------------------------------------------
  function ensureRoot() {
    // Verhindert Duplikate:
    let el = document.getElementById('inspector');
    if (el) {
      rootEl = el;
      return rootEl;
    }
    el = document.createElement('div');
    el.id = 'inspector';
    el.style.display = 'none'; // geschlossen starten
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    rootEl = el;
    return rootEl;
  }

  function buildSkeleton() {
    if (!rootEl) ensureRoot();
    rootEl.innerHTML = '';

    // Wrapper
    wrapEl = document.createElement('div');
    wrapEl.className = 'ins-wrap';

    // Panel
    panelEl = document.createElement('div');
    panelEl.className = 'ins-panel';

    // Header
    const head = document.createElement('div');
    head.className = 'ins-head';

    const title = document.createElement('div');
    title.className = 'ins-title';
    title.innerHTML = `<span>Inspector</span> <span class="ins-ver">${VER}</span>`;

    // Tabs
    const tabsRow = document.createElement('div');
    tabsRow.className = 'ins-tabs';
    tabs.forEach(t=>{
      const b = document.createElement('button');
      b.className = 'ins-tab';
      b.type = 'button';
      b.dataset.tab = t.id;
      b.textContent = t.title;
      if (t.id === activeTab) b.classList.add('active');
      b.addEventListener('click', ()=>switchTab(t.id));
      tabsRow.appendChild(b);
    });

    // Close
    const closeBtn = document.createElement('button');
    closeBtn.className = 'ins-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label','Schließen');
    closeBtn.addEventListener('click', close);

    head.appendChild(title);
    head.appendChild(tabsRow);
    head.appendChild(closeBtn);

    // Body (Tab-Fläche)
    bodyEl = document.createElement('div');
    bodyEl.className = 'ins-body';

    // Pro Tab ein Pane mit Slots
    Object.keys(SLOT_DEFS).forEach(tabId=>{
      const pane = document.createElement('div');
      pane.className = 'ins-pane';
      pane.dataset.tab = tabId;
      if (tabId === activeTab) pane.classList.add('active');

      SLOT_DEFS[tabId].forEach(slotName=>{
        const slot = document.createElement('div');
        // CSS-gerichtete Klasse und ID wie besprochen:
        slot.className = `slot-${slotName}`;
        slot.id = `ins-${slotName}`;
        pane.appendChild(slot);
      });

      bodyEl.appendChild(pane);
    });

    // Footer
    footEl = document.createElement('div');
    footEl.className = 'ins-foot';
    const muted = document.createElement('div');
    muted.className = 'muted';
    muted.textContent = 'Inspector bereit.';
    footEl.appendChild(muted);

    // Zusammensetzen
    panelEl.appendChild(head);
    panelEl.appendChild(bodyEl);
    panelEl.appendChild(footEl);

    wrapEl.appendChild(panelEl);
    rootEl.appendChild(wrapEl);
  }

  function switchTab(tabId) {
    if (!tabId || tabId === activeTab) return;
    activeTab = tabId;

    // Tabs umschalten
    rootEl.querySelectorAll('.ins-tab').forEach(b=>{
      b.classList.toggle('active', b.dataset.tab===tabId);
    });
    // Pane umschalten
    rootEl.querySelectorAll('.ins-pane').forEach(p=>{
      p.classList.toggle('active', p.dataset.tab===tabId);
    });

    // optional: Signal für Module
    try { api.signal('tab:changed', { tab: tabId }); } catch(_){}
  }

  // --- Open/Close -----------------------------------------------------------
  function open() {
    ensureRoot();
    if (!panelEl) buildSkeleton();
    if (rootEl.style.display !== 'flex') {
      rootEl.style.display = 'flex';
      rootEl.setAttribute('aria-hidden','false');
      document.body.classList.add('inspector-open');
      try { window.dispatchEvent(new CustomEvent('cb:inspector-open')); } catch(_){}
      ok('geöffnet (%s)', VER);
    }
  }

  function close() {
    if (!rootEl) return;
    if (rootEl.style.display !== 'none') {
      rootEl.style.display = 'none';
      rootEl.setAttribute('aria-hidden','true');
      document.body.classList.remove('inspector-open');
      try { window.dispatchEvent(new CustomEvent('cb:inspector-close')); } catch(_){}
      ok('geschlossen');
    }
  }

  function toggle(force){
    const willOpen = (force == null)
      ? (rootEl?.style.display !== 'flex')
      : !!force;
    willOpen ? open() : close();
  }

  // --- Core-API für Module --------------------------------------------------
  const mounts = Object.create(null); // tabId -> unmountFn

  const api = {
    version: VER,
    getSlot(name) {
      if (!name) return null;
      return document.getElementById(`ins-${name}`);
    },
    mount(tabId, renderFn) {
      // Wird vom jeweiligen Modul aufgerufen (z.B. logs/tests/…)
      // renderFn soll UI in _eigene Slots_ bauen und optional eine unmount-Fn zurückgeben.
      try {
        if (typeof renderFn !== 'function') return;
        const un = renderFn();
        if (typeof un === 'function') mounts[tabId] = un;
      } catch(e) {
        warn('mount(%s) Fehler: %s', tabId, e?.message);
      }
    },
    signal(name, payload) {
      // leichte Broadcast-Hook, optional genutzt von Modulen
      try {
        // aktuell keine zentrale Logik; Platzhalter für spätere Erweiterungen
      } catch(_){}
    }
  };

  // Exponieren
  window.__INSPECTOR_CORE__ = { api };

  // GameUI-Hooks (von den FAB-Buttons genutzt)
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = toggle;
  window.GameUI.openInspector   = open;
  window.GameUI.closeInspector  = close;

  // Diagnose-Badge (nur wenn der Inspektor _nicht_ initialisiert würde – hier unnötig)
  // => absichtlich NICHT aktiv: Wir haben den Core ja geladen.

  ok('bereit %s', VER);
})();
