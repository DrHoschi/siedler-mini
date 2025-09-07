/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini
 * Version: v18.13.0
 *
 * Zweck:
 *  - Log-Tab UI (Filter, Suche, Kopieren, Export)
 *  - Zuverlässiger Stream: CBLog.on('append') ODER Poll-Fallback
 *  - Reines Slot-Rendering (ins-logs-controls, ins-logs-view)
 * ========================================================================= */
(function(){
  'use strict';

  const MOD='[inspector.logs]';
  const VER='v18.13.0';
  const core = window.__INSPECTOR_CORE__;
  if (!core || !core.api){ console.warn(MOD,'core fehlt'); return; }

  const LVL_CLASS = { info:'log-info', ok:'log-ok', warn:'log-warn', err:'log-error', error:'log-error' };

  // ---- State ---------------------------------------------------------------
  let raw = [];          // gesamte Rohpuffer (Strings oder Objekte)
  let lastLen = 0;
  let poll = null;

  const state = {
    info:true, ok:true, warn:true, err:true,
    q:''
  };

  const el = { controls:null, view:null };

  // ---- Utils ---------------------------------------------------------------
  const toText = (line)=>{
    if (line == null) return '';
    if (typeof line === 'string') return line;
    if (typeof line === 'object'){
      const t = line.t || line.ts || line.time || '';
      const scope = line.scope || line.src || '';
      const msg = line.msg ?? line.message ?? line.text ?? JSON.stringify(line);
      return t ? `[${t}] ${scope?scope+' ':''}${msg}` : `${scope?scope+' ':''}${msg}`;
    }
    return String(line);
  };
  const toLevel = (line)=>{
    if (line && typeof line === 'object'){
      const l=(line.lvl||line.level||'info').toString().toLowerCase();
      return (l==='error') ? 'err' : l;
    }
    const s = String(line||'');
    if (/err(or)?/i.test(s)) return 'err';
    if (/warn(ing)?/i.test(s)) return 'warn';
    if (/\bok\b/i.test(s))    return 'ok';
    if (/info/i.test(s))      return 'info';
    return 'info';
  };

  function readBuffer(){
    try{
      const buf = window.CBLog?.getBuffer?.();
      return Array.isArray(buf) ? buf.slice() : [];
    }catch(_){ return []; }
  }

  // ---- Stream --------------------------------------------------------------
  function onAppend(entry){
    raw.push(entry);
    renderAppend(entry);
  }
  function startStream(){
    raw = readBuffer();
    lastLen = raw.length;

    // Event-Stream wenn vorhanden
    if (typeof window.CBLog?.on === 'function'){
      try{
        window.CBLog.on('append', onAppend);
      }catch(_){}
    } else {
      // Poll-Fallback
      poll = setInterval(()=>{
        const buf = readBuffer();
        if (buf.length !== lastLen){
          const diff = buf.slice(lastLen);
          lastLen = buf.length;
          diff.forEach(onAppend);
        }
      }, 800);
    }
  }
  function stopStream(){
    if (poll){ clearInterval(poll); poll=null; }
    if (typeof window.CBLog?.off === 'function'){
      try{ window.CBLog.off('append', onAppend); }catch(_){}
    }
  }

  // ---- UI ------------------------------------------------------------------
  function mountControls(host){
    host.innerHTML='';
    const wrap = document.createElement('div');
    wrap.className='ins-controls';

    const mkToggle=(label,key)=>{
      const b=document.createElement('button');
      b.className='ins-toggle';
      const t=document.createElement('span'); t.className='tbox'; t.textContent=label;
      b.appendChild(t);
      b.classList.toggle('active', !!state[key]);
      b.addEventListener('click', ()=>{
        state[key]=!state[key]; b.classList.toggle('active', !!state[key]); renderAll();
      });
      return b;
    };

    const tInfo=mkToggle('INFO','info');
    const tOk  =mkToggle('OK','ok');
    const tWarn=mkToggle('WARN','warn');
    const tErr =mkToggle('ERR','err');

    const search=document.createElement('input');
    search.type='search'; search.placeholder='Suche…';
    search.className='ins-search';
    search.addEventListener('input',()=>{ state.q=(search.value||'').trim().toLowerCase(); renderAll(); });

    const btnCopy=document.createElement('button');
    btnCopy.className='ins-btn';
    btnCopy.textContent='Kopieren';
    btnCopy.addEventListener('click', async ()=>{
      const lines = filterRaw().map(toText).join('\n');
      try{ await navigator.clipboard.writeText(lines); btnCopy.classList.add('ins-flash'); setTimeout(()=>btnCopy.classList.remove('ins-flash'),500); }
      catch(_){ alert('Kopieren nicht möglich'); }
    });

    const btnExport=document.createElement('button');
    btnExport.className='ins-btn';
    btnExport.textContent='Export';
    btnExport.addEventListener('click', ()=>{
      const lines = filterRaw().map(toText).join('\n');
      const blob = new Blob([lines],{type:'text/plain'});
      const url = URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download='logs.txt';
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    wrap.append(tInfo,tOk,tWarn,tErr,search,btnCopy,btnExport);
    host.appendChild(wrap);
  }

  function filterRaw(){
    const q = state.q;
    return raw.filter(entry=>{
      const lvl = toLevel(entry);
      if ((lvl==='info' && !state.info) ||
          (lvl==='ok'   && !state.ok)   ||
          (lvl==='warn' && !state.warn) ||
          (lvl==='err'  && !state.err)) return false;
      if (q){ const s = toText(entry).toLowerCase(); if (!s.includes(q)) return false; }
      return true;
    });
  }

  function renderAll(){
    if (!el.view) return;
    const list = filterRaw();
    const frag = document.createDocumentFragment();
    for (let i=0;i<list.length;i++){
      const e = list[i];
      const div = document.createElement('div');
      div.className = (LVL_CLASS[toLevel(e)] || 'log-info') + ' log-line';
      div.textContent = toText(e);
      frag.appendChild(div);
    }
    el.view.innerHTML='';
    el.view.appendChild(frag);
    // autoscroll ans Ende
    el.view.scrollTop = el.view.scrollHeight;
  }

  function renderAppend(entry){
    // nur wenn durch Filter kommt
    const lvl = toLevel(entry);
    if ((lvl==='info' && !state.info) ||
        (lvl==='ok'   && !state.ok)   ||
        (lvl==='warn' && !state.warn) ||
        (lvl==='err'  && !state.err)) return;
    const s = toText(entry).toLowerCase();
    if (state.q && !s.includes(state.q)) return;

    if (!el.view) return;
    const div = document.createElement('div');
    div.className = (LVL_CLASS[lvl] || 'log-info') + ' log-line';
    div.textContent = toText(entry);
    el.view.appendChild(div);
    el.view.scrollTop = el.view.scrollHeight;
  }

  // ---- Mount in Core -------------------------------------------------------
  const el = {};
  core.api.mount('logs', ()=>{
    el.controls = core.api.getSlot('logs-controls');
    el.view     = core.api.getSlot('logs-view');
    if (!el.controls || !el.view) return;

    // Aufbau
    mountControls(el.controls);
    el.view.innerHTML='';

    // Historie + Stream
    raw = readBuffer(); lastLen = raw.length;
    renderAll();
    startStream();

    // Reaktionen auf open/close
    const onOpen = ()=>{ /* beim Öffnen: Liste aktualisieren */ renderAll(); };
    const onClose= ()=>{ /* nichts nötig */ };

    window.addEventListener('cb:inspector-open', onOpen);
    window.addEventListener('cb:inspector-close', onClose);

    (window.CBLog?.info||console.log)(MOD,'bereit', VER);

    return ()=>{
      stopStream();
      window.removeEventListener('cb:inspector-open', onOpen);
      window.removeEventListener('cb:inspector-close', onClose);
    };
  });

  // --- Safety-Hook: Falls kein CBLog existiert, console umbiegen ------------
  (function ensureConsoleHookOnce(){
    if (window.__INS_CONSOLE_HOOKED__) return;
    window.__INS_CONSOLE_HOOKED__ = true;
    if (window.CBLog) return; // echte CBLog vorhanden → nicht hooken
    ['log','info','warn','error'].forEach(k=>{
      const orig = console[k];
      console[k] = function(...args){
        try{
          raw.push({ level:k, scope:'console', msg: args.map(a=>String(a)).join(' ') });
          renderAppend(raw[raw.length-1]);
        }catch(_){}
        return orig.apply(this,args);
      };
    });
  })();

})();
