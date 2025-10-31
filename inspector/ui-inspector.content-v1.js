/* ============================================================================
 * Datei   : inspector/ui-inspector.content-v1.js
 * Version : v1.0.1-final
 * Zweck   : Globale Content-Engine für den Inspector (Tabs + Panels aufbauen)
 * API     :
 *   – InspectorContent.register(name, renderFn)
 *   – InspectorContent.mount(host?)   // erzeugt Header+Tabs+Sections
 *   – InspectorContent.clear()
 *   – InspectorContent.list()
 *   – InspectorContent.debug          // kleine Helfer/Checks
 * Ereignisse:
 *   – hört auf 'cb:insp:open' (automatisches Mounten)
 *   – optional: 'req:insp:content:mount' (manuelles Mounten)
 * Hinweise:
 *   – Diese Datei DARF KEINE module/exports verwenden (kein type="module"),
 *     damit die API auf window liegt!
 * ========================================================================== */

(function () {
  'use strict';

  const REG = new Map(); // name -> renderFn(hostSection)
  let mounted = false;

  // ---------- Tools ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function ensureHost(host) {
    // Bevorzugt gefragten Host, sonst #inspector, sonst #inspector-overlay
    return host
      || $('#inspector')
      || $('#inspector-overlay')
      || null;
  }

  function buildShell(host) {
    host.id = host.id || 'inspector';
    host.classList.add('inspector-host');
    host.innerHTML = `
      <div class="insp-shell">
        <div class="insp-header" style="position:relative;">
          <div class="insp-tabs" role="tablist"></div>
          <button class="insp-close" type="button" aria-label="Inspector schließen"
                  data-action="insp-close"
                  style="position:absolute; right:12px; top:10px; font-size:24px; background:none; border:0; color:#ddd; cursor:pointer;">×</button>
        </div>
        <div class="insp-content" role="region"></div>
      </div>
    `;
  }

  function wireHeader(host) {
    host.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-action="insp-close"]');
      if (btn) window.Inspector?.close();
    });
  }

  function buildTabs(host) {
    const tabsBar = $('.insp-tabs', host);
    const content = $('.insp-content', host);

    tabsBar.textContent = '';
    content.textContent = '';

    // Fallback, falls keine Tabs registriert sind
    const entries = REG.size ? [...REG.entries()] : [['logs', (sec)=>{sec.textContent='(keine Tabs registriert)';}]];

    entries.forEach(([name, renderFn], idx) => {
      // Tab-Button
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.panel = name;
      btn.textContent = name[0].toUpperCase() + name.slice(1);
      btn.setAttribute('role', 'tab');
      tabsBar.appendChild(btn);

      // Panel-Section
      const sec = document.createElement('section');
      sec.dataset.panel = name;
      if (idx !== 0) sec.hidden = true;
      content.appendChild(sec);

      // Render-Inhalt
      try { renderFn(sec); } catch (e) {
        sec.innerHTML = `<pre style="color:#e66;">Render-Fehler in "${name}":\n${String(e)}</pre>`;
      }

      // Umschalten
      btn.addEventListener('click', () => {
        $$('.insp-content > section', host).forEach(s => s.hidden = (s.dataset.panel !== name));
        $$('.insp-tabs button', host).forEach(b => b.classList.toggle('active', b.dataset.panel === name));
      });
    });

    // Ersten Tab als aktiv markieren
    const firstBtn = $('.insp-tabs button', host);
    if (firstBtn) firstBtn.classList.add('active');
  }

  // ---------- Öffentliche API ----------
  const API = {
    register(name, renderFn) {
      if (!name || typeof renderFn !== 'function') return;
      REG.set(String(name), renderFn);
    },
    clear() {
      REG.clear();
      mounted = false;
      const host = ensureHost();
      if (host) {
        const tabs = $('.insp-tabs', host); if (tabs) tabs.textContent = '';
        const cont = $('.insp-content', host); if (cont) cont.textContent = '';
      }
    },
    mount(hostArg) {
      const host = ensureHost(hostArg);
      if (!host) return false;

      if (!$('.insp-shell', host)) {
        buildShell(host);
        wireHeader(host);
      }
      buildTabs(host);
      mounted = true;
      return true;
    },
    list() { return [...REG.keys()]; },
    debug: {
      state() {
        const host = ensureHost();
        return {
          host: !!host,
          shell: !!host && !!$('.insp-shell', host),
          tabs: !!host && $$('.insp-tabs button', host).length,
          sections: !!host && $$('.insp-content > section', host).length,
          registered: [...REG.keys()],
          inspectorOpen: !!window.Inspector?.isOpen?.()
        };
      }
    }
  };

  // global machen (WICHTIG!)
  window.InspectorContent = API;

  // ---------- Events anhören ----------
  // 1) Wenn Inspector geöffnet wird, Tabs rendern (einmal pro Öffnen ok)
  window.addEventListener('cb:insp:open', () => {
    const host = ensureHost();
    if (host) API.mount(host);
  });

  // 2) Manueller Trigger (Konsole/Tests)
  window.addEventListener('req:insp:content:mount', (ev) => {
    API.mount(ev?.detail?.host);
  });

  // Kleines Lebenszeichen
  (window.CBLog?.info || console.info)('[insp/content] bereit v1.0.1-final');
}());
