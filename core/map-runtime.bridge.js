/* ============================================================================
 * Datei    : core/map-runtime.bridge.js
 * Projekt  : Neue Siedler (Epoche 1 – Basis)
 * Version  : v25.11.13-final
 * Zweck    : Bridge: Map-Quelle finden → JSON laden/normalisieren → Events
 *
 * KEIN AUTOSTART:
 * - Lädt/Startet die Map NUR nach cb:game-start (vom Boot).
 * - KEIN Start mehr auf cb:boot:ready, KEIN setTimeout-Fallback.
 *
 * Lauscht  : cb:game-start
 * Sendet   : cb:map:loaded { id?, map:{size:[w,h], tiles:2D}, tileset?, tileSize? }
 *            cb:map:error { message }
 * Ruft     : Game.start(normalizedMap) – NACH erfolgreichem Laden/Normalize
 * ========================================================================== */
(function(){
  'use strict';
  const MOD  = '[map-bridge]';
  const OK   = (...a)=> (window.CBLog?.ok   || console.log)(MOD, ...a);
  const INFO = (...a)=> (window.CBLog?.info || console.info)(MOD, ...a);
  const WARN = (...a)=> (window.CBLog?.warn || console.warn)(MOD, ...a);
  const ERR  = (...a)=> (window.CBLog?.error|| console.error)(MOD, ...a);

  // ---- SINGLE-RUN GUARD ----------------------------------------------------
  if (window.__MAP_BRIDGE_RUN__) { INFO('bereits aktiv'); return; }
  window.__MAP_BRIDGE_RUN__ = true;

  function emit(name, detail={}) {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch(_) {}
  }
  async function loadJSON(url){
    const bust = (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    const res = await fetch(url + bust, { cache:'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
    return res.json();
  }
  function findMapFromDOM(){
    const el = document.getElementById('game') || document.body;
    const map = el?.getAttribute?.('data-map');
    return map && map.trim() ? map.trim() : null;
  }

  // ---- Normalisierung (tolerant) ------------------------------------------
  function normalizeMap(m){
    if (!m || typeof m!=='object') throw new Error('ungültiges Map-Objekt');

    let size = m.size;
    if (!size && m.width && m.height) size = [m.width, m.height];
    if (!size && m.cols  && m.rows)   size = [m.cols, m.rows];
    if (!Array.isArray(size) || size.length!==2) throw new Error('map.size fehlt oder ist ungültig');
    const [W,H] = size.map(n=>Number(n||0));
    if (!(W>0 && H>0)) throw new Error('map.size ungültige Werte');

    let tiles = m.tiles || m.data;
    if (!tiles && Array.isArray(m.layers) && m.layers[0] && m.layers[0].data){
      const L = m.layers[0].data;
      if (Array.isArray(L) && (!Array.isArray(L[0]))){
        const rows=[]; for(let y=0;y<H;y++) rows.push(L.slice(y*W,(y+1)*W));
        tiles = rows;           // 1D → 2D
      } else tiles = L;         // bereits 2D
    }
    if (!Array.isArray(tiles) || !Array.isArray(tiles[0])) throw new Error('map.tiles fehlt oder ist ungültig');

    const out = { size:[W,H], tiles };
    if (m.tileSize) out.tileSize = Number(m.tileSize)||32;
    if (m.tileset ) out.tileset  = String(m.tileset);
    return out;
  }

  async function startWithMapUrl(mapUrl){
    try{
      INFO('lade Map', mapUrl);
      const raw = await loadJSON(mapUrl);
      const n   = normalizeMap(raw);

      emit('cb:map:loaded', { id: raw.id || mapUrl, map: n, tileset: n.tileset, tileSize: n.tileSize||32 });

      if (!window.Game?.start) throw new Error('Game.start nicht verfügbar (Script-Reihenfolge prüfen)');
      window.Game.start(n);
      OK('Map gestartet → Game.start ✓');
    } catch(e){
      ERR('Fehler:', e?.message || e);
      emit('cb:map:error', { message: e?.message || String(e) });
    }
  }

  async function startFromDOMIfPresent(tag){
    const found = findMapFromDOM();
    if (found) { INFO(`${tag}: data-map gefunden`, found); await startWithMapUrl(found); return true; }
    return false;
  }

  // ---- Event-Bindings (einziger Startpfad) ---------------------------------
  window.addEventListener('cb:game-start', (ev)=>{
    const mapUrl = ev?.detail?.map || null;
    if (mapUrl) { startWithMapUrl(mapUrl); return; }
    // kein map in detail → DOM-Attribut auslesen
    startFromDOMIfPresent('game-start');
  }); // NICHT once:true → unterstützt Stop/Restart

  OK('Modul geladen (v25.11.13-final) – wartet auf cb:game-start');
})();
