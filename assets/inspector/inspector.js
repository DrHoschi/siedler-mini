/* ============================================================================
 * assets/inspector/inspector.js — v18.3.3
 * Tabs: Übersicht | Logs | Build | Pfade | Tests
 * LOGS:
 *   - liest CBLog.dump() / getBuffer() / (_buf|buf)
 *   - hört auf 'cblog:append' / 'cblog:flush'
 *   - hat Console-Fallback, wenn CBLog fehlt
 * Öffnen:
 *   - GameUI.toggleInspector() (nicht überschreiben!)
 *   - hört zusätzlich auf 'cb:toggle-inspector' (Fallback)
 * UI:
 *   - dunkles Grau, runde Ecken; CSS in assets/inspector/inspector.css
 * ========================================================================== */
(function () {
  'use strict';

  const VERSION = 'v18.3.3';
  const ROOT_ID = 'inspector';

  const L = {
    ok:   (m)=> (window.CBLog?.ok   || console.log)(`[inspector.core] ${m}`),
    info: (m)=> (window.CBLog?.info || console.log)(`[inspector.core] ${m}`),
    warn: (m)=> (window.CBLog?.warn || console.warn)(`[inspector.core] ${m}`),
    err:  (m)=> (window.CBLog?.err  || console.error)(`[inspector.core] ${m}`),
  };

  // ------------------------- LogStream ---------------------------------------
  const LogStream = (() => {
    const listeners = new Set();
    const fb = []; // Fallback-Puffer
    let unsub = null;

    function emit(x){ listeners.forEach(fn=>{ try{ fn(x); }catch(_){ } }); }

    function ensureConsoleFallback(){
      if (window.CBLog) return;
      const orig = {
        log: console.log.bind(console),
        info: (console.info||console.log).bind(console),
        warn: (console.warn||console.log).bind(console),
        error:(console.error||console.log).bind(console),
      };
      ['log','info','warn','error'].forEach(fn=>{
        console[fn] = function(...a){
          try{
            const ts=new Date().toLocaleTimeString();
            const lvl= fn==='error'?'ERR':fn==='warn'?'WARN':fn==='info'?'INFO':'LOG';
            const line = `[${ts}] ${lvl} ${a.map(String).join(' ')}`;
            fb.push(line); emit(line);
          }catch(_){}
          orig[fn](...a);
        };
      });
      L.info('Console-Fallback aktiv (kein CBLog gefunden).');
    }

    function readCB(){
      try{
        if (window.CBLog?.dump){
          const s=window.CBLog.dump(); return typeof s==='string'? s.split('\n') : (Array.isArray(s)?s:[]);
        }
        if (window.CBLog?.getBuffer){ const a=window.CBLog.getBuffer(); return Array.isArray(a)?a.slice():[]; }
        if (Array.isArray(window.CBLog?._buf)) return window.CBLog._buf.slice();
        if (Array.isArray(window.CBLog?.buf))  return window.CBLog.buf.slice();
      }catch(_){}
      return null;
    }

    function start(){
      const onAppend=e=>emit(e?.detail||e||'');
      const onFlush =()=>emit('[flush]');
      window.addEventListener('cblog:append', onAppend);
      window.addEventListener('cblog:flush',  onFlush);
      unsub = ()=>{ window.removeEventListener('cblog:append', onAppend);
                    window.removeEventListener('cblog:flush',  onFlush); };

      const init = readCB();
      if (!init) ensureConsoleFallback();
      return init || fb.slice();
    }
    function stop(){ if (unsub){ try{unsub();}catch(_){ } unsub=null; } }
    function readAll(){ return readCB() || fb.slice(); }
    function subscribe(fn){ listeners.add(fn); return ()=>listeners.delete(fn); }

    return { start, stop, readAll, subscribe };
  })();

  // ------------------------- UI ----------------------------------------------
  const S = { root:null, active:'logs', logPre:null, logBadge:null, unsub:null };

  function h(tag, attrs, kids){
    const el=document.createElement(tag);
    if (attrs) for (const k in attrs){
      const v=attrs[k];
      if (k==='class') el.className=v;
      else if (k==='style') el.style.cssText=v;
      else if (k.startsWith('on') && typeof v==='function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k,v);
    }
    if (kids!=null){ (Array.isArray(kids)?kids:[kids]).forEach(c=> el.appendChild(typeof c==='string'? document.createTextNode(c):c)); }
    return el;
  }

  function buildUI(){
    let root = document.getElementById(ROOT_ID);
    if (!root){ root = h('div',{id:ROOT_ID,class:'inspector-panel'}); document.body.appendChild(root); }
    root.innerHTML='';

    const head = h('div',{class:'insp-head'},[
      h('div',{class:'insp-title'},'Inspector'),
      h('div',{class:'insp-ver'},VERSION),
      h('button',{class:'insp-close',onclick:close},'Schließen')
    ]);

    const tabs = h('div',{class:'insp-tabs'},[
      tab('overview','Übersicht'), tab('logs','Logs'),
      tab('build','Build'), tab('paths','Pfade'), tab('tests','Tests')
    ]);

    const body = h('div',{class:'insp-body'});

    const vOverview = h('div',{class:'tab tab-overview', 'data-tab':'overview'},[
      row('Runtime','—'),
      row('Canvas','—'),
      row('Map','—'),
      row('FPS','—'),
    ]);

    const pre = h('pre',{class:'log-view','aria-label':'Logs'},'[Warte auf Log-Ereignisse…]');
    const badge = h('span',{class:'badge'},'0');
    const vLogs = h('div',{class:'tab tab-logs','data-tab':'logs'},[
      h('div',{class:'tab-inset-head'},[
        h('span',{class:'muted'},'Live-Logs'), h('span',{class:'spacer'}),
        h('span',{class:'muted'},'Zeilen: '), badge
      ]),
      pre,
      h('div',{class:'tab-actions'},[
        h('button',{class:'btn',onclick:()=>copy(pre)},'Kopieren')
      ])
    ]);

    const vBuild = h('div',{class:'tab tab-build','data-tab':'build'},[
      h('div',{class:'muted'},'Build-Werkzeuge (Platzhalter).')
    ]);

    const vPaths = h('div',{class:'tab tab-paths','data-tab':'paths'},[
      h('div',{class:'muted'},'Pfade / Heatmap (Platzhalter).')
    ]);

    const vTests = h('div',{class:'tab tab-tests','data-tab':'tests'},[
      h('div',{class:'muted'},'Test-Tools (Platzhalter).')
    ]);

    body.append(vOverview,vLogs,vBuild,vPaths,vTests);
    root.append(head,tabs,body);

    S.root=root; S.logPre=pre; S.logBadge=badge;
    activate(S.active);
    startLogs();
    L.ok(`bereit (${VERSION})`);
  }

  function row(k,v){ return h('div',{class:'kv'},[ h('div',{class:'k'},k), h('div',{class:'v'},String(v)) ]); }

  function tab(id,label){
    return h('button',{class:'insp-tab', 'data-tab':id, onclick:()=>activate(id)},label);
  }

  function activate(id){
    S.active=id;
    if (!S.root) return;
    S.root.querySelectorAll('.insp-tab').forEach(b=>{
      b.classList.toggle('active', b.getAttribute('data-tab')===id);
    });
    S.root.querySelectorAll('.tab').forEach(p=>{
      p.style.display = (p.getAttribute('data-tab')===id) ? 'block' : 'none';
    });
  }

  // ------------------------- Logs --------------------------------------------
  function startLogs(){
    stopLogs();
    const init = LogStream.start();
    if (init && init.length) render(init); else render(['[Warte auf Log-Ereignisse…]']);
    S.unsub = LogStream.subscribe(lines=>{
      Array.isArray(lines) ? append(lines) : append([String(lines||'')]);
    });
    // harter Refresh einmal beim Öffnen
    const all = LogStream.readAll(); if (all && all.length) render(all);
  }
  function stopLogs(){ if (S.unsub){ try{S.unsub();}catch(_){ } S.unsub=null; LogStream.stop(); } }
  function render(lines){ S.logPre.textContent = lines.join('\n'); setBadge(lines.length); scrollBottom(); }
  function append(lines){
    const had = S.logPre.textContent || '';
    S.logPre.textContent = (had ? had+'\n' : '') + lines.join('\n');
    setBadge(S.logPre.textContent.split('\n').length);
    scrollBottom();
  }
  function setBadge(n){ if (S.logBadge) S.logBadge.textContent = String(n|0); }
  function scrollBottom(){ try{ S.logPre.scrollTop = S.logPre.scrollHeight; }catch(_){ } }
  function copy(pre){ try{ navigator.clipboard?.writeText(pre.textContent||''); L.ok('Logs kopiert'); }catch(_){ } }

  // ------------------------- Öffnen / API ------------------------------------
  function open(){ if (!S.root) buildUI(); S.root.style.display='block'; S.root.classList.add('open'); startLogs(); window.dispatchEvent(new Event('cb:inspector-open')); }
  function close(){ if (!S.root) return; S.root.classList.remove('open'); S.root.style.display='none'; stopLogs(); window.dispatchEvent(new Event('cb:inspector-close')); }
  function toggle(){ if (!S.root) buildUI(); const vis = S.root.style.display !== 'none'; vis ? close() : open(); }

  // NICHT überschreiben, falls bereits vorhanden:
  window.GameUI = window.GameUI || {};
  if (window.GameUI.toggleInspector !== toggle) {
    if (typeof window.GameUI.toggleInspector !== 'function') window.GameUI.toggleInspector = toggle;
  }

  // Hör auf globales Fallback-Event:
  window.addEventListener('cb:toggle-inspector', (e)=> {
    const f = e?.detail?.force;
    if (typeof f === 'boolean') return f ? open() : close();
    toggle();
  });

  // Auto: Query ?inspector=1
  if (location.search.includes('inspector=1')) setTimeout(open, 150);

  L.ok(`geladen (${VERSION})`);
})();
