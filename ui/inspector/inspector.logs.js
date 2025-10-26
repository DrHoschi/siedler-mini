/* ============================================================================
 * Datei   : ui/inspector/inspector.logs.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.28-final
 * Zweck   : Tab „Logs“ – Anzeige & Export aller CBLog-Einträge
 * ---------------------------------------------------------------------------
 * Features:
 *   • Automatische Erkennung vorhandener CBLog-Quellen (buffer/history/store)
 *   • Auto-Tap (fängt neue Einträge live ab)
 *   • Filter nach Level (Info/Warnung/Fehler/OK)
 *   • Kopieren & JSON-Export der sichtbaren Zeilen
 *   • Quelle/Ursprung optional anzeigen
 *   • „×“-Button zum Schließen des Inspectors
 * Abhängig : window.Inspector (Core), optional window.CBLog
 * Ereignisse: cb:insp:tab:change, cb:insp:export:logs
 * ========================================================================== */
(function () {
  'use strict';

  const MOD = '[inspector.logs]';
  const LOG = (window.CBLog?.info || console.info).bind(console, MOD);

  /* ---------------------------------------------------------------------------
   * [1] Konfiguration
   * ------------------------------------------------------------------------ */
  const CONFIG = {
    SHOW_SOURCE: false,
    TIME_FMT: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
    SYMBOLS: { error: '❌', warn: '⚠️', info: 'ℹ', ok: '✅' },
    LEVELS: ['info', 'warn', 'error', 'ok']
  };

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------------------------------------------------------------------------
   * [2] Hilfsfunktionen – Quelle & Tap-Mechanismus
   * ------------------------------------------------------------------------ */
  const LOCAL_TAP = [];

  // automatisch neue Logs aus CBLog abfangen
  function ensureAutoTap() {
    const cbl = window.CBLog;
    if (!cbl || cbl.__inspTapped) return;
    ['info', 'ok', 'warn', 'error'].forEach(lv => {
      const orig = cbl[lv];
      if (typeof orig !== 'function') return;
      cbl[lv] = function (...args) {
        LOCAL_TAP.push({ ts: Date.now(), lvl: lv, msg: args, origin: 'CBLog' });
        return orig.apply(this, args);
      };
    });
    cbl.__inspTapped = true;
  }

  // plausibles Array in CBLog finden
  function findLikelyLogArray(obj) {
    if (!obj || typeof obj !== 'object') return null;
    for (const v of Object.values(obj)) {
      if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v;
    }
    return null;
  }

  // Logs einsammeln & normalisieren
  function harvestLogs() {
    const cbl = window.CBLog || {};
    const list = cbl.buffer || cbl.history || cbl.store || findLikelyLogArray(cbl) || [];
    const all = [...list, ...LOCAL_TAP];
    return all.map(x => ({
      ts: x.ts || Date.now(),
      lvl: CONFIG.LEVELS.includes(x.lvl) ? x.lvl : 'info',
      msg: Array.isArray(x.msg) ? x.msg.join(' ') : String(x.msg ?? ''),
      source: x.origin || x.src || ''
    }));
  }

  /* ---------------------------------------------------------------------------
   * [3] Rendering
   * ------------------------------------------------------------------------ */
  (window.Inspector || {}).mount?.('logs', host => {
    host.innerHTML = '';

    // --- Rahmenstruktur ------------------------------------------------------
    const frame = document.createElement('div');
    frame.className = 'insp-frame';

    // Header mit Titel + Schließen-Button
    const header = document.createElement('div');
    header.className = 'insp-header';
    const h3 = document.createElement('h3');
    h3.textContent = 'Logs';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'insp-close';
    closeBtn.textContent = '×';
    closeBtn.title = 'Inspector schließen';
    closeBtn.onclick = () => window.Inspector?.close();
    header.append(h3, closeBtn);

    // Content
    const content = document.createElement('div');
    content.className = 'insp-content';
    const wrap = document.createElement('div');
    wrap.className = 'insp-logs pad';

    // --- Toolbar + Filter + Liste -------------------------------------------
    wrap.innerHTML = `
      <div class="insp-actions">
        <button class="insp-btn" id="log-copy">Kopieren</button>
        <button class="insp-btn" id="log-export">Export JSON</button>
        <label style="margin-left:8px;display:flex;gap:6px;align-items:center">
          <input type="checkbox" id="log-show-source"${CONFIG.SHOW_SOURCE ? ' checked' : ''}>
          <span style="opacity:.85">Quelle</span>
        </label>
        <button class="insp-btn" id="log-refresh" title="Neu laden">Refresh</button>
        <span id="log-hint" style="margin-left:6px;opacity:.8;font-size:.9em"></span>
      </div>

      <div class="insp-filters">
        <label><input type="checkbox" data-f="info"  checked> Info</label>
        <label><input type="checkbox" data-f="warn"  checked> Warnung</label>
        <label><input type="checkbox" data-f="error" checked> Fehler</label>
        <label><input type="checkbox" data-f="ok"    checked> Erfolg</label>
        <span id="log-count" style="margin-left:auto;opacity:.8">Logs gesamt: 0</span>
      </div>

      <div id="logs-list"></div>
    `;

    content.appendChild(wrap);
    frame.append(header, content);
    host.appendChild(frame);

    // --- Referenzen ----------------------------------------------------------
    const refs = {
      list: $('#logs-list', host),
      hint: $('#log-hint', host),
      count: $('#log-count', host),
      showSource: $('#log-show-source', host)
    };

    ensureAutoTap();

    // Einzelzeile formatieren
    const lineHTML = d => {
      const icon = CONFIG.SYMBOLS[d.lvl] || CONFIG.SYMBOLS.info;
      const ts = new Date(d.ts).toLocaleTimeString([], CONFIG.TIME_FMT);
      const src = (CONFIG.SHOW_SOURCE && d.source)
        ? `<span class="src" style="opacity:.7">[${d.source}]</span> `
        : '';
      return `<div class="insp-logline ${d.lvl}">
                <span class="sym">${icon}</span>
                <span class="ts">[${ts}]</span>
                ${src}<span class="txt">${d.msg}</span>
              </div>`;
    };

    // Filter anwenden
    function applyFilters() {
      const on = {};
      $$('.insp-filters input', host).forEach(chk => (on[chk.dataset.f] = chk.checked));
      $$('.insp-logline', host).forEach(row => {
        const lvl = CONFIG.LEVELS.find(k => row.classList.contains(k)) || 'info';
        row.style.display = on[lvl] ? '' : 'none';
      });
    }

    // Neu zeichnen
    function render() {
      CONFIG.SHOW_SOURCE = !!refs.showSource.checked;
      const data = harvestLogs();
      if (!data.length) {
        refs.list.innerHTML = `<div class="insp-placeholder">Keine Einträge (CBLog leer)</div>`;
        refs.count.textContent = 'Logs gesamt: 0';
        return;
      }
      refs.list.innerHTML = data.map(lineHTML).join('');
      refs.count.textContent = `Logs gesamt: ${data.length}`;
      applyFilters();
    }

    // --- Event-Wiring --------------------------------------------------------
    $$('.insp-filters input', host).forEach(chk => chk.onchange = applyFilters);
    refs.showSource.onchange = render;
    $('#log-refresh', host).onclick = () => { render(); refs.hint.textContent = 'aktualisiert'; setTimeout(() => refs.hint.textContent = '', 1200); };
    $('#log-copy', host).onclick = async () => {
      const visible = $$('.insp-logline', host).filter(el => el.style.display !== 'none')
        .map(el => el.innerText.replace(/\s+/g, ' ').trim());
      await navigator.clipboard.writeText(visible.join('\n'));
      refs.hint.textContent = `kopiert (${visible.length})`;
      setTimeout(() => refs.hint.textContent = '', 1500);
    };
    $('#log-export', host).onclick = () => {
      const rows = $$('.insp-logline', host).map(el => ({
        lvl: CONFIG.LEVELS.find(k => el.classList.contains(k)) || 'info',
        ts: el.querySelector('.ts')?.textContent?.replace(/\[|\]/g, '') || '',
        msg: el.querySelector('.txt')?.textContent || '',
        source: el.querySelector('.src')?.textContent?.replace(/\[|\]/g, '') || ''
      }));
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `logs_${new Date().toISOString().replace(/[:\.]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      refs.hint.textContent = `exportiert (${rows.length})`;
      setTimeout(() => refs.hint.textContent = '', 1500);
    };

    // Neu rendern bei Tab-Wechsel
    window.addEventListener('cb:insp:tab:change', e => {
      if ((e.detail?.tab || '') === 'logs') render();
    });

    // Initial-Render
    render();
    LOG('bereit v25.10.28-final');
  });
})();
