/* inspector.js — v16.1.8
   Zweck: Vollbild-Inspector zum Testen/Debuggen.
   - Immer per runder Button unten rechts erreichbar
   - Enthält Log-View, Log leeren/kopieren
   - Keine Spiel-Controls (Start/Mapwahl sind im Startpanel der index.html)
   - Reagiert auf cb:log, cb:game-started Events
*/

(function(){
  const VER = 'inspector.js v16.1.8';

  // --------- kleines DOM-Helperlein ----------
  const $ = (sel, root=document)=>root.querySelector(sel);
  const $$ = (sel, root=document)=>Array.from(root.querySelectorAll(sel));

  // --------- Root-Container anlegen ----------
  const root = document.createElement('div');
  root.id = 'cbInspectorRoot';
  root.style.cssText = `
    position: fixed; inset: 0; z-index: 70; display:none;
    background: rgba(6,10,14,.92); color:#d1d5db;
    font: 14px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  `;
  root.innerHTML = `
    <div style="position:absolute; inset: 18px; border-radius:14px; border:1px solid #0008; background:#0b1220; display:flex; flex-direction:column;">
      <header style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #0008; background:#0f172a;">
        <div>
          <strong>Inspector / Log</strong>
          <span style="margin-left:8px; opacity:.7">(${VER})</span>
        </div>
        <div style="display:flex; gap:8px">
          <button id="cbInspBtnClear" class="btn">Log leeren</button>
          <button id="cbInspBtnCopy" class="btn">Log kopieren</button>
          <button id="cbInspBtnClose" class="btn">Schließen</button>
        </div>
      </header>
      <main style="flex:1; overflow:auto; padding:10px 12px" id="cbInspLog"></main>
    </div>
  `;
  document.body.appendChild(root);

  // kleine Button-Optik
  $$('.btn', root).forEach(b=>{
    b.style.cssText = `
      height:32px; padding:0 12px; border-radius:10px; border:1px solid #1f2937;
      background:#111827; color:#e5e7eb; cursor:pointer;
    `;
  });

  // --------- Logging ----------
  const logBox = $('#cbInspLog', root);
  const lines = [];

  function addLine(level, msg, time){
    const t = time || new Date().toTimeString().slice(0,8);
    const el = document.createElement('div');
    el.textContent = `[${t}] ${level} ${msg}`;
    el.style.whiteSpace = 'pre';
    const color =
      level.startsWith('❌') ? '#ef4444' :
      level.startsWith('⚠️') ? '#f59e0b' :
      level.startsWith('✅') ? '#22c55e' : '#d1d5db';
    el.style.color = color;
    logBox.appendChild(el);
    lines.push(el.textContent);
    logBox.scrollTop = logBox.scrollHeight;
  }

  // externe Bridge für "Log kopieren" im Startpanel
  window.CB_EXPORT_LOG = async ()=>lines.join('\n');

  // Events aus der App entgegennehmen
  window.addEventListener('cb:log', (ev)=>{
    const {level, msg, time} = ev.detail || {};
    if (!level || !msg) return;
    addLine(level, msg, time);
  });

  // optional: Reaktion auf Spielstart
  window.addEventListener('cb:game-started', ()=>{
    addLine('✅ (ok)', 'cb:game-started empfangen.');
  });

  // --------- Public API (für den runden Button) ----------
  window.GameInspector = {
    version: VER,
    toggle(){
      const vis = root.style.display !== 'none';
      root.style.display = vis ? 'none' : 'block';
      addLine('✅ (ok)', vis ? 'Inspector geschlossen' : 'Inspector geöffnet');
    },
    open(){ root.style.display='block'; addLine('✅ (ok)','Inspector geöffnet'); },
    close(){ root.style.display='none'; addLine('✅ (ok)','Inspector geschlossen'); }
  };

  // Buttons
  $('#cbInspBtnClose', root).addEventListener('click', ()=>window.GameInspector.close());
  $('#cbInspBtnClear', root).addEventListener('click', ()=>{
    logBox.innerHTML = ''; lines.length = 0;
    addLine('✅ (ok)','Log geleert');
  });
  $('#cbInspBtnCopy', root).addEventListener('click', async ()=>{
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      addLine('✅ (ok)','Log kopiert');
    } catch(e){
      addLine('⚠️ (warn)','Konnte Log nicht kopieren: '+e.message);
    }
  });

  // Startup-Log
  addLine('✅ (ok)', 'Inspector bereit ('+VER+')');
})();
