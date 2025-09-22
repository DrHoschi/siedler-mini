/* ============================================================================
 * Datei: ui/ui-build.js
 * Projekt: Neue Siedler
 * Version: v1.1.0 (2025-09-22)
 * Zweck: BuildDock + Platziermodus (rendert Kategorien aus ui-build.categories.js)
 * Events:
 *   emit: cb:build:open|close|select|place|cancel
 *   listen: cb:build-categories-ready
 * ============================================================================
 */

(function(){
  'use strict';
  const MOD='[ui-build]';
  const VERSION='v1.1.0';

  const wrap = document.getElementById('build-wrap');
  const dock = document.getElementById('build-dock');

  // Render-Funktion
  function render(categories){
    if(!wrap) return;
    wrap.innerHTML='';
    categories.forEach(cat=>{
      const catDiv=document.createElement('div');
      catDiv.className='build-cat';
      const catTitle=document.createElement('h4');
      catTitle.textContent=cat.title;
      catDiv.appendChild(catTitle);

      const list=document.createElement('div');
      list.className='build-list';
      cat.items.forEach(it=>{
        const btn=document.createElement('button');
        btn.className='build-item';
        btn.innerHTML=`<img src="${it.icon}" alt=""/> ${it.label}`;
        btn.addEventListener('click', ()=>{
          window.dispatchEvent(new CustomEvent('cb:build:select',{detail:{buildingId:it.id}}));
        });
        list.appendChild(btn);
      });
      catDiv.appendChild(list);
      wrap.appendChild(catDiv);
    });
  }

  // Event-Listener auf Kategorien
  window.addEventListener('cb:build-categories-ready', ev=>{
    render(ev.detail.categories);
  });

  // API
  window.UIBuild={
    open(){ dock.style.display='block'; window.dispatchEvent(new CustomEvent('cb:build:open',{detail:{from:'UI'}})); },
    close(reason='cancel'){ dock.style.display='none'; window.dispatchEvent(new CustomEvent('cb:build:close',{detail:{reason}})); },
    VERSION
  };

  (window.CBLog?.ok||console.log)('🏗️', MOD,'bereit',VERSION);
})();
