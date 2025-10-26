/* ============================================================================
 * Datei   : ui/inspector/inspector.core.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.27-core+icons
 * Zweck   : Inspector-Kern (Tabs, Slots, Mount-API) + Tab-Icon-Unterstützung
 * ========================================================================== */

/* ---- Doppel-Init Guard (verhindert zweiten Start des Cores) --------------- */
if (window.__INSPECTOR_CORE_INIT__) {
  (window.CBLog?.info || console.info)('[inspector.core] duplicate load – skipped');
  // nichts weiter ausführen
} else {
  window.__INSPECTOR_CORE_INIT__ = true;

  (function () {
    'use strict';

    const MOD = '[inspector.core]';
    const LOG = (window.CBLog?.info || console.info).bind(console, MOD);
    const WRN = (window.CBLog?.warn || console.warn).bind(console, MOD);

    // ------------------------------------------------------------------------
    //  SLOTS (dein bestehendes System – Erklärung für spätere Arbeiten)
    //    data-slot="tabs"          → Tab-Button-Leiste
    //    data-slot="view"          → Container für Inhalte (Panel)
    //    data-slot="build-view"    → fester Slot für build
    //    data-slot="paths-view"    → fester Slot für paths
    //    data-slot="res-view"      → fester Slot für resources
    //    data-slot="tests-view"    → fester Slot für tests/events
    //    data-slot="logs-view"     → fester Slot für logs
    //    data-slot="generic-view"  → universeller Slot für dynamische Tabs (ui, diag, …)
    // ------------------------------------------------------------------------

    // DOM-Helfer
    const $ = (s, sc = document) => sc.querySelector(s);
    const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

    // Grundgerüst finden/erzeugen
    const root = document.getElementById('inspector') || (function () {
      const n = el('div', 'inspector'); n.id = 'inspector'; document.body.appendChild(n); return n;
    })();
    const slots = {
      tabs: $('[data-slot="tabs"]', root) || (function () {
        const n = el('div', 'insp-tabs'); n.setAttribute('data-slot', 'tabs'); root.appendChild(n); return n;
      })(),
      view: $('[data-slot="view"]', root) || (function () {
        const n = el('div', 'insp-content'); n.setAttribute('data-slot', 'view'); root.appendChild(n); return n;
      })()
    };

    // Feste Views sicherstellen (falls Core sie erwartet)
    const ensureFixedView = (slotName) => {
      let n = $(`[data-slot="${slotName}"]`, root);
      if (!n) {
        n = el('div', 'insp-view'); n.setAttribute('data-slot', slotName); n.hidden = true;
        slots.view.appendChild(n);
      }
      return n;
    };
    const fixedViews = {
      build:   ensureFixedView('build-view'),
      paths:   ensureFixedView('paths-view'),
      res:     ensureFixedView('res-view'),
      tests:   ensureFixedView('tests-view'),
      logs:    ensureFixedView('logs-view'),
      generic: ensureFixedView('generic-view') // universeller Slot
    };

    // Aktiver Tab-Status
    const tabButtons = {};   // id → button
    let activeTab = null;

    // ------------------------------------------------------------------------
    //  ➤ NEU: Icon-Mapping (kannst du später anpassen)
    //     - Keys: Tab-IDs (so wie in data-tab)
    //     - Values: HTML (Emoji, SVG oder <img>)
    // ------------------------------------------------------------------------
    const TAB_ICONS = {
      build:     '🏗️',
      paths:     '🗺️',
      resources: '📦',
      tests:     '🧪',
      logs:      '📜',
      ui:        '🧰',
      diag:      '⚙️'
    };

    function decorateTabButton(btn, id) {
      if (!btn || btn.querySelector('.icon')) return; // schon dekoriert
      const icon = TAB_ICONS[id];
      if (!icon) return; // kein Icon hinterlegt → nichts tun
      const span = el('span', 'icon', icon);
      // Icon voranstellen und etwas Abstand
      btn.prepend(span);
      btn.style.gap = '6px';
      btn.style.alignItems = 'center';
    }

    // ------------------------------------------------------------------------
    //  Tab-Button erstellen / aktivieren
    // ------------------------------------------------------------------------
    function addTabButton(id, label) {
      const norm = String(id);
      if (tabButtons[norm]) return tabButtons[norm];

      const b = el('button', 'insp-tab', label || norm);
      b.setAttribute('data-tab', norm);
      b.addEventListener('click', () => activateTab(norm));
      slots.tabs.appendChild(b);

      // ➤ NEU: Icon für diesen Button einsetzen (falls definiert)
      decorateTabButton(b, norm);

      tabButtons[norm] = b;
      return b;
    }

    function showOnly(viewEl) {
      // alle Views verstecken, gewünschten zeigen
      for (const k of Object.keys(fixedViews)) fixedViews[k].hidden = true;
      if (viewEl) viewEl.hidden = false;
    }

    function activateTab(id) {
      // Button-Styles
      Object.values(tabButtons).forEach(btn => btn.classList.remove('active'));
      tabButtons[id]?.classList.add('active');

      // Inhalt umschalten
      switch (id) {
        case 'build':   showOnly(fixedViews.build);   break;
        case 'paths':   showOnly(fixedViews.paths);   break;
        case 'resources': showOnly(fixedViews.res);   break;
        case 'tests':   showOnly(fixedViews.tests);   break;
        case 'logs':    showOnly(fixedViews.logs);    break;
        default:        showOnly(fixedViews.generic); break; // dynamische Tabs wie "ui", "diag"
      }
      activeTab = id;

      // Tab-Change Event (für Module, die Refresh wollen)
      try { window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail: { tab: id } })); } catch { }
    }

    // ------------------------------------------------------------------------
    //  API: Registrierung externer Tabs (z. B. ui, diag)
    // ------------------------------------------------------------------------
    function registerTab({ id, title = id, onShow } = {}) {
      if (!id) return;
      const btn = addTabButton(id, title);
      // ersten externen Tab automatisch aktivieren (nur wenn noch keiner aktiv)
      if (!activeTab) activateTab(id);

      // onShow sobald aktiv
      btn.addEventListener('click', () => {
        const host = fixedViews.generic; // dynamische landen im generic
        try { onShow && onShow(host); } catch (e) { WRN('onShow error', e?.message || e); }
      }, { once: true });

      return { id, button: btn };
    }

    // Alte API aliasen
    const api = { registerTab, addTab: registerTab, mount: registerTab };
    window.__INSPECTOR_CORE__ = { api };

    // ------------------------------------------------------------------------
    //  ➤ NEU: Fallback – existierende Buttons einmalig dekorieren (Icons)
    //     Falls Buttons schon vor Core-Erweiterung existieren, erhalten sie nun Icons.
    // ------------------------------------------------------------------------
    function decorateExistingTabButtonsOnce() {
      const buttons = root.querySelectorAll('.insp-tab[data-tab]');
      buttons.forEach(btn => {
        const id = btn.getAttribute('data-tab');
        decorateTabButton(btn, id);
      });
    }
    // 1× beim ersten Ready ausführen
    setTimeout(decorateExistingTabButtonsOnce, 0);

    LOG('bereit (Core + Icons)');
  })();
}
