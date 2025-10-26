/* ============================================================================
 * Datei   : ui/inspector/inspector.core.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.28-final
 * Zweck   : Inspector-Kern (Tabs, Slots, Mount-API, Icons, Toggle/Open/Close)
 * ========================================================================== */

/* ---- Doppel-Init Guard (verhindert zweiten Start des Cores) --------------- */
if (window.__INSPECTOR_CORE_INIT__ && window.__INSPECTOR_CORE__?.api) {
  (window.CBLog?.info || console.info)('[inspector.core] duplicate load – skipped');
} else {
  window.__INSPECTOR_CORE_INIT__ = true;

  (function () {
    'use strict';

    const MOD = '[inspector.core]';
    const LOG = (window.CBLog?.info || console.info).bind(console, MOD);
    const WRN = (window.CBLog?.warn || console.warn).bind(console, MOD);

    // ------------------------------------------------------------------------
    //  [1] BASIS-STRUKTUR (Root + Slots)
    // ------------------------------------------------------------------------
    const $ = (s, sc = document) => sc.querySelector(s);
    const el = (tag, cls, html) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (html != null) n.innerHTML = html;
      return n;
    };

    // Root erzeugen (falls nicht vorhanden)
    const root = document.getElementById('inspector') || (() => {
      const n = el('div', 'inspector');
      n.id = 'inspector';
      document.body.appendChild(n);
      return n;
    })();

    // ➜ Fallback-CSS (sichtbarer Inspector, falls externe CSS fehlen)
    if (!document.getElementById('insp-core-style')) {
      const st = document.createElement('style');
      st.id = 'insp-core-style';
      st.textContent = `
        #inspector{position:fixed;inset:0;z-index:80;display:flex;flex-direction:column;background:rgba(30,30,30,.96);color:#ddd;font-family:sans-serif;font-size:13px;}
        #inspector[hidden]{display:none!important;}
        .insp-tabs{display:flex;gap:6px;padding:6px;background:#222;align-items:center;user-select:none}
        .insp-content{position:relative;flex:1 1 auto;overflow:auto;padding:6px}
        .insp-view{min-height:100%;}
        .insp-tab{background:#333;color:#ccc;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;}
        .insp-tab.active{background:#555;color:#fff;outline:1px solid #888;}
        .insp-tab .icon{font-size:15px;}
      `;
      document.head.appendChild(st);
    }

    // Slots anlegen
    const slots = {
      tabs: $('[data-slot="tabs"]', root) || (() => {
        const n = el('div', 'insp-tabs');
        n.setAttribute('data-slot', 'tabs');
        root.appendChild(n);
        return n;
      })(),
      view: $('[data-slot="view"]', root) || (() => {
        const n = el('div', 'insp-content');
        n.setAttribute('data-slot', 'view');
        root.appendChild(n);
        return n;
      })(),
    };

    // feste Views vorbereiten
    const ensureFixedView = (slotName) => {
      let n = $(`[data-slot="${slotName}"]`, root);
      if (!n) {
        n = el('div', 'insp-view');
        n.setAttribute('data-slot', slotName);
        n.hidden = true;
        slots.view.appendChild(n);
      }
      return n;
    };
    const fixedViews = {
      build: ensureFixedView('build-view'),
      paths: ensureFixedView('paths-view'),
      res: ensureFixedView('res-view'),
      tests: ensureFixedView('tests-view'),
      logs: ensureFixedView('logs-view'),
      generic: ensureFixedView('generic-view'), // für dynamische Tabs
    };

    let activeTab = null;
    const tabButtons = {};

    // ------------------------------------------------------------------------
    //  [2] ICON-MAPPING (Tab → Symbol)
    // ------------------------------------------------------------------------
    const TAB_ICONS = {
      build: '🏗️',
      paths: '🗺️',
      resources: '📦',
      tests: '🧪',
      logs: '📜',
      ui: '🧰',
      diag: '⚙️',
    };

    function decorateTabButton(btn, id) {
      if (!btn || btn.querySelector('.icon')) return;
      const icon = TAB_ICONS[id];
      if (!icon) return;
      const span = el('span', 'icon', icon);
      btn.prepend(span);
      btn.style.gap = '6px';
      btn.style.alignItems = 'center';
    }

    // ------------------------------------------------------------------------
    //  [3] TAB-ERSTELLUNG & AKTIVIERUNG
    // ------------------------------------------------------------------------
    function addTabButton(id, label) {
      const norm = String(id);
      if (tabButtons[norm]) return tabButtons[norm];
      const b = el('button', 'insp-tab', label || norm);
      b.setAttribute('data-tab', norm);
      b.addEventListener('click', () => activateTab(norm));
      slots.tabs.appendChild(b);
      decorateTabButton(b, norm);
      tabButtons[norm] = b;
      return b;
    }

    function showOnly(viewEl) {
      for (const k of Object.keys(fixedViews)) fixedViews[k].hidden = true;
      if (viewEl) viewEl.hidden = false;
    }

    function activateTab(id) {
      Object.values(tabButtons).forEach((btn) => btn.classList.remove('active'));
      tabButtons[id]?.classList.add('active');
      switch (id) {
        case 'build': showOnly(fixedViews.build); break;
        case 'paths': showOnly(fixedViews.paths); break;
        case 'resources': showOnly(fixedViews.res); break;
        case 'tests': showOnly(fixedViews.tests); break;
        case 'logs': showOnly(fixedViews.logs); break;
        default: showOnly(fixedViews.generic); break;
      }
      activeTab = id;
      try {
        window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail: { tab: id } }));
      } catch {}
    }

    // ------------------------------------------------------------------------
    //  [4] OFFEN / SCHLIESSEN / TOGGLE
    // ------------------------------------------------------------------------
    function openInsp() {
      root.hidden = false;
      root.style.display = '';
      document.body.classList.add('is-inspector');
      try { window.dispatchEvent(new CustomEvent('cb:insp:open')); } catch {}
    }
    function closeInsp() {
      document.body.classList.remove('is-inspector');
      root.hidden = true;
      try { window.dispatchEvent(new CustomEvent('cb:insp:close')); } catch {}
    }
    function toggleInsp(force) {
      const show = (typeof force === 'boolean')
        ? force
        : (root.hidden || getComputedStyle(root).display === 'none');
      show ? openInsp() : closeInsp();
    }

    // ------------------------------------------------------------------------
    //  [5] REGISTRIERUNG externer Tabs (API)
    // ------------------------------------------------------------------------
    function registerTab({ id, title = id, onShow } = {}) {
      if (!id) return;
      const wasEmpty = !activeTab;
      const btn = addTabButton(id, title);

      // Ersten Tab direkt aktivieren + rendern
      if (wasEmpty) {
        activateTab(id);
        try { onShow && onShow(fixedViews.generic); } catch (e) { WRN('onShow error', e?.message || e); }
      }

      // Bei späterer Aktivierung noch einmal anzeigen
      btn.addEventListener('click', () => {
        try { onShow && onShow(fixedViews.generic); } catch (e) { WRN('onShow error', e?.message || e); }
      }, { once: true });

      return { id, button: btn };
    }

    // ------------------------------------------------------------------------
    //  [6] API-EXPORT + EXTERNE EVENTS
    // ------------------------------------------------------------------------
    const api = {
      registerTab,
      addTab: registerTab,
      mount: registerTab,
      open: openInsp,
      close: closeInsp,
      toggle: toggleInsp,
    };
    window.__INSPECTOR_CORE__ = { api };

    // externe Steuerung
    window.addEventListener('req:insp:open', () => openInsp());
    window.addEventListener('req:insp:close', () => closeInsp());
    window.addEventListener('req:insp:toggle', () => toggleInsp());

    // Falls body.is-inspector schon gesetzt: sichtbar halten
    if (document.body.classList.contains('is-inspector')) openInsp();

    // Vorhandene Buttons nachträglich mit Icons dekorieren
    setTimeout(() => {
      root.querySelectorAll('.insp-tab[data-tab]').forEach((btn) => {
        decorateTabButton(btn, btn.dataset.tab);
      });
    }, 0);

    LOG('bereit (Core + Icons + Toggle)');
  })();
}
