/* ============================================================================
 * assets/inspector/inspector.logs.js — v18.10.8
 * Zweck:
 *   - Logs-Tab rendern (mit Suchfeld + Badge-Filtern)
 *   - CBLog-Integration:
 *       • Vorhandenen Puffer übernehmen (mehrere Kandidaten)
 *       • CBLog-Methoden sanft hooken (wrap), neue Einträge mitschreiben
 *       • Fallback: console.* hooken, falls CBLog fehlt
 *   - Live-Refresh (Mutation beobachtet / Tick)
 * ========================================================================== */
(function(){
  'use strict';

  var MOD = '[inspector.logs]';
  var ok   = (window.CBLog?.info || console.log).bind(console);
  var warn = (window.CBLog?.warn || console.warn).bind(console);

  // Interner Speicher
  var STORE = (window.__INSPECTOR_LOGS__ = window.__INSPECTOR_LOGS__ || {
    buf: [],
    max: 2000
  });

  // ---- Helfer ---------------------------------------------------------------
  function nowISO(){
    var d=new Date();
    var hh=('0'+d.getHours()).slice(-2);
    var mm=('0'+d.getMinutes()).slice(-2);
    var ss=('0'+d.getSeconds()).slice(-2);
    return hh+':'+mm+':'+ss;
  }
  function push(level, msg){
    var line = { t: Date.now(), ts: nowISO(), lvl: level, msg: msg };
    STORE.buf.push(line);
    if (STORE.buf.length>STORE.max) STORE.buf.splice(0, STORE.buf.length-STORE.max);
  }
  function importExisting(){
    try{
      // Häufigste Kandidaten für Polyfill-Puffer
      var c1 = window.__CBLOG_BUFFER__;
      var c2 = window.__cbLogBuffer;
      var c3 = window.CBLog && window.CBLog.buffer;
      var src = c1 || c2 || c3;
      if (Array.isArray(src)){
        for (var i=0;i<src.length;i++){
          var e = src[i];
          var lvl = (e.level||e.lvl||e[0]||'LOG').toString().toUpperCase();
          var msg = e.msg || e.message || e[1] || '';
          push(lvl, msg);
        }
        ok(MOD+' importierte Puffer: '+src.length);
      } else {
        // manche Polyfills legen objekt mit lines an
        var lns = window.CBLog && window.CBLog.lines;
        if (Array.isArray(lns)){
          for (var j=0;j<lns.length;j++){
            var L=lns[j];
            push((L.level||'LOG').toString().toUpperCase(), L.text||L.msg||'');
          }
          ok(MOD+' importierte CBLog.lines: '+lns.length);
        }
      }
    }catch(e){
      warn(MOD+' Import-Fehler: '+(e&&e.message));
    }
  }

  // ---- Hooks an CBLog / console --------------------------------------------
  var hooked = false;
  function hook(){
    if (hooked) return; hooked = true;

    // 1) CBLog vorhanden? Wrappe seine Methoden.
    if (window.CBLog){
      ['ok','info','log','warn','error'].forEach(function(k){
        var fn = window.CBLog[k];
        if (typeof fn==='function'){
          window.CBLog[k] = function(){
            try{
              var txt = Array.prototype.map.call(arguments, a=>String(a)).join(' ');
              push(k.toUpperCase(), txt);
            }catch(_){}
            return fn.apply(this, arguments);
          };
        }
      });
      ok(MOD+' CBLog-Hook aktiv');
      return;
    }

    // 2) Fallback: console wrap
    ['log','info','warn','error'].forEach(function(k){
      var orig = console[k] || console.log;
      console[k] = function(){
        try{
          var txt = Array.prototype.map.call(arguments, a=>String(a)).join(' ');
          push(k.toUpperCase(), txt);
        }catch(_){}
        return orig.apply(console, arguments);
      };
    });
    ok(MOD+' console-Hook aktiv (Fallback)');
  }

  // ---- Renderer -------------------------------------------------------------
  var body, footer, footAPI;
  var listEl, inputSearch, badgeWrap, countEl;

  var ACTIVE = { INFO:true, LOG:true, WARN:true, ERROR:true, OK:true };

  function makeBadge(lbl, key){
    var b = document.createElement('button');
    b.type='button';
    b.className='insp-badge is-on';
    b.textContent = lbl;
    b.setAttribute('aria-pressed','true');
    b.addEventListener('click', function(){
      var on = b.classList.toggle('is-on');
      b.setAttribute('aria-pressed', on?'true':'false');
      ACTIVE[key]=on;
      renderList();
    });
    return b;
  }

  function renderUI(){
    // Suche + Badges + Counter
    var top = document.createElement('div');
    top.className = 'insp-logs-top';

    inputSearch = document.createElement('input');
    inputSearch.type='search';
    inputSearch.placeholder='Suchen…';
    inputSearch.className='insp-search';
    inputSearch.addEventListener('input', renderList);

    countEl = document.createElement('div');
    countEl.className='insp-count';

    badgeWrap = document.createElement('div');
    badgeWrap.className='insp-badges';
    badgeWrap.appendChild(makeBadge('OK','OK'));
    badgeWrap.appendChild(makeBadge('INFO','INFO'));
    badgeWrap.appendChild(makeBadge('LOG','LOG'));
    badgeWrap.appendChild(makeBadge('WARN','WARN'));
    badgeWrap.appendChild(makeBadge('ERROR','ERROR'));

    top.appendChild(inputSearch);
    top.appendChild(badgeWrap);
    top.appendChild(countEl);

    // Liste
    listEl = document.createElement('div');
    listEl.className='insp-loglist';

    // Fuß: Kopieren/Export
    footAPI.clear();
    var btnCopy = document.createElement('button');
    btnCopy.type='button';
    btnCopy.className='insp-foot-btn';
    btnCopy.textContent='Logs kopieren';
    btnCopy.addEventListener('click', copyLogs);

    footAPI.left().appendChild(document.createTextNode('Puffer: max '+STORE.max));
    footAPI.right().appendChild(btnCopy);
    footAPI.show();

    body.appendChild(top);
    body.appendChild(listEl);
  }

  function copyLogs(){
    try{
      var text = STORE.buf.map(function(l){
        return '['+l.ts+'] '+l.lvl+' '+l.msg;
      }).join('\n');
      navigator.clipboard?.writeText(text).then(function(){
        ok(MOD+' Logs kopiert ('+STORE.buf.length+')');
      }).catch(function(){
        // Fallback
        var ta=document.createElement('textarea'); ta.value=text;
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
        ok(MOD+' Logs kopiert (ExecCommand)');
      });
    }catch(e){ warn(MOD+' Kopieren fehlgeschlagen: '+(e&&e.message)); }
  }

  function renderList(){
    if (!listEl) return;
    var q = (inputSearch?.value||'').toLowerCase().trim();
    var out = document.createDocumentFragment();
    var n=0;

    for (var i=STORE.buf.length-1; i>=0; i--){
      var L = STORE.buf[i];
      if (!ACTIVE[L.lvl]) continue;
      if (q && (L.msg.toLowerCase().indexOf(q)===-1)) continue;

      var row = document.createElement('div');
      row.className = 'insp-logrow lvl-'+L.lvl.toLowerCase();
      var ts  = document.createElement('span'); ts.className='ts';  ts.textContent = '['+L.ts+']';
      var lv  = document.createElement('span'); lv.className='lvl'; lv.textContent = L.lvl;
      var msg = document.createElement('span'); msg.className='msg'; msg.textContent = ' '+L.msg;
      row.appendChild(ts); row.appendChild(lv); row.appendChild(msg);
      out.appendChild(row);
      n++;
    }
    listEl.innerHTML='';
    listEl.appendChild(out);
    if (countEl) countEl.textContent = n+' Einträge';
  }

  // ---- Tab Binding ----------------------------------------------------------
  window.addEventListener('insp:render:logs', function(ev){
    var core = window.__INSPECTOR_API__;
    if (!core) return;
    body   = ev.detail?.body || core.getBody();
    var foot = ev.detail?.footer || core.getFooter();
    footAPI = core.getFootAPI();
    footAPI.show();

    body.innerHTML='';
    renderUI();
    renderList();
  });

  // ---- Init: Puffer importieren & hooken ------------------------------------
  importExisting();
  hook();

  // Erste Sichtprüfung (falls Inspector schon offen → neu zeichnen)
  if (window.__INSPECTOR_API__){
    // Nichts tun; Render kommt beim Tab-Aufruf.
  }

  ok(MOD+' bereit');
})();
