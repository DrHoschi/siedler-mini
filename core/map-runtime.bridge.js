/* ============================================================================
 * Datei    : core/map-runtime.bridge.js
 * Projekt  : Neue Siedler
 * Version  : v25.11.13-final2 (robuster Tileset-Resolver + DOM-Override)
 * Zweck    : Map laden, Tileset sicherstellen, cb:map:ready emittieren,
 *            anschließend Game.start(map, { tileset, tilesetUrl })
 *
 * Unterstützte Map-Formate:
 *  - Eigene Keys:     map.tileset | map.tiles.image | map.atlas.image | map.meta.tileset
 *  - Tiled (embedded): map.tilesets[].image               (relativ zur Map)
 *  - Tiled (external): map.tilesets[].source → .json/.tsx (relativ zur Tileset-Datei)
 *  - DOM-Override:    <canvas id="game" data-tileset="...">
 *
 * Events (Doppelpunkt-Standard):
 *  - Lauscht : cb:game:start
 *  - Sendet  : cb:map:ready { map, tileset, url, tilesetUrl }
 *              cb:map:error { message }
 * Hinweise:
 *  - Singleton-Guard verhindert Mehrfachstart.
 *  - Kein Debug/Workaround – deterministische, synchrone Pipeline.
 * ========================================================================== */
(function(){
  'use strict';

  const TAG  = '[map-bridge]';
  const INFO = (...a)=> (window.CBLog?.info  || console.info )(TAG, ...a);
  const OK   = (...a)=> (window.CBLog?.ok    || console.log  )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  || console.warn )(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error || console.error)(TAG, ...a);

  // ------------------------------- Singleton --------------------------------
  if (window.__MAP_BRIDGE__) { INFO('bereits aktiv – skip'); return; }
  window.__MAP_BRIDGE__ = true;

  // ------------------------------- Helpers ----------------------------------
  function emit(name, detail={}) {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch(_) {}
  }

  function dirname(url) {
    const i = url.lastIndexOf('/');
    return i >= 0 ? url.slice(0, i + 1) : '';
  }

  function join(base, rel) {
    if (!rel) return base;
    // absolute?
    if (/^https?:\/\//i.test(rel) || rel.startsWith('/')) return rel;
    // Normalisieren (../, ./)
    const stack = base.split('/');
    if (!base.endsWith('/')) stack.pop();
    for (const part of rel.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') { if (stack.length) stack.pop(); continue; }
      stack.push(part);
    }
    return stack.join('/');
  }

  async function loadText(url){
    const bust = (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    const res = await fetch(url + bust, { cache:'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
    return res.text();
  }

  async function loadJSON(url){
    const bust = (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    const res = await fetch(url + bust, { cache:'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
    return res.json();
  }

  // Kleiner Bild-Cache (falls kein globaler vorhanden ist)
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

  // --------------------------- Map / Tileset Resolver -----------------------
  // data-map aus DOM lesen (Canvas oder Body)
  function findMapUrlFromDOM(){
    const el = document.getElementById('game') || document.body;
    const m = el?.getAttribute?.('data-map');
    return (m && m.trim()) ? m.trim() : null;
  }

  /**
   * Ermittelt robust die Tileset-Quelle:
   *  0) DOM-Override (data-tileset) – höchste Priorität
   *  1) Einfache Felder (map.tileset / map.tiles.image / map.atlas.image / map.meta.tileset)
   *  2) Tiled embedded (map.tilesets[].image) – relativ zur Map
   *  3) Tiled external (map.tilesets[].source → .json/.tsx) – relativ zur Tileset-Datei
   */
  async function resolveTilesetUrlAsync(map, mapUrl) {
    // 0) DOM-Override
    const domEl = document.getElementById('game') || document.body;
    const domTileset = domEl?.getAttribute?.('data-tileset');
    if (domTileset && domTileset.trim()) return domTileset.trim();

    // 1) Eigene, einfache Felder
    const simple = map?.tileset || map?.tiles?.image || map?.atlas?.image || map?.meta?.tileset;
    if (simple) return join(dirname(mapUrl), simple);

    // 2/3) Tiled tilesets
    if (Array.isArray(map?.tilesets)) {
      for (const ts of map.tilesets) {
        // embedded
        if (ts?.image) return join(dirname(mapUrl), ts.image);

        // external
        if (ts?.source) {
          const tsUrl = join(dirname(mapUrl), ts.source);

          // JSON Tileset
          if (tsUrl.endsWith('.json')) {
            try {
              const j = await loadJSON(tsUrl);
              if (j?.image) return join(dirname(tsUrl), j.image);
            } catch(_) {}
          }

          // TSX Tileset (XML)
          if (tsUrl.endsWith('.tsx')) {
            try {
              const xml = await loadText(tsUrl);
              const m = xml.match(/<image[^>]+source="([^"]+)"/i);
              if (m && m[1]) return join(dirname(tsUrl), m[1]);
            } catch(_) {}
          }
        }
      }
    }

    // nichts gefunden
    return null;
  }

  // ----------------------------- Start-Kette --------------------------------
  let started = false; // Schutz gegen Mehrfachstart

  addEventListener('cb:game:start', async (ev)=>{
    if (started) { INFO('ignoriere cb:game:start (bereits gestartet)'); return; }
    started = true;

    try {
      const mapUrl = ev?.detail?.map || findMapUrlFromDOM();
      if (!mapUrl) throw new Error('Keine Map-Quelle (data-map) gefunden.');
      INFO('lade Map', mapUrl);

      const raw = await loadJSON(mapUrl);
      const map = raw && typeof raw === 'object'
        ? raw
        : (()=>{ throw new Error('Map JSON ungültig'); })();

      // Tileset sichern (BLOCKING, strukturell notwendig)
      const tilesetUrl = await resolveTilesetUrlAsync(map, mapUrl);
      if (!tilesetUrl) WARN('Kein Tileset-Pfad in Map gefunden – Renderer könnte nichts zeichnen.');
      const tileset = tilesetUrl ? await loadImage(tilesetUrl) : null;

      // Map ready → Renderer & andere Module können reagieren
      emit('cb:map:ready', { map, tileset, url: mapUrl, tilesetUrl });

      // Game starten (Tileset optional übergeben)
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
