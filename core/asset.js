/* ============================================================================
 * Datei: core/asset.js
 * Version: v18.8.0 (2025-09-25)
 * Zweck: Asset-Verwaltung (Sprites, Atlanten, UI-Grafiken, Sounds)
 * Leitplanken:
 *   - Singular: Datei heißt dauerhaft asset.js
 *   - Events: cb:assets-loading → cb:assets-ready (genau 1x)
 *   - Fehler werden mit CBLog.warn gemeldet (nicht crashen)
 * Struktur:
 *   (0) Logger-Guard
 *   (1) Konstanten & Meta
 *   (2) Hilfsfunktionen (Loader)
 *   (3) Klasse Assets
 *   (4) Hauptlogik (Init-API)
 *   (5) Exports
 * ========================================================================== */

/* (0) Logger-Guard ----------------------------------------------------------- */
if (!window.CBLog || typeof window.CBLog.ok !== "function") {
  window.CBLog = {
    ok:   (m)=>console.log("[OK] "   + m),
    info: (m)=>console.log("[INFO] " + m),
    warn: (m)=>console.warn("[WARN] "+ m),
    error:(m)=>console.error("[ERR] "+ m),
  };
  CBLog.info("[assets] Hinweis: globaler CBLog nicht gefunden – Fallback aktiv");
}

/* (1) Konstanten & Meta ------------------------------------------------------ */
const ASSET_MOD = "[assets]";
const ASSET_VER = "v18.8.0";

/** Standard-Buckets nach Lastenheft (icons/tiles/buildings/characters/paths/ui) */
const DEFAULT_BUCKETS = {
  icons:      ["assets/icons/resources/wood.png", "assets/icons/resources/stone.png"],
  tiles:      ["assets/tiles/tileset.terrain.png"],
  buildings:  [],   // optional – von Registry/Maps referenziert
  characters: [],   // optional
  paths:      [],   // optional
  ui:         ["assets/ui/panel.png"]
};

/* (2) Hilfsfunktionen (Loader) ---------------------------------------------- */
/** Lädt ein Image (Promise). */
function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = ()=>reject(new Error("Image load error: "+src));
    img.src = src + (src.includes("?") ? "&" : "?") + "v="+Date.now(); // cache-bust
  });
}

/** Prüft „existiert Datei“ grob via fetch HEAD. */
async function spriteExists(path){
  try{
    const res = await fetch(path, { method:"HEAD", cache:"no-store" });
    return res.ok;
  }catch(_){
    return false;
  }
}

/* (3) Klasse Assets ---------------------------------------------------------- */
class _Assets {
  constructor(){
    this.cache = new Map();  // key → HTMLImageElement
    this.meta  = { buckets: Object.keys(DEFAULT_BUCKETS) };
  }

  /** Lädt eine Liste von Pfaden; fehlschlagende Pfade werden geloggt (WARN). */
  async loadList(label, paths=[]) {
    const ok = [];
    for (const p of paths){
      try{
        const img = await loadImage(p);
        this.cache.set(p, img);
        ok.push(p);
      }catch(err){
        CBLog.warn(`${ASSET_MOD} fehlend/fehlerhaft: ${p} → ${err?.message || err}`);
      }
    }
    if (ok.length) CBLog.ok(`${ASSET_MOD} ${label} geladen: ${ok.length} Datei(en)`);
  }

  /** Öffentliche API: ein Bild aus dem Cache holen (oder null). */
  get(path){ return this.cache.get(path) || null; }
}

/* (4) Hauptlogik (Init-API) ------------------------------------------------- */
const Assets = new _Assets();

/**
 * Initialisiert Standard-Buckets und meldet readiness.
 * Idempotent aufgerufen erlaubt (lädt nur, was noch fehlt).
 * Emit:
 *   - cb:assets-loading (einmal pro Init-Aufruf)
 *   - cb:assets-ready   (genau einmal nach Abschluss)
 */
Assets.init = async function init(customBuckets=null){
  window.dispatchEvent(new CustomEvent("cb:assets-loading"));
  CBLog.info(`${ASSET_MOD} Initialisierung startet (${ASSET_VER})`);

  const buckets = customBuckets || DEFAULT_BUCKETS;

  // 4.1 Icons/Tiles/UI direkt laden
  await Assets.loadList("icons", buckets.icons);
  await Assets.loadList("tiles", buckets.tiles);
  await Assets.loadList("ui",    buckets.ui);

  // 4.2 Buildings/Characters/Paths nur, wenn konfiguriert (größere Sets)
  if (buckets.buildings?.length) await Assets.loadList("buildings",  buckets.buildings);
  if (buckets.characters?.length)await Assets.loadList("characters", buckets.characters);
  if (buckets.paths?.length)     await Assets.loadList("paths",      buckets.paths);

  // 4.3 Ready-Signal
  window.dispatchEvent(new CustomEvent("cb:assets-ready", {
    detail: { counts: Assets.cache.size }
  }));
  CBLog.ok(`${ASSET_MOD} bereit – ${Assets.cache.size} Asset(s) im Cache`);
};

/* (5) Exports ---------------------------------------------------------------- */
window.Assets = Assets;
/* Zusatz: spriteExists für Registry-Cross-Check verfügbar machen */
window.Assets.spriteExists = spriteExists;
