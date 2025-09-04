/* ============================================================================
 *  assets/inspector/inspector.js — v18.7.0
 *  Projekt: Neue Siedler
 *  CODE-STYLE / VORGABEN
 *  - Klare Abschnitts-Kommentare
 *  - Stabiles Log-Streaming (CBLog-Polyfill + Console-Proxy Fallback)
 *  - Keine Doppel-Definition der GameUI-Bridge (toggle/open/close)
 *  - UI: Tabs (Übersicht, Logs, Build, Pfade, Tests) — Logs funktionsfähig
 *  - Hard-Sichtbarkeitsgarantie (z-index, pointer-events) + Fallback-Badge
 *  - Auto-Open beim Seitenstart (konfigurierbar über Query/LocalStorage)
 * ========================================================================== */

(function(){
  "use strict";

  const VERSION = "v18.7.0";
  const LOG_NS  = "[inspector.core]";
  const $id = (s)=> document.getElementById(s);

  // ---------------------------------------------------------------------------
  // 0) Ultra-sicheres CBLog & Console-Proxy Fallback
  // ---------------------------------------------------------------------------
  // Ziel: Immer Logs sehen – auch wenn der Polyfill zu spät oder gar nicht lädt.
  const BootClock = ()=> {
    const d = new Date();
    const pad = (n)=> (n<10?"0":"")+n;
    return `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
  };

  // Interner Ringpuffer, falls (noch) kein CBLog existiert
  const _bootBuf = [];
  const BUF_MAX  = 2000;

  function _bufPush(kind, ns, msg){
    const line = `${BootClock()} ${kind} ${ns} ${msg}`;
    _bootBuf.push(line);
    if (_bootBuf.length > BUF_MAX) _bootBuf.shift();
  }

  // Minimaler Proxy -> schreibt sowohl in Konsole als auch in _bootBuf
  const consoleProxy = {
    info: (...a)=>{ try{console.info(...a);}catch(_){} _bufPush("INFO", "", a.join(" ")); },
    log:  (...a)=>{ try{console.log(...a);}catch(_){}  _bufPush("LOG",  "", a.join(" ")); },
    warn: (...a)=>{ try{console.warn(...a);}catch(_){} _bufPush("WARN", "", a.join(" ")); },
    error:(...a)=>{ try{console.error(...a);}catch(_){} _bufPush("ERROR","", a.join(" ")); }
  };

  // CBLog-Schnittstelle robust machen
  (function ensureCBLog(){
    const w = window; w.CBLog = w.CBLog || {};
    const bus = w.CBLog._bus = w.CBLog._bus || new EventTarget();

    // interne Queue (falls Init zu früh)
    w.CBLog._q = w.CBLog._q || [];

    // Public API
    w.CBLog.info = function(ns, msg){ consoleProxy.info(`[${ns}] ${msg}`); bus.dispatchEvent(new CustomEvent("cb:log",{detail:{k:"INFO",ns, msg}})); };
    w.CBLog.log  = function(ns, msg){ consoleProxy.log (`[${ns}] ${msg}`); bus.dispatchEvent(new CustomEvent("cb:log",{detail:{k:"LOG", ns, msg}})); };
    w.CBLog.warn = function(ns, msg){ consoleProxy.warn(`[${ns}] ${msg}`); bus.dispatchEvent(new CustomEvent("cb:log",{detail:{k:"WARN",ns, msg}})); };
    w.CBLog.error=function(ns, msg){ consoleProxy.error(`[${ns}] ${msg}`);bus.dispatchEvent(new CustomEvent("cb:log",{detail:{k:"ERROR",ns,msg}})); };

    // Hilfen
    w.CBLog.getBuffer = function(){ return _bootBuf.slice(0); };
    w.CBLog.on = function(fn){
      const h = (ev)=> fn(ev.detail);
      bus.addEventListener("cb:log", h);
      return ()=> bus.removeEventListener("cb:log", h);
    };
    // Marker
    consoleProxy.info(`[CBLog] Polyfill aktiv`);
  })();

  // Ab hier CBLog nutzbar
  const logI = (m)=> window.CBLog.info("inspector.core", m);
  const logL = (m)=> window.CBLog.log ("inspector.core", m);
  const logW = (m)=> window.CBLog.warn("inspector.core", m);
  const logE = (m)=> window.CBLog.error("inspector.core", m);

  // ---------------------------------------------------------------------------
  // 1) DOM-Panel erzeugen (einmalig)
  // ---------------------------------------------------------------------------
  let state = {
    open: false,
    unsub: null,  // Log-Subscription
  };

  function ensurePanel(){
    let root = $id("inspector");
    if (root) return root;

    root = document.createElement("div");
    root.id = "inspector";
    // minimale Inlines, falls CSS (assets/inspector/inspector.css) mal fehlt
    root.style.cssText = [
      "position:fixed","left:50%","top:50%","transform:translate(-50%,-50%)",
      "min-width:300px","max-width:92vw","width:760px","max-height:80vh",
      "z-index:2147483646","background:rgba(18,18,18,.96)","border:1px solid rgba(255,255,255,.10)",
      "border-radius:14px","box-shadow:0 30px 80px rgba(0,0,0,.55)","color:#e9eef1",
      "backdrop-filter:blur(10px)","display:none","pointer-events:auto"
    ].join(";");

    root.innerHTML = `
      <div class="insp-head" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08);">
        <div class="insp-title" style="font-weight:800;letter-spacing:.2px">Inspector</div>
        <div class="insp-ver"   style="opacity:.65;font-size:12px;margin-left:6px">${VERSION}</div>
        <div style="flex:1"></div>
        <button id="insp-close" style="border:none;border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer">Schließen</button>
      </div>
      <div class="insp-tabs" style="display:flex;gap:8px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06)">
        <button class="tab" data-tab="overview">Übersicht</button>
        <button class="tab active" data-tab="logs">Logs</button>
        <button class="tab" data-tab="build">Build</button>
        <button class="tab" data-tab="paths">Pfade</button>
        <button class="tab" data-tab="tests">Tests</button>
      </div>
      <div id="insp-body" style="padding:14px;overflow:auto;max-height:calc(80vh - 110px)">
        <pre id="insp-logs" style="margin:0;padding:12px;border-radius:10px;background:#0c0f10;border:1px solid rgba(255,255,255,.06);white-space:pre-wrap;line-height:1.35;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;font-size:12.5px;color:#cfe3d5">[Log wird geladen…]</pre>
      </div>
      <div class="insp-foot" style="display:flex;gap:10px;padding:10px 14px;border-top:1px solid rgba(255,255,255,.08)">
        <button id="insp-clear"   style="border:none;border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer">Leeren</button>
        <button id="insp-refresh" style="border:none;border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer">Aktualisieren</button>
      </div>
    `;
    document.body.appendChild(root);

    // Buttons
    root.querySelector("#insp-close").addEventListener("click", close);
    root.querySelector("#insp-clear").addEventListener("click", ()=> setLogsText("[Keine Log-Einträge vorhanden]"));
    root.querySelector("#insp-refresh").addEventListener("click", refreshLogs);

    // Tabs (nur Logs mit Inhalt, Rest Platzhalter)
    root.querySelectorAll(".tab").forEach(btn=>{
      btn.style.cssText="border:none;border-radius:999px;padding:7px 12px;background:rgba(255,255,255,.10);color:#eaeff2;cursor:pointer;font-size:13px";
      btn.addEventListener("click", ()=>{
        root.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
        const t = btn.getAttribute("data-tab");
        switchTab(t);
      });
    });

    // Fallback-Badge, falls Panel verdeckt sein könnte
    ensureBadge();

    return root;
  }

  function ensureBadge(){
    if ($id("insp-badge")) return;
    const b = document.createElement("div");
    b.id = "insp-badge";
    b.textContent = "Inspector lädt…";
    b.style.cssText = "position:fixed;right:12px;bottom:86px;z-index:2147483647;background:rgba(20,20,20,.75);color:#ddd;padding:6px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.10);font-size:12px;pointer-events:none";
    document.body.appendChild(b);
    setTimeout(()=>{ b.remove(); }, 2000);
  }

  function setLogsText(txt){
    const el = $id("insp-logs");
    if (el) el.textContent = txt;
  }

  // ---------------------------------------------------------------------------
  // 2) Tabs-Inhalte (nur Logs echt, andere erstmal Platzhalter)
  // ---------------------------------------------------------------------------
  function switchTab(name){
    const body = $id("insp-body");
    if (!body) return;

    if (name === "logs"){
      body.innerHTML = `<pre id="insp-logs" style="margin:0;padding:12px;border-radius:10px;background:#0c0f10;border:1px solid rgba(255,255,255,.06);white-space:pre-wrap;line-height:1.35;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;font-size:12.5px;color:#cfe3d5">[Log wird geladen…]</pre>`;
      refreshLogs();
      return;
    }

    // Platzhalter für weitere Tabs; werden später gefüllt
    const ph = (t)=> `<div style="opacity:.7">${t}</div>`;
    if (name === "overview"){
      body.innerHTML = ph("Übersicht (kommt als Nächstes: FPS, Canvas, Map…)"); return;
    }
    if (name === "build"){
      body.innerHTML = ph("Build-Tab (UI-States, aktuelles Tool, etc.)"); return;
    }
    if (name === "paths"){
      body.innerHTML = ph("Pfade-Tab (Overlay-Toggle, Heatmap, letzte Pfade… )"); return;
    }
    if (name === "tests"){
      body.innerHTML = ph("Tests-Tab (kleine Checks/Buttons)"); return;
    }
  }

  // ---------------------------------------------------------------------------
  // 3) Log-Streaming — stabil
  // ---------------------------------------------------------------------------
  function refreshLogs(){
    try {
      // 1) Bestehenden Buffer (frühere Einträge) übernehmen
      const buf = (window.CBLog && typeof window.CBLog.getBuffer === "function")
        ? window.CBLog.getBuffer()
        : _bootBuf.slice(0);

      // 2) Wenn bereits abonniert, einmal abmelden (Doppel vermeiden)
      if (state.unsub) { try{ state.unsub(); }catch(_){} state.unsub = null; }

      // 3) Ab hier live mitschreiben
      state.unsub = window.CBLog.on(({k,ns,msg})=>{
        appendLine(`${BootClock()} ${k} [${ns||"?"}] ${msg}`);
      });

      // 4) Anzeige setzen
      if (buf && buf.length){
        setLogsText(buf.join("\n"));
      } else {
        setLogsText("[Keine Log-Einträge vorhanden]");
      }
    } catch (e){
      setLogsText(`[Fehler beim Laden der Logs]\n${String(e?.message||e)}`);
    }
  }

  function appendLine(t){
    const el = $id("insp-logs"); if (!el) return;
    // Performance: nicht unendlich wachsen
    if (el.textContent.length > 200_000){
      el.textContent = el.textContent.slice(-150_000);
    }
    el.textContent += (el.textContent ? "\n" : "") + t;
    // nach unten scrollen
    el.parentElement?.scrollTo({ top: el.parentElement.scrollHeight });
  }

  // ---------------------------------------------------------------------------
  // 4) Open/Close API + Sichtbarkeit
  // ---------------------------------------------------------------------------
  function open(){
    const root = ensurePanel();
    root.style.display = "block";
    state.open = true;
    // Immer vor andere Overlays/FABs
    root.style.zIndex = "2147483646";
    refreshLogs();
    logI(`geöffnet (${VERSION})`);
  }

  function close(){
    const root = ensurePanel();
    root.style.display = "none";
    state.open = false;
    if (state.unsub){ try{state.unsub();}catch(_){} state.unsub=null; }
  }

  function toggle(){
    if (state.open) close(); else open();
  }

  // ---------------------------------------------------------------------------
  // 5) Öffentliche Bridge für FABs/UX – ohne Doppel-Überschreiben
  // ---------------------------------------------------------------------------
  window.GameUI = window.GameUI || {};
  if (!window.GameUI._inspBound){
    window.GameUI.toggleInspector = toggle;
    window.GameUI.openInspector   = open;
    window.GameUI.closeInspector  = close;
    window.GameUI._inspBound = true;
  }

  // ---------------------------------------------------------------------------
  // 6) Auto-Open beim Seitenstart (hart & zuverlässig)
  //     - Standard: true (sofort sichtbares Debug)
  //     - steuerbar via: ?inspector=0|1, oder localStorage.cb_insp= "0"/"1"
  // ---------------------------------------------------------------------------
  (function autoOpen(){
    const qs  = new URLSearchParams(location.search);
    const qsv = qs.get("inspector");   // "1" / "0" / null
    const lsv = (localStorage.getItem("cb_insp")||"").trim(); // "1" / "0"
    const def = true;                  // <-- gewünschtes Standardverhalten

    const want =
      (qsv === "1") ? true :
      (qsv === "0") ? false :
      (lsv === "1") ? true :
      (lsv === "0") ? false : def;

    // Badge früh zeigen, Panel kurz danach öffnen
    ensureBadge();
    // kleine Verzögerung, damit DOM/CSS sicher stehen (und Log-Puffer gefüllt ist)
    setTimeout(()=>{ if (want) open(); }, 100);
  })();

  // ---------------------------------------------------------------------------
  // 7) Start-Marker
  // ---------------------------------------------------------------------------
  logI(`bereit (${VERSION})`);

})();
