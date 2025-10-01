/* ============================================================================
 * Datei   : ui/ui-build.js
 * Version : v2.0.1 (2025-10-01)
 * Zweck   : Build-Dock UI + API (window.UIBuild)
 * API     : mount(host), setCategories(cats), setItems(items), rerender(),
 *           open(), close()
 * Daten   : categories[] = {id,label}, items[] = {id,cat,label,icon,cost,enabled}
 * ========================================================================== */
(function(){
  'use strict';

  const LOG = (window.CBLog && CBLog.info) ? CBLog : console;

  let host = null;          // Mount-Host (#build-panel)
  let cats = [];            // Kategorien
  let items = [];           // Items
  let activeCat = null;     // aktive Kategorie
  let activeItem = null;    // aktives Item

  const $ = (s, r=document)=>r.querySelector(s);

  function ensureScaffold(){
    if (!host) return null;
    if (!host.querySelector('.ui-build-wrap')){
      host.innerHTML = '';
      const wrap  = document.createElement('div'); wrap.className = 'ui-build-wrap';
      const catsU = document.createElement('ul');  catsU.id = 'build-cats';  catsU.className = 'build-cats';
      const listU = document.createElement('ul');  listU.id = 'build-items'; listU.className = 'build-list';
      wrap.append(catsU, listU);
      host.appendChild(wrap);
    }
    host.hidden = false; host.classList.remove('hidden');
    const dock = document.getElementById('build-dock');
    if (dock){ dock.hidden = false; dock.classList.remove('hidden'); }
    return { cats: $('#build-cats', host), items: $('#build-items', host) };
  }

  function fallbackFromRegistry(){
    const rc = (window.Registry?.get?.('categories') || []).map(c => ({
      id: String(c.id), label: String(c.label ?? c.id)
    }));
    const ri = (window.Registry?.get?.('buildings') || []).map(b => ({
      id: String(b.id),
      cat: String(b.cat ?? b.category ?? 'misc'),
      label: String(b.label ?? b.name ?? b.id),
      icon: (b.icon || b.sprite || ''),
      cost: (b.cost || null),
      enabled: (b.enabled !== false)
    }));
    return { rc, ri };
  }

  function applyCatHighlight(catRoot){
    catRoot.querySelectorAll('li').forEach(li =>
      li.classList.toggle('active', li.dataset.cat === activeCat)
    );
  }
  function applyItemHighlight(itemRoot){
    itemRoot.querySelectorAll('li').forEach(li => {
      const on = li.dataset.id === activeItem;
      li.classList.toggle('active', on);
      li.classList.toggle('is-selected', on);
    });
  }

  function renderCats(catRoot){
    catRoot.innerHTML = '';
    cats.forEach((c, idx) => {
      const li = document.createElement('li');
      li.className = 'build-cat';
      li.dataset.cat = c.id;
      li.textContent = c.label;
      if (!activeCat && idx === 0) activeCat = c.id;
      li.addEventListener('click', () => {
        activeCat = c.id;
        applyCatHighlight(catRoot);
        renderItems($('#build-items', host));
      });
      catRoot.appendChild(li);
    });
    applyCatHighlight(catRoot);
  }

  function resBadge(key, amount){
    if (!amount) return null;
    const span = document.createElement('span'); span.className = 'res';
    span.setAttribute('data-res', key);
    const b = document.createElement('b'); b.textContent = String(amount);
    span.appendChild(b);
    return span;
  }

  function renderItems(itemRoot){
    itemRoot.innerHTML = '';
    const visible = items
      .filter(b => b && b.enabled !== false)
      .filter(b => String(b.cat) === String(activeCat));

    visible.forEach(b => {
      const li = document.createElement('li');
      li.className = 'build-item';
      li.dataset.id = b.id;

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = b.label;

      const cost = document.createElement('div');
      cost.className = 'cost';
      const c = b.cost || {};
      ['wood','stone','food','gold'].forEach(k => {
        const node = resBadge(k, c[k]);
        if (node) cost.appendChild(node);
      });

      li.append(title, cost);
      li.addEventListener('click', () => {
        activeItem = b.id;
        applyItemHighlight(itemRoot);
        window.dispatchEvent(new CustomEvent('cb:build:select', { detail: { id: b.id }}));
      });

      itemRoot.appendChild(li);
    });

    applyItemHighlight(itemRoot);
  }

  function rerender(){
    const els = ensureScaffold(); if (!els) return;

    if (!cats.length || !items.length){
      const { rc, ri } = fallbackFromRegistry();
      if (!cats.length)  cats  = rc;
      if (!items.length) items = ri;
    }

    if (!cats.length){
      LOG.info('[ui-build] keine Kategorien – nix zu rendern');
      els.cats.innerHTML = ''; els.items.innerHTML = '';
      return;
    }

    renderCats(els.cats);
    renderItems(els.items);
    LOG.info('[ui-build] rerender ✓ (%d cats / %d items)', cats.length, items.length);
  }

  window.UIBuild = {
    mount(el){ host = el || document.getElementById('build-panel'); LOG.info('[ui-build] mount ok'); rerender(); },
    setCategories(nextCats){
      cats = (Array.isArray(nextCats) ? nextCats : []).map(c => ({
        id: String(c.id), label: String(c.label ?? c.id)
      }));
      if (!cats.find(c => c.id === activeCat)){ activeCat = cats[0]?.id || null; }
    },
    setItems(nextItems){
      items = (Array.isArray(nextItems) ? nextItems : []).map(b => ({
        id: String(b.id),
        cat: String(b.cat ?? b.category ?? 'misc'),
        label: String(b.label ?? b.name ?? b.id),
        icon: (b.icon || b.sprite || ''),
        cost: (b.cost || null),
        enabled: (b.enabled !== false)
      }));
    },
    rerender,
    open(){
      const dock = document.getElementById('build-dock');
      if (dock){ dock.hidden = false; dock.classList.remove('hidden'); }
      if (host){ host.hidden = false; host.classList.remove('hidden'); }
      rerender();
    },
    close(){
      const dock = document.getElementById('build-dock');
      if (dock){ dock.hidden = true; dock.classList.add('hidden'); }
      if (host){ host.hidden = true; host.classList.add('hidden'); }
    }
  };

  // Lifecycle-Hooks
  window.addEventListener('cb:registry-ready',  () => { UIBuild.open();  UIBuild.rerender(); });
  window.addEventListener('cb:registry:ready',  () => { UIBuild.open();  UIBuild.rerender(); });
  window.addEventListener('cb:game-start',      () => { UIBuild.open();  UIBuild.rerender(); });

  // Falls Bridge später kommt: minimal mounten
  setTimeout(() => { if (!host) UIBuild.mount(document.getElementById('build-panel')); }, 0);
})();

// ganz oben bei den Variablen:
var __iconsBase = 'assets/icon/buildings/';

// öffentlicher Setter (Bridge ruft das auf)
UIBuild.setIconsBase = function(base){
  if (typeof base === 'string' && base) __iconsBase = base.replace(/\/+$/,'') + '/';
};

// kleine Helper-Funktion, bevor du die Items renderst:
function iconSrcFor(item){
  // akzeptiert item.icon, item.iconId, item.iconPath
  if (item.icon && /^https?:|^data:|^\/|\.png$|\.webp$/.test(item.icon)) return item.icon;
  var name = item.icon || item.iconId || item.iconPath || '';
  if (name && !/\.(png|webp|jpg|jpeg|svg)$/.test(name)) name += '.png';
  return __iconsBase + name;
}

// beim Rendern der Item-Karten/Buttons: statt festem Pfad -> iconSrcFor(item)
var src = iconSrcFor(item);
// <img src=" + src + " ...>  bzw. style background-image:url(src)
