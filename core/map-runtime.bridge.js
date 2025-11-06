/* ============================================================================
 * Datei    : core/map-runtime.bridge.js
 * Projekt  : Neue Siedler (Epoche 1 – Basis)
 * Version  : v25.11.06-final (robuste Map-Normalisierung)
 * Zweck    : Bridge: Map-Quelle finden → JSON laden/normalisieren → Events/Start
 *
 * Lauscht  : cb:start:new {map?}, cb:boot:ready, DOMContentLoaded
 * Sendet   : cb:map:loaded { id?, map:{size:[w,h], tiles:2D}, tileset?, tileSize? }
 *            cb:map:error { message }
 * Ruft     : Game.start(map) – startet den Loop & feuert Start-Events
 *
 * Hinweise : tolerant ggü. Map-Formaten:
 *            - size:[w,h] | width/height | cols/rows
 *            - tiles 2D | data 2D | layers[0].data (1D → 2D gefaltet)
 * ========================================================================== */
(function(){
  const MOD  = '[map-bridge]';
  const OK   = (...a)=> (window.CBLog?.ok   || console.log).apply(console, [MOD, ...a]);
  const INFO = (...a)=> (window.CBLog?.info || console.info).apply(console, [MOD, ...a]);
  const WARN = (...a)=> (window.CBLog?.warn || console.warn).apply(console, [MOD, ...a]);
  const ERR  = (...a)=> (window.CBLog?.error|| console.error).apply(console, [MOD, ...a]);

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
    const el = document.getElementById('game') || document.body;
    const map = el?.getAttribute?.('data-map');
    return map && map.trim() ? map.trim() : null;
  }

  // ---- robuste Normalisierung für Bestands-Maps ----------------------------
  function normalizeMap(m){
    if (!m || typeof m!=='object') throw new Error('ungültiges Map-Objekt');

    // Größe akzeptieren
    let size = m.size;
    if (!size && m.width && m.height) size = [m.width, m.height];
    if (!size && m.cols  && m.rows)   size = [m.cols, m.rows];
    if (!Array.isArray(size) || size.length!==2) throw new Error('map.size fehlt oder ist ungültig');
    const [W,H] = size.map(n=>Number(n||0));
    if (!(W>0 && H>0)) throw new Error('map.size ungültige Werte');

    // Tiles akzeptieren
    let tiles = m.tiles || m.data;
    if (!tiles && Array.isArray(m.layers) && m.layers[0] && m.layers[0].data){
      const L = m.layers[0].data;
      if (Array.isArray(L) && (!Array.isArray(L[0]))){
        // 1D → 2D falten
        const rows=[]; for(let y=0;y<H;y++) rows.push(L.slice(y*W,(y+1)*W));
        tiles = rows;
      } else tiles = L;
    }
    if (!Array.isArray(tiles) || !Array.isArray(tiles[0])) throw new Error('map.tiles fehlt oder ist ungültig');

    const out = { size:[W,H], tiles };
    // optionale Felder direkt übernehmen, wenn vorhanden
    if (m.tileSize) out.tileSize = Number(m.tileSize)||32;
    if (m.tileset ) out.tileset  = String(m.tileset);
    return out;
  }

  async function startWithMapUrl(mapUrl){
    try{
      INFO('lade Map', mapUrl);
      const raw = await loadJSON(mapUrl);
      const n   = normalizeMap(raw);

      // Events + Start
      emit('cb:map:loaded', { id: raw.id || mapUrl, map: n, tileset: n.tileset, tileSize: n.tileSize||32 });

      if (!window.Game?.start) throw new Error('Game.start nicht verfügbar (Script-Reihenfolge prüfen)');
      window.Game.start(n); // optional map an Game übergeben (tileSize etc.)
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

  // ---- Event-Bindings -------------------------------------------------------
  window.addEventListener('cb:start:new', (ev)=>{
    const mapUrl = ev?.detail?.map || null;
    if (!mapUrl) { WARN('cb:start:new ohne detail.map → prüfe DOM'); startFromDOMIfPresent('cb:start:new'); return; }
    startWithMapUrl(mapUrl);
  });
  window.addEventListener('cb:boot:ready', ()=>{ startFromDOMIfPresent('boot-ready'); });

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(()=>startFromDOMIfPresent('early-init'), 0);
  else window.addEventListener('DOMContentLoaded', ()=>startFromDOMIfPresent('dom-ready'));

  OK('Modul geladen (v25.11.06-final)');
})();
