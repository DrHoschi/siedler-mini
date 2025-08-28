<!-- Datei: assets/inspector/inspector.js -->
/**
 * Inspector Bootstrap (v16.1.6)
 * - Erstellt bei Bedarf Panel + Button automatisch
 * - Stellt window.GameInspector = { open, close, toggle, log } bereit
 * - Hängt sich an: cb:game-started (optional)
 */
(function () {
  const VERSION = '16.1.6';

  // ---------- Util: Log-Ausgabe auch in Panel spiegeln ----------
  function ts() {
    const d = new Date();
    return d.toLocaleTimeString();
  }

  // ---------- DOM: Button + Panel anlegen, falls nicht vorhanden ----------
  function ensureDOM() {
    // Button (unten rechts)
    let btn = document.getElementById('btn-inspector');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'btn-inspector';
      btn.type = 'button';
      btn.title = 'Inspector öffnen/schließen';
      btn.textContent = '🛠 Inspector';
      btn.style.position = 'fixed';
      btn.style.right = '12px';
      btn.style.bottom = '12px';
      btn.style.zIndex = '99998';
      btn.style.padding = '10px 14px';
      btn.style.borderRadius = '12px';
      btn.style.border = '1px solid rgba(0,0,0,.15)';
      btn.style.background = '#fff';
      btn.style.boxShadow = '0 2px 8px rgba(0,0,0,.15)';
      btn.style.font = '600 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      document.body.appendChild(btn);
    }

    // Panel (Fullscreen Overlay)
    let panel = document.getElementById('inspector-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'inspector-panel';
      panel.style.position = 'fixed';
      panel.style.inset = '0';
      panel.style.background = 'rgba(17,17,17,0.96)';
      panel.style.color = '#eaeaea';
      panel.style.zIndex = '99999';
      panel.style.display = 'none';
      panel.style.overscrollBehavior = 'contain';
      panel.innerHTML = `
        <div id="inspector-head" style="
          display:flex;align-items:center;gap:12px;justify-content:space-between;
          padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08);
          background:rgba(0,0,0,.25);backdrop-filter:saturate(1.2) blur(6px);">
          <div style="display:flex;gap:10px;align-items:center;">
            <span style="font-size:18px;">🛠</span>
            <strong>Inspector</strong>
            <small style="opacity:.7">v${VERSION}</small>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button id="inspector-clear" style="
              padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.15);
              background:#222;color:#eaeaea;">Log leeren</button>
            <button id="inspector-close" style="
              padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.15);
              background:#222;color:#eaeaea;">Schließen ✖</button>
          </div>
        </div>
        <div id="inspector-body" style="display:grid;grid-template-rows:auto 1fr; height:calc(100% - 0px);">
          <div id="inspector-tools" style="display:flex;gap:8px;align-items:center;padding:8px 16px;border-bottom:1px solid rgba(255,255,255,.06);">
            <span style="opacity:.8">Aktionen:</span>
            <button data-act="start-mini" class="ins-btn">Start map-mini</button>
            <button data-act="start-pro"  class="ins-btn">Start map-pro</button>
            <button data-act="reset"      class="ins-btn">Neu-Start</button>
            <style>
              .ins-btn{padding:6px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:#1d1d1f;color:#eaeaea}
              .ins-btn:hover{background:#2a2a2d}
              #inspector-log{font:12px ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;line-height:1.35;padding:12px 16px;overflow:auto}
              .log-ok{color:#7CFC7C}
              .log-warn{color:#FFD966}
              .log-err{color:#FF6B6B}
            </style>
          </div>
          <div id="inspector-log"></div>
        </div>
      `;
      document.body.appendChild(panel);
    }
    return { btn, panel };
  }

  // ---------- API ----------
  function open() {
    ensureDOM().panel.style.display = 'block';
  }
  function close() {
    const el = document.getElementById('inspector-panel');
    if (el) el.style.display = 'none';
  }
  function toggle() {
    const el = ensureDOM().panel;
    el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
  }
  function log(line, level='ok') {
    const wrap = document.getElementById('inspector-log') || ensureDOM().panel.querySelector('#inspector-log');
    const cls = level === 'err' ? 'log-err' : level === 'warn' ? 'log-warn' : 'log-ok';
    const row = document.createElement('div');
    row.className = cls;
    row.textContent = `[${ts()}] ${line}`;
    wrap.appendChild(row);
    wrap.scrollTop = wrap.scrollHeight;
  }

  // ---------- Bootstrap ----------
  const { btn, panel } = ensureDOM();

  // Button-Verkabelung
  btn.onclick = () => toggle();

  // Panel-Buttons
  panel.querySelector('#inspector-close').onclick = () => close();
  panel.querySelector('#inspector-clear').onclick = () => {
    const area = panel.querySelector('#inspector-log');
    area.textContent = '';
    log('Log geleert', 'ok');
  };

  // Tool-Aktionen im Inspector
  panel.querySelector('#inspector-tools').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const act = b.getAttribute('data-act');
    if (act === 'start-mini') {
      window.GameLoader?.start?.('./assets/maps/map-mini.json');
    } else if (act === 'start-pro') {
      window.GameLoader?.start?.('./assets/maps/map-pro.json');
    } else if (act === 'reset') {
      // gleiche Semantik wie im Startfenster
      localStorage.clear(); sessionStorage.clear(); caches?.keys?.().then(keys => keys.forEach(k => caches.delete(k)));
      location.reload();
    }
  });

  // Auf Events hören
  window.addEventListener('cb:game-started', () => log('Game gestartet (Event cb:game-started)', 'ok'));

  // Globale API bereitstellen
  window.GameInspector = { open, close, toggle, log, version: VERSION };

  // Beim Laden einen Status loggen
  log(`Inspector bereit (v${VERSION})`, 'ok');

  // Tastatur-Shortcut (optional): i = Inspector
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'i' || e.key === 'I') && !e.altKey && !e.ctrlKey && !e.metaKey) {
      toggle();
      e.preventDefault();
    }
  });
})();
