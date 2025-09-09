/* ============================================================================
 * UI-Bridge – verbindet Buttons/FABs und Inspector/Build über Events
 * Version: v17.8.4
 * - Keine Fallback-Overlays mehr
 * - Stabile GameUI API (toggleBuild / toggleInspector)
 * - Saubere CustomEvents: cb:inspector-open/close/toggle, cb:build-open/close
 * ========================================================================== */
(function () {
  const LOG = (lvl, msg, ...a) =>
    (window.CBLog && CBLog[lvl] ? CBLog[lvl] : console.log).call(null, `[ui-bridge] ${msg}`, ...a);

  // kleine Helper
  const fire = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  // ---------- GameUI API (global) ----------
  window.GameUI = window.GameUI || {};

  let buildOpen = false;
  let inspectorOpen = false;

  GameUI.toggleBuild = function toggleBuild(force) {
    const next = typeof force === 'boolean' ? force : !buildOpen;
    if (next === buildOpen) return;
    buildOpen = next;
    fire(buildOpen ? 'cb:build-open' : 'cb:build-close');
    LOG('info', buildOpen ? 'Build geöffnet' : 'Build geschlossen');
  };

  GameUI.toggleInspector = function toggleInspector(force) {
    const next = typeof force === 'boolean' ? force : !inspectorOpen;
    inspectorOpen = next;
    fire('cb:inspector-toggle', { open: inspectorOpen });
    // für ältere Hooks weiterhin offene/geschlossene Events senden
    fire(inspectorOpen ? 'cb:inspector-open' : 'cb:inspector-close');
    LOG('info', inspectorOpen ? 'Inspector geöffnet' : 'Inspector geschlossen');
  };

  // Falls Inspector selbst meldet, ob er offen/zu ist (neue Versionen):
  window.addEventListener('inspector:state', (ev) => {
    if (typeof ev.detail?.open === 'boolean') {
      inspectorOpen = !!ev.detail.open;
    }
  });

  // ---------- FAB-Klicks “abholen”, falls inline-onclick aus index.html fehlt ----------
  function wireFab(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    const btn = el.querySelector('button') || el;
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handler();
    }, { passive: true });
  }

  wireFab('btn-build', () => GameUI.toggleBuild());
  wireFab('btn-inspector', () => GameUI.toggleInspector());

  // ---------- Body-Klassen für verschobene FABs ----------
  window.addEventListener('cb:build-open',  () => document.body.classList.add('has-build-open'));
  window.addEventListener('cb:build-close', () => document.body.classList.remove('has-build-open'));

  LOG('info', 'bereit (v17.8.4).');
})();
