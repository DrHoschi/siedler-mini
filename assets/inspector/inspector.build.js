/* ============================================================================
 * assets/inspector/inspector.build.js
 * Version: v18.10.6
 * Zweck:
 *   - Inspector-Tab "Build": Kategorien + Items (aus window.BUILD_CATEGORIES)
 *   - Auswahl sendet CustomEvent 'cb:build-select' mit {type}
 *   - 'todo: true' → Button disabled
 *   - Defensive: Fallback-Kategorien, wenn BUILD_CATEGORIES fehlt
 *
 * Abhängigkeiten:
 *   - __INSPECTOR_CORE__ (aus inspector.core.js)
 *   - Optional window.BUILD_CATEGORIES (Array)
 *
 * Log-Konvention: CBLog (fällt sanft auf console.* zurück)
 * ========================================================================== */
(function(){
  'use strict';

  var MOD = '[inspector.build]';
  var VER = 'v18.10.6';
  var Core = window.__INSPECTOR_CORE__;
  if (!Core) { (console.warn||console.log)(MOD+' Core fehlt – Modul beendet.'); return; }

  function logOk(m){ try{ (window.CBLog?.ok||console.log)(MOD+' '+m); }catch(_){ console.log(MOD+' '+m); } }
  function logWarn(m){ try{ (window.CBLog?.warn||console.warn)(MOD+' '+m); }catch(_){ console.warn(MOD+' '+m); } }

  // Fallback-Kategorien, falls noch kein BUILD_CATEGORIES definiert ist
  var FALLBACK = [
    {
      id:'general', title:'Allg.', items:[
        { id:'hq',    label:'Hauptquartier' },
        { id:'depot', label:'Depot' },
        { id:'house', label:'Haus' }
      ]
    },
    {
      id:'production', title:'Produktion', items:[
        { id:'farm',   label:'Farm' },
        { id:'fischer',label:'Fischer' },
        { id:'lumberjack', label:'Holzfäller', todo:true }
      ]
    }
  ];

  // Hilfsfunktionen (kleine, inline Styles – Rest kommt aus inspector.css)
  function mkTitle(txt){
    var d=document.createElement('div');
    d.className='ins-subtitle';
    d.textContent=txt;
    return d;
  }

  function mkItemButton(it){
    var b=document.createElement('button');
    b.className='ins-pill';
    b.textContent = it.label || it.id;
    if (it.todo){ b.disabled = true; b.setAttribute('title','Noch nicht verfügbar'); }
    if (!it.todo){
      b.addEventListener('click', function(){
        try { window.dispatchEvent(new CustomEvent('cb:build-select', { detail:{ type: it.id } })); } catch(_){}
        try { (window.CBLog?.log||console.log)('[ui] Build-Select', it.id); } catch(_){}
        Core.flash('Aktives Build-Tool: '+ (it.label||it.id));
      });
    }
    return b;
  }

  function renderBuildTab(container){
    container.innerHTML = '';
    var cats = (Array.isArray(window.BUILD_CATEGORIES) && window.BUILD_CATEGORIES.length) ? window.BUILD_CATEGORIES : FALLBACK;

    cats.forEach(function(cat){
      container.appendChild(mkTitle(cat.title || cat.id));
      var line=document.createElement('div');
      line.className='ins-rowwrap';
      (cat.items||[]).forEach(function(it){ line.appendChild(mkItemButton(it)); });
      container.appendChild(line);
    });

    // kleine Fußnote
    var hint=document.createElement('div');
    hint.className='ins-hint';
    hint.textContent='Tipp: Die Auswahl sendet "cb:build-select" mit dem gewählten Typ.';
    container.appendChild(hint);
  }

  // Registrierung beim Core
  Core.registerTab('build', {
    title: 'Build',
    mount: function(slot){ renderBuildTab(slot.body); },
    unmount: function(){ /* nichts nötig */ }
  });

  logOk('geladen ('+VER+')');
})();
