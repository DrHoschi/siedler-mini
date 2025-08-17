// core/assets.js
// Zentrale Asset-Quelle (eine Datei für alles).
// Exports:
//   - version
//   - ASSETS                     (Manifest mit Pfaden)
//   - getAsset(path)             -> String|Object
//   - listImages()               -> String[]
//   - listAudio()                -> String[]
//   - preloadImages({onProgress})-> Promise<{loaded,total}>
//   - preloadAudio({onProgress}) -> Promise<{loaded,total}>

export const version = "2025-08-17.2";

// ---------------------------------------------------------------------------
// Manifest – passe nur die Strings an deine Ordner/Dateinamen an.
// Empfohlene Ordner: img/buildings, img/terrain, img/ui, sfx, music
// ---------------------------------------------------------------------------
export const ASSETS = {
  // --- Gebäude-Icons / Menügrafiken ---
  building: {
    hq:            "img/buildings/hq.png",
    depot:         "img/buildings/depot.png",
    farm:          "img/buildings/farm.png",
    lumberjack:    "img/buildings/lumberjack.png",
    fischer:       "img/buildings/fischer.png",
    haeuser1:      "img/buildings/haeuser1.png",
    haeuser2:      "img/buildings/haeuser2.png",
    stonebraker:   "img/buildings/stonebraker.png",
    wassermuehle:  "img/buildings/wassermuehle.png",
    windmuehle:    "img/buildings/windmuehle.png",
    baeckerei:     "img/buildings/baeckerei.png",
  },

  // Optional: große Spielfeld‑Sprites getrennt von Menü‑Icons
  buildingSprites: {
    hq:            "img/buildings/sprites/hq_sprite.png",
    depot:         "img/buildings/sprites/depot_sprite.png",
    farm:          "img/buildings/sprites/farm_sprite.png",
    lumberjack:    "img/buildings/sprites/lumberjack_sprite.png",
    fischer:       "img/buildings/sprites/fischer_sprite.png",
    haeuser1:      "img/buildings/sprites/haeuser1_sprite.png",
    haeuser2:      "img/buildings/sprites/haeuser2_sprite.png",
    stonebraker:   "img/buildings/sprites/stonebraker_sprite.png",
    wassermuehle:  "img/buildings/sprites/wassermuehle_sprite.png",
    windmuehle:    "img/buildings/sprites/windmuehle_sprite.png",
    baeckerei:     "img/buildings/sprites/baeckerei_sprite.png",
  },

  // --- Terrain / Landscape (nahtlose Top‑Down‑Texturen) ---
  terrain: {
    grass:                      "img/terrain/grass.png",
    dirt:                       "img/terrain/dirt.png",
    rockyGround:                "img/terrain/rocky_ground.png",
    stone:                      "img/terrain/stone.png",
    mountainTerrain:            "img/terrain/mountain_terrain.png",
    snowyGround:                "img/terrain/snowy_ground.png",
    desertSand:                 "img/terrain/desert_sand.png",
    shoreline:                  "img/terrain/shoreline.png", // Übergang Sand↔Wasser
    meadow:                     "img/terrain/meadow.png",
    coniferForestGround:        "img/terrain/conifer_forest_ground.png",
    deciduousForestGround:      "img/terrain/deciduous_forest_ground.png",

    // Erweiterte / exotische Biome
    volcanicAshPlain:           "img/terrain/volcanic_ash_plain.png",
    volcanicLavaField:          "img/terrain/volcanic_lava_field.png",
    floodedAgriculture:         "img/terrain/flooded_agriculture.png",
    coastalMangroveSwamp:       "img/terrain/coastal_mangrove_swamp.png",
  },

  // --- UI‑Assets ---
  ui: {
    cursor:               "img/ui/cursor.png",
    selectRing:           "img/ui/select_ring.png",
    buildMarker:          "img/ui/build_marker.png",
    toolBuild:            "img/ui/tool_build.png",
    toolInspect:          "img/ui/tool_inspect.png",
    toolErase:            "img/ui/tool_erase.png",
  },

  // --- Audio (optional) ---
  sfx: {
    click:                "sfx/click.mp3",
    buildStart:           "sfx/build_start.mp3",
    buildPlace:           "sfx/build_place.mp3",
    error:                "sfx/error.mp3",
  },
  music: {
    mainTheme:            "music/main_theme.mp3",
  },
};

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/**
 * Liest eine verschachtelte Ressource aus dem Manifest.
 * @param {string|string[]} path z.B. "building.hq" oder ["terrain","grass"]
 */
export function getAsset(path) {
  const parts = Array.isArray(path) ? path : String(path).split(".");
  let node = ASSETS;
  for (const p of parts) {
    if (!node || typeof node !== "object") return undefined;
    node = node[p];
  }
  return node;
}

/** intern: sammelt URLs nach Endungen */
function collectByExt(root, exts) {
  const urls = [];
  (function walk(n) {
    if (!n) return;
    if (typeof n === "string") {
      const low = n.toLowerCase();
      if (exts.some((e) => low.endsWith(e))) urls.push(n);
      return;
    }
    if (Array.isArray(n)) { for (const v of n) walk(v); return; }
    if (typeof n === "object") { for (const k in n) walk(n[k]); }
  })(root);
  return urls;
}

export function listImages() {
  return collectByExt(ASSETS, [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
}

export function listAudio() {
  return collectByExt(ASSETS, [".mp3", ".ogg", ".wav", ".m4a"]);
}

/**
 * Lädt alle Bild‑Assets vor. Fehler blockieren nicht; Fortschritt wird gemeldet.
 * @param {{onProgress?:(loaded:number,total:number,url:string,info?:{error:true})=>void}} opts
 */
export function preloadImages(opts = {}) {
  const urls = listImages();
  const total = urls.length;
  if (total === 0) return Promise.resolve({ loaded: 0, total: 0 });

  let loaded = 0;
  const { onProgress } = opts;

  const tasks = urls.map(
    (url) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          loaded++;
          if (onProgress) { try { onProgress(loaded, total, url); } catch {} }
          resolve();
        };
        img.onerror = () => {
          loaded++;
          if (onProgress) { try { onProgress(loaded, total, url, { error: true }); } catch {} }
          resolve();
        };
        img.src = url;
      })
  );

  return Promise.all(tasks).then(() => ({ loaded, total }));
}

/**
 * Lädt Audio‑Metadaten vor (kein Autoplay, iOS‑tauglich).
 * @param {{onProgress?:(loaded:number,total:number,url:string)=>void}} opts
 */
export function preloadAudio(opts = {}) {
  const urls = listAudio();
  const total = urls.length;
  if (total === 0) return Promise.resolve({ loaded: 0, total: 0 });

  let loaded = 0;
  const { onProgress } = opts;

  const tasks = urls.map(
    (url) =>
      new Promise((resolve) => {
        const a = new Audio();
        const done = () => {
          loaded++;
          if (onProgress) { try { onProgress(loaded, total, url); } catch {} }
          cleanup(); resolve();
        };
        const cleanup = () => {
          a.removeEventListener("canplaythrough", done);
          a.removeEventListener("error", done);
        };
        a.addEventListener("canplaythrough", done, { once: true });
        a.addEventListener("error", done, { once: true });
        a.preload = "auto";
        a.src = url;
        a.load?.();
      })
  );

  return Promise.all(tasks).then(() => ({ loaded, total }));
}

// ---------------------------------------------------------------------------
// Hinweise zur Nutzung
// ---------------------------------------------------------------------------
// In UI/Build-Menü:
//   btn.style.backgroundImage = `url(${ASSETS.building.hq})`;
// Preloading (z.B. im boot/start):
//   await preloadImages({ onProgress:(n,total)=>updateLoader(n/total) });
//   await preloadAudio();
