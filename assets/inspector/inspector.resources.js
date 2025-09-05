/* ============================================================================
 * assets/inspector/inspector.resources.js — v18.10.5
 * Projekt: Neue Siedler
 * Zweck:
 *   - Inspector-Tab „Ressourcen“: Hinzufügen / Anzeigen
 *   - Event → window.dispatchEvent(new CustomEvent('cb:add-resources',{detail:{type,amount}}))
 *   - Direkter Call → Game.addResources?(type, amount)
 *   - Fallback-„Inventar“ in window.__CB.inventory, falls Game-API noch fehlt
 *
 * CODE-STYLE:
 *   - Sanfte Logs via CBLog (fällt zurück auf console.*)
 *   - Keine harten Abhängigkeiten: läuft auch ohne Game/Engine
 *   - Modul registriert sich bei __INSPECTOR_API__ (split setup)
 * ========================================================================== */

(function(){
  'use strict';

  var MOD = '[inspector.resources]';
  var info = (window.CBLog?.info || console.log).bind(console, MOD);
  var warn = (window.CBLog?.warn || console.warn).bind(console, MOD);

  // zentrale App-Var
  window.__CB = window.__CB || {};
  var STORE = window.__CB;

  // kleines, simples Inventar als Fallback
  STORE.inventory = STORE.inventory || Object.create(null);

  function addToInventory(type, amount){
    var t = String(type||'').trim();
    var a = Math.max(1, amount|0);
    if(!t) return;
    STORE.inventory[t] = (STORE.inventory[t]|0) + a;
  }

  function getInventoryPairs(){
    var out = [];
    var inv = STORE.inventory || {};
    for (var k in inv){
      if (Object.prototype.hasOwnProperty.call(inv,k)){
        out.push([k, inv[k]|0]);
      }
    }
    // sortiert nach Name
    out.sort(function(a,b){ return a[0].localeCompare(b[0]); });
    return out;
  }

  // UI-Bausteine --------------------------------------------------------------
  function row(label, nodeRight){
    var line = document.createElement('div');
    line.style.cssText = 'display:flex;align-items:center;gap:8px;margin:6px 0';
    var l = document.createElement('div');
    l.textContent = label;
    l.style.cssText = 'min-width:120px;opacity:.85';
    line.appendChild(l);
    line.appendChild(nodeRight);
    return line;
  }

  function makeInputText(ph, id){
    var el = document.createElement('input');
    el.type = 'text'; el.placeholder = ph||''; if (id) el.id = id;
    el.autocomplete = 'off';
    el.style.cssText = 'flex:1;min-width:0;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.06);color:#e8e8e8';
    return el;
  }
  function makeInputNumber(ph, id){
    var el = document.createElement('input');
    el.type = 'number'; el.placeholder = ph||''; if (id) el.id = id;
    el.min = '1'; el.step = '1'; el.value = '10';
    el.style.cssText = 'width:120px;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.06);color:#e8e8e8;text-align:right';
    return el;
  }
  function makeButton(txt){
    var b = document.createElement('button');
    b.textContent = txt;
    b.style.cssText = 'border:none;border-radius:10px;padding:8px 12px;cursor:pointer;background:#3A6FD8;color:#fff;box-shadow:0 2px 0 rgba(0,0,0,.25)';
    b.onpointerdown = function(e){ e.stopPropagation(); };
    return b;
  }

  function makeBadge(txt, kind){
    var d = document.createElement('span');
    d.textContent = txt;
    var bg = kind==='ok' ? 'rgba(76,175,80,.25)' : (kind==='warn'?'rgba(255,193,7,.22)':'rgba(255,255,255,.12)');
    var col= kind==='ok' ? '#a5e5a7' : (kind==='warn'?'#ffd66b':'#cbd5e1');
    d.style.cssText = 'display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;background:'+bg+';color:'+col+';border:1px solid rgba(255,255,255,.08)';
    return d;
  }

  // Tab-Renderer --------------------------------------------------------------
  function renderResourcesTab(target){
    // Container
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px';

    // Eingaben
    var typeInp = makeInputText('Ressource (z.B. wood, stone, grain)', 'ins-res-type');
    var amtInp  = makeInputNumber('Menge', 'ins-res-amt');

    wrap.appendChild(row('Ressource', typeInp));
    wrap.appendChild(row('Menge', amtInp));

    // Statuszeile
    var status = document.createElement('div');
    status.style.cssText = 'min-height:1.2em;font-size:12px;opacity:.85';
    wrap.appendChild(status);

    // Aktionen
    var btnAdd = makeButton('Hinzufügen');
    btnAdd.addEventListener('click', function(){
      var t = String(typeInp.value||'').trim();
      var a = Math.max(1, parseInt(amtInp.value||'0',10)||0);
      if(!t){ status.innerHTML='Bitte Ressourcentyp angeben.'; status.prepend(makeBadge('Hinweis')); warn('ohne Typ'); return; }

      // 1) Event für lose gekoppelte Systeme
      try { window.dispatchEvent(new CustomEvent('cb:add-resources',{detail:{type:t, amount:a}})); } catch(_){}

      // 2) Direkter Call, falls vorhanden
      var directOk=false;
      try { if(window.Game && typeof Game.addResources==='function'){ Game.addResources(t,a); directOk=true; } } catch(_){}

      // 3) Fallback (lokales Inventar)
      if(!directOk){ addToInventory(t,a); }

      status.innerHTML='';
      status.appendChild(makeBadge('+ '+a+' '+t, 'ok'));
      status.append(' hinzugefügt'+(directOk?' (Game)':' (lokal)')+'.');

      info('add %s x%d (%s)', t, a, directOk?'game':'local');

      refreshInventory(listBox); // unten definiert
    });

    wrap.appendChild(btnAdd);

    // Inventarliste
    var listBox = document.createElement('div');
    listBox.style.cssText = 'margin-top:8px;display:grid;grid-template-columns:1fr auto;row-gap:6px;column-gap:10px';
    wrap.appendChild(listBox);

    function refreshInventory(box){
      box.innerHTML='';
      var pairs = getInventoryPairs();
      if(!pairs.length){
        var em = document.createElement('div');
        em.textContent = 'Noch keine lokalen Ressourcen.';
        em.style.cssText = 'opacity:.7';
        box.appendChild(em);
        return;
      }
      for (var i=0;i<pairs.length;i++){
        var k = pairs[i][0], v = pairs[i][1];
        var name = document.createElement('div'); name.textContent = k; name.style.cssText='opacity:.9';
        var val  = document.createElement('div'); val.textContent = String(v); val.style.cssText='opacity:.9;text-align:right';
        box.appendChild(name); box.appendChild(val);
      }
    }
    refreshInventory(listBox);

    // Render ins Ziel
    target.innerHTML = '';
    target.appendChild(wrap);
  }

  // Registrierung ins Inspector-Core -----------------------------------------
  // Erwartet __INSPECTOR_API__.registerTab({id,title,order,render})
  function tryRegister(){
    if (!window.__INSPECTOR_API__ || typeof window.__INSPECTOR_API__.registerTab!=='function') return false;
    window.__INSPECTOR_API__.registerTab({
      id: 'resources',
      title: 'Ressourcen',
      order: 30,
      render: function(ctx){
        // ctx: {root, body, footer, header, preLog?, api?}
        renderResourcesTab(ctx.body);
        // Fußleiste im Ressourcen-Tab ausblenden
        if (ctx.footer) ctx.footer.style.display='none';
      }
    });
    info('Tab registriert (v18.10.5)');
    return true;
  }

  // Wiederholt versuchen, bis inspector.core geladen ist
  if(!tryRegister()){
    var tries=0, t=setInterval(function(){
      tries++;
      if (tryRegister() || tries>40){ clearInterval(t); }
    }, 200);
  }
})();
