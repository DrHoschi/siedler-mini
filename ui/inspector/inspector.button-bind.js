/* ============================================================================
 * Datei   : ui/inspector/inspector.button-bind.js
 * Version : v25.10.30-bind5 (preserve styles + safe pin)
 * Zweck   : Inspector-Button & Hotkey (I) – robust, ohne Styles zu zerhauen.
 * Fixes   :
 *   • Überschreibt KEINE bestehenden Styles, wenn #btn-inspector bereits da ist.
 *   • Setzt Fallback-Styles NUR, wenn der Button neu erzeugt wird.
 *   • Pin rechts-unten mit Safe-Area; höchste z-index, saubere Größe.
 *   • Loop-sicher: bevorzugt window.UIInspector.toggle(), sonst Fallback.
 * ========================================================================== */
(function () {
  'use strict';
  if (window.__INSPECTOR_BIND_ATTACHED__) return;
  window.__INSPECTOR_BIND_ATTACHED__ = true;

  const hasUI = () => !!(window.UIInspector && typeof window.UIInspector.toggle === 'function');
  const host  = () => document.getElementById('inspector') || document.getElementById('inspector-overlay');

  function openSafe() {
    if (hasUI()) { window.UIInspector.open?.(); return; }
    let r = host();
    if (!r) {
      r = document.createElement('div');
      r.id = 'inspector';
      r.style.position = 'fixed';
      r.style.inset = '0';
      r.style.background = 'rgba(0,0,0,.6)';
      r.style.zIndex = '50';
      document.body.appendChild(r);
    }
    document.body.classList.add('is-inspector');
    r.classList.add('open');
    window.dispatchEvent(new CustomEvent('cb:insp:open'));
  }
  function closeSafe() {
    if (hasUI()) { window.UIInspector.close?.(); return; }
    const r = host();
    document.body.classList.remove('is-inspector');
    r?.classList.remove('open');
    window.dispatchEvent(new CustomEvent('cb:insp:close'));
  }
  function toggleSafe() {
    if (hasUI()) { window.UIInspector.toggle(); return; }
    const r = host();
    const nowOpen = !(document.body.classList.contains('is-inspector') || r?.classList.contains('open'));
    nowOpen ? openSafe() : closeSafe();
  }

  // Erstklick-Guard: falls der Inspector-Host noch nicht existiert
  function toggleBootstrapAware(e) {
    if (e) { e.preventDefault?.(); e.stopPropagation?.(); }
    if (host()) { toggleSafe(); return; }
    const once = () => {
      window.removeEventListener('cb:inspector:ready', once);
      setTimeout(() => toggleSafe(), 0);
    };
    window.addEventListener('cb:inspector:ready', once, { once: true });
    setTimeout(() => window.dispatchEvent(new Event('cb:inspector:ready')), 0);
  }

  function bind() {
    let btn = document.getElementById('btn-inspector');
    const existed = !!btn;

    if (!btn) {
      // Button neu anlegen → nur hier Default-Styles setzen
      btn = document.createElement('button');
      btn.id = 'btn-inspector';
      btn.title = 'Inspector (I)';
      btn.type = 'button';
      btn.textContent = '⚙️';

      // Fallback-Styles NUR bei Neuanlage:
      Object.assign(btn.style, {
        position: 'fixed',
        right: 'calc(14px + env(safe-area-inset-right))',
        bottom: 'calc(14px + env(safe-area-inset-bottom))',
        zIndex: '2147483647',
        width: '46px',
        height: '46px',
        fontSize: '24px',
        lineHeight: '46px',
        padding: '0',
        borderRadius: '10px',
        border: '0',
        background: 'rgba(0,0,0,.55)',
        color: '#e8e8f0',
        cursor: 'pointer',
        userSelect: 'none'
      });

      document.body.appendChild(btn);
    }
    // Wenn der Button schon existierte: KEINE Styles anfassen.
    // (Deine ui-inspector.css bleibt maßgeblich.)

    // Click & Hotkey
    btn.addEventListener('click', toggleBootstrapAware, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (!e || e.repeat) return;
      if ((e.key || '').toLowerCase() === 'i' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        toggleBootstrapAware(e);
      }
    }, { passive: false });

    // Button bleibt klickbar, selbst wenn Overlay offen ist
    try {
      const css = `
        body.is-inspector #btn-inspector{
          position: fixed;
          right: calc(14px + env(safe-area-inset-right));
          bottom: calc(14px + env(safe-area-inset-bottom));
          z-index: 2147483647 !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
        }`;
      const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    } catch {}

    const LOG = (window.CBLog?.info || console.info).bind(console, '[insp-bind]');
    LOG(`Button- und Hotkey-Handler gebunden (${existed ? 'existing' : 'created'})`);
  }

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', bind, { once: true })
    : bind();

  // externe Events → auf UIInspector/Fallback mappen
  window.addEventListener('req:insp:toggle', () => toggleBootstrapAware(), { passive: true });
  window.addEventListener('req:insp:open',   () => hasUI() ? window.UIInspector.open()  : openSafe(),  { passive: true });
  window.addEventListener('req:insp:close',  () => hasUI() ? window.UIInspector.close() : closeSafe(), { passive: true });
})();
