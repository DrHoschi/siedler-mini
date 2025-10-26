/* ============================================================================
 * Datei   : ui/inspector/inspector.button-bind.js
 * Version : v25.10.27-bind2
 * Zweck   : Inspector-Button & Hotkey (I) – kompatibel mit altem und neuem Core
 *
 *  - Falls eine offizielle API existiert, wird sie genutzt:
 *      • window.__INSPECTOR_CORE__.api.toggle?.()
 *      • window.Inspector?.toggle?.()
 *  - Fallback: Root-Element (#inspector) sichtbar/unsichtbar schalten
 *  - Sendet Events: cb:insp:open / cb:insp:close
 *  - Einmaliger Bind-Guard gegen doppelte Handler
 * ========================================================================== */
(function () {
  'use strict';

  // ----- Doppel-Bind Guard ---------------------------------------------------
  if (window.__INSPECTOR_BIND_ATTACHED__) return;
  window.__INSPECTOR_BIND_ATTACHED__ = true;

  const MOD = '[insp-bind]';
  const LOG = (window.CBLog?.info || console.info).bind(console, MOD);

  // ----- Hilfen --------------------------------------------------------------
  function getRoot() {
    return document.getElementById('inspector');
  }
  function emit(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
  }

  // Kern: Toggle mit API-Präferenz, sonst DOM-Fallback
  function toggleInspector(force) {
    // 1) Bevorzugt: neue Core-API
    const api = window.__INSPECTOR_CORE__ && window.__INSPECTOR_CORE__.api;
    if (api && typeof api.toggle === 'function') {
      api.toggle(force);
      return;
    }

    // 2) Alt-API: window.Inspector.toggle
    if (window.Inspector && typeof window.Inspector.toggle === 'function') {
      window.Inspector.toggle(force);
      return;
    }

    // 3) Fallback: Sichtbarkeit des Root-Containers umschalten
    const root = getRoot() || (function () {
      // falls Core den Container noch nicht erzeugt hat: minimaler Root
      const n = document.createElement('div');
      n.id = 'inspector';
      n.className = 'inspector';
      n.style.position = 'fixed';
      n.style.left = '0';
      n.style.right = '0';
      n.style.bottom = '0';
      n.style.top = '0';
      n.style.background = 'rgba(0,0,0,.6)';
      n.style.zIndex = 50;
      n.style.color = '#fff';
      n.textContent = 'Inspector';
      document.body.appendChild(n);
      return n;
    })();

    const isHidden = root.hidden || root.style.display === 'none';
    const show = (typeof force === 'boolean') ? force : isHidden;

    root.hidden = !show;
    root.style.display = show ? '' : 'none';
    document.body.classList.toggle('is-inspector', show);

    emit(show ? 'cb:insp:open' : 'cb:insp:close');
  }

  // ----- Button anlegen/binden ----------------------------------------------
  function bind() {
    let btn = document.getElementById('btn-inspector');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'btn-inspector';
      btn.title = 'Inspector (I)';
      btn.type = 'button';
      btn.textContent = '⚙️';
      // minimale, robuste Positionierung – falls kein CSS greift
      btn.style.position = 'fixed';
      btn.style.right = '12px';
      btn.style.top = '12px';
      btn.style.zIndex = 60;
      btn.style.padding = '6px 8px';
      btn.style.borderRadius = '6px';
      btn.style.border = '1px solid #444';
      btn.style.background = 'rgba(0,0,0,.55)';
      btn.style.color = '#e8e8f0';
      document.body.appendChild(btn);
    }

    btn.addEventListener('click', () => toggleInspector());

    // Hotkey: I (ohne Alt/Ctrl/Meta)
    window.addEventListener('keydown', (e) => {
      if (!e || e.repeat) return;
      if ((e.key || '').toLowerCase() === 'i' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        toggleInspector();
      }
    });

    LOG('Button- und Hotkey-Handler gebunden');
  }

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', bind, { once: true })
    : bind();

  // Optional: externe Events zum Steuern
  window.addEventListener('req:insp:toggle', () => toggleInspector());
  window.addEventListener('req:insp:open',   () => toggleInspector(true));
  window.addEventListener('req:insp:close',  () => toggleInspector(false));
})();
