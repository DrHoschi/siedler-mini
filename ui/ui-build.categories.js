<script>
/* ============================================================================
   Datei: ui/build.categories.js
   Projekt: Neue Siedler
   Version: v1.0.0 (2025-10-01)
   Zweck: Kategorieliste für das Baumenü (UI-Build)
============================================================================ */
window.BUILD_CATEGORIES = [
  { id: "all",      label: "Alles",        icon: "assets/ui/build/ic_all.png" },
  { id: "admin",    label: "Verwaltung",   icon: "assets/ui/build/ic_admin.png" },
  { id: "resource", label: "Rohstoffe",    icon: "assets/ui/build/ic_resource.png" },
  { id: "food",     label: "Nahrung",      icon: "assets/ui/build/ic_food.png" },
  { id: "housing",  label: "Hütten",       icon: "assets/ui/build/ic_housing.png" },
  { id: "logistics",label: "Straßen/Lager",icon: "assets/ui/build/ic_logistics.png" },
  { id: "military", label: "Verteidigung", icon: "assets/ui/build/ic_military.png" },
  { id: "decor",    label: "Dekoration",   icon: "assets/ui/build/ic_decor.png" },
  { id: "roads",    label: "Wege/Straßen", icon: "assets/ui/build/ic_roads.png" }
];
// Optional: Event feuern, wenn Datei geladen
window.dispatchEvent(new CustomEvent('cb:build:categories:ready',{detail:{count:window.BUILD_CATEGORIES.length}}));
</script>
