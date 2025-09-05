/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini — Inspector (Logs-Tab)
 * Version: v18.10.7
 *
 * Ziel
 * - Registriert den "Logs"-Tab am Inspector-Core (Slot-Struktur).
 * - Liest vorhandenen CBLog-Puffer ein + hört live auf neue Log-Events.
 * - UI: Level-Filter (ERR/WARN/OK/INFO), Suche, Kopieren, Export, Leeren.
 *
 * Abhängigkeiten (sanft, optional)
 * - window.__INS__ (Inspector-Core mit .registerTab)
 * - window.CBLog (Polyfill oder echte Bridge)
 *
 * Events
 * - Empfängt:  window  →  "cb:log"              (detail: {time,level,scope,msg})
 * - Sendet:    keine (nur UI-Interaktion)
 *
 * Fallbacks
 * - Wenn __INS__ kurz noch fehlt, wird bis zu 3s gewartet.
 * - Wenn CBLog fehlt, wird ein kleiner Shim gebaut, damit wenigstens
 *   das UI funktioniert (Leere Liste, keine Live-Events).
 * ========================================================================== */
(function () {
  "use strict";

  // ---- Meta / Logger --------------------------------------------------------
  var MOD = "[inspector.logs]";
  var VER = "v18.10.7";
  var log  = (t, ...a) => (window.CBLog?.ok   || console.log   )(`${MOD} ${t}`, ...a);
  var warn = (t, ...a) => (window.CBLog?.warn || console.warn  )(`${MOD} ${t}`, ...a);
  var err  = (t, ...a) => (window.CBLog?.err  || console.error )(`${MOD} ${t}`, ...a);

  // ---- State ----------------------------------------------------------------
  /** @type {{time:number, level:string, scope?:string, msg:string}[]} */
  var BUFFER = [];
  var FILTER = { ERR:true, WARN:true, OK:true, INFO:true };
  var SEARCH = "";
  var DOM = { root:null, pre:null, lblCount:null, find:null,
              fErr:null, fWarn:null, fOk:null, fInfo:null };

  // ---- Utilities -------------------------------------------------------------
  function pad2(n){ n|=0; return (n<10?"0":"")+n; }
  function fmtTime(ts){
    var d = new Date(ts || Date.now());
    return "["+pad2(d.getHours())+":"+pad2(d.getMinutes())+":"+pad2(d.getSeconds())+"]";
  }
  function normLevel(x){
    if (!x) return "INFO";
    x = (""+x).toUpperCase();
    if (x.startsWith("ER")) return "ERR";
    if (x.startsWith("WA")) return "WARN";
    if (x==="OK"||x==="SUCCESS") return "OK";
    return (x==="INFO"||x==="LOG") ? "INFO" : x;
  }
  function passFilters(item){
    if (!FILTER[normLevel(item.level)]) return false;
    if (!SEARCH) return true;
    var s = SEARCH.toLowerCase();
    return (item.msg?.toLowerCase().includes(s)) || (item.scope?.toLowerCase().includes(s));
  }
  function asLine(item){
    var L = normLevel(item.level);
    var scope = item.scope ? ` [${item.scope}]` : "";
    return `${fmtTime(item.time)} ${L}${scope} ${item.msg}`;
  }

  // ---- CBLog Adapter (defensiv) ---------------------------------------------
  function readInitialBuffer(){
    try{
      if (Array.isArray(window.__CBLOG_BUF__)) return window.__CBLOG_BUF__;
      if (window.CBLog?.getBuffer){
        var b = window.CBLog.getBuffer();
        if (Array.isArray(b)) return b;
      }
    }catch(e){ warn("Initialbuffer nicht lesbar:", e); }
    return [];
  }
  function startLiveStream(onEntry){
    // bevorzugtes Event vom Polyfill:
    var handler = (ev)=>{
      try{
        var e = ev?.detail || ev;
        if (!e) return;
        onEntry({
          time: e.time || Date.now(),
          level: normLevel(e.level || e.type),
          scope: e.scope || e.tag || e.mod || e.source || "",
          msg: (e.msg!=null ? (""+e.msg) : (e.text || "")),
        });
      }catch(ex){ warn("cb:log handler:", ex); }
    };
    window.addEventListener("cb:log", handler, { passive:true });

    // zusätzlich: falls ein Polyfill eine Callback-API besitzt
    try{
      window.CBLog?.on?.("entry", (e)=>handler({detail:e}));
    }catch(_){}

    return ()=> window.removeEventListener("cb:log", handler);
  }

  // ---- Render: Controls ------------------------------------------------------
  function makeBadge(txt, cls, title){
    var b = document.createElement("span");
    b.className = "ins-badge "+cls;
    b.textContent = txt;
    if (title) b.title = title;
    return b;
  }
  function makeToggle(label, cls, key){
    var wrap = document.createElement("label");
    wrap.className = "ins-toggle "+cls;
    var cb = document.createElement("input");
    cb.type = "checkbox"; cb.checked = !!FILTER[key];
    cb.addEventListener("change", ()=>{
      FILTER[key] = cb.checked;
      renderList();
    });
    var cap = document.createElement("span");
    cap.textContent = label;
    wrap.appendChild(cb); wrap.appendChild(cap);
    return { el:wrap, cb };
  }
  function buildControls(container){
    var row = document.createElement("div");
    row.className = "ins-controls";

    // Badges (kleine Legende)
    row.appendChild(makeBadge("ERR", "level-err",  "Fehler"));
    row.appendChild(makeBadge("WARN","level-warn", "Warnungen"));
    row.appendChild(makeBadge("OK",  "level-ok",   "Erfolg/OK"));
    row.appendChild(makeBadge("INFO","level-info", "Informationen"));

    // Toggles (Filter)
    var spacer = document.createElement("div"); spacer.className="ins-controls-spacer";
    var tErr  = makeToggle("", "level-err",  "ERR");
    var tWarn = makeToggle("", "level-warn", "WARN");
    var tOk   = makeToggle("", "level-ok",   "OK");
    var tInfo = makeToggle("", "level-info", "INFO");
    row.appendChild(spacer);
    row.appendChild(tErr.el); row.appendChild(tWarn.el);
    row.appendChild(tOk.el);  row.appendChild(tInfo.el);

    // Suche
    var find = document.createElement("input");
    find.type = "search";
    find.className = "ins-find";
    find.placeholder = "Suche…";
    find.addEventListener("input", ()=>{
      SEARCH = (find.value||"").trim().toLowerCase();
      renderList();
    });

    // Buttons
    var btnCopy = document.createElement("button");
    btnCopy.className="ins-btn";
    btnCopy.textContent="Kopieren";
    btnCopy.addEventListener("click", doCopy);

    var btnExport = document.createElement("button");
    btnExport.className="ins-btn";
    btnExport.textContent="Export";
    btnExport.addEventListener("click", doExport);

    var btnClear = document.createElement("button");
    btnClear.className="ins-btn subtle";
    btnClear.textContent="Leeren";
    btnClear.addEventListener("click", ()=>{
      BUFFER.length = 0;
      renderList();
    });

    // Counter
    var lblCount = document.createElement("span");
    lblCount.className="ins-count";
    lblCount.textContent = "0 Einträge";

    // rechte Funktionsgruppe
    var right = document.createElement("div");
    right.className = "ins-controls-right";
    right.appendChild(find);
    right.appendChild(btnCopy);
    right.appendChild(btnExport);
    right.appendChild(btnClear);
    right.appendChild(lblCount);

    row.appendChild(right);

    // DOM-Refs ablegen
    DOM.find = find;
    DOM.fErr = tErr.cb; DOM.fWarn = tWarn.cb; DOM.fOk = tOk.cb; DOM.fInfo = tInfo.cb;
    DOM.lblCount = lblCount;

    container.appendChild(row);
  }

  // ---- Render: Liste --------------------------------------------------------
  function buildList(container){
    var pre = document.createElement("pre");
    pre.className = "ins-logview";
    pre.setAttribute("aria-live", "polite");
    pre.textContent = "[Logs werden initialisiert …]\n";
    container.appendChild(pre);
    DOM.pre = pre;
  }
  function renderList(){
    if (!DOM.pre) return;
    var out = [];
    for (var i=0;i<BUFFER.length;i++){
      var it = BUFFER[i];
      if (passFilters(it)) out.push(asLine(it));
    }
    DOM.pre.textContent = (out.length ? out.join("\n") : "[Keine Log-Einträge vorhanden]");
    if (DOM.lblCount) DOM.lblCount.textContent = out.length+" Einträge";
    DOM.pre.scrollTop = DOM.pre.scrollHeight;
  }

  // ---- Actions: Copy / Export ----------------------------------------------
  function doCopy(){
    try{
      var txt = DOM.pre ? DOM.pre.textContent : "";
      navigator.clipboard?.writeText?.(txt).then(()=>flash("Kopiert"));
    }catch(_){ /* egal */ }
  }
  function doExport(){
    try{
      var txt = DOM.pre ? DOM.pre.textContent : "";
      var blob = new Blob([txt], {type:"text/plain;charset=utf-8"});
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "logs_"+Date.now()+".txt";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 2000);
    }catch(_){}
  }
  function flash(msg){
    try{
      var n = document.createElement("div");
      n.className = "ins-flash";
      n.textContent = msg;
      document.body.appendChild(n);
      setTimeout(()=>n.classList.add("on"), 10);
      setTimeout(()=>{ n.classList.remove("on"); n.remove(); }, 1400);
    }catch(_){}
  }

  // ---- Compose (Tab-Mount) --------------------------------------------------
  function mount(slots){
    // Container leeren, Root erzeugen
    slots.body.innerHTML = "";
    var root = document.createElement("div");
    root.className = "ins-tab ins-tab-logs";
    slots.body.appendChild(root);
    DOM.root = root;

    // Controls + Log-View
    buildControls(root);
    buildList(root);

    // initialer Puffer
    var initial = readInitialBuffer();
    if (Array.isArray(initial) && initial.length){
      for (var i=0;i<initial.length;i++){
        var e = initial[i];
        BUFFER.push({
          time: e.time || e.ts || Date.now(),
          level: normLevel(e.level || e.type || e.lvl),
          scope: e.scope || e.tag || e.mod || e.source || "",
          msg:   (e.msg!=null ? (""+e.msg) : (e.text || ""+e))
        });
      }
    }
    renderList();

    // Live-Stream starten
    var stop = startLiveStream(function push(entry){
      BUFFER.push(entry);
      // nur delta anhängen, wenn sichtbar + Filter passt; sonst Gesamtrender
      if (passFilters(entry) && DOM.pre){
        var addLine = asLine(entry);
        if (DOM.pre.textContent === "[Keine Log-Einträge vorhanden]"){
          DOM.pre.textContent = addLine;
        } else {
          DOM.pre.textContent += "\n"+addLine;
        }
        if (DOM.lblCount){
          var current = (DOM.lblCount.textContent||"0").split(" ")[0]|0;
          DOM.lblCount.textContent = (current+1)+" Einträge";
        }
        DOM.pre.scrollTop = DOM.pre.scrollHeight;
      } else {
        renderList();
      }
    });

    // Unmount-Hook zurückgeben (optional vom Core genutzt)
    return function unmount(){
      try{ stop && stop(); }catch(_){}
      DOM = { root:null, pre:null, lblCount:null, find:null, fErr:null, fWarn:null, fOk:null, fInfo:null };
    };
  }

  // ---- Bootstrapping an Core ------------------------------------------------
  function waitCore(msLeft){
    if (window.__INS__ && typeof window.__INS__.registerTab === "function"){
      try{
        window.__INS__.registerTab("logs", {
          title: "Logs",
          mount,                // (slots) => unmountFn
          onShow: renderList,   // sicherstellen, dass bei Rückkehr aktualisiert wird
          order: 10             // frühe Position
        });
        log("Tab registriert (%s).", VER);
      }catch(e){ err("registerTab fehlgeschlagen:", e); }
      return;
    }
    if ((msLeft|0) <= 0){
      warn("Core nicht gefunden – Logs-Tab nicht registriert.");
      return;
    }
    setTimeout(()=>waitCore(msLeft-100), 100);
  }

  waitCore(3000);
})();
