/* ============================================================================
 * inspector.core.js – v18.14.5
 *  - Erzeugt das Overlay (#inspector) + Tabs + Slots
 *  - API: __INSPECTOR_CORE__.api.{open,close,toggle,mount,getSlot,version}
 *  - Events: cb:inspector-open / cb:inspector-close
 *  - Orientation: portrait = Tabs oben; landscape = Tabs links (CSS)
 * ========================================================================== */
(function(){
  "use strict";
  const VER="v18.14.5";
  const MOD="[inspector.core]";
  const ok   = (m,...a)=>(window.CBLog?.ok||console.log)(`${MOD} ${m}`,...a);
  const warn = (m,...a)=>(window.CBLog?.warn||console.warn)(`${MOD} ${m}`,...a);

  // ---------------- DOM Grundgerüst -----------------------------------------
  function ensureRoot(){
    let root=document.getElementById("inspector");
    if (root) return root;

    root=document.createElement("div");
    root.id="inspector";
    root.setAttribute("role","dialog");
    root.setAttribute("aria-label","Inspector");
    root.style.display="none";

    // Wrap + Panel
    const wrap=document.createElement("div"); wrap.className="ins-wrap";
    const panel=document.createElement("div"); panel.className="ins-panel";

    // Header
    const head=document.createElement("div"); head.className="ins-head";
    const title=document.createElement("div"); title.className="ins-title"; title.innerHTML=`<span>Inspector</span>`;
    const ver=document.createElement("span"); ver.className="ins-ver"; ver.textContent=VER;
    const tabs=document.createElement("div"); tabs.className="ins-tabs";
    const close=document.createElement("button"); close.className="ins-close"; close.type="button"; close.title="Schließen";
    close.addEventListener("click",()=> api.close());

    title.appendChild(ver);
    head.append(title,tabs,close);

    // Body
    const body=document.createElement("div"); body.className="ins-body";

    // Panes + Slots
    const panes = [
      { id:"logs",      label:"Logs",      slots:["logs-controls","logs-view"] },
      { id:"build",     label:"Build",     slots:["build-view"] },
      { id:"paths",     label:"Pfade",     slots:["paths-view"] },
      { id:"resources", label:"Ress.",     slots:["resources-view"] },
      { id:"tests",     label:"Tests",     slots:["tests-view"] },
    ];

    const slotMap={}; // name -> element

    panes.forEach((p,idx)=>{
      // Tab
      const t=document.createElement("button");
      t.className="ins-tab"; t.type="button"; t.dataset.tab=p.id; t.textContent=p.label;
      t.addEventListener("click",()=> setActive(p.id));
      tabs.appendChild(t);

      // Pane
      const pane=document.createElement("div");
      pane.className="ins-pane"; pane.dataset.tab=p.id;
      p.slots.forEach(s=>{
        const slot=document.createElement("div");
        slot.className = s==="logs-controls" ? "slot-logs-controls" :
                         s==="logs-view"     ? "slot-logs-view"     :
                         "slot-generic";
        slot.dataset.slot = s;
        slotMap[s]=slot;
        pane.appendChild(slot);
      });
      body.appendChild(pane);
    });

    // Footer
    const foot=document.createElement("div"); foot.className="ins-foot";
    const muted=document.createElement("div"); muted.className="muted";
    muted.textContent="Neue Siedler – Inspector";
    foot.appendChild(muted);

    panel.append(head,body,foot);
    wrap.appendChild(panel);
    root.appendChild(wrap);
    document.body.appendChild(root);

    // erste Auswahl
    setActive("logs");

    // Orientation Marker
    function markOrientation(){
      const land = window.matchMedia("(orientation: landscape)").matches || (window.innerWidth>window.innerHeight);
      root.classList.toggle("landscape", !!land);
    }
    markOrientation();
    window.addEventListener("resize", markOrientation, {passive:true});

    return root;

    // Helper: Tab aktivieren
    function setActive(id){
      root.querySelectorAll(".ins-tab").forEach(b=>b.classList.toggle("active", b.dataset.tab===id));
      root.querySelectorAll(".ins-pane").forEach(p=>p.classList.toggle("active", p.dataset.tab===id));
    }
  }

  // ---------------- Public API ----------------------------------------------
  function getSlot(name){ ensureRoot(); return document.querySelector(`#inspector [data-slot="${name}"]`); }

  let openState=false;
  const api = {
    version: VER,
    open(){
      ensureRoot();
      if (openState) return;
      openState=true;
      document.getElementById("inspector").style.display="flex";
      document.body.classList.add("inspector-open");
      try{ window.dispatchEvent(new CustomEvent("cb:inspector-open")); }catch(_){}
      ok("geöffnet (v%s)", VER);
    },
    close(){
      const root=document.getElementById("inspector");
      if (!root || !openState) return;
      openState=false;
      root.style.display="none";
      document.body.classList.remove("inspector-open");
      try{ window.dispatchEvent(new CustomEvent("cb:inspector-close")); }catch(_){}
      ok("geschlossen");
    },
    toggle(force){
      if (typeof force==="boolean") return force ? api.open() : api.close();
      return openState ? api.close() : api.open();
    },
    mount(tabId, renderFn){
      // Module registrieren ihren Renderer; wir rufen ihn unmittelbar auf
      // und lassen die Rückgabe (optional Unmount) vom Modul verwalten.
      try{ return renderFn?.(); }catch(e){ warn("mount(%s) Fehler: %s",tabId, e?.message); }
      return null;
    },
    getSlot
  };

  // export
  window.__INSPECTOR_CORE__ = { api };

  ensureRoot();
  ok("bereit v%s", VER);
})();
