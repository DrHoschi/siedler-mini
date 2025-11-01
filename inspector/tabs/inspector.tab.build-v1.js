/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.build-v1.js
 * Version : v1.0.0 (2025-11-01)
 * Zweck   : BUILD – Snapshot vom Spiel anfordern & anzeigen
 * Bridge  : → req:build:snapshot   (vom Tab gesendet)
 *           ← cb:build:snapshot    (vom Spiel beantwortet, payload in event.detail)
 * UI      : Button "Snapshot anfordern", Status, kompakte Auswertung + Rohdaten
 * Hinweis : KEINE Dummy-Daten. Wenn das Spiel noch nicht antwortet, zeigen wir
 *           Hinweise, wie die Bridge zu verdrahten ist.
 * Abhäng. : window.registerInspectorTab(name, setupFn)
 * ========================================================================== */

(function(){
  if (typeof window.registerInspectorTab !== 'function') {
    console.warn('[build-tab] registerInspectorTab fehlt.');
    return;
  }

  // ---------- Inline-Styles (nur 1x injizieren) ----------
  const CSS_ID = 'insp-build-inline-style';
  function injectCSS(){
    if (document.getElementById(CSS_ID)) return;
    const s = document.createElement('style');
    s.id = CSS_ID;
    s.textContent = `
#inspector [data-panel="build"] .build-toolbar{
  display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:0 0 .6rem;
}
#inspector [data-panel="build"] .build-btn{
  background:#2a2a2e;border:1px solid #444;border-radius:.6rem;color:#ddd;
  padding:.25rem .6rem;cursor:pointer;font-size:13px;
}
#inspector [data-panel="build"] .muted{opacity:.75}
#inspector [data-panel="build"] .warn{color:#ffcc00}
#inspector [data-panel="build"] .err{color:#ff6666}
#inspector [data-panel="build"] .ok{color:#8ab4f8}
#inspector [data-panel="build"] .grid{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
  gap:.6rem;margin:.5rem 0;
}
#inspector [data-panel="build"] .card{
  border:1px solid #2a2a2e;border-radius:.5rem;padding:.5rem .6rem;background:#111216;
}
#inspector [data-panel="build"] table.build-table{
  width:100%;border-collapse:collapse;margin:.2rem 0 .8rem 0;font-size:13px;
}
#inspector [data-panel="build"] table.build-table th,
#inspector [data-panel="build"] table.build-table td{
  border-bottom:1px dashed #2a2a2e;padding:.35rem .45rem;vertical-align:top;
}
#inspector [data-panel="build"] pre.build-json{
  max-height:260px;overflow:auto;border:1px solid #2a2a2e;border-radius:.5rem;
  padding:.5rem;background:#0f1013;margin:0;
}
    `;
    document.head.appendChild(s);
  }

  // ---------- State ----------
  const STATE = {
    waiting: false,
    last: null,
    timer: null,
    section: null,
  };

  // ---------- Utils ----------
  const $  = (sel,root=document)=> root.querySelector(sel);
  const $$ = (sel,root=document)=> [...root.querySelectorAll(sel)];
  const fmtNum = (n)=> typeof n==='number' ? n.toLocaleString('de-DE') : String(n);

  // Saubere, robuste Auswertung der möglichen Datenstrukturen
  function computeSummary(d){
    const res = {
      total: null,
      byCategory: null,
      queues: null
    };

    // häufige Felder abdecken
    if (Array.isArray(d?.list)) res.total = d.list.length;
    if (Array.isArray(d?.active)) res.total = (res.total ?? 0) + d.active.length;
    if (typeof d?.total === 'number') res.total = d.total;

    // Kategorien (objekt mit counts)
    if (d?.byCategory && typeof d.byCategory === 'object') {
      res.byCategory = d.byCategory;
    } else if (Array.isArray(d?.list)) {
      // selbst aus 'list' ableiten, wenn items Kategorie haben
      const map = {};
      for (const it of d.list) {
        const cat = it.category || it.type || 'Unbekannt';
        map[cat] = (map[cat]||0)+1;
      }
      res.byCategory = map;
    }

    // Warteschlangen/BuildQueue, wenn vorhanden
    if (d?.queues && typeof d.queues === 'object') {
      res.queues = d.queues;
    } else if (Array.isArray(d?.queue)) {
      res.queues = { default: d.queue };
    }

    return res;
  }

  function download(name, data, mime="application/octet-stream"){
    const url = URL.createObjectURL(new Blob([data], {type: mime}));
    const a = document.createElement('a');
    a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- Render ----------
  function renderWaiting(msg="(warte auf Antwort …)"){
    STATE.section.innerHTML = `
      <h2>Build</h2>
      <div class="build-toolbar">
        <button class="build-btn" data-act="req">Snapshot anfordern</button>
        <button class="build-btn" data-act="export-json" disabled>Export JSON</button>
        <button class="build-btn" data-act="export-csv"  disabled>Export CSV</button>
        <span class="muted">${msg}</span>
      </div>
    `;
    bindToolbar();
  }

  function renderSnapshot(d){
    STATE.section.innerHTML = `
      <h2>Build</h2>
      <div class="build-toolbar">
        <button class="build-btn" data-act="req">Neu anfordern</button>
        <button class="build-btn" data-act="export-json">Export JSON</button>
        <button class="build-btn" data-act="export-csv">Export CSV</button>
        <span class="ok">Snapshot erhalten</span>
      </div>
      ${renderSummaryHTML(d)}
      ${renderListHTML(d)}
      <details><summary>Rohdaten</summary>
        <pre class="build-json">${safeJSON(d)}</pre>
      </details>
    `;
    bindToolbar();
  }

  function renderSummaryHTML(d){
    const s = computeSummary(d);
    const catRows = s.byCategory
      ? Object.entries(s.byCategory)
          .sort((a,b)=> b[1]-a[1])
          .map(([k,v])=>`<tr><td>${k}</td><td>${fmtNum(v)}</td></tr>`).join('')
      : '<tr><td class="muted" colspan="2">keine Kategorien erkannt</td></tr>';

    const queueBlocks = s.queues
      ? Object.entries(s.queues).map(([name,arr])=>{
          const rows = (arr||[]).map((q,i)=>`<tr><td>${i+1}</td><td>${q.id||q.name||q.type||'-'}</td><td>${q.state||q.status||'-'}</td></tr>`).join('');
          return `
            <div class="card">
              <b>Queue: ${name}</b>
              <table class="build-table">
                <thead><tr><th>#</th><th>Eintrag</th><th>Status</th></tr></thead>
                <tbody>${rows || `<tr><td colspan="3" class="muted">leer</td></tr>`}</tbody>
              </table>
            </div>
          `;
        }).join('')
      : '';

    return `
      <div class="grid">
        <div class="card">
          <b>Gesamt</b>
          <div>${s.total != null ? fmtNum(s.total) : '<span class="muted">unbekannt</span>'}</div>
        </div>
        <div class="card">
          <b>nach Kategorie</b>
          <table class="build-table">
            <thead><tr><th>Kategorie</th><th>Anzahl</th></tr></thead>
            <tbody>${catRows}</tbody>
          </table>
        </div>
        ${queueBlocks}
      </div>
    `;
  }

  function renderListHTML(d){
    const list = Array.isArray(d?.list) ? d.list
              : Array.isArray(d?.active) ? d.active
              : null;

    if (!list) {
      return `<div class="card"><b>Liste</b><div class="muted">keine Liste gefunden</div></div>`;
    }

    const rows = list.map((it,i)=>{
      const id   = it.id ?? it.key ?? it.name ?? it.type ?? '-';
      const cat  = it.category ?? it.type ?? '-';
      const st   = it.state ?? it.status ?? (it.done ? 'done' : (it.active ? 'active' : '-'));
      return `<tr><td>${i+1}</td><td>${id}</td><td>${cat}</td><td>${st}</td></tr>`;
    }).join('');

    return `
      <div class="card">
        <b>Liste (${fmtNum(list.length)})</b>
        <table class="build-table">
          <thead><tr><th>#</th><th>ID/Name</th><th>Kategorie</th><th>Status</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="4" class="muted">leer</td></tr>`}</tbody>
        </table>
      </div>
    `;
  }

  function safeJSON(obj){
    try{ return JSON.stringify(obj, null, 2); }
    catch(e){ return String(e); }
  }

  // ---------- Events & Toolbar ----------
  function bindToolbar(){
    const root = STATE.section;
    $('button[data-act="req"]', root)?.addEventListener('click', requestSnapshot);
    $('button[data-act="export-json"]', root)?.addEventListener('click', ()=> {
      if (!STATE.last) return;
      download('build-snapshot.json', safeJSON(STATE.last), 'application/json');
    });
    $('button[data-act="export-csv"]', root)?.addEventListener('click', ()=> {
      if (!STATE.last) return;
      // sehr einfache CSV aus Liste
      const list = Array.isArray(STATE.last?.list) ? STATE.last.list
                : Array.isArray(STATE.last?.active) ? STATE.last.active : [];
      const head = 'id,name,category,status\n';
      const body = list.map(it=>{
        const id  = (it.id ?? it.key ?? '').toString().replace(/"/g,'""');
        const nm  = (it.name ?? '').toString().replace(/"/g,'""');
        const cat = (it.category ?? it.type ?? '').toString().replace(/"/g,'""');
        const st  = (it.state ?? it.status ?? (it.done?'done':(it.active?'active':''))).toString().replace(/"/g,'""');
        return `"${id}","${nm}","${cat}","${st}"`;
      }).join('\n');
      download('build-snapshot.csv', head+body, 'text/csv');
    });
  }

  function requestSnapshot(){
    if (STATE.waiting) return;
    STATE.waiting = true;
    renderWaiting('(warte auf Antwort …)');
    window.dispatchEvent(new CustomEvent('req:build:snapshot'));
    // Timeout-Hinweis nach 2s
    clearTimeout(STATE.timer);
    STATE.timer = setTimeout(()=>{
      if (!STATE.waiting) return;
      renderWaiting(
        '<span class="warn">keine Antwort</span> – ' +
        'prüfe die Bridge im Spiel: ' +
        '<code class="muted">window.dispatchEvent(new CustomEvent("cb:build:snapshot",{detail:{ list:[/*…*/], byCategory:{/*…*/}, total:123 }}));</code>'
      );
    }, 2000);
  }

  function onSnapshot(ev){
    STATE.waiting = false;
    clearTimeout(STATE.timer);
    STATE.last = ev?.detail ?? {};
    renderSnapshot(STATE.last);
  }

  // ---------- Registrierung ----------
  window.registerInspectorTab('build', function setup(section){
    injectCSS();
    STATE.section = section;
    renderWaiting('Bereit – klicke „Snapshot anfordern“');

    // Wenn der Tab sichtbar wird, beim ersten Mal automatisch anfragen
    let first = true;
    window.addEventListener('cb:insp:tab:change', (e)=>{
      if (e?.detail?.tab !== 'build') return;
      if (first){ first = false; requestSnapshot(); }
    });

    // Build-Antworten des Spiels
    window.addEventListener('cb:build:snapshot', onSnapshot);
  });

})();
