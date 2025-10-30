/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.logs-v1.js
 * Version : v25.11.01
 * Zweck   : LOGS – Konsole mitschneiden, filtern, kopieren, exportieren
 * Features: Text-Filter, Typ-Filter (info/warn/error), Clear, Copy, Export JSON/CSV
 * ========================================================================== */
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
