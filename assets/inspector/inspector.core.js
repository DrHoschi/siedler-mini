/* ============================================================================
 * Inspector Core – v18.12.1
 *  - Overlay + Tabs (Logs/Build/Paths/Tests)
 *  - Slot-API für Submodule (getSlot/mount/signal)
 *  - Kein Auto-Open (nur via Button/extern)
 *  - Portrait: Tabs oben · Landscape: Tabs links (Sidebar)
 * ========================================================================== */
(function () {
  'use strict';

  const MOD = '[inspector.core]';
  const VER = 'v18.12.1';

  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------
  let isOpen = false;
  let currentTab = 'logs'; // Default
  const __SLOTS__ = Object.create(null);    // name -> HTMLElement
  const __MOUNTED__ = Object.create(null);  // tabId -> unmountFn | null

  // --------------------------------------------------------------------------
  // DOM helpers
  // --------------------------------------------------------------------------
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const byId = (id) => document.getElementById(id);

  // --------------------------------------------------------------------------
  // Core API (für Submodule wie inspector.logs.js)
  // --------------------------------------------------------------------------
  const CORE = (window.__INSPECTOR_CORE__ = window.__INSPECTOR_CORE__ || {});
  CORE.api = {
    version: VER,
    mount(tabId, renderFn) {
      // „Lazy“ wäre möglich; da du wenige Tabs hast, mounten wir direkt,
      // der sichtbare Tab wird sofort aktiv gesetzt.
      if (typeof renderFn === 'function') {
        try {
          const unmount = renderFn() || null;
          __MOUNTED__[tabId] = unmount;
        } catch (e) {
          console.warn(MOD, 'mount fail for', tabId, e);
        }
      }
    },
    getSlot(name) {
      return __SLOTS__[name] || null;
    },
    signal(name, payload) {
      try {
        document.dispatchEvent(new CustomEvent('ins:' + name, { detail: payload }));
      } catch (_) {}
    },
  };

  // --------------------------------------------------------------------------
  // Overlay-Baum
  // --------------------------------------------------------------------------
  function buildOverlay() {
    // Root
    const root = el('div');
    root.id = 'inspector';
    root.setAttribute('aria-hidden', 'true');
    root.style.display = 'none'; // JS steuert Sichtbarkeit
    // Wrapper + Panel
    const wrap = el('div', 'ins-wrap');
    const panel = el('section', 'ins-panel');

    // Header
    const head = el('header', 'ins-head');
    const title = el('div', 'ins-title');
    title.append(
      el('span', '', 'Inspector'),
      el('span', 'ins-ver', 'v' + VER)
    );

    const tabs = el('nav', 'ins-tabs');
    const mkTabBtn = (id, label) => {
      const b = el('button', 'ins-tab');
      b.type = 'button';
      b.dataset.tab = id;
      b.textContent = label;
      b.addEventListener('click', () => switchTab(id));
      return b;
    };
    tabs.append(
      mkTabBtn('logs', 'Logs'),
      mkTabBtn('build', 'Build'),
      mkTabBtn('paths', 'Pfade'),
      mkTabBtn('tests', 'Tests'),
    );

    const closeBtn = el('button', 'ins-close'); // „✕“ per CSS
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', close);

    head.append(title, tabs, closeBtn);

    // Body (Tab-Fläche)
    const body = el('div', 'ins-body');

    // --- Pane: LOGS  --------------------------------------------------------
    const paneLogs = el('div', 'ins-pane ins-pane-logs');
    paneLogs.id = 'tab-logs';
    paneLogs.setAttribute('role', 'tabpanel');
    paneLogs.innerHTML = `
      <div id="ins-logs-controls" class="slot-logs-controls"></div>
      <div id="ins-logs-view" class="slot-logs-view"></div>
    `;
    __SLOTS__['logs-controls'] = paneLogs.querySelector('#ins-logs-controls');
    __SLOTS__['logs-view'] = paneLogs.querySelector('#ins-logs-view');

    // --- Pane: BUILD (Platzhalter – füllt die Fläche) -----------------------
    const paneBuild = el('div', 'ins-pane ins-pane-build');
    paneBuild.id = 'tab-build';
    paneBuild.setAttribute('role', 'tabpanel');
    paneBuild.innerHTML = `
      <div class="ins-placeholder">Build-Infos kommen hier rein …</div>
    `;

    // --- Pane: PATHS (Platzhalter) -----------------------------------------
    const panePaths = el('div', 'ins-pane ins-pane-paths');
    panePaths.id = 'tab-paths';
    panePaths.setAttribute('role', 'tabpanel');
    panePaths.innerHTML = `
      <div class="ins-placeholder">Pfad-/Ressourceninfos …</div>
    `;

    // --- Pane: TESTS (Slot für Tests-Tab) -----------------------------------
    const paneTests = el('div', 'ins-pane ins-pane-tests');
    paneTests.id = 'tab-tests';
    paneTests.setAttribute('role', 'tabpanel');
    paneTests.innerHTML = `
      <div id="ins-tests-root" class="slot-tests-root"></div>
    `;
    __SLOTS__['tests-root'] = paneTests.querySelector('#ins-tests-root');

    body.append(paneLogs, paneBuild, panePaths, paneTests);

    // Footer
    const foot = el('footer', 'ins-foot');
    const muted = el('span', 'muted', 'Tip: In Landscape stehen Tabs & Filter links als Sidebar.');
    foot.append(muted);

    panel.append(head, body, foot);
    wrap.append(panel);
    root.append(wrap);
    document.body.append(root);

    // Ersten Tab sichtbar machen
    applyActiveTab('logs');

    // Buttons-Active-Zustand setzen
    refreshTabButtons();
  }

  // --------------------------------------------------------------------------
  // Tab-Wechsel / Sichtbarkeit
  // --------------------------------------------------------------------------
  function refreshTabButtons() {
    const root = byId('inspector');
    if (!root) return;
    root.querySelectorAll('.ins-tab').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === currentTab);
    });
  }

  function applyActiveTab(tabId) {
    const root = byId('inspector');
    if (!root) return;
    // Panes
    root.querySelectorAll('.ins-pane').forEach((p) => p.classList.remove('active'));
    const pane = byId('tab-' + tabId);
    if (pane) pane.classList.add('active');
    refreshTabButtons();
  }

  function switchTab(tabId) {
    if (tabId === currentTab) return;
    currentTab = tabId;
    applyActiveTab(tabId);
    CORE.api.signal('tab:change', { tab: tabId });
  }

  // --------------------------------------------------------------------------
  // Open/Close
  // --------------------------------------------------------------------------
  function open() {
    if (isOpen) return;
    isOpen = true;
    const root = byId('inspector');
    if (root) {
      root.style.display = 'flex';
      root.setAttribute('aria-hidden', 'false');
    }
    document.body.classList.add('inspector-open');
    CORE.api.signal('open', { version: VER });
    try { window.dispatchEvent(new Event('cb:inspector-open')); } catch (_) {}
    console.log(MOD, 'geöffnet', 'v' + VER);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    const root = byId('inspector');
    if (root) {
      root.style.display = 'none';
      root.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('inspector-open');
    CORE.api.signal('close');
    try { window.dispatchEvent(new Event('cb:inspector-close')); } catch (_) {}
    console.log(MOD, 'geschlossen');
  }

  // Externe Steuerung erlauben (z. B. per Button)
  CORE.open = open;
  CORE.close = close;
  CORE.toggle = () => (isOpen ? close() : open());

  // --------------------------------------------------------------------------
  // Init
  // --------------------------------------------------------------------------
  function init() {
    if (byId('inspector')) return; // einmalig
    buildOverlay();

    console.log('[%s] bereit v%s', 'inspector.core', VER);
  }

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Optional: Keyboard ESC schließt (nur wenn offen)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) close();
  });
})();
