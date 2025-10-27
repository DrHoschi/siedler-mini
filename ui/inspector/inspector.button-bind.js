/* ============================================================================
 * Datei   : ui/inspector/inspector.button-bind.js
 * Version : v25.10.30-bind(final)
 * Zweck   : Inspector-FAB (⚙️) + Hotkey (I) – robust gegen alte/neue Core-APIs
 *
 * Reihenfolge:
 *   1) window.UIInspector.toggle(force)          (neue Bridge)
 *   2) window.__INSPECTOR_CORE__.api.toggle()    (Core-API)
 *   3) window.Inspector.toggle()                 (alte API)
 *   4) DOM-Fallback: Body-Flag + Host .open      (wenn gar keine API/Host)
 * ========================================================================== */
(function () {
  'use strict';

  if (window.__INSPECTOR_BIND_ATTACHED__) return;
  window.__INSPECTOR_BIND_ATTACHED__ = true;

  const LOG = (window.CBLog?.info || console.info).bind(console, '[insp-bind]');

  /* -------------------------- Hilfsfunktionen -------------------------- */
  function getHost() {
    return document.getElementById('inspector')
        || document.getElementById('inspector-overlay')
        || null;
  }

  function createHostIfMissing() {
    let h = getHost();
    if (h) return h;
    h = document.createElement('div');
    h.id = 'inspector';
    h.className = 'inspector';
    h.setAttribute('role', 'dialog');
    h.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);color:#fff;z-index:2147483000;';
    h.textContent = 'Inspector';
    document.body.appendChild(h);
    return h;
  }

  function domToggle(force) {
    const host = createHostIfMissing();
    const openNow = host.classList.contains('open')
                 || document.body.classList.contains('is-inspector')
                 || (host.style.display !== 'none' && !host.hidden);
    const show = (typeof force === 'boolean') ? force : !openNow;

    document.body.classList.toggle('is-inspector', show);
    document.body.classList.toggle('inspector-open', show); // Legacy
    host.classList.toggle('open', show);
    host.hidden = !show;
    host.style.display = show ? '' : 'none';

    LOG('DOM toggle →', show ? 'open' : 'close');
  }

  function toggle(force) {
    const hostExists = !!getHost();

    // 1) neue Bridge
    if (hostExists && typeof window.UIInspector?.toggle === 'function') {
      window.UIInspector.toggle(force); return;
    }
    // 2) Core-API
    const api = window.__INSPECTOR_CORE__?.api;
    if (hostExists && typeof api?.toggle === 'function') {
      api.toggle(force); return;
    }
    // 3) alte API
    if (hostExists && typeof window.Inspector?.toggle === 'function') {
      window.Inspector.toggle(force); return;
    }
    // 4) Fallback (Host erzwingen)
    domToggle(force);
  }

  function ensureButton() {
    let btn = document.getElementById('btn-inspector');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'btn-inspector';
      btn.title = 'Inspector (I)';
      btn.type = 'button';
      btn.textContent = '⚙️';
      document.body.appendChild(btn);
    }

    // Fallback-Styling (falls kein CSS greift)
    const cs = getComputedStyle(btn);
    if (cs.position === 'static' || cs.right === 'auto' || cs.bottom === 'auto') {
      btn.style.position = 'fixed';
      btn.style.right = '12px';
      btn.style.bottom = '12px';
      btn.style.zIndex = '2147483647';
      btn.style.padding = '6px 8px';
      btn.style.borderRadius = '10px';
      btn.style.border = '1px solid #444';
      btn.style.background = 'rgba(0,0,0,.55)';
      btn.style.color = '#e8e8f0';
      btn.style.fontSize = '20px';
      btn.style.lineHeight = '1';
      btn.style.cursor = 'pointer';
    }

    if (!btn.__inspClickBound) {
      btn.__inspClickBound = true;
      btn.addEventListener('click', () => toggle());
    }
  }

  function bindHotkey() {
    if (window.__INSP_HOTKEY_BOUND__) return;
    window.__INSP_HOTKEY_BOUND__ = true;
    window.addEventListener('keydown', (e) => {
      if (!e || e.repeat) return;
      if ((e.key || '').toLowerCase() === 'i' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        toggle();
      }
    }, { passive: true });
  }

  function bindExternal() {
    window.addEventListener('req:insp:toggle', () => toggle());
    window.addEventListener('req:insp:open',   () => toggle(true));
    window.addEventListener('req:insp:close',  () => toggle(false));
    // kompatible Eventnamen:
    window.addEventListener('req:inspector:toggle', () => toggle());
    window.addEventListener('req:inspector:open',   () => toggle(true));
    window.addEventListener('req:inspector:close',  () => toggle(false));
  }

  function start() {
    ensureButton();
    bindHotkey();
    bindExternal();
    LOG('Button/Hotkey gebunden');
  }

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', start, { once: true })
    : start();
})();
