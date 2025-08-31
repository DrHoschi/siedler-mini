<script>
/* Inspector – schlank, zeigt Logs & Live; Button unten rechts */
(function(){
  'use strict';
  var VERSION='v16.3.3';
  var log = (window.CBLog && CBLog.ok) ? function(){ CBLog.ok.apply(CBLog, arguments); } : console.log;

  var fab, panel, liveTab, logsTab, area;

  function ensure(){
    if (panel) return;

    // FAB
    fab = document.createElement('button');
    fab.id = 'inspectorFab';
    fab.style.cssText = [
      'position:fixed;right:14px;bottom:96px;width:56px;height:56px;border-radius:50%;',
      'z-index:1200;background:radial-gradient(120% 140% at 10% 10%,rgba(255,255,255,.08),rgba(0,0,0,.36));',
      'border:1px solid rgba(255,255,255,.08);box-shadow:0 8px 24px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.1);',
      'color:#f6f8f5;display:grid;place-content:center'
    ].join('');
    fab.title='Inspector';
    fab.innerHTML='<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M19.43 12.98l1.77 1.77-1.41 1.41-1.77-1.77a7.96 7.96 0 01-4.02 1.98V20h-2v-3.63a8 8 0 117.43-3.39zM12 6a6 6 0 100 12 6 6 0 000-12z"/></svg>';
    fab.addEventListener('click', toggle);
    document.body.appendChild(fab);

    // Panel
    panel = document.createElement('div');
    panel.style.cssText = [
      'position:fixed;left:5%;right:5%;bottom:86px;min-height:220px;max-height:60vh;',
      'background:rgba(8,12,10,.9);backdrop-filter:blur(12px) saturate(120%);',
      'border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px;z-index:1199;',
      'box-shadow:0 10px 40px rgba(0,0,0,.5);display:none;color:#e7eee7'
    ].join('');
    panel.innerHTML = [
      '<div style="font-weight:700;margin:2px 0 10px;">Inspector ',
      '<small style="opacity:.7">(',VERSION,')</small></div>',
      '<div style="display:flex;gap:8px;margin-bottom:10px">',
        '<button id="inspLive"  style="padding:6px 10px;border-radius:10px;border:0;background:#234;">Live</button>',
        '<button id="inspLogs"  style="padding:6px 10px;border-radius:10px;border:0;background:#234;">Logs</button>',
        '<span style="flex:1"></span>',
        '<button id="inspClear" style="padding:6px 10px;border-radius:10px;border:0;background:#342;">Leeren</button>',
      '</div>',
      '<pre id="inspArea" style="margin:0;background:rgba(0,0,0,.35);border-radius:10px;padding:12px;overflow:auto;max-height:42vh;white-space:pre-wrap"></pre>'
    ].join('');
    document.body.appendChild(panel);

    liveTab = panel.querySelector('#inspLive');
    logsTab = panel.querySelector('#inspLogs');
    area    = panel.querySelector('#inspArea');

    liveTab.addEventListener('click', function(){ mode='live'; render(); });
    logsTab.addEventListener('click', function(){ mode='logs'; render(); });
    panel.querySelector('#inspClear').addEventListener('click', function(){ buffer=[]; render(); });

    hookConsole();
    log('[inspector] bereit', VERSION);
  }

  function toggle(){ ensure(); panel.style.display = (panel.style.display==='none'?'block':'none'); render(); }

  // Puffer
  var buffer = [];
  var mode   = 'live';

  function pushLine(kind, args){
    try{
      var t = new Date().toTimeString().slice(0,8);
      buffer.push('['+t+'] '+kind.toUpperCase()+': '+[].map.call(args, toStr).join(' '));
      if (buffer.length>500) buffer.shift();
      if (mode==='live') render();
    }catch(_){}
  }
  function toStr(v){
    if (v===undefined) return 'undefined';
    if (v===null) return 'null';
    if (typeof v==='object'){ try{return JSON.stringify(v);}catch(_){ return '[Object]'; } }
    return String(v);
  }
  function render(){
    if (!area) return;
    if (mode==='live'){
      // kleine Live-Info
      var info = [
        'index: ', (window.INDEX_VERSION||'–'),
        '   dpr: ', (window.devicePixelRatio||1),
        '\nGameLoader: ', !!window.GameLoader,
        '   Game: ', !!window.Game,
        '   GameUI: ', !!window.GameUI
      ].join('');
      area.textContent = info;
    } else {
      area.textContent = buffer.join('\n');
    }
  }

  function hookConsole(){
    ['log','warn','error'].forEach(function(k){
      var orig = console[k].bind(console);
      console[k] = function(){
        try{ pushLine(k, arguments); }catch(_){}
        return orig.apply(console, arguments);
      };
    });
  }

  // init nach UI
  window.addEventListener('cb:ui-ready', ensure);

})();
</script>
