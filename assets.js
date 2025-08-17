// ==========================================
// assets.js
// Lädt alle Spiel-Assets (Texturen, Bilder, etc.)
// ==========================================

// --- Terrain-Texturen laden ---
const terrainTextures = {
    grass: "assets/tex/terrain/grass.jpeg",
    dirt: "assets/tex/terrain/dirt.jpeg",
    stone: "assets/tex/terrain/stone.jpeg",
    water: "assets/tex/terrain/water.jpeg",
    path0: "assets/tex/terrain/path0.jpeg",
    path1: "assets/tex/terrain/path1.jpeg",
    path2: "assets/tex/terrain/path2.jpeg"
};

// --- Gebäude-Texturen laden ---
const buildingTextures = {
    hq: "assets/tex/hq_wood.png",          // Hauptquartier
    depot: "assets/tex/depot.png",         // Depot
    lumberjack: "assets/tex/lumberjack.png", // Holzfäller
    farm: "assets/tex/farm.png",           // Farm
    mine: "assets/tex/mine.png"            // Schmiede/Mine
};

// --- Sonstige Texturen ---
const uiTextures = {
    buildIcon: "assets/tex/ui/build.png",  // Baumenü-Button
    cancelIcon: "assets/tex/ui/cancel.png",
    confirmIcon: "assets/tex/ui/confirm.png"
};

// ==========================================
// Export (damit andere Skripte Zugriff haben)
// ==========================================
export { terrainTextures, buildingTextures, uiTextures };
