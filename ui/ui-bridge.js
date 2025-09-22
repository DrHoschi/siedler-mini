(() => {
  const TAG = "[ui-bridge]";
  const VERSION = "v18.1.0";

  console.log(TAG, "bereit", `(${VERSION})`);

  // Buttons (Topbar)
  const bindButtons = () => {
    const btnBuild = document.getElementById("btn-build");
    const btnInspector = document.getElementById("btn-inspector");

    if (btnBuild) {
      btnBuild.addEventListener("click", () => {
        if (!window.UIBuild) {
          console.warn(TAG, "UIBuild noch nicht bereit.");
          return;
        }
        window.UIBuild.toggle();
      });
    }

    if (btnInspector && window.Inspector && typeof window.Inspector.toggle === "function") {
      btnInspector.addEventListener("click", () => {
        try {
          window.Inspector.toggle(); // deine API-Compat übernimmt DOM open/close
        } catch (e) {
          console.warn(TAG, "Inspector toggle fehlgeschlagen", e);
        }
      });
    }
  };

  // Items einspeisen → bevorzugt Registry/BuildAssets; alternativ Fallback vom Data-Adapter
  async function feedItemsOnce() {
    const give = (items, cats) => {
      if (!window.UIBuild || typeof window.UIBuild.setItems !== "function") {
        console.warn("[ui-build.bridge] UIBuild.setItems nicht verfügbar – warte auf Init");
        return false;
      }
      window.UIBuild.setItems(items, cats);
      console.log("[ui-build.bridge] Items gesetzt", `(${items.length} / ${cats?.length ?? "?"})`);
      return true;
    };

    // 1) Versuch: aus globalen BuildAssets/Registry (dein Core)
    try {
      const byCore = readFromCore();
      if (byCore && byCore.items?.length) {
        if (give(byCore.items, byCore.cats)) return;
      }
    } catch (e) {
      console.warn(TAG, "Core-Daten nicht nutzbar", e);
    }

    // 2) Fallback: über Data-Bridge (lief bei dir schon)
    try {
      if (window.UIBuildData && typeof window.UIBuildData.getItems === "function") {
        const { items, cats } = await window.UIBuildData.getItems();
        give(items, cats);
      } else {
        console.warn("[ui-build.bridge] Kein Data-Adapter gefunden.");
      }
    } catch (e) {
      console.warn("[ui-build.bridge] Konnte keine Items beziehen", e);
    }
  }

  function readFromCore() {
    // Erwartete Strukturen aus deinem Core:
    //  - window.BuildAssets?.items  (array)
    //  - window.BuildCategories?.list (array)
    const items = (window.BuildAssets && Array.isArray(window.BuildAssets.items))
      ? window.BuildAssets.items.map(n => normalizeItem(n))
      : [];
    const cats  = (window.BuildCategories && Array.isArray(window.BuildCategories.list))
      ? window.BuildCategories.list.map(c => normalizeCat(c))
      : [];
    if (items.length) {
      console.log("[ui-build.bridge] Items gesetzt (via Registry)", `(${items.length} / ${cats.length || "?"})`);
    }
    return { items, cats };
  }

  function normalizeItem(n) {
    // akzeptiere verschiedene Felder; mappe auf {id,title,categoryId,icon}
    return {
      id: n.id || n.key || n.name,
      title: n.title || n.label || n.name || n.id,
      categoryId: n.categoryId || n.category || n.cat,
      icon: n.icon || n.img || n.sprite || n.preview || null,
    };
  }

  function normalizeCat(c) {
    return {
      id: c.id || c.key || c.name,
      title: c.title || c.label || c.name || c.id
    };
  }

  // Warte sauber bis UIBuild wirklich existiert, dann initialisieren + Daten einspeisen
  const start = () => {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (window.UIBuild && typeof window.UIBuild.init === "function") {
        clearInterval(t);
        window.UIBuild.init();
        bindButtons();
        feedItemsOnce();
        console.log("[index] UIBuild OK –", window.UIBuild.version || "");
      } else if (tries > 120) {  // ~12s Sicherheit
        clearInterval(t);
        console.warn(TAG, "UIBuild nicht erreichbar – Abbruch.");
      }
    }, 100);
  };

  // Start sobald DOM da ist
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
