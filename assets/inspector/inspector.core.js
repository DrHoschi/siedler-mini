/* ============================================================================
   assets/inspector/inspector.core.js — v18.10.5
   Zweck:
     - Stellt das Inspector-Overlay, Tabs-Gerüst und die öffentliche API bereit.
     - Erlaubt Tab-Module (logs/build/paths/tests) sich dynamisch zu registrieren.
     - Fallback-freundlich: funktioniert auch ohne geladene Tab-Module.
   CODE-STYLE:
     - Reihenfolge: Consts → State → DOM → Helpers → API → Init → Logs
     - Sanfte Logs via CBLog, sonst console.log
     - Events: cb:inspector-open / cb:inspector-close / inspector:tab:changed
   ============================================================================ */

(function(){
  "use strict";

  const VERSION = "v18.10.5";
  const log  = (t,...a)=>(window.CBLog?.info||console.log)(`[inspector.core] ${t}`,...a);
  const warn = (t,...a)=>(window.CBLog?.warn||console.warn)(`[inspector.core] ${t}`,...a);

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const state = {
    isOpen: false,
    activeTab: "logs",
    tabs: new Map(), // id -> { id, title, render, onShow?, order? }
  };

  // ---------------------------------------------------------------------------
  // DOM (wird einmal erzeugt)
  // ---------------------------------------------------------------------------
  const dom = {};
  function ensureDOM(){
    if (dom.root) return dom;

    const root = document.createElement("div");
    root.id = "inspector-root";
    root.className = "ins-root";
    root.style.cssText =
      "position:fixed;inset:0;display:none;z-index:2147483646;" + // Vollbild-Overlay
      "align-items:center;justify-content:center;";

    // Panel
    const panel = document.createElement("div");
    panel.className = "ins-panel"; // Styles in inspector.css
    panel.setAttribute("role","dialog");
    panel.setAttribute("aria-label","Inspector");

    // Header
    const head = document.createElement("div");
    head.className = "ins-head";

    const title = document.createElement("div");
    title.className = "ins-title";
    title.textContent = "Inspector";
    const ver = document.createElement("span");
    ver.className = "ins-ver";
    ver.textContent = `v${VERSION}`;
    title.appendChild(ver);

    const closeBtn = document.createElement("button");
    closeBtn.className = "ins-close";
    closeBtn.type = "button";
    closeBtn.textContent = "Schließen";
    closeBtn.addEventListener("click", ()=>API.close());

    const tabs = document.createElement("div");
    tabs.className = "ins-tabs";

    head.appendChild(title);
    head.appendChild(closeBtn);
    head.appendChild(tabs);

    // Body + Footer
    const body = document.createElement("div");
    body.className = "ins-body";

    const foot = document.createElement("div");
    foot.className = "ins-foot";

    panel.appendChild(head);
    panel.appendChild(body);
    panel.appendChild(foot);
    root.appendChild(panel);
    document.body.appendChild(root);

    dom.root = root;
    dom.panel = panel;
    dom.head = head;
    dom.tabs = tabs;
    dom.body = body;
    dom.foot = foot;

    return dom;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function renderTabs(){
    ensureDOM();
    dom.tabs.innerHTML = "";

    // Sortierung nach "order" (Default 100)
    const ordered = [...state.tabs.values()].sort((a,b)=>(a.order??100)-(b.order??100));
    for (const t of ordered){
      const btn = document.createElement("button");
      btn.className = "ins-tab";
      btn.type = "button";
      btn.dataset.tab = t.id;
      btn.textContent = t.title || t.id;
      btn.addEventListener("click", ()=>API.setTab(t.id));
      dom.tabs.appendChild(btn);
    }
    // aktive Markierung
    updateActiveTabClass();
  }

  function updateActiveTabClass(){
    const btns = dom.tabs?.querySelectorAll(".ins-tab") || [];
    btns.forEach(b=>{
      b.classList.toggle("active", b.dataset.tab === state.activeTab);
    });
  }

  function showContentFor(tabId){
    ensureDOM();
    dom.body.innerHTML = "";
    dom.foot.innerHTML = "";

    const tab = state.tabs.get(tabId);
    if (!tab){
      const info = document.createElement("div");
      info.className = "ins-empty";
      info.textContent = "Kein Tab-Modul geladen.";
      dom.body.appendChild(info);
      return;
    }
    try{
      tab.render(dom.body, dom.foot);   // Modul zeichnet in Body/Foot
      tab.onShow?.();                   // optionaler Hook
    }catch(e){
      warn("Tab-Render-Fehler (%s): %o", tabId, e);
      const err = document.createElement("pre");
      err.className = "ins-error";
      err.textContent = String(e && e.stack || e);
      dom.body.appendChild(err);
    }
  }

  // ---------------------------------------------------------------------------
  // Öffentliche API (für ui-bridge + Module)
  // ---------------------------------------------------------------------------
  const API = {
    open(){
      ensureDOM();
      if (state.isOpen) return;
      state.isOpen = true;
      dom.root.style.display = "flex";
      // Standardtab = logs, falls vorhanden
      if (!state.tabs.has(state.activeTab)) {
        state.activeTab = state.tabs.has("logs") ? "logs" : ([...state.tabs.keys()][0] || "logs");
      }
      updateActiveTabClass();
      showContentFor(state.activeTab);

      // Badge aus ui-bridge entfernen, falls vorhanden
      const probe = document.getElementById("inspector-probe");
      if (probe) try{ probe.remove(); } catch {}

      window.dispatchEvent(new CustomEvent("cb:inspector-open"));
      log("geöffnet (v%s)", VERSION);
    },
    close(){
      if (!state.isOpen) return;
      state.isOpen = false;
      dom.root.style.display = "none";
      window.dispatchEvent(new CustomEvent("cb:inspector-close"));
      log("geschlossen");
    },
    toggle(force){
      (force == null ? !state.isOpen : !!force) ? API.open() : API.close();
    },
    setTab(id){
      if (!state.tabs.has(id)) return;
      state.activeTab = id;
      updateActiveTabClass();
      showContentFor(id);
      window.dispatchEvent(new CustomEvent("inspector:tab:changed",{detail:{id}}));
    },
    /** Von Tab-Modulen aufzurufen, um sich zu registrieren. */
    registerTab(def){
      // def: { id, title, render(body,foot), onShow?, order? }
      if (!def || !def.id || typeof def.render!=="function"){
        return warn("Ungültige Tab-Definition: %o", def);
      }
      state.tabs.set(def.id, def);
      renderTabs();
      // Falls dies der erste registrierte Tab ist, gleich sichtbar machen
      if (state.tabs.size === 1) {
        state.activeTab = def.id;
        updateActiveTabClass();
        if (state.isOpen) showContentFor(def.id);
      }
    }
  };

  // globale API bereitstellen (für ui-bridge)
  window.__INSPECTOR_API__ = API;

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  ensureDOM();
  renderTabs(); // Tabs (noch leer) werden erzeugt → Module registrieren sich nach und nach

  // Optional: Inspector automatisch öffnen, wenn ?inspector=1 gesetzt
  try{
    const p = new URLSearchParams(location.search);
    if (p.get("inspector")==="1") {
      setTimeout(API.open, 120);
    }
  }catch{}

  // ---------------------------------------------------------------------------
  // Logs
  // ---------------------------------------------------------------------------
  log("bereit (v%s)", VERSION);
})();
