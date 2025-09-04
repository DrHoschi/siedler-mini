/* ============================================================================
   assets/inspector/inspector.js — v18.4.0
   Aufgaben:
   - Robuster Inspector (Panel) mit Tabs: Übersicht, Logs, Build, Pfade, Tests
   - Logs: liest CBLog-Puffer + Live-Stream (falls Polyfill aktiv)
   - Öffnen/Schließen/Toggle via window.__INSPECTOR_API__ + GameUI-Bridge
   - CSS-Fallback inline, falls externe inspector.css fehlt
   CODE-STYLE:
   - Keine Frameworks, minimal DOM
   - Kein Blockieren: funktioniert auch auf Startseite
   ============================================================================ */

(function(){
  "use strict";

  const VERSION = "v18.4.0";
  const ok   = (t, ...a) => (window.CBLog?.ok   || console.log   )(`[inspector.core] ${t}`, ...a);
  const warn = (t, ...a) => (window.CBLog?.warn || console.warn  )(`[inspector.core] ${t}`, ...a);
  const info = (t, ...a) => (window.CBLog?.info || console.info  )(`[inspector.core] ${t}`, ...a);

  // ---- Minimal CSS-Fallback -------------------------------------------------
  (function ensureCss(){
    const TAG = "inspector-inline-style";
    if (document.getElementById(TAG)) return;
    const style = document.createElement("style");
    style.id = TAG;
    style.textContent = `
      .insp-wrap{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
        width:min(920px,92vw);max-height:76vh;z-index:2147483647;
        background:rgba(18,18,20,.96);backdrop-filter:blur(8px);
        border:1px solid rgba(255,255,255,.08);border-radius:14px;
        box-shadow:0 30px 84px rgba(0,0,0,.55); color:#e5e7eb; display:none;
      }
      .insp-head{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.06)}
      .insp-title{font-weight:700;opacity:.95}
      .insp-ver{margin-left:6px;font-size:12px;opacity:.6}
      .insp-spacer{flex:1}
      .insp-close{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.08);
        color:#e5e7eb;border-radius:10px;padding:6px 10px;cursor:pointer}
      .insp-tabs{display:flex;gap:8px;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.06)}
      .insp-tab{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);
        color:#e5e7eb;border-radius:999px;padding:6px 10px;cursor:pointer;font-size:13px}
      .insp-tab.active{background:rgba(120,200,255,.16)}
      .insp-body{padding:12px}
      .insp-log{width:100%;height:46vh;min-height:220px;background:#0b0d10;border:1px solid rgba(255,255,255,.08);
        border-radius:8px;padding:10px;font:12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color:#cbd5e1;white-space:pre;overflow:auto}
      .insp-foot{padding:10px 0}
      .insp-copy{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.08);color:#e5e7eb;border-radius:10px;padding:6px 10px;cursor:pointer}
    `;
    document.head.appendChild(style);
  })();

  // ---- DOM bauen ------------------------------------------------------------
  const dom = (() => {
    const wrap  = document.createElement("div"); wrap.className = "insp-wrap"; wrap.id = "inspector";
    wrap.setAttribute("role","dialog"); wrap.setAttribute("aria-label","Inspector");

    const head  = document.createElement("div"); head.className = "insp-head";
    const title = document.createElement("div"); title.className = "insp-title"; title.textContent = "Inspector";
    const ver   = document.createElement("div"); ver.className   = "insp-ver";   ver.textContent   = VERSION;
    const spacer= document.createElement("div"); spacer.className= "insp-spacer";
    const btnX  = document.createElement("button"); btnX.className = "insp-close"; btnX.textContent = "Schließen";
    btnX.addEventListener("click", close);

    head.appendChild(title); head.appendChild(ver); head.appendChild(spacer); head.appendChild(btnX);

    const tabs  = document.createElement("div"); tabs.className = "insp-tabs";
    const TAB_IDS = ["Übersicht","Logs","Build","Pfade","Tests"];
    const tabBtns = TAB_IDS.map((label, idx)=>{
      const b = document.createElement("button");
      b.className = "insp-tab" + (idx===1?" active":"");
      b.textContent = label;
      b.dataset.tab = label.toLowerCase();
      b.addEventListener("click", ()=>selectTab(label.toLowerCase()));
      tabs.appendChild(b);
      return b;
    });

    const body   = document.createElement("div"); body.className = "insp-body";
    // Pane: Logs (aktiv)
    const ta = document.createElement("div"); ta.className="insp-log"; ta.id="insp-logbox";
    ta.textContent = "[Log wird geladen…]";
    const foot = document.createElement("div"); foot.className="insp-foot";
    const btnC = document.createElement("button"); btnC.className="insp-copy"; btnC.textContent="Kopieren";
    btnC.addEventListener("click", ()=> copyLogs());
    const paneLogs = document.createElement("div"); paneLogs.dataset.pane="logs";
    paneLogs.appendChild(ta); foot.appendChild(btnC); paneLogs.appendChild(foot);

    // Leere Pane-Container für weitere Tabs
    function mkPane(name, text){
      const el = document.createElement("div");
      el.dataset.pane=name; el.style.display = name==="logs" ? "block" : "none";
      if (text){ const p = document.createElement("div"); p.textContent = text; p.style.opacity=".7"; el.appendChild(p); }
      return el;
    }
    const paneOverview = mkPane("übersicht","(Demnächst: FPS, Canvas-Größe, Map-Name …)");
    const paneBuild    = mkPane("build","(Build-Infos / aktives Tool …)");
    const panePaths    = mkPane("pfade","(Pfad-Overlay + kleine Statistik …)");
    const paneTests    = mkPane("tests","(Mini-Checks …)");

    body.appendChild(paneOverview);
    body.appendChild(paneLogs);
    body.appendChild(paneBuild);
    body.appendChild(panePaths);
    body.appendChild(paneTests);

    wrap.appendChild(head);
    wrap.appendChild(tabs);
    wrap.appendChild(body);
    document.body.appendChild(wrap);

    function selectTab(id){
      tabBtns.forEach(b=>b.classList.toggle("active", b.dataset.tab===id));
      [...body.children].forEach(p => p.style.display = (p.dataset.pane === id ? "block" : "none"));
    }

    return { wrap, selectTab, logbox: ta };
  })();

  // ---- Log-Stream (CBLog) ---------------------------------------------------
  let unsub = null;

  function startLogStream(){
    const box = dom.logbox;
    const CB = window.CBLog;
    if (!CB) {
      box.textContent = "[CBLog nicht verfügbar]";
      return;
    }
    // Puffer anzeigen
    try {
      const buf = (CB.getBuffer?.() || CB._buf || CB._buffer || []);
      const lines = buf.map(l => (typeof l === "string" ? l : l?.msg || l?.[0] || JSON.stringify(l))).join("\n");
      box.textContent = lines || "[Keine Log-Einträge vorhanden]";
    } catch(e){
      box.textContent = "[Fehler beim Lesen des Puffers: " + (e?.message||e) + "]";
    }
    // Live-Stream
    try {
      unsub?.(); // sicherheitshalber
      unsub = CB.on?.("line", (line)=>{
        if (!line) return;
        const msg = (typeof line === "string" ? line : line?.msg || line?.[0] || String(line));
        box.textContent += (box.textContent ? "\n" : "") + msg;
        box.scrollTop = box.scrollHeight;
      });
    } catch(e){
      warn("Konnte Log-Stream nicht abonnieren:", e);
    }
  }

  function stopLogStream(){
    try { unsub?.(); unsub = null; } catch(_) {}
  }

  function copyLogs(){
    const t = dom.logbox.textContent || "";
    navigator.clipboard?.writeText(t).then(
      ()=> ok("Logs kopiert"),
      ()=> warn("Konnte Logs nicht kopieren.")
    );
  }

  // ---- Öffnen/Schließen API -------------------------------------------------
  let isOpen = false;
  function open(){
    if (isOpen) return;
    dom.wrap.style.display = "block";
    isOpen = true;
    startLogStream();
    window.dispatchEvent(new CustomEvent("cb:inspector-open"));
    ok("geöffnet (%s)", VERSION);
  }
  function close(){
    if (!isOpen) return;
    dom.wrap.style.display = "none";
    isOpen = false;
    stopLogStream();
    window.dispatchEvent(new CustomEvent("cb:inspector-close"));
    ok("geschlossen");
  }
  function toggle(force){
    (force == null ? !isOpen : !!force) ? open() : close();
  }

  // ---- Exporte (für ui-bridge / FAB) ---------------------------------------
  window.__INSPECTOR_API__ = { open, close, toggle };
  window.GameUI = window.GameUI || {};
  window.GameUI.openInspector   = open;
  window.GameUI.closeInspector  = close;
  window.GameUI.toggleInspector = toggle;

  // Option: sofort sichtbar machen, wenn ?inspector=1
  try {
    if (location.search.indexOf("inspector=1") !== -1) {
      setTimeout(open, 150);
    }
  } catch(_){}

  ok("bereit (%s)", VERSION);
})();
