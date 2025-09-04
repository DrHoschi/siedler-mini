/* ============================================================================
 *  assets/inspector/inspector.js
 *  Neue Siedler – Inspector (Core)
 *  Version: v18.7.0
 *  CODE_STYLE:
 *    - Sofort-Init (ohne Fremd-Events), robust gegen Lade-Reihenfolge
 *    - Eigener CBLog-Proxy + Puffer (Logs funktionieren immer)
 *    - Öffentliche Bridge: GameUI.toggleInspector / open / close
 *    - Tabs: Übersicht (stub), Logs (aktiv), Build (stub), Pfade (stub), Tests (stub)
 *    - Defensive DOM-Erzeugung (Panel wird nur einmal erstellt)
 *    - Keine externen Abhängigkeiten (CSS optional per inspector.css)
 * ========================================================================== */

(function(){
  const VERSION = "v18.7.0";
  const LOG_SCOPE = "[inspector.core]";
  const NOW = () => new Date().toLocaleTimeString('de-DE', {hour12:false});

  // ---- 1) CBLog absichern + Proxy installieren --------------------------------
  // Ziel: Egal wann Inspector/CBLog laden – wir verlieren keine Meldung.
  const global = window;
  const _cb = (global.__cb = global.__cb || {});

  // Minimal-Puffer falls kein offizielles CBLog vorhanden ist
  const CBLog = (function ensureCBLog(){
    const w = global;
    if (!w.CBLog) {
      const buf = [];
      const api = function(...args){ api.push("LOG", ...args); };
      api.buffer = buf;             // Kompletter Puffer (alle Level)
      api._pushRaw = (level, scope, msg, time)=>buf.push({ t: time||Date.now(), level, scope, msg });
      api.push = (level, scope, msg)=>api._pushRaw(level, scope, msg, Date.now());
      api.info = (scope, msg)=>api.push("INFO", scope, msg);
      api.warn = (scope, msg)=>api.push("WARN", scope, msg);
      api.error= (scope, msg)=>api.push("ERR",  scope, msg);
      api.getBuffer = ()=>buf.slice();
      api.attachInspector = function(fn){ api._sink = fn; }; // der Inspector setzt diese Senke
      // Polyfill-Startmeldung
      api.info("CBLog", "Polyfill aktiv");
      w.CBLog = api;
    }
    return w.CBLog;
  })();

  // Proxy: jede neue Meldung auch an Inspector senden (wenn vorhanden)
  // Wir wrappen _pushRaw einmalig.
  (function installCBLogProxy(){
    if (CBLog.__proxied) return;
    const orig = CBLog._pushRaw || CBLog.push;
    CBLog._pushRaw = function(level, scope, msg, time){
      try { orig.call(CBLog, level, scope, msg, time); } catch(e){}
      try {
        if (typeof CBLog._sink === "function"){
          CBLog._sink({ t: time||Date.now(), level, scope, msg });
        }
      } catch(e){}
    };
    CBLog.__proxied = true;
  })();

  // ---- 2) Inspector-Modul ------------------------------------------------------
  const Inspector = {
    el: null,
    tabs: null,
    logsEl: null,
    btnClose: null,
    openState: false,
    refreshTimer: 0,
    lastFlushTs: 0,

    ensurePanel(){
      if (this.el && document.body.contains(this.el)) return this.el;

      // Container
      const wrap = document.createElement("div");
      wrap.id = "inspector";
      // Basale Styles, damit es ohne CSS-Datei benutzbar ist
      wrap.style.cssText = [
        "position:fixed","left:50%","top:55%","transform:translate(-50%,-50%)",
        "width:min(900px, 92vw)","max-height:72vh","z-index:2147483600",
        "background:rgba(16,16,16,.94)","color:#e7ece7","border:1px solid #2a2f2c",
        "border-radius:12px","box-shadow:0 18px 65px rgba(0,0,0,.55)",
        "backdrop-filter:blur(8px)","display:none","overflow:hidden"
      ].join(";");
      wrap.setAttribute("role","dialog");
      wrap.setAttribute("aria-label","Inspector");

      // Header
      const head = document.createElement("div");
      head.style.cssText = "display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.06)";
      const title = document.createElement("div");
      title.textContent = "Inspector";
      title.style.cssText = "font-weight:800;letter-spacing:.2px";
      const ver = document.createElement("span");
      ver.textContent = " " + VERSION;
      ver.style.cssText = "opacity:.55;margin-left:6px;font-weight:600";
      title.appendChild(ver);

      const spacer = document.createElement("div"); spacer.style.flex = "1";
      const btnX = document.createElement("button");
      btnX.textContent = "Schließen";
      btnX.style.cssText = "border:none;border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.08);color:#e7ece7;cursor:pointer";
      btnX.addEventListener("click", ()=>Inspector.close());
      head.append(title, spacer, btnX);

      // Tabs
      const tabs = document.createElement("div");
      tabs.style.cssText = "display:flex;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.06)";
      const mkTab = (id, label)=> {
        const b = document.createElement("button");
        b.textContent = label;
        b.dataset.tab = id;
        b.style.cssText = "border:none;border-radius:999px;padding:6px 12px;background:rgba(255,255,255,.09);color:#e7ece7;cursor:pointer";
        b.addEventListener("click", ()=>Inspector.showTab(id));
        return b;
      };
      const tabBtns = {
        overview: mkTab("overview","Übersicht"),
        logs:     mkTab("logs","Logs"),
        build:    mkTab("build","Build"),
        paths:    mkTab("paths","Pfade"),
        tests:    mkTab("tests","Tests"),
      };
      tabs.append(tabBtns.overview, tabBtns.logs, tabBtns.build, tabBtns.paths, tabBtns.tests);

      // Body
      const body = document.createElement("div");
      body.style.cssText = "padding:10px 12px 12px;overflow:auto;max-height:calc(72vh - 92px)";

      // Views
      const view = (id) => {
        const d = document.createElement("div");
        d.id = "insp-view-" + id;
        d.style.display = "none";
        return d;
      };

      const vOverview = view("overview");
      vOverview.innerHTML = `
        <div style="opacity:.88">
          <div style="margin-bottom:6px"><b>Runtime</b></div>
          <div id="insp-runtime" style="font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;opacity:.85"></div>
        </div>`;

      const vLogs = view("logs");
      const logBox = document.createElement("pre");
      logBox.id = "insp-logs";
      logBox.setAttribute("aria-live","polite");
      logBox.style.cssText = [
        "margin:0","padding:10px","min-height:220px","background:#0f1110",
        "border:1px solid rgba(255,255,255,.06)","border-radius:8px",
        "font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        "font-size:12.5px","line-height:1.35","color:#d8e6d8","white-space:pre-wrap"
      ].join(";");
      vLogs.appendChild(logBox);

      const vBuild = view("build");
      vBuild.innerHTML = `<div style="opacity:.8">Build-Werkzeuge demnächst (Stub).</div>`;

      const vPaths = view("paths");
      vPaths.innerHTML = `<div style="opacity:.8">Pfade-Overlay & Statistik demnächst (Stub).</div>`;

      const vTests = view("tests");
      vTests.innerHTML = `<div style="opacity:.8">Test-Hilfen demnächst (Stub).</div>`;

      body.append(vOverview, vLogs, vBuild, vPaths, vTests);

      // Footer
      const foot = document.createElement("div");
      foot.style.cssText = "display:flex;gap:8px;align-items:center;padding:10px 12px;border-top:1px solid rgba(255,255,255,.06)";
      const mkFootBtn = (label, fn) => {
        const b = document.createElement("button");
        b.textContent = label;
        b.style.cssText = "border:none;border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.08);color:#e7ece7;cursor:pointer";
        b.addEventListener("click", fn);
        return b;
      };
      const btnClear = mkFootBtn("Leeren", ()=>Inspector.clearLogs());
      const btnRefresh = mkFootBtn("Aktualisieren", ()=>Inspector.refreshLogs(true));
      foot.append(btnClear, btnRefresh);

      wrap.append(head, tabs, body, foot);
      document.body.appendChild(wrap);

      // Cache
      this.el = wrap;
      this.tabs = tabBtns;
      this.logsEl = logBox;
      this.btnClose = btnX;

      // Erstes Rendering
      this.showTab("logs");
      this.updateOverview();
      return wrap;
    },

    showTab(id){
      // active style
      Object.values(this.tabs).forEach(b=>{
        b.style.background = "rgba(255,255,255,.09)";
      });
      (this.tabs[id]||this.tabs.logs).style.background = "rgba(82,125,90,.45)";

      // views
      const ids = ["overview","logs","build","paths","tests"];
      ids.forEach(v=>{
        const node = document.getElementById("insp-view-" + v);
        if (node) node.style.display = (v===id) ? "block" : "none";
      });

      if (id === "logs") this.refreshLogs();
      if (id === "overview") this.updateOverview();
    },

    open(){
      this.ensurePanel();
      if (this.openState) return;
      this.el.style.display = "block";
      this.openState = true;
      this.refreshLogs(true);
      // Auto-Refresh (sanft), nur wenn offen
      this.refreshTimer = this.refreshTimer || setInterval(()=>{
        if (!this.openState) return;
        this.refreshLogs();
      }, 1000);
      CBLog.info("inspector.core", "geöffnet ("+VERSION+")");
    },

    close(){
      if (!this.el) return;
      this.el.style.display = "none";
      this.openState = false;
      if (this.refreshTimer){ clearInterval(this.refreshTimer); this.refreshTimer = 0; }
      CBLog.info("inspector.core", "geschlossen");
    },

    toggle(){ (this.openState ? this.close() : this.open()); },

    // ---- Logs -----------------------------------------------------------------
    fmtLine(entry){
      const pad = (n)=> (n<10?"0":"") + n;
      const d = new Date(entry.t||Date.now());
      const hh = pad(d.getHours()), mm = pad(d.getMinutes()), ss = pad(d.getSeconds());
      const lvl = (entry.level||"LOG").toUpperCase();
      const tag = lvl.padEnd(4," ");
      return `[${hh}:${mm}:${ss}] ${tag} [${entry.scope||"-"}] ${String(entry.msg??"")}`;
    },

    refreshLogs(force){
      if (!this.logsEl) return;
      // Wenn eine Senke fehlt, jetzt verbinden
      CBLog.attachInspector && CBLog.attachInspector((e)=>{ this._appendOne(e); });

      // Bereits vorliegende Puffer holen
      const buf = (typeof CBLog.getBuffer === "function") ? CBLog.getBuffer() : (CBLog.buffer||[]);
      if (!buf || !buf.length){
        if (force) this.logsEl.textContent = "[Keine Log-Einträge vorhanden]";
        return;
      }
      // Nur neuere Zeilen übernehmen
      const toCopy = buf.filter(e => (e.t||0) >= this.lastFlushTs);
      if (force || toCopy.length){
        const lines = toCopy.map(e=>this.fmtLine(e)).join("\n");
        if (force) {
          // kompletter Rebuild, inklusive Historie
          this.logsEl.textContent = buf.map(e=>this.fmtLine(e)).join("\n");
        } else {
          this.logsEl.textContent += (this.logsEl.textContent ? "\n" : "") + lines;
        }
        this.logsEl.scrollTop = this.logsEl.scrollHeight;
        const newest = buf[buf.length-1];
        this.lastFlushTs = newest ? (newest.t||Date.now()) : this.lastFlushTs;
      }
    },

    _appendOne(e){
      // Wird vom CBLog-Proxy aufgerufen
      if (!this.logsEl) return;
      const line = this.fmtLine(e);
      this.logsEl.textContent += (this.logsEl.textContent ? "\n" : "") + line;
      this.logsEl.scrollTop = this.logsEl.scrollHeight;
      this.lastFlushTs = Math.max(this.lastFlushTs, e.t||Date.now());
    },

    clearLogs(){
      if (this.logsEl) this.logsEl.textContent = "";
    },

    // ---- Übersicht ------------------------------------------------------------
    updateOverview(){
      const box = document.getElementById("insp-runtime");
      if (!box) return;
      const cvs = document.getElementById("game");
      const size = cvs ? `${cvs.width||0}×${cvs.height||0}` : "unbekannt";
      const map = cvs?.dataset?.map || "-";
      const fps = (global.requestAnimationFrame && global.performance)
        ? "~60" : "n/a";
      box.innerHTML = [
        `Zeit: <b>${NOW()}</b>`,
        `Canvas: <b>${size}</b>`,
        `Map: <b>${map}</b>`,
        `FPS (theoretisch): <b>${fps}</b>`
      ].join(" · ");
    },
  };

  // ---- 3) Öffentliche Bridge für die FABs / UI --------------------------------
  global.GameUI = global.GameUI || {};
  global.GameUI.toggleInspector = Inspector.toggle.bind(Inspector);
  global.GameUI.openInspector   = Inspector.open.bind(Inspector);
  global.GameUI.closeInspector  = Inspector.close.bind(Inspector);

  // ---- 4) Sofort-Init ----------------------------------------------------------
  function bootstrapInspector(){
    try {
      Inspector.ensurePanel();
      // Logs sofort einmal initial füllen
      Inspector.refreshLogs(true);
      // Auto-Open, wenn ?inspector=1 in der URL steht
      if (location.search.indexOf("inspector=1") !== -1) {
        setTimeout(()=>Inspector.open(), 80);
      }
      CBLog.info("inspector.core", "bereit ("+VERSION+")");
    } catch (e){
      console.error("Inspector-Init fehlgeschlagen:", e);
      CBLog.warn("inspector.core", "Init-Fehler: "+ (e?.message||e));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapInspector, { once:true });
  } else {
    // DOM ist schon da → sofort
    bootstrapInspector();
  }
})();
