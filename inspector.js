/* inspector.js (v16.1.9)
 * Minimal-invasive Dev-Werkzeuge für Tests/Fehleranalyse.
 * – Vollbild-Overlay (öffnen/schließen)
 * – Integrierter Log (spiegelt console.log/warn/error)
 * – Log leeren / in Zwischenablage kopieren
 * – Keine Spielfunktionen! (Start/Maps sind in index.html)
 */

(function(){
  const VERSION = "v16.1.9";

  // ----------------------- DOM aufbauen
  const overlay = document.createElement('section');
  overlay.id = 'inspectorOverlay';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:2000; display:none;
    background:rgba(0,0,0,.55); backdrop-filter:saturate(120%) blur(8px);
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
    width:min(980px, calc(100vw - 28px)); height:min(86vh, calc(100vh - 28px));
    background:linear-gradient(180deg,#0e2a1c,#0a2015);
    border-radius:16px; box-shadow:0 20px 70px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.05);
    display:flex; flex-direction:column; overflow:hidden;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    padding:14px 14px 12px; display:flex; gap:10px; align-items:center;
    color:#e8f6ef; background:rgba(255,255,255,.03);
  `;
  header.innerHTML = `
    <strong style="font-size:16px;">Inspector / Test-Cockpit</strong>
    <span style="background:#0f3926;color:#cfe9dc;border-radius:999px;padding:2px 8px;margin-left:6px;">
      v${VERSION}
    </span>
    <span style="flex:1 1 auto"></span>
    <button id="insBtnClear" style="padding:8px 10px;border-radius:10px;border:0;background:#0b2216;color:#cfe9dc;cursor:pointer;">Log leeren</button>
    <button id="insBtnClose" style="padding:8px 10px;border-radius:10px;border:0;background:#248f5c;color:#fff;cursor:pointer;">Schließen</button>
  `;

  const logBox = document.createElement('pre');
  logBox.id = 'inspectorLog';
  logBox.style.cssText = `
    margin:0; padding:14px; flex:1 1 auto; overflow:auto;
    font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    color:#cfe9dc; background:transparent;
  `;

  const footer = document.createElement('div');
  footer.style.cssText = `padding:8px 12px; display:flex; gap:8px; align-items:center; background:rgba(255,255,255,.03); color:#a9c8bb;`;
  footer.innerHTML = `
    <button id="insBtnCopy" style="padding:8px 10px;border-radius:10px;border:0;background:#0b2216;color:#cfe9dc;cursor:pointer;">📋 Log kopieren</button>
    <span id="insStatus" style="font-size:12px">Inspector bereit (inspector.js ${VERSION})</span>
  `;

  panel.append(header, logBox, footer);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // Floating Toggle-Button existiert in index.html und ruft Inspector.open()
  // (hier also keine zweite Kopie).

  // ----------------------- Logging
  const state = { lines: [], max: 1200 };

  function sym(level){ return level==='ok'?'✅':level==='warn'?'⚠️':level==='err'?'❌':'•'; }
  function fmt(level, msg){
    const ts = new Date().toTimeString().split(' ')[0];
    return `[${ts}] ${sym(level)} ${msg}`;
  }
  function append(level, msg){
    const line = fmt(level, msg);
    state.lines.push(line);
    if(state.lines.length > state.max) state.lines.splice(0, state.lines.length - state.max);
    logBox.textContent = state.lines.join('\n');
    logBox.scrollTop = logBox.scrollHeight;
  }

  // Spiegel console.* in den Inspector (ohne Original zu verlieren)
  const native = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };
  console.log = (...a)=>{ native.log(...a); append('ok', a.map(x=>toStr(x)).join(' ')); };
  console.warn = (...a)=>{ native.warn(...a); append('warn', a.map(x=>toStr(x)).join(' ')); };
  console.error = (...a)=>{ native.error(...a); append('err', a.map(x=>toStr(x)).join(' ')); };

  function toStr(v){
    if (v==null) return String(v);
    if (typeof v==='string') return v;
    try{ return JSON.stringify(v); }catch{ return String(v); }
  }

  // ----------------------- API
  const Inspector = {
    version: VERSION,
    open(){ overlay.style.display='block'; append('ok', `Inspector geöffnet (inspector.js ${VERSION})`); },
    close(){ overlay.style.display='none'; },
    toggle(){ (overlay.style.display==='block') ? Inspector.close() : Inspector.open(); },
    clear(){ state.lines.length = 0; logBox.textContent = ''; },
    log(level, msg){ append(level, msg); },
    copyLog(){
      const txt = state.lines.join('\n');
      if(navigator.clipboard?.writeText){
        navigator.clipboard.writeText(txt).then(()=>{
          document.getElementById('insStatus').textContent = 'Log in Zwischenablage';
          append('ok','Log in Zwischenablage');
        });
      }
    }
  };
  window.Inspector = Inspector;

  // ----------------------- Buttons
  document.getElementById('insBtnClose').addEventListener('click', Inspector.close);
  document.getElementById('insBtnClear').addEventListener('click', Inspector.clear);
  document.getElementById('insBtnCopy').addEventListener('click', Inspector.copyLog);

  // First line:
  append('ok', `Inspector bereit (inspector.js ${VERSION})`);
})();
