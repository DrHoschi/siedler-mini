/* ============================================================================
 * Inspector Logs – v18.12.1 (stabil)
 * - Filter (INFO/OK/WARN/ERR), Suche, Kopieren, Export
 * - Sofortige Anzeige des CBLog-Buffers + Live-Stream (mit Poll-Fallback)
 * - Reines Slot-Rendering: #ins-logs-controls, #ins-logs-view
 * ========================================================================== */
(function(){
  'use strict';

  var MOD='[inspector.logs]';
  var VER='v18.12.1';
  var core = window.__INSPECTOR_CORE__ && window.__INSPECTOR_CORE__.api;
  if (!core){ console.warn(MOD,'core API fehlt'); return; }

  // --- State ----------------------------------------------------------------
  var state = { showInfo:true, showOk:true, showWarn:true, showErr:true, q:'' };
  var els   = { controls:null, view:null, badges:{} };
  var raw   = [];     // Rohpuffer (Objekte/Strings)
  var wired = false;  // Stream verbunden?
  var poll  = null;   // Poll-Timer

  // --- Utils ----------------------------------------------------------------
  function ok(){ try{ (window.CBLog?.ok||console.log).apply(console, [MOD].concat([].slice.call(arguments))); }catch(_){ console.log.apply(console, [MOD].concat(arguments)); } }
  function warn(){ try{ (window.CBLog?.warn||console.warn).apply(console, [MOD].concat([].slice.call(arguments))); }catch(_){ console.warn.apply(console, [MOD].concat(arguments)); } }

  function detectLevel(x){
    if (x && typeof x==='object'){ return (x.lvl||x.level||'info').toString().toLowerCase(); }
    var s = String(x||'');
    if (/\berr(or)?\b/i.test(s)) return 'err';
    if (/\bwarn(ing)?\b/i.test(s)) return 'warn';
    if (/\bok\b/i.test(s)) return 'ok';
    return 'info';
  }
  function asText(x){
    if (x && typeof x==='object'){
      var t = x.t || x.time || x.ts || '';
      var src = x.src || x.source || '';
      var msg = x.msg ?? x.message ?? x.text ?? JSON.stringify(x);
      return (t?('['+t+'] '):'') + (src?src+' ':'') + msg;
    }
    return String(x||'');
  }
  function buffer(){
    try{
      var b = window.CBLog?.getBuffer?.();
      return Array.isArray(b) ? b.slice() : [];
    }catch(_){ return []; }
  }

  // --- Controls --------------------------------------------------------------
  function mkToggle(label, key){
    var b = document.createElement('button');
    b.className = 'ins-toggle'+(state[key]?' active':'');
    b.innerHTML = '<span class="tbox">'+label+'</span>';
    b.addEventListener('click', function(){
      state[key] = !state[key];
      b.classList.toggle('active', state[key]);
      render();
    });
    return b;
  }
  function buildControls(){
    var host = core.getSlot('logs-controls');
    if (!host) return;
    host.innerHTML = '';
    var wrap = document.createElement('div'); wrap.className='ins-controls';

    wrap.appendChild(mkToggle('INFO','showInfo'));
    wrap.appendChild(mkToggle('OK','showOk'));
    wrap.appendChild(mkToggle('WARN','showWarn'));
    wrap.appendChild(mkToggle('ERR','showErr'));

    var search = document.createElement('input');
    search.type='search'; search.placeholder='Suche…'; search.className='ins-search';
    search.addEventListener('input', function(){ state.q = (search.value||'').toLowerCase(); render(); });
    wrap.appendChild(search);

    var copy = document.createElement('button'); copy.className='ins-btn'; copy.textContent='Kopieren';
    copy.addEventListener('click', async function(){
      try{
        var txt = raw.map(asText).join('\n');
        await navigator.clipboard.writeText(txt);
        copy.classList.add('ins-flash'); setTimeout(function(){ copy.classList.remove('ins-flash'); }, 600);
      }catch(_){ alert('Clipboard nicht verfügbar'); }
    });
    var ex = document.createElement('button'); ex.className='ins-btn'; ex.textContent='Export';
    ex.addEventListener('click', function(){
      var blob = new Blob([raw.map(asText).join('\n')], {type:'text/plain'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = 'logs.txt';
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
    wrap.appendChild(copy); wrap.appendChild(ex);

    host.appendChild(wrap);
    els.controls = wrap;
  }

  // --- View ------------------------------------------------------------------
  function mountView(){
    var host = core.getSlot('logs-view');
    if (!host) return;
    host.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'ins-logview';
    host.appendChild(box);
    els.view = box;
  }

  function render(){
    if (!els.view) return;
    var q = state.q;
    var frag = document.createDocumentFragment();

    for (var i=0;i<raw.length;i++){
      var obj = raw[i];
      var lvl = detectLevel(obj);
      if ((lvl==='info' && !state.showInfo) ||
          (lvl==='ok'   && !state.showOk)   ||
          (lvl==='warn' && !state.showWarn) ||
          (lvl==='err'  && !state.showErr)) continue;

      var txt = asText(obj);
      if (q && txt.toLowerCase().indexOf(q)===-1) continue;

      var div = document.createElement('div');
      div.className = 'log-line '+(
        lvl==='ok'   ? 'log-ok'   :
        lvl==='warn' ? 'log-warn' :
        lvl==='err'  ? 'log-error': 'log-info'
      );
      div.textContent = txt;
      frag.appendChild(div);
    }
    els.view.innerHTML = '';
    els.view.appendChild(frag);
    // am Ende bleiben wir unten
    els.view.scrollTop = els.view.scrollHeight;
  }

  // --- Stream (CBLog.on oder Poll) ------------------------------------------
  function onAppend(entry){ raw.push(entry); push(entry); }
  function push(entry){
    if (!els.view) return;
    var lvl = detectLevel(entry);
    var txt = asText(entry);

    if ((lvl==='info' && !state.showInfo) ||
        (lvl==='ok'   && !state.showOk)   ||
        (lvl==='warn' && !state.showWarn) ||
        (lvl==='err'  && !state.showErr)) return;
    if (state.q && txt.toLowerCase().indexOf(state.q)===-1) return;

    var div = document.createElement('div');
    div.className = 'log-line '+(
      lvl==='ok'   ? 'log-ok'   :
      lvl==='warn' ? 'log-warn' :
      lvl==='err'  ? 'log-error': 'log-info'
    );
    div.textContent = txt;
    els.view.appendChild(div);
    els.view.scrollTop = els.view.scrollHeight;
  }

  function wire(){
    if (wired) return;
    wired = true;

    // Historie
    raw = buffer();
    render();

    // Live
    if (typeof window.CBLog?.on === 'function'){
      try { window.CBLog.on('append', onAppend); ok('Stream aktiv'); return; }
      catch(_){}
    }
    // Poll-Fallback
    var last = raw.length;
    poll = window.setInterval(function(){
      var b = buffer();
      if (!Array.isArray(b)) return;
      if (b.length>last){
        for (var i=last; i<b.length; i++){ onAppend(b[i]); }
        last = b.length;
      }
    }, 700);
    warn('nutze Poll-Fallback (kein CBLog.on)');
  }

  function unwire(){
    if (poll){ clearInterval(poll); poll=null; }
    if (typeof window.CBLog?.off === 'function'){
      try { window.CBLog.off('append', onAppend); } catch(_){}
    }
    wired = false;
  }

  // Beim Sichtbarwerden der Logs einmal sicher rendern
  window.addEventListener('cb:inspector-logs-show', function(){
    // falls Module früher geladen hat
    if (!els.controls) buildControls();
    if (!els.view)     mountView();
    if (!wired)        wire();
    render();
  });

  // Mount sofort ausführen (Core ruft mount() direkt)
  core.mount('logs', function(){
    buildControls();
    mountView();
    wire();
    ok('bereit', VER);
    return function(){ unwire(); };
  });

})();
