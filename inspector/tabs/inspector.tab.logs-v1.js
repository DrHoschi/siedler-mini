/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.logs-v1.js
 * Version : v25.11.13-stable
 * Zweck   : LOGS – Konsole mitschneiden & anzeigen (stabile Guards, Auto-Mount)
 * ========================================================================== */
(function () {
  // --------------------------- Run-Once Guards -----------------------------
  if (window.__INSPECTOR_TAB_LOGS__) return;
  window.__INSPECTOR_TAB_LOGS__ = true;

  // ------------------------------- State -----------------------------------
  const state = {
    items: [],
    filterText: '',
    types: { info:true, warn:true, error:true, debug:true },
    el: { tbody:null },
    mounted: false,
    readyLogged: false, // „bereit“-Meldung nur 1×
  };

  const nowStr = () => {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,'0')}`;
  };

  // ---------------------------- Console Hook -------------------------------
  function hookConsole() {
    if (window.__INSPECTOR_CONSOLE_HOOKED__) return;
    window.__INSPECTOR_CONSOLE_HOOKED__ = true;

    const orig = {
      log:   console.log.bind(console),
      info:  console.info.bind(console),
      warn:  console.warn.bind(console),
      error: console.error.bind(console),
      debug: (console.debug ? console.debug.bind(console) : console.log.bind(console)),
    };

    function proxy(type, ...a) {
      try { push(type, a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); } catch {}
      try { orig[type](...a); } catch {}
      try {
        window.dispatchEvent(new CustomEvent('cb:log', {
          detail: { level:type, msg: a.map(String).join(' ') }
        }));
      } catch {}
    }

    // Info → info, log → info (damit 4 Typen ausreichen)
    console.log   = (...a) => proxy('info',  ...a);
    console.info  = (...a) => proxy('info',  ...a);
    console.warn  = (...a) => proxy('warn',  ...a);
    console.error = (...a) => proxy('error', ...a);
    console.debug = (...a) => proxy('debug', ...a);
  }

  // ---------------------------- Data & Render ------------------------------
  function push(type, msg) {
    state.items.push({ time: nowStr(), type, msg: String(msg) });
    if (state.items.length > 1000) state.items.shift();
    render();
  }
  function filtered() {
    const t = state.filterText;
    return state.items.filter(it =>
      state.types[it.type] &&
      (t ? (it.msg.toLowerCase().includes(t) || it.type.includes(t) || it.time.includes(t)) : true)
    );
  }
  function render() {
    const tb = state.el.tbody;
    if (!tb) return;
    tb.innerHTML = '';
    for (const row of filtered()) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td style="width:120px">${row.time}</td><td style="width:70px">${row.type}</td><td>${row.msg}</td>`;
      tb.appendChild(tr);
    }
  }

  // ------------------------------ UI Mount ---------------------------------
  function mount(panel) {
    // idempotent: wenn es schon ein log-table in diesem Panel gibt → nichts tun
    if (panel.querySelector('#log-table')) {
      state.mounted = true;
      state.el.tbody = panel.querySelector('#log-table tbody');
      render();
      return;
    }

    panel.innerHTML = `
      <div class="insp-toolbar">
        <input id="log-filter" class="insp-input" placeholder="Filter (Text) …" style="min-width:220px">
        <label><input type="checkbox" id="log-f-info"  checked> info</label>
        <label><input type="checkbox" id="log-f-warn"  checked> warn</label>
        <label><input type="checkbox" id="log-f-error" checked> error</label>
        <label><input type="checkbox" id="log-f-debug" checked> debug</label>
        <span class="spacer"></span>
        <button class="insp-btn" id="log-clear">Leeren</button>
        <button class="insp-btn" id="log-copy">Kopieren</button>
        <button class="insp-btn" id="log-export-json">Export JSON</button>
        <button class="insp-btn" id="log-export-csv">Export CSV</button>
      </div>
      <table class="insp-table" id="log-table">
        <thead><tr><th>Zeit</th><th>Typ</th><th>Nachricht</th></tr></thead>
        <tbody></tbody>
      </table>
    `;
    state.el.tbody = panel.querySelector('#log-table tbody');
    state.mounted = true;

    // Wire up controls
    panel.querySelector('#log-filter')
      .addEventListener('input', e => { state.filterText = e.target.value.toLowerCase(); render(); });
    ['info','warn','error','debug'].forEach(t => {
      panel.querySelector('#log-f-' + t)
        .addEventListener('change', e => { state.types[t] = e.target.checked; render(); });
    });
    panel.querySelector('#log-clear').onclick        = () => { state.items.length = 0; render(); };
    panel.querySelector('#log-copy').onclick         = copyAll;
    panel.querySelector('#log-export-json').onclick  = exportJSON;
    panel.querySelector('#log-export-csv').onclick   = exportCSV;

    // Hook hier sicherstellen (falls Core später kam)
    hookConsole();

    if (!state.readyLogged) {
      state.readyLogged = true;
      push('info', 'Logs-Tab bereit (Konsole & cb:log aktiv).');
    }
    render();
  }

  // ---------------------------- Copy & Export ------------------------------
  async function copyAll() {
    try {
      const text = filtered().map(r => `${r.time}\t${r.type}\t${r.msg}`).join('\n');
      await navigator.clipboard.writeText(text || '(leer)');
      push('info', '[logs] in Zwischenablage kopiert.');
    } catch (e) { push('warn', '[logs] Copy fehlgeschlagen: ' + e); }
  }
  function download(name, data, type='application/octet-stream') {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = Object.assign(document.createElement('a'), { href:url, download:name });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function exportJSON(){ download('inspector-logs.json', JSON.stringify(filtered(), null, 2), 'application/json'); }
  function exportCSV(){
    const head = 'time,type,msg\n';
    const body = filtered().map(r => `"${r.time}","${r.type}","${r.msg.replace(/"/g,'""')}"`).join('\n');
    download('inspector-logs.csv', head + body, 'text/csv');
  }

  // --------------------------- Auto-Mount Wege -----------------------------
  // A) Sofort montieren, wenn Panel bereits existiert (z. B. Core initialisiert Tabs vor uns)
  function tryImmediateMount() {
    const panel = document.querySelector('[data-panel="logs"]');
    if (panel) mount(panel);
  }

  // B) Wenn Inspector-Core ready meldet, erneut versuchen
  window.addEventListener('cb:insp:core:ready', tryImmediateMount);

  // C) Beim Tabwechsel montieren, falls noch nicht geschehen
  window.addEventListener('cb:insp:tab:change', e => {
    if (e.detail?.tab !== 'logs') return;
    const panel = document.querySelector('[data-panel="logs"]');
    if (panel) mount(panel);
  });

  // D) Sicherheit: nach DOM ready einmal versuchen
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryImmediateMount, { once:true });
  } else {
    tryImmediateMount();
  }

  // ------------------------ Registrierung beim Core ------------------------
  if (typeof window.registerInspectorTab === 'function') {
    // Wichtig: idempotent – register liefert uns beim ersten Anzeigen das Panel
    window.registerInspectorTab('Logs 🧾', mount);
  } else {
    console.warn('[logs-tab] registerInspectorTab fehlt – Fallback Auto-Mount aktiv.');
  }

  console.info('[logs-tab] Modul geladen (' + 'v25.11.13-stable' + ')');
})();
