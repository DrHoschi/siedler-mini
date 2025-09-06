/* ============================================================================
 * Inspector Logs – v18.11.1
 *  - Slot-basiertes UI (controls + view)
 *  - Level-Filter + Badges + Suche + Copy/Export
 *  - Stream: CBLog.on('append') oder Poll-Fallback
 *  - Safety-Hook: Historie beim Öffnen sofort übernehmen
 * ========================================================================== */
(function(){
  'use strict';

  const MOD='[inspector.logs]';
  const VER='v18.11.1';
  const core = window.__INSPECTOR_CORE__;
  if(!core || !core.api || typeof core.api.getSlot!=='function'){ console.warn(MOD,'core API fehlt'); return; }

  const LVL_CLASS = { info:'log-info', ok:'log-ok', warn:'log-warn', err:'log-error', error:'log-error' };

  // --- State/UI refs --------------------------------------------------------
  const state = { showInfo:true, showOk:true, showWarn:true, showErr:true, query:'', counts:{info:0,ok:0,warn:0,err:0} };
  let els = { view:null, badgeInfo:null, badgeOk:null, badgeWarn:null, badgeErr:null };

  let rawBuffer = [];           // Originaleinträge (Strings/Objekte)
  let pollTimer = null;

  // --- Buffer helpers -------------------------------------------------------
  const toText = (line)=>{
    if(line==null) return '';
    if(typeof line==='object'){
      const t=line.t||line.time||''; const src=line.src||line.source||''; 
      const msg=line.msg??line.message??line.text??JSON.stringify(line);
      return t ? `[${t}] ${src?src+' ':''}${msg}` : `${src?src+' ':''}${msg}`;
    }
    return String(line);
  };
  const detectLevel = (line)=>{
    if(line && typeof line==='object'){ return (line.lvl||line.level||'info').toString().toLowerCase(); }
    const s = String(line);
    if(/\bERR(OR)?\b/i.test(s)) return 'err';
    if(/\bWARN(ING)?\b/i.test(s)) return 'warn';
    if(/\bOK\b/i.test(s)) return 'ok';
    if(/\bINFO\b/i.test(s)) return 'info';
    return 'info';
  };
  const readBufferSafe = ()=> {
    try{ const b = window.CBLog?.getBuffer?.(); return Array.isArray(b)? b.slice() : []; }catch(_){ return []; }
  };

  // --- Build controls -------------------------------------------------------
  function buildControls(){
    const host = core.api.getSlot('logs-controls'); if(!host) return;
    host.innerHTML='';

    const row = document.createElement('div'); row.className='ins-controls';

    const mkToggle = (label,key)=>{
      const b=document.createElement('button'); b.className='ins-toggle'; b.textContent=label;
      b.classList.toggle('active', !!state[key]);
      b.addEventListener('click',()=>{ state[key]=!state[key]; b.classList.toggle('active',!!state[key]); render(); });
      const s=document.createElement('span'); s.className='ins-badge'; s.textContent='0';
      b.appendChild(s);
      if(key==='showInfo') els.badgeInfo=s;
      if(key==='showOk')   els.badgeOk=s;
      if(key==='showWarn') els.badgeWarn=s;
      if(key==='showErr')  els.badgeErr=s;
      return b;
    };

    const tInfo = mkToggle('INFO','showInfo');
    const tOk   = mkToggle('OK','showOk');
    const tWarn = mkToggle('WARN','showWarn');
    const tErr  = mkToggle('ERR','showErr');

    const search = document.createElement('input');
    search.type='search'; search.placeholder='Suche…'; search.className='ins-search';
    search.addEventListener('input',()=>{ state.query=(search.value||'').trim().toLowerCase(); render(); });

    const btnCopy = document.createElement('button'); btnCopy.className='ins-toggle'; btnCopy.textContent='Kopieren';
    btnCopy.addEventListener('click', async ()=>{
      try{ await navigator.clipboard.writeText(collectText().join('\n')); btnCopy.classList.add('ins-flash'); setTimeout(()=>btnCopy.classList.remove('ins-flash'),600); }catch(_){ alert('Kopieren nicht möglich'); }
    });
    const btnExport = document.createElement('button'); btnExport.className='ins-toggle'; btnExport.textContent='Export';
    btnExport.addEventListener('click',()=>{
      const blob = new Blob([collectText().join('\n')],{type:'text/plain'});
      const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='logs.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    row.append(tInfo,tOk,tWarn,tErr,search,btnCopy,btnExport);
    host.appendChild(row);
  }

  function buildView(){
    const host = core.api.getSlot('logs-view'); if(!host) return;
    host.innerHTML='';
    const div = document.createElement('div');
    div.className = 'ins-logview';
    host.appendChild(div);
    els.view = div;
  }

  // --- Rendering ------------------------------------------------------------
  function collectText(){ return rawBuffer.map(toText); }

  function render(){
    if(!els.view) return;
    const q = state.query;

    state.counts.info=state.counts.ok=state.counts.warn=state.counts.err=0;

    const frag = document.createDocumentFragment();
    for(let i=0;i<rawBuffer.length;i++){
      const obj=rawBuffer[i]; const txt=toText(obj); const lvl=detectLevel(obj);
      if(lvl in state.counts) state.counts[lvl]++;

      if((lvl==='info'&&!state.showInfo)||(lvl==='ok'&&!state.showOk)||(lvl==='warn'&&!state.showWarn)||(lvl==='err'&&!state.showErr)) continue;
      if(q && !txt.toLowerCase().includes(q)) continue;

      const ln=document.createElement('div'); ln.className=LVL_CLASS[lvl]||'log-info'; ln.textContent=txt;
      frag.appendChild(ln);
    }
    els.view.innerHTML=''; els.view.appendChild(frag);

    if(els.badgeInfo) els.badgeInfo.textContent = String(state.counts.info);
    if(els.badgeOk)   els.badgeOk.textContent   = String(state.counts.ok);
    if(els.badgeWarn) els.badgeWarn.textContent = String(state.counts.warn);
    if(els.badgeErr)  els.badgeErr.textContent  = String(state.counts.err);
  }

  function push(entry){
    rawBuffer.push(entry);
    // inkrementelles Render nur wenn sichtbar
    const q=state.query, lvl=detectLevel(entry), txt=toText(entry);
    if(lvl in state.counts) state.counts[lvl]++;
    const passLevel=(lvl!=='info'||state.showInfo)&&(lvl!=='ok'||state.showOk)&&(lvl!=='warn'||state.showWarn)&&(lvl!=='err'||state.showErr);
    const passText=!q||txt.toLowerCase().includes(q);
    if(passLevel && passText && els.view){
      const div=document.createElement('div'); div.className=LVL_CLASS[lvl]||'log-info'; div.textContent=txt;
      els.view.appendChild(div); els.view.scrollTop=els.view.scrollHeight;
    }
    if(els.badgeInfo) els.badgeInfo.textContent = String(state.counts.info);
    if(els.badgeOk)   els.badgeOk.textContent   = String(state.counts.ok);
    if(els.badgeWarn) els.badgeWarn.textContent = String(state.counts.warn);
    if(els.badgeErr)  els.badgeErr.textContent  = String(state.counts.err);
  }

  // --- Stream ---------------------------------------------------------------
  function startStream(){
    // Historie
    rawBuffer = readBufferSafe();
    render();

    if(typeof window.CBLog?.on === 'function'){
      try{ window.CBLog.on('append', push); (window.CBLog?.ok||console.log)(`${MOD} stream bereit ${VER}`); return; }catch(_){}
    }
    // Poll Fallback
    let last = rawBuffer.length;
    pollTimer = setInterval(()=>{
      const buf = readBufferSafe();
      if(buf.length>last){
        const diff = buf.slice(last); last = buf.length;
        diff.forEach(push);
      }
    }, 800);
    (window.CBLog?.warn||console.warn)(`${MOD} poll-fallback aktiv (kein CBLog.on)`);
  }

  function stopStream(){
    if(pollTimer){ clearInterval(pollTimer); pollTimer=null; }
    if(typeof window.CBLog?.off === 'function'){ try{ window.CBLog.off('append', push); }catch(_){ } }
  }

  // --- Mount in Tab ---------------------------------------------------------
  core.api.mount('logs', ()=>{
    buildControls();
    buildView();
    startStream();
    (window.CBLog?.info||console.log)(`${MOD} bereit ${VER}`);
    return ()=> stopStream();
  });

  // --- SAFETY HOOK: Historie beim Öffnen übernehmen + Stream starten --------
  (function attachLogStreamOnce(){
    if(window.__INS_LOGS_WIRED__) return;
    window.__INS_LOGS_WIRED__ = true;

    const pumpHistory = ()=>{
      try{
        const buf = readBufferSafe();
        if(Array.isArray(buf) && buf.length){
          // falls view bereits existiert → schneller render
          rawBuffer = buf.slice();
          render();
        }
      }catch(_){}
    };

    window.addEventListener('cb:inspector-open', ()=>{
      pumpHistory();
      try{ window.CBLog?.LogStream?.start?.(); }catch(_){}
    });

    window.addEventListener('cb:inspector-close', ()=>{
      try{ window.CBLog?.LogStream?.stop?.(); }catch(_){}
    });

    if(document.body.classList.contains('inspector-open')){
      pumpHistory();
      try{ window.CBLog?.LogStream?.start?.(); }catch(_){}
    }

    // Minimaler console.* Fallback (wenn kein CBLog da ist)
    if(!window.CBLog){
      ['log','info','warn','error'].forEach(k=>{
        const orig = console[k];
        console[k] = function(...args){
          try{ push({ lvl:k, msg: args.map(a=>String(a)).join(' '), src:'console' }); }catch(_){}
          return orig.apply(this,args);
        };
      });
    }
  })();
})();
