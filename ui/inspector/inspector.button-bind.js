/* ============================================================================
 * Datei   : ui/inspector/inspector.button-bind.js
 * Version : v25.10.30-bind4 (bootstrap + loop-safe)
 * Zweck   : Inspector-Button & Hotkey (I) – robust + loop-sicher
 *
 *  Fixes:
 *   • Bootstrap-Guard: 1. Klick wartet auf cb:inspector:ready, falls #inspector
 *     noch nicht existiert (öffnet dann automatisch).
 *   • Loop-Schutz: Wenn window.UIInspector existiert, NUR dessen toggle().
 *   • Sauberer Click: preventDefault + stopPropagation.
 *
 *  Events:
 *   – req:insp:toggle / req:insp:open / req:insp:close werden auf UIInspector
 *     gemappt (wenn vorhanden), sonst Fallback.
 * ========================================================================== */
(function () {
  'use strict';

  // ----- Doppel-Bind Guard ---------------------------------------------------
  if (window.__INSPECTOR_BIND_ATTACHED__) return;
  window.__INSPECTOR_BIND_ATTACHED__ = true;

  const MOD = '[insp-bind]';
  const LOG = (window.CBLog?.info || console.info).bind(console, MOD);

  // ----- Helpers -------------------------------------------------------------
  const hasUI = () => !!(window.UIInspector && typeof window.UIInspector.toggle === 'function');
  const host  = () => document.getElementById('inspector') || document.getElementById('inspector-overlay');

  function openSafe() {
    if (hasUI()) { window.UIInspector.open?.(); return; }
    // Fallback: kleiner DOM-Root zur Not
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

  // 1) Bootstrap-Guard: erster Klick, bevor #inspector existiert
  function toggleBootstrapAware() {
    if (host()) { toggleSafe(); return; }
    // Noch kein Host → auf Ready warten und dann EINMAL öffnen
    LOG('warte auf cb:inspector:ready …');
    const once = () => {
      window.removeEventListener('cb:inspector:ready', once);
      // kleiner Tick, damit Tabs gerendert sind
      setTimeout(() => toggleSafe(), 0);
    };
    window.addEventListener('cb:inspector:ready', once, { once: true });
    // Falls der Core schon fertig war, das Event manuell anschubsen:
    setTimeout(() => window.dispatchEvent(new Event('cb:inspector:ready')), 0);
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
      btn.style.bottom = '12px';
      btn.style.zIndex = '60';
      btn.style.padding = '6px 8px';
      btn.style.borderRadius = '6px';
      btn.style.border = '1px solid #444';
      btn.style.background = 'rgba(0,0,0,.55)';
      btn.style.color = '#e8e8f0';
      document.body.appendChild(btn);
    }

    // Click: sauber & loop-sicher
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleBootstrapAware();
    }, { passive: false });

    // Hotkey: I (ohne Alt/Ctrl/Meta)
    window.addEventListener('keydown', (e) => {
      if (!e || e.repeat) return;
      if ((e.key || '').toLowerCase() === 'i' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleBootstrapAware();
      }
    }, { passive: false });

    LOG('Button- und Hotkey-Handler gebunden');
  }

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', bind, { once: true })
    : bind();

  // ----- Externe Requests → auf UIInspector mappen ---------------------------
  window.addEventListener('req:insp:toggle', () => toggleBootstrapAware(), { passive: true });
  window.addEventListener('req:insp:open',   () => hasUI() ? window.UIInspector.open()  : openSafe(),  { passive: true });
  window.addEventListener('req:insp:close',  () => hasUI() ? window.UIInspector.close() : closeSafe(), { passive: true });

  // Optional: Sichtbarkeit des Buttons auch bei offenem Overlay sicherstellen
  try {
    const css = `
      body.is-inspector #btn-inspector{
        position: fixed;
        z-index: 2147483647 !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }`;
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
  } catch {}
})();
