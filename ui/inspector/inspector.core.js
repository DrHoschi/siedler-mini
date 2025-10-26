/* ============================================================================
 * Datei    : ui/inspector/inspector.core.js
 * Projekt  : Neue Siedler – Inspector
 * Version  : v25.10.26-core-final
 * Zweck    : Kern-Overlay inkl. Abwärtskompatibilität & Tab-Registrierung
 *
 * Kompatibilität:
 *   - Neu   : window.__INSPECTOR_CORE__.api.registerTab(def)
 *   - Alt 1 : window.Inspector.registerTab(def)
 *   - Alt 2 : window.UIInspector.registerTab(def)
 *
 * Öffentliche API:
 *   window.Inspector.open(tab?), .close(), .toggle(tab?), .isOpen()
 *   window.__INSPECTOR_CORE__.api.{registerTab, addTab, mount}
 * ============================================================================ */
(function () {
  'use strict';

  // ---- Logging helpers ------------------------------------------------------
  const MOD = '[insp-core]';
  const OK   = (...a) => (window.CBLog?.ok   || console.log).call(console, MOD, ...a);
  const INFO = (...a) => (window.CBLog?.info || console.info).call(console, MOD, ...a);
  const WARN = (...a) => (window.CBLog?.warn || console.warn).call(console, MOD, ...a);
  const ERR  = (...a) => (window.CBLog?.err  || console.error).call(console, MOD, ...a);

  // ---- State ----------------------------------------------------------------
  const STATE = {
    mounted: false,
    open:    false,
    host:    null,
    tabsEl:  null,
    viewsEl: null,
    tabs:    [],          // {id,title,icon,render:fn}
  };
  const TAB_QUEUE = [];    // Registrierungen vor mount()

  // ---- DOM helpers ----------------------------------------------------------
  function h(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') el.className = v;
      else if (k.startsWith('data-')) el.setAttribute(k, v);
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v);
    }
    for (const c of [].concat(children)) el.appendChild(c);
    return el;
  }

  function ensureHost() {
    // 1) Root-Knoten
    let host = document.getElementById('inspector');
    if (!host) {
      host = h('div', { id: 'inspector', class: 'inspector', 'data-version': 'v25.10.26' }, [
        h('div', { class: 'insp-tabs',    'data-slot': 'tabs' }),
        h('div', { class: 'insp-content', 'data-slot': 'views' }),
      ]);
      document.body.appendChild(host);
      INFO('Root erzeugt (#inspector).');
    }

    // 2) Minimal-CSS (Fallback), falls ui-inspector.css nicht greift
    //    -> nicht invasiv: wirkt nur wenn entsprechende Variablen fehlen.
    const CSS_ID = 'insp-core-fallback-css';
    if (!document.getElementById(CSS_ID)) {
      const css = `
        .inspector{position:fixed;inset:0;display:none;background:rgba(20,22,26,.92);
          color:#eaeaea;z-index:99999;backdrop-filter:saturate(1.2) blur(2px);}
        body.is-inspector .inspector{display:block}
        .inspector .insp-tabs{display:flex;gap:6px;padding:8px;background:#2a2f36;border-bottom:1px solid #0006}
        .inspector .insp-tab{appearance:none;border:0;border-radius:8px;padding:8px 10px;
          background:#3a404a;color:#d7d9de;font:600 13px/1 Inter,system-ui,Arial,sans-serif;display:inline-flex;align-items:center;gap:6px}
        .inspector .insp-tab.is-active{background:#eceef2;color:#1a1d22}
        .inspector .insp-content{position:absolute;inset:48px 0 0 0;overflow:auto;padding:10px}
        .insp-view{display:none}
        .insp-view.is-active{display:block}
        .insp-tab .icon{font-size:16px;opacity:.9}
      `.trim();
      const styleEl = h('style', { id: CSS_ID });
      styleEl.textContent = css;
      document.head.appendChild(styleEl);
    }

    // 3) Referenzen merken
    STATE.host   = host;
    STATE.tabsEl = host.querySelector('[data-slot="tabs"]');
    STATE.viewsEl= host.querySelector('[data-slot="views"]');
    return host;
  }

  // ---- Tabs rendern ---------------------------------------------------------
  function buildTabs() {
    STATE.tabsEl.innerHTML  = '';
    STATE.viewsEl.innerHTML = '';

    STATE.tabs.forEach(def => {
      // Button
      const btn = h('button', { class: 'insp-tab', 'data-tab': def.id, title: def.title || def.id });
      btn.appendChild(h('span', { class: 'icon', text: def.icon || '🧩' }));
      btn.appendChild(h('span', { class: 'label', text: def.title || def.id }));
      btn.addEventListener('click', () => setActive(def.id));
      STATE.tabsEl.appendChild(btn);

      // View
      const view = h('div', { class: 'insp-view', 'data-tab': def.id });
      try { def.render?.(view); } catch (e) { ERR('render()', def.id, e); }
      STATE.viewsEl.appendChild(view);
    });

    // Ersten Tab aktivieren
    if (STATE.tabs.length) setActive(STATE.tabs[0].id);

    INFO(`Tabs gerendert: ${STATE.tabs.length}`);
  }

  function setActive(id) {
    STATE.tabsEl.querySelectorAll('.insp-tab').forEach(b => {
      b.classList.toggle('is-active', b.getAttribute('data-tab') === id);
    });
    STATE.viewsEl.querySelectorAll('.insp-view').forEach(v => {
      v.classList.toggle('is-active', v.getAttribute('data-tab') === id);
    });
    window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail: { id } }));
  }

  // ---- Core-API -------------------------------------------------------------
  function addTab(def) {
    if (!def || !def.id) return WARN('registerTab: def.id fehlt');
    // doppelte vermeiden
    if (STATE.tabs.some(t => t.id === def.id)) return;
    STATE.tabs.push({
      id: def.id,
      title: def.title || def.id,
      icon: def.icon || '🧩',
      render: typeof def.render === 'function' ? def.render : (el) => { el.textContent = `${def.id}`; }
    });
  }

  function registerTab(def) {
    // Vor mount() sammeln wir in TAB_QUEUE, danach direkt adden + re-rendern
    if (!STATE.mounted) {
      TAB_QUEUE.push(def);
    } else {
      addTab(def);
      buildTabs();
    }
  }

  function mount() {
    if (STATE.mounted) return true;
    ensureHost();

    // alles aus der Queue übernehmen
    TAB_QUEUE.splice(0).forEach(addTab);

    buildTabs();
    STATE.mounted = true;
    OK('montiert ✓');
    return true;
  }

  // ---- Overlay-Steuerung (globale API für Button & Hotkey) -----------------
  function open(tabId = null) {
    if (!STATE.mounted) mount();
    document.body.classList.add('is-inspector');
    STATE.open = true;
    window.dispatchEvent(new CustomEvent('cb:insp:open', { detail: { tab: tabId }}));
    if (tabId) setActive(tabId);
  }

  function close() {
    document.body.classList.remove('is-inspector');
    STATE.open = false;
    window.dispatchEvent(new CustomEvent('cb:insp:close', { detail: {}}));
  }

  function toggle(tabId = null) {
    return (STATE.open ? close() : open(tabId));
  }

  function isOpen() { return !!STATE.open; }

  // ---- Globale Objekte / Shims (wichtig!) ----------------------------------
  // Primär-Objekt (neu)
  const CORE = (window.__INSPECTOR_CORE__ = window.__INSPECTOR_CORE__ || {});
  CORE.api = CORE.api || { registerTab, addTab, mount };
  CORE.state = STATE;

  // Abwärtskompatible Oberflächen (alte Tabs rufen diese auf)
  function ensureOldAPIs() {
    // 1) window.Inspector – alte Toggle- + registerTab-API
    if (!window.Inspector) window.Inspector = {};
    window.Inspector.toggle      = toggle;
    window.Inspector.open        = open;
    window.Inspector.close       = close;
    window.Inspector.isOpen      = isOpen;
    window.Inspector.registerTab = (def) => CORE.api.registerTab(def); // passt durch zum neuen Kern

    // 2) window.UIInspector – einige Demos nutzen diesen Namen
    if (!window.UIInspector) window.UIInspector = {};
    window.UIInspector.toggle      = toggle;
    window.UIInspector.open        = open;
    window.UIInspector.close       = close;
    window.UIInspector.isOpen      = isOpen;
    window.UIInspector.registerTab = (def) => CORE.api.registerTab(def);
  }
  ensureOldAPIs();

  // Guard-Flag (für deine Konsolen-Checks)
  window.__INSPECTOR_CORE_INIT__ = true;

  // Auto-Mount sobald DOM bereit ist (schadet nicht; Toggle geht trotzdem)
  const ready = () => { try { mount(); } catch (e) { ERR('mount()', e); } };
  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', ready, { once: true })
    : ready();

  OK('bereit v25.10.26-core-final');
})();
