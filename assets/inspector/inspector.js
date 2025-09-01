// assets/inspector/inspector.js — v16.3.5 (kein Auto-Overlay; Logs verkabelt)
(function(){
  'use strict';
  var VERSION='v16.3.5';
  var panel, tabs, areaLive, areaLogs, isOpen=false;

  // Logger-Hook
  var lines=[];
  function clog(type, args){
    try{
      var msg = Array.prototype.slice.call(args).map(function(a){
        if (typeof a==='object') try { return JSON.stringify(a); } catch(_){ return String(a); }
        return String(a);
      }).join(' ');
      var ts = new Date().toTimeString().slice(0,8);
      lines.push('['+ts+'] '+type.toUpperCase()+' '+msg);
      if (isOpen) renderLogs();
    }catch(_){}
  }
  window.CBLog = window.CBLog || {};
  ['log','ok','warn','err'].forEach(function(k){
    var orig = console[k] || console.log;
    console[k] = function(){ orig.apply(console, arguments); clog(k, arguments); };
    CBLog[k] = function(){ clog(k, arguments); };
  });

  function renderLogs(){
    if (!areaLogs) return;
    areaLogs.textContent = lines.join('\n');
  }

  function openPanel(state){
    isOpen = state;
    panel.style.display = isOpen ? 'block' : 'none';
    if (isOpen) renderLogs();
  }

  function buildUI(){
    if (document.getElementById('inspector-panel')) return; // guard (keine Dubletten)
    panel = document.createElement('div');
    panel.id = 'inspector-panel';
    panel.innerHTML = ''+
      '<div class="insp-wrap">'+
        '<div class="insp-hd">Inspector <span class="muted">(v'+VERSION+')</span>'+
          '<button id="insp-close" class="insp-close">×</button>'+
        '</div>'+
        '<div class="insp-tabs" id="insp-tabs">'+
          '<button data-tab="live" class="t active">Live</button>'+
          '<button data-tab="logs" class="t">Logs</button>'+
        '</div>'+
        '<pre class="insp-area" id="insp-live"></pre>'+
        '<pre class="insp-area hidden" id="insp-logs"></pre>'+
        '<div class="insp-actions">'+
          '<button id="insp-copy">Kopieren</button>'+
          '<button id="insp-clear">Leeren</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(panel);

    tabs     = document.getElementById('insp-tabs');
    areaLive = document.getElementById('insp-live');
    areaLogs = document.getElementById('insp-logs');

    tabs.addEventListener('click', function(e){
      var b = e.target.closest('button[data-tab]');
      if(!b) return;
      tabs.querySelectorAll('.t').forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      var tab=b.dataset.tab;
      areaLive.classList.toggle('hidden', tab!=='live');
      areaLogs.classList.toggle('hidden', tab!=='logs');
      if (tab==='logs') renderLogs();
    });

    document.getElementById('insp-close').onclick = function(){ openPanel(false); };
    document.getElementById('insp-clear').onclick = function(){ lines=[]; renderLogs(); };
    document.getElementById('insp-copy').onclick = function(){
      try{ navigator.clipboard.writeText(lines.join('\n')); }catch(_){}
    };

    // Start: VERSTECKT – kein minimierter Balken am Startscreen
    panel.style.display='none';
  }

  // Externe API (Button in ui-bridge.js ruft das auf)
  window.GameInspector = window.GameInspector || {};
  window.GameInspector.toggle = function(){
    if (!panel) buildUI();
    openPanel(!isOpen);
  };

  // Auto-init nur DOM-Struktur (unsichtbar)
  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', buildUI);
  } else { buildUI(); }
})();
