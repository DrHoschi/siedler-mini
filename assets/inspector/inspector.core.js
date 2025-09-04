/* ============================================================================
 * assets/inspector/inspector.core.js — v18.10.4
 * Inspector Core: DOM, Tabs, Registry, Open/Close, GameUI-Bridge
 * Stabilitätsprinzip: Der Core funktioniert autark, ohne externe Events.
 * ========================================================================== */
(function(){
  "use strict";

  if (window.__InspectorCore__) return; // Doppel-Init verhindern

  // ---- Logging helpers ------------------------------------------------------
  const log  = (...a)=> (window.CBLog?.info||console.log).call(console, "[inspector.core]", ...a);
  const warn = (...a)=> (window.CBLog?.warn||console.warn).call(console, "[inspector.core]", ...a);

  // ---- State ----------------------------------------------------------------
  const STATE = {
    root: null,
    body: null,
    footer: null,
    activeTab: "logs",
    tabs: new Map(),     // id -> { title, render }
    onOpen: new Set(),
    onClose: new Set(),
  };

  // ---- Inline-Fallback-CSS (falls CSS fehlt) --------------------------------
  (function ensureInlineCSS(){
    if (document.getElementById("inspector-inline-css")) return;
    const style = document.createElement("style");
    style.id = "inspector-inline-css";
    style.textContent = `
      #inspector{position:fixed;inset:6vh 2vw auto 2vw;max-height:86vh;z-index:2147483646;
        display:none;background:rgba(24,26,27,.96);color:#ececec;border:1px solid rgba(255,255,255,.08);
        border-radius:14px;box-shadow:0 28px 80px rgba(0,0,0,.55);backdrop-filter:blur(10px);}
      #inspector.open{display:block;}
      #inspector .ins-head{display:flex;align-items:center;gap:12px;padding:14px 16px 10px;
        border-bottom:1px solid rgba(255,255,255,.06);}
      #inspector .ins-title{font-weight:800;letter-spacing:.2px;}
      #inspector .ins-tabs{display:flex;gap:8px;flex-wrap:wrap;padding:10px 16px 0;}
      #inspector .ins-tab{border:none;border-radius:999px;padding:6px 12px;background:#2b2f31;color:#d7d7d7;cursor:pointer;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);}
      #inspector .ins-tab.active{background:#3a463b;color:#f2fff2;box-shadow: inset 0 0 0 1px rgba(140,210,140,.35);}
      #inspector .ins-body{padding:12px 16px 0;overflow:auto;max-height:calc(86vh - 118px);}
      #inspector .ins-footer{padding:10px 16px 14px;display:flex;gap:10px;border-top:1px solid rgba(255,255,255,.06);}
      #inspector .ins-btn{border:none;border-radius:12px;padding:8px 12px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;}
      #inspector pre{margin:0;padding:10px 12px;background:#0e0f10;border:1px solid rgba(255,255,255,.08);border-radius:10px;
        white-space:pre-wrap;word-break:break-word;font:13.5px/1.48 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;}
      @media (max-width:780px){#inspector{inset:0;max-height:100vh;border-radius:0;}
        #inspector .ins-body{max-height:calc(100vh - 116px);} }
    `;
    document.head.appendChild(style);
  })();

  // ---- DOM ------------------------------------------------------------------
  function ensureRoot(){
    if (STATE.root) return;

    const el = document.createElement("div");
    el.id = "inspector";
    el.innerHTML = `
      <div class="ins-head">
        <div class="ins-title">Inspector <span class="ins-ver">v18.10.4</span></div>
        <div class="ins-tabs" role="tablist"></div>
        <button class="ins-close ins-btn" type="button" aria-label="Schließen">Schließen</button>
      </div>
      <div class="ins-body"></div>
      <div class="ins-footer"></div>
    `;
    document.body.appendChild(el);

    STATE.root   = el;
    STATE.body   = el.querySelector(".ins-body");
    STATE.footer = el.querySelector(".ins-footer");

    el.querySelector(".ins-close")?.addEventListener("click", close);

    // vorhandene Tabs rendern
    rebuildTabs();

    // Badge „Inspektor lädt…“ entsorgen (falls vorhanden)
    try{ document.getElementById("inspector-loader")?.remove(); }catch{}
    window.dispatchEvent(new CustomEvent("cb:inspector:ready"));
    log("bereit (core)");
  }

  function rebuildTabs(){
    const tabsEl = STATE.root.querySelector(".ins-tabs");
    tabsEl.innerHTML = "";
    for (const [id, tab] of STATE.tabs){
      const b = document.createElement("button");
      b.className = "ins-tab";
      b.dataset.tab = id;
      b.textContent = tab.title || id;
      b.addEventListener("click", ()=> setActiveTab(id));
      tabsEl.appendChild(b);
    }
    setActiveTab(STATE.activeTab);
  }

  function setActiveTab(id){
    if (!STATE.tabs.has(id)) {
      // fallback: nimm ersten Tab, falls aktiv nicht existiert
      const first = STATE.tabs.keys().next().value || "logs";
      id = STATE.tabs.has(first) ? first : id;
    }
    STATE.activeTab = id;
    // Tab-Klasse pflegen
    STATE.root.querySelectorAll(".ins-tab").forEach(btn=>{
      btn.classList.toggle("active", btn.dataset.tab===id);
    });
    // Render aufrufen
    const tab = STATE.tabs.get(id);
    if (tab && typeof tab.render === "function"){
      STATE.body.innerHTML = "";
      STATE.footer.innerHTML = "";
      tab.render(STATE.body, STATE.footer);
    }
  }

  // ---- Public API -----------------------------------------------------------
  function open(){
    ensureRoot();
    STATE.root.classList.add("open");
    window.dispatchEvent(new CustomEvent("cb:inspector:open"));
  }
  function close(){
    if (!STATE.root) return;
    STATE.root.classList.remove("open");
    window.dispatchEvent(new CustomEvent("cb:inspector:close"));
  }
  function toggle(){ (STATE.root && STATE.root.classList.contains("open")) ? close() : open(); }

  function registerTab(id, title, renderFn){
    STATE.tabs.set(id, { title, render: renderFn });
    if (STATE.root) rebuildTabs(); // live ergänzen
  }

  // ---- Bridge für UI/FAB ----------------------------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI.openInspector   = open;
  window.GameUI.closeInspector  = close;
  window.GameUI.toggleInspector = toggle;

  // ---- Expose Core ----------------------------------------------------------
  window.__InspectorCore__ = {
    registerTab,
    setActiveTab,
    get activeTab(){ return STATE.activeTab; },
    open, close, toggle,
    get els(){ return { root: STATE.root, body: STATE.body, footer: STATE.footer }; }
  };

  // ---- Auto-Init: Core sofort bereitstellen ---------------------------------
  ensureRoot();
})();
