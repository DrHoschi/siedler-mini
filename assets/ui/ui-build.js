/* =======================================================================
 * Datei: assets/ui/ui-build.js
 * Version: v18.3.0 (compat)
 * Zweck: Bau-Menü (Dock) – robust gegen verschiedene Registry-/API-Stände
 * ======================================================================= */
(function () {
  'use strict';

  const MOD = '[ui-build]';
  const VER = 'v18.3.0';

  // ---- Logging ----------------------------------------------------------------
  const log  = (m)=> (window.CBLog?.info || console.log)(`${MOD} ${m}`);
  const ok   = (m)=> (window.CBLog?.ok   || console.log)(`${MOD} ${m}`);
  const warn = (m)=> (window.CBLog?.warn || console.warn)(`${MOD} ${m}`);
  const err  = (m)=> (window.CBLog?.err  || console.error)(`${MOD} ${m}`);

  // ---- DOM helpers -------------------------------------------------------------
  function rootEl() {
    // akzeptiert neue (#build-dock) und alte (#build-panel) ID
    return document.getElementById('build-dock')
        || document.getElementById('build-panel')
        || (()=>{
             const div = document.createElement('div');
             div.id = 'build-dock';
             document.body.appendChild(div);
             return div;
           })();
  }
  function ensureShown(shown){
    document.body.classList.toggle('has-build-open', !!shown);
  }
  function openDock(){ ensureShown(true); rootEl().classList.add('is-open');  dispatch('cb:build:open');  }
  function closeDock(){ ensureShown(false); rootEl().classList.remove('is-open'); dispatch('cb:build:close'); }
  function dispatch(name, detail){ try{ window.dispatchEvent(new CustomEvent(name,{detail})); }catch(_){} }

  // ---- Icon Pfade --------------------------------------------------------------
  // Versuch, ein Icon aus verschiedenen Feldern zu ermitteln
  function resolveIcon(it){
    // bekannte Felder
    const cand = [
      it.icon, it.img, it.image, it.sprite,
      it.preview, it.thumb, it.iconPath
    ].filter(Boolean);

    // Heuristik (Lastenheft: assets/buildings/<id>_wood1.png o.ä.)
    if (cand.length === 0 && it.id){
      cand.push(`assets/buildings/${it.id}.png`);
      cand.push(`assets/buildings/${it.id}_wood1.png`);
      cand.push(`assets/ui/icons/${it.id}.png`);
    }
    return cand[0] || 'assets/ui/placeholder.build.png';
  }

  // ---- Quelle → Normalform -----------------------------------------------------
  /**
   * Normalform:
   * [
   *   { title:'Allg. / Verwaltung', items:[{id,name,icon,meta…}, …] },
   *   …
   * ]
   */
  function normalizeFromRegistryLike(reg){
    try{
      // bekannte Formen
      // A) {categories:[{key,title,items:[{id,name,icon},…]}]}
      if (Array.isArray(reg?.categories)) {
        return reg.categories.map(cat=>({
          title: cat.title || cat.name || cat.key || 'Kategorie',
          items: (cat.items || cat.buildings || []).map(b => ({
            id: b.id || b.key || b.type || b.name,
            name: b.name || b.title || (b.id || '').replace(/_/g,' '),
            icon: resolveIcon(b),
            raw:  b
          }))
        }));
      }
      // B) {buildings:[…]} flach → in eine Kategorie packen
      if (Array.isArray(reg?.buildings)) {
        return [{
          title: 'Bauen',
          items: reg.buildings.map(b=>({
            id: b.id || b.key || b.type || b.name,
            name: b.name || b.title || (b.id || '').replace(/_/g,' '),
            icon: resolveIcon(b),
            raw:  b
          }))
        }];
      }
      // C) Map {groupKey:[…]}
      if (reg && typeof reg === 'object'){
        const groups = [];
        for (const [k, list] of Object.entries(reg)){
          if (!Array.isArray(list)) continue;
          groups.push({
            title: k,
            items: list.map(b=>({
              id: b.id || b.key || b.type || b.name,
              name: b.name || b.title || (b.id || '').replace(/_/g,' '),
              icon: resolveIcon(b),
              raw: b
            }))
          });
        }
        if (groups.length) return groups;
      }
    }catch(e){
      warn('normalizeFromRegistryLike Fehler: '+e.message);
    }
    return null;
  }

  function normalizeFromMonolithLike(){
    // fallback auf globale Sammlungen, die wir in älteren Ständen hatten
    const globs = [
      // very old
      (window.BUILDINGS && { buildings: window.BUILDINGS }),
      // monolithische Arrays
      (window.buildingTypes && { buildings: window.buildingTypes }),
      // einzelne Module
      (window.LUMBERJACK_FRAMES && {
        categories:[{
          title:'Produktion / Rohstoffe',
          items: (window.LUMBERJACK_FRAMES||[])
                  .filter(x=>x.role==='BuildMenu')
                  .map(x=>({
                    id: 'holzfaeller',
                    name:'Holzfäller',
                    icon: 'assets/buildings/holzfaeller.png'
                  }))
        }]
      })
    ].filter(Boolean)[0];

    return normalizeFromRegistryLike(globs);
  }

  function normalizeAllSources(){
    // neue Registry
    const r1 = normalizeFromRegistryLike(window.Registry || window.registry || window.__REGISTRY);
    if (r1 && r1.some(g=>g.items.length)) return r1;

    // Entities-Registry Wrapper
    const ent = window.EntitiesRegistry || window['entities.registry'];
    if (ent && typeof ent.getAll === 'function'){
      try{
        const all = ent.getAll(); // erhofft: {categories:[…]} oder {buildings:…}
        const r2 = normalizeFromRegistryLike(all);
        if (r2 && r2.some(g=>g.items.length)) return r2;
      }catch(e){ warn('EntitiesRegistry.getAll() → '+e.message); }
    }

    // monolithische/ältere Stände
    const r3 = normalizeFromMonolithLike();
    if (r3 && r3.some(g=>g.items.length)) return r3;

    return [];
  }

  // ---- Render ------------------------------------------------------------------
  function iconCell(src, alt){
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = src;
    img.alt = alt || '';
    img.width = 96; img.height = 72;
    img.style.width = '96px'; img.style.height = '72px';
    img.style.objectFit = 'contain';
    return img;
  }

  function buttonFor(item){
    const btn = document.createElement('button');
    btn.className = 'ui-build-btn';
    btn.setAttribute('type','button');
    btn.setAttribute('data-build-id', item.id);

    const cell = document.createElement('div');
    cell.className = 'img';
    cell.appendChild(iconCell(item.icon, item.name));

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = item.name || item.id;

    btn.appendChild(cell);
    btn.appendChild(label);

    btn.onclick = () => {
      // Event (neutral)
      dispatch('cb:build:select', { id:item.id, item });

      // kompatibles Tool-Hooking
      try { window.GameTool?.set?.('build', item.id); } catch(_) {}
      try { window.Game?.setBuildTarget?.(item.id); } catch(_) {}
      ok(`select ${item.id}`);
      // Dock offen lassen, damit man mehrere baut
    };
    return btn;
  }

  function section(title){
    const s = document.createElement('section');
    s.className = 'ui-build-section';
    const h = document.createElement('h3');
    h.textContent = title || 'Kategorie';
    s.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'grid';
    s.appendChild(grid);
    return { section:s, grid };
  }

  function emptyHint(msg){
    const div = document.createElement('div');
    div.className = 'ui-build-empty';
    div.textContent = msg || 'Keine Gebäude verfügbar';
    return div;
  }

  function cssOnce(){
    if (cssOnce._done) return; cssOnce._done = true;
    const css = `
    .ui-build-dock, #build-panel{
      position:fixed; left:0; right:0; bottom:0; z-index:1000;
      display:block; transform:translateY(110%); transition:transform .24s ease, opacity .24s ease;
      background:rgba(20,24,28,.92); backdrop-filter:blur(6px);
      border-top:1px solid rgba(255,255,255,.08); color:#e9eef4; opacity:0;
      --build-dock-max-h: 320px; max-height: var(--build-dock-max-h); overflow:auto;
      padding:12px 12px 18px;
    }
    .ui-build-dock.is-open, #build-panel.is-open{ transform:none; opacity:1; }
    .ui-build-section{ margin:8px 4px 14px; }
    .ui-build-section>h3{ margin:0 0 8px; font:600 14px/1.25 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; opacity:.85 }
    .ui-build-section>.grid{
      display:grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap:10px;
    }
    .ui-build-btn{
      display:grid; grid-template-rows: 1fr auto; gap:6px;
      align-items:center; justify-items:center;
      padding:8px; border-radius:12px; border:1px solid rgba(255,255,255,.12);
      background:rgba(10,12,14,.66); color:#e9eef4; cursor:pointer;
    }
    .ui-build-btn .img{ display:flex; align-items:center; justify-content:center; width:100%; height:76px }
    .ui-build-btn .label{ font-size:13px; line-height:1.25; text-align:center; opacity:.95; }
    .ui-build-empty{
      padding:12px; margin:6px; border-radius:10px;
      background:rgba(10,12,14,.66); border:1px dashed rgba(255,255,255,.15); text-align:center;
    }
    @media (min-width: 920px){
      .ui-build-section>.grid{ grid-template-columns: repeat(6,minmax(0,1fr)); }
    }`;
    const style = document.createElement('style');
    style.setAttribute('data-ui-build','1');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---- Public API --------------------------------------------------------------
  const API = {
    version: VER,
    _groups: [],
    isOpen(){ return rootEl().classList.contains('is-open'); },
    open(){ openDock(); this.render(); },
    close(){ closeDock(); },
    toggle(){ this.isOpen() ? this.close() : this.open(); },
    render(){
      cssOnce();
      const host = rootEl();
      host.innerHTML = '';
      const groups = (this._groups = normalizeAllSources());
      if (!groups || !groups.some(g=>g.items.length)){
        warn('Keine Gebäudedaten → leerer Hinweis');
        host.appendChild(emptyHint('Keine Gebäude verfügbar'));
        return;
      }
      for (const g of groups){
        const s = section(g.title);
        for (const it of g.items){
          if (!it?.id) continue;
          s.grid.appendChild(buttonFor(it));
        }
        host.appendChild(s.section);
      }
    }
  };

  // ---- Event-Wiring ------------------------------------------------------------
  // Globale Bridge
  window.GameUI = window.GameUI || {};
  window.GameUI.openBuild   = ()=> API.open();
  window.GameUI.closeBuild  = ()=> API.close();
  window.GameUI.toggleBuild = ()=> API.toggle();

  // Fallback-Events (beide Schreibweisen)
  window.addEventListener('cb:assets-ready', ()=> { log(`Event 'cb:assets-ready' → re-render`); API.render(); });
  window.addEventListener('cb:game-start',   ()=> { log(`Event 'cb:game-start' → re-render`);   API.render(); });
  window.addEventListener('cb:assets:ready', ()=> { API.render(); });
  window.addEventListener('cb:game:start',   ()=> { API.render(); });

  // kurzer „Hallo“
  ok(`bereit (${VER})`);
})();
