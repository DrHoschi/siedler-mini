// assets/inspector/inspector.js  — v16.1.5
// Dev-Inspector (Vollbild), einklappbar über window.GameInspector.toggle()

(function(){
  const VERSION = 'inspector.js v16.1.5';

  // Root-Element anlegen (einmal)
  const root = document.createElement('div');
  root.id = 'devInspector';
  Object.assign(root.style, {
    position: 'fixed', inset: '0', zIndex: 2500, display: 'none',
    background: 'rgba(8, 12, 10, 0.88)', color: '#eafff3',
    backdropFilter: 'blur(2px)'
  });

  // Panel-UI
  root.innerHTML = `
    <div style="max-width: 980px; margin: 18px auto; padding: 16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <h2 style="margin:0;">Inspector / Test-Cockpit <small style="opacity:.7;">(${VERSION})</small></h2>
        <button id="inspClose" style="padding:8px 12px;border-radius:10px;border:0;background:#1f5b45;color:#eafff3">Schließen</button>
      </div>

      <div style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
        <button id="inspCache"  style="padding:10px;border-radius:12px;border:0;background:#244f3a;color:#eafff3">Cache leeren</button>
        <button id="inspLogCopy" style="padding:10px;border-radius:12px;border:0;background:#244f3a;color:#eafff3">Log kopieren</button>
        <button id="inspLogClear" style="padding:10px;border-radius:12px;border:0;background:#244f3a;color:#eafff3">Log leeren</button>
        <div style="padding:10px;border-radius:12px;background:#11261d;">
          <div style="opacity:.9;margin-bottom:8px;">Ressourcen (Booster)</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button data-res="+100"  style="padding:8px;border-radius:12px;border:0;background:#2a6e52;color:#eafff3">+100</button>
            <button data-res="+1000" style="padding:8px;border-radius:12px;border:0;background:#2a6e52;color:#eafff3">+1000</button>
            <button data-res="0"     style="padding:8px;border-radius:12px;border:0;background:#2a6e52;color:#eafff3">0</button>
          </div>
        </div>
      </div>

      <div style="margin-top:14px;">
        <div style="opacity:.85;margin-bottom:6px;">Log</div>
        <pre id="inspLog" style="background:rgba(0,0,0,.25);padding:10px;border-radius:10px;max-height:45vh;overflow:auto;white-space:pre-wrap;"></pre>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // API-Objekt
  window.GameInspector = {
    toggle(){
      const show = (root.style.display === 'none');
      root.style.display = show ? 'block' : 'none';
      if (show) refreshLog();
    }
  };

  // Events
  root.querySelector('#inspClose').addEventListener('click', ()=>window.GameInspector.toggle());

  root.querySelector('#inspCache').addEventListener('click', async ()=>{
    try{
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if (window.localStorage) localStorage.clear();
      if (window.sessionStorage) sessionStorage.clear();
      GameLog?.ok?.('Cache/Storage geleert – Seite ggf. neu laden');
      refreshLog();
    }catch(e){
      GameLog?.err?.('Cache leeren im Inspector fehlgeschlagen: ' + (e?.message || String(e)));
      refreshLog();
    }
  });

  root.querySelector('#inspLogCopy').addEventListener('click', async ()=>{
    try{
      const text = (window.GameLog?.get?.() || []).join('\n');
      await navigator.clipboard.writeText(text);
      GameLog?.ok?.('Log in Zwischenablage');
      refreshLog();
    }catch(e){
      GameLog?.err?.('Kopieren fehlgeschlagen: ' + (e?.message || String(e)));
      refreshLog();
    }
  });

  root.querySelector('#inspLogClear').addEventListener('click', ()=>{
    // Soft-Clear: nur Anzeige leert; Quelle bleibt fürs Debuggen erhalten
    const pre = root.querySelector('#inspLog');
    pre.textContent = '';
  });

  // Booster-Dummy (hooke dein echtes Ressourcen-System hier ein)
  root.querySelectorAll('[data-res]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.getAttribute('data-res');
      // Beispiel-Event: dein Spiel kann hier zuhören
      window.dispatchEvent(new CustomEvent('dev:addResources', { detail: { preset: val }}));
      GameLog?.ok?.(`Ressourcen-Booster angewendet: ${val}`);
      refreshLog();
    });
  });

  // Log einblenden & live updaten
  function refreshLog(){
    const pre = root.querySelector('#inspLog');
    const lines = (window.GameLog?.get?.() || []);
    pre.textContent = lines.join('\n');
    pre.scrollTop = pre.scrollHeight;
  }
  if (window.GameLog && window.GameLog.on) {
    window.GameLog.on(()=> {
      if (root.style.display !== 'none') refreshLog();
    });
  }

  // Meldung
  window.GameLog?.ok?.(`Inspector bereit (${VERSION})`);
})();
