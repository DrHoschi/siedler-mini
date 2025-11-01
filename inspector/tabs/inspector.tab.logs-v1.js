/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.logs-v1.js
 * Version : v25.11.01
 * Zweck   : LOGS – Konsole mitschneiden, filtern, kopieren, exportieren
 * Features: Text-Filter, Typ-Filter (info/warn/error), Clear, Copy, Export JSON/CSV
 * ========================================================================== */
/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.logs-v1.js
 * Version : v1.0.0 (2025-11-01)
 * Zweck   : Logs-Tab – einfacher Platzhalter mit Hinweis
 * API     : window.registerInspectorTab('logs', renderFn)
 * Abhäng. : inspector.tabs.adapter.js (stellt registerInspectorTab bereit)
 * Hinweis : Hier aktuell nur statischer Hinweis – echte Log-Pipe später.
 * ========================================================================== */
(function () {
  function renderLogsTab(sectionEl) {
    sectionEl.innerHTML = [
      '<div class="insp-pad">',
      '<h3>Logs</h3>',
      '<p><em>(noch keine Log-Pipe angebunden)</em></p>',
      '<p>Später: EventBus-Mitschnitt oder Console-Proxy.</p>',
      '</div>'
    ].join('');
  }
  window.registerInspectorTab('logs', renderLogsTab);
})();

(() => {
  const state = {
    items: [],       // {time,type,msg}
    filterText: "",
    types: { info:true, warn:true, error:true },
    hooked: false,
    orig: null
  };

  function nowStr(){
    const d = new Date(), p=n=>String(n).padStart(2,"0");
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,'0')}`;
  }

  // Konsole hooken (einmalig)
  function hookConsole(){
    if (state.hooked) return;
    const c = console;
    state.orig = {
      log:   c.log?.bind(c),
      warn:  c.warn?.bind(c),
      error: c.error?.bind(c),
    };
    c.log = (...a)=>{ push("info",  a.map(String).join(" "));  state.orig.log(...a);   };
    c.warn= (...a)=>{ push("warn",  a.map(String).join(" "));  state.orig.warn(...a);  };
    c.error=(...a)=>{ push("error", a.map(String).join(" "));  state.orig.error(...a); };
    state.hooked = true;
  }

  function push(type, msg){
    state.items.push({ time: nowStr(), type, msg: String(msg) });
    render();
  }

  // Events des Inspectors ebenfalls aufnehmen (optional)
  window.addEventListener("cb:insp:open",  ()=> push("info","Inspector geöffnet"));
  window.addEventListener("cb:insp:close", ()=> push("info","Inspector geschlossen"));

  // UI bauen
  function mount(panel){
    panel.innerHTML = `
      <div class="insp-toolbar">
        <input id="log-filter" class="insp-input" placeholder="Filter (Text)…" style="min-width:220px">
        <label><input type="checkbox" id="log-f-info"  checked> info</label>
        <label><input type="checkbox" id="log-f-warn"  checked> warn</label>
        <label><input type="checkbox" id="log-f-error" checked> error</label>
        <span class="spacer"></span>
        <button class="insp-btn" id="log-clear">Leeren</button>
        <button class="insp-btn" id="log-copy">Kopieren</button>
        <button class="insp-btn" id="log-export-json">Export JSON</button>
        <button class="insp-btn" id="log-export-csv">Export CSV</button>
      </div>
      <table class="insp-table" id="log-table">
        <thead><tr><th style="width:120px">Zeit</th><th style="width:70px">Typ</th><th>Nachricht</th></tr></thead>
        <tbody></tbody>
      </table>
    `;

    // Bindings
    panel.querySelector("#log-filter").addEventListener("input", (e)=>{ state.filterText = e.target.value.toLowerCase(); render(); });
    panel.querySelector("#log-f-info").addEventListener("change", (e)=>{ state.types.info  = e.target.checked; render(); });
    panel.querySelector("#log-f-warn").addEventListener("change", (e)=>{ state.types.warn  = e.target.checked; render(); });
    panel.querySelector("#log-f-error").addEventListener("change", (e)=>{ state.types.error = e.target.checked; render(); });

    panel.querySelector("#log-clear").addEventListener("click", ()=>{ state.items.length=0; render(); });
    panel.querySelector("#log-copy").addEventListener("click", copyAll);
    panel.querySelector("#log-export-json").addEventListener("click", exportJSON);
    panel.querySelector("#log-export-csv").addEventListener("click", exportCSV);

    hookConsole(); // sicherstellen
    render();
  }

  function filtered(){
    const t = state.filterText;
    return state.items.filter(it =>
      state.types[it.type] &&
      (t ? (it.msg.toLowerCase().includes(t) || it.type.includes(t) || it.time.includes(t)) : true)
    );
  }

  function render(){
    const tb = document.querySelector('[data-panel="logs"] #log-table tbody');
    if (!tb) return;
    tb.innerHTML = "";
    filtered().forEach(row=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${row.time}</td><td>${row.type}</td><td>${row.msg}</td>`;
      tb.appendChild(tr);
    });
  }

  async function copyAll(){
    try{
      const text = filtered().map(r=> `${r.time}\t${r.type}\t${r.msg}`).join("\n");
      await navigator.clipboard.writeText(text || "(leer)");
      console.log("[logs] in Zwischenablage kopiert.");
    }catch(e){ console.warn("[logs] Copy fehlgeschlagen:", e); }
  }

  function download(name, data, type="application/octet-stream"){
    const url = URL.createObjectURL(new Blob([data], {type}));
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function exportJSON(){ download("inspector-logs.json", JSON.stringify(filtered(), null, 2), "application/json"); }
  function exportCSV(){
    const head = "time,type,msg\n";
    const body = filtered().map(r=>`"${r.time}","${r.type}","${r.msg.replace(/"/g,'""')}"`).join("\n");
    download("inspector-logs.csv", head+body, "text/csv");
  }

  // Mount beim Umschalten (einmalig/leichtgewichtig)
  function ensureMountedOnShow(){
    window.addEventListener("cb:insp:tab:change", (e)=>{
      if (e.detail?.tab !== "logs") return;
      const panel = document.querySelector('[data-panel="logs"]');
      if (!panel) return;
      if (!panel.querySelector("#log-table")) mount(panel);
    });
  }

  document.addEventListener("DOMContentLoaded", ensureMountedOnShow);
})();

/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.logs-v1.js
 * Version : v1.0.1 (2025-11-01)
 * Zweck   : Zeigt Events 'cb:log' aus der Bridge im Logs-Tab an
 * Abhäng. : registerInspectorTab(name, setup) – aus deinem bestehenden Inspector
 * ========================================================================== */
(function () {
  if (typeof window.registerInspectorTab !== 'function') {
    console.warn('[logs-tab] registerInspectorTab fehlt.');
    return;
  }

  const STATE = {
    cap: 300,
    buf: [],
    el: { list: null, counter: null }
  };
  const cssId = 'insp-logs-inline-style';
  function injectCSS(){
    if (document.getElementById(cssId)) return;
    const style = document.createElement('style');
    style.id = cssId;
    style.textContent = `
#inspector .logs-toolbar{display:flex;gap:.5rem;align-items:center;margin:0 0 .5rem}
#inspector .logs-btn{padding:.25rem .5rem;border:1px solid #333;background:#222;border-radius:.4rem;cursor:pointer}
#inspector .logs-list{height:calc(100% - 2.2rem);overflow:auto;border-top:1px solid #2a2a2e;padding:.35rem .25rem}
#inspector .logs-row{padding:.15rem .25rem;border-bottom:1px dashed #2a2a2e;white-space:pre-wrap;word-break:break-word}
#inspector .logs-row:last-child{border-bottom:none}
#inspector .logs-ts{opacity:.6;margin-right:.5rem}
#inspector .logs-lvl{display:inline-block;min-width:3.2rem;text-align:center;border-radius:.35rem;padding:.05rem .3rem;margin-right:.5rem;opacity:.9}
#inspector .logs-log .logs-lvl{background:#2a2f39}
#inspector .logs-info .logs-lvl{background:#233b56}
#inspector .logs-warn .logs-lvl{background:#4a3c1b}
#inspector .logs-error .logs-lvl{background:#4a1b1b}
#inspector .logs-debug .logs-lvl{background:#2a2a2a}
    `;
    document.head.append(style);
  }

  function row(entry){
    const div = document.createElement('div');
    div.className = 'logs-row logs-' + entry.level;
    const ts  = document.createElement('span'); ts.className='logs-ts';  ts.textContent = entry.ts;
    const lvl = document.createElement('span'); lvl.className='logs-lvl'; lvl.textContent = entry.level.toUpperCase();
    const msg = document.createElement('span'); msg.className='logs-msg'; msg.textContent = entry.msg;
    div.append(ts, lvl, msg);
    return div;
  }

  function push(entry){
    STATE.buf.push(entry);
    if (STATE.buf.length > STATE.cap) STATE.buf.splice(0, STATE.buf.length - STATE.cap);
    render();
  }

  function render(){
    const {list, counter} = STATE.el;
    if (!list) return;
    list.innerHTML = '';
    for (const e of STATE.buf) list.append(row(e));
    if (counter) counter.textContent = String(STATE.buf.length);
    list.scrollTop = list.scrollHeight;
  }

  // === Registrierung im bestehenden Inspector ===
  window.registerInspectorTab('logs', function setup(section){
    injectCSS();

    // Toolbar
    const toolbar = document.createElement('div'); toolbar.className='logs-toolbar';
    const clearBtn = document.createElement('button'); clearBtn.className='logs-btn'; clearBtn.textContent='Clear';
    const count    = document.createElement('span'); count.className='logs-count'; count.textContent='0';
    toolbar.append(clearBtn, count);

    // Liste
    const list = document.createElement('div'); list.className='logs-list';
    section.innerHTML = '<h2>Logs</h2>';
    section.append(toolbar, list);

    STATE.el.list = list;
    STATE.el.counter = count;

    clearBtn.onclick = () => { STATE.buf.length = 0; render(); };

    // Listener: Bridge-Events
    function onLog(ev){
      const d = ev.detail || {};
      const level = (d.level || 'log').toLowerCase();
      const msg   = (d.msg != null ? String(d.msg) : '(ohne msg)');
      const ts    = new Date().toISOString().replace('T',' ').replace('Z','');
      push({ ts, level, msg });
    }
    window.addEventListener('cb:log', onLog);

    // Erste Ausgabe – damit man sofort etwas sieht
    push({ ts: new Date().toISOString().replace('T',' ').replace('Z',''), level: 'info',
           msg: 'Logs-Tab bereit (wartet auf console.* via Bridge)' });

    // Cleanup ist nicht nötig (Section bleibt bestehen)
  });
})();
