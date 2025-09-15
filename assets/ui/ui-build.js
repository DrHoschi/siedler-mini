/* =============================================================================
   Neue Siedler – UI: Build Dock
   Version: v18.2.4
   - Erkennt Gebäudedaten auch bei verschachtelten Feldern:
     name:  name, title, label, i18n.de, i18n["de-DE"], meta.title, display, ...
     cat:   category, cat, meta.category, group, klass, category.id/key/name, ...
   - Offiziell -> Discovery (rekursiv, inkl. Objects/Maps)
============================================================================= */
(function(){
  const VER = "v18.2.4";
  const I = (m)=> (window.CBLog?.info  || console.log)(`[ui-build] ${m}`);
  const W = (m)=> (window.CBLog?.warn  || console.warn)(`[ui-build] ${m}`);

  /* ----------------------------- Utils ------------------------------------- */
  const get = (obj, path) => {
    if (!obj || !path) return undefined;
    const parts = Array.isArray(path) ? path : String(path).split('.');
    let cur = obj;
    for (const p of parts){
      if (cur == null) return undefined;
      if (p in cur) cur = cur[p];
      else return undefined;
    }
    return cur;
  };

  const pickFirst = (obj, paths) => {
    for (const p of paths){
      let v = Array.isArray(p) ? get(obj, p) : get(obj, p);
      if (v == null) continue;
      // Falls Objekt {id|key|name} → extrahieren
      if (typeof v === "object"){
        const vk = v.key ?? v.id ?? v.name ?? v.title;
        if (vk != null) return String(vk);
      }
      return typeof v === "string" || typeof v === "number" ? String(v) : v;
    }
    return undefined;
  };

  const NAME_PATHS = [
    "name","title","label","display","text","caption",
    ["title","de"],["i18n","de"],["i18n","de-DE"],["meta","title"],
  ];
  const CAT_PATHS = [
    "category","cat","group","klass",["meta","category"],
    ["category","id"],["category","key"],["category","name"]
  ];
  const KEY_PATHS = ["key","id","slug","code","type","name"];

  function looksBuilding(o){
    if (!o || typeof o!=="object") return false;
    // Muss Art 'building' o. Kategorie + Name haben
    const kind = pickFirst(o, ["kind","type","_type"]);
    const hasKind = (typeof kind === "string" && /build/i.test(kind));
    const nm  = pickFirst(o, NAME_PATHS) ?? pickFirst(o, KEY_PATHS);
    const cat = pickFirst(o, CAT_PATHS);
    return (nm && cat) || hasKind;
  }

  function normalize(o){
    const key = pickFirst(o, KEY_PATHS) || "unknown";
    const name = pickFirst(o, NAME_PATHS) || String(key);
    let cat = pickFirst(o, CAT_PATHS) || "default";
    if (typeof cat === "object") {
      cat = cat.key ?? cat.id ?? cat.name ?? "default";
    }
    const icon = pickFirst(o, [["icon"],["sprite"],["image"],["meta","icon"]]);

    return { key, name, icon, cat, raw:o };
  }

  function iconSrc(b){
    try{
      if (window.BuildAssets?.getIcon){ const s=window.BuildAssets.getIcon(b.key); if(s) return s; }
      if (window.BuildAssets?.icons?.[b.key]) return window.BuildAssets.icons[b.key];
    }catch(_){}
    return b.icon || b.raw?.icon || b.raw?.sprite || b.raw?.image
         || "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  }

  /* --------------------------- OFFIZIELL ----------------------------------- */
  function official(){
    if (window.Registry?.getCategories){
      try{
        const cats = window.Registry.getCategories();
        if (Array.isArray(cats) && cats.length){
          return {
            path: "Registry.getCategories()",
            cats: cats.map(c=>({
              id: c.id||c.key||c.name,
              name: c.title||c.name||String(c.id||c.key||"Kategorie"),
              items: (c.items||c.buildings||[]).map(normalize)
            }))
          };
        }
      }catch(e){ W(`Registry.getCategories() Fehler: ${e?.message||e}`); }
    }
    if (window.Registry && (Array.isArray(window.Registry.categories)||Array.isArray(window.Registry.buildings))){
      const cats = window.Registry.categories||[];
      const blds = window.Registry.buildings ||[];
      if (cats.length && blds.length){
        const byCat={}; blds.forEach(b=>{ const nb=normalize(b); (byCat[nb.cat] ||= []).push(nb); });
        return {
          path: "Registry.categories/buildings",
          cats: cats.map(c=>({
            id: c.id||c.key||c.name,
            name: c.title||c.name||String(c.id||c.key||"Kategorie"),
            items: byCat[(c.id||c.key||c.name)] || []
          }))
        };
      }
    }
    if (window.EntitiesRegistry?.buildings?.length){
      const g={}; window.EntitiesRegistry.buildings.forEach(b=>{ const nb=normalize(b); (g[nb.cat] ||= []).push(nb); });
      return { path:"EntitiesRegistry.buildings", cats: Object.keys(g).map(k=>({ id:k, name:String(k), items:g[k] })) };
    }
    return null;
  }

  /* --------------------------- DISCOVERY ----------------------------------- */
  const toArrayLike = (v)=>{
    if (Array.isArray(v)) return v;
    if (v instanceof Map)  return Array.from(v.values());
    if (v && typeof v === "object"){
      const vals = Object.values(v);
      // sehr große Plain-Objekte vermeiden
      if (vals.length && vals.length < 2000) return vals;
    }
    return null;
  };

  function discoverAt(value, label, grouped){
    const arr = toArrayLike(value);
    if (!arr || !arr.length) return 0;
    // Sample prüfen
    let ok=0, take=0;
    for (let i=0;i<Math.min(12,arr.length);i++) if (looksBuilding(arr[i])) ok++;
    if (ok<3) return 0;

    const lim = Math.min(arr.length, 600);
    for (let i=0;i<lim;i++){
      const it = arr[i]; if (!looksBuilding(it)) continue;
      const nb = normalize(it);
      (grouped[nb.cat] ||= []).push(nb);
      take++;
    }
    I(`auto @${label} → ${take}`);
    return take;
  }

  function scan(obj, base, grouped, depth){
    if (!obj || typeof obj!=="object" || depth<=0) return 0;
    let hits = 0;
    hits += discoverAt(obj, base, grouped);
    if (obj.buildings) hits += discoverAt(obj.buildings, `${base}.buildings`, grouped);

    const keys = Object.keys(obj).slice(0, 60);
    for (const k of keys){
      try{
        const v = obj[k]; if (!v || typeof v!=="object") continue;
        hits += discoverAt(v, `${base}.${k}`, grouped);
        hits += scan(v, `${base}.${k}`, grouped, depth-1);
      }catch(_){}
    }
    return hits;
  }

  function discover(){
    const grouped = {};
    let total = 0;

    // window flach + tief
    for (const k in window){
      try{
        const v = window[k]; if (!v) continue;
        total += discoverAt(v, `window.${k}`, grouped);
        if (v && typeof v==="object") total += scan(v, `window.${k}`, grouped, 2);
      }catch(_){}
    }
    if (window.Registry)        total += scan(window.Registry,        "Registry",        grouped, 3);
    if (window.EntitiesRegistry)total += scan(window.EntitiesRegistry, "EntitiesRegistry", grouped, 3);

    if (!total) return null;
    return { path:"auto-discovery", cats: Object.keys(grouped).map(c=>({ id:c, name:String(c), items: grouped[c] })) };
  }

  /* ---------------------------- UI / Dock ---------------------------------- */
  class Dock{
    constructor(root){
      this.root=root; this.root.classList.add("ui-build-dock");
      this.syncH(); window.addEventListener("resize",()=>this.syncH());
    }
    syncH(){ const h=Math.max(200,Math.min(320,Math.round(window.innerHeight*0.40)));
      document.documentElement.style.setProperty("--build-dock-max-h", `${h}px`); }
    render(cats,label){
      this.root.innerHTML="";
      const body=el("div","ui-build-body");
      if (!Array.isArray(cats) || !cats.length){
        const empty=el("div","ui-build-empty"); empty.textContent="Keine Gebäude verfügbar";
        body.appendChild(empty); this.root.appendChild(body); return;
      }
      if (label) I(`render @${label} → ${cats.reduce((s,c)=>s+(c.items||[]).length,0)} Gebäude`);

      cats.forEach(cat=>{
        const sec=el("section","ui-build-category");
        if (cat.name){ const t=el("div","ui-build-category-title"); t.textContent=cat.name; sec.appendChild(t); }
        const row=el("div","ui-build-category-row");
        (cat.items||[]).forEach(item=>{
          const card=el("button","ui-card ui-build-item"); card.type="button"; card.setAttribute("data-key",item.key);
          const wrap=el("div","ui-build-item-imgwrap");
          const img=el("img","ui-build-item-img"); img.alt=item.name||item.key; img.loading="lazy"; img.src=iconSrc(item);
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
    const dock = new Dock(root);

    window.UIBuild = {
      open:()=>dock.open(), close:()=>dock.close(), toggle:()=>dock.toggle(),
      render:(cats,label)=>{
        if (Array.isArray(cats)) return dock.render(cats,label||"manual");
        const off = official();
        if (off){ I(`Daten gefunden (offiziell @${off.path})`); return dock.render(off.cats, off.path); }
        const auto = discover();
        if (auto){ I(`Daten gefunden (auto @${auto.path})`); return dock.render(auto.cats, auto.path); }
        W("Keine Gebäudedaten → leerer Hinweis"); return dock.render([], "none");
      },
      version: VER
    };

    window.UIBuild.render();
    [
      "cb:registry:ready","registry:ready","entities:ready","entities.registry:ready",
      "cb:assets:ready","assets:ready","cb:assets-ready","assets-ready",
      "cb:game-start","game:start","cb:build:refresh","build:refresh"
    ].forEach(ev=> window.addEventListener(ev, ()=>{ I(`Event '${ev}' → re-render`); window.UIBuild.render(); }));

    window.addEventListener("keydown",(ev)=>{ if((ev.key||"").toLowerCase()==="b") window.UIBuild.toggle(); });

    I(`bereit (${VER})`);
  })();
})();
