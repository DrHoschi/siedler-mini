/* ============================================================================
 * Datei: core/asset.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: Asset-Verwaltung (Sprites, Tiles, Sounds).
 * Datum: 2025-09-21
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * Hinweis: Debug/Inspector NIE entfernen. Ereignisse nutzen (cb:*).
 * ============================================================================ */

CBLog.ok("[asset] Assets geladen (Version "+GAME_VERSION+")");
window.dispatchEvent(new CustomEvent("cb:assets-ready"));

// --- CBLog (Fallback) --------------------------------------------------------
window.CBLog = window.CBLog || {
  ok:   (...a)=>console.log('✅', ...a),
  info: (...a)=>console.log('ℹ️', ...a),
  warn: (...a)=>console.warn('⚠️', ...a),
  error:(...a)=>console.error('❌', ...a),
};

const ASSETS_VERSION = "v1.0.0";
const ASSET_LIST = [ /* Pfade hier ergänzen */ ];
function preloadImage(src){return new Promise((res)=>{const i=new Image();i.onload=()=>res(src);i.onerror=()=>res(src);i.src=src;});}
class Asset{static async loadAll(){CBLog.info("[assets] Modul geladen ("+ASSETS_VERSION+") – Lese Liste:",ASSET_LIST.length);const results=[];for(const src of ASSET_LIST){try{await preloadImage(src);CBLog.ok("[assets] geladen:",src);}catch(e){CBLog.warn("[assets] fehlend:",src,e);}results.push(src);}window.dispatchEvent(new CustomEvent('cb:assets-ready',{detail:{count:results.length}}));return results;}}}
window.Asset = Asset;
