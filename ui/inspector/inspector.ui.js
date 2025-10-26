/* ============================================================================
 * Datei   : ui/inspector/inspector.ui.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.28-final
 * Zweck   : Registriert den Tab "UI" im Inspector
 *           (Bedienoberfläche, kleine Steuer-Events)
 *
 * Enthält :
 *   • Buttons für Baumenü (öffnen/schließen/togglen)
 *   • HUD-Snapshot-Trigger
 *   • "X"-Schließen-Button oben rechts
 *
 * Layout :
 *   ┌───────────────────────────────┐
 *   │ UI-Header  [× schließen]     │
 *   ├───────────────────────────────┤
 *   │ Buttons / Infos              │
 *   └───────────────────────────────┘
 * ========================================================================== */
(function () {
  'use strict';

  const MOD = '[inspector.ui]';
  const LOG = (window.CBLog?.info || console.info).bind(console, MOD);
  const WRN = (window.CBLog?.warn || console.warn).bind(console, MOD);

  // ---------------------------------------------------------------------------
  // [1] Core-Bridge (kompatibel mit allen Varianten)
  // ---------------------------------------------------------------------------
  const core = (function () {
    if (window.__INSPECTOR_CORE__?.api) return window.__INSPECTOR_CORE__.api;
    const ins = window.Inspector || window.__INSPECTOR__ || {};
    return {
      mount(id, onShow) {
        const fn = ins.registerTab || ins.addTab || function () {};
        return fn({ id, title: id, onShow });
      },
      getSlot(name) {
        return (
          document.querySelector(`#inspector [data-slot="${name}"]`) ||
          document.querySelector(`[data-inspector-slot="${name}"]`) ||
          document.getElementById(`ins-${name}`) ||
          document.getElementById(name)
        );
      },
    };
  })();

  // ---------------------------------------------------------------------------
  // [2] De-Dup-Guard – Tab "ui" nur 1× registrieren
  // ---------------------------------------------------------------------------
  const already = document.querySelector('.insp-tab[data-tab="ui"]');
  if (already) {
    LOG('Tab "ui" already exists – skipped (de-dup OK)');
    return;
  }

  // ---------------------------------------------------------------------------
  // [3] kleine DOM-Helper
  // ---------------------------------------------------------------------------
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  // ---------------------------------------------------------------------------
  // [4] View-Renderer – wird beim Öffnen ausgeführt
  // ---------------------------------------------------------------------------
  function buildView(host) {
    // Host bereinigen
    host.innerHTML = '';

    // === Rahmen-Struktur =====================================================
    const frame = el('div', 'insp-frame');

    // Header mit Titel + X-Button
    const header = el('div', 'insp-header');
    header.append(
      el('h3', null, 'UI-Steuerung'),
      (function () {
        const x = el('button', 'insp-close', '×');
        x.title = 'Inspector schließen';
        x.addEventListener('click', () => window.Inspector?.close());
        return x;
      })()
    );

    // Content-Bereich
    const content = el('div', 'insp-content');
    const wrap = el('div', 'pad');

    wrap.append(
      el('p', 'muted', 'Steuer- und Komfort-Funktionen der Benutzeroberfläche:'),
      el(
        'div',
        'ui-section',
        `
        <div class="row" style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="insp-btn" id="ui-show-build">Baumenü öffnen</button>
          <button class="insp-btn" id="ui-hide-build">Baumenü schließen</button>
          <button class="insp-btn" id="ui-toggle-build">Baumenü toggeln</button>
          <button class="insp-btn" id="ui-hud-snapshot">HUD Snapshot</button>
        </div>
      `
      ),
      el(
        'p',
        'muted',
        `<small>Diese Buttons senden nur Events 
         (<code>req:build:open/close/toggle</code>,
         <code>req:res:snapshot</code>) 
         und ändern keine Core-Logik.</small>`
      )
    );

    content.appendChild(wrap);
    frame.append(header, content);
    host.appendChild(frame);

    // === Event-Wiring ========================================================
    wrap.querySelector('#ui-show-build')?.addEventListener('click', () =>
      dispatchEvent(new Event('req:build:open'))
    );
    wrap.querySelector('#ui-hide-build')?.addEventListener('click', () =>
      dispatchEvent(new Event('req:build:close'))
    );
    wrap.querySelector('#ui-toggle-build')?.addEventListener('click', () =>
      dispatchEvent(new Event('req:build:toggle'))
    );
    wrap.querySelector('#ui-hud-snapshot')?.addEventListener('click', () =>
      dispatchEvent(new Event('req:res:snapshot'))
    );
  }

  // ---------------------------------------------------------------------------
  // [5] Registrierung im Inspector
  // ---------------------------------------------------------------------------
  core.mount('ui', (host) => {
    // Fallback: in den generischen Slot zeichnen, falls kein Host vorhanden
    if (!host || !host.closest || !host.closest('.insp-content')) {
      host = core.getSlot('generic') || host;
    }
    buildView(host);
    LOG('bereit');
  });
})();
