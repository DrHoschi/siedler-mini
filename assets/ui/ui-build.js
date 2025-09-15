/* =============================================================================
   Neue Siedler – UI: Build Dock
   Version: v18.1.0
   - Unveränderte Datenwege (Registry / EntitiesRegistry / BuildAssets)
   - UI-Verbesserungen: Dock-Höhe dynamisch, Events, sanftes Scrollen
   - NUR UI; Game-/Core-Logik bleibt unberührt
============================================================================= */

(function(){
  const VER = "v18.1.0";
  const I = (m)=> (window.CBLog?.info || console.log)(`[ui-build] ${m}`);
  const W = (m)=> (window.CBLog?.warn || console.warn)(`[ui-build] ${m}`);

  /* ----------------------------- Hilfsfunktionen --------------------------- */
  function el(tag, cls){ const e=document.createElement(tag); if(cls) e.className=cls; return e; }

  function normalizeBuilding(b){
    return {
      key:  b?.key || b?.id || b?.name || b?.type || "unknown",
      name: b?.title || b?.name || b?.key || "Unbenannt",
      icon: b?.icon || b?.sprite || b?.image || null,
      cat:  b?.category || b?.cat || "default",
      raw:  b || {}
    };
  }

  function resolveIcon(build){
    try{
      if (window.BuildAssets){
        if (typeof window.BuildAssets.getIcon === "function"){
          const src = window.BuildAssets.getIcon(build.key);
          if (src) return src;
        }
        if (window.BuildAssets.icons && window.BuildAssets.icons[build.key]){
          return window.BuildAssets.icons[build.key];
        }
      }
    }catch(_){}
    if (build.icon) return build.icon;
    if (build.raw?.icon) return build.raw.icon;
    if (build.raw?.sprite) return build.raw.sprite;
    if (build.raw?.image) return build.raw.image;
    // 1x1 transparent (Fallback)
    return "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  }

  function collectData(){
    // 1) Neu: Registry.getCategories()
    if (window.Registry && typeof window.Registry.getCategories === "function"){
      try{
        const cats = window.Registry.getCategories();
        if (Array.isArray(cats) && cats.length){
          return cats.map(c => ({
            id: c.id || c.key || c.name,
            name: c.title || c.name || String(c.id||c.key||"Kategorie"),
            items: (c.items || c.buildings || []).map(normalizeBuilding)
          }));
        }
      }catch(e){ W(`Registry.getCategories() Fehler: ${e?.message||e}`); }
    }
    // 2) Neu: Registry.categories + Registry.buildings
    if (window.Registry && (Array.isArray(window.Registry.categories) || Array.isArray(window.Registry.buildings))){
      const cats = window.Registry.categories || [];
      const blds = window.Registry.buildings  || [];
      if (cats.length && blds.length){
        const byCat = {};
        blds.forEach(b => {
          const nb = normalizeBuilding(b);
          const k = b.category || b.cat || "default";
          (byCat[k] ||= []).push(nb);
        });
        return cats.map(c => ({
          id: c.id || c.key || c.name,
          name: c.title || c.name || String(c.id||c.key||"Kategorie"),
          items: byCat[c.id||c.key||c.name] || []
        }));
      }
    }
    // 3) Alt: EntitiesRegistry.buildings
    if (window.EntitiesRegistry && Array.isArray(window.EntitiesRegistry.buildings)){
      const grouped = {};
      window.EntitiesRegistry.buildings.forEach(b=>{
        const nb = normalizeBuilding(b);
        const cat = b.category || b.cat || "default";
        (grouped[cat] ||= []).push(nb);
      });
      return Object.keys(grouped).map(k => ({ id:k, name:String(k), items: grouped[k] }));
    }
    return [];
  }

  function waitForData(maxMs=60000){
    const start = performance.now ? performance.now() : Date.now();
    return new Promise(resolve=>{
      (function tick(){
        const data = collectData();
        const count = data.reduce((s,c)=> s + ((c.items||[]).length), 0);
        if (count>0) return resolve(data);
        const now = performance.now ? performance.now() : Date.now();
        if (now - start >= maxMs) return resolve([]);
        setTimeout(tick, 200);
      })();
    });
  }

  /* ------------------------------- Dock-Klasse ----------------------------- */
  class BuildDock {
    constructor(root){
      this.root = root;
      this.root.classList.add("ui-build-dock");
      this.body = null;
      // einmalig max-Höhe je Viewport abschätzen (CSS-Var setzen)
      this.syncMaxHeight();
      window.addEventListener("resize", ()=> this.syncMaxHeight());
    }

    syncMaxHeight(){
      // Heuristik: 40% der Höhe, begrenzt zwischen 200–320 px
      const h = Math.max(200, Math.min(320, Math.round(window.innerHeight * 0.40)));
      document.documentElement.style.setProperty("--build-dock-max-h", `${h}px`);
    }

    render(data){
      this.root.innerHTML = "";
      this.body = el("div","ui-build-body");

      if (!Array.isArray(data) || !data.length){
        const empty = el("div","ui-build-empty"); empty.textContent = "Keine Gebäude verfügbar";
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

  /* --------------------------------- Init ---------------------------------- */
  (async function init(){
    // Root auflösen/erstellen
    let root = document.getElementById("build-dock") || document.getElementById("build-panel");
    if (!root){
      root = document.createElement("div"); root.id = "build-dock"; document.body.appendChild(root);
      W("#build-dock erzeugt (fehlte im DOM).");
    }

    const dock = new BuildDock(root);

    // Globale API
    window.UIBuild = {
      open:   (from)=> dock.open(from),
      close:  (from)=> dock.close(from),
      toggle: (from)=> dock.toggle(from),
      render: (data)=> dock.render(Array.isArray(data)?data:collectData()),
      version: VER
    };

    // Daten besorgen & rendern (nur UI, keine Game-Logik)
    const data = await waitForData(60000);
    if (data.length){ I("Daten → render"); dock.render(data); }
    else { W("Keine Gebäudedaten → leerer Hinweis"); dock.render([]); }

    // Events, die ein Re-Render auslösen dürfen
    [
      "cb:registry:ready","registry:ready","entities:ready","entities.registry:ready",
      "cb:assets:ready","assets:ready","cb:assets-ready","assets-ready",
      "cb:game-start","game:start","cb:build:refresh","build:refresh"
    ].forEach(ev => window.addEventListener(ev, ()=>{ I(`Event '${ev}' → re-render`); dock.render(collectData()); }));

    // Hotkey: B = Toggle
    window.addEventListener("keydown",(ev)=>{ if((ev.key||"").toLowerCase()==="b") window.UIBuild.toggle("hotkey"); });

    I(`bereit (${VER})`);
  })();
})();
