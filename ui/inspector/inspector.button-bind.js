/* ============================================================================
 * Datei   : ui/inspector/inspector.button-bind.js
 * Version : v25.10.30-bind4
 * Zweck   : Inspector-FAB (⚙️) + Hotkey (I) – IMMER verfügbar
 *
 * Verhalten / Priorität:
 *   1) window.UIInspector.toggle(force)        ← neue Bridge-API
 *   2) window.__INSPECTOR_CORE__.api.toggle()  ← Core-API (falls vorhanden)
 *   3) window.Inspector.toggle()               ← alte API
 *   4) DOM-Fallback: Body-Flag + Host.open     ← garantiert sichtbar
 *
 * Hinweise:
 *   - Erstellt den Button, wenn keiner im DOM ist.
 *   - Setzt bottom-right Inline-Styles als Fallback (CSS kann überstimmen).
 *   - Idempotent: Bind findet nur 1x statt.
 * ========================================================================== */
(function () {
  'use strict';

  // ----- Doppel-Bind Guard ---------------------------------------------------
  if (window.__INSPECTOR_BIND_ATTACHED__) return;
  window.__INSPECTOR_BIND_ATTACHED__ = true;

  const MOD = '[insp-bind]';
  const LOG = (window.CBLog?.info || console.info).bind(console, MOD);

  // ----- Hilfen --------------------------------------------------------------
  function getHost() {
    return document.getElementById('inspector') ||
           document.getElementById('inspector-overlay') ||
           null;
  }

  function forceVisibleHost(show) {
    // Flags passend zu deinem CSS
    document.body.classList.toggle('is-inspector', !!show);
    document.body.classList.toggle('inspector-open', !!show); // Legacy
    const host = getHost();
    if (host) {
      host.classList.toggle('open', !!show);
      if (show) {
        host.removeAttribute('hidden');
        host.style.removeProperty('display');
        host.style.removeProperty('visibility');
        host.style.removeProperty('opacity');
      }
    }
  }

  function ensureHost() {
    // Minimal-Host erzeugen, falls gar keiner existiert (nur Fallback)
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

  // Kern: Toggle mit API-Priorität, aber NUR wenn ein Host existiert.
// Fehlt der Host, erzwingen wir den DOM-Fallback (Host erzeugen + öffnen).
function toggleInspector(force) {
  // Helper um Host zu prüfen
  var host = document.getElementById('inspector') || document.getElementById('inspector-overlay');

  // 1) Neue Bridge-API – nur benutzen, wenn Host existiert
  if (window.UIInspector && typeof window.UIInspector.toggle === 'function' && host) {
    window.UIInspector.toggle(force);
    return;
  }

  // 2) Neuer Core – ebenfalls nur mit Host sinnvoll
  var api = window.__INSPECTOR_CORE__ && window.__INSPECTOR_CORE__.api;
  if (api && typeof api.toggle === 'function' && host) {
    api.toggle(force);
    return;
  }

  // 3) Alte API – auch hier: nur sinnvoll mit Host
  if (window.Inspector && typeof window.Inspector.toggle === 'function' && host) {
    window.Inspector.toggle(force);
    return;
  }

  // 4) DOM-Fallback: Wenn wir hier sind, fehlt der Host ODER es gibt gar keine API.
  //    -> Host sicherstellen + Body/Host-Flags setzen (sichtbar).
  host = (function ensureHost(){
    var h = document.getElementById('inspector') || document.getElementById('inspector-overlay');
    if (h) return h;
    h = document.createElement('div');
    h.id = 'inspector';
    h.className = 'inspector';
    h.setAttribute('role','dialog');
    h.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);color:#fff;z-index:2147483000;';
    h.textContent = 'Inspector';
    document.body.appendChild(h);
    return h;
  })();

  var isOpen = host.classList.contains('open') && !host.hidden && host.style.display !== 'none';
  var show   = (typeof force === 'boolean') ? !!force : !isOpen;

  host.hidden = !show;
  host.style.display = show ? '' : 'none';
  host.classList.toggle('open', show);
  document.body.classList.toggle('is-inspector', show);
  document.body.classList.toggle('inspector-open', show); // Legacy

  (window.CBLog?.info||console.info)('[insp-bind] DOM toggle →', show ? 'open' : 'close');
}
    // 2) Neuer Core
    const api = window.__INSPECTOR_CORE__ && window.__INSPECTOR_CORE__.api;
    if (api && typeof api.toggle === 'function') {
      api.toggle(force);
      return;
    }
    // 3) Alte API
    if (window.Inspector && typeof window.Inspector.toggle === 'function') {
      window.Inspector.toggle(force);
      return;
    }
    // 4) DOM-Fallback (garantiert sichtbar/unsichtbar)
    const host = ensureHost();
    const isHidden = host.hidden || host.style.display === 'none' || !host.classList.contains('open');
    const show = (typeof force === 'boolean') ? !!force : isHidden;
    host.hidden = !show;
    host.style.display = show ? '' : 'none';
    forceVisibleHost(show);
    LOG('DOM toggle →', show ? 'open' : 'close');
  }

  // Sorgt dafür, dass der Button existiert und unten rechts sitzt
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

    // Inline-Fallback-Styling (falls CSS noch nicht greift)
    const cs = getComputedStyle(btn);
    const needsInline =
      !cs.position || cs.position === 'static' ||
      cs.right === 'auto' || cs.bottom === 'auto';
    if (needsInline) {
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

    // Klick-Bind idempotent
    if (!btn.__inspClickBound) {
      btn.__inspClickBound = true;
      btn.addEventListener('click', () => toggleInspector());
    }
    return btn;
  }

  // Hotkey (I) – idempotent
  function bindHotkey() {
    if (window.__INSP_HOTKEY_BOUND__) return;
    window.__INSP_HOTKEY_BOUND__ = true;
    window.addEventListener('keydown', (e) => {
      if (!e || e.repeat) return;
      if ((e.key || '').toLowerCase() === 'i' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        toggleInspector();
      }
    }, { passive: true });
  }

  function bindExternalEvents() {
    // externe Steuersignale – bleiben kompatibel
    window.addEventListener('req:insp:toggle', () => toggleInspector());
    window.addEventListener('req:insp:open',   () => toggleInspector(true));
    window.addEventListener('req:insp:close',  () => toggleInspector(false));
    window.addEventListener('req:inspector:toggle', () => toggleInspector());
    window.addEventListener('req:inspector:open',   () => toggleInspector(true));
    window.addEventListener('req:inspector:close',  () => toggleInspector(false));
  }

  // ----- Start ----------------------------------------------------------------
  function start() {
    ensureButton();
    bindHotkey();
    bindExternalEvents();
    LOG('Button/Hotkey gebunden (bind4)');
  }

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', start, { once: true })
    : start();
})();
