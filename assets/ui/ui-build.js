<script>
/* ============================================================
 * Neue Siedler – UIBuild (Baumenü)
 * Datei: assets/ui/ui-build.js
 * Version: v18.3.3 (stable)
 * Abhängigkeiten: keine harten (optional: window.Registry)
 * Public API:
 *   - window.UIBuild.ready === true sobald initialisiert
 *   - window.UIBuild.open()
 *   - window.UIBuild.close()
 *   - window.UIBuild.toggle()
 *   - window.UIBuild.setItems(items:Array<BuildItem>)
 *   - window.UIBuild.render()
 * Events, auf die reagiert wird:
 *   - cb:assets-ready, cb:registry:ready, cb:game-start
 * ============================================================ */

(function () {
  const LOG_PREFIX = "[ui-build]";
  const BRIDGE_PREFIX = "[ui-build.bridge]";
  const CBLog = window.CBLog ?? console;

  // --------- Utilities ------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const on = (t, e, f) => t.addEventListener(e, f);

  // naive debounce for re-render spam protection
  const debounce = (fn, ms = 50) => {
    let t = 0;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  // Fallback-Mapping für Icons, falls Item.icon fehlt
  const FALLBACK_ICON_BY_ID = {
    rathaus: "assets/buildings/rathaus_wood1.png",
    depot: "assets/buildings/depot_wood.png",
    hq: "assets/buildings/hq_wood.png",
    wohnhaus: "assets/buildings/wohnhaus_wood1_ug0.png",
    fischer: "assets/buildings/fischer_wood1.png",
    farm: "assets/buildings/farm_wood.png",
    windmuehle: "assets/buildings/windmuehle_wood.png",
    baecker: "assets/buildings/baecker_wood.png",
    holzfaeller: "assets/buildings/lumberjack_wood.png",
    steinmetz: "assets/buildings/steinmetz_wood.png",
    schmied: "assets/buildings/schmied_wood0.png",
    wachturm: "assets/buildings/wachturm_wood.png"
  };
  const PLACEHOLDER_ICON = "assets/placeholder64.PNG";

  // Kategorie-Reihenfolge (falls im Item nichts vorgegeben ist)
  const CATEGORY_ORDER = [
    "Allg. / Verwaltung",
    "Wohnen",
    "Produktion / Nahrung",
    "Produktion / Rohstoffe",
    "misc"
  ];

  // --------- Shell / State --------------------------------------------------
  const UIBuild = {
    ready: false,
    _container: null,
    _gridRoot: null,
    _items: [],
    _byCat: new Map(),

    init() {
      if (this.ready) return;
      // Container erstellen (Bottom-Dock)
      let host = $("#build-dock");
      if (!host) {
        host = document.createElement("div");
        host.id = "build-dock";
        host.setAttribute("aria-label", "Bau-Menü");
        Object.assign(host.style, {
          position: "fixed",
          left: "0",
          right: "0",
          bottom: "0",
          zIndex: "40",
          padding: "12px",
          backdropFilter: "blur(4px)",
          background: "rgba(18,22,28,0.85)",
          color: "#cfe7ff",
          maxHeight: "46vh",
          overflow: "auto",
          boxShadow: "0 -8px 24px rgba(0,0,0,.35)",
          borderTop: "1px solid rgba(255,255,255,.08)",
          display: "none"
        });
        document.body.appendChild(host);
      }
      this._container = host;

      // inner
      host.innerHTML = `
        <div id="ui-build-header" style="display:flex;gap:8px;align-items:center;margin:0 4px 10px 4px;flex-wrap:wrap;">
          <button id="ui-build-close" title="Schließen" style="border:none;border-radius:16px;padding:3px 10px;background:#2b3b4a;color:#cfe7ff;cursor:pointer;">×</button>
          <div id="ui-build-tabs" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
        </div>
        <div id="ui-build-grid" style="display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));"></div>
        <div id="ui-build-empty" style="display:none;padding:16px;border-radius:12px;background:#1e2732;color:#9db4c6;margin:8px;">
          Keine Einträge in dieser Kategorie
        </div>
      `;

      this._gridRoot = $("#ui-build-grid", host);

      on($("#ui-build-close", host), "click", () => this.close());
      this._wireButtons();
      this.ready = true;
      CBLog?.log?.(`${LOG_PREFIX} bereit (v18.3.3)`);

      // Falls das Bridge-Skript schon Items gesammelt hat:
      if (window.__UIBUILD_PENDING_ITEMS__) {
        this.setItems(window.__UIBUILD_PENDING_ITEMS__, {silent: true});
        delete window.__UIBUILD_PENDING_ITEMS__;
        this.render();
      }
    },

    _wireButtons() {
      // globaler FAB (Ziegel) kann #build-open heißen – falls vorhanden, anbinden
      const openBtn = document.getElementById("btn-open-build") || document.querySelector('[data-action="open-build"]');
      if (openBtn) on(openBtn, "click", () => this.toggle());
    },

    open() {
      this._container.style.display = "block";
      this.render(); // idempotent
      CBLog?.log?.(`${LOG_PREFIX} open`);
    },

    close() {
      this._container.style.display = "none";
      CBLog?.log?.(`${LOG_PREFIX} close`);
    },

    toggle() {
      const vis = this._container.style.display !== "none";
      vis ? this.close() : this.open();
    },

    setItems(items, opts = {}) {
      // Vollständig übernehmen – wir erwarten objs: {id, title|name, category, icon}
      this._items = Array.isArray(items) ? items.slice() : [];
      // Gruppieren
      this._byCat = new Map();
      for (const it of this._items) {
        const cat = normalizeCategory(it.category);
        if (!this._byCat.has(cat)) this._byCat.set(cat, []);
        this._byCat.get(cat).push(it);
      }
      if (!opts.silent) CBLog?.log?.(`${LOG_PREFIX} Items gesetzt (${this._items.length} Karten / ${this._byCat.size} Kategorien)`);
      // Tabs neu bauen + Grid rendern
      buildTabs.call(this);
      this.render();
    },

    render: debounce(function () {
      if (!this.ready) return;
      const activeCat = getActiveCat(this._byCat);
      const list = this._byCat.get(activeCat) || [];

      // Tabs (aktiv markieren)
      $$("#ui-build-tabs button", this._container).forEach(b=>{
        b.classList.toggle("active", b.dataset.cat === activeCat);
        if (b.classList.contains("active")) {
          b.style.background = "#0b6aa4";
        } else {
          b.style.background = "#2b3b4a";
        }
      });

      // Grid
      this._gridRoot.innerHTML = "";
      if (!list.length) {
        $("#ui-build-empty", this._container).style.display = "block";
        return;
      }
      $("#ui-build-empty", this._container).style.display = "none";

      for (const it of list) {
        const title = it.title || it.name || it.id || "Item";
        const icon = pickIcon(it);
        const card = document.createElement("button");
        card.type = "button";
        Object.assign(card.style, {
          display:"flex",
          flexDirection:"column",
          alignItems:"center",
          gap:"8px",
          padding:"10px",
          borderRadius:"14px",
          background:"#1e2732",
          border:"1px solid rgba(255,255,255,.07)",
          cursor:"pointer"
        });
        card.innerHTML = `
          <div style="width:100%;aspect-ratio:1/1;border-radius:10px;background:#11181f;display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <img alt="" src="${icon}" style="max-width:100%;max-height:100%;display:block" onerror="this.src='${PLACEHOLDER_ICON}'">
          </div>
          <div style="font-size:14px;color:#cfe7ff">${escapeHtml(title)}</div>
        `;
        // Optional: Event zum Bauen dispatchen
        card.addEventListener("click", () => {
          const ev = new CustomEvent("cb:build:select", {detail: {id: it.id, item: it}});
          window.dispatchEvent(ev);
          CBLog?.log?.(`${LOG_PREFIX} select ${it.id}`);
        });
        this._gridRoot.appendChild(card);
      }
    }, 10)
  };

  function escapeHtml(s=""){return s.replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));}
  function normalizeCategory(c){
    if(!c) return "misc";
    const s = String(c).toLowerCase();
    if (s.includes("verwaltung")) return "Allg. / Verwaltung";
    if (s.includes("nahrung") || s.includes("produktion / nahrung")) return "Produktion / Nahrung";
    if (s.includes("rohstoff") || s.includes("produktion / rohstoffe")) return "Produktion / Rohstoffe";
    if (s.includes("wohnen")) return "Wohnen";
    return c;
  }
  function pickIcon(it){
    if (it.icon && typeof it.icon === "string") return it.icon;
    if (it.image && typeof it.image === "string") return it.image;
    const id = (it.id || "").toLowerCase();
    if (FALLBACK_ICON_BY_ID[id]) return FALLBACK_ICON_BY_ID[id];
    // Versuch, etwas Sinnvolles zu raten
    if (id) {
      // häufiges Muster: <id>_wood.png
      return `assets/buildings/${id}_wood.png`;
    }
    return PLACEHOLDER_ICON;
  }
  function buildTabs(){
    const tabsHost = $("#ui-build-tabs", this._container);
    tabsHost.innerHTML = "";
    const cats = Array.from(this._byCat.keys());
    // definierte Reihenfolge bevorzugen
    const ordered = CATEGORY_ORDER.filter(c=>cats.includes(c))
      .concat(cats.filter(c=>!CATEGORY_ORDER.includes(c)));
    ordered.forEach(cat=>{
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.cat = cat;
      Object.assign(b.style, {
        border:"none",borderRadius:"14px",padding:"6px 10px",
        background:"#2b3b4a",color:"#cfe7ff",cursor:"pointer"
      });
      b.textContent = cat;
      b.addEventListener("click", ()=> {
        localStorage.setItem("ui-build-active-cat", cat);
        this.render();
      });
      tabsHost.appendChild(b);
    });
    if (!localStorage.getItem("ui-build-active-cat") && ordered.length){
      localStorage.setItem("ui-build-active-cat", ordered[0]);
    }
  }
  function getActiveCat(map){
    const saved = localStorage.getItem("ui-build-active-cat");
    if (saved && map.has(saved)) return saved;
    const first = Array.from(map.keys())[0] || "misc";
    return first;
  }

  // --------- Bootstrap / Event-Wiring --------------------------------------
  // Stelle die API **sofort** bereit (verhindert „setItems nicht verfügbar“)
  window.UIBuild = UIBuild;

  // Init, sobald DOM da ist
  if (document.readyState === "loading") {
    on(document, "DOMContentLoaded", ()=> UIBuild.init());
  } else {
    UIBuild.init();
  }

  // auf Events hören – idempotent
  on(window, "cb:assets-ready", ()=> {
    CBLog?.log?.(`${LOG_PREFIX} Event 'cb:assets-ready' → re-render`);
    UIBuild.render();
  });
  on(window, "cb:registry:ready", ()=> {
    // Falls das Bridge-Skript später kommt, ist das hier trotzdem safe
    CBLog?.log?.(`${BRIDGE_PREFIX} cb:registry:ready`);
    UIBuild.render();
  });
  on(window, "cb:game-start", ()=> {
    CBLog?.log?.(`${LOG_PREFIX} Event 'cb:game-start' → re-render`);
    UIBuild.render();
  });
})();
</script>
