/* ============================================================================
 * Datei   : ui/inspector/inspector.button-bind.js
 * Version : v25.10.30-bind3   // [NEU] Version angehoben
 * Zweck   : Inspector-Button & Hotkey (I) – kompatibel mit altem und neuem Core
 *
 *  Aufruf-Priorität (robust, rückbaubar):
 *    0) [NEU] window.UIInspector?.toggle?.()  ← aktuelle API
 *    1)       window.__INSPECTOR_CORE__?.api.toggle?.()  ← neuerer Core
 *    2)       window.Inspector?.toggle?.()  ← alte API
 *    3)       DOM-Fallback: Host sichtbar/unsichtbar schalten
 *
 *  Events:
 *    - (wie bisher) cb:insp:open / cb:insp:close
 *    - [NEU]       cb:inspector:open / cb:inspector:close  (Kompat.)
 *
 *  Hinweise:
 *    - Nichts entfernt; Alt-Pfade bleiben erhalten.
 *    - Fallback setzt jetzt zusätzlich Host-Klasse ".open" und Body-Flag "is-inspector",
 *      damit dein aktuelles CSS den Overlay zuverlässig sichtbar macht.
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
    // [NEU] sowohl #inspector als auch #inspector-overlay unterstützen
    return (
      document.getElementById('inspector') ||
      document.getElementById('inspector-overlay') ||
      null
    );
  }

  function emitBoth(isOpen) {
    const evA = isOpen ? 'cb:insp:open'      : 'cb:insp:close';
    const evB = isOpen ? 'cb:inspector:open' : 'cb:inspector:close'; // [NEU]
    try { window.dispatchEvent(new CustomEvent(evA)); } catch {}
    try { window.dispatchEvent(new CustomEvent(evB)); } catch {}
  }

  function forceVisibleHost(show) {
    // [NEU] Body-Flag + Host.open entsprechen deinem CSS
    document.body.classList.toggle('is-inspector', !!show);
    document.body.classList.toggle('inspector-open', !!show); // alte Variante bleibt kompatibel
    const host = getRoot();
    if (host) {
      host.classList.toggle('open', !!show);
      if (show) {
        // Inline-Blocker entfernen, falls früher gesetzt
        host.removeAttribute('hidden');
        host.style.removeProperty('display');
        host.style.removeProperty('visibility');
        host.style.removeProperty('opacity');
      }
    }
  }

  // Kern: Toggle mit API-Präferenz, sonst DOM-Fallback
  function toggleInspector(force) {
    // 0) [NEU] Bevorzugt: neue UI-Bridge-API
    if (window.UIInspector && typeof window.UIInspector.toggle === 'function') {
      window.UIInspector.toggle(force);         // [NEU]
      return;
    }

    // 1) neuer Core
    const api = window.__INSPECTOR_CORE__ && window.__INSPECTOR_CORE__.api;
    if (api && typeof api.toggle === 'function') {
      api.toggle(force);
      return;
    }

    // 2) alte API
    if (window.Inspector && typeof window.Inspector.toggle === 'function') {
      window.Inspector.toggle(force);
      return;
    }

    // 3) DOM-Fallback (Host sichtbar/unsichtbar)
    const host = getRoot() || (function () {
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

    // ALT-Verhalten: display/hidden (lassen wir drin)
    const isHidden = host.hidden || host.style.display === 'none';
    const show = (typeof force === 'boolean') ? !!force : isHidden;

    host.hidden = !show;
    host.style.display = show ? '' : 'none';

    // [NEU] Zusätzlich Body-Flag & .open-Klasse für dein aktuelles CSS
    forceVisibleHost(show);

    // Events (alt + neu)
    emitBoth(show);
  }

  // ----- Button anlegen/binden ----------------------------------------------
  function bind() {
    let btn = document.getElementById('btn-inspector');
    if (!btn) {
      // Falls kein Button im DOM vorhanden ist → minimalen FAB erzeugen
      btn = document.createElement('button');
      btn.id = 'btn-inspector';
      btn.title = 'Inspector (I)';
      btn.type = 'button';
      btn.textContent = '⚙️';
      btn.style.fontSize = '25px';
      btn.style.lineHeight = '1';

      // minimale, robuste Positionierung – falls kein CSS greift
      btn.style.position = 'fixed';
      btn.style.right = '12px';
      btn.style.bottom = '12px';
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

  // Optional: externe Events zum Steuern (bleiben erhalten)
  window.addEventListener('req:insp:toggle', () => toggleInspector());
  window.addEventListener('req:insp:open',   () => toggleInspector(true));
  window.addEventListener('req:insp:close',  () => toggleInspector(false));
})();
