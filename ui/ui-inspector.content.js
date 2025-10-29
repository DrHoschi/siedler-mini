/* ============================================================================
 * Datei   : ui/ui-inspector.content.js
 * Projekt : Neue Siedler
 * Version : v25.10.31-content (auto-bootstrap UI for Inspector)
 * Zweck   : Baut die sichtbare Inspector-Oberfläche (Tabs + Panels), wenn leer.
 * Abhäng. : ui/ui-inspector.js (stellt Open/Close/Flags bereit)
 * Hinweise:
 *   - Host darf #inspector ODER #inspector-overlay heißen.
 *   - FAB-Variante A (immer sichtbar) bleibt unverändert.
 *   - Zeichnet console.log/warn/error in "Logs" mit; hört auf einige cb:* Events.
 * ========================================================================== */

/* ============================= [1] HELPERS ================================ */
function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function getHost(){
  return $("#inspector") || $("#inspector-overlay");
}

function ensureMarkup(host){
  if(!host) return;
  if(host.querySelector(".insp-shell")) return; // schon vorhanden → nichts tun

  host.innerHTML = `
    <div class="insp-shell" role="dialog" aria-label="Inspector">
      <div class="insp-header">
        <div class="insp-tabs" role="tablist" aria-label="Inspector Tabs">
          <button class="insp-tab active" data-insp-tab="logs"       role="tab" aria-selected="true">Logs</button>
          <button class="insp-tab"          data-insp-tab="build"      role="tab" aria-selected="false">Build</button>
          <button class="insp-tab"          data-insp-tab="resources"  role="tab" aria-selected="false">Ressourcen</button>
          <button class="insp-tab"          data-insp-tab="paths"      role="tab" aria-selected="false">Pfade</button>
          <button class="insp-tab"          data-insp-tab="tests"      role="tab" aria-selected="false">Tests</button>
        </div>
        <span class="hint">Inspector v25.10.31</span>
      </div>

      <div class="insp-content">
        <!-- Logs -->
        <section data-panel="logs">
          <div class="toolbar">
            <strong>Konsole</strong>
            <button type="button" id="insp-clear-log">Leeren</button>
            <span class="hint muted">Erfasst console.log/warn/error + ausgewählte cb:* Events</span>
          </div>
          <table class="inspector-table" id="insp-log-table">
            <thead>
              <tr><th style="width:110px">Zeit</th><th style="width:70px">Typ</th><th>Nachricht</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </section>

        <!-- Build -->
        <section data-panel="build" hidden>
          <div class="toolbar"><strong>Build</strong><span class="hint muted">Demo-Panel</span></div>
          <div id="insp-build-info" class="pad muted">Wartet auf cb:build:* / Datenquelle.</div>
        </section>

        <!-- Ressourcen -->
        <section data-panel="resources" hidden>
          <div class="toolbar"><strong>Ressourcen</strong><span class="hint muted">Live-Änderungen, wenn cb:res:change kommt</span></div>
          <table class="inspector-table" id="insp-res-table">
            <thead><tr><th>Ressource</th><th>Menge</th></tr></thead>
            <tbody></tbody>
          </table>
        </section>

        <!-- Pfade -->
        <section data-panel="paths" hidden>
          <div class="toolbar"><strong>Pfade</strong><span class="hint muted">Platzhalter (PathOverlay folgt laut TODO-Liste)</span></div>
          <div class="pad">Noch keine Daten injiziert.</div>
        </section>

        <!-- Tests -->
        <section data-panel="tests" hidden>
          <div class="toolbar">
            <strong>Tests</strong>
            <button type="button" id="insp-test-open">Open</button>
            <button type="button" id="insp-test-close">Close</button>
            <button type="button" id="insp-test-toggle">Toggle</button>
            <span class="hint muted">Schnelltest für Open/Close</span>
          </div>
          <div class="pad" id="insp-test-info">Bereit.</div>
        </section>
      </div>
    </div>
  `;
}

function formatTime(d=new Date()){
  const pad = (n)=> String(n).padStart(2,"0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,"0")}`;
}

/* ============================ [2] LOG SINK ================================ */
const Log = (()=> {
  let tbody = null;

  function ensure(){
    if(!tbody) tbody = $("#insp-log-table tbody", getHost());
  }

  function push(type, msg){
    ensure();
    if(!tbody) return;
    const tr = document.createElement("tr");
    const tdT = document.createElement("td");
    const tdC = document.createElement("td");
    const tdM = document.createElement("td");
    tdT.textContent = formatTime();
    tdC.textContent = type;
    tdC.className = type === "error" ? "error" : type === "warn" ? "warn" : "info";
    tdM.textContent = msg;
    tr.append(tdT, tdC, tdM);
    tbody.appendChild(tr);
    // Auto-Scroll unten halten
    tbody.parentElement?.parentElement?.scrollTo?.(0, tbody.parentElement.parentElement.scrollHeight);
  }

  function hookConsole(){
    const c = window.console;
    if(!c) return;
    const orig = {
      log: c.log?.bind(c),
      warn: c.warn?.bind(c),
      error: c.error?.bind(c)
    };
    c.log = (...a)=>{ try{ push("info", a.map(String).join(" ")); }catch{}; orig.log?.(...a); };
    c.warn= (...a)=>{ try{ push("warn", a.map(String).join(" ")); }catch{}; orig.warn?.(...a); };
    c.error=(...a)=>{ try{ push("error",a.map(String).join(" ")); }catch{}; orig.error?.(...a); };
  }

  return { push, hookConsole };
})();

/* ============================ [3] EVENTS ================================== */
function bindUi(){
  const host = getHost();
  if(!host) return;

  // Tabs
  host.addEventListener("click", (ev)=>{
    const btn = ev.target.closest?.(".insp-tab");
    if(!btn) return;
    const tab = btn.getAttribute("data-insp-tab");
    // Umschalten aktiv
    $all(".insp-tab", host).forEach(b=>{
      const active = b === btn;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    // Panels
    const showSel = `[data-panel="${tab}"]`;
    $all(".insp-content > section", host).forEach(sec=>{
      sec.toggleAttribute("hidden", !sec.matches(showSel));
    });
    // Info ins Log
    Log.push("info", `Tab → ${tab}`);
    // Upstream informieren (optional)
    window.dispatchEvent(new CustomEvent("cb:insp:tab:change", { detail:{ tab } }));
  }, { passive:true });

  // Log leeren
  $("#insp-clear-log", host)?.addEventListener("click", ()=>{
    const tb = $("#insp-log-table tbody", host);
    if(tb) tb.innerHTML = "";
  });

  // Test-Buttons
  $("#insp-test-open", host)?.addEventListener("click", ()=> window.UIInspector?.open());
  $("#insp-test-close", host)?.addEventListener("click",()=> window.UIInspector?.close());
  $("#insp-test-toggle",host)?.addEventListener("click",()=> window.UIInspector?.toggle());
}

function bindCoreEvents(){
  // Wir kennen nicht alle Events – wir hängen uns auf ein paar gängige drauf:
  const seen = (name)=>()=> Log.push("info", `Event: ${name}`);
  [
    "cb:ui-ready",
    "cb:hud-ready",
    "cb:assets-ready",
    "cb:registry:ready",
    "cb:res:change",
    "cb:res:reset",
    "cb:build:ready",
    "cb:insp:open",
    "cb:insp:close"
  ].forEach(evt=> window.addEventListener(evt, seen(evt)));

  // Ressourcenänderungen (wenn Detail anliegt)
  window.addEventListener("cb:res:change", (e)=>{
    try{
      const list = e?.detail?.list || e?.detail || {};
      const tbody = $("#insp-res-table tbody", getHost());
      if(!tbody) return;
      tbody.innerHTML = "";
      Object.entries(list).forEach(([key,val])=>{
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${key}</td><td>${val}</td>`;
        tbody.appendChild(tr);
      });
    }catch{}
  });
}

/* ============================ [4] INIT ==================================== */
document.addEventListener("DOMContentLoaded", ()=>{
  const host = getHost();
  if(!host){
    // Notfall: Host fehlt → kurz mitteilen (Log fängt es auf)
    console.warn("[inspector.content] Kein #inspector / #inspector-overlay gefunden.");
    return;
  }
  ensureMarkup(host);
  bindUi();
  bindCoreEvents();
  Log.hookConsole();

  // Start-Info
  console.log("[inspector.content] UI bereit");
  // Wenn Inspector gerade offen ist, zeigen wir 'Logs'
  if(document.body.classList.contains("is-inspector") ||
     document.body.classList.contains("inspector-open")){
    window.dispatchEvent(new CustomEvent("cb:insp:tab:change", { detail:{ tab:"logs" }}));
  }
});
