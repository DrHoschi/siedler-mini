// assets/ui/ui-build.js — v16.3.3
(function(){
  'use strict';

  var VERSION = 'v16.3.3';
  window.GameUI = window.GameUI || {};
  var GameUI = window.GameUI;

  // ---- styles (scoped) -----------------------------------------------------
  function injectStyle(){
    if (document.getElementById('ui-build-style')) return;
    var css = `
    .build-toggle{
      position:fixed; left:14px; bottom:18px; z-index:9;
      width:56px;height:56px;border-radius:50%;
      background:rgba(26,34,29,.85); color:#ffd08a; border:1px solid rgba(255,255,255,.08);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 8px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05);
      backdrop-filter: blur(10px);
      cursor:pointer; user-select:none; font-size:26px;
    }
    .buildbar{
      position:fixed; left:0; right:0; bottom:0; z-index:8;
      padding:10px 10px 12px;
      background:linear-gradient(180deg, rgba(15,20,18,0) 0%, rgba(15,20,18,.75) 25%, rgba(15,20,18,.92) 100%);
      transform: translateY(110%); transition: transform .28s ease;
    }
    .buildbar.open{ transform: translateY(0); }
    .bb-row{ display:flex; gap:10px; flex-wrap:wrap; justify-content:center; }
    .bb-btn{
      display:flex; align-items:center; gap:8px;
      height:44px; padding:0 14px; border-radius:14px; border:1px solid rgba(255,255,255,.08);
      background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
      color:#e8efe8; font-size:15px; letter-spacing:.2px; cursor:pointer; user-select:none;
    }
    .bb-btn.active{ outline:2px solid #2fd17a; }
    .bb-tabs{ display:flex; gap:10px; justify-content:center; margin:0 0 8px; }
    .bb-tab{ padding:8px 14px; border-radius:12px; border:1px solid rgba(255,255,255,.10); color:#d9e6dc; cursor:pointer; }
    .bb-tab.active{ background:#2c3b32; border-color:#3e5447; }
    .hidden{ display:none !important; }
    `;
    var st = document.createElement('style'); st.id='ui-build-style'; st.textContent = css; document.head.appendChild(st);
  }

  // ---- DOM -----------------------------------------------------------------
  var bar, toggleBtn, rows = {}, currentTab = 'wohnen';

  // Minimaler Katalog (nutzt die Keys wie in game.js BUILDINGS)
  var CATALOG = {
    wohnen: [
      { key:'house0',  label:'Haus I' },
      { key:'house1',  label:'Haus II' },
      { key:'townhall',label:'Rathaus' }
    ],
    produktion: [
      { key:'lumberjack', label:'Holzfäller' },
      { key:'farm',       label:'Farm' },
      { key:'mill',       label:'Mühle' },
      { key:'depot',      label:'Depot' }
    ],
    wege: [
      { key:'road', label:'Straße' },
      { key:'bulldozer', label:'Abriss' }
    ]
  };

  function makeButton(def){
    var b = document.createElement('button');
    b.className = 'bb-btn';
    b.textContent = def.label;
    b.dataset.tool = def.key;
    b.addEventListener('click', function(){
      if (!window.Game){ console.warn('[ui-build] Game API fehlt'); return; }
      if (def.key === 'road' || def.key === 'bulldozer'){
        Game.setTool(def.key);
      } else {
        Game.setTool('build', { key:def.key });
      }
      // aktive Markierung
      var all = bar.querySelectorAll('.bb-btn'); [].forEach.call(all, function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      try { (window.CBLog && CBLog.ok ? CBLog.ok : console.log)('[ok] Tool gesetzt:', def.key); } catch(_){}
    });
    return b;
  }

  function renderRow(key){
    if (rows[key]) return rows[key];
    var r = document.createElement('div'); r.className='bb-row'; r.dataset.tab=key;
    (CATALOG[key] || []).forEach(function(item){ r.appendChild(makeButton(item)); });
    rows[key] = r;
    return r;
  }

  function switchTab(key){
    currentTab = key;
    var content = bar.querySelector('.bb-content');
    content.innerHTML = '';
    content.appendChild(renderRow(key));
    var tabs = bar.querySelectorAll('.bb-tab');
    [].forEach.call(tabs, function(t){ t.classList.toggle('active', t.dataset.tab===key); });
  }

  function buildBar(){
    injectStyle();
    // Toggle
    toggleBtn = document.createElement('div');
    toggleBtn.className = 'build-toggle hidden';
    toggleBtn.title = 'Bau-Menü';
    toggleBtn.textContent = '🧱';
    document.body.appendChild(toggleBtn);

    // Bar
    bar = document.createElement('div');
    bar.className = 'buildbar';
    bar.innerHTML = `
      <div class="bb-tabs">
        <div class="bb-tab" data-tab="wohnen">Wohnen</div>
        <div class="bb-tab" data-tab="produktion">Produktion</div>
        <div class="bb-tab" data-tab="wege">Wege</div>
      </div>
      <div class="bb-content"></div>
    `;
    document.body.appendChild(bar);

    // tab click
    bar.querySelectorAll('.bb-tab').forEach(function(t){
      t.addEventListener('click', function(){ switchTab(t.dataset.tab); });
    });

    // toggle button
    toggleBtn.addEventListener('click', function(){
      bar.classList.toggle('open');
    });

    // Startzustand
    switchTab(currentTab);
    // Toggle-Button erst nach Game-Start sichtbar
    toggleBtn.classList.add('hidden');
    bar.classList.remove('open');
  }

  // ---- Public API ----------------------------------------------------------
  GameUI.openBuildBar  = function(){ if(bar){ bar.classList.add('open'); } };
  GameUI.closeBuildBar = function(){ if(bar){ bar.classList.remove('open'); } };
  GameUI.toggleBuildBar= function(){ if(bar){ bar.classList.toggle('open'); } };

  // ---- Lifecycle Hooks -----------------------------------------------------
  function onGameStarted(){
    if (!toggleBtn) buildBar();
    // Button sichtbar machen, Bar bleibt zu
    toggleBtn.classList.remove('hidden');
    bar.classList.remove('open');
    (window.CBLog && CBLog.ok ? CBLog.ok : console.log)('[ok] Bau-Menü bereit (ui-build.js ' + VERSION + ')');
  }

  function init(){
    if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); return; }
    buildBar(); // bringt DOM in Stellung, aber Toggle verborgen
    // Engine/Game hat eigenes Event
    window.addEventListener('cb:game-started', onGameStarted);
    // Fallback: falls Start über GameLoader._start passiert, kommt das Event trotzdem (siehe game.js)
  }

  init();
})();
