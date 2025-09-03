/* ============================================================================
 * assets/ui/ui-bridge.js — v17.7.6
 * Zweck:
 *   - Öffentliche Bridge für die beiden FABs (Build / Inspector)
 *   - Kein Überschreiben existierender Funktionen (defensiv!)
 *   - Kleine Troubleshoot-Hilfe, falls Inspector noch nicht initialisiert ist
 * Events:
 *   - dispatch: 'cb:build-open' / 'cb:build-close'
 *   - dispatch: 'cb:toggle-inspector' (nur als Fallback)
 * ========================================================================== */
(function () {
  'use strict';

  const LOG = (t, m) => (window.CBLog?.ok || console.log)(`[ui-bridge] ${t} ${m||''}`.trim());

  // Namespace
  const UI = (window.GameUI = window.GameUI || {});

  // ---------- Build ----------------------------------------------------------
  function setBuildOpen(open) {
    const panel = document.getElementById('build-panel');
    if (!panel) return;
    if (open) {
      panel.classList.add('open');
      document.body.classList.add('has-build-open');
      window.dispatchEvent(new Event('cb:build-open'));
    } else {
      panel.classList.remove('open');
      document.body.classList.remove('has-build-open');
      window.dispatchEvent(new Event('cb:build-close'));
    }
  }

  function toggleBuild(force) {
    const panel = document.getElementById('build-panel');
    if (!panel) {
      LOG('warn', 'Build-Panel nicht gefunden');
      return;
    }
    const willOpen = (typeof force === 'boolean') ? force : !panel.classList.contains('open');
    setBuildOpen(willOpen);
    LOG('ok', (willOpen ? 'geöffnet' : 'geschlossen') + ' (v17.7.6)');
  }

  if (typeof UI.toggleBuild !== 'function') UI.toggleBuild = toggleBuild;

  // ---------- Inspector ------------------------------------------------------
  // WICHTIG: Niemals überschreiben, falls der Inspector seine eigene Funktion
  // bereits gesetzt hat. Nur sanft befüllen.
  function toggleInspector(force) {
    // wenn inspector.js bereits eine Funktion registriert hat → delegieren
    if (typeof window.GameUI?.toggleInspector === 'function' && window.GameUI.toggleInspector !== toggleInspector) {
      return window.GameUI.toggleInspector(force);
    }
    // ansonsten probieren wir, das Panel zu finden (failsafe)
    const root = document.getElementById('inspector');
    if (root) {
      const visible = root.style.display !== 'none';
      const willOpen = (typeof force === 'boolean') ? force : !visible;
      root.style.display = willOpen ? 'block' : 'none';
      if (willOpen) root.classList.add('open'); else root.classList.remove('open');
      (window.CBLog?.ok || console.log)(`[ui-bridge] Inspector ${willOpen ? 'geöffnet' : 'geschlossen'} (failsafe)`);
      return;
    }
    // letzter Fallback: globales Event – die echte Inspector-Logik hört mit
    window.dispatchEvent(new CustomEvent('cb:toggle-inspector', { detail: { force: !!force } }));
    // kleines Badge, falls er nicht kommt
    showInspectorHint();
  }

  // Hinweis-Badge unten rechts, wenn Inspector (noch) nicht reagiert
  let hintTimer = 0;
  function showInspectorHint() {
    try {
      const id = '__insp_hint__';
      if (document.getElementById(id)) return;
      const el = document.createElement('div');
      el.id = id;
      el.textContent = 'Inspector lädt…';
      el.style.cssText =
        'position:fixed;right:16px;bottom:86px;padding:6px 10px;border-radius:999px;' +
        'background:rgba(20,20,20,.85);color:#ddd;font:12px/1.2 system-ui;z-index:2147483647;' +
        'box-shadow:0 6px 18px rgba(0,0,0,.35);pointer-events:none';
      document.body.appendChild(el);
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => el.remove(), 1600);
    } catch (_) {}
  }

  if (typeof UI.toggleInspector !== 'function') UI.toggleInspector = toggleInspector;

  LOG('bereit', '(v17.7.6)');
})();
