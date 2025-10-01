/* ============================================================================
   Datei: ui/build.categories.js
   Projekt: Neue Siedler
   Version: v1.0.1 (2025-10-01)
   Zweck: Aktive Kategorien-Liste für das Baumenü (UIBuild)
   WICHTIG: Dies ist JS, KEIN JSON. Keine hängenden/trailing Kommas.
============================================================================ */

window.BUILD_CATEGORIES = [
  { id:"all",      label:"Alles",         icon:"assets/ui/build/ic_all.png" },
  { id:"admin",    label:"Verwaltung",    icon:"assets/ui/build/ic_admin.png" },
  { id:"resource", label:"Rohstoffe",     icon:"assets/ui/build/ic_resource.png" },
  { id:"food",     label:"Nahrung",       icon:"assets/ui/build/ic_food.png" },
  { id:"housing",  label:"Hütten",        icon:"assets/ui/build/ic_housing.png" },
  { id:"logistics",label:"Straßen/Lager", icon:"assets/ui/build/ic_logistics.png" },
  { id:"military", label:"Verteidigung",  icon:"assets/ui/build/ic_military.png" },
  { id:"decor",    label:"Dekoration",    icon:"assets/ui/build/ic_decor.png" },
  { id:"roads",    label:"Wege/Straßen",  icon:"assets/ui/build/ic_roads.png" }
];

// optionales Signal für die Bridge
window.dispatchEvent(new CustomEvent('cb:build:categories:ready', {detail:{count:window.BUILD_CATEGORIES.length}}));
console.log('[cats] build.categories.js geladen → #', window.BUILD_CATEGORIES.length);
