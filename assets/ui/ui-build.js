/* =============================================================================
   Neue Siedler – UI: Build Dock
   Version: v18.2.1
   - Robuste Datensuche (offizielle Pfade → Auto-Discovery)
   - Klare Logs: "bereit", "Daten gefunden: N", "Keine Gebäudedaten"
============================================================================= */
(function(){
  const VER = "v18.2.1";
  const I = (m)=> (window.CBLog?.info  || console.log)(`[ui-build] ${m}`);
  const W = (m)=> (window.CBLog?.warn  || console.warn)(`[ui-build] ${m}`);

  function el(t,c){ const e=document.createElement(t); if(c) e.className=c; return e; }
  function n(b){ return { key:b?.key||b?.id||b?.name||b?.type||"unknown",
                          name:b?.title||b?.name||b?.label||b?.key||"Unbenannt",
                          icon:b?.icon||b?.sprite||b?.image||null,
                          cat:b?.category||b?.cat||"default", raw:b||{} }; }
  function icon(b){
    try{
      if (window.BuildAssets?.getIcon) { const s=window.BuildAssets.getIcon(b.key); if(s) return s; }
      if (window.BuildAssets?.icons?.[b.key]) return window.BuildAssets.icons[b.key];
    }catch(_){}
    return b.icon || b.raw?.icon || b.raw?.sprite || b.raw?.image
         || "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  }

  function fromOfficial(){
    // 1) Registry.getCategories()
    if (window.Registry?.getCategories){
      try{
        const cats = window.Registry.getCategories();
        if (Array.isArray(cats) && cats.length){
          return cats.map(c=>({ id:c.id||c.key||c.name,
                                name:c.title||c.name||String(c.id||c.key||"Kategorie"),
                                items:(c.items||c.buildings||[]).map(n) }));
        }
      }catch(e){ W(`Registry.getCategories() Fehler: ${e?.message||e}`); }
    }
    // 2) Registry.categories & .buildings
    if (window.Registry && (Array.isArray(window.Registry.categories)||Array.isArray(window.Registry.buildings))){
      const cats = window.Registry.categories||[];
      const blds = window.Registry.buildings ||[];
      if (cats.length && blds.length){
        const byCat={}; blds.forEach(b=>{ const nb=n(b); (byCat[nb.cat] ||= []).push(nb); });
        return cats.map(c=>({ id:c.id||c.key||c.name,
                              name:c.title||c.name||String(c.id||c.key||"Kategorie"),
                              items: byCat[(c.id||c.key||c.name)] || [] }));
      }
    }
    // 3) EntitiesRegistry.buildings
    if (window.EntitiesRegistry?.buildings?.length){
      const g={}; window.EntitiesRegistry.buildings.forEach(b=>{ const nb=n(b); (g[nb.cat] ||= []).push(nb); });
      return Object.keys(g).map(k=>({ id:k, name:String(k), items:g[k] }));
    }
    return [];
  }

  function autoDiscover(){
    const g={};
    const push=(b)=>{ const nb=n(b); (g[nb.cat] ||= []).push(nb); };
    const looks=(o)=> o && typeof o==="object" && (("name" in o)||("title" in o)||("key" in o)) && (("category" in o)||("cat" in o));
    for (const k in window){
      try{
        const v = window[k]; if(!v) continue;
        if (Array.isArray(v) && v.length && v.length<200){
          let good=0; for (let i=0;i<Math.min(10,v.length);i++){ if(looks(v[i])) good++; }
          if (good>=3){ v.forEach(push); I(`auto: window.${k} (Array)`); }
        }
        if (typeof v==="object" && Array.isArray(v?.buildings) && v.buildings.length){
          let good=0; for (let i=0;i<Math.min(10,v.buildings.length);i++){ if(looks(v.buildings[i])) good++; }
          if (good>=3){ v.buildings.forEach(push); I(`auto: window.${k}.buildings`); }
        }
      }catch(_){}
    }
    return Object.keys(g).map(k=>({ id:k, name:String(k), items:g[k] }));
  }

  class Dock {
    constructor(root){
      this.root=root; this.root.classList.add("ui-build-dock");
      this.body=null; this.title=null;
      this.syncMaxH(); window.addEventListener("resize",()=>this.syncMaxH());
    }
    syncMaxH(){ const h=Math.max(200,Math.min(320,Math.round(window.innerHeight*0.40)));
      document.documentElement.style.setProperty("--build-dock-max-h", `${h}px`); }
    render(data){
      this.root.innerHTML="";
      const body=el("div","ui-build-body"); this.body=body;

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

  (async function init(){
    let root = document.getElementById("build-dock") || document.getElementById("build-panel");
    if (!root){ root=document.createElement("div"); root.id="build-dock"; document.body.appendChild(root); W("#build-dock erzeugt."); }

    const dock=new Dock(root);
    window.UIBuild = {
      open:(f)=>dock.open(f), close:(f)=>dock.close(f), toggle:(f)=>dock.toggle(f),
      render:(data)=>dock.render(Array.isArray(data)?data:(fromOfficial().length?fromOfficial():autoDiscover())),
      version:VER
    };

    // Daten laden
    const tryOfficial = fromOfficial();
    if (tryOfficial.length){
      const count = tryOfficial.reduce((s,c)=>s+(c.items||[]).length,0);
      I(`Daten gefunden (offiziell): ${count}`); dock.render(tryOfficial);
    } else {
      const auto = autoDiscover();
      if (auto.length){
        const count = auto.reduce((s,c)=>s+(c.items||[]).length,0);
        I(`Daten gefunden (auto): ${count}`); dock.render(auto);
      } else {
        W("Keine Gebäudedaten → leerer Hinweis"); dock.render([]);
      }
    }

    // Re-Render bei Events
    [
      "cb:registry:ready","registry:ready","entities:ready","entities.registry:ready",
      "cb:assets:ready","assets:ready","cb:assets-ready","assets-ready",
      "cb:game-start","game:start","cb:build:refresh","build:refresh"
    ].forEach(ev=> window.addEventListener(ev, ()=>{ I(`Event '${ev}' → re-render`); window.UIBuild.render(); }));

    // Hotkey
    window.addEventListener("keydown",(ev)=>{ if((ev.key||"").toLowerCase()==="b") window.UIBuild.toggle("hotkey"); });

    I(`bereit (${VER})`);
  })();
})();
