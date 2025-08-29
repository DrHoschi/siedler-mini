/* inspector.js – v16.1.16
 * Ziel: Ein-/ausblendbares Overlay NUR für Tests/Logs.
 * - Zeichnet ALLE Logs aus window.__cb.logs
 * - Knöpfe: Log kopieren, Log leeren, Start (retry)
 * - Layout bleibt stabil; keine Spiel-UI wird verändert.
 */
(function(){
  const V = "v16.1.16";

  // Minimal-CSS per JS injizieren (damit unabhängig von sonstigen Styles)
  const css = `
  #cb-inspector{ position:fixed; inset:0; z-index:9998; display:none; background:rgba(8,8,10,.94); color:#dfe; }
  #cb-inspector.open{ display:block; }
  #cb-inspector .bar{ position:sticky; top:0; display:flex; gap:10px; align-items:center; padding:10px; background:rgba(0,0,0,.35); backdrop-filter: blur(6px); }
  #cb-inspector .bar button{ padding:8px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.12); background:#26352c; color:#dfe; }
  #cb-inspector .bar .right{ margin-left:auto; display:flex; gap:10px; align-items:center; }
  #cb-inspector .log{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:13px; padding:12px; white-space:pre-wrap; }
  .cb-pill{ padding:3px 8px; border-radius:999px; background:#1b2a22; border:1px solid rgba(255,255,255,.12); font-size:12px; opacity:.8;}
  `;
  const st = document.createElement('style');
  st.textContent = css; document.head.appendChild(st);

  // Root
  const root = document.createElement('div');
  root.id = 'cb-inspector';
  root.setAttribute('aria-label','Inspector');
  root.innerHTML = `
    <div class="bar">
      <span class="cb-pill">Inspector <b>${V}</b></span>
      <button id="cb-insp-copy">Log kopieren</button>
      <button id="cb-insp-clear">Log leeren</button>
      <button id="cb-insp-retry">Start (retry)</button>
      <div class="right">
        <span id="cb-insp-state" style="opacity:.75;"></span>
        <button id="cb-insp-close">Schließen ✕</button>
      </div>
    </div>
    <div id="cb-insp-log" class="log"></div>
  `;
  document.body.appendChild(root);

  // Öffnen/Schließen API
  const api = {
    open(){ root.classList.add('open'); api.render(); },
    close(){ root.classList.remove('open'); },
    toggle(force){
      if (typeof force === 'boolean') force ? api.open() : api.close();
      else root.classList.contains('open') ? api.close() : api.open();
    },
    render(){
      const list = (window.__cb && window.__cb.logs) ? window.__cb.logs : [];
      const lines = list.map(e=>{
        const ts = new Date(e.t).toLocaleTimeString('de-DE');
        const tag = (e.type||'log').toUpperCase().padEnd(5,' ');
        return `[${ts}] ${tag} ${e.msg}`;
      }).join('\n');
      document.getElementById('cb-insp-log').textContent = lines || '(leer)';
      document.getElementById('cb-insp-state').textContent = 'offen';
    }
  };
  window.GameInspector = api; // globale Hooks

  // Buttons
  root.querySelector('#cb-insp-close').addEventListener('click', ()=>api.close());
  root.querySelector('#cb-insp-copy').addEventListener('click', ()=>{
    const txt = document.getElementById('cb-insp-log').textContent;
    navigator.clipboard?.writeText(txt);
  });
  root.querySelector('#cb-insp-clear').addEventListener('click', ()=>{
    if (window.__cb?.logs) window.__cb.logs.length = 0;
    api.render();
  });
  root.querySelector('#cb-insp-retry').addEventListener('click', ()=>{
    const sel = document.querySelector('#map-select');
    const mapUrl = sel?.value || './assets/maps/map-mini.json';
    // Gleiche Start-Routine wie im Index:
    if (window.GameLoader?.start) window.GameLoader.start(mapUrl);
    else {
      // Falls noch nicht ready, logge Hinweis – Index versucht ohnehin zu warten
      (window.__cb?.logs||[]).push({ t: Date.now(), type:'warn', msg:'Inspector: Engine noch nicht bereit – retry' });
      window.dispatchEvent(new CustomEvent('cb:log', { detail:{ type:'warn', msg:'Inspector: Engine noch nicht bereit – retry' }}));
    }
  });

  // Erstinitialisierung in Log
  (function initLog(){
    window.__cb = window.__cb || { logs: [] };
    const push = (type,msg)=>window.__cb.logs.push({ t:Date.now(), type, msg });
    push('log', `Inspector bereit (inspector.js ${V})`);
    window.dispatchEvent(new CustomEvent('cb:log', { detail:{ type:'log', msg:`Inspector bereit (inspector.js ${V})` }}));
  })();

  // Realtime-Logs einsammeln
  window.addEventListener('cb:log', ()=> api.render());
  window.addEventListener('cb:ui-ready', ()=> api.render());
  window.addEventListener('cb:game-started', (ev)=>{
    (window.__cb?.logs||[]).push({ t:Date.now(), type:'log', msg:'Event: cb:game-started empfangen' });
    api.render();
  });

  // Inspector-Button (rechts unten) bedienen, falls vorhanden
  const toggleBtn = document.getElementById('btn-inspector');
  toggleBtn?.addEventListener('click', ()=> api.toggle());
})();
