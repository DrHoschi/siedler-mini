// ============================================================================
// Datei : ui/ui-build.js
// Projekt: Neue Siedler
// Version: v1.0.1
// Zweck : Baumenü rendern (Kategorien → Items) + Auswahl-Feedback
// Events: hört   auf cb:registry-ready (Alias: cb:registry:ready)
//         sendet cb:build:select  { id }  beim Klick auf ein Gebäude
// Hinweise:
//   • Kein globaler STATE – nur lokaler Status (activeCat, activeItem).
//   • Setzt bei Auswahl .is-selected (und .active als Fallback).
//   • Reagiert auch auf externes cb:build:select → Highlight synchron.
// ============================================================================
(() => {
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[ui-build]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[ui-build]', ...a);
  const EVT  = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
  const q    = (sel) => document.querySelector(sel);

  let activeCat  = null;
  let activeItem = null;

  // ---- DOM scaffold ---------------------------------------------------------
  function ensureLists() {
    const dock = q('#build-dock');
    if (!dock) { warn('Container #build-dock fehlt – index.html prüfen'); return null; }
    if (!dock.querySelector('#build-cats')) {
      const h2    = dock.querySelector('h2') || Object.assign(document.createElement('h2'), { textContent:'Baumenü' });
      const cats  = Object.assign(document.createElement('ul'), { id:'build-cats',  className:'build-cats'  });
      const sep   = document.createElement('hr');
      const items = Object.assign(document.createElement('ul'), { id:'build-items', className:'build-items' });
      dock.append(h2, cats, sep, items);
    }
    return { cats: q('#build-cats'), items: q('#build-items') };
  }

  // ---- Datenquelle (Registry → ViewModel) ----------------------------------
  function readData() {
    if (window.BuildBridge?.view) return window.BuildBridge.view();
    const cats = (window.Registry?.get?.('categories') || []).map(c => ({
      id: String(c.id), label: String(c.label ?? c.id),
    }));
    const buildings = (window.Registry?.get?.('buildings') || []).map(b => ({
      id   : String(b.id),
      cat  : String(b.cat ?? 'misc'),
      label: String(b.label ?? b.id),
      icon : b.icon || '',
      cost : b.cost || null,
    }));
    return { cats, buildings };
  }

  // ---- Helpers --------------------------------------------------------------
  function applyCatHighlight(root){
    root.querySelectorAll('li').forEach(li => li.classList.toggle('active', li.dataset.cat === activeCat));
  }
  function applyItemHighlight(root){
    root.querySelectorAll('li').forEach(li => {
      li.classList.remove('is-selected','active');
      if (li.dataset.id === activeItem){ li.classList.add('is-selected','active'); }
    });
  }

  // ---- Render ---------------------------------------------------------------
  function renderCats(root, cats){
    root.innerHTML = '';
    cats.forEach((c, idx) => {
      const li = document.createElement('li');
      li.className = 'build-cat';
      li.dataset.cat = c.id;
      li.textContent = c.label;
      if (!activeCat && idx === 0) activeCat = c.id;
      root.appendChild(li);
      li.addEventListener('click', () => {
        activeCat = c.id;
        applyCatHighlight(root);
        renderItems(q('#build-items'), readData().buildings);
      });
    });
    applyCatHighlight(root);
  }

  function renderItems(root, buildings){
    root.innerHTML = '';
    const list = buildings.filter(b => b.cat === activeCat);
    list.forEach(b => {
      const li = document.createElement('li');
      li.className = 'build-item'; li.dataset.id = b.id;

      if (b.icon){
        const img = document.createElement('img'); img.loading='lazy'; img.decoding='async';
        img.src = b.icon; img.alt = b.label; li.appendChild(img);
      }
      const label = document.createElement('span'); label.className='label'; label.textContent = b.label; li.appendChild(label);

      if (b.cost){
        const small = document.createElement('small');
        const w=+b.cost.wood||0, s=+b.cost.stone||0, g=+b.cost.gold||0;
        small.textContent = `  [Holz:${w} Stein:${s}${g?' Gold:'+g:''}]`;
        small.style.opacity='.75'; small.style.marginLeft='6px';
        li.appendChild(small);
      }

      li.addEventListener('click', () => {
        activeItem = b.id
