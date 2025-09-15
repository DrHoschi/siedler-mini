/* =============================================================================
   Neue Siedler – UI: Build Dock
   Version: v18.2.0
   - Sucht Gebäudedaten über OFFIZIELLE Pfade (Registry / EntitiesRegistry)
   - Fällt zurück auf Auto-Discovery (scannt window nach passenden Strukturen)
   - Rendert zuverlässig, hört auf viele Ready-Events, hat manuellen Refresh
============================================================================= */

(function(){
  const VER = "v18.2.0";
  const I = (m)=> (window.CBLog?.info  || console.log)(`[ui-build] ${m}`);
  const W = (m)=> (window.CBLog?.warn  || console.warn)(`[ui-build] ${m}`);
  const E = (m)=> (window.CBLog?.error || console.error)(`[ui-build] ${m}`);

  /* ----------------------------- Helpers ----------------------------------- */
  function el(tag, cls){ const e=document.createElement(tag); if(cls) e.className=cls; return e; }

  function normalize(b){
    return {
      key:  b?.key || b?.id || b?.name || b?.type || "unknown",
      name: b?.title || b?.name || b?.label || b?.key || "Unbenannt",
      icon: b?.icon || b?.sprite || b?.image || null,
      cat:  b?.category || b?.cat || "default",
      raw:  b || {}
    };
  }

  function resolveIcon(build){
    try{
      if (window.BuildAssets){
        if (typeof window.BuildAssets.getIcon === "function"){
          const src = window.BuildAssets.getIcon(build.key); if (src) return src;
        }
        if (window.BuildAssets.icons && window.BuildAssets.icons[build.key]){
          return window.BuildAssets.icons[build.key];
        }
      }
    }catch(_){}
    return build.icon || build.raw?.icon || build.raw?.sprite || build.raw?.image
           || "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  }

  /* --------------------------- Data taps ----------------------------------- */
  function fromOfficialAPIs(){
    // 1) Registry.getCategories()
    if (window.Registry && typeof window.Registry.getCategories === "function"){
      try{
        const cats = window.Registry.getCategories();
        if (Array.isArray(cats) && cats.length){
          return cats.map(c => ({
            id: c.id || c.key || c.name,
            name: c.title || c.name || String(c.id||c.key||"Kategorie"),
            items: (c.items || c.buildings || []).map(normalize)
          }));
        }
      }catch(e){ W(`Registry.getCategories() Fehler: ${e?.message||e}`); }
    }
    // 2) Registry.categories + Registry.buildings
    if (window.Registry && (Array.isArray(window.Registry.categories) || Array.isArray(window.Registry.buildings))){
      const cats = window.Registry.categories || [];
      const blds = window.Registry.buildings  || [];
      if (cats.length && blds.length){
        const byCat = {};
        blds.forEach(b => { const nb=normalize(b); (byCat[nb.cat] ||= []).push(nb); });
        return cats.map(c => ({
          id: c.id || c.key || c.name,
          name: c.title || c.name || String(c.id||c.key||"Kategorie"),
          items: byCat[(c.id||c.key||c.name)] || byCat[c.key] || byCat[c.id] || []
        }));
      }
    }
    // 3) EntitiesRegistry.buildings
    if (window.EntitiesRegistry && Array.isArray(window.EntitiesRegistry.buildings)){
      const grouped = {};
      window.EntitiesRegistry.buildings.forEach(b=>{ const nb=normalize(b); (grouped[nb.cat] ||= []).push(nb); });
      return Object.keys(grouped).map(k => ({ id:k, name:String(k), items: grouped[k] }));
    }
    // 4) EntitiesRegistry.getBuildings?.()
    if (window.EntitiesRegistry && typeof window.EntitiesRegistry.getBuildings === "function"){
      try{
        const blds = window.EntitiesRegistry.getBuildings();
        if (Array.isArray(blds) && blds.length){
          const grouped = {};
          blds.forEach(b=>{ const nb=normalize(b); (grouped[nb.cat] ||= []).push(nb); });
          return Object.keys(grouped).map(k => ({ id:k, name:String(k), items: grouped[k] }));
        }
      }catch(e){ W(`EntitiesRegistry.getBuildings() Fehler: ${e?.message||e}`); }
    }
    return [];
  }

  // Aggressiver Fallback: suche in window nach typischen Strukturen
  function autoDiscover(){
    const grouped = {};
    const push = (b)=>{ const nb=normalize(b); (grouped[nb.cat] ||= []).push(nb); };

    function looksLikeBuilding(o){
      if (!o || typeof o!=="object") return false;
      const keys = Object.keys(o);
      // Muss mindestens einen 'name'/ 'title' u. eine 'category' haben
      const hasName = ("name" in o) || ("title" in o) || ("key" in o);
      const hasCat  = ("category" in o) || ("cat" in o);
      return hasName && hasCat;
    }

    // 1) Direkte Kandidaten auf window.* mit Arrays
    for (const k in window){
      try{
        const v = window[k];
        if (!v) continue;
        // a) Array von Objekten → evtl. buildings
        if (Array.isArray(v) && v.length && v.length < 200){
          let score=0, good=0;
          for (let i=0;i<Math.min(10,v.length);i++){
            if (looksLikeBuilding(v[i])) { good++; score++; }
          }
          if (good>=3){ v.forEach(push); I(`autoDiscover: window.${k} (Array)`); }
        }
        // b) Objekt mit .buildings
        if (v && typeof v==="object" && Array.isArray(v.buildings) && v.buildings.length){
          let good=0;
          for (let i=0;i<Math.min(10,v.buildings.length);i++){
            if (looksLikeBuilding(v.buildings[i])) good++;
          }
          if (good>=3){ v.buildings.forEach(push); I(`autoDiscover: window.${k}.buildings`); }
        }
      }catch(_){}
    }

    const cats = Object.keys(grouped);
    if (!cats.length) return [];
    return cats.map(k => ({ id:k, name:String(k), items: grouped[k] }));
  }

  async function getDataRobust(maxMs=60000){
    const start = performance.now ? performance.now() : Date.now();
    return new Promise(resolve=>{
      (function tick(phase){
        // Phase A: Offizielle APIs
        const official = fromOfficialAPIs();
        const cntA = official.reduce((s,c)=> s + ((c.items||[]).length), 0);
        if (cntA>0) return resolve(official);

        // Phase B: Auto-Discovery
        const discovered = autoDiscover();
        const cntB = discovered.reduce((s,c)=> s + ((c.items||[]).length), 0);
        if (cntB>0) return resolve(discovered);

        // Weiter warten
        const now = performance.now ? performance.now() : Date.now();
        if (now - start >= maxMs) return resolve([]);
        setTimeout(()=>tick("poll"), 250);
      })("start");
    });
  }

  /* ------------------------------ Dock class -------------------------------- */
  class BuildDock {
    constructor(root){
      this.root = root;
      this.root.classList.add("ui-build-dock");
      this.body = null;
      this.syncMaxHeight();
      window.addEventListener("resize", ()=> this.syncMaxHeight());
    }
    syncMaxHeight(){
      const h = Math.max(200, Math.min(320, Math.round(window.innerHeight * 0.40)));
      document.documentElement.style.setProperty("--build-dock-max-h", `${h}px`);
    }
    render(data){
      this.root.innerHTML = "";
      this.body = el("div","ui-build-body");
      if (!Array.isArray(data) || !data.length){
        const empty = el("div","ui-build-empty");
        empty.textContent = "Keine Gebäude verfügbar";
        empty.style.padding = "18px";
        empty.style.background = "rgba(255,255,255,.35)";
        empty.style.borderRadius = "12px";
        this.body.appendChild(empty);
        this.root.appendChild(this.body);
        return;
      }
      data.forEach(cat=>{
        const catEl = el("section","ui-build-category");
        if (cat.name){
          const title = el("div","ui-build-category-title"); title.textContent = cat.name;
          catEl.appendChild(title);
        }
        const row = el("div","ui-build-category-row");
        (cat.items||[]).forEach(item=>{
          const card = el("button","ui-card ui-build-item"); card.type="button";
          card.setAttribute("data-key", item.key);

          const wrap = el("div","ui-build-item-imgwrap");
          const img  = el("img","ui-build-item-img"); img.alt=item.name||item.key; img.loading="lazy";
          img.src = resolveIcon(item);
          wrap.appendChild(img);

          const label = el("div","ui-build-item-label"); label.textContent = item.name||item.key;

          card.appendChild(wrap); card.appendChild(label);
          card.addEventListener("click", ()=> this.select(item));
          row.appendChild(card);
        });
        catEl.appendChild(row);
        this.body.appendChild(catEl);
      });
      this.root.appendChild(this.body);
    }
    select(item){
      const detail = { key:item.key, name:item.name, raw:item.raw, source:"ui-build" };
      try{ window.dispatchEvent(new CustomEvent("cb:build:select",{detail})); }catch(_){}
      try{ window.dispatchEvent(new CustomEvent("cb:build-select",{detail})); }catch(_){}
      try{ window.dispatchEvent(new CustomEvent("build:select",{detail})); }catch(_){}
      I(`select ${item.key}`);
    }
    open(from){
      if (this.root.style.display!=="block"){
        this.root.style.display="block";
        this.root.classList.add("is-open");
        document.body.classList.add("has-build-open");
        try{ window.dispatchEvent(new CustomEvent("cb:build:open",{detail:{from:from||"api"}})); }catch(_){}
        try{ window.dispatchEvent(new CustomEvent("cb:build-open",{detail:{from:from||"api"}})); }catch(_){}
        I("open");
      }
    }
    close(from){
      if (this.root.style.display!=="none"){
        this.root.style.display="none";
        this.root.classList.remove("is-open");
        document.body.classList.remove("has-build-open");
        try{ window.dispatchEvent(new CustomEvent("cb:build:close",{detail:{from:from||"api"}})); }catch(_){}
        try{ window.dispatchEvent(new CustomEvent("cb:build-close",{detail:{from:from||"api"}})); }catch(_){}
        I("close");
      }
    }
    toggle(from){ (this.root.style.display==="block") ? this.close(from||"toggle") : this.open(from||"toggle"); }
  }

  /* ------------------------------- Init ------------------------------------- */
  (async function init(){
    // Root suchen/erzeugen
    let root = document.getElementById("build-dock") || document.getElementById("build-panel");
    if (!root){ root = document.createElement("div"); root.id = "build-dock"; document.body.appendChild(root); W("#build-dock erzeugt."); }
    const dock = new BuildDock(root);

    // Öffentliche API
    window.UIBuild = {
      open:   (from)=> dock.open(from),
      close:  (from)=> dock.close(from),
      toggle: (from)=> dock.toggle(from),
      render: (data)=> dock.render(Array.isArray(data)?data:(fromOfficialAPIs().length?fromOfficialAPIs():autoDiscover())),
      version: VER
    };

    // Daten suchen (offiziell → discovery)
    const data = await getDataRobust(60000);
    if (data.length){ I(`Daten gefunden (${data.reduce((s,c)=>s+(c.items||[]).length,0)} Gebäude) → render`); dock.render(data); }
    else { W("Keine Gebäudedaten → leerer Hinweis"); dock.render([]); }

    // Ready-/Refresh-Events hören → nochmal rendern
    [
      "cb:registry:ready","registry:ready","entities:ready","entities.registry:ready",
      "cb:assets:ready","assets:ready","cb:assets-ready","assets-ready",
      "cb:game-start","game:start","cb:build:refresh","build:refresh"
    ].forEach(ev => window.addEventListener(ev, ()=>{ I(`Event '${ev}' → re-render`); window.UIBuild.render(); }));

    // Hotkey: B = Toggle
    window.addEventListener("keydown",(ev)=>{ if((ev.key||"").toLowerCase()==="b") window.UIBuild.toggle("hotkey"); });

    // Manuelles Refresh auf GameUI
    window.GameUI = window.GameUI || {};
    window.GameUI.refreshBuild = ()=> { I("manual refresh"); window.UIBuild.render(); };

    I(`bereit (${VER})`);
  })();
})();
