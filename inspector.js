/* 
  Projekt:  Siedler Mini
  Datei:    inspector.js
  Version:  v16.1.12
  Zweck:    Dev/Inspector-Overlay (immer verfügbar, per Button 🛠️ ein-/ausblendbar)
            - Log-Panel (empfängt 'inspector:log')
            - Vollbild-Overlay, um Fokus auf Debug zu legen
            - Copy-Log in Zwischenablage
            - (optional) einfache Tools, ohne Spiellogik zu verändern
*/

(function(){
  const VERSION = 'v16.1.12';

  // Falls mehrfach eingebunden/verzögert neu geladen:
  if(window.GameInspector?.__alive){ 
    try { window.GameInspector.show(); } catch(_) {}
    return;
  }

  // Basis-DOM erzeugen
  const root = document.createElement('div');
  root.id = 'dev-inspector';
  root.style.cssText = `
    position:fixed; inset:0; z-index:1000; display:none;
    background:rgba(2,6,23,.82); backdrop-filter:saturate(150%) blur(2px);
    color:#e6edf3; font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    position:absolute; inset:16px; border:1px solid #30363d; border-radius:12px;
    background:#0b1220; display:flex; flex-direction:column; overflow:hidden;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid #30363d;
    background:#111827;
  `;
  header.innerHTML = `
    <strong style="letter-spacing:.3px">Inspector <small style="color:#8b949e">${VERSION}</small></strong>
    <div style="flex:1"></div>
    <button id="ins-btn-copy" title="Log kopieren"
      style="border:1px solid #2e3440; background:#1f2937; color:#fff; padding:6px 10px; border-radius:8px; cursor:pointer">📋 Log kopieren</button>
    <button id="ins-btn-close" title="Schließen"
      style="border:1px solid #2e3440; background:#1f2937; color:#fff; padding:6px 10px; border-radius:8px; cursor:pointer">✖︎</button>
  `;

  const body = document.createElement('div');
  body.style.cssText = `display:flex; flex:1; min-height:0;`;

  const colLog = document.createElement('div');
  colLog.style.cssText = `flex:1; min-width:0; display:flex; flex-direction:column; border-right:1px solid #30363d;`;

  const logHead = document.createElement('div');
  logHead.style.cssText = `padding:8px 10px; background:#0f172a; border-bottom:1px solid #30363d;`;
  logHead.innerHTML = `<strong>Log</strong> <small style="color:#8b949e">(Live)</small>`;

  const logList = document.createElement('div');
  logList.id = 'ins-log';
  logList.style.cssText = `
    flex:1; overflow:auto; padding:10px; font-family:ui-monospace, Menlo, Consolas, monospace; font-size:12px; line-height:1.45;
  `;

  // (Optional) rechte Spalte für spätere Tools/Shortcuts
  const colTools = document.createElement('div');
  colTools.style.cssText = `width:320px; display:flex; flex-direction:column;`;
  const toolsHead = document.createElement('div');
  toolsHead.style.cssText = `padding:8px 10px; background:#0f172a; border-bottom:1px solid #30363d;`;
  toolsHead.innerHTML = `<strong>Tools</strong> <small style="color:#8b949e">(Dev)</small>`;

  const toolsBody = document.createElement('div');
  toolsBody.style.cssText = `padding:10px; overflow:auto; color:#cbd5e1; font-size:14px`;
  toolsBody.innerHTML = `
    <p>Der Inspector ist nur für Debug/Analyse gedacht.</p>
    <ul style="margin:.3em 0 .2em 1.2em">
      <li>Logs kommen automatisch hier an.</li>
      <li>Start/Reset & Karten-Auswahl bleiben im Startfenster der App.</li>
      <li>Build-Menü-Button bleibt außerhalb und erst nach Spielstart sichtbar.</li>
    </ul>
  `;

  // Zusammenbauen
  colLog.appendChild(logHead);
  colLog.appendChild(logList);
  colTools.appendChild(toolsHead);
  colTools.appendChild(toolsBody);
  body.appendChild(colLog);
  body.appendChild(colTools);
  panel.appendChild(header);
  panel.appendChild(body);
  root.appendChild(panel);
  document.body.appendChild(root);

  // Public API
  function show(){ root.style.display = 'block'; }
  function hide(){ root.style.display = 'none'; }
  function toggle(){ root.style.display = (root.style.display === 'none') ? 'block' : 'none'; }

  // Log Rendering
  function appendLine(level, text){
    const line = document.createElement('div');
    const color = level==='ok' ? '#22c55e' : level==='warn' ? '#f59e0b' : '#ef4444';
    line.style.cssText = `white-space:pre-wrap; margin:2px 0; color:${color}`;
    line.textContent = text;
    logList.appendChild(line);
    logList.scrollTop = logList.scrollHeight;
  }

  // Event: Logs aus index/Spiel
  function onInspectorLog(ev){
    const { level='ok', text='' } = ev.detail || {};
    appendLine(level, text);
  }
  window.addEventListener('inspector:log', onInspectorLog);

  // Copy-Button
  header.querySelector('#ins-btn-copy').addEventListener('click', ()=>{
    try{
      const lines = Array.from(logList.children).map(n => n.textContent).join('\n');
      navigator.clipboard.writeText(lines).then(()=>{
        appendLine('ok', `[${new Date().toLocaleTimeString()}] ✅ Log in Zwischenablage`);
      });
    }catch(e){
      appendLine('err', `❌ Copy fehlgeschlagen: ${e?.message||e}`);
    }
  });

  // Close-Button
  header.querySelector('#ins-btn-close').addEventListener('click', hide);

  // API exportieren
  window.GameInspector = { show, hide, toggle, __alive:true };

  // Erste Meldung
  try{
    window.dispatchEvent(new CustomEvent('inspector:log', {
      detail: { level:'ok', text:`[${new Date().toLocaleTimeString()}] ✅ Inspector bereit (inspector.js ${VERSION})` }
    }));
  }catch(_){}
})();
