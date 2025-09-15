/* =============================================================================
   Neue Siedler – UI: Build Dock
   Version: v18.2.2
   - Sucht Gebäudedaten:
       1) OFFIZIELL: Registry.getCategories(), Registry.categories/.buildings,
          EntitiesRegistry.buildings
       2) AUTO-DISCOVERY: window.*, window.Registry.*, window.EntitiesRegistry.*
          (flache & verschachtelte Arrays) → gruppiert nach category/cat
   - Klare Logs: "bereit", "Daten gefunden (offiziell/auto): N"
============================================================================= */
(function(){
  const VER = "v18.2.2";
  const I = (m)=> (window.CBLog?.info  || console.log)(`[ui-build] ${m}`);
  const W = (m)=> (window.CBLog?.warn  || console.warn)(`[ui-build] ${m}`);

  function el(t,c){ const e=document.createElement(t); if(c) e.className=c; return e; }
  function norm(b){ return { key:b?.key||b?.id||b?.name||b?.type||"unknown",
                             name:b?.title||b?.name||b?.label||b?.key||"Unbenannt",
                             icon:b?.icon||b?.sprite||b?.image||null,
                             cat:b?.category||b?.cat||"default", raw:b||{} }; }
  function icon(b){
    try{
      if (window.BuildAssets?.getIcon){ const s=window.BuildAssets.getIcon(b.key); if(s) return s; }
      if (window.BuildAssets?.icons?.[b.key]) return window.BuildAssets.icons[b.key];
    }catch(_){}
    return b.icon || b.raw?.icon || b.raw?.sprite || b.raw?.image
         || "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  }

  /* --------------------------- OFFIZIELL ----------------------------------- */
  function fromOfficial(){
    // 1) Registry.getCategories()
    if (window.Registry?.getCategories){
      try{
        const cats = window.Registry.getCategories();
        if (Array.isArray(cats) && cats.length){
          return cats.map(c=>({ id:c.id||c.key||c.name,
                                name:c.title||c.name||String(c.id||c.key||"Kategorie"),
                                items:(c.items||c.buildings||[]).map(norm) }));
        }
      }catch(e){ W(`Registry.getCategories() Fehler: ${e?.message||e}`); }
    }
    // 2) Registry.categories & .buildings
    if (window.Registry && (Array.isArray(window.Registry.categories)||Array.isArray(window.Registry.buildings))){
      const cats = window.Registry.categories||[];
      const blds = window.Registry.buildings ||[];
      if (cats.length && blds.length){
        const byCat={}; blds.forEach(b=>{ const nb=norm(b); (byCat[nb.cat] ||= []).push(nb); });
        return cats.map(c=>({ id:c.id||c.key||c.name,
                              name:c.title||c.name||String(c.id||c.key||"Kategorie"),
                              items: byCat[(c.id||c.key||c.name)] || [] }));
      }
    }
    // 3) EntitiesRegistry.buildings
    if (window.EntitiesRegistry?.buildings?.length){
      const g={}; window.EntitiesRegistry.buildings.forEach(b=>{ const nb=norm(b); (g[nb.cat] ||= []).push(nb); });
      return Object.keys(g).map(k=>({ id:k, name:String(k), items:g[k] }));
    }
    return [];
  }

  /* ------------------------- AUTO-DISCOVERY -------------------------------- */
  function looksBuilding(o){
    return o && typeof o==="object" &&
      (("name" in o)||("title" in o)||("key" in o)) &&
      (("category" in o)||("cat" in o));
  }
  function collectFromArray(arr, label, grouped){
    let good=0;
    for (let i=0;i<Math.min(10,arr.length);i++){ if(looksBuilding(arr[i])) good++; }
    if (good>=3){
      arr.forEach(b=>{ const nb=norm(b); (grouped[nb.cat] ||= []).push(nb); });
      I(`auto: ${label} (Array)`);
    }
  }
  function autoDiscover(){
    const grouped = {};

    // a) window.* (flach)
    for (const k in window){
      try{
        const v = window[k]; if(!v) continue;
        if (Array.isArray(v) && v.length && v.length<300) collectFromArray(v, `window.${k}`, grouped);
        if (typeof v==="object" && Array.isArray(v?.buildings) && v.buildings.length)
          collectFromArray(v.buildings, `window.${k}.buildings`, grouped);
      }catch(_){}
    }

    // b) window.Registry.* (verschachtelt)
    if (window.Registry && typeof window.Registry==="object"){
      for (const k in window.Registry){
        try{
          const v = window.Registry[k]; if(!v) continue;
          if (Array.isArray(v) && v.length && v.length<300) collectFromArray(v, `Registry.${k}`, grouped);
          if (typeof v==="object" && Array.isArray(v?.buildings) && v.buildings.length)
            collectFromArray(v.buildings, `Registry.${k}.buildings`, grouped);
        }catch(_){}
      }
    }

    // c) window.EntitiesRegistry.* (verschachtelt)
    if (window.EntitiesRegistry && typeof window.EntitiesRegistry==="object"){
      for (const k in window.EntitiesRegistry){
        try{
          const v = window.EntitiesRegistry[k]; if(!v) continue;
          if (Array.isArray(v) && v.length && v.length<300) collectFromArray(v, `EntitiesRegistry.${k}`, grouped);
          if (typeof v==="object" && Array.isArray(v?.buildings) && v.buildings.length)
            collectFromArray(v.buildings, `EntitiesRegistry.${k}.buildings`, grouped);
        }catch(_){}
      }
    }

    return Object.keys(grouped).map(k=>({ id:k, name:String(k), items: grouped[k] }));
  }

  /* ------------------------------ UI/Dock ---------------------------------- */
  class Dock{
    constructor(root){
      this.root=root; this.root.classList.add("ui-build-dock");
      this.syncMaxH(); window.addEventListener("resize",()=>this.syncMaxH());
    }
    syncMaxH(){ const h=Math.max(200,Math.min(320,Math.round(window.innerHeight*0.40)));
      document.documentElement.style.setProperty("--build-dock-max-h", `${h}px`); }
    render(data){
      this.root.innerHTML="";
      const body=el("div","ui-build-body");

      if (!Array.isArray(data) || !data.length){
        const empty=el("div","ui-build-empty"); empty.textContent="Keine Gebäude verfügbar";
        body.appendChild(empty); this.root.appendChild(body); return;
      }

      data.forEach(cat=>{
        const sec=el("section","ui-build-category");
        if (cat.name){ const t=el("div","ui-build-category-title"); t.textContent=cat.name; sec.appendChild(t); }
        const row=el("div","ui-build-category-row");
        (cat.items||[]).forEach(item=>{
          const card=el("button","ui-card ui-build-item"); card.type="button"; card.setAttribute("data-key",item.key);
          const wrap=el("div","ui-build-item-imgwrap");
          const img=el("img","ui-build-item-img"); img.alt=item.name||item.key; img.loading="lazy"; img.src=icon(item);
          wrap.appendChild(img);
          const label=el("div","ui-build-item-label"); label.textContent=item.name||item.key;
          card.appendChild(wrap); card.appendChild(label);
          card.addEventListener("click",()=>this.select(item));
          row.appendChild(card);
        });
        sec.appendChild(row); body.appendChild(sec);
      });
      this.root.appendChild(body);
    }
    select(item){
      const detail={key:item.key,name:item.name,raw:item.raw,source:"ui-build"};
      ["cb:build:select","cb:build-select","build:select"].forEach(n=>{ try{ window.dispatchEvent(new CustomEvent(n,{detail})); }catch(_){}} );
      I(`select ${item.key}`);
    }
    open(){ if (this.root.style.display!=="block"){ this.root.style.display="block"; this.root.classList.add("is-open"); document.body.classList.add("has-build-open"); ["cb:build:open","cb:build-open"].forEach(n=>{ try{ window.dispatchEvent(new CustomEvent(n)); }catch(_){}} ); I("open"); } }
    close(){ if (this.root.style.display!=="none"){ this.root.style.display="none"; this.root.classList.remove("is-open"); document.body.classList.remove("has-build-open"); ["cb:build:close","cb:build-close"].forEach(n=>{ try{ window.dispatchEvent(new CustomEvent(n)); }catch(_){}} ); I("close"); } }
    toggle(){ (this.root.style.display==="block")?this.close():this.open(); }
  }

  (function init(){
    let root = document.getElementById("build-dock") || document.getElementById("build-panel");
    if (!root){ root=document.createElement("div"); root.id="build-dock"; document.body.appendChild(root); W("#build-dock erzeugt."); }
    const dock=new Dock(root);

    window.UIBuild = {
      open:(f)=>dock.open(f), close:(f)=>dock.close(f), toggle:(f)=>dock.toggle(f),
      render:(data)=>{
        if (Array.isArray(data)) return dock.render(data);
        const off = fromOfficial();
        if (off.length){ I(`Daten gefunden (offiziell): ${off.reduce((s,c)=>s+(c.items||[]).length,0)}`); return dock.render(off); }
        const auto = autoDiscover();
        if (auto.length){ I(`Daten gefunden (auto): ${auto.reduce((s,c)=>s+(c.items||[]).length,0)}`); return dock.render(auto); }
        W("Keine Gebäudedaten → leerer Hinweis"); return dock.render([]);
      },
      version: VER
    };

    // Initiales Render
    window.UIBuild.render();

    // Re-Render bei typischen Events
    [
      "cb:registry:ready","registry:ready","entities:ready","entities.registry:ready",
      "cb:assets:ready","assets:ready","cb:assets-ready","assets-ready",
      "cb:game-start","game:start","cb:build:refresh","build:refresh"
    ].forEach(ev=> window.addEventListener(ev, ()=>{ I(`Event '${ev}' → re-render`); window.UIBuild.render(); }));

    // Hotkey: B = Toggle
    window.addEventListener("keydown",(ev)=>{ if((ev.key||"").toLowerCase()==="b") window.UIBuild.toggle("hotkey"); });

    I(`bereit (${VER})`);
  })();
})();
