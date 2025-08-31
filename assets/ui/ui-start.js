/*! ui-start.js v16.2.9 — Startfenster + Map-Start (ES5) */
(function(){
  'use strict';
  var VERSION='v16.2.9';

  function $(s,r){return (r||document).querySelector(s);}
  function on(el,ev,fn,opt){el&&el.addEventListener&&el.addEventListener(ev,fn,opt||false);}

  function logOk(){ (window.CBLog&&CBLog.ok?CBLog.ok:console.log).apply(console, arguments); }
  function logWarn(){ (window.CBLog&&CBLog.warn?CBLog.warn:console.warn).apply(console, arguments); }

  function ensureStartPanel(){
    var panel = $('#start-panel');
    if (!panel){
      // Fallback: minimaler DOM, falls index kein Panel hat
      panel = document.createElement('section');
      panel.id='start-panel';
      panel.innerHTML =
        '<div class="ui-start__wrap">'+
          '<div class="ui-start__head">'+
            '<div class="ui-start__title">Neue Siedler</div>'+
            '<div class="ui-start__sub">index '+ ((window.__cb&&__cb.indexVersion)||'unknown') +' · ui-start '+VERSION+'</div>'+
          '</div>'+
          '<div class="ui-start__body">'+
            '<label class="ui-start__label">Karte</label>'+
            '<select id="map-select" class="ui-start__select">'+
              '<option value="./assets/maps/map-mini.json">map-mini.json</option>'+
              '<option value="./assets/maps/map-pro.json">map-pro.json</option>'+
              '<option value="./assets/maps/map-demo.json">map-demo.json</option>'+
            '</select>'+
            '<div class="ui-start__row">'+
              '<button id="btn-start" class="ui-start__btn ui-start__btn--primary">Start</button>'+
              '<button id="btn-restart" class="ui-start__btn">Neu laden</button>'+
            '</div>'+
            '<div class="ui-start__row">'+
              '<button id="btn-cache" class="ui-start__btn">Cache-Booster</button>'+
              '<button id="btn-copylog" class="ui-start__btn">Log kopieren</button>'+
            '</div>'+
          '</div>'+
        '</div>';
      document.body.appendChild(panel);
    }

    // Hintergrund fix setzen
    document.documentElement.classList.add('ui-start-has-bg');

    // Klick-Handler (idempotent)
    var boundAttr='data-bound';
    var mapSel = $('#map-select');
    var btnStart = $('#btn-start');
    var btnRestart = $('#btn-restart');
    var btnCache = $('#btn-cache');
    var btnCopy = $('#btn-copylog');

    if (btnStart && !btnStart.hasAttribute(boundAttr)){
      btnStart.setAttribute(boundAttr,'1');
      on(btnStart,'click', function(){
        var url = (mapSel && mapSel.value) || './assets/maps/map-mini.json';
        // bevorzugt GameBoot.start → sonst GameLoader._start
        if (window.GameBoot && typeof GameBoot.start==='function'){ GameBoot.start(url); }
        else if (window.GameLoader && typeof GameLoader._start==='function'){ GameLoader._start(url); }
        panel.classList.add('ui-start--hidden'); // ausblenden
        logOk('[ui-start] Start: '+url+' ('+VERSION+')');
      });
    }
    if (btnRestart && !btnRestart.hasAttribute(boundAttr)){
      btnRestart.setAttribute(boundAttr,'1');
      on(btnRestart,'click', function(){ location.reload(); });
    }
    if (btnCache && !btnCache.hasAttribute(boundAttr)){
      btnCache.setAttribute(boundAttr,'1');
      on(btnCache,'click', function(){ location.href = location.pathname + '?keep-sw'; });
    }
    if (btnCopy && !btnCopy.hasAttribute(boundAttr)){
      btnCopy.setAttribute(boundAttr,'1');
      on(btnCopy,'click', function(){
        try{
          var t=(window.CBLog&&CBLog.dump)?CBLog.dump():'Log nicht verfügbar';
          if (navigator.clipboard) navigator.clipboard.writeText(t);
          logOk('[ui-start] Log in Zwischenablage.');
        }catch(e){ logWarn('[ui-start] Clipboard fehlgeschlagen: '+e.message); }
      });
    }

    // Wenn Spiel gestartet ist, sicher ausblenden
    on(window,'cb:game-started', function(){ panel.classList.add('ui-start--hidden'); });

    logOk('[ui-start] Modul geladen ('+VERSION+')');
    // signal
    try{ window.dispatchEvent(new CustomEvent('cb:ui-ready',{detail:{v:VERSION}})); }catch(_){}
    logOk('[ui-start] cb:ui-ready ('+VERSION+')');
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', ensureStartPanel); }
  else { ensureStartPanel(); }
})();
