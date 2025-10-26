/* ============================================================================
 * Datei    : core/map-runtime.bridge.js
 * Projekt  : Neue Siedler (Epoche 1 – Basis)
 * Version  : v25.10.25-final
 * Zweck    : Bridge zwischen Start/Boot, Map-JSON und Game
 *
 * Verantwortlichkeiten:
 *  - Map-Quelle finden (data-Attribut oder Start-Event)
 *  - Map-JSON laden (defensiv, ohne Cache)
 *  - Minimalvalidierung (size/tiles)
 *  - Game.start(map) auslösen
 *  - Konsistentes Logging + Events
 *
 * Events (listen):
 *  - cb:start:new { map?:string }     → neues Spiel mit Map starten
 *  - cb:boot:ready                    → Fallback: data-map am Canvas prüfen
 *
 * Events (emit):
 *  - cb:map:loaded { id?, map }       → Map erfolgreich geladen/validiert
 *  - cb:map:error  { message }        → Mapfehler (Logging + Event)
 *
 * Hinweise:
 *  - Script-Order: nach core/asset.js und core/game.js laden (Game.* vorhanden)
 *  - UI/Start kann beliebig sein; Kommunikation nur via Events/DOM
 * ============================================================================ */
(function(){
  const MOD  = '[map-bridge]';
  const OK   = (...a)=> (window.CBLog?.ok   || console.log).apply(console, [MOD, ...a]);
  const INFO = (...a)=> (window.CBLog?.info || console.info).apply(console, [MOD, ...a]);
  const WARN = (...a)=> (window.CBLog?.warn || console.warn).apply(console, [MOD, ...a]);
  const ERR  = (...a)=> (window.CBLog?.err  || console.error).apply(console, [MOD, ...a]);

  // -------- Utils ------------------------------------------------------------
  function emit(name, detail={}) {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch(_) {}
    try { document.dispatchEvent(new CustomEvent(name, { detail })); } catch(_) {}
  }

  async function loadJSON(url){
    const bust = (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    const res = await fetch(url + bust, { cache:'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
    return res.json();
  }

  function findMapFromDOM(){
    // bevorzugt: data-map am Canvas (#game), sonst Body
    const el = document.getElementById('game') || document.body;
    const map = el?.getAttribute?.('data-map');
    return map && map.trim() ? map.trim() : null;
  }

  function validateMap(map){
    // Minimalanforderungen (laut Lastenheft Kap. 6.6): size, tiles (Matrix)
    // → hier bewusst leichtgewichtig, CI macht Schema-Validation separat
    //   (siehe Projekt-Doku Kap. 6.8)
    if (!map || typeof map !== 'object') throw new Error('ungültiges Map-Objekt');
    if (!map.size || !Array.isArray(map.size) || map.size.length !== 2)
      throw new Error('map.size fehlt oder ist ungültig');
    if (!Array.isArray(map.tiles))
      throw new Error('map.tiles fehlt oder ist ungültig');
    return true;
  }

  async function startWithMapUrl(mapUrl){
    try{
      INFO('lade Map', mapUrl);
      const map = await loadJSON(mapUrl);
      validateMap(map); // wirft bei Fehler
      emit('cb:map:loaded', { id: map.id || mapUrl, map });
      if (!window.Game?.start) throw new Error('Game.start nicht verfügbar (Script-Reihenfolge prüfen)');
      window.Game.start(map);
      OK('Map gestartet → Game.start ✓');
    } catch(e){
      ERR('Fehler:', e?.message || e);
      emit('cb:map:error', { message: e?.message || String(e) });
    }
  }

  async function startFromDOMIfPresent(tag){
    const found = findMapFromDOM();
    if (found) {
      INFO(`${tag}: data-map gefunden`, found);
      await startWithMapUrl(found);
      return true;
    }
    return false;
  }

  // -------- Event-Bindings ---------------------------------------------------
  // 1) Primärer Weg: Startpanel/Boot feuert cb:start:new mit detail.map
  window.addEventListener('cb:start:new', (ev)=>{
    const mapUrl = ev?.detail?.map || null;
    if (!mapUrl) {
      WARN('cb:start:new ohne detail.map – prüfe DOM data-map …');
      startFromDOMIfPresent('cb:start:new');
      return;
    }
    startWithMapUrl(mapUrl);
  });

  // 2) Fallback: Wenn Boot fertig ist, aber kein cb:start:new kam → DOM prüfen
  window.addEventListener('cb:boot:ready', ()=>{
    startFromDOMIfPresent('boot-ready');
  });

  // 3) Hot-Reload/Deep-Link: wenn DOM schon da ist, direkt versuchen
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // kurze Verzögerung, damit Game bereits definiert ist
    setTimeout(()=>startFromDOMIfPresent('early-init'), 0);
  } else {
    window.addEventListener('DOMContentLoaded', ()=>startFromDOMIfPresent('dom-ready'));
  }

  OK('Modul geladen (v25.10.25-final)');
})();
