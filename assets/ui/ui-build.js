/* =============================================================================
   Datei: assets/ui/ui-build.js
   Version: v18.0.2-min
   Zweck:
     - Baumenü zuverlässig befüllen (egal ob Registry neu/alt/monolithisch).
     - Rendert ERST, wenn Daten wirklich da sind (Polling + Events).
     - Klare Logs, warum etwas leer ist (Quelle fehlt / Kategorien leer).
   Standard: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
============================================================================= */

/* -------------------------------- Konstanten -------------------------------- */
const UI_BUILD_VER = "v18.0.2-min";
const bI = (m)=> (window.CBLog?.info || console.log)(`[ui-build] ${m}`);
const bW = (m)=> (window.CBLog?.warn || console.warn)(`[ui-build] ${m}`);
const bE = (m)=> (window.CBLog?.error|| console.error)(`[ui-build] ${m}`);

const POLL_MS = 200;     // Abstände fürs Warten auf Datenquellen
const POLL_MAX = 60;     // 60 * 200ms = 12s Timeout

/* ----------------------------- Hilfsfunktionen ------------------------------ */
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
  return "data:image/gif;base64,R0lGODlhAQABAAAAACw="; // 1x1 transparent
}

function getDataNow(){
  // A) Neu: Registry.getCategories() → [{id/title, items:[buildings]}]
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
  // B) Neu: Registry.categories + Registry.buildings
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
  // C) Alt: EntitiesRegistry.buildings
  if (window.EntitiesRegistry && Array.isArray(window.EntitiesRegistry.buildings)){
    const grouped = {};
    window.EntitiesRegistry.buildings.forEach(b=>{
      const nb = normalizeBuilding(b);
      const cat = b.category || b.cat || "default";
      (grouped[cat] ||= []).push(nb);
    });
    return Object.keys(grouped).map(k => ({ id:k, name:String(k), items: grouped[k] }));
  }
  // D) nichts da
  return [];
}

function waitForData(){
  return new Promise((resolve)=>{
    let tries = 0;
    const tick = ()=>{
      const data = getDataNow();
      const count = data.reduce((s,c)=> s + (Array.isArray(c.items)?c.items.length:0), 0);
      if (count > 0){
        return resolve({data, reason:`ready@${tries} ticks`});
      }
      if (++tries >= POLL_MAX){
        return resolve({data:[], reason:"timeout"});
      }
      setTimeout(tick, POLL_MS);
    };
    tick();
  });
}

/* ---------------------------------- Klassen -------------------------------- */
class BuildDock {
  constructor(root){ this.root=root; this.root.classList.add("ui-build-dock"); }

  renderFromData(data){
    this.root.innerHTML = "";
    const body = el("div","ui-build-body");

    if (!Array.isArray(data) || !data.length){
      const empty = el("div","ui-build-empty"); empty.textContent = "Keine Gebäude verfügbar";
      body.appendChild(empty); this.root.appendChild(body); return;
    }

    data.forEach(cat=>{
      const catEl = el("section","ui-build-category");
      if (cat.name){
        const title = el("div","ui-build-category-title"); title.textContent = cat.name; catEl.appendChild(title);
      }
      const row = el("div","ui-build-category-row");
      (cat.items||[]).forEach(item=>{
        const card = el("button","ui-card ui-build-item"); card.type="button"; card.setAttribute("data-key", item.key);
        const wrap = el("div","ui-build-item-imgwrap");
        const img  = el("img","ui-build-item-img"); img.alt=item.name||item.key; img.loading="lazy"; img.src=resolveIcon(item);
        wrap.appendChild(img);
        const label = el("div","ui-build-item-label"); label.textContent = item.name||item.key;
        card.appendChild(wrap); card.appendChild(label);
        card.addEventListener("click", ()=> this.select(item));
        row.appendChild(card);
      });
      catEl.appendChild(row); body.appendChild(catEl);
    });

    this.root.appendChild(body);
  }

  select(item){
    const detail = { key:item.key, name:item.name, raw:item.raw, source:"ui-build" };
    try{ window.dispatchEvent(new CustomEvent("cb:build:select",{detail})); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent("cb:build-select",{detail})); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent("build:select",{detail})); }catch(_){}
    bI(`select ${item.key}`);
  }

  open(from){
    if (this.root.classList.contains("is-open")) return;
    this.root.style.display="block"; this.root.classList.add("is-open");
    document.body.classList.add("has-build-open");
    try{ window.dispatchEvent(new CustomEvent("cb:build:open",{detail:{from:from||"api"}})); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent("cb:build-open",{detail:{from:from||"api"}})); }catch(_){}
    bI("open");
  }

  close(from){
    if (!this.root.classList.contains("is-open")) return;
    this.root.style.display="none"; this.root.classList.remove("is-open");
    document.body.classList.remove("has-build-open");
    try{ window.dispatchEvent(new CustomEvent("cb:build:close",{detail:{from:from||"api"}})); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent("cb:build-close",{detail:{from:from||"api"}})); }catch(_){}
    bI("close");
  }

  toggle(from){ this.root.classList.contains("is-open") ? this.close(from||"toggle") : this.open(from||"toggle"); }
}

/* --------------------------------- Hauptlogik ------------------------------- */
(function initUIBuild(){
  let root = document.getElementById("build-dock") || document.getElementById("build-panel");
  if (!root){
    root = document.createElement("div");
    root.id = "build-dock";
    document.body.appendChild(root);
    bW("BuildDock: #build-dock erzeugt (fehlte im DOM).");
  }
  const dock = new BuildDock(root);

  // Globale API
  window.UIBuild = {
    open:   (from)=> dock.open(from),
    close:  (from)=> dock.close(from),
    toggle: (from)=> dock.toggle(from),
    render: (data)=> dock.renderFromData(Array.isArray(data)?data:getDataNow()),
    version: UI_BUILD_VER
  };

  // Daten abwarten, dann rendern
  (async ()=>{
    const {data, reason} = await waitForData();
    if (data.length){
      bI(`Daten gefunden (${reason}). Rendere Baumenü …`);
      dock.renderFromData(data);
    } else {
      bW("Keine Gebäudedaten gefunden (Registry/EntitiesRegistry leer). Baumenü zeigt Hinweis.");
      dock.renderFromData([]);
    }
  })();

  // Falls später Daten kommen → sofort neu rendern
  ["cb:registry:ready","registry:ready","entities:ready","cb:build:refresh","build:refresh"].forEach(ev=>{
    window.addEventListener(ev, ()=> { bI(`Event '${ev}' → re-render`); dock.renderFromData(getDataNow()); });
  });

  // Hotkey optional: B
  window.addEventListener("keydown",(ev)=>{ if((ev.key||"").toLowerCase()==="b") window.UIBuild.toggle("hotkey"); });

  bI(`bereit (${UI_BUILD_VER})`);
})();
