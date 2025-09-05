/* ============================================================================
 * assets/inspector/inspector.core.js — v18.10.8
 * Projekt: Siedler-Mini
 * Zweck:
 *   - Stabiles Inspector-Overlay (Vollbild, mobil-freundlich, safe-area)
 *   - Tabs-Gerüst (Logs / Build / Pfade / Tests), Outlets für Split-Module
 *   - API: window.__INSPECTOR_API__ { open, close, toggle, selectTab(id) }
 *
 * WICHTIG:
 *   - Dieses File enthält KEINE Logik zum Füllen der Tabs.
 *     Das machen die Split-Module (z.B. inspector.logs.js) über die Outlets.
 *   - IDs und Struktur sind stabil: #inspector, #insp-tabs, #insp-body, …
 *   - Fallback-tauglich: zeigt sofort ein lauffähiges Panel an.
 *
 * Events:
 *   - dispatchEvent('cb:inspector-open') / ('cb:inspector-close')
 *   - dispatchEvent('inspector:ready', { detail: { selectTab, getOutlets } })
 * Outlets:
 *   getOutlets() -> {
 *     root, head, tabsEl, bodyEl, footerEl,
 *     ensureTab(id), selectTab(id), // Utilities
 *     areas: {
 *       logs:   { tab, body, pre },           // #inspector-logs-pre
 *       build:  { tab, body },
 *       paths:  { tab, body },
 *       tests:  { tab, body }
 *     }
 *   }
 * ========================================================================== */
(function(){
  'use strict';

  const MOD = '[inspector.core]';
  const VER = 'v18.10.8';
  const ok   = (m,...a)=> (window.CBLog?.info||console.log)(`${MOD} ${m}`,...a);
  const warn = (m,...a)=> (window.CBLog?.warn||console.warn)(`${MOD} ${m}`,...a);

  // -------------------------- Element-Fabrik ---------------------------------
  function el(tag, cls, attrs){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs){
      for (const k in attrs){
        if (k === 'text') n.textContent = attrs[k];
        else if (k === 'html') n.innerHTML = attrs[k];
        else n.setAttribute(k, attrs[k]);
      }
    }
    return n;
  }

  // -------------------------- DOM Aufbauen -----------------------------------
  let root, surface, head, tabsEl, bodyEl, footerEl;
  let tabButtons = new Map();   // id -> button
  let tabBodies  = new Map();   // id -> container

  function buildDOM(){
    if (root && root.isConnected) return;

    root = el('div','inspector-root', { id:'inspector' });
    // (Wichtig: direkt unter Body)
    document.body.appendChild(root);

    // Oberfläche (zentriert / fullscreen)
    surface = el('div','inspector-surface');
    root.appendChild(surface);

    // Panel (scrollbar)
    const panel = el('div','inspector-panel');
    surface.appendChild(panel);

    // Header: Title + Close
    head = el('div','insp-head');
    const title = el('div','insp-title',{ text:'Inspector' });
    const ver   = el('div','insp-sub',  { text: VER });
    const sp    = el('div','insp-spacer');
    const btnX  = el('button','insp-close',{ 'aria-label':'Schließen', type:'button', text:'×' });
    btnX.addEventListener('click', ()=> API.close());
    head.appendChild(title);
    head.appendChild(ver);
    head.appendChild(sp);
    head.appendChild(btnX);
    panel.appendChild(head);

    // Tabs
    tabsEl = el('div','insp-tabs', { id:'insp-tabs', role:'tablist' });
    panel.appendChild(tabsEl);

    // Body
    bodyEl = el('div','insp-body',{ id:'insp-body' });
    panel.appendChild(bodyEl);

    // Footer (Buttons für Logs-Tools etc.)
    footerEl = el('div','insp-footer',{ id:'insp-footer' });
    panel.appendChild(footerEl);

    // Tabs definieren
    defineTab('logs',  'Logs');
    defineTab('build', 'Build');
    defineTab('paths', 'Pfade');
    defineTab('tests', 'Tests');

    // Logs-Tab mit einem <pre> vorbefüllen (Outlets für inspector.logs.js)
    const pre = el('pre','insp-logs-pre',{ id:'inspector-logs-pre' });
    ensureBody('logs').appendChild(pre);

    // Als offen/geschlossen steuern wir per Klasse .open
    root.classList.remove('open');
  }

  function defineTab(id, label){
    if (tabButtons.has(id)) return;
    const btn = el('button','insp-tab',{ 'data-tab':id, role:'tab', text: label });
    btn.addEventListener('click', ()=> selectTab(id));
    tabsEl.appendChild(btn);
    tabButtons.set(id, btn);

    const body = el('div','insp-tabbody',{ 'data-body':id });
    body.style.display = 'none';
    bodyEl.appendChild(body);
    tabBodies.set(id, body);
  }

  function ensureBody(id){
    if (!tabBodies.has(id)) defineTab(id, id);
    return tabBodies.get(id);
  }

  function selectTab(id){
    tabButtons.forEach((b, tid)=>{
      b.classList.toggle('active', tid===id);
      b.setAttribute('aria-selected', tid===id ? 'true':'false');
    });
    tabBodies.forEach((box, tid)=>{
      box.style.display = (tid===id ? 'block':'none');
    });
    return id;
  }

  // -------------------------- API & Outlets ----------------------------------
  function getOutlets(){
    return {
      root, head, tabsEl, bodyEl, footerEl,
      ensureTab, selectTab,
      areas:{
        logs:  { tab: tabButtons.get('logs'),  body: ensureBody('logs'),  pre: document.getElementById('inspector-logs-pre') },
        build: { tab: tabButtons.get('build'), body: ensureBody('build') },
        paths: { tab: tabButtons.get('paths'), body: ensureBody('paths') },
        tests: { tab: tabButtons.get('tests'), body: ensureBody('tests') },
      }
    };
  }

  function open(forceTab){
    buildDOM();
    root.classList.add('open');
    // Standard-Tab: logs
    selectTab(forceTab || 'logs');
    // Fokus/Scroll-Schutz
    try{ root.focus({ preventScroll:true }); }catch(_){}
    window.dispatchEvent(new CustomEvent('cb:inspector-open'));
    ok('geöffnet (%s)', VER);
  }

  function close(){
    buildDOM();
    root.classList.remove('open');
    window.dispatchEvent(new CustomEvent('cb:inspector-close'));
    ok('geschlossen');
  }

  function toggle(force){
    buildDOM();
    const willOpen = (force==null) ? !root.classList.contains('open') : !!force;
    willOpen ? open() : close();
  }

  const API = (window.__INSPECTOR_API__ = {
    open, close, toggle,
    selectTab: (id)=> selectTab(id)
  });

  // -------------------------- Bootstrap --------------------------------------
  // 1) Immer DOM bauen (sofort sichtbar & korrekt positioniert)
  buildDOM();

  // 2) Bridge anbinden (GameUI-Toggle nutzt unsere API)
  (function bindBridge(){
    try{
      window.GameUI = window.GameUI || {};
      if (!window.GameUI.toggleInspector) window.GameUI.toggleInspector = toggle;
      if (!window.GameUI.openInspector)   window.GameUI.openInspector   = open;
      if (!window.GameUI.closeInspector)  window.GameUI.closeInspector  = close;
    }catch(_){}
  })();

  // 3) „ready“ an Split-Module
  //    → z.B. inspector.logs.js kann hier seine Listener registrieren
  setTimeout(()=>{
    try{
      window.dispatchEvent(new CustomEvent('inspector:ready', {
        detail: { selectTab, getOutlets }
      }));
    }catch(_){}
  }, 0);

  ok('bereit (%s)', VER);
})();
