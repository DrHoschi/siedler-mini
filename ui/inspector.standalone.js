/* ============================================================================
 * Datei    : ui/inspector.standalone.js
 * Version  : standalone-1
 * Zweck    : Garantiert sichtbarer Inspector-Button + Vollbild-Inspector
 *            -> komplett eigenständig (bringt Styles & UI selbst mit)
 * ========================================================================= */
(function(){
  if (window.__InspectorStandalone) return;
  window.__InspectorStandalone = true;

  // ---------- Styles injizieren (unabhängig von externer CSS) ----------
  const css = `
  #inspector-toggle{
    position:fixed;
    right:calc(12px + env(safe-area-inset-right,0px));
    bottom:calc(12px + env(safe-area-inset-bottom,0px));
    z-index:2147483647;
    display:block!important;
    pointer-events:auto!important;
    padding:10px 14px;border:none;border-radius:8px;
    background:#333;color:#fff;font-weight:700;
    box-shadow:0 4px 10px rgba(0,0,0,.35);cursor:pointer;
  }
  #inspector{position:fixed;inset:0;z-index:2147483646;display:none;
    background:rgba(0,0,0,.55);backdrop-filter:blur(3px);}
  #inspector .window{position:fixed;
    inset:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px)
          env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);
    background:#2b2b2b;color:#eee;display:flex;flex-direction:column;
    border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.5);overflow:hidden}
  #inspector .bar{position:relative;background:#1e1e1e;border-bottom:1px solid #444;
    display:flex;align-items:center;padding:8px 12px;font-weight:700}
  #inspector .bar .title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #inspector .bar .close{position:absolute;right:calc(8px + env(safe-area-inset-right,0px));
    top:6px;background:#444;color:#fff;border:none;border-radius:6px;padding:4px 10px;
    cursor:pointer;font-size:18px;line-height:1}
  #inspector .bar .close:hover{background:#666}
  #inspector .content{flex:1;overflow:auto;padding:12px;background:#2b2b2b}
  #inspector .status{background:#1e1e1e;border-top:1px solid #444;color:#aaa;
    padding:8px 12px;font-size:12px}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ---------- Toggle-Button (unten rechts) ----------
  let btn = document.getElementById('inspector-toggle');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'inspector-toggle';
    btn.textContent = 'Inspector';
    document.body.appendChild(btn);
  }
  // Sicherheitsgurt – sichtbar machen, falls fremdes CSS dagegen hält:
  Object.assign(btn.style, {
    position:'fixed', right:'calc(12px + env(safe-area-inset-right,0px))',
    bottom:'calc(12px + env(safe-area-inset-bottom,0px))',
    zIndex:'2147483647', display:'block', pointerEvents:'auto'
  });

  // ---------- Overlay & Fenster ----------
  const wrap = document.createElement('div');
  wrap.id = 'inspector';
  wrap.innerHTML = `
    <div class="window">
      <div class="bar">
        <div class="title">Inspector</div>
        <button class="close" aria-label="Schließen" title="Schließen">×</button>
      </div>
      <div class="content" id="inspector-content">
        <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px">
          <div>Bereit.</div>
          <div style="opacity:.75">Tippe unten auf „Inspector“, um zu schließen/öffnen.</div>
        </div>
      </div>
      <div class="status" id="inspector-status">Logs gesamt: 0</div>
    </div>`;
  document.body.appendChild(wrap);

  // ---------- Open/Close ----------
  let open = false;
  function openIns(){ if(open) return; open = true;  wrap.style.display='block'; }
  function closeIns(){ if(!open) return; open = false; wrap.style.display='none'; }

  btn.addEventListener('click', ()=> open ? closeIns() : openIns());
  wrap.querySelector('.close').addEventListener('click', closeIns);
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && open) closeIns(); });
  // Klick außerhalb schließt:
  wrap.addEventListener('click', e=>{ if(e.target===wrap && open) closeIns(); });

  // ---------- Sichtbarkeits-Wächter (iOS UI-Shift, exotisches CSS) ----------
  function ensureButton(){
    try{
      const r = btn.getBoundingClientRect();
      const vw = window.innerWidth || 0, vh = window.innerHeight || 0;
      if (r.right<0 || r.bottom<0 || r.left>vw || r.top>vh) {
        btn.style.right = '12px'; btn.style.bottom = '12px';
      }
      if (getComputedStyle(btn).display === 'none')
        btn.style.setProperty('display', 'block', 'important');
      if (getComputedStyle(btn).zIndex !== '2147483647')
        btn.style.zIndex = '2147483647';
    }catch(_){}
  }
  ['load','resize','orientationchange','visibilitychange'].forEach(ev=>{
    window.addEventListener(ev, ensureButton, {passive:true});
  });
  setTimeout(ensureButton, 0);

  // ---------- Live-Log-Plumbing (CBLog + console + cb:/req: Events) ----------
const content = document.getElementById('inspector-content');
const status  = document.getElementById('inspector-status');
let __logCount = 0;

function __badgeColor(lvl){
  if(lvl==='ERR') return '#b33';
  if(lvl==='WARN')return '#b76f00';
  if(lvl==='EVT') return '#2f6fb6';
  if(lvl==='INFO')return '#2f6fb6';
  return '#2b8a3e'; // OK
}
function __addLog(lvl, text){
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;align-items:baseline;padding:3px 0;border-bottom:1px dashed #444';

  const badge = document.createElement('span');
  badge.textContent = lvl;
  badge.style.cssText = `padding:1px 6px;border-radius:6px;background:${__badgeColor(lvl)};color:#fff;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px`;

  const t = document.createElement('span');
  t.textContent = new Date().toLocaleTimeString();
  t.style.cssText = 'font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;opacity:.8';

  const m = document.createElement('span');
  m.textContent = String(text);
  m.style.cssText = 'font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px';

  row.append(badge,t,m);
  content.appendChild(row);
  __logCount++;
  status.textContent = 'Logs gesamt: ' + __logCount;
}

// 1) CBLog-Bridge
if(!window.CBLog){
  window.CBLog = {
    ok  : (m)=> __addLog('OK',   m),
    info: (m)=> __addLog('INFO', m),
    warn: (m)=> __addLog('WARN', m),
    err : (m)=> __addLog('ERR',  m),
  };
}else{
  ['ok','info','warn','err'].forEach(k=>{
    const prev = window.CBLog[k].bind(window.CBLog);
    window.CBLog[k] = (m)=>{ __addLog(k==='err'?'ERR':k.toUpperCase(), m); prev(m); };
  });
}

// 2) console-Spiegelung (nicht-invasiv; Original bleibt erhalten)
['log','info','warn','error'].forEach(k=>{
  const prev = console[k].bind(console);
  console[k] = function(...args){
    try{
      const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      __addLog(k==='error'?'ERR':k==='warn'?'WARN':k==='info'?'INFO':'OK', msg);
    }catch(_){} // logging darf nie crashen
    return prev(...args);
  };
});

// 3) Event-Scanner für cb:* / req:*
const __dispatch = window.dispatchEvent.bind(window);
window.dispatchEvent = function(ev){
  try{
    if(ev?.type && (ev.type.startsWith('cb:') || ev.type.startsWith('req:'))){
      __addLog('EVT', ev.type);
    }
  }catch(_){}
  return __dispatch(ev);
};

// 4) Globale Fehler abgreifen (kein Browser-Alert mehr)
window.addEventListener('error', (e)=>{
  __addLog('ERR', `Uncaught: ${e.message} @ ${e.filename}:${e.lineno}`);
});
window.addEventListener('unhandledrejection', (e)=>{
  const msg = e?.reason?.message || String(e.reason || e);
  __addLog('ERR', `Promise: ${msg}`);
});

// Boot-Meldung
__addLog('OK','Inspector bereit – Live-Logs aktiv.');
