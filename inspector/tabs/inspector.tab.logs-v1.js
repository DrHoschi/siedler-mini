/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.logs-v1.js
 * Version : v25.11.01-final
 * Zweck   : LOGS – Konsole mitschneiden, filtern, kopieren, exportieren
 * Features: Text-Filter, Typ-Filter (info/warn/error/debug),
 *           Clear, Copy, Export JSON/CSV, Bridge-Ereignisse (cb:log)
 * ========================================================================== */
(function () {

  // --- [1] State / Basisfunktionen ------------------------------------------
  const state = {
    items: [],       // {time,type,msg}
    filterText: "",
    types: { info:true, warn:true, error:true, debug:true },
    hooked: false,
    orig: null,
    el: { tbody:null }
  };

  const nowStr = () => {
    const d = new Date(), p = n => String(n).padStart(2,"0");
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,'0')}`;
  };

  // --- [2] Console Hook + cb:log Bridge -------------------------------------
  function hookConsole(){
    if (state.hooked) return;
    const c = console;
    state.orig = {
      log:   c.log?.bind(c),
      warn:  c.warn?.bind(c),
      error: c.error?.bind(c),
      debug: c.debug?.bind(c)
    };
    const proxy = (type, ...a)=>{
      const msg = a.map(String).join(" ");
      push(type, msg);
      state.orig[type]?.(...a);
    };
    c.log   = (...a)=>proxy("info",  ...a);
    c.warn  = (...a)=>proxy("warn",  ...a);
    c.error = (...a)=>proxy("error", ...a);
    c.debug = (...a)=>proxy("debug", ...a);
    state.hooked = true;
  }

  // Bridge-Events empfangen (z. B. aus inspector.bridges.game.js)
  window.addEventListener("cb:log", e=>{
    const d = e.detail || {};
    push((d.level||"info").toLowerCase(), d.msg || "(ohne msg)");
  });

  // --- [3] Datenmanipulation ------------------------------------------------
  function push(type, msg){
    state.items.push({ time: nowStr(), type, msg: String(msg) });
    if (state.items.length > 500) state.items.shift();
    render();
  }

  function filtered(){
    const t = state.filterText;
    return state.items.filter(it =>
      state.types[it.type] &&
      (t ? (it.msg.toLowerCase().includes(t) || it.type.includes(t) || it.time.includes(t)) : true)
    );
  }

  // --- [4] UI-Erstellung ----------------------------------------------------
  function mount(panel){
    panel.innerHTML = `
      <div class="insp-toolbar">
        <input id="log-filter" class="insp-input" placeholder="Filter (Text)…" style="min-width:220px">
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
        <thead><tr><th style="width:120px">Zeit</th><th style="width:70px">Typ</th><th>Nachricht</th></tr></thead>
        <tbody></tbody>
      </table>
    `;

    state.el.tbody = panel.querySelector("#log-table tbody");

    // Bindings
    panel.querySelector("#log-filter").addEventListener("input", (e)=>{ state.filterText = e.target.value.toLowerCase(); render(); });
    ["info","warn","error","debug"].forEach(t=>{
      panel.querySelector("#log-f-"+t).addEventListener("change", (e)=>{ state.types[t] = e.target.checked; render(); });
    });
    panel.querySelector("#log-clear").onclick = ()=>{ state.items.length=0; render(); };
    panel.querySelector("#log-copy").onclick  = copyAll;
    panel.querySelector("#log-export-json").onclick = exportJSON;
    panel.querySelector("#log-export-csv").onclick  = exportCSV;

    hookConsole();
    push("info","Logs-Tab bereit (Konsole & cb:log aktiv).");
    render();
  }

  // --- [5] Render -----------------------------------------------------------
  function render(){
    const tb = state.el.tbody;
    if (!tb) return;
    tb.innerHTML = "";
    filtered().forEach(row=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${row.time}</td><td>${row.type}</td><td>${row.msg}</td>`;
      tb.appendChild(tr);
    });
  }

  // --- [6] Copy & Export ----------------------------------------------------
  async function copyAll(){
    try{
      const text = filtered().map(r=> `${r.time}\t${r.type}\t${r.msg}`).join("\n");
      await navigator.clipboard.writeText(text || "(leer)");
      push("info","[logs] in Zwischenablage kopiert.");
    }catch(e){ push("warn","[logs] Copy fehlgeschlagen: "+e); }
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

  // --- [7] Automatisches Mounten beim Tab-Wechsel ---------------------------
  function ensureMountedOnShow(){
    window.addEventListener("cb:insp:tab:change", (e)=>{
      if (e.detail?.tab !== "logs") return;
      const panel = document.querySelector('[data-panel="logs"]');
      if (!panel) return;
      if (!panel.querySelector("#log-table")) mount(panel);
    });
  }
  document.addEventListener("DOMContentLoaded", ensureMountedOnShow);

  // --- [8] Registrierung ----------------------------------------------------
  if (typeof window.registerInspectorTab === "function"){
    window.registerInspectorTab("logs🧾", mount);
  } else {
    console.warn("[logs-tab] registerInspectorTab fehlt.");
  }

})();
