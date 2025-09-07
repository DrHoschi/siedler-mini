/* ============================================================================
 * Inspector Logs – v18.12.3
 * - Filter (INFO/OK/WARN/ERR) + Badges
 * - Suche, Kopieren, Export
 * - Stream: CBLog.on('append') oder Poll-Fallback
 * - striktes Slot-Rendering (keine body-Appends)
 * ========================================================================== */
(function(){
  'use strict';
  const core = window.__INSPECTOR_CORE__;
  const MOD  = '[inspector.logs]';
  const VER  = 'v18.12.3';
  if (!core || !core.api){ console.warn(MOD, 'Core fehlt'); return; }
  const ok   = (...a)=> (window.CBLog?.ok||console.log)(MOD, ...a);
  const warn = (...a)=> (window.CBLog?.warn||console.warn)(MOD, ...a);

  const LVLCLASS = { info:'log-info log-line', ok:'log-ok log-line', warn:'log-warn log-line', err:'log-error log-line', error:'log-error log-line' };

  const state = {
    showInfo:true, showOk:true, showWarn:true, showErr:true,
    query:'', counts:{info:0, ok:0, warn:0, err:0}
  };
  let els = { controls:null, view:null, search:null, badges:{} };
  let raw = []; let lastLen = 0; let poll = null;

  function getSlot(n){ return core.api.getSlot(n); }

  function toText(entry){
    if (entry==null) return '';
    if (typeof entry==='object'){
      const t=entry.t||entry.time||entry.ts||''; const src=entry.src||entry.scope||''; const m=entry.msg??entry.message??entry.text??JSON.stringify(entry);
      return t ? `[${t}] ${src?src+' ':''}${m}` : `${src?src+' ':''}${m}`;
    }
    return String(entry);
  }
  function levelOf(entry){
    const s = (typeof entry==='object' ? (entry.lvl||entry.level||'info') : String(entry)).toLowerCase();
    if (s.includes('err')) return 'err';
    if (s.includes('warn')) return 'warn';
    if (s.includes('ok')) return 'ok';
    return 'info';
  }

  function buildControls(){
    const host = getSlot('logs-controls'); if (!host) return;
    host.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className='ins-controls';
    const mkT = (label,key)=>{
      const b = document.createElement('button'); b.className='ins-toggle'; b.dataset.key=key;
      b.innerHTML = `<span class="tbox">${label}</span><span class="ins-badge">0</span>`;
      b.classList.toggle('active', !!state[key]);
      b.addEventListener('click', ()=>{ state[key]=!state[key]; b.classList.toggle('active', !!state[key]); renderAll(); });
      els.badges[key] = b.querySelector('.ins-badge'); return b;
    };
    const tInfo = mkT('INFO','showInfo');
    const tOk   = mkT('OK','showOk');
    const tWarn = mkT('WARN','showWarn');
    const tErr  = mkT('ERR','showErr');

    const search = document.createElement('input'); search.type='search'; search.placeholder='Suche…'; search.className='ins-search';
    search.addEventListener('input', ()=>{ state.query=(search.value||'').trim().toLowerCase(); renderAll(); });
    els.search = search;

    const copy = document.createElement('button'); copy.className='ins-btn'; copy.textContent='Kopieren';
    copy.addEventListener('click', async ()=>{
      try{ await navigator.clipboard.writeText(raw.map(toText).join('\n')); copy.textContent='Kopiert'; setTimeout(()=>copy.textContent='Kopieren', 900); }
      catch(_){ alert('Clipboard nicht verfügbar'); }
    });
    const exp = document.createElement('button'); exp.className='ins-btn'; exp.textContent='Export';
    exp.addEventListener('click', ()=>{
      const blob = new Blob([raw.map(toText).join('\n')], {type:'text/plain'});
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='logs.txt';
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    wrap.append(tInfo,tOk,tWarn,tErr,search,copy,exp);
    host.appendChild(wrap);
    els.controls = wrap;
  }

  function mountView(){
    const host = getSlot('logs-view'); if (!host) return;
    host.innerHTML=''; const div = document.createElement('div'); div.className='slot-logs-view'; host.appendChild(div);
    els.view = div;
  }

  function renderAll(){
    if (!els.view) return;
    const q = state.query;

    state.counts.info=state.counts.ok=state.counts.warn=state.counts.err=0;
    const frag=document.createDocumentFragment();

    for (let i=0;i<raw.length;i++){
      const ent = raw[i];
      const lvl = levelOf(ent);
      const txt = toText(ent);
      state.counts[lvl] = (state.counts[lvl]||0)+1;

      if ((lvl==='info' && !state.showInfo) || (lvl==='ok' && !state.showOk) || (lvl==='warn' && !state.showWarn) || (lvl==='err' && !state.showErr)) continue;
      if (q && !txt.toLowerCase().includes(q)) continue;

      const line=document.createElement('div'); line.className=LVLCLASS[lvl]||'log-info log-line'; line.textContent=txt;
      frag.appendChild(line);
    }
    els.view.innerHTML=''; els.view.appendChild(frag);

    // Badges
    if (els.badges.showInfo) els.badges.showInfo.textContent=String(state.counts.info||0);
    if (els.badges.showOk)   els.badges.showOk.textContent  =String(state.counts.ok||0);
    if (els.badges.showWarn) els.badges.showWarn.textContent=String(state.counts.warn||0);
    if (els.badges.showErr)  els.badges.showErr.textContent =String(state.counts.err||0);
    // Autoscroll ans Ende
    els.view.scrollTop = els.view.scrollHeight;
  }

  function onAppend(entry){ raw.push(entry); renderAll(); }

  function readBuffer(){ try{ const b=window.CBLog?.getBuffer?.(); return Array.isArray(b)? b.slice():[]; }catch(_){ return []; } }

  function startStream(){
    raw = readBuffer(); lastLen = raw.length; renderAll();

    if (typeof window.CBLog?.on==='function'){
      try{ window.CBLog.on('append', onAppend); ok('Stream aktiv', VER); return; }catch(_){}
    }
    // Poll-Fallback
    if (poll) clearInterval(poll);
    poll = setInterval(()=>{
      const buf = readBuffer();
      if (buf.length!==lastLen){
        const diff = buf.slice(lastLen);
        lastLen = buf.length; diff.forEach(onAppend);
      }
    }, 800);
    warn('nutze Poll-Fallback (kein CBLog.on)');
  }
  function stopStream(){
    if (poll) clearInterval(poll); poll=null;
    try{ window.CBLog?.off?.('append', onAppend); }catch(_){}
  }

  // Mount in Core
  core.api.mount('logs', ()=>{
    buildControls();
    mountView();
    startStream();
    ok('bereit', VER);
    return ()=> stopStream();
  });

  // Sicherheit: beim Öffnen neu ausrichten (Mobile Orientation)
  window.addEventListener('cb:inspector-open', ()=> setTimeout(renderAll, 0));
})();
