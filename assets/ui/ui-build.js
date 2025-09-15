/* =============================================================================
   Datei: assets/ui/ui-build.js
   Version: v18.0.3
   Ziel:
     - Baumenü füllt sich zuverlässig (Registry / EntitiesRegistry / Fallback)
     - Warten bis zu 60s auf Daten (Polling) + hört auf viele Ready-Events
     - Manueller Refresh über GameUI.refreshBuild()
     - Deutliche Logs, wenn Datenquellen leer / verspätet sind
============================================================================= */

/* -------------------------------- Konstanten -------------------------------- */
const UI_BUILD_VER = "v18.0.3";
const BI = (m)=> (window.CBLog?.info || console.log)(`[ui-build] ${m}`);
const BW = (m)=> (window.CBLog?.warn || console.warn)(`[ui-build] ${m}`);
const BE = (m)=> (window.CBLog?.error|| console.error)(`[ui-build] ${m}`);

const POLL_MS  = 250;      // Intervall beim Warten
const POLL_MAX = 240;      // 240 * 250ms = 60s

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
  return "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
}

function collectDataNow(){
  // 1) Neu: Registry.getCategories() -> [{id/title, items:[buildings]}]
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
    }catch(e){ BW(`Registry.getCategories() Fehler: ${e?.message||e}`); }
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
  // 3) Alt: EntitiesRegistry.buildings (ungrouped)
  if (window.EntitiesRegistry && Array.isArray(window.EntitiesRegistry.buildings)){
    const grouped = {};
    window.EntitiesRegistry.buildings.forEach(b=>{
      const nb = normalizeBuilding(b);
      const cat = b.category || b.cat || "default";
      (grouped[cat] ||= []).push(nb);
    });
    return Object.keys(grouped).map(k => ({ id:k, name:String(k), items: grouped[k] }));
  }
  // 4) nichts
  return [];
}

async function waitForDataUntil(timeoutMsg){
  let tries = 0;
  return new Promise(resolve=>{
    const tick = ()=>{
      const data = collectDataNow();
      const count = data.reduce((s,c)=> s + ((c.items||[]).length), 0);
      if (count>0) return resolve({data,tries});
      if (++tries >= POLL_MAX){
        BW(timeoutMsg||"Timeout: Keine Gebäudedaten innerhalb 60s.");
        return resolve({data:[],tries});
      }
      setTimeout(tick, POLL_MS);
    };
    tick();
  });
}

/* ---------------------------------- Klassen -------------------------------- */
class BuildDock {
  constructor(root){
    this.root = root;
    this.root.classList.add("ui-build-dock");
  }

  renderData(data){
    this.root.innerHTML = "";
    const body = el("div","ui-build-body");

    if (!Array.isArray(data) || !data.length){
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
        const card = el("button","ui-card ui-build-item"); card.type="button";
        card.setAttribute("data-key", item.key);

        const wrap = el("div","ui-build-item-imgwrap");
        const img  = el("img","ui-build-item-img");
        img.alt = item.name || item.key; img.loading="lazy"; img.src = resolveIcon(item);
        wrap.appendChild(img);

        const label = el("div","ui-build-item-label"); label.textContent = item.name || item.key;
        card.appendChild(wrap); card.appendChild(label);

        card.addEventListener("click", ()=>{
          const detail = { key:item.key, name:item.name, raw:item.raw, source:"ui-build" };
          try{ window.dispatchEvent(new CustomEvent("cb:build:select",{detail})); }catch(_){}
          try{ window.dispatchEvent(new CustomEvent("cb:build-select",{detail})); }catch(_){}
          try{ window.dispatchEvent(new CustomEvent("build:select",{detail})); }catch(_){}
          BI(`select ${item.key}`);
        });

        row.appendChild(card);
      });
      catEl.appendChild(row);
      body.appendChild(catEl);
    });

    this.root.appendChild(body);
  }

  open(from){
    if (this.root.classList.contains("is-open")) return;
    this.root.style.display="block"; this.root.classList.add("is-open");
    document.body.classList.add("has-build-open");
    try{ window.dispatchEvent(new CustomEvent("cb:build:open",{detail:{from:from||"api"}})); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent("cb:build-open",{detail:{from:from||"api"}})); }catch(_){}
    BI("open");
  }

  close(from){
    if (!this.root.classList.contains("is-open")) return;
    this.root.style.display="none"; this.root.classList.remove("is-open");
    document.body.classList.remove("has-build-open");
    try{ window.dispatchEvent(new CustomEvent("cb:build:close",{detail:{from:from||"api"}})); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent("cb:build-close",{detail:{from:from||"api"}})); }catch(_){}
    BI("close");
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
    BW("BuildDock: #build-dock erzeugt (fehlte im DOM).");
  }
  const dock = new BuildDock(root);

  // Öffentliche API
  window.UIBuild = {
    open:   (from)=> dock.open(from),
    close:  (from)=> dock.close(from),
    toggle: (from)=> dock.toggle(from),
    render: (data)=> dock.renderData(Array.isArray(data)?data:collectDataNow()),
    version: UI_BUILD_VER
  };

  // Warten bis Daten wirklich da sind, dann einmal initial rendern
  (async ()=>{
    const {data, tries} = await waitForDataUntil("Timeout: Registry/EntitiesRegistry liefert keine Gebäude.");
    if (data.length){
      BI(`Gebäudedaten gefunden (nach ${tries} Ticks) → Render.`);
      dock.renderData(data);
    } else {
      BW("Keine Gebäudedaten gefunden → Dock zeigt Hinweis (leer).");
      dock.renderData([]);
    }
  })();

  // Auf viele mögliche „jetzt sind Daten da“-Events hören → sofort re-rendern
  [
    "cb:registry:ready","registry:ready","entities:ready","entities.registry:ready",
    "cb:assets:ready","assets:ready","cb:assets-ready","assets-ready",
    "cb:game-start","game:start","cb:build:refresh","build:refresh"
  ].forEach(ev=>{
    window.addEventListener(ev, ()=>{
      BI(`Event '${ev}' → re-render`);
      dock.renderData(collectDataNow());
    });
  });

  // Manuelles Refresh-API für Notfälle
  window.GameUI = window.GameUI || {};
  window.GameUI.refreshBuild = function(){ BI("manual refresh → render"); dock.renderData(collectDataNow()); };

  BI(`bereit (${UI_BUILD_VER})`);
})();
