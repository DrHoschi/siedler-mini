/* ============================================================================
 * Datei   : tools/debug-collector.js
 * Projekt : Neue Siedler – Log-Export
 * Version : v1.0.0 (2025-10-05)
 * Zweck   : Alle console-Ausgaben + Errors sammeln und exportierbar machen
 * API     : DBG.copy(), DBG.download(), DBG.dump()
 * ============================================================================ */
(function(){
  const TAG = '[log]';
  const MAX = 5000; // harte Obergrenze (Einträge) – älteste fliegen raus
  const store = []; // { t:number, lvl:string, args:any[] }

  const levels = ['log','info','warn','error','debug'];
  const native = {};
  levels.forEach(lvl => native[lvl] = console[lvl].bind(console));

  function ts(){ return new Date().toISOString(); }
  function push(lvl,args){
    store.push({ t: Date.now(), lvl, args: Array.from(args) });
    if (store.length > MAX) store.splice(0, store.length - MAX);
  }

  // console tee
  levels.forEach(lvl => {
    console[lvl] = function(...a){
      try { push(lvl, a); } catch {}
      native[lvl](...a);
    };
  });

  // CBLog (optional) auch tee-en
  if (window.CBLog){
    try{
      const cb = window.CBLog;
      if (cb.ok)  window.CBLog.ok  = (...a)=>{ push('ok', a);  cb.ok(...a);  };
      if (cb.warn)window.CBLog.warn= (...a)=>{ push('warn',a); cb.warn(...a); };
      if (cb.err) window.CBLog.err = (...a)=>{ push('error',a);cb.err(...a);  };
    }catch{}
  }

  // window errors
  window.addEventListener('error', (ev)=>{
    push('error', [`[onerror] ${ev.message} @ ${ev.filename}:${ev.lineno}:${ev.colno}`, ev.error]);
  });
  window.addEventListener('unhandledrejection', (ev)=>{
    push('error', ['[unhandledrejection]', ev.reason]);
  });

  // Formatierer
  function formatEntry(e,i){
    const time = new Date(e.t).toISOString();
    const head = `${String(i).padStart(5,'0')} ${time} [${e.lvl.toUpperCase()}]`;
    // möglichst menschenlesbar serialisieren
    const body = e.args.map(x=>{
      try{
        if (typeof x === 'string') return x;
        return JSON.stringify(x, (k,v)=>v instanceof Error ? (v.stack || v.message) : v, 2);
      }catch{
        return String(x);
      }
    }).join(' ');
    return `${head} ${body}`;
  }
  function asText(){
    return store.map(formatEntry).join('\n');
  }

  // Export-API
  async function copy(){
    const txt = asText();
    try{
      await navigator.clipboard.writeText(txt);
      console.info('[log] copied %d lines to clipboard', store.length);
    }catch(e){
      console.warn('[log] clipboard failed – fallback to prompt');
      // Fallback, wenn Clipboard in iOS/Safari blockiert ist
      window.prompt('Logs kopieren (⌘A, ⌘C):', txt);
    }
  }
  function download(){
    const txt = asText();
    const blob = new Blob([txt], { type:'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g,'').slice(0,15);
    a.href = URL.createObjectURL(blob);
    a.download = `siedler-log-${ts}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    console.info('[log] downloaded %d lines', store.length);
  }
  function dump(){ return store.slice(); }

  // Button (optional)
  function addFloatingButton(){
    if (document.getElementById('btn-log-export')) return;
    const btn = document.createElement('button');
    btn.id = 'btn-log-export';
    btn.textContent = 'Export';
    btn.title = 'Gesamten Log als Datei speichern';
    Object.assign(btn.style, {
      position:'fixed', right:'10px', bottom:'60px', zIndex: 2147483647,
      padding:'8px 10px', borderRadius:'8px', border:'1px solid #2f5b94',
      background:'#13324f', color:'#eaf0ff', fontWeight:'600', cursor:'pointer',
      boxShadow:'0 6px 16px rgba(0,0,0,.25)'
    });
    btn.addEventListener('click', download);
    document.body.appendChild(btn);
  }

  // Global verfügbar machen (wir hängen an dein DBG aus debug-tools.js an)
  window.DBG = Object.assign(window.DBG||{}, { copy, download, dump });

  // Auto-Button – kannst du entfernen, wenn du ihn nicht willst:
  addFloatingButton();

  console.info('[log] collector ready (tee console + errors). Total buffer=%d', MAX);
})();
