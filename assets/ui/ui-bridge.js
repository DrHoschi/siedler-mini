/* ============================================================================
 * ui-bridge.js – v17.8.4
 * - Brücke zwischen UI (FAB-Buttons) und Inspector/Build
 * - Zeigt optional einen nicht-blockierenden "Fallback lädt…" Hinweis
 * - Verhindert doppelte Listener / Doppelklick-Erfordernis
 * ========================================================================== */

(() => {
  if (window.__UI_BRIDGE_INIT__) return; // Doppel-Init verhindern
  window.__UI_BRIDGE_INIT__ = true;

  const log = (lvl, ...a) => (window.CBLog?.[lvl] || console.log)(`[ui-bridge]`, ...a);

  // --- Kleinster Event-Bus Hilfsfunktion
  const fire = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));

  // --- DOM helpers
  const $ = (sel) => document.querySelector(sel);
  const create = (tag, cls) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  };

  // --- State
  let inspectorOpen = false;
  let buildOpen = false;
  let busy = false;               // Debounce fürs schnelle Tippen
  let fbTimer = null;             // Auto-Hide Timer für Fallback
  let fbEl = null;                // Fallback-Element-Handle

  // --- Fallback Overlay (klein, rein informativ)
  const ensureFallback = () => {
    if (fbEl) return fbEl;
    fbEl = create('div', 'ui-fallback');
    fbEl.setAttribute('role', 'status');
    fbEl.setAttribute('aria-live', 'polite');
    fbEl.innerHTML = `
      <div class="ui-fb-card">
        <div class="ui-fb-head">
          <strong>Inspector (Fallback)</strong>
          <button type="button" class="ui-fb-close" aria-label="Hinweis schließen">Schließen</button>
        </div>
        <div class="ui-fb-body">Inspector lädt…</div>
      </div>`;
    document.body.appendChild(fbEl);
    fbEl.querySelector('.ui-fb-close').addEventListener('click', () => {
      hideFallback();                      // Nur Hinweis schließen – NICHT den Inspector
      log('info', 'Fallback manuell geschlossen.');
    });
    return fbEl;
  };

  const showFallback = () => {
    const el = ensureFallback();
    el.style.display = 'block';
    // Sicherheit: nach 5s automatisch schließen, falls UI schon da ist
    clearTimeout(fbTimer);
    fbTimer = setTimeout(hideFallback, 5000);
    log('info', 'Inspector (Fallback) geöffnet.');
  };

  const hideFallback = () => {
    const el = ensureFallback();
    el.style.display = 'none';
    clearTimeout(fbTimer);
    fbTimer = null;
  };

  // --- Inspector API Guard
  const INS = {
    has() {
      return !!(window.__INSPECTOR_API__ && typeof window.__INSPECTOR_API__.toggle === 'function');
    },
    open() {
      if (this.has()) return window.__INSPECTOR_API__.open();
      return null;
    },
    close() {
      if (this.has()) return window.__INSPECTOR_API__.close();
      return null;
    },
    toggle() {
      if (this.has()) return window.__INSPECTOR_API__.toggle();
      return null;
    }
  };

  // --- Buttons (FABs)
  const btnBuild = $('#btn-build button');
  const btnInspector = $('#btn-inspector button');

  // Absicherung, falls Buttons noch nicht gerendert wurden
  if (!btnBuild || !btnInspector) {
    document.addEventListener('DOMContentLoaded', () => window.__UI_BRIDGE_INIT__ || window.location.reload());
  }

  // --- Toggle Build
  const openBuild = () => {
    if (buildOpen) return;
    buildOpen = true;
    fire('cb:build-open');
  };
  const closeBuild = () => {
    if (!buildOpen) return;
    buildOpen = false;
    fire('cb:build-close');
  };
  const toggleBuild = () => (buildOpen ? closeBuild() : openBuild());

  // --- Toggle Inspector (mit Fallback)
  const openInspector = () => {
    if (inspectorOpen) return;
    inspectorOpen = true;

    if (INS.has()) {
      INS.open();
    } else {
      // kein API – Hinweis einblenden, während core lädt
      showFallback();
      // als Signal an die App (falls Lazy-Loader vorhanden)
      fire('cb:inspector-wanted');
    }
  };

  const closeInspector = () => {
    if (!inspectorOpen) return;
    inspectorOpen = false;
    if (INS.has()) INS.close();
    hideFallback(); // sicherheitshalber
  };

  const toggleInspector = () => {
    if (busy) return;
    busy = true;
    setTimeout(() => (busy = false), 200); // kleiner Debounce
    return inspectorOpen ? closeInspector() : openInspector();
  };

  // --- Expose für onclick in index.html (GameUI.*)
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleBuild = toggleBuild;
  window.GameUI.toggleInspector = toggleInspector;

  // --- FAB Clicks
  btnBuild?.addEventListener('click', toggleBuild, { passive: true });
  btnInspector?.addEventListener('click', toggleInspector, { passive: true });

  // --- Reagiere auf Inspector-Open/Close Events vom core
  // Unterstützt mehrere mögliche Event-Namen, damit wir kompatibel bleiben.
  const onAny = (names, fn) => names.forEach(n => window.addEventListener(n, fn));
  onAny(['cb:inspector-open', 'inspector:open'], () => {
    inspectorOpen = true;
    hideFallback();
  });
  onAny(['cb:inspector-close', 'inspector:close'], () => {
    inspectorOpen = false;
    hideFallback();
  });

  // --- DOM-Observer: sobald #inspector existiert → Fallback aus
  const obs = new MutationObserver(() => {
    if (document.getElementById('inspector')) hideFallback();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  // --- Minimal CSS für den Fallback (eingebettet, damit unabhängig von externen Styles)
  const css = `
  .ui-fallback{position:fixed;right:16px;bottom:92px;z-index:2147483645;display:none}
  .ui-fb-card{min-width:240px;max-width:90vw;border-radius:10px;border:1px solid rgba(255,255,255,.12);
    background:rgba(20,20,25,.92);color:#e8eef4;box-shadow:0 18px 40px rgba(0,0,0,.45);backdrop-filter:blur(6px)}
  .ui-fb-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08)}
  .ui-fb-body{padding:12px}
  .ui-fb-close{background:#e8eef4;color:#1b2530;border:none;border-radius:16px;padding:6px 10px;cursor:pointer}
  .ui-fb-close:active{transform:translateY(1px)}
  `;
  const styleTag = create('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  // --- Ready
  log('info', 'bereit (v17.8.4).');
})();
