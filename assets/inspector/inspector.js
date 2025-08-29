/* =======================================================================
 * Inspector (v16.1.14)
 * – Vollbild-Overlay für Logs & Dev-Aktionen (nur Entwicklung)
 * – Öffnen über window.GameInspector.toggle(true) oder FAB (🛠️)
 * – Zeichnet ALLE Logs, die via window.Log(...) erzeugt werden.
 * – Bietet "Log kopieren" API für index.html
 * ======================================================================= */

(function(){
  const VERSION = '16.1.14';

  // Root-Element anlegen (einmalig)
  let root = document.getElementById('inspector-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'inspector-root';
    document.body.appendChild(root);
  }

  root.style.position = 'fixed';
  root.style.inset = '0';
  root.style.zIndex = '1000';
  root.style.display = 'none'; // start hidden
  root.style.background = 'rgba(10,10,10,0.96)';
  root.style.color = '#e7e7e7';
  root.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

  root.innerHTML = `
    <div id="insp-wrap" style="position:absolute; inset:16px; display:flex; flex-direction:column; border:1px solid #2f363a; border-radius:12px; background:#151819;">
      <div style="display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid #2b2f31;">
        <div style="font-weight:700">Inspector</div>
        <div style="opacity:.8; font-size:12px">v${VERSION}</div>
        <div id="insp-status" style="margin-left:auto; font-size:12px; opacity:.8"></div>
        <button id="insp-close" style="margin-left:8px; background:#2b2f31; color:#e7e7e7; border:1px solid #3a4247; border-radius:8px; padding:6px 10px; cursor:pointer">Schließen ✖</button>
      </div>

      <div style="display:flex; gap:12px; padding:10px 12px; border-bottom:1px solid #2b2f31; flex-wrap:wrap">
        <button id="insp-copy"  title="Log kopieren"   style="background:#1f2326; border:1px solid #2f363a; border-radius:8px; padding:6px 10px; color:#e7e7e7; cursor:pointer">📋 Log kopieren</button>
        <button id="insp-clear" title="Log leeren"     style="background:#1f2326; border:1px solid #2f363a; border-radius:8px; padding:6px 10px; color:#e7e7e7; cursor:pointer">🧼 Log leeren</button>
        <button id="insp-retry" title="Engine starten" style="background:#1f2326; border:1px solid #2f363a; border-radius:8px; padding:6px 10px; color:#e7e7e7; cursor:pointer">▶️ Start (retry)</button>
      </div>

      <div id="insp-log" style="flex:1; overflow:auto; padding:10px 12px; background:#0f1112; font-size:13px; line-height:1.5;">
        <!-- Logs -->
      </div>
    </div>
  `;

  const elLog = root.querySelector('#insp-log');
  const elStatus = root.querySelector('#insp-status');

  // interner Log-Puffer (als Fallback für Copy)
  const records = [];

  // Hilfsfunktionen
  const icon = (type)=> type==='err'?'❌':(type==='warn'?'⚠️':'✅');

  function add(rec) {
    records.push(rec);
    const div = document.createElement('div');
    const klass = rec.type==='err'?'color:#ff8a8a':rec.type==='warn'?'color:#ffd27a':'color:#a0f0b2';
    div.setAttribute('style', `${klass}`);
    div.textContent = `[${rec.tstamp}] ${icon(rec.type)} ${rec.msg}`;
    elLog.appendChild(div);
    elLog.scrollTop = elLog.scrollHeight;
  }

  function setStatus(text) { elStatus.textContent = text || ''; }

  // Öffnen/Schließen API
  function toggle(open) {
    const show = (open===true) ? true : (open===false ? false : (root.style.display==='none'));
    root.style.display = show ? 'block' : 'none';
    setStatus(show ? 'offen' : 'geschlossen');
  }

  // Buttons
  root.querySelector('#insp-close').addEventListener('click', ()=>toggle(false));
  root.querySelector('#insp-copy').addEventListener('click', async ()=>{
    const text = getLogText();
    try {
      await navigator.clipboard.writeText(text);
      add({tstamp: time(), type:'ok', msg:'Log in Zwischenablage'});
    } catch(e) {
      add({tstamp: time(), type:'warn', msg:'Clipboard API nicht verfügbar'});
    }
  });
  root.querySelector('#insp-clear').addEventListener('click', ()=>{
    elLog.innerHTML = '';
    records.length = 0;
    add({tstamp: time(), type:'ok', msg:'Log geleert'});
  });
  root.querySelector('#insp-retry').addEventListener('click', ()=>{
    // Versuche zu starten mit aktuell gewählter Karte aus index (falls vorhanden)
    const sel = document.querySelector('#map');
    const path = sel?.value || './assets/maps/map-mini.json';
    window.dispatchEvent(new CustomEvent('inspector:retry-start', { detail: { map:path }}));
    add({tstamp: time(), type:'ok', msg:`Retry Start → ${path}`});
  });

  function time(){
    const d=new Date(); const p=n=>String(n).padStart(2,'0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  function getLogText(){
    return records.map(r=>`[${r.tstamp}] ${icon(r.type)} ${r.msg}`).join('\n');
  }

  // Events vom Index/Logger
  window.addEventListener('cb:log', (ev)=>{
    const rec = ev.detail;
    if (!rec) return;
    add(rec);
  });
  window.addEventListener('cb:flush-log', ()=>{ /* noop – UI ist live */ });

  // Inspector → Index: retry start
  window.addEventListener('inspector:retry-start', (ev)=>{
    const map = ev.detail?.map;
    const btnStart = document.getElementById('btn-start');
    const sel = document.getElementById('map');
    if (sel) sel.value = map;
    if (btnStart) btnStart.click();
  });

  // Export API
  window.GameInspector = {
    version: VERSION,
    toggle,
    open: ()=>toggle(true),
    close: ()=>toggle(false),
    getLogText
  };

  // Broadcast: bereit
  window.dispatchEvent(new CustomEvent('inspector:ready'));
  // Begrüßungslog
  add({tstamp: time(), type:'ok', msg:`Inspector bereit (inspector.js v${VERSION})`});
})();
