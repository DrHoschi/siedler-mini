/* ============================================================================
 * ui-build.js — Baumenü-Modul (Tab-Dock)
 * Version: v1.4.0 (2025-09-23)
 * Struktur: Imports → Konstanten → Helpers → Klassen → Hauptlogik → Exports
 * ========================================================================== */
(function(){
  'use strict';
  const MOD = "[ui-build]";
  const S = {
    idDock:      'build-dock',
    selectorDock:'#build-dock'
  };

  // == Helpers =================================================================
  const el = {};
  function h(tag, attrs={}, ...children){
    const n = document.createElement(tag);
    for(const [k,v] of Object.entries(attrs||{})){
      if(k==='class') n.className = v;
      else if(k==='html') n.innerHTML = v;
      else n.setAttribute(k, v);
    }
    for(const c of children) if(c!=null) n.append(c.nodeType?c:document.createTextNode(c));
    return n;
  }
  function showDock(flag){ el.dock.hidden = !flag; }

  function renderEmpty(msg="Keine Einträge vorhanden"){
    el.body.replaceChildren( h('div', {class:'ui-build-empty'}, msg) );
  }

  function makeItemCard(item){
    const img = h('img', {class:'ui-build-item-img', src:item.icon, alt:item.label});
    const wrapImg = h('div', {class:'ui-build-item-imgwrap'}, img);
    const label = h('div', {class:'ui-build-item-label'}, item.label);

    const card = h('button', {class:'ui-card ui-build-item', 'data-id':item.id, title:item.label}, wrapImg, label);
    card.addEventListener('click', ()=>{
      window.dispatchEvent(new CustomEvent('req:build:select', {detail:{ item }}));
    });
    return card;
  }

  function renderCategory(cat){
    const title = h('div', {class:'ui-build-category-title'}, cat.title);
    const row = h('div', {class:'ui-build-category-row'});
    for(const it of (cat.items||[])) row.append( makeItemCard(it) );
    return h('section', {class:'ui-build-category'}, title, row);
  }

  function renderDock(categories){
    el.title.textContent = "Bauen";
    el.body.replaceChildren();
    if(!categories?.length){ renderEmpty(); return; }
    for(const cat of categories) el.body.append( renderCategory(cat) );
  }

  function computeMaxHeight(){
    // Platz unter der HUD-Leiste grob berechnen (hier simpel fixiert)
    document.documentElement.style.setProperty('--build-dock-max-h', '48vh');
  }

  // == Hauptlogik ==============================================================
  function ensureDom(){
    el.dock  = document.querySelector(S.selectorDock);
    if(!el.dock){
      console.warn(MOD, "kein Dock-Container gefunden");
      return false;
    }
    el.dock.innerHTML = `
      <div class="ui-build-header">
        <div class="ui-build-title">Bauen</div>
        <div class="ui-build-spacer"></div>
        <button class="ui-build-close" type="button" title="Schließen">×</button>
      </div>
      <div class="ui-build-body"></div>
    `;
    el.title = el.dock.querySelector('.ui-build-title');
    el.body  = el.dock.querySelector('.ui-build-body');
    el.btnClose = el.dock.querySelector('.ui-build-close');
    el.btnClose.addEventListener('click', ()=> showDock(false));
    computeMaxHeight();
    return true;
  }

  // Öffnen nach Spielstart
  window.addEventListener('cb:game-start', ()=>{
    ensureDom();
    showDock(true);
    // Falls Kategorien schon da sind, sofort rendern:
    if(Array.isArray(window.BUILD_CATEGORIES)) renderDock(window.BUILD_CATEGORIES);
  });

  // Kategorien kommen asynchron
  window.addEventListener('cb:build-categories-ready', ev=>{
    ensureDom();
    renderDock(ev.detail?.categories || window.BUILD_CATEGORIES);
    showDock(true);
  });

  // Optional: Shortcut (Taste B) zum Ein-/Ausblenden
  window.addEventListener('keydown', e=>{
    if(e.key?.toLowerCase()==='b'){
      ensureDom();
      showDock(el.dock.hidden);
    }
  });

  console?.log?.(MOD, "geladen v1.4.0");
})();
