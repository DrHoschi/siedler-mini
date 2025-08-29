// assets/inspector/inspector.js
// v16.1.12
// ---------------------------------------------
// Kompakter Inspector für Tests/Debug:
// - Vollbild-Overlay mit Log-Ausgabe (puffert, live)
// - Log leeren / Log kopieren
// - Schließen-Button
// - Öffnen/Schließen via window.GameInspector.toggle()
// - Zeichnet ALLE Logs, weil die Konsole global in index.html abgezapft wird.
// ---------------------------------------------

(function(){
  const VERSION = 'v16.1.12';

  // Warte bis DOM vorhanden ist (Skript ist "defer", sollte also safe sein)
  const root = document.getElementById('inspectorRoot');
  if (!root) { console.error('[inspector] Root-Element #inspectorRoot fehlt.'); return; }

  // Grundaufbau
  root.innerHTML = `
    <div id="inspBackdrop" style="
      position:fixed;inset:0;background:rgba(6,12,10,.65);backdrop-filter: blur(4px);
      display:flex;align-items:flex-start;justify-content:center;padding:24px;">
      <div id="inspPanel" role="dialog" aria-label="Inspector" style="
        width:min(1100px,95vw);height:min(88vh,900px);
        background:#0b1110;border:1px solid #20352d;border-radius:14px;
        box-shadow:0 14px 46px rgba(0,0,0,.5); color:#d7efe6; display:flex; flex-direction:column;">
        <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #183129;background:#0f1715;border-radius:14px 14px 0 0">
          <strong style="font-size:18px">Inspector / Test-Cockpit</strong>
          <span style="margin-left:auto;background:#1b2a25;color:#aee4cf;border-radius:999px;padding:4px 9px;font-size:12px">${VERSION}</span>
          <button id="inspBtnCopy"   style="margin-left:12px;border:0;border-radius:10px;padding:8px 10px;background:#152325;color:#d7efe6;cursor:pointer">Log kopieren</button>
          <button id="inspBtnClear"  style="border:0;border-radius:10px;padding:8px 10px;background:#14201e;color:#c2ded5;cursor:pointer">Log leeren</button>
          <button id="inspBtnClose"  style="border:0;border-radius:10px;padding:8px 12px;background:#803b3b;color:#fff;cursor:pointer">Schließen</button>
        </div>
        <div id="inspLog" style="
          font:12.5px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
          white-space:pre; overflow:auto; flex:1; padding:12px 14px; background:#050a09;">
        </div>
      </div>
    </div>
  `;

  const inspLog = root.querySelector('#inspLog');

  function fmtLine(line){
    const hh = String(line.t.getHours()).padStart(2,'0');
    const mm = String(line.t.getMinutes()).padStart(2,'0');
    const ss = String(line.t.getSeconds()).padStart(2,'0');
    const prefix =
      line.level==='ok'   ? '✅ (ok) '  :
      line.level==='warn' ? '⚠️ (warn) ':
      line.level==='err'  ? '❌ (err) ' : '';
    return `[${hh}:${mm}:${ss}] ${prefix}${line.msg}`;
  }

  function renderFull(){
    // komplette Neuzeichnung – robust, falls mal Events „verpasst“ wurden
    const buf = (window.CBLog && window.CBLog.buffer) ? window.CBLog.buffer : [];
    inspLog.textContent = buf.map(fmtLine).join('\n');
    // Scroll ans Ende
    inspLog.scrollTop = inspLog.scrollHeight;
  }

  function appendLine(line){
    if (!line) return renderFull();
    inspLog.textContent += (inspLog.textContent ? '\n' : '') + fmtLine(line);
    inspLog.scrollTop = inspLog.scrollHeight;
  }

  // Erstbefüllung + Live-Updates
  renderFull();
  if (window.CBLog && typeof window.CBLog.on === 'function') {
    window.CBLog.on(appendLine);
  } else {
    // Falls CBLog noch nicht existiert, poll kurz – danach ist renderFull() dran.
    let tries = 0;
    const iv = setInterval(()=>{
      if (window.CBLog && window.CBLog.on){ clearInterval(iv); renderFull(); window.CBLog.on(appendLine); }
      else if (++tries > 50) { clearInterval(iv); }
    }, 120);
  }

  // Aktionen
  root.querySelector('#inspBtnClose').addEventListener('click', ()=> GameInspector.close());
  root.querySelector('#inspBtnCopy').addEventListener('click', async ()=>{
    try{
      const txt = window.CBLog ? window.CBLog.exportText() : inspLog.textContent;
      await navigator.clipboard.writeText(txt);
      if (window.CBLog) window.CBLog.push('ok','Log in Zwischenablage');
    }catch(e){
      if (window.CBLog) window.CBLog.push('err','Log kopieren fehlgeschlagen: '+e.message);
    }
  });
  root.querySelector('#inspBtnClear').addEventListener('click', ()=>{
    if (window.CBLog) window.CBLog.clear();
    inspLog.textContent = '';
    if (window.CBLog) window.CBLog.push('ok','Log geleert');
  });

  // API
  const GameInspector = (window.GameInspector = {
    open(){ root.classList.add('show'); root.setAttribute('aria-hidden','false'); renderFull(); },
    close(){ root.classList.remove('show'); root.setAttribute('aria-hidden','true'); },
    toggle(){ root.classList.contains('show') ? this.close() : this.open(); }
  });

  // Badge im Log
  if (window.CBLog) window.CBLog.push('ok', `Inspector bereit (inspector.js ${VERSION})`);

  // Optional: Inspector direkt öffnen, wenn URL ?inspector=1 enthält
  try {
    const usp = new URLSearchParams(location.search);
    if (usp.get('inspector') === '1') GameInspector.open();
  } catch(_) { /* ignore */ }
})();
