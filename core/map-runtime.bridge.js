/* ============================================================================
 * Datei    : core/map-runtime.bridge.js
 * Projekt  : Neue Siedler (Epoche 1 – Basis)
 * Version  : v25.11.13-final+guard
 * Zweck    : Bridge: Map-Quelle finden → JSON laden/normalisieren → Events
 * Änderung : Run-Once/Debounce gegen Start-Stürme; kein Mehrfach-Laden
 * ========================================================================== */
(function(){
  'use strict';
  const MOD  = '[map-bridge]';
  const OK   = (...a)=> (window.CBLog?.ok   || console.log)(MOD, ...a);
  const INFO = (...a)=> (window.CBLog?.info || console.info)(MOD, ...a);
  const WARN = (...a)=> (window.CBLog?.warn || console.warn)(MOD, ...a);
  const ERR  = (...a)=> (window.CBLog?.error|| console.error)(MOD, ...a);

  // Modul nur einmal aktivieren
  if (window.__MAP_BRIDGE_RUN__) { INFO('bereits aktiv'); return; }
  window.__MAP_BRIDGE_RUN__ = true;

  // Start-Guards
  let starting   = false;   // gerade am Laden
  let started    = false;   // Map bereits geladen + Game.start aufgerufen
  const T_DEBOUNCE = 150;   // zusammenfallende Start-Events bündeln
  let tDeb = null;

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
  function normalizeMap(m){
    if (!m || typeof m!=='object') throw new Error('invalid map');
    // TODO: echte Normalisierung…
    return m;
  }

  async function startWithMapUrl(url){
    if (started || starting) { INFO('start ignoriert (already started/starting)'); return; }
    try {
      starting = true;
      INFO('lade Map', url);
      const raw = await loadJSON(url);
      const map = normalizeMap(raw);
      // Game.start übergibt normalisierte Map
      if (typeof window.Game?.start === 'function') {
        window.Game.start(map);
      }
      started = true;
      OK('Map gestartet → Game.start ✓');
      emit('cb:map:loaded', { map });
    } catch (e) {
      ERR('Fehler beim Laden der Map:', e?.message||e);
      emit('cb:map:error', { message: String(e?.message||e) });
    } finally {
      starting = false;
    }
  }

  function startFromDOMIfPresent(src='game-start'){
    const found = findMapFromDOM();
    if (found) { INFO(`game-start: data-map gefunden ${found}`); startWithMapUrl(found); return true; }
    WARN('kein data-map gefunden (DOM)');
    return false;
  }

  // Event-Bindings (gebounced, nicht einmalig – Restart später möglich)
  window.addEventListener('cb:game-start', (ev)=>{
    if (started) { INFO('ignoriere cb:game-start (bereits gestartet)'); return; }
    clearTimeout(tDeb);
    tDeb = setTimeout(() => {
      const mapUrl = ev?.detail?.map || null;
      if (mapUrl) { startWithMapUrl(mapUrl); return; }
      startFromDOMIfPresent('game-start');
    }, T_DEBOUNCE);
  });

  OK('Modul geladen (v25.11.13-final+guard) – wartet auf cb:game-start');
})();
