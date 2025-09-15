/* =============================================================================
   Neue Siedler – UI: Build Dock
   Version: v18.2.3
   - Datenquellen:
       1) OFFIZIELL: Registry.getCategories(), Registry.categories/.buildings,
          EntitiesRegistry.buildings
       2) DISCOVERY (rekursiv, Tiefe <= 3):
          * Arrays von Gebäuden
          * Objekt-Dictionaries { id: building, ... }
          * Maps (Map<any, building>)
          * Pfade unter window.*, window.Registry.*, window.EntitiesRegistry.*
   - Deutliche Logs: "Daten gefunden (offiziell|auto @Pfad): N"
============================================================================= */
(function(){
  const VER = "v18.2.3";
  const I = (m)=> (window.CBLog?.info  || console.log)(`[ui-build] ${m}`);
  const W = (m)=> (window.CBLog?.warn  || console.warn)(`[ui-build] ${m}`);

  function el(t,c){ const e=document.createElement(t); if(c) e.className=c; return e; }
  function looksBuilding(o){
    return o && typeof o==="object" &&
      (("name" in o)||("title" in o)||("key" in o)) &&
      (("category" in o)||("cat" in o));
  }
  function norm(b){ return {
    key:  b?.key||b?.id||b?.name||b?.type||"unknown",
    name: b?.title||b?.name||b?.label||b?.key||"Unbenannt",
    icon: b?.icon||b?.sprite||b?.image||null,
    cat:  b?.category||b?.cat||"default",
    raw:  b||{}
  }; }
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
          return { path:"Registry.getCategories()", cats: cats.map(c=>({
            id:c.id||c.key||c.name,
            name:c.title||c.name||String(c.id||c.key||"Kategorie"),
            items:(c.items||c.buildings||[]).map(norm)
          }))};
        }
      }catch(e){ W(`Registry.getCategories() Fehler: ${e?.message||e}`); }
    }
    // 2) Registry.categories & .buildings
    if (window.Registry && (Array.isArray(window.Registry.categories)||Array.isArray(window.Registry.buildings))){
      const cats = window.Registry.categories||[];
      const blds = window.Registry.buildings ||[];
      if (cats.length && blds.length){
        const byCat={}; blds.forEach(b=>{ const nb=norm(b); (byCat[nb.cat] ||= []).push(nb); });
        return { path:"Registry.categories/buildings", cats: cats.map(c=>({
          id:c.id||c.key||c.name,
          name:c.title||c.name||String(c.id||c.key||"Kategorie"),
          items: byCat[(c.id||c.key||c.name)] || []
        }))};
      }
    }
    // 3) EntitiesRegistry.buildings
    if (window.EntitiesRegistry?.buildings?.length){
      const g={}; window.EntitiesRegistry.buildings.forEach(b=>{ const nb=norm(b); (g[nb.cat] ||= []).push(nb); });
      return { path:"EntitiesRegistry.buildings", cats: Object.keys(g).map(k=>({ id:k, name:String(k), items:g[k] })) };
    }
    return null;
  }

  /* ------------------------- DISCOVERY (rekursiv) -------------------------- */
  function toArrayLike(value){
    if (Array.isArray(value)) return value;
    if (value instanceof Map)  return Array.from(value.values());
    if (value && typeof value==="object"){
      // Objekt-Dictionary → Werte nehmen
      return Object.values(value);
    }
    return null;
  }

  function discoverFrom(value, label, grouped){
    const arr = toArrayLike(value);
    if (!arr || !arr.length) return 0;
    let good=0, taken=0;
    const lim = Math.min(arr.length, 200);
    for (let i=0;i<Math.min(12, lim); i++) if (looksBuilding(arr[i])) good++;
    if (good>=3){
      for (let i=0;i<lim; i++){
        const b = arr[i];
        if (looksBuilding(b)){ const nb=norm(b); (grouped[nb.cat] ||= []).push(nb); taken++; }
      }
      I(`auto @${label} – Treffer: ${taken}`);
    }
    return taken;
  }

  function scanObject(obj, baseLabel, grouped, depth){
    if (!obj || typeof obj!=="object" || depth<=0) return 0;
    let found = 0;

    // Direkter Versuch auf diesem Knoten
    found += discoverFrom(obj, baseLabel, grouped);
    // .buildings Feld?
    if (obj && typeof obj==="object" && obj.buildings){
      found += discoverFrom(obj.buildings, `${baseLabel}.buildings`, grouped);
    }

    // Kinder scannen (eine Ebene breit; Schutz gegen riesige Objekte)
    const keys = Object.keys(obj);
    for (let i=0;i<keys.length && i<40; i++){
      const k = keys[i];
      try{
        const v = obj[k];
        if (v && typeof v==="object"){
          found += discoverFrom(v, `${baseLabel}.${k}`, grouped);
          found += scanObject(v, `${baseLabel}.${k}`, grouped, depth-1);
        }
      }catch(_){}
    }
    return found;
  }

  function autoDiscover(){
    const grouped = {};
    let hits = 0;

    // window.* flach
    for (const k in window){
      try{
        const v = window[k]; if(!v) continue;
        hits += discoverFrom(v, `window.${k}`, grouped);
        if (v && typeof v==="object"){
          hits += scanObject(v, `window.${k}`, grouped, 2);
        }
      }catch(_){}
    }

    // Registry & EntitiesRegistry vertieft (bis Tiefe 3)
    if (window.Registry)        hits += scanObject(window.Registry,        "Registry",        grouped, 3);
    if (window.EntitiesRegistry)hits += scanObject(window.EntitiesRegistry, "EntitiesRegistry", grouped, 3);

    if (!hits) return null;

    return {
      path: "auto-discovery",
      cats: Object.keys(grouped).map(k=>({ id:k, name:String(k), items: grouped[k] }))
    };
  }

  /* ------------------------------ UI/Dock ---------------------------------- */
  class Dock{
    constructor(root){
      this.root=root; this.root.classList.add("ui-build-dock");
      this.syncMaxH(); window.addEventListener("resize",()=>this.syncMaxH());
    }
    syncMaxH(){ const h=Math.max(200,Math.min(320,Math.round(window.innerHeight*0.40)));
      document.documentElement.style.setProperty("--build-dock-max-h", `${h}px`); }
    render(data, label){
      this.root.innerHTML="";
      const body=el("div","ui-build-body");

      if (!Array.isArray(data) || !data.length){
        const empty=el("div","ui-build-empty"); empty.textContent="Keine Gebäude verfügbar";
        body.appendChild(empty); this.root.appendChild(body); return;
      }

      if (label) I(`render @${label} → ${data.reduce((s,c)=>s+(c.items||[]).length,0)} Gebäude`);

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

    // Öffentliche API
    window.UIBuild = {
      open:(f)=>dock.open(f), close:(f)=>dock.close(f), toggle:(f)=>dock.toggle(f),
      render:(data,label)=>{
        if (Array.isArray(data)) return dock.render(data,label||"manual");
        const off = fromOfficial();
        if (off){ I(`Daten gefunden (offiziell @${off.path}): ${off.cats.reduce((s,c)=>s+(c.items||[]).length,0)}`); return dock.render(off.cats, off.path); }
        const auto = autoDiscover();
        if (auto){ I(`Daten gefunden (auto @${auto.path}): ${auto.cats.reduce((s,c)=>s+(c.items||[]).length,0)}`); return dock.render(auto.cats, auto.path); }
        W("Keine Gebäudedaten → leerer Hinweis"); return dock.render([], "none");
      },
      version: VER
    };

    // Erstes Render
    window.UIBuild.render();

    // Re-Render bei typischen Events
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
