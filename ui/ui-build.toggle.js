// ui/ui-build.toggle.js  (robust: Registry oder BUILD_CATEGORIES)
(function(){
  var btn  = document.getElementById('btn-build');
  var dock = document.getElementById('build-dock');
  var ulCats = document.getElementById('build-cats');
  var list   = document.getElementById('build-list');

  var hydrated = false;

  function fromRegistry(){
    var reg = window.Registry || {};
    var cats = (reg.get && reg.get('categories')) || [];
    var buildings = (reg.get && reg.get('buildings')) || [];
    var meta = (reg.get && reg.get('meta')) || {};
    return { source:'registry', cats:cats, buildings:buildings, iconsBase:(meta && meta.iconsBase)||'' };
  }

  function fromLegacy(){
    // Erwartet window.BUILD_CATEGORIES: [{id,title,items:[{id,label,icon}]}]
    var C = window.BUILD_CATEGORIES || [];
    var cats = [];
    var buildings = [];
    for (var i=0;i<C.length;i++){
      cats.push({ id:String(C[i].id), label:C[i].title||C[i].id });
      var items = C[i].items || [];
      for (var j=0;j<items.length;j++){
        var it = items[j];
        buildings.push({
          id:String(it.id),
          label:it.label||it.id,
          cat:String(C[i].id),
          icon:it.icon||'',
          cost:{}, size:[3,3], entrances:[[1,3]]
        });
      }
    }
    return { source:'legacy', cats:cats, buildings:buildings, iconsBase:'' };
  }

  function pickData(){
    var r = fromRegistry();
    if (r.cats.length && r.buildings.length) return r;
    var l = fromLegacy();
    return l;
  }

  function hydrate(){
    if (hydrated) return;
    hydrated = true;

    var data = pickData();
    renderCatsAndFirstList(data);
  }

  function renderCatsAndFirstList(data){
    if (!ulCats) return;

    ulCats.innerHTML = '';
    for (var i=0;i<data.cats.length;i++){
      (function(c){
        var li = document.createElement('li');
        li.className = 'build-cat';
        li.textContent = c.label || c.id;
        li.setAttribute('data-cat', c.id);
        li.addEventListener('click', function(){
          var kids = ulCats.children;
          for (var k=0;k<kids.length;k++){
            kids[k].classList.toggle('active', kids[k]===li);
          }
          renderList(data, c.id);
        });
        ulCats.appendChild(li);
      })(data.cats[i]);
    }

    // Erste aktiv
    if (ulCats.firstElementChild){
      ulCats.firstElementChild.classList.add('active');
      var firstId = ulCats.firstElementChild.getAttribute('data-cat');
      renderList(data, firstId);
    }
  }

  function renderList(data, catId){
    if (!list) return;
    list.innerHTML = '';

    for (var j=0;j<data.buildings.length;j++){
      var b = data.buildings[j];
      var match = (String(catId)==='all') || (String(b.cat)===String(catId));
      if (!match) continue;

      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'build-item';
      item.setAttribute('data-id', b.id);

      var t = document.createElement('div');
      t.className = 'title';
      t.textContent = b.label || b.id;

      var img = document.createElement('img');
      img.className = 'thumb';
      img.src = b.icon || (data.iconsBase ? (data.iconsBase + (b.icon||'')) : '');
      img.alt = b.label || b.id;

      var cost = document.createElement('div');
      cost.className = 'cost';
      var cst = b.cost || {};
      var keys = ['wood','stone','gold'];
      for (var ii=0; ii<keys.length; ii++){
        var key = keys[ii];
        var val = +cst[key] || 0;   // 0 anzeigen (HQ)
        var pill = document.createElement('span');
        pill.className = 'res';
        var icon = document.createElement('img'); icon.src = 'assets/ui/res_' + key + '.png'; icon.alt = '';
        pill.appendChild(icon);
        pill.appendChild(document.createTextNode(' ' + val));
        cost.appendChild(pill);
      }

      item.appendChild(t);
      item.appendChild(img);
      item.appendChild(cost);

      item.addEventListener('click', function(ev){
        var kids = list.children;
        for (var k=0;k<kids.length;k++) kids[k].classList.remove('is-selected');
        ev.currentTarget.classList.add('is-selected');
        var id = ev.currentTarget.getAttribute('data-id');
        window.dispatchEvent(new CustomEvent('cb:build:select', { detail: { id: id } }));
      });

      list.appendChild(item);
    }
  }

  // Toggle öffnen/schließen
  if (btn){
    btn.addEventListener('click', function(){
      if (!dock) return;
      var open = dock.hasAttribute('hidden');
      if (open){
        hydrate();      // hydrieren beim Öffnen
        dock.removeAttribute('hidden');
        btn.setAttribute('aria-expanded', 'true');
      } else {
        dock.setAttribute('hidden','');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Wenn Registry später fertig wird und Dock bereits offen ist → hydrieren
  window.addEventListener('cb:registry-ready', function(){
    if (btn && btn.getAttribute('aria-expanded') === 'true') hydrate();
  });
  window.addEventListener('cb:registry:ready', function(){
    if (btn && btn.getAttribute('aria-expanded') === 'true') hydrate();
  });
  // Legacy-Quelle: falls jemand darauf hört
  window.addEventListener('cb:build-categories-ready', function(){
    if (btn && btn.getAttribute('aria-expanded') === 'true') hydrate();
  });
})();
