/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Version: v18.10.7
 * Zweck : Logs-Tab für Inspector-Panel (Filter, Suche, Kopieren, Export)
 *
 * WICHTIG:
 *  - Entfernt alte schwebende Log-Docks am <body>, damit nichts „unten hängt“.
 *  - Baut die Toolbar im Panel-Header des Inspectors auf.
 *  - Nutzt CBLog, fällt sanft auf console.* zurück (nur Anzeige, kein Patch).
 *
 * Erwartete DOM-Struktur (aus inspector.core.js):
 *   #inspector .ins-panel
 *     .ins-head  (Headerleiste)
 *     .ins-tabs  (Tab-Buttons)
 *     .ins-body  (Panel-Inhalt)
 *     .ins-foot  (Fußzeile / Versionshinweis)
 *   Ein Tab-Button mit data-tab="logs" existiert (wird aktiv geschaltet).
 * ========================================================================== */

(function(){
  "use strict";

  const MOD = "[inspector.logs]";
  const VER = "v18.10.7";
  const log  = (t,...a)=> (window.CBLog?.info || console.log)(`${MOD} ${t}`, ...a);
  const warn = (t,...a)=> (window.CBLog?.warn || console.warn)(`${MOD} ${t}`, ...a);

  // --- Legacy Floating Dock killen ------------------------------------------
  function killLegacyDock(){
    try {
      const killers = [
        "#ins-logdock", ".ins-logdock", "#log-dock",
        ".log-dock", ".logdock", "[data-legacy-logdock]"
      ];
      killers.forEach(sel => document.querySelectorAll(sel).forEach(n => n.remove()));
    } catch(_) {}
  }

  // --- Panel-Zugriffe --------------------------------------------------------
  const $ = (sel, root=document)=> root.querySelector(sel);
  function panelRoot(){ return $("#inspector"); }
  function headEl(){ return $("#inspector .ins-head"); }
  function bodyEl(){ return $("#inspector .ins-body"); }

  // --- State ----------------------------------------------------------------
  let filter = { err:true, warn:true, ok:true, info:true };
  let query  = "";
  let buffer = [];      // {time, level, scope, text}
  let preEl  = null;    // <pre> für Logausgabe
  let searchInput = null;

  // --- Datenquelle -----------------------------------------------------------
  function pullInitialBuffer(){
    try{
      // bevorzugt: CBLog.getBuffer() → [{time, level, scope, text}]
      if (window.CBLog && typeof CBLog.getBuffer === "function") {
        return CBLog.getBuffer() || [];
      }
    }catch(_){}
    return [];
  }

  function subscribe(){
    // CBLog sendet optional Events; sonst keine Subskription notwendig.
    try{
      if (window.CBLog && CBLog.on) {
        CBLog.on("append", onIncomingLog);
      } else {
        // Minimal-Fallback: NICHT patchen – nur Hinweis
        warn("CBLog-Events nicht verfügbar – es werden nur Initial-Logs angezeigt.");
      }
    }catch(_){}
  }

  function onIncomingLog(entry){
    try{
      // Normalisieren
      const e = normalize(entry);
      buffer.push(e);
      // Nur anhängen, wenn Logs-Tab aktiv
      const tabActive = $("#inspector .ins-tabs .ins-tab.active[data-tab='logs']");
      if (tabActive && preEl) {
        if (match(e)) {
          preEl.textContent += formatLine(e) + "\n";
          preEl.scrollTop = preEl.scrollHeight;
        }
      }
    }catch(_){}
  }

  function normalize(e){
    // Erwartet: { time?, level?, scope?, text? }  – macht defaults draus
    const time  = e?.time  || new Date();
    const lvl   = (e?.level || "LOG").toUpperCase();
    const scope = e?.scope || "console";
    const text  = (typeof e?.text === "string") ? e.text
                 : (Array.isArray(e?.args) ? e.args.join(" ") : (e?.msg || e?.message || "" ));
    return { time, level:lvl, scope, text };
  }

  // --- Rendering -------------------------------------------------------------
  function renderIntoPanel(){
    const head = headEl();
    const body = bodyEl();
    if (!head || !body) return;

    // erst alles säubern (Toolbar + Body)
    head.querySelectorAll(".ins-log-toolbar").forEach(n=>n.remove());
    body.innerHTML = "";

    // Toolbar in den Header
    const bar = document.createElement("div");
    bar.className = "ins-log-toolbar";
    bar.innerHTML = `
      <div class="ins-filters">
        <button type="button" class="ins-chip ins-err"  data-k="err"  aria-pressed="true"><span>✖</span> ERR</button>
        <button type="button" class="ins-chip ins-warn" data-k="warn" aria-pressed="true"><span>⚠️</span> WARN</button>
        <button type="button" class="ins-chip ins-ok"   data-k="ok"   aria-pressed="true"><span>✔</span> OK</button>
        <button type="button" class="ins-chip ins-info" data-k="info" aria-pressed="true"><span>ℹ︎</span> INFO</button>
      </div>
      <div class="ins-tools">
        <input type="search" class="ins-search" placeholder="Suche…" aria-label="Logs durchsuchen">
        <button type="button" class="ins-btn" data-act="copy">Kopieren</button>
        <button type="button" class="ins-btn" data-act="export">Export</button>
      </div>
    `;
    head.appendChild(bar);

    // Body: Log-Ausgabe
    const wrap = document.createElement("div");
    wrap.className = "ins-log-wrap";
    preEl = document.createElement("pre");
    preEl.className = "ins-log-pre";
    preEl.textContent = "Logs werden initialisiert …\n";
    wrap.appendChild(preEl);
    body.appendChild(wrap);

    // UI-Hooks
    bar.querySelectorAll(".ins-chip").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const k = btn.dataset.k;
        filter[k] = !filter[k];
        btn.setAttribute("aria-pressed", String(filter[k]));
        drawAll();
      });
    });
    searchInput = bar.querySelector(".ins-search");
    searchInput.addEventListener("input", ()=>{
      query = searchInput.value.trim();
      drawAll();
    });
    bar.querySelector("[data-act='copy']").addEventListener("click", copyToClipboard);
    bar.querySelector("[data-act='export']").addEventListener("click", exportToFile);
  }

  function formatTime(d){
    const hh = String(d.getHours()).padStart(2,"0");
    const mm = String(d.getMinutes()).padStart(2,"0");
    const ss = String(d.getSeconds()).padStart(2,"0");
    return `${hh}:${mm}:${ss}`;
  }
  function formatLine(e){
    const t = (e.time instanceof Date) ? e.time : new Date(e.time);
    return `[${formatTime(t)}] ${e.level.padEnd(5)} [${e.scope}] ${e.text}`;
  }
  function match(e){
    // Filter nach Level
    const lvl = e.level.toUpperCase();
    const inLvl =
      (lvl.includes("ERR")  && filter.err ) ||
      (lvl.includes("WARN") && filter.warn) ||
      (lvl.includes("OK")   && filter.ok  ) ||
      (lvl.includes("INFO") && filter.info) ||
      (lvl === "LOG"        && (filter.ok || filter.info)); // „LOG“ zählt neutral
    if (!inLvl) return false;
    // Suche
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (e.text  || "").toLowerCase().includes(q) ||
      (e.scope || "").toLowerCase().includes(q) ||
      (e.level || "").toLowerCase().includes(q)
    );
  }

  function drawAll(){
    if (!preEl) return;
    preEl.textContent = "";
    const out = buffer.filter(match).map(formatLine).join("\n");
    preEl.textContent = out || "Noch keine Logs …";
    preEl.scrollTop = preEl.scrollHeight;
  }

  function copyToClipboard(){
    try{
      const text = preEl?.textContent || "";
      navigator.clipboard?.writeText(text).then(()=>{},()=>{});
    }catch(_){}
  }
  function exportToFile(){
    try{
      const text = preEl?.textContent || "";
      const blob = new Blob([text], {type:"text/plain"});
      const url  = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "logs.txt";
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
    }catch(_){}
  }

  // --- Tab-Handling ----------------------------------------------------------
  function activateLogsTab(){
    const tabs = $("#inspector .ins-tabs");
    if (!tabs) return;
    tabs.querySelectorAll(".ins-tab").forEach(b=>b.classList.remove("active"));
    const btn = tabs.querySelector(".ins-tab[data-tab='logs']");
    if (btn) btn.classList.add("active");
  }

  function renderLogsTab(){
    killLegacyDock();
    activateLogsTab();
    renderIntoPanel();

    // Daten laden/anzeigen
    buffer = pullInitialBuffer().map(normalize);
    drawAll();
    subscribe();
  }

  // --- Wire: Wenn Inspector geöffnet wird, Logs-Tab anzeigen -----------------
  function onOpen(){
    try{
      renderLogsTab();
    }catch(e){
      warn("Render-Fehler: " + (e && e.message));
    }
  }

  window.addEventListener("cb:inspector-open", onOpen, {passive:true});
  // Falls der Inspector bereits offen war, sofort einmal rendern:
  if (panelRoot() && $("#inspector").classList.contains("open")) {
    onOpen();
  }

  log("bereit ("+VER+")");
})();
