/* assets/inspector/inspector.js
 * v16.1.11
 *
 * Zweck
 *  - Immer sichtbar: runder Inspector-Button rechts-unten (Werkzeug-Icon).
 *  - Inspector als Overlay (vollflächig), öffnet/schließt per Button oder API.
 *  - Keine Änderungen am Startfenster/Design nötig.
 *
 * API (global):
 *  - window.GameInspector.mount(opts?)
 *  - window.GameInspector.open()
 *  - window.GameInspector.close()
 *  - window.GameInspector.toggle()
 *  - window.__CB_LOG__(line) -> hängt eine Logzeile unten an
 */

(function () {
  const NS = 'cb-inspector';
  const VERSION = (typeof document !== 'undefined' && (document.currentScript?.src.split('v=')[1])) || '16.1.11';

  // -------- DOM Helpers ------------------------------------------------------
  const el = (tag, cls, txt) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };

  const css = `
/* === Inspector (v${VERSION}) ============================================ */
.${NS}-fab {
  position: fixed;
  right: 16px; bottom: 16px;
  width: 56px; height: 56px;
  border-radius: 999px;
  background: rgba(30,30,30,.9);
  border: 1px solid rgba(255,255,255,.15);
  backdrop-filter: blur(6px);
  display: grid; place-items: center;
  color: #fff; font-size: 26px; line-height: 1;
  cursor: pointer; z-index: 999999;
  box-shadow: 0 6px 18px rgba(0,0,0,.35);
  user-select: none;
}
.${NS}-fab:hover { transform: translateY(-1px); }

.${NS}-panel {
  position: fixed; inset: 0;
  background: rgba(10,14,16,.88);
  color: #d7ece0;
  z-index: 999998;
  display: none; /* via JS: block */
}

.${NS}-wrap {
  box-sizing: border-box;
  max-width: 1100px;
  margin: 24px auto;
  padding: 16px;
}

.${NS}-card {
  background: rgba(22, 28, 30, .75);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
}

.${NS}-row { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
.${NS}-spacer { flex: 1; }

.${NS}-btn {
  appearance: none;
  border: 0; border-radius: 10px;
  padding: 10px 14px;
  background: #2f6f5b;
  color: #fff; font-weight: 600;
  cursor: pointer;
}
.${NS}-btn.secondary { background:#3a4247; }
.${NS}-btn.warn { background:#8a3d2f; }

.${NS}-badge {
  display:inline-block; padding:4px 8px; border-radius: 999px;
  font-size: 12px; font-weight: 700;
  color:#0c1a16; background:#74d3b2;
}

.${NS}-log {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 12px; line-height: 1.4;
  white-space: pre-wrap;
  background: rgba(0,0,0,.45);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px;
  padding: 10px;
  max-height: 45vh; overflow: auto;
  color: #dfe;
}
  `;

  // -------- State ------------------------------------------------------------
  let mounted = false;
  let panel, logBox, fab;

  function ensureStyle() {
    if (document.getElementById(`${NS}-style`)) return;
    const s = el('style');
    s.id = `${NS}-style`;
    s.textContent = css;
    document.head.appendChild(s);
  }

  function createFab() {
    if (fab && document.body.contains(fab)) return fab;
    fab = el('button', `${NS}-fab`, '🛠️'); // Werkzeug-Icon
    fab.title = 'Inspector öffnen (🛠️)';
    fab.addEventListener('click', toggle);
    document.body.appendChild(fab);
    return fab;
  }

  function createPanel() {
    if (panel && document.body.contains(panel)) return panel;

    panel = el('div', `${NS}-panel`);
    const wrap = el('div', `${NS}-wrap`);
    const card = el('div', `${NS}-card`);

    const header = el('div', `${NS}-row`);
    header.append(
      el('div', '', 'Inspector / Test-Cockpit'),
      el('span', `${NS}-badge`, `v${VERSION}`),
      el('div', `${NS}-spacer`)
    );

    const ctrlRow = el('div', `${NS}-row`);
    const btnClear = el('button', `${NS}-btn secondary`, 'Log leeren');
    btnClear.addEventListener('click', () => { logBox.textContent = ''; });

    const btnCopy = el('button', `${NS}-btn secondary`, 'Log kopieren');
    btnCopy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(logBox.textContent || '');
        appendLog('✅ (ok) Log in Zwischenablage');
      } catch {
        appendLog('❌ (err) Konnte Log nicht kopieren (Clipboard fehlgeschlagen).');
      }
    });

    const btnClose = el('button', `${NS}-btn warn`, 'Schließen');
    btnClose.addEventListener('click', close);

    ctrlRow.append(btnClear, btnCopy, el('div', `${NS}-spacer`), btnClose);

    logBox = el('div', `${NS}-log`);
    logBox.textContent = `[${ts()}] ✅ (ok) Inspector bereit (inspector.js v${VERSION})\n`;

    card.append(header, el('div','', ''), ctrlRow, el('div','', ''), logBox);
    wrap.appendChild(card);
    panel.appendChild(wrap);
    panel.addEventListener('click', (e) => {
      // Klick neben Karte => schließen
      if (e.target === panel) close();
    });
    document.body.appendChild(panel);
    return panel;
  }

  function ts() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    const ss = String(d.getSeconds()).padStart(2,'0');
    return `${hh}:${mm}:${ss}`;
  }

  function appendLog(line) {
    if (!logBox) return;
    const prefixed = line.startsWith('[') ? line : `[${ts()}] ${line}`;
    logBox.textContent += (logBox.textContent ? '\n' : '') + prefixed;
    logBox.scrollTop = logBox.scrollHeight;
  }

  // Öffnen/Schließen/Toggle ---------------------------------------------------
  function open() {
    createPanel().style.display = 'block';
  }
  function close() {
    if (panel) panel.style.display = 'none';
  }
  function toggle() {
    if (!panel || panel.style.display === 'none') open();
    else close();
  }

  // Public API ----------------------------------------------------------------
  const API = {
    mount(opts = {}) {
      if (mounted) return;
      mounted = true;
      ensureStyle();
      createPanel();
      createFab();

      // kleine Statusmeldung ins Log:
      appendLog(`✅ (ok) UI bereit (index v${opts.version || 'unbekannt'})`);

      // externe Logs erlauben:
      window.__CB_LOG__ = (msg) => appendLog(String(msg || ''));
    },
    open, close, toggle,
    version: VERSION
  };

  // an Fenster hängen
  window.GameInspector = API;

  // Auto-Mount als Fallback (falls index onload nicht feuert)
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    try { API.mount(); } catch(e){}
  } else {
    document.addEventListener('DOMContentLoaded', () => { try { API.mount(); } catch(e){} });
  }
})();
