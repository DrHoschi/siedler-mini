/* ============================================================================
 * Datei: core/registry.json-adapter.js
 * Projekt: Neue Siedler
 * Version: v1.0.2
 * Zweck:
 *   - Brücke zwischen JSON-Daten (buildings.json, units.json, …) und Registry
 *   - Lädt Datenpakete, validiert rudimentär und registriert Inhalte zentral
 *   - Löst cb:registry:ready aus, sobald Daten eingebunden sind
 * ============================================================================
 */

(function(){
  'use strict';

  var MOD = '[registry.json-adapter]';
  var VERSION = 'v1.0.2';

  // ---------------------------------------------------------------------------
  // Logging beim Laden
  // ---------------------------------------------------------------------------
  (window.CBLog?.ok || console.log)(MOD, 'Modul geladen', VERSION);

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen
  // ---------------------------------------------------------------------------

  // JSON laden (Promise-basiert)
  function loadJSON(url){
    return fetch(url)
      .then(r => {
        if(!r.ok) throw new Error('HTTP '+r.status);
        return r.json();
      });
  }

  // Kategorie-Metadaten: Default-Werte
  function categoryMeta(cat){
    var colors = { admin:'#9b59b6', food:'#27ae60', raw:'#d35400', misc:'#7f8c8d' };
    return { color: colors[cat] || '#95a5a6', icon: null };
  }

  // Gebäude registrieren
  function registerBuildings(arr){
    if(!Array.isArray(arr)) return;
    arr.forEach(b => {
      try {
        var id = b.id || ('b.'+b.name.toLowerCase());
        var meta = {
          id,
          type:'building',
          name: b.name,
          cat: b.cat || 'misc',
          sprite: b.sprite,
          icon: b.icon,
          enabled: !!b.enabled,
          size: b.size || [1,1],
          place: b.place || null
        };

        // Cross-Check: Sprite existiert?
        if(!meta.sprite){
          (window.CBLog?.warn || console.warn)(MOD, 'Sprite fehlt bei', id);
        }

        // Registry schreiben
        try {
          window.Registry.register('buildings', id, meta);
        } catch(e){
          (window.CBLog?.error || console.error)(MOD, 'Registry.register fail', id, e);
        }
      } catch(e){
        (window.CBLog?.error || console.error)(MOD, 'Fehler beim Parsen eines Gebäudes', e);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Hauptlogik
  // ---------------------------------------------------------------------------

  function applyData(buildings){
    registerBuildings(buildings);

    var cats = (window.Registry.list?.('categories')||[]).length;
    var blds = (window.Registry.list?.('buildings')||[]).length;

    (window.CBLog?.ok || console.log)(
      MOD, 'ready dispatched (cats:', cats, 'blds:', blds, ')'
    );

    try {
      window.dispatchEvent(new CustomEvent('cb:registry:ready',{
        detail:{ ready:true, counts:{categories:cats, buildings:blds}, source:'json-adapter' }
      }));
    } catch(_){}
  }

  // ---------------------------------------------------------------------------
  // Bootstrap: Warten auf cb:assets-ready oder cb:game-start
  // ---------------------------------------------------------------------------

  function start(){
    // Gebäude-JSON laden
    loadJSON('data/buildings.json')
      .then(data => {
        applyData(data.buildings||[]);
        (window.CBLog?.info || console.log)(MOD, 'applied', (data.buildings||[]).length, 'buildings');
      })
      .catch(e => {
        (window.CBLog?.error || console.error)(MOD, 'Fehler beim Laden von buildings.json', e);
      });
  }

  window.addEventListener('cb:assets-ready', start, {once:true});
  window.addEventListener('cb:game-start', start, {once:true});

})();
