/* ============================================================================
 * Datei: assets/inspector/inspector.core.js
 * Projekt: Siedler-Mini
 * Version: v18.10.11
 *
 * Zweck:
 *  - Inspector-Overlay (Vollbild) mit Tabs (Logs/Build/Pfade/Tests)
 *  - Slot-Rendering-API für Modul-Tabs (keine body-SideEffects)
 *  - Öffnen/Schließen/Toggle via window.GameUI.* oder __INSPECTOR_API__
 *
 * Öffentliche APIs:
 * 1) window.__INSPECTOR_CORE__.api
 *    - mount(tabId, renderFn)      → Tab registrieren (renderFn → optional Unmount-Fn)
 *    - getSlot(name)               → Slot-Element (z.B. 'logs-controls', 'logs-view')
 *    - signal(name, payload?)      → Broadcast/Hooks (optional)
 *    - select(tabId)               → Tab aktivieren
 *
 * 2) window.__INSPECTOR_API__
 *    - open()/close()/toggle(force?)  → Overlay steuern, Events dispatchen
 *    - select(tabId)                  → Tab wechseln
 *
 * Events:
 *  - cb:inspector-open / cb:inspector-close
 *  - cb:inspector-ready (einmal nach Init)
 * ========================================================================== */
(function(){
  'use strict';

  var MOD='[inspector.core]';
  var VER='v18.10.11';
  var log = function(){ (window.CBLog?.info||console.log).apply(console, arguments); };

  if (window.__INSPECTOR_CORE__ && window.__INSPECTOR_CORE__.api) {
    log(MOD, 'bereits initialisiert', VER);
    return;
  }

  // ---- Root-Overlay erzeugen ------------------------------------------------
  var root = document.createElement('div');
  root.id = 'inspector';
  // Minimalstyles, damit das Panel IMMER sichtbar und oben liegt (CSS darf überschreiben)
  root.style.cssText = [
    'position:fixed','inset:0','z-index:2147483646','display:none',
    'background:rgba(12,18,15,.80)','backdrop-filter:blur(2px)'
  ].join(';');

  // Panel
  var panel = document.createElement('div');
  panel.className = 'ins-panel';
  panel.style.cssText = [
    'position:absolute','top:50%','left:50%','transform:translate(-50%,-50%)',
    'width:min(980px,94vw)','height:min(80vh,92vh)',
    'background:#161b18','border:1px solid rgba(255,255,255,.08)',
    'border-radius:12px','box-shadow:0 32px 96px rgba(0,0,0,.55)',
    'display:flex','flex-direction:column','color:#e5e7eb'
  ].join(';');

  // Header (Tabs + Close)
  var header = document.createElement('div');
  header.className = 'ins-header';
  header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.07)';

  var title = document.createElement('div');
  title.textContent = 'Inspector';
  title.style.cssText = 'font-weight:800;opacity:.9;margin-right:6px';

  var tabsBar = document.createElement('div');
  tabsBar.className = 'ins-tabs';
  tabsBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-left:auto';

  var btnClose = document.createElement('button');
  btnClose.textContent = 'Schließen';
  btnClose.className = 'ins-close';
  btnClose.style.cssText = 'margin-left:8px;border:none;border-radius:10px;padding:8px 12px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer';

  // Body (Tabs → Slots)
  var body = document.createElement('div');
  body.className = 'ins-body';
  body.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column';

  // Footer
  var footer = document.createElement('div');
  footer.className = 'ins-footer';
  footer.style.cssText = 'padding:8px 12px;border-top:1px solid rgba(255,255,255,.07);opacity:.8;font-size:12px';
  footer.textContent = 'v' + VER + ' — Siedler-Mini';

  panel.appendChild(header);
  panel.appendChild(body);
  panel.appendChild(footer);
  root.appendChild(panel);
  document.body.appendChild(root);

  // ---- Tabs + Slots ---------------------------------------------------------
  var TABS = ['logs','build','paths','tests'];
  var tabButtons = {};
  var currentTab = null;
  var mounts = Object.create(null);      // tabId -> renderFn
  var unmounts = Object.create(null);    // tabId -> unmountFn (optional)

  // Tab Buttons erstellen
  TABS.forEach(function(id){
    var b = document.createElement('button');
    b.dataset.tab = id;
    b.textContent = id.toUpperCase();
    b.className = 'ins-tab';
    b.style.cssText = 'border:none;border-radius:999px;padding:6px 12px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer';
    b.addEventListener('click', function(){ api.select(id); });
    tabsBar.appendChild(b);
    tabButtons[id] = b;
  });

  // Header zusammensetzen
  header.appendChild(title);
  header.appendChild(tabsBar);
  header.appendChild(btnClose);

  // Body-Slots (statische Slot-Container pro Tab)
  var slots = {}; // name->Element
  function mkTabPage(id){
    var page = document.createElement('div');
    page.id = 'ins-page-'+id;
    page.className = 'ins-page';
    page.style.cssText = 'flex:1;min-height:0;display:none;overflow:auto;padding:10px 12px';
    // pro Tab eigene Slots:
    if (id==='logs'){
      var c = document.createElement('div'); c.id='ins-logs-controls'; c.className='slot-logs-controls';
      var v = document.createElement('div'); v.id='ins-logs-view';     v.className='slot-logs-view';
      page.appendChild(c); page.appendChild(v);
      slots['logs-controls'] = c;
      slots['logs-view']     = v;
    } else {
      var g = document.createElement('div'); g.id='ins-'+id+'-body'; g.className='slot-'+id+'-body';
      g.textContent = '('+id+' – noch leer)';
      page.appendChild(g);
      slots[id+'-body'] = g;
    }
    return page;
  }
  var pages = {};
  TABS.forEach(function(id){
    var p = mkTabPage(id);
    pages[id] = p;
    body.appendChild(p);
  });

  // ---- API: Core ------------------------------------------------------------
  var api = {
    mount: function(tabId, renderFn){
      mounts[tabId] = renderFn;
      // Wenn gerade aktiv, remount:
      if (currentTab === tabId) {
        try { if (unmounts[tabId]) { unmounts[tabId](); } } catch(_){}
        unmounts[tabId] = (typeof renderFn==='function' ? renderFn() : null) || null;
      }
      return api;
    },
    getSlot: function(name){ return slots[name] || null; },
    signal: function(name, payload){
      // Broadcast-Hook (derzeit nur Deko)
      try { (window.CBLog?.info||console.log)('[inspector.core] signal', name, payload||''); } catch(_){}
    },
    select: function(tabId){
      if (!pages[tabId]) tabId = 'logs';
      // Seitenumschaltung
      Object.keys(pages).forEach(function(id){
        var on = (id===tabId);
        pages[id].style.display = on ? 'block' : 'none';
        tabButtons[id]?.classList?.toggle('active', on);
      });
      // Unmount previous
      if (currentTab && unmounts[currentTab]) {
        try { unmounts[currentTab](); } catch(_){}
        unmounts[currentTab] = null;
      }
      currentTab = tabId;
      // Mount new
      var fn = mounts[tabId];
      unmounts[tabId] = (typeof fn==='function' ? fn() : null) || null;
    }
  };

  window.__INSPECTOR_CORE__ = { api: api, version: VER };

  // ---- API: Overlay / Bridge ------------------------------------------------
  function open(){
    root.style.display = 'block';
    document.body.classList.add('inspector-open');
    try { window.dispatchEvent(new CustomEvent('cb:inspector-open')); } catch(_){}
  }
  function close(){
    root.style.display = 'none';
    document.body.classList.remove('inspector-open');
    try { window.dispatchEvent(new CustomEvent('cb:inspector-close')); } catch(_){}
  }
  function toggle(force){
    var willOpen = (force==null) ? (root.style.display==='none' || !root.style.display) : !!force;
    return willOpen ? open() : close();
  }
  function select(tabId){ return api.select(tabId); }

  var pub = (window.__INSPECTOR_API__ = window.__INSPECTOR_API__ || {});
  pub.open = open; pub.close = close; pub.toggle = toggle; pub.select = select;

  // Close-Button
  btnClose.addEventListener('click', close);

  // Marker + Default-Tab
  try { window.dispatchEvent(new CustomEvent('cb:inspector-ready',{detail:{version:VER}})); } catch(_){}
  api.select('logs'); // Standard: Logs

  log(MOD,'bereit',VER);
})();
