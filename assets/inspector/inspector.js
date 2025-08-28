/* inspector.js v16.1.10
   Developer-Inspector: Immer verfügbarer Overlay für Tests/Analyse.
   - Öffnen via Button (unten rechts, von index.html geliefert) oder API:
       window.GameInspector.open()
   - Enthält: Log-Viewer, "Log leeren", "Log kopieren", "Cache-Booster", "Schließen"
   - Vollbild-Overlay; blockiert Spielfläche, bis geschlossen.
   - Keine Start- oder Map-Funktionen (Start ist im Start-Fenster).
*/

(function(){
  const VERSION = '16.1.10';
  const S = (strings,...vals)=>strings.map((s,i)=>s+(vals[i]??'')).join('');

  const css = `
  #inspectorOverlay{display:none; background:rgba(0,0,0,.55); backdrop-filter: blur(6px);}
  #inspectorPanel{
    position:absolute; left:50%; top:6vh; transform:translateX(-50%);
    width:min(1200px, calc(100vw - 40px)); height:min(84vh, 820px);
    background:linear-gradient(180deg, rgba(18,22,24,.95), rgba(18,22,24,.88));
    border:1px solid rgba(255,255,255,.08); border-radius:14px; color:#eaf5f2;
    box-shadow:0 30px 90px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.05);
    display:flex; flex-direction:column; overflow:hidden;
  }
  #inspHead{padding:12px 14px; display:flex; align-items:center; gap:10px; background:rgba(255,255,255,.02)}
  #inspHead h2{font-size:16px; margin:0; flex:1}
  #inspBtns{display:flex; gap:8px}
  .ibtn{background:#142225; color:#d9eee6; border:1px solid #2e4245; border-radius:10px; padding:8px 10px; cursor:pointer}
  .ibtn:hover{filter:brightness(1.08)}
  .ibtn.warn{background:#ffcc00; color:#0a1110; border-color:#b48e00}
  #inspLog{flex:1; background:#0a1214; margin:10px; border-radius:10px; border:1px solid #2a3a3e; overflow:auto}
  #inspLog pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:12px; line-height:1.45;
               padding:12px; margin:0; white-space:pre-wrap}
  .ok{color:#62e684} .warn{color:#ffcc66} .err{color:#ff6b6b}
  `;

  function ensureDOM(){
    if (document.getElementById('inspectorOverlay')) return;

    const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

    const overlay = document.createElement('div'); overlay.id = 'inspectorOverlay';
    overlay.innerHTML = S`
      <div id="inspectorPanel">
        <div id="inspHead">
          <h2>Inspector / Test-Cockpit <span style="opacity:.7">(inspector.js v${VERSION})</span></h2>
          <div id="inspBtns">
            <button class="ibtn" id="iCache">⚡ Cache leeren</button>
            <button class="ibtn" id="iCopy">📋 Log kopieren</button>
            <button class="ibtn" id="iClear">🧹 Log leeren</button>
            <button class="ibtn warn" id="iClose">Schließen</button>
          </div>
        </div>
        <div id="inspLog"><pre id="inspLogPre">[${time()}] ✅ (ok) Inspector bereit (inspector.js v${VERSION})</pre></div>
      </div>`;
    document.body.appendChild(overlay);

    // Events
    overlay.querySelector('#iClose').addEventListener('click', ()=>API.close());
    overlay.addEventListener('click', (e)=>{ if(e.target.id==='inspectorOverlay') API.close(); });
    overlay.querySelector('#iClear').addEventListener('click', ()=>{ getPre().textContent=''; });
    overlay.querySelector('#iCopy').addEventListener('click', async ()=>{
      try{ await navigator.clipboard.writeText(getPre().textContent); append('ok','Log in Zwischenablage'); }
      catch(e){ append('err','Kopieren fehlgeschlagen'); }
    });
    overlay.querySelector('#iCache').addEventListener('click', doCache);

    // Tastatur: ESC schließt
    window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') API.close(); });
  }

  function time(){ return new Date().toTimeString().slice(0,8); }
  function getPre(){ return document.getElementById('inspLogPre'); }
  function append(type, msg){
    const line = `[${time()}] ${type==='ok'?'✅ (ok) ': type==='warn'?'⚠️ (warn) ':'❌ (err) '}${msg}`;
    const pre = getPre(); pre.textContent += `\n${line}`;
    pre.parentElement.scrollTop = pre.parentElement.scrollHeight;
  }

  async function doCache(){
    try{
      if ('caches' in window){ for (const k of await caches.keys()) await caches.delete(k); }
      localStorage.clear(); sessionStorage.clear();
      if (navigator.serviceWorker){
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      append('ok', 'Cache/Storage geleert – Seite ggf. neu laden');
    }catch(e){ append('err', 'Cache-Booster Fehler'); }
  }

  const API = {
    open(){ ensureDOM(); document.getElementById('inspectorOverlay').style.display='block'; },
    close(){ const el=document.getElementById('inspectorOverlay'); if(el) el.style.display='none'; },
    toggle(){ const el=document.getElementById('inspectorOverlay'); if(!el) return API.open(); el.style.display = (el.style.display==='block'?'none':'block'); },
    // wird vom Startscreen-Logger benutzt
    appendLog(type,line){ ensureDOM(); const pre=getPre(); pre.textContent += `\n${line}`; pre.parentElement.scrollTop = pre.parentElement.scrollHeight; },
    version: VERSION
  };

  // Global export
  window.GameInspector = API;

  // Direkt ein „bereit“-Log ausgeben (so wie du es liebst)
  setTimeout(()=>{ window.GameLog?.ok ? window.GameLog.ok(`Inspector bereit (inspector.js v${VERSION})`) : console.log(`[${time()}] ✅ (ok) Inspector bereit (inspector.js v${VERSION})`); },0);
})();
