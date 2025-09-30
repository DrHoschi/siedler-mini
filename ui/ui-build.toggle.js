<script type="module">
(function(){
  const btn  = document.getElementById('btn-build');
  const dock = document.getElementById('build-dock');
  const ulCats = document.getElementById('build-cats');
  const list   = document.getElementById('build-list');

  let hydrated = false;

  function renderWithExistingModule(){
    // Versuche bekannte Oberflächen zu benutzen (dein vorhandenes Modul)
    // Passe diese Aufrufe an, falls deine Datei andere Namen exportiert.
    if (window.UIBuildCategories?.renderAll) {
      window.UIBuildCategories.renderAll();
      return true;
    }
    if (window.UIBuild?.init) {
      window.UIBuild.init(); // z.B. eigener Initializer
      return true;
    }
    return false;
  }

  // Minimaler Fallback-Renderer (nur wenn noch nichts gerendert wurde!)
  function renderFallback(){
    const cats = window.Registry?.get?.('categories') || [];
    const buildings = window.Registry?.get?.('buildings') || [];
    const meta = window.Registry?.get?.('meta') || {};
    const iconsBase = meta.iconsBase || '';

    // Kategorien
    ulCats.innerHTML = '';
    cats.forEach(c=>{
      const li = document.createElement('li');
      li.className = 'build-cat';
      li.textContent = c.label || c.id;
      li.dataset.cat = String(c.id);
      li.addEventListener('click', ()=>{
        [...ulCats.children].forEach(x=>x.classList.toggle('active', x===li));
        renderList(c.id);
      });
      ulCats.appendChild(li);
    });

    // Erste aktiv setzen
    if (cats.length){
      ulCats.firstElementChild?.classList.add('active');
      renderList(cats[0].id);
    }

    function renderList(catId){
      list.innerHTML = '';
      const rows = buildings.filter(b => String(b.cat) === String(catId));
      rows.forEach(b=>{
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'build-item';
        btn.dataset.id = b.id;

        const t = document.createElement('div');
        t.className = 'title'; t.textContent = b.label || b.id;

        const img = document.createElement('img');
        img.className = 'thumb';
        img.src = b.icon || (iconsBase ? iconsBase + (b.icon||'') : '');
        img.alt = b.label || b.id;

        const cost = document.createElement('div');
        cost.className = 'cost';
        const c = b.cost || {};
        [['wood','Holz'],['stone','Stein'],['gold','Gold']].forEach(([key,_label])=>{
          const val = +c[key] || 0;     // zeigt auch 0 an (HQ-Anforderung)
          const pill = document.createElement('span');
          pill.className = 'res';
          pill.innerHTML = `<img src="assets/ui/res_${key}.png" alt=""> ${val}`;
          cost.appendChild(pill);
        });

        btn.appendChild(t);
        btn.appendChild(img);
        btn.appendChild(cost);

        btn.addEventListener('click', ()=>{
          [...list.children].forEach(el=>el.classList.remove('is-selected'));
          btn.classList.add('is-selected');
          window.dispatchEvent(new CustomEvent('cb:build:select', { detail: { id: b.id }}));
        });

        list.appendChild(btn);
      });
    }
  }

  function hydrate(){
    if (hydrated) return;
    hydrated = true;
    if (!renderWithExistingModule()){
      // Nur fallbacken, wenn dein Modul nichts rendert
      renderFallback();
    }
  }

  // Toggle öffnen/schließen
  btn?.addEventListener('click', ()=>{
    const open = dock.hasAttribute('hidden');
    if (open){
      // Registry ist idR schon geladen; falls nicht, warten wir auf Event
      if (window.Registry?.get?.('buildings')?.length) hydrate();
      dock.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
    } else {
      dock.setAttribute('hidden','');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // Wenn nach Klick die Registry erst später fertig wird
  window.addEventListener('cb:registry-ready', (e)=>{
    if (btn.getAttribute('aria-expanded') === 'true') hydrate();
  });
  window.addEventListener('cb:registry:ready', (e)=>{
    if (btn.getAttribute('aria-expanded') === 'true') hydrate();
  });
})();
</script>
