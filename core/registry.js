/* ============================================================================
 * Datei: core/registry.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: Zentrale Registry für IDs (b.*, u.*, res.*) – Konsolidierung & Lookups.
 * Datum: 2025-09-21
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * Hinweis: Debug/Inspector NIE entfernen. Ereignisse nutzen (cb:*).
 * ============================================================================ */

// --- CBLog (Fallback) --------------------------------------------------------
window.CBLog = window.CBLog || {
  ok:   (...a)=>console.log('✅', ...a),
  info: (...a)=>console.log('ℹ️', ...a),
  warn: (...a)=>console.warn('⚠️', ...a),
  error:(...a)=>console.error('❌', ...a),
};

const REGISTRY_VERSION="v1.0.0";
const _store={building:new Map(),unit:new Map(),resource:new Map(),category:new Map()};
function _mapFor(type){if(type==='building')return _store.building;if(type==='unit')return _store.unit;if(type==='resource')return _store.resource;if(type==='category')return _store.category;throw new Error("Unbekannter Registry-Typ: "+type);}
class Registry{
  static register(type,id,meta){const m=_mapFor(type);if(m.has(id))CBLog.warn("[registry] ID bereits registriert:",type,id);m.set(id,Object.freeze(Object.assign({id},meta)));}
  static get(type,id){return _mapFor(type).get(id)||null;}
  static list(type){return Array.from(_mapFor(type).values());}
  static async initFromData(){
    CBLog.info("[registry] Init aus /data ("+REGISTRY_VERSION+")");
    const files=['data/buildings.json','data/units.json','data/balance.json'];
    const payloads=await Promise.all(files.map(f=>fetch(f).then(r=>r.json())));
    const [buildings,units,balance]=payloads;
    for(const b of buildings) Registry.register('building',b.id,b);
    for(const u of units) Registry.register('unit',u.id,u);
    ['wood','stone','fish'].forEach(r=>Registry.register('resource','res.'+r,{name:r}));
    window.dispatchEvent(new CustomEvent('cb:registry:ready',{ detail:{ b:buildings.length, u:units.length } }));
  }
}
window.Registry = Registry;
