// assets/inspector/inspector.js
// v16.1.13
// ---------------------------------------------
// Kompakter Inspector für Tests/Debug:
// - Vollbild-Overlay mit Log-Ausgabe (puffert, live)
// - Log leeren / Log kopieren
// - Schließen-Button
// - Öffnen/Schließen via window.GameInspector.toggle()
// - Zeichnet ALLE Logs, weil die Konsole in index.html global in CBLog spiegelt.
// - Layout/Größe bleiben stabil; reine Logik-Verbesserungen.
// ---------------------------------------------
(function(){
  const VERSION = 'v16.1.13';

  // Root-Container muss in index.html vorhanden sein
  const root = document.getElementById('inspectorRoot');
  if (!root) {
    console.error('[inspector] Root-Element #inspectorRoot fehlt.');
    return;
  }

  // Grundaufbau – UI bewusst kompakt, Inhalt wie bisher
  root.innerHTML = `
    <section role="dialog" aria-modal="true" style="
      position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
      background:rgba(0,0,0,.55); backdrop-filter:saturate(120%) blur(8px);
      color:#e8f6ef; z-index:2000;
    ">
      <div style="
        width:min(980px, calc(100vw - 28px));
        height:min(86vh, calc(100vh - 28px));
        background:linear-gradient(180deg,#0e2a1c,#0a2015);
        border-radius:16px; box-shadow:0 20px 70px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.05);
        display:flex; flex-direction:column; overflow:hidden;
      ">
        <header style="padding:14px 14px 12px; display:flex; gap:10px; align-items:center; background:rgba(255,255,255,.03);">
          <strong style="font-size:18px;">Inspector / Test-Cockpit</strong>
          <span style="margin-left:auto; opacity:.9;">${VERSION}</span>
          <button id="inspBtnCopy" style="margin-left:12px; padding:8px 12px; border-radius:10px; background:#20372c; color:#eaf6ef; border:none; cursor:pointer;">Log kopieren</button>
          <button id="inspBtnClear" style="padding:8px 12px; border-radius:10px; background:#20372c; color:#eaf6ef; border:none; cursor:pointer;">Log leeren</button>
          <button id="inspBtnClose" style="padding:8px 12px; border-radius:10px; background:#7a2b2b; color:#fff; border:none; cursor:pointer;">Schließen</button>
        </header>
        <pre id="inspLog" style="margin:0; padding:14px; flex:1 1 auto; overflow:auto;
          font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; color:#cfe9dc; background:transparent;"></pre>
        <footer style="padding:8px 12px; background:rgba(255,255,255,.03); color:#a9c8bb;">
          <span id="inspStatus">Inspector bereit (inspector.js ${VERSION})</span>
        </footer>
      </div>
    </section>
  `;

  const inspLog = root.querySelector('#inspLog');
  const inspStatus = root.querySelector('#inspStatus');

  // Hilfsfunktionen zum Zeichnen
  function fmtLine(line){
    if(!line) return '';
    const pad = n => String(n).padStart(2,'0');
    const t = line.t, ts = `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
    const pref = line.level==='ok' ? '✅ (ok) ' : line.level==='warn' ? '⚠️ (warn) ' : line.level==='err' ? '❌ (err) ' : '';
    return `[${ts}] ${pref}${line.msg}`;
  }
  function renderFull(){
    const buf = (window.CBLog && window.CBLog.buffer) ? window.CBLog.buffer : [];
    inspLog.textContent = buf.map(fmtLine).join('\n');
    inspLog.scrollTop = inspLog.scrollHeight;
  }
  function appendLine(line){
    if (!line) return renderFull();
    inspLog.textContent += (inspLog.textContent ? '\n' : '') + fmtLine(line);
    inspLog.scrollTop = inspLog.scrollHeight;
  }

  // Erstbefüllung + Live-Stream
  renderFull();
  (function hookStream(){
    if (window.CBLog && typeof window.CBLog.on === 'function'){
      window.CBLog.on(appendLine);
    } else {
      // CBLog noch nicht da? kurz pollen
      let tries = 0;
      const iv = setInterval(()=>{
        if (window.CBLog && window.CBLog.on){
          clearInterval(iv);
          renderFull();
          window.CBLog.on(appendLine);
        } else if (++tries>50){
          clearInterval(iv);
        }
      }, 120);
    }
  })();

  // Aktionen
  root.querySelector('#inspBtnClose').addEventListener('click', ()=> GameInspector.close());
  root.querySelector('#inspBtnCopy').addEventListener('click', async ()=>{
    try{
      const txt = window.CBLog ? window.CBLog.exportText() : inspLog.textContent;
      await navigator.clipboard.writeText(txt);
      inspStatus.textContent = 'Log in Zwischenablage';
      window.CBLog?.push('ok','Log in Zwischenablage');
    }catch(e){
      inspStatus.textContent = 'Kopieren fehlgeschlagen';
      window.CBLog?.push('err','Log kopieren fehlgeschlagen: '+e.message);
    }
  });
  root.querySelector('#inspBtnClear').addEventListener('click', ()=>{
    window.CBLog?.clear();
    inspLog.textContent = '';
    window.CBLog?.push('ok','Log geleert');
  });

  // Öffentliche API
  window.GameInspector = {
    open(){ root.classList.add('show'); root.setAttribute('aria-hidden','false'); renderFull(); },
    close(){ root.classList.remove('show'); root.setAttribute('aria-hidden','true'); },
    toggle(){ root.classList.contains('show') ? this.close() : this.open(); },
    version: VERSION
  };

  // Badge im Log
  window.CBLog?.push('ok', `Inspector bereit (inspector.js ${VERSION})`);

  // Optional: auto-open via ?inspector=1
  try{ const usp=new URLSearchParams(location.search); if(usp.get('inspector')==='1') window.GameInspector.open(); }catch(_){}
})();
