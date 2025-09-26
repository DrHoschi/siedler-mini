(() => {
  const TAG = "[ui-build]";
  const VERSION = "v18.3.2";

  // Öffentliche API
  const UIBuild = {
    version: VERSION,
    _initialized: false,
    _isOpen: false,
    _items: [],
    _cats: [],
    init,
    setItems,
    open,
    close,
    toggle,
    isOpen: () => UIBuild._isOpen,
  };

  // Expose asap
  window.UIBuild = UIBuild;

  const PANEL_ID = "build-panel";

  // Minimal-Styles zur Sicherheit (deine ui-build.css darf überschreiben)
  const ensureBaseStyles = () => {
    if (document.getElementById("ui-build-inline-style")) return;
    const st = document.createElement("style");
    st.id = "ui-build-inline-style";
    st.textContent = `
#${PANEL_ID}{
  position:fixed;left:0;right:0;bottom:0;
  background:#20252bF0; /* leicht transparentes dunkles Grau */
  border-top:1px solid #2f363f;
  padding:10px 12px;
  z-index:9999;
  transform:translateY(100%);
  transition:transform .18s ease-out;
}
#${PANEL_ID}.open{ transform:translateY(0); }

#${PANEL_ID} .ui-build-inner{
  max-width:1200px;margin:0 auto;
}

#${PANEL_ID} .cats{
  display:flex;gap:8px;flex-wrap:wrap;margin:0 0 8px 0;
}
#${PANEL_ID} .cat-btn{
  padding:4px 8px;border:1px solid #3a4049;background:#2a2f36;color:#d6d6d6;border-radius:6px;cursor:pointer;font-size:13px;
}
#${PANEL_ID} .cat-btn.active{outline:2px solid #8892a6}

#${PANEL_ID} .grid{
  display:grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap:10px;
}
#${PANEL_ID} .card{
  background:#242a31;border:1px solid #36404b;border-radius:10px;overflow:hidden;
  display:flex;flex-direction:column;align-items:center;
}
#${PANEL_ID} .card .thumb{
  width:100%;aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;
  background:#1c2026;
}
#${PANEL_ID} .card .thumb img{max-width:100%;max-height:100%;display:block}
#${PANEL_ID} .card .title{padding:6px 8px;font-size:13px;color:#dfe5ee;text-align:center}
#${PANEL_ID} .empty{padding:12px;color:#b2bac6}
`;
    document.head.appendChild(st);
  };

  function init() {
    if (UIBuild._initialized) return;
    ensureBaseStyles();

    const host = document.getElementById(PANEL_ID);
    if (!host) {
      console.warn(TAG, "Kein Host-Element #build-panel gefunden – Abbruch.");
      return;
    }

    host.innerHTML = `
      <div class="ui-build-inner">
        <div class="cats" id="ui-build-cats"></div>
        <div class="grid" id="ui-build-grid"></div>
        <div class="empty" id="ui-build-empty" style="display:none">Keine Gebäudedaten verfügbar.</div>
      </div>
    `;

    UIBuild._initialized = true;
    console.log(TAG, "bereit", `(${VERSION})`);

    render(); // falls Items schon vorher gesetzt wurden
  }

  function render(activeCat = null) {
    if (!UIBuild._initialized) return;

    const catsEl = document.getElementById("ui-build-cats");
    const gridEl = document.getElementById("ui-build-grid");
    const emptyEl = document.getElementById("ui-build-empty");

    // Kategorien
    catsEl.innerHTML = "";
    const allBtn = mkCatBtn("Alle", null, activeCat === null);
    catsEl.appendChild(allBtn);
    UIBuild._cats.forEach(c => {
      catsEl.appendChild(mkCatBtn(c.title || c.name || c.id, c.id, activeCat === c.id));
    });

    // Items
    const list = (activeCat === null)
      ? UIBuild._items
      : UIBuild._items.filter(x => (x.categoryId || x.category) === activeCat);

    gridEl.innerHTML = "";
    if (!list || !list.length) {
      gridEl.style.display = "none";
      emptyEl.style.display = "";
    } else {
      gridEl.style.display = "";
      emptyEl.style.display = "none";
      for (const it of list) {
        gridEl.appendChild(mkCard(it));
      }
    }
  }

  function mkCatBtn(label, catId, active) {
    const b = document.createElement("button");
    b.className = "cat-btn" + (active ? " active" : "");
    b.textContent = label;
    b.addEventListener("click", () => render(catId));
    return b;
  }

  function mkCard(it) {
    const el = document.createElement("div");
    el.className = "card";
    el.title = it.title || it.id || "";

    const imgSrc =
      it.icon ||
      it.img ||
      it.sprite ||
      (it.assets && it.assets.icon) ||
      guessBuildingIcon(it);

    el.innerHTML = `
      <div class="thumb">
        ${imgSrc ? `<img loading="lazy" decoding="async" src="${imgSrc}">` : `<div style="opacity:.7">kein Bild</div>`}
      </div>
      <div class="title">${escapeHtml(it.title || it.name || it.id || "—")}</div>
    `;

    el.addEventListener("click", () => {
      // Event für deine Klick-Logik (z.B. Platzieren)
      const ev = new CustomEvent("ui-build:select", { detail: it });
      window.dispatchEvent(ev);
      console.log(TAG, "select", it.id || it.title || "?");
    });
    return el;
  }

  function guessBuildingIcon(it) {
    // sehr konservative Heuristik: wenn id vorhanden, probiere Standardpfad
    // (dein Repo hält die PNGs unter assets/buildings/*.png)
    if (it && it.id) {
      return `assets/buildings/${it.id}_wood1.png`;
    }
    return null;
  }

  function setItems(items = [], cats = []) {
    UIBuild._items = Array.isArray(items) ? items : [];
    UIBuild._cats  = Array.isArray(cats) ? cats : [];
    console.log(TAG, `Items gesetzt (${UIBuild._items.length} Karten / ${UIBuild._cats.length || "?"} Kategorien)`);
    if (!UIBuild._initialized) init();
    render(); // default: alle Kategorien
  }

  function open() {
    if (!UIBuild._initialized) init();
    const host = document.getElementById(PANEL_ID);
    if (!host) return;
    host.classList.add("open");
    UIBuild._isOpen = true;
    console.log(TAG, "open");
  }

  function close() {
    const host = document.getElementById(PANEL_ID);
    if (!host) return;
    host.classList.remove("open");
    UIBuild._isOpen = false;
    console.log(TAG, "close");
  }

  function toggle() {
    if (UIBuild._isOpen) close(); else open();
  }

  // Lebenszyklus-Hooks aus deinem Spiel
  document.addEventListener("cb:assets-ready", () => {
    // nichts Spezielles: Daten kommen über die Bridge
    // wir lassen nur ein sanftes re-render zu
    if (UIBuild._items?.length) render();
  });

  document.addEventListener("cb:game-start", () => {
    // erneut rendern (falls nötig)
    if (UIBuild._items?.length) render();
  });

  // Hilfsfunktionen
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  }
})();
