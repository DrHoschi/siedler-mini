/* ============================================================================
 * Datei    : core/map-runtime.bridge.js
 * Projekt  : Neue Siedler
 * Version  : v25.11.13-final (map → tileset → ready → Game.start)
 * Zweck    : Map laden, Tileset sicherstellen, Ereignisse emittieren
 * Hinweis  : Kein Debug/Workaround – saubere, synchrone Kette.
 * ========================================================================== */
(function(){
  'use strict';
  const TAG = '[map-bridge]';
  const INFO = (...a)=> (window.CBLog?.info || console.info)(TAG, ...a);
  const OK   = (...a)=> (window.CBLog?.ok   || console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn || console.warn)(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error|| console.error)(TAG, ...a);

  // Singleton
  if (window.__MAP_BRIDGE__) { INFO('bereits aktiv – skip'); return; }
  window.__MAP_BRIDGE__ = true;

  // -------- Utilities -------------------------------------------------------
  function emit(name, detail={}) {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch(_) {}
  }

  async function loadJSON(url){
    const bust = (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    const res = await fetch(url + bust, { cache:'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
    return res.json();
  }

  // Kleiner Bild-Cache, falls kein globaler Asset-Cache existiert
  const IMG = (window.Assets && Assets.images) || (window.__IMG__ = window.__IMG__ || {});
  async function loadImage(url){
    if (!url) throw new Error('leerer Tileset-Pfad');
    if (IMG[url] instanceof HTMLImageElement && IMG[url].complete) return IMG[url];
    await new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload  = ()=> { IMG[url] = img; resolve(); };
      img.onerror = ()=> reject(new Error('Bild nicht ladbar: ' + url));
      img.src = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    });
    return IMG[url];
  }

  // Tileset-Pfad aus Map-Objekt ermitteln (unterstützt typische Strukturen)
  function resolveTilesetUrl(map){
    // Kandidaten in Reihenfolge der Wahrscheinlichkeit
    const cand = [
      map?.tileset,                 // "assets/tiles/terrain.png"
      map?.tiles?.image,            // { tiles: { image: "...png" } }
      map?.atlas?.image,            // { atlas: { image: "...png" } }
      map?.meta?.tileset,           // fallback meta
    ].filter(Boolean);
    return cand[0] || null;
  }

  // data-map aus DOM lesen (Canvas oder Body)
  function findMapUrlFromDOM(){
    const el = document.getElementById('game') || document.body;
    const m = el?.getAttribute?.('data-map');
    return (m && m.trim()) ? m.trim() : null;
  }

  // -------- Start-Kette -----------------------------------------------------
  let started = false;  // Schutz gegen Mehrfachstart
  addEventListener('cb:game:start', async (ev)=>{
    if (started) { INFO('ignoriere cb:game:start (bereits gestartet)'); return; }
    started = true;

    try {
      const mapUrl = ev?.detail?.map || findMapUrlFromDOM();
      if (!mapUrl) throw new Error('Keine Map-Quelle (data-map) gefunden.');
      INFO('lade Map', mapUrl);

      const raw = await loadJSON(mapUrl);
      const map = raw && typeof raw === 'object' ? raw : (()=>{ throw new Error('Map JSON ungültig'); })();

      // Tileset sichern (BLOCKING, strukturell notwendig)
      const tilesetUrl = resolveTilesetUrl(map);
      if (!tilesetUrl) WARN('Kein Tileset-Pfad in Map gefunden – Renderer könnte nichts zeichnen.');
      const tileset = tilesetUrl ? await loadImage(tilesetUrl) : null;

      // Map ready → Renderer & andere Module können reagieren
      emit('cb:map:ready', { map, tileset, url: mapUrl, tilesetUrl });

      // Game starten (Tileset als Option übergeben, Renderer kann es auswerten)
      if (typeof window.Game?.start === 'function') {
        window.Game.start(map, { tileset, tilesetUrl });
        OK('Map gestartet → Game.start ✓');
      } else {
        WARN('Game.start fehlt – Map geladen, aber kein Start möglich.');
      }
    } catch (e) {
      ERR('Fehler:', e?.message || e);
      emit('cb:map:error', { message: String(e?.message||e) });
      started = false; // erneuter Versuch später möglich
    }
  });
})();
