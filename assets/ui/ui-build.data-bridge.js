(() => {
  const TAG = "[ui-build.bridge]";
  const VERSION = "v1.0.0";

  // einfacher Fallback-Satz auf Basis deiner Dateien/Liste
  const DEFAULT_ITEMS = [
    { id:"rathaus",   title:"Rathaus",    categoryId:"infrastruktur", icon:"assets/buildings/rathaus_wood1.png" },
    { id:"hq",        title:"HQ",         categoryId:"infrastruktur", icon:"assets/buildings/hq_wood.png" },
    { id:"depot",     title:"Depot",      categoryId:"infrastruktur", icon:"assets/buildings/depot_wood.png" },
    { id:"wohnhaus0", title:"Wohnhaus 0", categoryId:"wohnen",        icon:"assets/buildings/wohnhaus_wood0_ug0.png" },
    { id:"wohnhaus1", title:"Wohnhaus 1", categoryId:"wohnen",        icon:"assets/buildings/wohnhaus_wood1_ug0.png" },
    { id:"baecker",   title:"Bäcker",     categoryId:"produktion",    icon:"assets/buildings/baecker_wood.png" },
    { id:"farm",      title:"Farm",       categoryId:"produktion",    icon:"assets/buildings/farm_wood.png" },
    { id:"fischer",   title:"Fischer",    categoryId:"produktion",    icon:"assets/buildings/fischer_wood1.png" },
    { id:"lumberjack",title:"Holzfäller", categoryId:"produktion",    icon:"assets/buildings/lumberjack_wood.png" },
    { id:"schmied0",  title:"Schmied",    categoryId:"produktion",    icon:"assets/buildings/schmied_wood0.png" },
    { id:"steinmetz", title:"Steinmetz",  categoryId:"produktion",    icon:"assets/buildings/steinmetz_wood.png" },
    { id:"wachturm",  title:"Wachturm",   categoryId:"miliz",         icon:"assets/buildings/wachturm_wood.png" }
  ];

  const DEFAULT_CATS = [
    { id:"infrastruktur", title:"Infrastruktur" },
    { id:"produktion",    title:"Produktion" },
    { id:"wohnen",        title:"Wohnen" },
    { id:"miliz",         title:"Miliz" },
    { id:"sonstiges",     title:"Sonstiges" }
  ];

  async function getItems() {
    // Wenn dein Core was bereitstellt, nimmt die Bridge das sowieso zuerst.
    console.log("[ui-build.bridge] Fallback JSON erkannt", `(cats:${DEFAULT_CATS.length} / items:${DEFAULT_ITEMS.length})`);
    return { items: DEFAULT_ITEMS, cats: DEFAULT_CATS };
  }

  window.UIBuildData = { getItems, version: VERSION };
})();
