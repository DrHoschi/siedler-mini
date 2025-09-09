/* ============================================================================
 * inspector.core.js – v18.12.5
 * Ziel:
 *  - Garantiert bedienbares Overlay (kein Auto-Open)
 *  - Exponiert __INSPECTOR_API__ {open,close,toggle,version}
 *  - Feuert cb:inspector-open/close
 *  - Mount-Punkte (Slots) für Logs/Build/Paths/Tests/Resources
 *  - Idempotent: kein doppeltes Mounting
 *  - Keine Fallback-Fenster mehr – das übernimmt ui-bridge als kleines Badge
 * ========================================================================== */

(function(){
  "use strict";

  if (window.__INSPECTOR_CORE_INIT__) return; // idempotent
  window.__INSPECTOR_CORE_INIT__ = true;

  const VER = "v18.12.5";
  const ok   = (t,...a)=>(window.CBLog?.ok||console.log)(`[inspector.core] ${t}`,...a);
  const warn = (t,...a)=>(window.CBLog?.warn||console.warn)(`[inspector.core] ${t}`,...a);

  // ---------- DOM-Grundgerüst -----------------------------------------------
  let root, panel, slotBody, slotTabs;
  const slots = Object.create(null);

  function el(tag, cls, html){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html!=null) n.innerHTML = html;
    return n;
  }

  function ensureDom(){
    if (document.getElementById("inspector")) {
      // falls schon vorhanden (z.B. hot-reload)
      root = document.getElementById("inspector");
      panel = root.querySelector(".ins-panel");
      slotBody = root.querySelector(".ins-body");
      slotTabs = root.querySelector(".ins-tabs");
      // Slots registrieren
      registerSlots();
      return;
    }

    root = el("div","inspector-root");
    root.id = "inspector";
    root.style.display = "none"; // sichtbar via open()

    const wrap  = el("div","ins-wrap");
    panel = el("div","ins-panel");

    // Header
    const head  = el("div","ins-head");
    const title = el("div","ins-title");
    title.textContent = "Inspector";
    const ver   = el("div","ins-ver", VER);
    const tabs  = el("div","ins-tabs");
    slotTabs = tabs;

    const btnClose = el("button","ins-close");
    btnClose.type="button";
    btnClose.title="Schließen";
    btnClose.addEventListener("click", close);

    head.append(title, ver, tabs, btnClose);

    // Body
    const body = el("div","ins-body");
    slotBody = body;

    // Footer
    const foot = el("div","ins-foot");
    const muted = el("div","muted","Logs mit CBLog • Tabs: Logs / Build / Pfade / Tests / Ressourcen");
    foot.append(muted);

    panel.append(head, body, foot);
    wrap.append(panel);
    root.append(wrap);
    document.body.appendChild(root);

    registerSlots();
  }

  function registerSlots(){
    // Pane-Container je Tab
    const mkPane = (id,label)=>{
      const pane = el("div","ins-pane");
      pane.dataset.tab = id;

      // Controls+View Slots für Logs, einfache Body-Slots für andere
      if (id==="logs"){
        const c = el("div","slot-logs-controls"); c.dataset.slot="logs-controls";
        const v = el("div","slot-logs-view");     v.dataset.slot="logs-view";
        pane.append(c,v);
        slots["logs-controls"]=c;
        slots["logs-view"]=v;
      } else {
        const s = el("div","slot-generic");
        s.dataset.slot = `${id}-body`;
        pane.append(s);
        slots[`${id}-body`] = s;
      }
      return pane;
    };

    // Tabs definieren
    const defs = [
      { id:"logs",       label:"Logs" },
      { id:"build",      label:"Build" },
      { id:"paths",      label:"Pfade" },
      { id:"tests",      label:"Tests" },
      { id:"resources",  label:"Ressourcen" },
    ];

    // Tabs rendern
    slotTabs.innerHTML = "";
    defs.forEach((d,i)=>{
      const b = el("button","ins-tab", d.label);
      b.dataset.tab = d.id;
      b.addEventListener("click", ()=>activateTab(d.id));
      slotTabs.appendChild(b);

      // Pane
      const p = mkPane(d.id, d.label);
      p.id = `ins-pane-${d.id}`;
      slotBody.appendChild(p);
    });

    // Standard: Logs aktiv
    activateTab("logs");
  }

  function activateTab(id){
    // Tabs
    Array.from(slotTabs.children).forEach(btn=>{
      btn.classList.toggle("active", btn.dataset.tab===id);
    });
    // Panes
    Array.from(slotBody.children).forEach(p=>{
      p.classList.toggle("active", p.dataset.tab===id);
    });
    // Signal für Module
    try{ window.dispatchEvent(new CustomEvent("ins:tab-change",{detail:{tab:id}})); }catch{}
  }

  // ---------- Public Core API für Module ------------------------------------
  const coreApi = {
    version: VER,
    getSlot(name){ return slots[name] || null; },
    mount(tabId, mountFn){
      // Module rufen mount("logs", fn) etc.
      try {
        const unmount = mountFn?.();
        return (typeof unmount==="function") ? unmount : ()=>{};
      } catch(e){
        warn("mount-Fehler:", e && e.message);
        return ()=>{};
      }
    }
  };

  // ---------- Open / Close ---------------------------------------------------
  let isOpen = false;

  function open(){
    if (isOpen) return;
    ensureDom();
    root.style.display = "flex";
    document.body.classList.add("inspector-open");
    isOpen = true;
    try{ window.dispatchEvent(new CustomEvent("cb:inspector-open")); }catch{}
    ok("geöffnet (%s)", VER);
  }
  function close(){
    if (!isOpen) return;
    root.style.display = "none";
    document.body.classList.remove("inspector-open");
    isOpen = false;
    try{ window.dispatchEvent(new CustomEvent("cb:inspector-close")); }catch{}
    ok("geschlossen");
  }
  function toggle(force){
    (force==null ? !isOpen : !!force) ? open() : close();
  }

  // ---------- Export / Ready -------------------------------------------------
  window.__INSPECTOR_CORE__ = { api: coreApi, open, close, toggle, version: VER };
  // Kompatibler API-Name für ui-bridge:
  window.__INSPECTOR_API__  = window.__INSPECTOR_CORE__;

  ok(`bereit ${VER}`);
})();
