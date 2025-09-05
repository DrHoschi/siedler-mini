/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini
 * Version: v18.10.5
 *
 * Zweck (Logs-Tab):
 *  - Live-Anzeige der Logeinträge aus CBLog-Polyfill / Konsole
 *  - Filter: Level (ERR/WARN/OK/INFO/LOG) + Volltextsuche
 *  - Badges je Level, Zähler, Kopieren in Zwischenablage, Export als JSON
 *  - Defensiv: funktioniert mit/ohne inspector.core.js (registerTab)
 *
 * Abhängigkeiten (sanft):
 *  - window.CBLog (falls vorhanden)
 *  - window.__CBLOG / window.__CBLOG_BUFFER__ (Polyfill-Puffer, falls vorhanden)
 *  - inspector.core.js mit window.__INSPECTOR_API__.registerTab (optional)
 *
 * Öffentliche Events:
 *  - hört auf:  'cblog:push'   (empfohlen), 'cb:log' (Fallback)
 *  - dispatcht: keine
 *
 * CODE-STYLE:
 *  - Keine Frameworks, keine externen Assets
 *  - Null-Fehler-Toleranz: Jeder Zugriff defensiv try/catch
 * ============================================================================ */
(function(){
  'use strict';

  var MOD = '[inspector.logs]';
  var VER = 'v18.10.5';

  // ---------- Logging helpers -----------------------------------------------
  function info(m){ try{ (window.CBLog?.info||console.log)(MOD+' '+m); }catch(_){ console.log(MOD+' '+m); } }
  function warn(m){ try{ (window.CBLog?.warn||console.warn)(MOD+' '+m); }catch(_){ console.warn(MOD+' '+m); } }

  // ---------- State ----------------------------------------------------------
  var _entries = [];          // Normalisierte Liste {t,lbl,level,text,raw}
  var _filtered = [];         // Gefilterte Liste (UI)
  var _dom = {};              // Referenzen (root, ctrls, list, count)

  // UI-Filter (werden im Global-State geparkt, damit Tabwechsel sie behält)
  var STATE = (window.__INSPECTOR_STATE__ = window.__INSPECTOR_STATE__ || {});
  STATE.logs = STATE.logs || {
    levels: { ERR:true, WARN:true, OK:true, INFO:true, LOG:true },
    query: ''
  };

  // ---------- Log-Quelle(n) vereinheitlichen --------------------------------
  function snapshotFromPolyfill(){
    // Versuche typische Puffer – alles defensiv
    try{
      if (window.__CBLOG && Array.isArray(__CBLOG.entries)) return __CBLOG.entries.slice();
      if (Array.isArray(window.__CBLOG_BUFFER__)) return window.__CBLOG_BUFFER__.slice();
      if (Array.isArray(window.CB_LOGS)) return window.CB_LOGS.slice();
    }catch(_){}
    return [];
  }

  function normalizeOne(e){
    // Unterstütze gängige Formen: {ts, level, msg, args} oder Array
    var ts = e.ts || e.time || Date.now();
    var lvl = (e.level || e.lvl || e.type || 'LOG').toString().toUpperCase();
    // Mapping auf unsere 5 Levels
    if (lvl==='ERROR') lvl='ERR';
    if (lvl==='WARN' || lvl==='WARNING') lvl='WARN';
    if (lvl==='OK' || lvl==='SUCCESS') lvl='OK';
    if (lvl==='INFO') lvl='INFO';
    if (lvl!=='ERR' && lvl!=='WARN' && lvl!=='OK' && lvl!=='INFO') lvl='LOG';

    // Text zusammenbauen
    var parts = [];
    if (e.msg!=null) parts.push(String(e.msg));
    if (Array.isArray(e.args) && e.args.length){
      try{ parts.push(e.args.map(a=>typeof a==='string'?a:JSON.stringify(a)).join(' ')); }catch(_){}
    } else if (e.args!=null){
      try{ parts.push(String(e.args)); }catch(_){}
    }
    if (!parts.length && e.text!=null) parts.push(String(e.text));
    var text = parts.join(' ').trim();

    // Label (Quelle) – z.B. "[render] Modul geladen"
    var lbl = '';
    try{
      if (text.startsWith('[')){
        var i = text.indexOf(']');
        if (i>0) { lbl = text.slice(0, i+1); }
      }
    }catch(_){}

    return { t: ts, level: lvl, text: text, lbl: lbl, raw: e };
  }

  function rebuildFullSnapshot(){
    var snap = snapshotFromPolyfill();
    var out = [];
    for (var i=0; i<snap.length; i++){
      try{ out.push( normalizeOne(snap[i]) ); }catch(_){}
    }
    _entries = out;
  }

  // ---------- Filter + Suche -------------------------------------------------
  function applyFilters(){
    var q = (STATE.logs.query||'').toLowerCase();
    var lv = STATE.logs.levels;
    var arr = [];
    for (var i=0;i<_entries.length;i++){
      var it = _entries[i];
      if (!lv[it.level]) continue;
      if (q && it.text && it.text.toLowerCase().indexOf(q)===-1) continue;
      arr.push(it);
    }
    _filtered = arr;
  }

  // ---------- UI Rendering ---------------------------------------------------
  var LVL_META = {
    ERR:  { badge:'❌', cls:'lvl-err',  title:'Fehler' },
    WARN: { badge:'⚠',  cls:'lvl-warn', title:'Warnung' },
    OK:   { badge:'✅', cls:'lvl-ok',   title:'OK' },
    INFO: { badge:'ℹ',  cls:'lvl-info', title:'Info' },
    LOG:  { badge:'●',  cls:'lvl-log',  title:'Log' }
  };

  function fmtTime(ts){
    try{
      var d = new Date(ts);
      var hh=('0'+d.getHours()).slice(-2);
      var mm=('0'+d.getMinutes()).slice(-2);
      var ss=('0'+d.getSeconds()).slice(-2);
      return hh+':'+mm+':'+ss;
    }catch(_){ return '--:--:--'; }
  }

  function renderOneRow(it){
    var m = LVL_META[it.level] || LVL_META.LOG;
    var row = document.createElement('div');
    row.className = 'ins-log-row '+m.cls;

    var badge = document.createElement('span');
    badge.className = 'ins-badge';
    badge.textContent = m.badge;
    badge.title = m.title;

    var time = document.createElement('span');
    time.className = 'ins-time';
    time.textContent = '['+fmtTime(it.t)+']';

    var txt = document.createElement('span');
    txt.className = 'ins-text';
    txt.textContent = it.text || '';

    row.appendChild(badge);
    row.appendChild(time);
    if (it.lbl){
      var src = document.createElement('span');
      src.className = 'ins-src';
      src.textContent = ' '+it.lbl+' ';
      row.appendChild(src);
    }
    row.appendChild(txt);
    return row;
  }

  function refreshList(){
    if (!_dom.list || !_dom.count) return;
    _dom.list.textContent = '';
    applyFilters();
    for (var i=0;i<_filtered.length;i++){
      _dom.list.appendChild( renderOneRow(_filtered[i]) );
    }
    _dom.count.textContent = String(_filtered.length);
  }

  function copySelectionToClipboard(){
    try{
      var lines = _filtered.map(it => '['+fmtTime(it.t)+'] '+it.level+' '+(it.text||''));
      var blob = lines.join('\n');
      navigator.clipboard.writeText(blob).then(function(){
        toast('Logs kopiert: '+lines.length);
      }).catch(function(){
        // Fallback (hidden textarea)
        try{
          var ta = document.createElement('textarea');
          ta.value = blob; document.body.appendChild(ta);
          ta.select(); document.execCommand('copy'); ta.remove();
          toast('Logs kopiert (Fallback).');
        }catch(e){ warn('Kopieren fehlgeschlagen: '+e.message); }
      });
    }catch(e){ warn('Clipboard-API Fehler: '+e.message); }
  }

  function exportAsJSON(){
    try{
      var data = JSON.stringify(_filtered.map(x=>x.raw), null, 2);
      var url = URL.createObjectURL( new Blob([data], {type:'application/json'}) );
      var a = document.createElement('a');
      a.href = url; a.download = 'logs_export_'+Date.now()+'.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
      toast('Export gestartet.');
    }catch(e){ warn('Export fehlgeschlagen: '+e.message); }
  }

  function toast(msg){
    try{
      var t = document.createElement('div');
      t.className = 'ins-toast';
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(()=>t.classList.add('show'), 10);
      setTimeout(()=>{ t.classList.remove('show'); t.remove(); }, 2200);
    }catch(_){}
  }

  function renderControls(container){
    var bar = document.createElement('div');
    bar.className = 'ins-logbar';

    // Level-Filter
    var levels = ['ERR','WARN','OK','INFO','LOG'];
    var lvlWrap = document.createElement('div');
    lvlWrap.className = 'ins-lvls';

    levels.forEach(function(L){
      var w = document.createElement('label');
      w.className = 'ins-lvl-toggle';

      var i = document.createElement('input');
      i.type='checkbox'; i.checked = !!STATE.logs.levels[L];
      i.addEventListener('change', function(){
        STATE.logs.levels[L] = !!i.checked;
        refreshList();
      });

      var b = document.createElement('span');
      b.className = 'ins-badge '+(LVL_META[L].cls||'');
      b.textContent = LVL_META[L].badge;
      b.title = LVL_META[L].title;

      var t = document.createElement('span');
      t.textContent = L;

      w.appendChild(i); w.appendChild(b); w.appendChild(t);
      lvlWrap.appendChild(w);
    });

    // Suche
    var q = document.createElement('input');
    q.type = 'search';
    q.placeholder = 'Suche…';
    q.value = STATE.logs.query || '';
    q.className = 'ins-search';
    q.addEventListener('input', function(){
      STATE.logs.query = String(q.value||'');
      refreshList();
    });

    // Buttons: Kopieren & Export
    var btns = document.createElement('div');
    btns.className = 'ins-actions';

    var bCopy = document.createElement('button');
    bCopy.className = 'ins-btn';
    bCopy.textContent = 'Kopieren';
    bCopy.addEventListener('click', copySelectionToClipboard);

    var bExport = document.createElement('button');
    bExport.className = 'ins-btn';
    bExport.textContent = 'Export';
    bExport.addEventListener('click', exportAsJSON);

    btns.appendChild(bCopy);
    btns.appendChild(bExport);

    bar.appendChild(lvlWrap);
    bar.appendChild(q);
    bar.appendChild(btns);
    container.appendChild(bar);
  }

  function renderLogs(root){
    // Root ist der Body-Bereich des Inspector-Tabs
    var wrap = document.createElement('div');
    wrap.className = 'ins-logs-wrap';

    renderControls(wrap);

    var list = document.createElement('div');
    list.className = 'ins-loglist';
    wrap.appendChild(list);

    var status = document.createElement('div');
    status.className = 'ins-logstatus';
    status.innerHTML = 'Einträge: <b id="ins-logcount">0</b>';
    wrap.appendChild(status);

    root.textContent = '';
    root.appendChild(wrap);

    _dom.list = list;
    _dom.count = status.querySelector('#ins-logcount');

    // Initiale Daten
    rebuildFullSnapshot();
    refreshList();
  }

  // ---------- Live-Updates anbinden -----------------------------------------
  function handleIncoming(e){
    // Erwartet ein einzelnes Logobjekt in e.detail / e.data / e
    var payload = (e && (e.detail || e.data || e)) || null;
    if (!payload) return;
    try{
      var n = normalizeOne(payload);
      _entries.push(n);
      // Nur anhängen, wenn es den Filter besteht
      var lv = STATE.logs.levels; var q=(STATE.logs.query||'').toLowerCase();
      if (lv[n.level] && (!q || (n.text && n.text.toLowerCase().indexOf(q)!==-1))){
        if (_dom.list){
          _dom.list.appendChild( renderOneRow(n) );
          _dom.count.textContent = String( (_dom.list.childNodes||[]).length );
        }
      }
    }catch(_){}
  }

  // Empfange Log-Ereignisse verschiedener Quellen
  try{ window.addEventListener('cblog:push', handleIncoming); }catch(_){}
  try{ window.addEventListener('cb:log', handleIncoming); }catch(_){}

  // Fallback: periodisches Refresh, falls Events nicht feuern
  setInterval(function(){
    var before = _entries.length|0;
    rebuildFullSnapshot();
    if (_entries.length!==before) refreshList();
  }, 2000);

  // ---------- Integration mit Inspector-Core --------------------------------
  function attachToInspectorCore(){
    // Wenn __INSPECTOR_API__ mit registerTab existiert → sauber registrieren
    try{
      if (window.__INSPECTOR_API__ && typeof __INSPECTOR_API__.registerTab==='function'){
        __INSPECTOR_API__.registerTab('logs', {
          title: 'Logs',
          onShow: function(bodyEl){ renderLogs(bodyEl); }
        });
        info('Logs-Tab registriert ('+VER+')');
        return true;
      }
    }catch(e){ warn('registerTab fehlgeschlagen: '+e.message); }
    return false;
  }

  // Standalone-Fallback: in vorhandenes Inspector-Root zeichnen
  function fallbackRender(){
    try{
      var root = document.getElementById('inspector-body') || document.getElementById('inspector');
      if (!root){ warn('Kein Inspector-Body gefunden – Fallback abgebrochen'); return; }
      renderLogs(root);
      info('Logs-Standalone aktiv ('+VER+')');
    }catch(e){ warn('Fallback-Render Fehler: '+e.message); }
  }

  if (!attachToInspectorCore()) {
    // Wenn Core später lädt, noch einmal versuchen
    setTimeout(attachToInspectorCore, 800);
    // Und sofort wenigstens Fallback bereitstellen
    setTimeout(fallbackRender, 300);
  }

})();
