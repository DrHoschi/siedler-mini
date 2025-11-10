/* ============================================================================
 * Datei   : core/registry-v1.js
 * Version : v25.11.10-final
 * Zweck   : Registry-Lader (Buildings) + API (get/list) + cb:registry:ready
 * Hinweis : Idempotent (lädt/emit nur einmal)
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[registry]';
  if (window.__REGISTRY_V1_READY__) { console.info(TAG,'bereits aktiv – skip'); return; }
  window.__REGISTRY_V1_READY__ = true;

  const INFO=(...a)=>(window.CBLog?.info||console.info)(TAG, ...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG, ...a);

  let _buildings = []; // Normalisierte Liste

  function normalize(raw){
    const id = String(raw?.id||'').trim();
    const name = String(raw?.name||id||'Gebäude');
    const w = Number(raw?.w || (Array.isArray(raw?.size)?raw.size[0]:0)) || 3;
    const h = Number(raw?.h || (Array.isArray(raw?.size)?raw.size[1]:0)) || 3;
    const categories = Array.isArray(raw?.categories) ? raw.categories.map(String)
                        : raw?.category ? [String(raw.category)] : ['misc'];
    const image = raw?.image || `assets/icons/buildings/${id}.png`;
    const cost = Array.isArray(raw?.cost) ? raw.cost : [];
    return { id, name, w, h, size:[w,h], categories, image, cost };
  }

  async function loadJSON(url){
    const bust = (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    const r = await fetch(url + bust, { cache:'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status} @ ${url}`);
    return r.json();
  }

  async function init(){
    try {
      const json = await loadJSON('data/buildings.json');
      const arr  = Array.isArray(json) ? json : (json?.buildings || []);
      _buildings = arr.map(normalize);
      INFO('bereit', { counts:{ buildings:_buildings.length } });

      // Registry-API bereitstellen
      window.Registry = {
        list(kind){
          if (kind==='building' || kind==='buildings') return [..._buildings];
          return [];
        },
        get(kind, id){
          if (kind!=='building') return null;
          return _buildings.find(b=>b.id===id) || null;
        },
        counts(){
          return { buildings: _buildings.length };
        }
      };

      dispatchEvent(new CustomEvent('cb:registry:ready', {
        detail:{ version:'v25.11.10', counts: window.Registry.counts() }
      }));
    } catch(e){
      WARN('Fehler:', e?.message||e);
      // Minimal-Registry als Fallback
      _buildings = [
        { id:'b.hq',          name:'HQ',            w:3, h:3, size:[3,3], categories:['core'],   image:'', cost:[] },
        { id:'b.lumberjack',  name:'Holzfäller',    w:3, h:3, size:[3,3], categories:['basic'],  image:'', cost:[] },
        { id:'b.quarry',      name:'Steinbruch',    w:3, h:3, size:[3,3], categories:['basic'],  image:'', cost:[] },
        { id:'b.house_small', name:'Wohnhaus klein',w:3, h:3, size:[3,3], categories:['houses'], image:'', cost:[] },
      ];
      window.Registry = {
        list:k=> (k==='building'||k==='buildings')?[..._buildings]:[],
        get:(k,id)=> k==='building'?(_buildings.find(b=>b.id===id)||null):null,
        counts:()=>({ buildings:_buildings.length })
      };
      dispatchEvent(new CustomEvent('cb:registry:ready', {
        detail:{ version:'v25.11.10-fallback', counts: window.Registry.counts() }
      }));
    }
  }

  init();
})();
