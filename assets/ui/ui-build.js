/* ============================================================================
 * ui-build.js — Tab-Dock fürs Bauen (auto aus BUILD_CATEGORIES)
 * Version: v17.6.0
 * Projekt: Neue Siedler
 *
 * Ziele
 *  - Tabs und Items automatisch aus window.BUILD_CATEGORIES generieren
 *  - „todo“-Items deaktiviert (klicksicher)
 *  - Auswahl sendet cb:build-select {type}
 *  - Abwärtskompatibel: Fallback-Kategorien, falls BUILD_CATEGORIES fehlt
 *  - Saubere Open/Close-Logik, keine Pointer-Blockade im Closed-State
 *
 * Events (dispatch)
 *  - cb:build-open / cb:build-close
 *  - cb:build-select {type}
 *
 * Abhängigkeiten
 *  - optional: window.BUILD_CATEGORIES (build.categories.js)
 *  - CBLog (Polyfill reicht)
 *  - index.html: <link rel="stylesheet" href="assets/ui/ui-build.css?...">
 * ========================================================================== */
(function(){
  'use strict';

  var VER = 'v17.6.0';
  var MOD = '[ui-build]';

  // --- Logging ---------------------------------------------------------------
  function ok(m){ try{ (window.CBLog?.ok||console.log)(m); }catch(_){ console.log(m); } }
  function warn(m){ try{ (window.CBLog?.warn||console.warn)(m); }catch(_){ console.warn(m); } }
  function err(m){ try{ (window.CBLog?.err||console.error)(m); }catch(_){ console.error(m); } }

  // --- DOM-Refs / State ------------------------------------------------------
  var root = null;       // Dock-Container
  var tabs = null;       // Tabs-Leiste
  var pane = null;       // Items-Panel
  var _open = false;
  var _built = false;
  var _activeCat = null;

  // --- Fallback-Kategorien (abwärtskompatibel) -------------------------------
  function getFallbackCategories(){
    return [
      { id:'general', title:'Allg.', items:[
        { id:'hq',     label:'Hauptquartier', icon:(window.BUILD_ASSETS?.building?.hq)||null },
        { id:'depot',  label:'Depot',         icon:(window.BUILD_ASSETS?.building?.depot)||null },
      ]},
      { id:'production_food', title:'Produktion', items:[
        { id:'farm',        label:'Farm',        icon:(window.BUILD_ASSETS?.building?.farm)||null },
        { id:'lumberjack',  label:'Holzfäller',  icon:(window.BUILD_ASSETS?.building?.lumberjack)||null },
      ]},
      { id:'housing', title:'Wohnen', items:[
        { id:'haeuser1', label:'Haus I',  icon:(window.BUILD_ASSETS?.building?.haeuser1)||null },
        { id:'haeuser2', label:'Haus II', icon:(window.BUILD_ASSETS?.building?.haeuser2)||null },
      ]},
    ];
  }

  function getCategories(){
    try{
      var cats = window.BUILD_CATEGORIES;
      if (!Array.isArray(cats) || !cats.length) return getFallbackCategories();
      return cats;
    }catch(_){
      return getFallbackCategories();
    }
  }

  // --- UI-Bau ----------------------------------------------------------------
  function ensureRoot(){
    if (root) return root;

    root = document.createElement('div');
    root.id = 'build-dock';
    // Hardening: z-Index unter FABs, geschlossen inert
    root.style.cssText = [
      'position:fixed',
      'left:12px',
      'bottom:96px',
      'width:min(520px, 94vw)',
      'max-height:66vh',
      'overflow:auto',
      'background:rgba(18,18,18,.96)',
      'color:#eaeaea',
      'border:1px solid #2f2f2f',
      'border-radius:12px',
      'box-shadow:0 18px 48px rgba(0,0,0,.45)',
      'backdrop-filter:blur(6px)',
      'z-index:2147483602',
      'display:none',
      'opacity:0',
      'pointer-events:none',
      'transition:opacity .18s ease',
    ].join(';');

    // Header
    var head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #2b2b2b;position:sticky;top:0;background:inherit;z-index:1;';
    var title = document.createElement('div');
    title.textContent = 'Bau-Menü';
    title.style.fontWeight = '800';
    var ver = document.createElement('div');
    ver.textContent = VER;
    ver.style.cssText = 'opacity:.55;font-size:12px;margin-left:auto;margin-right:8px;';
    var close = document.createElement('button');
    close.textContent = 'Schließen';
    close.style.cssText = 'background:transparent;border:1px solid #3a3a3a;color:#ddd;border-radius:6px;cursor:pointer;padding:6px 10px';
    close.addEventListener('click', function(){ toggle(false); });
    head.appendChild(title); head.appendChild(ver); head.appendChild(close);

    // Tabs
    tabs = document.createElement('div');
    tabs.id = 'build-tabs';
    tabs.style.cssText = 'display:flex;gap:8px;padding:10px 12px;border-bottom:1px solid #232323;position:sticky;top:48px;background:inherit;z-index:1;overflow:auto;';

    // Pane
    pane = document.createElement('div');
    pane.id = 'build-items';
    pane.style.cssText = 'padding:12px; display:grid; grid-template-columns: repeat(auto-fill, minmax(120px,1fr)); gap:10px;';

    root.appendChild(head);
    root.appendChild(tabs);
    root.appendChild(pane);

    document.body.appendChild(root);
    return root;
  }

  function applyTabStyles(btn, active){
    btn.style.padding = '8px 12px';
    btn.style.borderRadius = '10px';
    btn.style.border = '1px solid ' + (active ? '#1d4ed8' : '#2f2f2f');
    btn.style.background = active ? '#1d4ed8' : '#0f172a';
    btn.style.color = active ? '#fff' : '#c7d2fe';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = '700';
    btn.style.whiteSpace = 'nowrap';
  }

  function buildTabs(cats){
    tabs.innerHTML = '';
    cats.forEach(function(cat, idx){
      var b = document.createElement('button');
      b.textContent = cat.title || cat.id;
      b.dataset.tab = cat.id;
      applyTabStyles(b, idx===0);
      b.addEventListener('click', function(){
        _activeCat = cat.id;
        // re-style alle
        Array.prototype.forEach.call(tabs.querySelectorAll('button'), function(btn){
          applyTabStyles(btn, btn.dataset.tab===_activeCat);
        });
        buildItems(cat);
      });
      tabs.appendChild(b);
    });
    _activeCat = cats[0] && cats[0].id || null;
  }

  function buildItems(cat){
    pane.innerHTML = '';
    if (!cat || !Array.isArray(cat.items)) return;

    cat.items.forEach(function(it){
      var card = document.createElement('button');
      card.className = 'build-item';
      var disabled = !!it.todo;
      card.disabled = disabled;
      card.style.cssText = [
        'display:flex','flex-direction:column','align-items:center','justify-content:center',
        'gap:8px','padding:10px','border-radius:10px',
        'border:1px solid ' + (disabled ? '#3a3a3a' : '#2f2f2f'),
        'background:' + (disabled ? '#111827' : '#1f2937'),
        'color:' + (disabled ? '#9ca3af' : '#e2e8f0'),
        'cursor:' + (disabled ? 'not-allowed' : 'pointer'),
        'min-height:110px','text-align:center'
      ].join(';');

      // Icon
      var img = document.createElement('img');
      img.alt = it.label || it.id;
      img.draggable = false;
      img.style.cssText = 'width:48px;height:48px;object-fit:contain;opacity:'+(disabled?'.55':'1');
      img.src = it.icon || (window.BUILD_ASSETS?.ui?.buildMarker) || '';
      card.appendChild(img);

      // Label
      var lbl = document.createElement('div');
      lbl.textContent = (it.label || it.id);
      lbl.style.cssText = 'font-weight:700;font-size:14px;';
      card.appendChild(lbl);

      // Badge „TODO“
      if (disabled){
        var badge = document.createElement('div');
        badge.textContent = 'bald';
        badge.style.cssText = 'margin-top:-2px;font-size:11px;opacity:.75;';
        card.appendChild(badge);
      }

      if (!disabled){
        card.addEventListener('click', function(){
          try{
            // UI → Engine
            window.dispatchEvent(new CustomEvent('cb:build-select', { detail:{ type: it.id } }));
            (window.CBLog?.ok||console.log)(MOD+' Tool gesetzt: '+it.id);
            // (optional) Dock offen lassen, bis explizit geschlossen
          }catch(e){
            warn(MOD+' Select-Fehler: '+(e&&e.message));
          }
        });
      }

      pane.appendChild(card);
    });
  }

  function buildDock(){
    if (_built) return;
    ensureRoot();

    var cats = getCategories();
    if (!cats.length){
      pane.innerHTML = '<div style="opacity:.7">Keine Einträge</div>';
    } else {
      buildTabs(cats);
      buildItems(cats[0]);
    }

    _built = true;
    ok(MOD+' gebaut ('+VER+')');
  }

  // --- Open / Close ----------------------------------------------------------
  function setOpen(open){
    ensureRoot();
    if (open){
      root.style.display = 'block';
      // async, damit der Browser den Style anwenden kann
      requestAnimationFrame(function(){
        root.style.opacity = '1';
        root.style.pointerEvents = 'auto';
      });
      try{ window.dispatchEvent(new Event('cb:build-open')); }catch(_){}
      _open = true;
      ok(MOD+' geöffnet ('+VER+')');
    } else {
      root.style.opacity = '0';
      root.style.pointerEvents = 'none';
      setTimeout(function(){
        root.style.display = 'none';
        try{ window.dispatchEvent(new Event('cb:build-close')); }catch(_){}
      }, 180);
      _open = false;
      ok(MOD+' geschlossen');
    }
  }

  function toggle(force){
    var want = (typeof force === 'boolean') ? !!force : !_open;
    if (want && !_built) buildDock();
    setOpen(want);
  }

  // --- Öffentliche API -------------------------------------------------------
  window.GameUI = window.GameUI || {};
  if (typeof window.GameUI.toggleBuild !== 'function'){
    window.GameUI.toggleBuild = function(force){
      try{ toggle(force); }catch(e){ err(MOD+' toggleBuild: '+(e&&e.message)); }
    };
  }

  // --- Reaktion auf dynamisch nachladbare Kategorien -------------------------
  window.addEventListener('cb:build-categories-ready', function(ev){
    try{
      var cats = ev?.detail?.categories;
      if (!Array.isArray(cats) || !cats.length) return;
      // Nur neu bauen, wenn wir noch nicht gebaut haben
      if (_built) return;
      buildDock();
    }catch(e){
      warn(MOD+' cats-ready: '+(e&&e.message));
    }
  });

  // --- Init ------------------------------------------------------------------
  function init(){
    try{
      // nichts automatisch öffnen; nur bauen, wenn nötig
      ok(MOD+' geladen ('+VER+')');
    }catch(e){
      err(MOD+' Init-Fehler: '+(e&&e.message));
    }
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();
