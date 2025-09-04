<script>
/*
  ==========================================================
  assets/inspector/inspector.js — v18.7.2 (STABIL)
  CODE_STYLE:
    - Eigenständiges Panel (kein Build/Start-Overlay blockiert)
    - Tabs: Übersicht, Logs, Build, Pfade, Tests (Platzhalter)
    - Robuster LogStream: nutzt CBLog.getBuffer() + 'cblog:append'
    - Öffentliche Bridge: GameUI.toggleInspector/openInspector/closeInspector
    - Keine Doppel-Initialisierung (idempotent)
  ==========================================================
*/
(function(){
  if (window.__INSPECTOR_READY__) return;
  window.__INSPECTOR_READY__ = true;

  const VERSION = "v18.7.2";
  const d = (sel,root=document)=> root.querySelector(sel);

  // ---------- UI Factory ----------
  function el(tag, attrs={}, ...kids){
    const n = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs||{})){
      if (k === "class") n.className = v;
      else if (k === "style") n.style.cssText = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const k of kids){
      if (k==null) continue;
      n.appendChild(typeof k === "string" ? document.createTextNode(k) : k);
    }
    return n;
  }

  // ---------- Styles (eingebettet, sanft) ----------
  const STYLE_ID = "inspector-inline-style-1872";
  if (!document.getElementById(STYLE_ID)){
    document.head.appendChild(el("style", { id: STYLE_ID }, `
      .insp-wrap{position:fixed;left:50%;top:56px;transform:translateX(-50%);
        width:min(920px,calc(100vw - 24px));max-height:calc(100vh - 120px);
        z-index:2147483646;background:rgba(18,18,18,.95);
        border:1px solid rgba(255,255,255,.08);border-radius:14px;
        box-shadow:0 30px 120px rgba(0,0,0,.55);color:#eaeaea;overflow:hidden;}
      .insp-head{display:flex;align-items:center;gap:10px;padding:10px 12px 8px;
        border-bottom:1px solid rgba(255,255,255,.06);
        background:linear-gradient(#222,#1a1a1a);}
      .insp-title{font-weight:800;letter-spacing:.2px}
      .insp-ver{opacity:.6;margin-left:6px;font-size:12px}
      .insp-close{margin-left:auto;border:0;border-radius:10px;padding:6px 10px;
        background:rgba(255,255,255,.10);color:#fff;cursor:pointer;}
      .insp-tabs{display:flex;gap:8px;padding:10px 12px 8px;border-bottom:1px solid rgba(255,255,255,.06)}
      .insp-tab{border:0;border-radius:999px;padding:7px 12px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer;font-size:14px}
      .insp-tab.active{background:rgba(120,200,150,.28)}
      .insp-body{padding:12px;max-height:calc(100vh - 220px);overflow:auto}
      .insp-box{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:10px}
      .insp-pre{white-space:pre-wrap;font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size:13px;line-height:1.45;color:#dfe6e3}
      .insp-actions{display:flex;gap:8px;padding:10px 12px 12px;border-top:1px solid rgba(255,255,255,.06)}
      .insp-btn{border:0;border-radius:10px;padding:8px 12px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer}
    `));
  }

  // ---------- Panel erstellen ----------
  let root = null, pre = null, tabState = "Logs";

  function makePanel(){
    if (root) return root;

    const head = el("div",{class:"insp-head"},
      el("div",{class:"insp-title"},"Inspector"),
      el("div",{class:"insp-ver"}, VERSION),
      el("button",{class:"insp-close", onclick: close},"Schließen")
    );

    const tabs = ["Übersicht","Logs","Build","Pfade","Tests"];
    const tabsEl = el("div",{class:"insp-tabs"},
      ...tabs.map(name => el("button",{
        class:"insp-tab"+(name===tabState?" active":""), onclick:()=>activate(name)
      }, name))
    );

    pre = el("pre",{class:"insp-pre", "aria-label":"Logs-Anzeige"},"[Log wird geladen…]");
    const body = el("div",{class:"insp-body"}, el("div",{class:"insp-box"}, pre));

    const actions = el("div",{class:"insp-actions"},
      el("button",{class:"insp-btn",onclick:clearLogs},"Leeren"),
      el("button",{class:"insp-btn",onclick:refreshLogs},"Aktualisieren")
    );

    root = el("div",{class:"insp-wrap", id:"inspector", role:"dialog","aria-label":"Inspector"}, head, tabsEl, body, actions);
    document.body.appendChild(root);
    return root;
  }

  function setActiveTab(name){
    tabState = name;
    document.querySelectorAll(".insp-tab").forEach(b=>{
      b.classList.toggle("active", b.textContent===name);
    });
  }

  function activate(name){
    setActiveTab(name);
    if (name === "Logs") refreshLogs();
    else if (pre) pre.textContent = `[${name}] — Noch ohne Inhalt.`;
  }

  function open(){
    makePanel().style.display = "block";
    setActiveTab(tabState || "Logs");
    refreshLogs();
    try{ (window.CBLog?.info||console.log)("inspector.core","geöffnet ("+VERSION+")"); }catch(_){}
  }
  function close(){
    if (makePanel()) root.style.display = "none";
  }
  function toggle(){
    const p = makePanel();
    p.style.display = (p.style.display==="none" || !p.style.display) ? "block" : "none";
    if (p.style.display === "block") refreshLogs();
  }

  // ---------- LogStream (stabil) ----------
  let streamBound = false;
  function formatItem(it){
    const pad = (n)=> String(n).padStart(2,"0");
    const t = it.ts instanceof Date ? it.ts : new Date(it.ts);
    const hh = pad(t.getHours()), mm = pad(t.getMinutes()), ss = pad(t.getSeconds());
    const lvl = (it.level||"LOG").toUpperCase().padEnd(5," ");
    const tag = it.tag ? ` [${it.tag}]` : "";
    return `[${hh}:${mm}:${ss}] ${lvl}${tag} ${it.text}`;
  }

  function clearLogs(){
    try{ window.CBLog?.clear?.(); }catch(_){}
    if (pre) pre.textContent = "";
  }

  function refreshLogs(){
    if (!pre) return;
    const buf = (window.CBLog?.getBuffer?.() || []);
    pre.textContent = buf.length ? buf.map(formatItem).join("\n")
                                 : "[Keine Log-Einträge vorhanden]";
    // Live-Append nur einmal anbinden
    if (!streamBound){
      streamBound = true;
      window.addEventListener("cblog:append", (ev)=>{
        if (!pre || root?.style.display==="none") return;
        const it = ev.detail;
        pre.appendChild(document.createTextNode("\n"+formatItem(it)));
        // optional auto-scroll:
        pre.parentElement?.scrollTo({ top: pre.parentElement.scrollHeight, behavior: "instant" });
      }, { passive:true });
    }
  }

  // ---------- Public Bridge ----------
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = toggle;
  window.GameUI.openInspector   = open;
  window.GameUI.closeInspector  = close;

  // ---------- Auto-Init (sichtbar lassen; beim Start nicht forcieren) ----------
  // Wir initialisieren nur leise, ohne das Panel automatisch zu öffnen,
  // damit nichts „reinpoppt“. Öffnen bleibt über FAB / GameUI.
  makePanel().style.display = "none";
  try{ (window.CBLog?.info||console.log)("inspector.core","bereit ("+VERSION+")"); }catch(_){}
})();
</script>
