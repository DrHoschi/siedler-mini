/* assets/inspector/inspector.js — v16.3.6 */
(function(){
  'use strict';

  var VERSION = 'v16.3.6';
  var api = {};
  var root = null, pane = null, tabLive=null, tabLogs=null, viewLive=null, viewLogs=null;

  function $el(tag, cls, html){
    var n=document.createElement(tag);
    if(cls) n.className=cls;
    if(html!=null) n.innerHTML=html;
    return n;
  }

  function ensure(){
    if (root) return;
    root = $el('div', 'cb-inspector cb-inspector--hidden', '');
    root.innerHTML = ''+
      '<div class="cb-inspector__backdrop"></div>'+
      '<div class="cb-inspector__pane" role="dialog" aria-label="Inspector">'+
        '<header class="cb-inspector__hdr">'+
          '<div class="cb-inspector__title">Inspector <small>(v'+VERSION+')</small></div>'+
          '<div class="cb-inspector__tabs">'+
            '<button class="tab is-active" data-tab="live">Live</button>'+
            '<button class="tab" data-tab="logs">Logs</button>'+
          '</div>'+
          '<button class="cb-inspector__close" aria-label="Schließen">✕</button>'+
        '</header>'+
        '<section class="cb-inspector__body">'+
          '<div class="view view-live"></div>'+
          '<div class="view view-logs" hidden></div>'+
        '</section>'+
      '</div>';

    document.body.appendChild(root);
    pane = root.querySelector('.cb-inspector__pane');
    tabLive = root.querySelector('[data-tab="live"]');
    tabLogs = root.querySelector('[data-tab="logs"]');
    viewLive = root.querySelector('.view-live');
    viewLogs = root.querySelector('.view-logs');

    root.querySelector('.cb-inspector__close')
      .addEventListener('click', api.close);

    root.querySelector('.cb-inspector__backdrop')
      .addEventListener('click', api.close);

    tabLive.addEventListener('click', function(){
      tabLive.classList.add('is-active'); tabLogs.classList.remove('is-active');
      viewLive.hidden=false; viewLogs.hidden=true;
    });
    tabLogs.addEventListener('click', function(){
      tabLogs.classList.add('is-active'); tabLive.classList.remove('is-active');
      viewLogs.hidden=false; viewLive.hidden=true;
    });

    // minimale Styles, damit alles „stand-alone“ funktioniert
    var css = document.getElementById('cb-inspector-css');
    if (!css){
      css = document.createElement('style');
      css.id='cb-inspector-css';
      css.textContent = `
      .cb-inspector{ position:fixed; inset:0; z-index:11000; display:flex; align-items:flex-end; }
      .cb-inspector--hidden{ display:none; }
      .cb-inspector__backdrop{ position:absolute; inset:0; background:rgba(8,12,10,.55); backdrop-filter: blur(4px); }
      .cb-inspector__pane{ position:relative; z-index:1; width:100%; max-height:90vh; background:rgba(12,18,14,.96);
        color:#e8eee9; border-top:1px solid rgba(255,255,255,.08); box-shadow:0 -16px 42px rgba(0,0,0,.45); }
      .cb-inspector__hdr{ display:flex; gap:12px; align-items:center; padding:14px 16px; border-bottom:1px solid rgba(255,255,255,.06); }
      .cb-inspector__title{ font:600 16px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial; opacity:.9; }
      .cb-inspector__title small{ opacity:.6; font-weight:500; }
      .cb-inspector__tabs{ margin-left:auto; display:flex; gap:8px; }
      .cb-inspector__tabs .tab{ padding:8px 12px; border-radius:999px; border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.06); color:#e8eee9; }
      .cb-inspector__tabs .tab.is-active{ background:rgba(60,200,140,.18); border-color:rgba(60,200,140,.35); }
      .cb-inspector__close{ margin-left:8px; width:34px; height:34px; border-radius:8px; border:0; background:rgba(255,255,255,.08); color:#e8eee9; }
      .cb-inspector__body{ padding:12px 14px 16px; overflow:auto; max-height: calc(90vh - 58px); }
      .view{ font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; white-space: pre-wrap; }
      `;
      document.head.appendChild(css);
    }
  }

  api.open = function(){
    ensure();
    root.classList.remove('cb-inspector--hidden');
  };
  api.close = function(){
    if (!root) return;
    root.classList.add('cb-inspector--hidden');
  };
  api.toggle = function(force){
    ensure();
    var show = (typeof force === 'boolean') ? force : root.classList.contains('cb-inspector--hidden');
    if (show) api.open(); else api.close();
  };
  api.log = function(s){
    ensure();
    var line = (typeof s === 'string') ? s : JSON.stringify(s);
    viewLogs.textContent += (line + '\n');
  };

  window.Inspector = window.Inspector || api;

  var ok = (window.CBLog && CBLog.ok) ? CBLog.ok : console.log;
  ok('[inspector] Modul geladen (v' + VERSION + ')');

})();
