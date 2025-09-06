/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini
 * Version: v18.10.11
 *
 * Zweck:
 *  - Log-Tab: Filter-Toggles (INFO/OK/WARN/ERR), Badges, Suche, Kopieren/Export
 *  - Slot-Rendering (nur in die vom Core bereitgestellten Slots!)
 *  - Safety-Hook: Historie beim Öffnen pumpen + Stream starten/stoppen
 *
 * Abhängigkeit:
 *  - inspector.core.js liefert window.__INSPECTOR_CORE__.api (mount/getSlot/signal/select)
 *  - cblog.polyfill.js liefert window.CBLog (getBuffer, on/off('append'), LogStream)
 * ========================================================================== */

(function () {
  'use strict';

  var MOD = '[inspector.logs]';
  var VER = 'v18.10.11';
  var core = window.__INSPECTOR_CORE__;
  if (!core || !core.api || typeof core.api.mount !== 'function') {
    console.warn(MOD, 'core API fehlt – breche ab.');
    return;
  }

  // -------- Safety-Hook: Stream an cb:inspector-Events koppeln --------------
  (function attachStreamOnce(){
    if (window.__INS_LOGS_WIRED__) return;
    window.__INS_LOGS_WIRED__ = true;

    function pumpHistory(renderNow){
      try {
        var buf = (window.CBLog?.getBuffer?.() || []);
        if (Array.isArray(buf) && buf.length && typeof renderNow === 'function'){
          renderNow(buf);
        }
      } catch(_){}
    }

    window.addEventListener('cb:inspector-open', function(){
      try { window.CBLog?.LogStream?.start?.(); } catch(_){}
      // Historie wird im Tab-Mount ohnehin gelesen – hier kein Zwang nötig.
    });

    window.addEventListener('cb:inspector-close', function(){
      try { window.CBLog?.LogStream?.stop?.(); } catch(_){}
    });

    // Falls schon offen (AutoOpen), wenigstens Stream sicher starten
    if (document.body.classList.contains('inspector-open')) {
      try { window.CBLog?.LogStream?.start?.(); } catch(_){}
    }
  })();

  // -------- Helpers ---------------------------------------------------------
  var ok   = function(){ (window.CBLog?.ok  || console.log)(MOD,  [].slice.call(arguments)); };
  var info = function(){ (window.CBLog?.info|| console.log)(MOD,  [].slice.call(arguments)); };
  var warn = function(){ (window.CBLog?.warn|| console.warn)(MOD, [].slice.call(arguments)); };

  function qSlot(name) {
    return (
      core.api.getSlot?.(name) ||
      document.getElementById('ins-' + name) ||
      document.querySelector('#inspector .slot-' + name)
    );
  }

  // Level → CSS-Klasse
  var LVL = {
    info: 'log-info',
    ok:   'log-ok',
    warn: 'log-warn',
    err:  'log-error',
    error:'log-error',
    INFO: 'log-info',
    OK:   'log-ok',
    WARN: 'log-warn',
    ERR:  'log-error'
  };

  function detectLevel(line) {
    if (!line) return 'info';
    if (typeof line === 'object') {
      return (line.lvl || line.level || 'info').toString().toLowerCase();
    }
    var s = String(line);
    if (/\bERR(OR)?\b/i.test(s)) return 'err';
    if (/\bWARN(ING)?\b/i.test(s)) return 'warn';
    if (/\bOK\b/i.test(s))         return 'ok';
    if (/\bINFO\b/i.test(s))       return 'info';
    return 'info';
  }
  function toText(line) {
    if (!line && line!==0) return '';
    if (typeof line === 'object') {
      var t   = line.t || line.time || '';
      var src = line.src || line.source || '';
      var msg = (line.msg!=null ? line.msg :
                (line.message!=null ? line.message :
                (line.text!=null ? line.text : JSON.stringify(line))));
      return t ? '['+t+'] ' + (src?src+' ':'') + msg : (src?src+' ':'') + msg;
    }
    return String(line);
  }

  // -------- Log-Puffer + Stream --------------------------------------------
  var raw = [];
  var lastLen = 0;
  var poll = null;

  function readBufferSafe(){
    try {
      var buf = window.CBLog?.getBuffer?.();
      return Array.isArray(buf) ? buf.slice() : [];
    } catch(_){ return []; }
  }

  function onAppend(entry){
    raw.push(entry);
    pushLine(entry); // inkrementell
  }

  function startStream(){
    raw = readBufferSafe();
    lastLen = raw.length;

    if (typeof window.CBLog?.on === 'function') {
      try {
        window.CBLog.on('append', onAppend);
        info('Stream verbunden (append)');
        return;
      } catch(_){}
    }
    // Fallback-Poll
    poll = window.setInterval(function(){
      var buf = readBufferSafe();
      if (buf.length !== lastLen) {
        var diff = buf.slice(lastLen);
        lastLen = buf.length;
        for (var i=0;i<diff.length;i++) onAppend(diff[i]);
      }
    }, 700);
    warn('nutze Poll-Fallback (kein CBLog.on)');
  }
  function stopStream(){
    if (poll){ clearInterval(poll); poll=null; }
    if (typeof window.CBLog?.off === 'function') {
      try { window.CBLog.off('append', onAppend); } catch(_){}
    }
  }

  // -------- UI-State & Elemente --------------------------------------------
  var state = {
    showInfo:true, showOk:true, showWarn:true, showErr:true,
    q:'', counts:{info:0,ok:0,warn:0,err:0}
  };

  var els = { view:null, badges:{} , search:null };

  function buildControls(){
    var host = qSlot('logs-controls');
    if (!host) return;
    host.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.className = 'ins-controls';

    function mkToggle(lbl, key, title){
      var b=document.createElement('button');
      b.className='ins-toggle'; b.dataset.key=key;
      b.textContent=lbl; b.title=title||'';
      if (state[key]) b.classList.add('active');
      b.addEventListener('click', function(){
        state[key]=!state[key];
        b.classList.toggle('active', !!state[key]);
        renderList();
      });
      return b;
    }
    function mkBadge(){ var s=document.createElement('span'); s.className='ins-badge'; s.textContent='0'; return s; }

    var tInfo = mkToggle('INFO','showInfo','Info ein/aus');
    var bInfo = mkBadge(); tInfo.appendChild(bInfo); els.badges.info=bInfo;

    var tOk   = mkToggle('OK','showOk','OK ein/aus');
    var bOk = mkBadge();   tOk.appendChild(bOk); els.badges.ok=bOk;

    var tWarn = mkToggle('WARN','showWarn','Warnungen ein/aus');
    var bWarn = mkBadge(); tWarn.appendChild(bWarn); els.badges.warn=bWarn;

    var tErr  = mkToggle('ERR','showErr','Fehler ein/aus');
    var bErr = mkBadge();  tErr.appendChild(bErr); els.badges.err=bErr;

    var search = document.createElement('input');
    search.type='search'; search.placeholder='Suche…'; search.className='ins-search';
    search.addEventListener('input', function(){
      state.q = (search.value||'').trim().toLowerCase();
      renderList();
    });
    els.search = search;

    var btnCopy = document.createElement('button');
    btnCopy.textContent='Kopieren';
    btnCopy.addEventListener('click', async function(){
      try{
        var all = raw.map(toText).join('\n');
        await navigator.clipboard.writeText(all);
        flash(btnCopy);
      }catch(_){ alert('Kopieren nicht möglich (Clipboard)'); }
    });

    var btnExport = document.createElement('button');
    btnExport.textContent='Export';
    btnExport.addEventListener('click', function(){
      var blob = new Blob([ raw.map(toText).join('\n') ], { type:'text/plain' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href=url; a.download='logs.txt'; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });

    wrap.append(tInfo,tOk,tWarn,tErr,search,btnCopy,btnExport);
    host.appendChild(wrap);
  }

  function flash(el){
    el.classList.add('ins-flash');
    setTimeout(function(){ el.classList.remove('ins-flash'); }, 550);
  }

  function mountView(){
    var host = qSlot('logs-view'); if (!host) return;
    host.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'ins-logview';
    host.appendChild(box);
    els.view = box;
  }

  // -------- Render -----------------------------------------------------------
  function renderList(){
    if (!els.view) return;

    // Reset counts
    state.counts.info = state.counts.ok = state.counts.warn = state.counts.err = 0;

    var q = state.q;
    var frag = document.createDocumentFragment();

    for (var i=0;i<raw.length;i++){
      var obj = raw[i];
      var lvl = detectLevel(obj).toLowerCase();
      var txt = toText(obj);

      // Zähler
      if (state.counts[lvl]!=null) state.counts[lvl]++;

      // Level-Filter
      if ((lvl==='info'&&!state.showInfo) ||
          (lvl==='ok'  &&!state.showOk)   ||
          (lvl==='warn'&&!state.showWarn) ||
          (lvl==='err' &&!state.showErr)) continue;

      // Text-Filter
      if (q && !txt.toLowerCase().includes(q)) continue;

      var line = document.createElement('div');
      line.className = LVL[lvl] || 'log-info';
      line.textContent = txt;
      frag.appendChild(line);
    }

    els.view.innerHTML = '';
    els.view.appendChild(frag);
    updateBadges();
    // Autoscroll ans Ende
    els.view.scrollTop = els.view.scrollHeight;
  }

  function updateBadges(){
    if (els.badges.info) els.badges.info.textContent = String(state.counts.info);
    if (els.badges.ok)   els.badges.ok.textContent   = String(state.counts.ok);
    if (els.badges.warn) els.badges.warn.textContent = String(state.counts.warn);
    if (els.badges.err)  els.badges.err.textContent  = String(state.counts.err);
  }

  function pushLine(entry){
    if (!els.view) return; // noch nicht gemountet
    var lvl = detectLevel(entry).toLowerCase();
    var txt = toText(entry);
    if (state.counts[lvl]!=null) state.counts[lvl]++;

    var passLevel = !(
      (lvl==='info'&&!state.showInfo) ||
      (lvl==='ok'  &&!state.showOk)   ||
      (lvl==='warn'&&!state.showWarn) ||
      (lvl==='err' &&!state.showErr)
    );
    var passText = (!state.q || txt.toLowerCase().includes(state.q));

    if (passLevel && passText){
      var div = document.createElement('div');
      div.className = LVL[lvl] || 'log-info';
      div.textContent = txt;
      els.view.appendChild(div);
      els.view.scrollTop = els.view.scrollHeight;
    }
    updateBadges();
  }

  // -------- Tab-Mount --------------------------------------------------------
  core.api.mount('logs', function onMount(){
    // Slots befüllen
    buildControls();
    mountView();
    // Rohpuffer initial holen
    raw = readBufferSafe();
    lastLen = raw.length;
    renderList();

    // Live-Stream
    startStream();

    (window.CBLog?.ok||console.log)(Date.now(), 'console', MOD,'bereit', VER);

    // Unmount
    return function onUnmount(){
      stopStream();
    };
  });

})();
