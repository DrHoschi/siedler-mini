/*! Neue Siedler – Build Dock (v18.4.0)
 *  - Registry-first Datenquelle, Fallback auf Bridge/JSON
 *  - kompatibel zu #build-dock UND #build-panel
 *  - Events: cb:build:open / cb:build:close, reagiert auf cb:game-start
 *  - bewahrt alten API-Surface: window.GameUI.toggleBuild()
 */
(function () {
  const log = (m, ...a) => (window.CBLog?.info || console.log).call(console, "[ui-build]", m, ...a);
  const warn = (m, ...a) => (window.CBLog?.warn || console.warn).call(console, "[ui-build]", m, ...a);

  // ---------- Root + state ----------
  const root = ensureRoot();                 // <div id="build-dock" class="ui-build-dock">
  const wrap = el("div", "ui-build-wrap");   // Innen-Wrapper (scroll-strukturen)
  root.appendChild(wrap);

  let IS_OPEN = false;
  let DATA = null; // { cats: [...], items: [...] }

  // ---------- Public API / Legacy ----------
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleBuild = toggle;
  window.GameUI.openBuild   = openDock;
  window.GameUI.closeBuild  = closeDock;

  // ---------- Boot: Daten holen & System-Events ----------
  hydrate().then(() => {
    // initial einmal zeichnen (leer → Hinweis oder echte Items)
    render();
  });

  // Re-render bei Start (damit Kategorien sicher stehen)
  window.addEventListener("cb:game-start", () => {
    render();
  });

  // Safe Marker-Klasse am Body für FAB-Abstand
  function markOpen(){ document.body.classList.add('has-build-open');  }
  function markClose(){ document.body.classList.remove('has-build-open'); }

  // ---------- Core ----------
  async function hydrate(){
    // 1) Registry bevorzugen
    const reg = window.Registry;
    if (reg && typeof reg.list === "function") {
      const regItems = tryGetRegistryBuildings(reg);
      if (regItems && regItems.items?.length) {
        DATA = regItems;
        log("Items gesetzt (via Registry)", `(${DATA.items.length} / ${DATA.cats.length})`);
        return;
      }
    }

    // 2) Bridge / Fallback
    const bridge = window.UIBuildBridge;
    try {
      if (bridge && typeof bridge.fetch === "function") {
        const d = await bridge.fetch(); // erwartet {items, cats}
        if (d?.items?.length) {
          DATA = normalize(d);
          log("Fallback JSON erkannt (cats:%s / items:%s)", DATA.cats.length, DATA.items.length);
          return;
        }
      }
    } catch(e){ warn("Bridge-Fehler:", e); }

    // 3) allerletzter Fallback: Minimal-Hinweis
    DATA = { cats: [], items: [] };
    warn("Keine Gebäudedaten → leerer Hinweis");
  }

  function tryGetRegistryBuildings(reg){
    try{
      // Erwarte: reg.list("buildings") → Array von { id, name, category, icon, image }
      const items = (reg.list && reg.list("buildings")) || [];
      // Kategorien aus Registry lesen (oder aus Items ableiten)
      const catsFromReg = (reg.list && reg.list("categories")) || [];
      const catMap = new Map();
      (catsFromReg || []).forEach(c=>{
        catMap.set(c.id || c.key || c, {
          id: c.id || c.key || c,
          title: c.title || c.name || String(c),
          icon: c.icon || null,
          color: c.color || null
        });
      });

      const cats = [];
      const itemsNorm = [];
      items.forEach(b=>{
        const catId = b.category || "misc";
        if (!catMap.has(catId)){
          catMap.set(catId, { id: catId, title: catId, icon: null, color: null });
        }
        itemsNorm.push({
          id: b.id,
          title: b.title || b.name || b.id,
          cat: catId,
          img: b.image || b.icon || null
        });
      });
      catMap.forEach(v=>cats.push(v));
      return { cats, items: itemsNorm };
    }catch(e){
      warn("Registry-lesen fehlgeschlagen:", e);
      return null;
    }
  }

  function normalize(d){
    // Vereinheitliche Struktur {cats:[{id,title,icon,color}], items:[{id,title,cat,img}]}
    const cats = (d.cats || d.categories || []).map(c=>({
      id: c.id || c.key || c.cat || "misc",
      title: c.title || c.name || c.label || "Kategorie",
      icon: c.icon || null,
      color: c.color || null
    }));
    const items = (d.items || d.buildings || []).map(b=>({
      id: b.id || b.key,
      title: b.title || b.name || b.label || b.id,
      cat: b.cat || b.category || "misc",
      img: b.img || b.icon || b.image || null
    }));
    return { cats, items };
  }

  function render(){
    clear(wrap);

    if (!DATA || !DATA.items?.length){
      wrap.appendChild(emptyBox("Keine Gebäude verfügbar"));
      return;
    }

    // Kategorien in stabiler Reihenfolge (bekannte zuerst)
    const order = ["infra","admin","home","food","prod","trade","mil","misc"];
    const cats = [...DATA.cats];
    cats.sort((a,b)=>{
      const ai = order.indexOf(a.id); const bi = order.indexOf(b.id);
      const aa = ai<0 ? 999 : ai; const bb = bi<0 ? 999 : bi;
      if (aa!==bb) return aa-bb;
      return (a.title||"").localeCompare(b.title||"");
    });

    cats.forEach(cat=>{
      const section = el("section","ui-build-cat");
      const chip = el("div","ui-build-chip");
      if (cat.icon) {
        const ic = new Image();
        ic.src = cat.icon;
        chip.appendChild(ic);
      }
      chip.appendChild(document.createTextNode(cat.title || cat.id));
      section.appendChild(chip);

      const grid = el("div","ui-build-grid");
      // nur Items dieser Kategorie
      DATA.items.filter(i=>i.cat===cat.id).forEach(it=>{
        grid.appendChild(card(it));
      });

      if (!grid.children.length){
        const none = el("div","ui-build-empty");
        none.textContent = "Keine Einträge in dieser Kategorie";
        grid.appendChild(none);
      }

      section.appendChild(grid);
      wrap.appendChild(section);
    });
  }

  function card(it){
    const card = el("div","ui-build-card");
    const btn = el("button");
    const art = el("div","art");
    const label = el("div","label");

    label.textContent = it.title || it.id;

    const img = new Image();
    img.loading = "lazy";
    img.decoding = "async";
    // Bild: bevorzugt assets/buildings/* – ansonsten icon
    img.src = bestImageFor(it);
    art.appendChild(img);

    btn.appendChild(art);
    btn.appendChild(label);
    btn.addEventListener("click", ()=> select(it));
    card.appendChild(btn);
    return card;
  }

  function bestImageFor(it){
    if (it.img) return it.img;
    // heuristik: assets/buildings/<id>*.png
    return `assets/buildings/${it.id}_wood.png`;
  }

  function select(it){
    // alter Event-Name bleibt (Abwärtskompatibilität)
    const ev = new CustomEvent("cb:build:select", { detail: { id: it.id }});
    window.dispatchEvent(ev);
    log("select", it.id);
  }

  // ---------- Open/Close/Toggle ----------
  function toggle(){
    if (IS_OPEN) return closeDock();
    return openDock();
  }
  function openDock(){
    if (IS_OPEN) return;
    IS_OPEN = true;
    root.classList.add("is-open");
    markOpen();
    window.dispatchEvent(new Event("cb:build:open"));
  }
  function closeDock(){
    if (!IS_OPEN) return;
    IS_OPEN = false;
    root.classList.remove("is-open");
    markClose();
    window.dispatchEvent(new Event("cb:build:close"));
  }

  // ---------- DOM helpers ----------
  function ensureRoot(){
    let r = document.getElementById("build-dock") ||
            document.getElementById("build-panel"); // legacy id
    if (!r){
      r = document.createElement("div");
      r.id = "build-dock";
      r.className = "ui-build-dock";
      document.body.appendChild(r);
    }else{
      r.classList.add("ui-build-dock");
    }
    return r;
  }
  function clear(n){ while(n.firstChild) n.removeChild(n.firstChild); }
  function el(tag, cls){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }
})();
