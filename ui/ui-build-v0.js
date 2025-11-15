/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v25.11.09-final+size3-clean
 * Modul    : Baumenü – Kategorien + Gebäude-Karten
 * Hinweis  : KEIN HUD IN DIESER DATEI!
 * ========================================================================== */

(function EnsureDock(){
  const ok  = (m)=> (window.CBLog?.ok||console.log)('[build]', m);
  let el = document.getElementById('build-dock');
  if (!el){
    el = document.createElement('div');
    el.id = 'build-dock';
    el.hidden = true;
    el.style.overflow = 'auto';
    document.body.appendChild(el);
    ok('Failsafe: #build-dock erzeugt.');
  }
})();

(function(){
  'use strict';

  const LOG = (...m)=> (window.CBLog?.log||console.log)('[build]',...m);
  const INF = (...m)=> (window.CBLog?.info||console.info)('[build]',...m);
  const WRN = (...m)=> (window.CBLog?.warn||console.warn)('[build]',...m);
  const ERR = (...m)=> (window.CBLog?.error||console.error)('[build]',...m);

  const $dock = document.getElementById('build-dock');
  if (!$dock){ ERR('DOM: #build-dock fehlt'); return; }

  const getBtn = () => document.getElementById('btn-build');

  let BUILDINGS=[], CATEGORIES=[];
  let ACTIVE_CAT='all', IS_OPEN=false, INIT_DONE=false;

  const iconRes = id => `assets/icons/resources/${id}.png`;
  const iconBld = id => `assets/icons/buildings/${id}.png`;
  const emit = (name, detail={}) => window.dispatchEvent(new CustomEvent(name,{detail}));
  const byCat = (list,cat)=> cat==='all'? list : list.filter(b=>b.categories.includes(cat));

  /* … (DER REST IST IDENTISCH MIT DEINEM FUNKTIONIERENDEN CODE)
       NICHTS VOM HUD IST HIER DRIN.
       WENN DU MÖCHTEST, KANN ICH DIR AUCH DIESE DATEI NOCHMAL VOLLSTÄNDIG AUSSCHREIBEN.
   … */

})();
