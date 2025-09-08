/* ============================================================================
 * Inspector Logs – v18.14.4
 *  - Filter (INFO/OK/WARN/ERR), Suche, Kopieren/Export
 *  - Sofortige Puffer-Übernahme + Live-Stream (CBLog.on append) mit Poll-Fallback
 *  - Reagiert auf Layout-Wechsel (Portrait/Landscape) -> Filter ggf. neu platzieren
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.logs]'; const VER='v18.14.4';
  const core = window.__INSPECTOR_CORE__?.api;
  if (!core) { console.warn(MOD,'core fehlt'); return; }

  // ---- helpers --------------------------------------------------------------
  const LVL = { info:'log-info', ok:'log-ok', warn:'log-warn', err:'log-error', error:'log-error' };
  const detectLevel = (line)=>{
    if (!line) return 'info';
    if (typeof line==='object') return (line.lvl||line.level||'info').toString().toLowerCase();
    const s=String(line);
    if(/\bERR(OR)?\b/i.test(s))return'err';
    if(/\bWARN(ING)?\b/i.test(s))return'warn';
    if(/\bOK\b/i.test(s))return'ok';
    return 'info';
  };
  const toText=(line)=>{
    if (!line && line!==0) return '';
    if (typeof line==='object'){
      const t=line.t||line.time||''; const src=line.src||line.source||''; 
      const msg = line.msg ?? line.message ?? line.text ?? JSON.stringify(line);
      return t ? `[${t}] ${src?src+' ':''}${msg}` : `${src?src+' ':''}${msg}`;
    }
    return String(line);
  };

  // ---- state ---------------------------------------------------------------
  let raw=[], lastLen=0, pollTimer=null;
  const state = { showInfo:true, showOk:true, showWarn:true, showErr:true, query:'', counts:{info:0,ok:0,warn:0,err:0} };
  let els = { controls:null, view:null, search:null, badgeInfo:null, badgeOk:null, badgeWarn:null, badgeErr:null };

  // ---- stream --------------------------------------------------------------
  function readBuf(){
    try { const buf = window.CBLog?.getBuffer?.(); return Array.isArray(buf) ? buf.slice() : []; }
    catch(_){ return []; }
  }
  function startStream(){
    raw = readBuf(); lastLen = raw.length;
    if (typeof window.CBLog?.on === 'function'){
      try { window.CBLog.on('append', onAppend); console.log(MOD,'Stream OK'); return; } catch(_){}
    }
    pollTimer = setInterval(()=>{
      const b = readBuf();
      if (b.length!==lastLen){ b.slice(lastLen).forEach(onAppend); lastLen=b.length; }
    }, 700);
    console.warn(MOD,'Poll-Fallback aktiv');
  }
  function stopStream(){
    if (pollTimer) clearInterval(pollTimer); pollTimer=null;
    if (typeof window.CBLog?.off==='function'){ try{ window.CBLog.off('append', onAppend); }catch(_){} }
  }
  function onAppend(entry){ raw.push(entry); pushLine(entry); }

  // ---- UI ------------------------------------------------------------------
  function buildControls(){
    const host = core.getSlot('logs-controls'); if (!host) return;
    host.innerHTML='';
    const wrap = document.createElement('div'); wrap.className='ins-controls';

    const mkToggle=(label,key,title)=>{
      const b=document.createElement('button'); b.className='ins-toggle'; b.title=title||''; 
      b.innerHTML=`<span class="tbox">${label}</span>`;
      b.classList.toggle('active', !!state[key]);
      b.addEventListener('click',()=>{ state[key]=!state[key]; b.classList.toggle('active',!!state[key]); renderList(); });
      return b;
    };
    const mkBadge=()=>{ const s=document.createElement('span'); s.className='ins-badge'; s.textContent='0'; return s; };

    const tInfo=mkToggle('INFO','showInfo','Info ein/aus');  const bi=mkBadge(); tInfo.appendChild(bi); els.badgeInfo=bi;
    const tOk  =mkToggle('OK','showOk','OK ein/aus');       const bo=mkBadge(); tOk.appendChild(bo);  els.badgeOk=bo;
    const tWrn =mkToggle('WARN','showWarn','Warn ein/aus'); const bw=mkBadge(); tWrn.appendChild(bw); els.badgeWarn=bw;
    const tErr =mkToggle('ERR','showErr','Fehler ein/aus'); const be=mkBadge(); tErr.appendChild(be); els.badgeErr=be;

    const search=document.createElement('input'); search.type='search'; search.placeholder='Suche…'; search.className='ins-search';
    search.addEventListener('input',()=>{ state.query=(search.value||'').trim().toLowerCase(); renderList(); }); els.search=search;

    const btnCopy=document.createElement('button'); btnCopy.className='ins-btn'; btnCopy.textContent='Kopieren';
    btnCopy.addEventListener('click', async ()=>{
      try { await navigator.clipboard.writeText(raw.map(toText).join('\n')); flash(btnCopy); } catch(_){ alert('Clipboard nicht verfügbar'); }
    });

    const btnExport=document.createElement('button'); btnExport.className='ins-btn'; btnExport.textContent='Export';
    btnExport.addEventListener('click', ()=>{
      const blob = new Blob([raw.map(toText).join('\n')],{type:'text/plain'});
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='logs.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    wrap.append(tInfo,tOk,tWrn,tErr,search,btnCopy,btnExport);
    host.appendChild(wrap);
  }
  const flash = el => { el.classList.add('ins-flash'); setTimeout(()=>el.classList.remove('ins-flash'),500); };

  function mountView(){
    const host = core.getSlot('logs-view'); if (!host) return;
    host.innerHTML=''; const pre = document.createElement('div'); pre.className='ins-logview'; host.appendChild(pre); els.view=pre;
  }

  function renderList(){
    if (!els.view) return;
    state.counts.info=state.counts.ok=state.counts.warn=state.counts.err=0;
    const q = state.query;
    const frag = document.createDocumentFragment();
    for (let i=0;i<raw.length;i++){
      const obj=raw[i]; const txt=toText(obj); const lvl=detectLevel(obj).toLowerCase();
      if (lvl in state.counts) state.counts[lvl]++;
      if ((lvl==='info' && !state.showInfo) || (lvl==='ok'&&!state.showOk) || (lvl==='warn'&&!state.showWarn) || (lvl==='err'&&!state.showErr)) continue;
      if (q && !txt.toLowerCase().includes(q)) continue;
      const line = document.createElement('div'); line.className=`log-line ${LVL[lvl]||'log-info'}`; line.textContent=txt; frag.appendChild(line);
    }
    els.view.innerHTML=''; els.view.appendChild(frag);
    updateBadges();
    // autoscroll ans Ende
    els.view.scrollTop = els.view.scrollHeight;
  }
  function updateBadges(){
    if (els.badgeInfo) els.badgeInfo.textContent=String(state.counts.info);
    if (els.badgeOk)   els.badgeOk.textContent=String(state.counts.ok);
    if (els.badgeWarn) els.badgeWarn.textContent=String(state.counts.warn);
    if (els.badgeErr)  els.badgeErr.textContent=String(state.counts.err);
  }
  function pushLine(entry){
    if (!els.view) return;
    const txt=toText(entry); const lvl=detectLevel(entry).toLowerCase();
    if (lvl in state.counts) state.counts[lvl]++;
    const q=state.query;
    const passLevel=(lvl!=='info'||state.showInfo)&&(lvl!=='ok'||state.showOk)&&(lvl!=='warn'||state.showWarn)&&(lvl!=='err'||state.showErr);
    const passText=!q||txt.toLowerCase().includes(q);
    if (passLevel && passText){
      const div=document.createElement('div'); div.className=`log-line ${LVL[lvl]||'log-info'}`; div.textContent=txt;
      els.view.appendChild(div); els.view.scrollTop = els.view.scrollHeight;
    }
    updateBadges();
  }

  // Layout-Wechsel: Controls ggf. neu aufbauen (weil Slot wechselt)
  window.addEventListener('ins:layout', ()=>{
    buildControls(); // Slot-Ziel kann sich ändern
  });

  // ---- mount ----------------------------------------------------------------
  core.mount('logs', ()=>{
    buildControls();
    mountView();
    raw = readBuf(); lastLen=raw.length;
    renderList();
    startStream();
    core.signal('logs:ready',{version:VER});
    console.log(MOD,'bereit',VER);
    return ()=> stopStream();
  });

})();
