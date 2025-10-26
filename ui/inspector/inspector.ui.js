/* ============================================================================
 * Datei   : ui/inspector/inspector.ui.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.27-ui2
 * Zweck   : Registriert den "ui"-Tab (Bedienoberfläche / Info)
 *
 * WICHTIG:
 *  - De-Dup-Guard: Falls der Tab bereits existiert, wird NICHT erneut registriert.
 *  - Nutzt die Core-API (core.mount) und rendert in den "generic"-Slot.
 *  - Keine Abhängigkeit zu eruda / externer Dev-UI.
 * ========================================================================== */
(function () {
  'use strict';

  const MOD = '[inspector.ui]';
  const LOG = (window.CBLog?.info || console.info).bind(console, MOD);
  const WRN = (window.CBLog?.warn || console.warn).bind(console, MOD);

  // ---------- Core-Bridge (kompatibel mit verschiedenen Core-Ständen) ----------
  const core = (function () {
    if (window.__INSPECTOR_CORE__?.api) return window.__INSPECTOR_CORE__.api;
    const ins = window.Inspector || window.__INSPECTOR__ || {};
    return {
      mount(id, onShow) {
        const fn = ins.registerTab || ins.addTab || function () { };
        return fn({ id, title: id, onShow });
      },
      getSlot(name) {
        return document.querySelector(`#inspector [data-slot="${name}"]`)
          || document.querySelector(`[data-inspector-slot="${name}"]`)
          || document.getElementById(`ins-${name}`)
          || document.getElementById(name);
      }
    };
  })();

  // ---------- De-Dup: Tab "ui" nur 1× registrieren ----------------------------
  const already = document.querySelector('.insp-tab[data-tab="ui"]');
  if (already) {
    LOG('Tab "ui" already exists – skipped (de-dup OK)');
    return;
  }

  // ---------- kleine DOM-Helper ------------------------------------------------
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  // ---------- View-Bau ---------------------------------------------------------
  function buildView(host) {
    host.innerHTML = '';
    const wrap = el('div', 'pad');

    wrap.append(
      el('h3', null, 'UI / Oberfläche'),
      el('p', 'muted', 'Dieser Tab sammelt kleine Komfort-Funktionen rund um die Spieloberfläche.'),
      el('div', 'ui-section', `
        <div class="row" style="display:flex; gap:8px; flex-wrap:wrap">
          <button class="insp-btn" id="ui-show-build">Baumenü öffnen</button>
          <button class="insp-btn" id="ui-hide-build">Baumenü schließen</button>
          <button class="insp-btn" id="ui-toggle-build">Baumenü toggeln</button>
          <button class="insp-btn" id="ui-hud-snapshot">HUD Snapshot anfordern</button>
        </div>
      `),
      el('p', 'muted', `
        <small>Hinweis: Diese Buttons senden nur Events (req:build:open/close/toggle, req:res:snapshot)
        und ändern nichts an der Core-Logik.</small>
      `)
    );

    host.appendChild(wrap);

    // Event-Wiring
    wrap.querySelector('#ui-show-build')?.addEventListener('click', () => {
      dispatchEvent(new Event('req:build:open'));
    });
    wrap.querySelector('#ui-hide-build')?.addEventListener('click', () => {
      dispatchEvent(new Event('req:build:close'));
    });
    wrap.querySelector('#ui-toggle-build')?.addEventListener('click', () => {
      dispatchEvent(new Event('req:build:toggle'));
    });
    wrap.querySelector('#ui-hud-snapshot')?.addEventListener('click', () => {
      dispatchEvent(new Event('req:res:snapshot'));
    });
  }

  // ---------- Mount im Inspector ----------------------------------------------
  core.mount('ui', (host) => {
    // sicherheitshalber in den "generic"-Slot zeichnen
    if (!host || !host.closest || !host.closest('.insp-content')) {
      host = core.getSlot('generic') || host;
    }
    buildView(host);
    LOG('bereit');
  });

})();
