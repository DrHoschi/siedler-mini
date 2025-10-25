/* ============================================================================
 * Datei   : core/asset.js
 * Projekt : Neue Siedler
 * Version : v25.10.25-final
 * Zweck   : Produktiver Asset-Lader (leichtgewichtig) – Bilder & JSON,
 *           Events 'cb:assets-ready' + Alias 'cb:assets:ready', API für Zugriff.
 *
 * Stand   : Lädt Pflicht-JSON (buildings/units/balance/campaign) und Kern-Assets
 *           für Figuren-Atlas. Fehler sind nicht-blockierend (Warn-Logs).
 *
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * Regeln  : (1) Datei bleibt SINGULAR 'asset.js' (Projektstandard).
 *           (2) Debug/Inspector NIE entfernen (CBLog + Events).
 *           (3) Startfenster zuerst sichtbar; dieses Modul liefert nur Ready-Signale.
 * ============================================================================ */

/* ============================================================================
 * [Imports / Fallback-Logger]
 * ============================================================================ */
window.CBLog = window.CBLog || {
  ok:   (...a)=>console.log('✅', ...a),
  info: (...a)=>console.log('ℹ️', ...a),
  warn: (...a)=>console.warn('⚠️', ...a),
  error:(...a)=>console.error('❌', ...a),
};

/* ============================================================================
 * [Konstanten & Meta]
 * ============================================================================ */
const ASSETS_VERSION = "v25.10.25-final";        // für Cache-Busting/Logs
const LOG_PREFIX     = "[assets]";
const EVT = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

// — Pflicht-JSON (Lastenheft Kap. 6) —
const JSON_REQUIRED = [
  { key:"buildings", path:"data/buildings.json" },
  { key:"units",     path:"data/units.json"     },
  { key:"balance",   path:"data/balance.json"   },
  { key:"campaign",  path:"data/campaign.json"  },
];

// — Optionale JSONs (hier Platz für spätere Erweiterungen: maps, save-snapshots etc.) —
const JSON_OPTIONAL = [
  // { key:"map_default", path:"data/maps/map_ch1.json" },
];

// — Kern-Grafiken, die wir sicher haben (Characters-Atlas) —
const IMG_REQUIRED = [
  { key:"char_atlas_png",   path:"assets/characters/characters_sprite_highend.png" },
  { key:"char_atlas_meta",  path:"assets/characters/characters_sprite_atlas_2048.json", type:"json" },
];

// — Optionale Bilder (UI/CSS lädt vieles eigenständig; Preload hier nur wenn sinnvoll) —
const IMG_OPTIONAL = [
  // Beispiel: { key:"hud_panel_svg", path:"assets/ui/panel.svg" }, // SVG: Browser-CSS lädt selbst
];

/* ============================================================================
 * [Hilfsfunktionen]
 * ============================================================================ */

/** Cache-Busting: hängt ?v= an, um harte Reloads zu erzwingen, ohne Serverconfig. */
function withVersion(url){
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(ASSETS_VERSION)}`;
}

/** JSON laden mit robuster Fehlerbehandlung. */
async function loadJSON(url){
  const u = withVersion(url);
  const res = await fetch(u, { cache:"no-store" });
  if(!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
  return res.json();
}

/** Image laden (PNG/WebP). SVG wird meist via CSS genutzt → hier optional. */
function loadImage(url){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.decoding = "async";
    img.loading  = "eager";
    img.onload   = ()=>resolve(img);
    img.onerror  = (e)=>reject(new Error(`Image load fail @ ${url}`));
    img.src = withVersion(url);
  });
}

/** Kleinhelfer: promiseAllSettled + Zählen (ok/fail) */
async function settleAll(tasks){
  const results = await Promise.allSettled(tasks);
  const ok    = results.filter(r=>r.status==="fulfilled");
  const fail  = results.filter(r=>r.status==="rejected")
                       .map((r,i)=>({ index:i, reason:String(r.reason) }));
  return { ok, fail, results };
}

/* ============================================================================
 * [Klassen]
 * ============================================================================ */

class AssetCache {
  #images = new Map();   // key -> HTMLImageElement
  #json   = new Map();   // key -> JSON-Objekt

  setImage(key, img){ this.#images.set(key, img); }
  setJSON(key, obj){  this.#json.set(key,   obj); }

  getImage(key){ return this.#images.get(key) || null; }
  getJSON(key){  return this.#json.get(key)   || null; }

  count(){ return { images:this.#images.size, json:this.#json.size }; }
}

class AssetLoader {
  constructor(cache){
    this.cache = cache;
  }

  /** Lädt alle definierten Assets (required + optional). Fehler ≠ Abbruch. */
  async loadAll(){
    const log  = (...a)=> (window.CBLog?.ok   || console.log)(LOG_PREFIX, ...a);
    const warn = (...a)=> (window.CBLog?.warn || console.warn)(LOG_PREFIX, ...a);
    const err  = (...a)=> (window.CBLog?.error|| console.error)(LOG_PREFIX, ...a);

    log(`Modul geladen (${ASSETS_VERSION}) – Starte Preload …`);

    // 1) JSON (required)
    const jsonReqTasks = JSON_REQUIRED.map(async ({key, path})=>{
      const data = await loadJSON(path);
      this.cache.setJSON(key, data);
      return { key, path, type:"json" };
    });

    const { ok:jsonReqOK, fail:jsonReqFail } = await settleAll(jsonReqTasks);
    jsonReqFail.forEach(f => warn(`JSON (required) fehlgeschlagen: ${f.reason}`));

    // 2) JSON (optional)
    const jsonOptTasks = JSON_OPTIONAL.map(async ({key, path})=>{
      try{
        const data = await loadJSON(path);
        this.cache.setJSON(key, data);
        return { key, path, type:"json" };
      } catch(e){
        warn(`JSON (optional) fehlgeschlagen: ${path} → ${String(e)}`);
        return null;
      }
    });
    await settleAll(jsonOptTasks);

    // 3) Images (required)
    const imgReqTasks = IMG_REQUIRED.map(async ({key, path, type})=>{
      if(type==="json"){
        const data = await loadJSON(path);
        this.cache.setJSON(key, data);
        return { key, path, type:"json" };
      } else {
        const img = await loadImage(path);
        this.cache.setImage(key, img);
        return { key, path, type:"image" };
      }
    });
    const { ok:imgReqOK, fail:imgReqFail } = await settleAll(imgReqTasks);
    imgReqFail.forEach(f => warn(`Bild/Meta (required) fehlgeschlagen: ${f.reason}`));

    // 4) Images (optional)
    const imgOptTasks = IMG_OPTIONAL.map(async ({key, path, type})=>{
      try{
        if(type==="json"){
          const data = await loadJSON(path);
          this.cache.setJSON(key, data);
        } else {
          const img = await loadImage(path);
          this.cache.setImage(key, img);
        }
        return { key, path, type:type||"image" };
      } catch(e){
        warn(`Bild/Meta (optional) fehlgeschlagen: ${path} → ${String(e)}`);
        return null;
      }
    });
    await settleAll(imgOptTasks);

    // Zusammenfassung + Events
    const counts = this.cache.count();
    const detail = {
      ok: jsonReqFail.length===0 && imgReqFail.length===0,
      counts,
      version: ASSETS_VERSION,
      errors: [
        ...jsonReqFail.map(f=>`json.required:${f.reason}`),
        ...imgReqFail.map (f=>`img.required:${f.reason}`),
      ],
    };

    // Beide Varianten feuern (Bindestrich & Doppelpunkt)
    EVT('cb:assets-ready', detail);
    EVT('cb:assets:ready', detail);

    if(detail.ok){
      log(`assets-ready ✓  (json:${counts.json}, img:${counts.images})`);
    } else {
      warn(`assets-ready (teilweise) – fehlende Pflichtdateien: ${detail.errors.length}`);
    }
    return detail;
  }
}

/* ============================================================================
 * [Hauptlogik]
 * ============================================================================ */
const __assetCache  = new AssetCache();
const __assetLoader = new AssetLoader(__assetCache);

// Automatisch starten (Sequenzerwartung im Boot-Flow)
const __readyPromise = (async () => {
  try {
    return await __assetLoader.loadAll();
  } catch(e){
    (window.CBLog?.error||console.error)(LOG_PREFIX, "kritischer Fehler in loadAll:", e);
    const detail = { ok:false, version:ASSETS_VERSION, fatal:String(e) };
    EVT('cb:assets-ready', detail);
    EVT('cb:assets:ready', detail);
    return detail;
  }
})();

/* ============================================================================
 * [Exports / öffentliche API]
 * ============================================================================ */
window.Assets = {
  /** Promise das resolved, sobald das Modul seine Ready-Events gesendet hat. */
  ready: __readyPromise,

  /** Manuelles (Re)Load – z. B. für Hot-Reload im Inspector. */
  loadAll: ()=>__assetLoader.loadAll(),

  /** Zugriff auf gecachte Objekte */
  getImage: (key)=>__assetCache.getImage(key),
  getJSON:  (key)=>__assetCache.getJSON(key),

  /** Meta/Debug */
  version: ASSETS_VERSION,
};
