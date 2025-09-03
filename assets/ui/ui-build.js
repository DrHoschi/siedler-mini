/* ============================================================================
 * ui-build.js — v17.7.0
 * Projekt: Neue Siedler
 *
 * Neu:
 *  - Tabs automatisch aus window.BUILD_CATEGORIES
 *  - Einzeilige, horizontal scrollende Icon-Leiste mit Pfeilen (← →)
 *  - todo:true Items sind deaktiviert
 *  - Auswahl sendet cb:build-select {type}
 *  - Rückwärtskompatibel: Falls BUILD_CATEGORIES fehlt → Fallback
 *  - Keine Pointer-Blockade im Closed-State
 * ========================================================================== */
(function(){
  'use strict';
  var VER='v17.7.0', MOD='[ui-build]';
  function ok(m){ try{ (window.CBLog?.ok||console.log)(m);}catch(_){console.log(m);} }
  function warn(m){ try{ (window.CBLog?.warn||console.warn)(m);}catch(_){console.warn(m);} }
  function err(m){ try{ (window.CBLog?.err||console.error)(m);}catch(_){console.error(m);} }

  // ---------- Kategorien (Fallback) -----------------------------------------
  function fallbackCats(){
    return [
      { id:'general', title:'Allg.', items:[
        { id:'hq',    label:'HQ' },
        { id:'depot', label:'Depot' },
      ]},
      { id:'production', title:'Produktion', items:[
        { id:'farm',       label:'Farm' },
        { id:'lumberjack', label:'Holzfäller' },
      ]},
      { id:'housing', title:'Wohnen', items:[
        { id:'haeuser1', label:'Haus1' },
        { id:'haeuser2', label:'Haus2' },
      ]},
      { id:'mil', title:'Militär (später)', items:[
        { id:'turm', label:'Turm', todo:true }
      ]}
    ];
  }
  function getCats(){
    try{
      var c = window.BUILD_CATEGORIES;
      return (Array.isArray(c) && c.length) ? c : fallbackCats();
    } catch(_){ return fallbackCats(); }
  }

  // ---------- DOM + State ----------------------------------------------------
  var root, head, tabs, trackWrap, track, leftBtn, rightBtn;
  var _built=false, _open=false, _activeCat=null;

  function ensureRoot(){
    if (root) return root;
    root = document.createElement('div');
    root.id='build-dock';
    root.style.cssText = [
      'position:fixed','left:12px','right:12px','bottom:96px',
      'margin:auto','max-width:1200px',
      'background:rgba(18,18,18,.96)','border:1px solid #2f2f2f',
      'border-radius:12px','box-shadow:0 18px 48px rgba(0,0,0,.45)',
      'backdrop-filter:blur(6px)','color:#eaeaea',
      'display:none','opacity:0','pointer-events:none','transition:opacity .18s',
      'z-index:2147483602'
    ].join(';');

    // Header
    head = document.createElement('div');
    head.style.cssText='display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #232323;';
    var title = document.createElement('div'); title.textContent='Menü'; title.style.cssText='font-weight:800';
    var ver   = document.createElement('div'); ver.textContent=VER; ver.style.cssText='opacity:.55;margin-left:auto;font-size:12px';
    var close = document.createElement('button'); close.textContent='Schließen';
    close.style.cssText='border:1px solid #3a3a3a;background:transparent;color:#ddd;border-radius:8px;padding:6px 10px;cursor:pointer';
    close.addEventListener('click', function(){ toggle(false); });
    head.appendChild(title);

    // Tabs-Zeile
    tabs = document.createElement('div');
    tabs.id='build-tabs';
    tabs.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-left:12px';
    head.appendChild(tabs);

    head.appendChild(ver); head.appendChild(close);

    // --- Einzeilige Leiste mit Pfeilen --------------------------------------
    var row = document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;padding:10px';

    leftBtn = document.createElement('button');
    leftBtn.innerHTML='&#x25C0;'; // ◀
    styleArrow(leftBtn);
    leftBtn.addEventListener('click', function(){ scrollBy(-1); });

    rightBtn = document.createElement('button');
    rightBtn.innerHTML='&#x25B6;'; // ▶
    styleArrow(rightBtn);
    rightBtn.addEventListener('click', function(){ scrollBy(1); });

    trackWrap = document.createElement('div');
    trackWrap.style.cssText = [
      'position:relative','flex:1 1 auto','overflow:hidden',
      'border:1px solid #2a2a2a','border-radius:10px','background:#0f172a'
    ].join(';');

    track = document.createElement('div');
    track.style.cssText = [
      'display:flex','gap:10px','align-items:center',
      'padding:10px','overflow:auto','scrollbar-width:thin'
    ].join(';');
    trackWrap.appendChild(track);

    row.appendChild(leftBtn);
    row.appendChild(trackWrap);
    row.appendChild(rightBtn);

    // Hinweislinie (optional)
    var hint = document.createElement('div');
    hint.id='build-hint';
    hint.style.cssText='padding:6px 10px;border-top:1px solid #232323;opacity:.7;font-size:12px';
    hint.textContent='Einzeilige Icon-Leiste. Wischen/Scrollen oder Pfeile nutzen.';

    root.appendChild(head);
    root.appendChild(row);
    root.appendChild(hint);
    document.body.appendChild(root);

    // Scroll per Wheel / Touch ist nativ; Pfeile bewegen seitenweise
    track.addEventListener('wheel', function(ev){
      if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) {
        track.scrollLeft += ev.deltaY;
        ev.preventDefault();
      }
      updateArrows();
    }, {passive:false});
    track.addEventListener('scroll', updateArrows);

    return root;
  }

  function styleArrow(btn){
    btn.style.cssText='width:42px;height:42px;border-radius:10px;border:1px solid #2f2f2f;background:#111827;color:#e5e7eb;cursor:pointer';
    btn.onfocus = ()=> btn.style.outline='2px solid #93c5fd';
    btn.onblur  = ()=> btn.style.outline='none';
  }
  function scrollBy(dir){
    var page = Math.max(100, trackWrap.clientWidth * 0.85);
    track.scrollTo({ left: track.scrollLeft + dir*page, behavior:'smooth' });
  }
  function updateArrows(){
    var max = track.scrollWidth - track.clientWidth - 1;
    leftBtn.disabled  = track.scrollLeft <= 0;
    rightBtn.disabled = track.scrollLeft >= max;
    var dis = 'opacity:.5;cursor:not-allowed';
    leftBtn.style.opacity  = leftBtn.disabled ? '.5': '1';
    rightBtn.style.opacity = rightBtn.disabled? '.5': '1';
  }

  // ---------- UI-Aufbau ------------------------------------------------------
  function buildTabs(cats){
    tabs.innerHTML='';
    cats.forEach(function(cat, i){
      var b=document.createElement('button');
      b.textContent = cat.title || cat.id;
      b.dataset.tab = cat.id;
      styleTab(b, i===0);
      b.addEventListener('click', function(){
        _activeCat = cat.id;
        Array.prototype.forEach.call(tabs.querySelectorAll('button'), function(btn){
          styleTab(btn, btn.dataset.tab===_activeCat);
        });
        buildRow(cat);
      });
      tabs.appendChild(b);
    });
    _activeCat = (cats[0] && cats[0].id) || null;
  }
  function styleTab(btn, active){
    btn.style.cssText=[
      'border:1px solid '+(active?'#1d4ed8':'#2f2f2f'),
      'background:'+(active?'#1d4ed8':'#0f172a'),
      'color:'+(active?'#fff':'#c7d2fe'),
      'border-radius:999px','padding:6px 12px',
      'cursor:pointer','font-weight:700'
    ].join(';');
  }

  function buildRow(cat){
    track.innerHTML='';
    if (!cat || !Array.isArray(cat.items)) return;
    cat.items.forEach(function(it){
      var card = document.createElement('button');
      var disabled = !!it.todo;
      card.className='build-item';
      card.disabled = disabled;
      card.style.cssText=[
        'display:flex','flex-direction:column','align-items:center','justify-content:center',
        'gap:6px','width:72px','min-width:72px','height:72px',
        'border-radius:10px','border:1px solid '+(disabled?'#3a3a3a':'#2f2f2f'),
        'background:'+(disabled?'#111827':'#1f2937'),
        'color:'+(disabled?'#9ca3af':'#e2e8f0'),
        'cursor:'+(disabled?'not-allowed':'pointer')
      ].join(';');

      var img=document.createElement('img');
      img.alt = it.label||it.id;
      img.src = it.icon || (window.BUILD_ASSETS?.ui?.buildMarker) || '';
      img.style.cssText='width:28px;height:28px;object-fit:contain;opacity:'+(disabled?'.6':'1');
      card.appendChild(img);

      var lbl=document.createElement('div');
      lbl.textContent=it.label||it.id;
      lbl.style.cssText='font-size:11px;line-height:1.1;opacity:.9';
      card.appendChild(lbl);

      if (disabled){
        var badge=document.createElement('div');
        badge.textContent='bald';
        badge.className='badge';
        badge.style.marginTop='-2px';
        card.appendChild(badge);
      } else {
        card.addEventListener('click', function(){
          try{
            window.dispatchEvent(new CustomEvent('cb:build-select',{detail:{type:it.id}}));
            (window.CBLog?.ok||console.log)(MOD+' Tool gesetzt: '+it.id);
          }catch(e){ warn(MOD+' Select-Fehler: '+(e&&e.message)); }
        });
      }

      track.appendChild(card);
    });
    // Nach Neuaufbau zum Anfang und Pfeile setzen
    track.scrollLeft = 0;
    updateArrows();
  }

  function buildDock(){
    if (_built) return;
    ensureRoot();
    var cats = getCats();
    buildTabs(cats);
    buildRow(cats[0]);
    _built = true;
    ok(MOD+' gebaut ('+VER+')');
  }

  // ---------- Open/Close -----------------------------------------------------
  function setOpen(open){
    ensureRoot();
    if (open){
      if(!_built) buildDock();
      root.style.display = 'block';
      requestAnimationFrame(function(){
        root.style.opacity='1';
        root.style.pointerEvents='auto';
      });
      try{ window.dispatchEvent(new Event('cb:build-open')); }catch(_){}
      _open=true; ok(MOD+' geöffnet ('+VER+')');
    } else {
      root.style.opacity='0';
      root.style.pointerEvents='none';
      setTimeout(function(){
        root.style.display='none';
        try{ window.dispatchEvent(new Event('cb:build-close')); }catch(_){}
      }, 180);
      _open=false; ok(MOD+' geschlossen');
    }
  }
  function toggle(force){
    var want = (typeof force==='boolean') ? force : !_open;
    setOpen(want);
  }

  // ---------- API ------------------------------------------------------------
  window.GameUI = window.GameUI || {};
  if (typeof window.GameUI.toggleBuild!=='function'){
    window.GameUI.toggleBuild = function(force){ try{ toggle(force);}catch(e){ err(MOD+' toggle: '+(e&&e.message)); } };
  }

  // Optionaler Hook: falls Kategorien später kommen
  window.addEventListener('cb:build-categories-ready', function(ev){
    if (_built) return;
    var cats = ev?.detail?.categories;
    if (Array.isArray(cats) && cats.length){
      buildDock();
    }
  });

  // ---------- Init -----------------------------------------------------------
  function init(){ ok(MOD+' geladen ('+VER+')'); }
  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else { init(); }
})();
