/* ============================================================================
 * Datei: assets/inspector/inspector.js
 * Projekt: Siedler-Mini
 * Version: v18.3.2
 * Zweck:
 *   - Immer sichtbarer Inspector (Fenster) mit Tabs
 *   - Stabile Log-Anzeige via CBLog.LogStream (sofort beim Öffnen)
 *   - Keine Doppelbelegung von GameUI.toggleInspector
 *   - Failsafe: ?inspector=1 öffnet automatisch
 * Tabs (vorbereitet): Übersicht, Logs (aktiv), Build, Pfade, Tests
 * ========================================================================== */

(function () {
  'use strict';
  var VERSION = 'v18.3.2';
  var ID = 'inspector';

  // ---- sanfte Logs ----------------------------------------------------------
  function L(type, msg){
    try{
      if (window.CBLog){
        if (type==='ok')   return window.CBLog.ok('[inspector.core] '+msg);
        if (type==='warn') return window.CBLog.warn('[inspector.core] '+msg);
        if (type==='err')  return window.CBLog.err('[inspector.core] '+msg);
        return window.CBLog.info('[inspector.core] '+msg);
      }
    }catch(_){}
    console[(type==='err'?'error':type==='warn'?'warn':'log')]('[inspector.core]', msg);
  }

  // ---- DOM-Grundaufbau ------------------------------------------------------
  var root, tabs, body, logContainer, logStopper;

  function build(){
    if (root) return;
    root = document.createElement('div');
    root.id = ID;
    root.className = 'inspector';
    root.style.display = 'none';
    root.innerHTML = [
      '<div class="insp-head">',
        '<div class="title">Inspector <span class="ver">'+VERSION+'</span></div>',
        '<button class="btn-close" type="button" aria-label="Schließen">Schließen</button>',
      '</div>',
      '<div class="insp-tabs" role="tablist">',
        '<button class="tab active" data-tab="overview" role="tab">Übersicht</button>',
        '<button class="tab" data-tab="logs" role="tab">Logs</button>',
        '<button class="tab" data-tab="build" role="tab">Build</button>',
        '<button class="tab" data-tab="paths" role="tab">Pfade</button>',
        '<button class="tab" data-tab="tests" role="tab">Tests</button>',
      '</div>',
      '<div class="insp-body" role="tabpanel"></div>'
    ].join('');
    document.body.appendChild(root);

    tabs = root.querySelectorAll('.insp-tabs .tab');
    body = root.querySelector('.insp-body');
    root.querySelector('.btn-close').addEventListener('click', close, {passive:true});
    tabs.forEach(function(b){ b.addEventListener('click', function(){ openTab(b.dataset.tab); }, {passive:true}); });

    openTab('logs'); // Start-Tab
    L('ok','bereit ('+VERSION+')');
  }

  // ---- Öffnen/Schließen/Toggle ----------------------------------------------
  function open(){ build(); root.style.display='block'; if (currentTab==='logs') startLogs(); }
  function close(){ if(!root) return; root.style.display='none'; stopLogs(); }
  function toggle(){ (root && root.style.display==='block') ? close() : open(); }

  // ---- Tabs -----------------------------------------------------------------
  var currentTab = 'logs';

  function openTab(name){
    currentTab = name;
    tabs.forEach(function(b){ b.classList.toggle('active', b.dataset.tab===name); });

    if (name==='logs'){
      body.innerHTML = [
        '<div class="log-wrap">',
          '<div class="log-area" id="insp-logs">[Log wird geladen …]</div>',
          '<div class="log-toolbar">',
            '<button id="insp-copy" class="btn" type="button">Kopieren</button>',
          '</div>',
        '</div>'
      ].join('');
      logContainer = body.querySelector('#insp-logs');
      body.querySelector('#insp-copy').addEventListener('click', copyLogs);
      startLogs();
      return;
    }

    // Platzhalter für andere Tabs (werden später gefüllt)
    stopLogs();
    body.innerHTML = '<div class="placeholder">['+name+'] kommt als Nächstes.</div>';
  }

  // ---- Logs: Stream anbinden ------------------------------------------------
  function startLogs(){
    if (!logContainer) return;
    if (!window.CBLog || !window.CBLog.LogStream){
      logContainer.textContent = '[CBLog nicht verfügbar]';
      return;
    }
    // Falls bereits aktiv, erst stoppen
    stopLogs();

    logContainer.textContent = '';
    logStopper = window.CBLog.LogStream.start(function(msg){
      try{
        var line = document.createElement('div');
        // msg kann {ts, level, text} sein – robust behandeln
        line.textContent = (msg && (msg.text || msg.message)) || String(msg);
        logContainer.appendChild(line);
        logContainer.scrollTop = logContainer.scrollHeight;
      }catch(_){}
    });
    L('ok','LogStream gestartet');
  }

  function stopLogs(){
    try{
      if (typeof logStopper === 'function'){ logStopper(); }
      logStopper = null;
    }catch(_){}
  }

  function copyLogs(){
    try{
      var text = '';
      if (logContainer){
        var childs = logContainer.childNodes;
        for (var i=0;i<childs.length;i++){
          if (childs[i].nodeType===1) text += childs[i].textContent+'\n';
        }
      } else {
        text = '[leer]';
      }
      navigator.clipboard?.writeText(text).then(function(){
        L('ok','Logs kopiert');
      }).catch(function(e){
        L('warn','Kopieren fehlgeschlagen: '+(e&&e.message));
      });
    }catch(e){
      L('warn','Kopieren-Fehler: '+(e&&e.message));
    }
  }

  // ---- Öffnen via Events/Bridge ---------------------------------------------
  window.addEventListener('cb:inspector-toggle', function(){ toggle(); }, {passive:true});
  window.addEventListener('cb:inspector-open', function(){ open(); }, {passive:true});
  window.addEventListener('cb:inspector-close', function(){ close(); }, {passive:true});

  // Public Bridge (NICHT doppelt überschreiben)
  window.GameUI = window.GameUI || {};
  window.GameUI.openInspector  = open;
  window.GameUI.closeInspector = close;
  window.GameUI.toggleInspector= toggle;

  // ---- Auto-Open via ?inspector=1 -------------------------------------------
  try{
    if (location.search.indexOf('inspector=1')!==-1){
      // etwas verzögert, damit Polyfill/Styles schon da sind
      setTimeout(open, 120);
    }
  }catch(_){}
})();
