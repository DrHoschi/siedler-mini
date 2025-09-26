/* ============================================================================
 * Datei: core/registry.js
 * Version: v18.9.4 (2025-09-26)
 * Zweck: Zentrale Sammlung/Lookups (Gebäude, Einheiten, Ressourcen, Meta)
 * Leitplanken:
 *   - Events: cb:registry:ready (genau 1x nach Init)
 *   - Cross-Checks: fehlende Sprites nur WARN (kein Crash)
 *   - Öffentliche API: init/initFromData, register, get, list, has, meta, validate, snapshot
 * Struktur:
 *   (0) Logger-Guard
 *   (1) State & Konstanten
 *   (2) Helper (Fetch/Normalize/Index)
 *   (3) Registry-API
 *   (4) Exports
 * ========================================================================== */

/* (0) Logger-Guard ----------------------------------------------------------- */
if (!window.CBLog || typeof window.CBLog.ok !== "function") {
  window.CBLog = { ok:console.log, info:console.log, warn:console.warn, error:console.error };
  CBLog.info("[registry] Hinweis: globaler CBLog nicht gefunden – Fallback aktiv");
}

/* (1) State & Konstanten ----------------------------------------------------- */
const REG_MOD = "[registry]";
const REG_VER = "v18.9.4";

const STATE = {
  types: Object.create(null),      // building/unit/resource → map[id] = obj
  meta:  { enums:{}, constraints:{} }
};

/* (2) Helper (Fetch/Normalize/Index) ---------------------------------------- */
async function loadJSON(path, def=null){
  try{
    const res = await fetch(path, { cache:"no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  }catch(err){
    (CBLog.warn||console.warn)(`${REG_MOD} JSON-Load fehlgeschlagen: ${path} → ${err?.message || err}`);
    return def;
  }
}

function indexById(arr, key="id"){
  const map = Object.create(null);
  for (const it of (arr||[])) {
    const k = it?.[key];
    if (!k){ (CBLog.warn||console.warn)(`${REG_MOD} Eintrag ohne id ignoriert`); continue; }
    if (map[k]) throw new Error(`Duplicate registry id: ${k}`);
    map[k] = it;
  }
  return map;
}

function normalizeBuilding(raw){
  if (!raw) return null;
  const id   = raw.id || raw.key || raw.slug;
  if (!id) return null;
  const name = raw.name || raw.title || id;
  const cat  = raw.category || raw.cat || "misc";
  const desc = raw.desc || raw.description || "";
  const icon = raw.icon || raw.sprite || raw.img || "assets/icons/placeholder.png";
  if (!raw.icon && !raw.sprite && !raw.img){
    (CBLog.warn||console.warn)(`${REG_MOD} fehlendes Sprite bei b.${id}: nutze placeholder`);
  }
  return { id, name, category:cat, desc, icon };
}

function normalizeUnit(raw){
  if (!raw) return null;
  const id   = raw.id || raw.key || raw.slug;
  if (!id) return null;
  const name = raw.name || raw.title || id;
  const role = raw.role || "basis";
  const icon = raw.icon || raw.sprite || raw.img || "assets/icons/placeholder.png";
  return { id, name, role, icon };
}

function normalizeResourceEntry([id, v]){
  if (!id || !v) return null;
  const name = v.name || id;
  const icon = v.icon || "assets/icons/placeholder.png";
  return [id, { id, name, icon }];
}

/* (3) Registry-API ----------------------------------------------------------- */
const Registry = {
  /** API: einmalige Initialisierung aus data/*.json (+ optionale Cross-Checks) */
  async initFromData(opts={}){
    const spriteExists = opts.spriteExists || window.Assets?.spriteExists;

    (CBLog.info||console.log)(`${REG_MOD} Init beginnt (${REG_VER})`);

    // 3.1 Daten laden (robust)
    const buildingsJSON = await loadJSON("data/buildings.json", null);
    const unitsJSON     = await loadJSON("data/units.json", null);
    const resourcesJSON = await loadJSON("data/resources.json", {}); // darf fehlen

    // 3.2 Normalisieren + Indizieren
    const buildings = Array.isArray(buildingsJSON) ? buildingsJSON.map(normalizeBuilding).filter(Boolean)
                    : [
                        // Minimal-Set, falls keine Datei vorhanden
                        { id:"lumberjack", name:"Holzfäller", icon:"assets/icons/placeholder.png", category:"wirtschaft" },
                        { id:"fisher",     name:"Fischer",    icon:"assets/icons/placeholder.png", category:"wirtschaft" },
                        { id:"quarry",     name:"Steinbruch", icon:"assets/icons/placeholder.png", category:"wirtschaft" }
                      ].map(normalizeBuilding);

    const units     = Array.isArray(unitsJSON) ? unitsJSON.map(normalizeUnit).filter(Boolean) : [];
    const resPairs  = Object.entries(resourcesJSON||{}).map(normalizeResourceEntry).filter(Boolean);
    const resources = Object.fromEntries(resPairs);

    STATE.types.building = indexById(buildings);
    STATE.types.unit     = indexById(units);
    STATE.types.resource = indexById(Object.values(resources));

    // 3.3 Meta/Enums/Constraints gemäß Vorgaben (MVP)
    STATE.meta.enums.buildingCategory = ['infra','prod','home','trade','mil','wirtschaft','misc'];
    STATE.meta.enums.unitRole         = ['basis','prod','trade','mil','admin','science','industry','culture'];
    STATE.meta.constraints.epoche     = [1,10];

    // 3.4 Cross-Checks (nur warnen)
    if (spriteExists){
      for (const b of Object.values(STATE.types.building)){
        if (b.icon && (await spriteExists(b.icon)) === false){
          (CBLog.warn||console.warn)(`${REG_MOD} fehlendes Sprite bei ${b.id}: ${b.icon}`);
        }
      }
    }

    // 3.5 Event + Log
    try {
      window.dispatchEvent(new CustomEvent("cb:registry:ready", {
        detail: {
          ok: true,
          counts: {
            buildings: Object.keys(STATE.types.building).length,
            units:     Object.keys(STATE.types.unit).length,
            resources: Object.keys(STATE.types.resource).length
          }
        }
      }));
    } catch(_){}
    (CBLog.ok||console.log)(`${REG_MOD} ready (b:${Object.keys(STATE.types.building).length} u:${Object.keys(STATE.types.unit).length} r:${Object.keys(STATE.types.resource).length})`);
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

  /** Grundvalidierung: Pflichtfeld id */
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

/* (4) Exports ---------------------------------------------------------------- */
window.Registry = Registry;
