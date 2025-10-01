<!-- ui/ui-build.js -->
<script>
/* ============================================================================
 * Datei   : ui/ui-build.js
 * Version : v2.0.0 (2025-10-01)
 * Zweck   : Build-Dock
 * API     : window.UIBuild
 *           - mount(hostEl)
 *           - setCategories(cats)
 *           - setItems(items)
 *           - rerender()
 *           - open()/close()  (optional)
 *
 * Datenformat:
 *   categories: [{ id: "infra", label: "Infrastruktur" }, ...]
 *   items:      [{ id:"lumber", cat:"prod", label:"Holzfäller",
 *                  icon:"assets/...", cost:{wood:6,stone:2,food:0,gold:0},
 *                  enabled:true }, ...]
 *
 * Verhalten:
 *   - Wenn die Bridge Daten liefert → benutzen.
 *   - Wenn keine Bridge-Daten da → Fallback: Registry lesen.
 *   - Mount-Ziel: <aside id="build-panel"> (dein Host) – NICHT #build-dock.
 *     #build-dock bleibt als dunkler Hintergrund bestehen.
 * ========================================================================== */
(function(){
  'use strict';

  // --- kleines Log-Utility ---------------------------------------------------
  const LOG = (window.CBLog && CBLog.info) ? CBLog : console;

  // --- State -----------------------------------------------------------------
  let host = null;                 // Mount-Host (z. B. #build-panel)
  let cats = [];                   // Kategorien (sichtbar)
  let items = [];                  // Items (sichtbar)
  let activeCat = null;            // akt. Kategorie-ID
  let activeItem = null;           // akt. Item-ID

  // Resource-Icons für Kosten-Badges
  const RES_ICON = {
    wood:  'assets/icons/resources/wood.png',
    stone: 'assets/icons/resources/stone.png',
    food:  'assets/icons/resources/food.png',
    gold:  'assets/icons/resources/gold.png'
  };

  // --- DOM-Helfer ------------------------------------------------------------
  const $ = (sel, root=document) => root.querySelector(sel);

  function ensureScaffold(){
    if (!host) return null;

    // Container-Struktur (einmalig)
    if (!host.querySelector('.ui-build-wrap')){
      host.innerHTML = '';
      const wrap  = document.createElement('div'); wrap.className = 'ui-build-wrap';
      const catsU = document.createElement('ul');  catsU.id = 'build-cats';  catsU.className = 'build-cats';
      const listU = document.createElement('ul');  listU.id = 'build-items'; listU.className = 'build-list';
      wrap.append(catsU, listU);
      host.appendChild(wrap);
    }
    // Sichtbar machen
    host.hidden = false;
    host.classList.remove('hidden');

    // Dock-Hintergrund ebenfalls sichtbar (bleibt deine dunkle Leiste)
    const dock = document.getElementById('build-dock');
    if (dock){ dock.hidden = false; dock.classList.remove('hidden'); }

    return { cats: $('#build-cats', host), items: $('#build-items', host) };
  }

  // --- Datenquellen ----------------------------------------------------------
  function fallbackFromRegistry(){
    // versucht, aus Registry zu lesen (wenn Bridge nix geliefert hat)
    const regCats  = (window.Registry?.get?.('categories') || []).map(c => ({
      id: String(c.id), label: String(c.label ?? c.id)
    }));
    const regItems = (window.Registry?.get?.('buildings')  || []).map(b => ({
      id: String(b.id),
      cat: String(b.cat ?? b.category ?? 'misc'),
      label: String(b.label ?? b.name ?? b.id),
      icon: (b.icon || b.sprite || ''),
      cost: (b.cost || null),
      enabled: (b.enabled !== false)
    }));
    return { regCats, regItems };
  }

  // --- Rendering -------------------------------------------------------------
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
    const img  = document.createElement('img');  img.src = RES_ICON[key] || ''; img.alt = key;
    const txt  = document.createElement('b');    txt.textContent = String(amount);
    span.append(img, txt);
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

      const thumb = document.createElement('img');
      thumb.className = 'thumb';
      thumb.loading = 'lazy';
      thumb.decoding = 'async';
      if (b.icon) { thumb.src = b.icon; thumb.alt = b.label; }

      const cost = document.createElement('div');
      cost.className = 'cost';
      const c = b.cost || {};
      ['wood','stone','food','gold'].forEach(k => {
        const node = resBadge(k, c[k]);
        if (node) cost.appendChild(node);
      });

      li.append(title, thumb, cost);
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

    // wenn noch keine Daten gesetzt → Registry-Fallback probieren
    if (!cats.length || !items.length){
      const { regCats, regItems } = fallbackFromRegistry();
      if (!cats.length)  cats  = regCats;
      if (!items.length) items = regItems;
    }

    // wenn weiterhin leer → keine Anzeige (aber kein Fehler)
    if (!cats.length){
      LOG.info('[ui-build] keine Kategorien – nichts zu rendern');
      els.cats.innerHTML  = '';
      els.items.innerHTML = '';
      return;
    }

    renderCats(els.cats);
    renderItems(els.items);
    LOG.info('[ui-build] rerender ✓ (%d cats / %d items)', cats.length, items.length);
  }

  // --- Öffentliche API -------------------------------------------------------
  window.UIBuild = {
    mount(el){
      host = el || document.getElementById('build-panel');
      rerender();
    },
    setCategories(nextCats){
      cats = (Array.isArray(nextCats) ? nextCats : []).map(c => ({
        id: String(c.id), label: String(c.label ?? c.id)
      }));
      // activeCat bei Bedarf „heilen“
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

  // --- Lebenszyklus-Hooks ----------------------------------------------------
  // Falls die Bridge schon Daten gesendet hat, rendert mount/rerender.
  // Andernfalls hören wir auf Registry/Start und ziehen uns Daten selbst.
  window.addEventListener('cb:registry-ready',  () => { UIBuild.open();  UIBuild.rerender(); });
  window.addEventListener('cb:registry:ready',  () => { UIBuild.open();  UIBuild.rerender(); });
  window.addEventListener('cb:game-start',      () => { UIBuild.open();  UIBuild.rerender(); });

  // Sicherheits-Init (falls alles sehr früh kam)
  setTimeout(() => { if (!host) UIBuild.mount(document.getElementById('build-panel')); }, 0);
})();
</script>

<style>
/* Mini-Styles (falls ui-build.css noch leer ist) – bewusst kompakt */
#build-panel .ui-build-wrap{ display:grid; gap:10px; padding:12px; }
#build-cats{ display:flex; gap:8px; margin:0; padding:0; list-style:none; }
#build-cats .build-cat{ padding:8px 10px; border-radius:8px; background:#2b3138; color:#e6f0ff; cursor:pointer; }
#build-cats .build-cat.active{ outline:2px solid #8ab4f8; }

#build-items{ display:grid; grid-template-columns: repeat(auto-fill, minmax(140px,1fr)); gap:10px;
              margin:0; padding:0; list-style:none; }
#build-items .build-item{ display:grid; gap:6px; padding:10px; border-radius:10px; background:#1f242a; color:#e6f0ff; }
#build-items .build-item.is-selected{ outline:2px solid #8ab4f8; }
#build-items .build-item .title{ font-weight:700; }
#build-items .build-item .thumb{ width:100%; height:84px; object-fit:contain; }
#build-items .build-item .cost{ display:flex; gap:10px; align-items:center; }
#build-items .build-item .cost .res{ display:inline-flex; gap:6px; align-items:center; }
#build-items .build-item .cost img{ width:16px; height:16px; }
</style>
