/* ============================================================================
 * Datei    : ui/inspector/inspector.core.js
 * Projekt  : Neue Siedler – Inspector
 * Version  : v25.10.28-compat3
 * Zweck    : Inspector-Kern mit Voll-Kompatibilität (registerTab/mount Varianten)
 * ============================================================================ */
(function () {
  'use strict';

  // ---- Logs -----------------------------------------------------------------
  const MOD = '[insp-core]';
  const OK   = (...a) => (window.CBLog?.ok   || console.log ).call(console, MOD, ...a);
  const INF  = (...a) => (window.CBLog?.info || console.info).call(console, MOD, ...a);
  const WRN  = (...a) => (window.CBLog?.warn || console.warn).call(console, MOD, ...a);
  const ERR  = (...a) => (window.CBLog?.err  || console.error).call(console, MOD, ...a);

  // ---- State ----------------------------------------------------------------
  const STATE = {
    mounted : false,
    open    : false,
    host    : null,
    tabsEl  : null,
    viewsEl : null,
    tabs    : []   // {id,title,icon,render:fn}
  };
  const QUEUE = []; // Registrierungen bevor Overlay gemounted ist

  // ---- DOM Helpers ----------------------------------------------------------
  const $ = (s, sc=document) => sc.querySelector(s);
  function h(tag, attrs={}, children=[]) {
    const n = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) {
      if (k === 'class')            n.className = v;
      else if (k === 'text')        n.textContent = v;
      else if (k.startsWith('data-')) n.setAttribute(k, v);
      else                          n.setAttribute(k, v);
    }
    for (const c of [].concat(children)) n.appendChild(c);
    return n;
  }

  function ensureHost(){
    let host = $('#inspector');
    if (!host) {
      host = h('div', { id:'inspector', class:'inspector', 'data-version':'v25.10.28' }, [
        h('div', { class:'insp-tabs',  'data-slot':'tabs'  }),
        h('div', { class:'insp-content','data-slot':'views' })
      ]);
      document.body.appendChild(host);
      INF('Root erzeugt (#inspector)');
    }
    // Fallback-CSS (greift nur, wenn kein projektweites CSS vorhanden ist)
    if (!$('#insp-core-fallback-css')) {
      const css = `
        .inspector{position:fixed;inset:0;display:none;background:rgba(20,22,26,.94);
          color:#eaeaea;z-index:99999;backdrop-filter:saturate(1.1) blur(2px)}
        body.is-inspector .inspector{display:block !important}
        .insp-tabs{display:flex;gap:6px;padding:8px;background:#2a2f36;border-bottom:1px solid #0006}
        .insp-tab{appearance:none;border:0;border-radius:8px;padding:8px 10px;
          background:#3a404a;color:#d7d9de;font:600 13px/1 Inter,system-ui,Arial,sans-serif;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
        .insp-tab.is-active{background:#eceef2;color:#1a1d22}
        .insp-content{position:absolute;inset:48px 0 0 0;overflow:auto;padding:10px}
        .insp-view{display:none}
        .insp-view.is-active{display:block}
        .insp-tab .icon{font-size:16px;opacity:.9}
      `;
      const st = h('style', { id:'insp-core-fallback-css' });
      st.textContent = css; document.head.appendChild(st);
    }
    STATE.host   = host;
    STATE.tabsEl = host.querySelector('[data-slot="tabs"]');
    STATE.viewsEl= host.querySelector('[data-slot="views"]');
    return host;
  }

  // ---- Tabs rendern ---------------------------------------------------------
  function setActive(id){
    STATE.tabsEl.querySelectorAll('.insp-tab').forEach(b=>{
      b.classList.toggle('is-active', b.getAttribute('data-tab')===id);
    });
    STATE.viewsEl.querySelectorAll('.insp-view').forEach(v=>{
      v.classList.toggle('is-active', v.getAttribute('data-tab')===id);
    });
    try{ window.dispatchEvent(new CustomEvent('cb:insp:tab:change',{detail:{id}})); }catch{}
  }

  function buildUI(){
    STATE.tabsEl.innerHTML  = '';
    STATE.viewsEl.innerHTML = '';
    STATE.tabs.forEach(def=>{
      const btn  = h('button', { class:'insp-tab', 'data-tab':def.id, title:def.title||def.id }, [
        h('span',{class:'icon', text:def.icon||iconFor(def.id)}),
        h('span',{class:'label', text:def.title||def.id}),
      ]);
      btn.addEventListener('click', ()=> setActive(def.id));
      STATE.tabsEl.appendChild(btn);

      const view = h('div', { class:'insp-view', 'data-tab':def.id });
      try{ def.render?.(view); }catch(e){ ERR('render', def.id, e?.message||e); }
      STATE.viewsEl.appendChild(view);
    });
    if (STATE.tabs.length) setActive(STATE.tabs[0].id);
    INF(`Tabs gerendert: ${STATE.tabs.length}`);
  }

  const ICONS = { build:'🏗️', ui:'🧰', diag:'⚙️', resources:'📦', paths:'🗺️', tests:'🧪', logs:'📜' };
  const iconFor = id => ICONS[id] || '🧩';

  // ---- Registrieren ---------------------------------------------------------
  function _add(def){
    if (!def || !def.id) return WRN('registerTab: def.id fehlt');
    if (STATE.tabs.some(t => t.id === def.id)) return; // de-dupe
    STATE.tabs.push({
      id    : def.id,
      title : def.title || def.id,
      icon  : def.icon  || iconFor(def.id),
      render: typeof def.render==='function' ? def.render
              : (el)=>{ // Alt: nur onShow(host)
                  try { def.onShow?.(el); } catch(_){}
                }
    });
  }

  /** Moderne Registrierung */
  function registerTab(def){
    if (!STATE.mounted) { QUEUE.push(def); return; }
    _add(def); buildUI();
  }

  /** Overlay montieren (nur DOM aufbauen & Tabs rendern) */
  function mountOverlay(){
    if (STATE.mounted) return true;
    ensureHost();
    QUEUE.splice(0).forEach(_add);
    buildUI();
    STATE.mounted = true;
    OK('montiert ✓');
    return true;
  }

  /** Universelle Kompatibilitäts-Mount:
   *  - mount()                   → Overlay montieren
   *  - mount('id', onShow)       → Tab registrieren (legacy)
   *  - mount({id,title,onShow})  → Tab registrieren (legacy Objektform)
   */
  function mountCompat(a, b){
    // 1) legacy: mount('id', onShow)
    if (typeof a === 'string') {
      const def = { id:a, title:a, onShow:b };
      if (!STATE.mounted) { QUEUE.push(def); mountOverlay(); }
      else { registerTab(def); }
      return { id:a };
    }
    // 2) legacy: mount({id,title,onShow})
    if (a && typeof a === 'object' && a.id) {
      const def = { ...a };
      if (!STATE.mounted) { QUEUE.push(def); mountOverlay(); }
      else { registerTab(def); }
      return { id:def.id };
    }
    // 3) modern: mount()
    return mountOverlay();
  }

  // ---- Öffnen / Schließen ---------------------------------------------------
  function open(tabId=null){
    if (!STATE.mounted) mountOverlay();
    document.body.classList.add('is-inspector');
    STATE.open = true;
    if (tabId) setActive(tabId);
    try{ window.dispatchEvent(new CustomEvent('cb:insp:open',{detail:{tab:tabId}})); }catch{}
    // Selbsttest: Keine Tabs? Hinweis loggen
    if (!STATE.tabs.length) {
      WRN('geöffnet, aber keine Tabs registriert. Prüfe, ob deine Tab-Dateien "Inspector.mount(...)" ODER "__INSPECTOR_CORE__.api.registerTab(...)" aufrufen.');
    }
  }
  function close(){
    document.body.classList.remove('is-inspector');
    STATE.open = false;
    try{ window.dispatchEvent(new CustomEvent('cb:insp:close')); }catch{}
  }
  const toggle = (tabId=null)=> (STATE.open ? close() : open(tabId));
  const isOpen = ()=> !!STATE.open;

  // ---- Exporte / Shims ------------------------------------------------------
  const CORE = (window.__INSPECTOR_CORE__ = window.__INSPECTOR_CORE__ || {});
  CORE.state = STATE;
  CORE.api   = {
    registerTab,
    addTab   : registerTab,
    mount    : mountCompat,    // kompatibel
    coreMount: mountOverlay    // nur Overlay
  };

  if (!window.Inspector) window.Inspector = {};
  Object.assign(window.Inspector, {
    open, close, toggle, isOpen,
    registerTab: (def)=> CORE.api.registerTab(def),
    mount:       (a,b)=> CORE.api.mount(a,b)
  });

  if (!window.UIInspector) window.UIInspector = {};
  Object.assign(window.UIInspector, {
    open, close, toggle, isOpen,
    registerTab: (def)=> CORE.api.registerTab(def),
    mount:       (a,b)=> CORE.api.mount(a,b)
  });

  // Externe Steuer-Events
  window.addEventListener('req:insp:open',   ()=>open());
  window.addEventListener('req:insp:close',  ()=>close());
  window.addEventListener('req:insp:toggle', ()=>toggle());

  // Auto-Mount, falls der Button früher schon body.is-inspector gesetzt hat
  if (document.body.classList.contains('is-inspector')) open();

  // DOM-ready → Overlay montieren (unschädlich, Tabs kommen aus QUEUE)
  const ready = ()=> { try{ mountOverlay(); }catch(e){ ERR('mount',e); } };
  (document.readyState==='loading') ? document.addEventListener('DOMContentLoaded', ready, {once:true}) : ready();

  OK('bereit v25.10.28-compat3');
})();
