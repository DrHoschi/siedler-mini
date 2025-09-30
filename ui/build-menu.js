<!-- in deiner index.html: der Button + das Dock -->
<button id="btn-build" class="ui-btn-build" aria-expanded="false">Bauen</button>
<div id="build-dock" class="" hidden>
  <div class="wrap">
    <div class="dock-head">
      <ul id="build-cats"></ul>
    </div>
    <div id="build-list" class="build-list"></div>
  </div>
</div>

<script type="module">
(function(){
  const btn  = document.getElementById('btn-build');
  const dock = document.getElementById('build-dock');
  const ulCats = document.getElementById('build-cats');
  const list   = document.getElementById('build-list');

  let currentCat = null;
  let hydrated = false;

  function renderCats(){
    const cats = window.Registry?.get?.('categories') || [];
    ulCats.innerHTML = '';
    for(const c of cats){
      const li = document.createElement('li');
      li.className = 'build-cat';
      li.textContent = c.label || c.id;
      li.dataset.cat = String(c.id);
      li.addEventListener('click', ()=>{
        setActiveCat(c.id);
      });
      ulCats.appendChild(li);
    }
    if (cats.length){
      setActiveCat(cats[0].id);
    }
  }

  function setActiveCat(catId){
    currentCat = String(catId);
    [...ulCats.children].forEach(li=>{
      li.classList.toggle('active', li.dataset.cat === currentCat);
    });
    renderList();
  }

  function renderList(){
    const buildings = window.Registry?.get?.('buildings') || [];
    const iconsBase = window.Registry?.get?.('meta')?.iconsBase || '';
    const rows = buildings.filter(b => String(b.cat) === currentCat);

    list.innerHTML = '';
    for(const b of rows){
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'build-item';
      item.dataset.id = String(b.id);

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = b.label || b.id;

      const img = document.createElement('img');
      img.className = 'thumb';
      img.src = b.icon || (iconsBase ? (iconsBase + (b.icon||'')) : '');
      img.alt = b.label || b.id;

      const cost = document.createElement('div');
      cost.className = 'cost';
      const c = b.cost || {};
      [['wood','Holz'],['stone','Stein'],['gold','Gold']].forEach(([key,label])=>{
        const val = +c[key] || 0;
        // Zeig auch 0 an – gewünscht für HQ
        const pill = document.createElement('span');
        pill.className = 'res';
        pill.innerHTML = `<img src="assets/ui/res_${key}.png" alt=""> ${val}`;
        cost.appendChild(pill);
      });

      item.appendChild(title);
      item.appendChild(img);
      item.appendChild(cost);

      item.addEventListener('click', ()=>{
        // UI-Auswahl markieren
        [...list.children].forEach(el=>el.classList.remove('is-selected'));
        item.classList.add('is-selected');
        // Engine informieren
        window.dispatchEvent(new CustomEvent('cb:build:select', { detail: { id: b.id }}));
      });

      list.appendChild(item);
    }
  }

  function hydrate(){
    if (hydrated) return;
    hydrated = true;
    renderCats();
  }

  // Toggle öffnen/schließen
  btn?.addEventListener('click', ()=>{
    const open = dock.hasAttribute('hidden');
    if (open){
      hydrate();
      dock.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
    } else {
      dock.setAttribute('hidden','');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // Warten, bis Registry geladen ist, dann initialisieren
  window.addEventListener('cb:registry-ready', (e)=>{
    if (btn.getAttribute('aria-expanded') === 'true') hydrate();
  });
  // Kompat-Alias (falls ältere Events feuern)
  window.addEventListener('cb:registry:ready', (e)=>{
    if (btn.getAttribute('aria-expanded') === 'true') hydrate();
  });
})();
</script>
