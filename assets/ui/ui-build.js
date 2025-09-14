/* =============================================================================
   Datei: assets/ui/ui-build.js
   Version: v18.0.0
   Standard: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
   Ziel:
     - Rendert das Baumenü (helles Kartenraster im hellgrauen Dock).
     - API: window.UIBuild.open/close/toggle/render
     - Events:
         * cb:build:open|close  UND  legacy cb:build-open|close
         * cb:build:select  UND  legacy cb:build-select / build:select
     - Datenquellen robust (Registry/EntitiesRegistry/monolithische Fallbacks)
     - Icons robust (BuildAssets / building.icon|sprite|image / Fallback)
============================================================================= */

/* -------------------------------- Konstanten -------------------------------- */
const UI_BUILD_VER = "v18.0.0";
const L_INFO = (m)=> (window.CBLog?.info||console.log)(`[ui-build] ${m}`);
const L_WARN = (m)=> (window.CBLog?.warn||console.warn)(`[ui-build] ${m}`);

/* ----------------------------- Hilfsfunktionen ------------------------------ */
function q(sel,root=document){ return root.querySelector(sel); }
function el(tag, cls){ const e=document.createElement(tag); if(cls) e.className=cls; return e; }

function emitBoth(base, detail){
  // neu
  try{ window.dispatchEvent(new CustomEvent(`cb:${base}`,{detail})); }catch(_){}
  // legacy
  try{
    const legacy = `cb:${base}`.replace("cb:build:","cb:build-");
    window.dispatchEvent(new CustomEvent(legacy,{detail}));
    if (base==="build:select") window.dispatchEvent(new CustomEvent("build:select",{detail}));
  }catch(_){}
}

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
  return "data:image/gif;base64,R0lGODlhAQABAAAAACw="; // 1x1 transparent
}

function getBuildData(){
  // Neuere Registry-API (variante 1: Kategorien liefern Items)
  if (window.Registry && typeof window.Registry.getCategories === "function"){
    const cats = window.Registry.getCategories();
    if (Array.isArray(cats) && cats.length){
      return cats.map(c => ({
        id: c.id || c.key || c.name,
        name: c.title || c.name || String(c.id||c.key||"Kategorie"),
        items: (c.items || c.buildings || []).map(normalizeBuilding)
      }));
    }
  }
  // Neuere Registry-API (variante 2: getrennte Felder)
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
  // Ältere EntitiesRegistry
  if (window.EntitiesRegistry && Array.isArray(window.EntitiesRegistry.buildings)){
    const grouped = {};
    window.EntitiesRegistry.buildings.forEach(b=>{
      const nb = normalizeBuilding(b);
      const cat = b.category || b.cat || "default";
      (grouped[cat] ||= []).push(nb);
    });
    return Object.keys(grouped).map(k => ({ id:k, name:String(k), items: grouped[k] }));
  }
  // Fallback – leer
  return [];
}

/* ---------------------------------- Klassen -------------------------------- */
class BuildDock {
  constructor(root){
    this.root = root;
    this.root.classList.add("ui-build-dock");
    this.bodyEl = null;
  }

  render(){
    this.root.innerHTML = "";
    const body = el("div","ui-build-body");
    this.bodyEl = body;

    const data = getBuildData();
    if (!data.length){
      const empty = el("div","ui-build-empty");
      empty.textContent = "Keine Gebäude verfügbar";
      body.appendChild(empty);
      this.root.appendChild(body);
      return;
    }

    data.forEach(cat=>{
      const catEl = el("section","ui-build-category");

      if (cat.name){
        const title = el("div","ui-build-category-title");
        title.textContent = cat.name;
        catEl.appendChild(title);
      }

      const row = el("div","ui-build-category-row");
      (cat.items||[]).forEach(item=>{
        const card = el("button","ui-card ui-build-item");
        card.type = "button";
        card.setAttribute("data-key", item.key);

        const imgWrap = el("div","ui-build-item-imgwrap");
        const img = el("img","ui-build-item-img");
        img.alt = item.name || item.key;
        img.loading = "lazy";
        img.src = resolveIcon(item);
        imgWrap.appendChild(img);

        const label = el("div","ui-build-item-label");
        label.textContent = item.name || item.key;

        card.appendChild(imgWrap);
        card.appendChild(label);
        card.addEventListener("click", ()=> this.select(item));
        row.appendChild(card);
      });

      catEl.appendChild(row);
      body.appendChild(catEl);
    });

    this.root.appendChild(body);
  }

  select(item){
    const detail = { key:item.key, name:item.name, raw:item.raw, source:"ui-build" };
    emitBoth("build:select", detail); // cb:build:select + cb:build-select + build:select
    L_INFO(`select ${item.key}`);
  }

  open(from){
    if (!this.root.classList.contains("is-open")){
      this.render();
      this.root.style.display="block";
      this.root.classList.add("is-open");
      document.body.classList.add("has-build-open");
      emitBoth("build:open", { from: from||"api", root:this.root });
      L_INFO("open");
    }
  }

  close(from){
    if (this.root.classList.contains("is-open")){
      this.root.style.display="none";
      this.root.classList.remove("is-open");
      document.body.classList.remove("has-build-open");
      emitBoth("build:close", { from: from||"api", root:this.root });
      L_INFO("close");
    }
  }

  toggle(from){
    (this.root.classList.contains("is-open")) ? this.close(from||"toggle") : this.open(from||"toggle");
  }
}

/* --------------------------------- Hauptlogik ------------------------------- */
(function initUIBuild(){
  let root = document.getElementById("build-dock") || document.getElementById("build-panel");
  if (!root){
    root = document.createElement("div");
    root.id = "build-dock";
    document.body.appendChild(root);
    L_WARN("BuildDock: #build-dock erzeugt (fehlte im DOM).");
  }
  const dock = new BuildDock(root);

  // globale API
  window.UIBuild = {
    open:   (from)=> dock.open(from),
    close:  (from)=> dock.close(from),
    toggle: (from)=> dock.toggle(from),
    render: ()=> dock.render(),
    version: UI_BUILD_VER
  };

  // Hotkey (optional): B
  window.addEventListener("keydown",(ev)=>{
    if((ev.key||"").toLowerCase()==="b") window.UIBuild.toggle("hotkey");
  });

  // Marker für FABs updaten
  window.addEventListener("cb:build:open",  ()=> document.body.classList.add("has-build-open"));
  window.addEventListener("cb:build:close", ()=> document.body.classList.remove("has-build-open"));

  L_INFO(`bereit (${UI_BUILD_VER})`);
})();

/* ----------------------------------- Exports -------------------------------- */
// window.UIBuild (oben)
