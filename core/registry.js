/* ============================================================================
 * Datei: core/registry.js
 * Version: v18.8.0 (2025-09-25)
 * Zweck: Zentrale Sammlung/Lookups (Gebäude, Einheiten, Ressourcen, Meta)
 * Leitplanken:
 *   - Events: cb:registry:ready (genau 1x nach Init+Validate)
 *   - Cross-Checks: fehlende Sprites nur WARN (kein Crash)
 *   - Öffentliche API: init/initFromData, register, get, list, has, meta, validate, snapshot
 * Struktur:
 *   (0) Logger-Guard
 *   (1) State & Konstanten
 *   (2) Helper (Indexing/Fetch)
 *   (3) Registry-Implementierung
 *   (4) Hauptlogik (Init)
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
  CBLog.info("[registry] Hinweis: globaler CBLog nicht gefunden – Fallback aktiv");
}

/* (1) State & Konstanten ----------------------------------------------------- */
const REG_MOD = "[registry]";
const REG_VER = "v18.8.0";

const STATE = {
  types: Object.create(null),
  meta:  { enums:{}, constraints:{} }
};

/* (2) Helper (Indexing/Fetch) ------------------------------------------------ */
function indexById(arr, key="id"){
  const map = Object.create(null);
  for (const it of (arr||[])) {
    const k = it?.[key];
    if (!k) { CBLog.warn(`${REG_MOD} Eintrag ohne id ignoriert`); continue; }
    if (map[k]) throw new Error(`Duplicate registry id: ${k}`);
    map[k] = it;
  }
  return map;
}

async function loadJSON(path, def=[]){
  try{
    const res = await fetch(path, { cache:"no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  }catch(err){
    CBLog.warn(`${REG_MOD} JSON-Load fehlgeschlagen: ${path} → ${err?.message || err}`);
    return def;
  }
}

/* (3) Registry-Implementierung ---------------------------------------------- */
const Registry = {
  /** API: einmalige Initialisierung aus data/*.json (+ optionale Cross-Checks) */
  async initFromData(opts={}){
    const spriteExists = opts.spriteExists || window.Assets?.spriteExists;

    CBLog.info(`${REG_MOD} Init beginnt (${REG_VER})`);

    // 3.1 Daten laden (robust, leer bei Fehler)
    const buildings  = await loadJSON("data/buildings.json", []);
    const units      = await loadJSON("data/units.json", []);
    const resources  = await loadJSON("data/resources.json", []); // optional

    // 3.2 Indizieren
    STATE.types.building = indexById(buildings);
    STATE.types.unit     = indexById(units);
    STATE.types.resource = indexById(resources);

    // 3.3 Meta/Enums/Constraints gemäß Vorgaben (MVP)
    STATE.meta.enums.buildingCategory = ['infra','prod','home','trade','mil'];
    STATE.meta.enums.unitRole = ['basis','prod','trade','mil','admin','science','industry','culture'];
    STATE.meta.constraints.epoche = [1,10];

    // 3.4 Cross-Checks (nur warnen)
    if (spriteExists){
      for (const b of buildings){
        if (b.sprite && !(await spriteExists(b.sprite))){
          CBLog.warn(`${REG_MOD} fehlendes Sprite bei ${b.id}: ${b.sprite}`);
        }
      }
    }

    // 3.5 Validate + Event
    this.validate();
    window.dispatchEvent(new CustomEvent("cb:registry:ready", {
      detail: {
        ok: true,
        counts: { buildings: buildings.length, units: units.length, resources: resources.length }
      }
    }));
    CBLog.ok(`${REG_MOD} ready (b:${buildings.length} u:${units.length} r:${resources.length})`);
  },

  /** Alias für Kompat: Registry.init() → initFromData() */
  async init(opts={}){ return this.initFromData(opts); },

  /** Ein Objekt registrieren (z. B. Mods/Runtime-Erweiterungen) */
  register(type, id, meta){
    (STATE.types[type] ??= Object.create(null));
    if (STATE.types[type][id]) throw new Error(`Duplicate registry id: ${type}:${id}`);
    STATE.types[type][id] = { id, ...meta };
    return STATE.types[type][id];
  },

  /** Objekt holen (wirft auf Unknown-ID für sauberes Fehlermanagement) */
  get(type, id){
    const entry = STATE.types[type]?.[id];
    if (!entry) throw new Error(`Not found in registry: ${type}:${id}`);
    return entry;
  },

  /** Liste aller Objekte eines Typs; optionaler Filter */
  list(type, predicate=null){
    const all = Object.values(STATE.types[type] ?? {});
    return predicate ? all.filter(predicate) : all;
  },

  /** Existenzcheck */
  has(type, id){ return !!STATE.types[type]?.[id]; },

  /** Meta lesen (Enums/Constraints) */
  meta(type=null){ return type ? STATE.meta[type] : STATE.meta; },

  /** Grundvalidierung: Pflichtfeld id + Eindeutigkeit (indizieren fängt Duplikate ab) */
  validate(){
    for (const [type, map] of Object.entries(STATE.types)){
      for (const [id, obj] of Object.entries(map)){
        if (!obj.id) throw new Error(`Registry validate: missing id in ${type}:${id}`);
      }
    }
    return true;
  },

  /** Tiefes Readonly-Snapshot für Inspector/Export */
  snapshot(){ return JSON.parse(JSON.stringify(STATE)); }
};

/* (4) Hauptlogik (Init) ------------------------------------------------------ */
// Keine Auto-Init hier – Boot orchestriert den Zeitpunkt (nach Assets).

/* (5) Exports ---------------------------------------------------------------- */
window.Registry = Registry;
