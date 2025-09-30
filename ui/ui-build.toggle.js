// ui/ui-build.toggle.js  (ES5/ES2015-kompatibel)
(function(){
  var btn  = document.getElementById('btn-build');
  var dock = document.getElementById('build-dock');
  var ulCats = document.getElementById('build-cats');
  var list   = document.getElementById('build-list');

  var hydrated = false;

  function renderWithExistingModule(){
    try{
      if (window.UIBuildCategories && typeof window.UIBuildCategories.renderAll === 'function'){
        window.UIBuildCategories.renderAll();
        return true;
      }
      if (window.UIBuild && typeof window.UIBuild.init === 'function'){
        window.UIBuild.init();
        return true;
      }
    }catch(e){}
    return false;
  }

  // Fallback-Renderer (nur falls kein bestehendes Modul vorhanden)
  function renderFallback(){
    var reg = window.Registry || {};
    var cats = (reg.get && reg.get('categories')) || [];
    var buildings = (reg.get && reg.get('buildings')) || [];
    var meta = (reg.get && reg.get('meta')) || {};
    var iconsBase = meta.iconsBase || '';

    // Kategorien leeren & neu aufbauen
    if (ulCats) ulCats.innerHTML = '';

    for (var i=0; i<cats.length; i++){
      (function(c){
        var li = document.createElement('li');
        li.className = 'build-cat';
        li.textContent = c.label || c.id;
        li.setAttribute('data-cat', String(c.id));
        li.addEventListener('click', function(){
          var kids = ulCats ? ulCats.children : [];
          for (var k=0; k<kids.length; k++){
            kids[k].classList.toggle('active', kids[k] === li);
          }
          renderList(c.id);
        });
        if (ulCats) ulCats.appendChild(li);
      })(cats[i]);
    }

    if (cats.length){
      if (ulCats && ulCats.firstElementChild) ulCats.firstElementChild.classList.add('active');
      renderList(cats[0].id);
    }

    function renderList(catId){
      if (!list) return;
      list.innerHTML = '';
      for (var j=0; j<buildings.length; j++){
        var b = buildings[j];
        if (String(b.cat) !== String(catId)) continue;

        var btnItem = document.createElement('button');
        btnItem.type = 'button';
        btnItem.className = 'build-item';
        btnItem.setAttribute('data-id', b.id);

        var t = document.createElement('div');
        t.className = 'title';
        t.textContent = b.label || b.id;

        var img = document.createElement('img');
        img.className = 'thumb';
        img.src = b.icon || (iconsBase ? iconsBase + (b.icon || '') : '');
        img.alt = b.label || b.id;

        var cost = document.createElement('div');
        cost.className = 'cost';
        var cst = b.cost || {};
        var keys = ['wood','stone','gold'];
        for (var ii=0; ii<keys.length; ii++){
          var key = keys[ii];
          var val = +cst[key] || 0;            // zeigt auch 0 an (HQ)
          var pill = document.createElement('span');
          pill.className = 'res';
          var icon = document.createElement('img');
          icon.src = 'assets/ui/res_' + key + '.png';
          icon.alt = '';
          pill.appendChild(icon);
          pill.appendChild(document.createTextNode(' ' + val));
          cost.appendChild(pill);
        }

        btnItem.appendChild(t);
        btnItem.appendChild(img);
        btnItem.appendChild(cost);

        btnItem.addEventListener('click', function(ev){
          var kids = list.children;
          for (var k=0; k<kids.length; k++) kids[k].classList.remove('is-selected');
          ev.currentTarget.classList.add('is-selected');
          var id = ev.currentTarget.getAttribute('data-id');
          window.dispatchEvent(new CustomEvent('cb:build:select', { detail: { id: id } }));
        });

        list.appendChild(btnItem);
      }
    }
  }

  function hydrate(){
    if (hydrated) return;
    hydrated = true;
    if (!renderWithExistingModule()){
      renderFallback();
    }
  }

  if (btn){
    btn.addEventListener('click', function(){
      if (!dock) return;
      var open = dock.hasAttribute('hidden');
      if (open){
        // falls Registry schon fertig
        try{
          if (window.Registry && window.Registry.get && window.Registry.get('buildings') && window.Registry.get('buildings').length){
            hydrate();
          }
        }catch(e){}
        dock.removeAttribute('hidden');
        btn.setAttribute('aria-expanded', 'true');
      } else {
        dock.setAttribute('hidden','');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Wenn die Registry erst nach dem Öffnen fertig wird
  window.addEventListener('cb:registry-ready', function(){
    if (btn && btn.getAttribute('aria-expanded') === 'true') hydrate();
  });
  window.addEventListener('cb:registry:ready', function(){
    if (btn && btn.getAttribute('aria-expanded') === 'true') hydrate();
  });
})();
