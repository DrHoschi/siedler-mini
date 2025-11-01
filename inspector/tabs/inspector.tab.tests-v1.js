/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.tests-v1.js
 * Version : v25.11.01-final
 * Zweck   : TESTS – Diagnose & Quick-Buttons
 *           – Skript-Scanner (Duplikate erkennen, v=… auslesen)
 *           – Copy / Export (JSON, CSV)
 *           – Quick-Events (insp open/close/toggle, build/res snapshot, paths)
 * API     : window.registerInspectorTab('tests', setup)
 * Abhäng. : Inspector-Core (registerInspectorTab), Bridges (optional)
 * Autor   : Siedler 2020
 * ========================================================================== */
(function(){
  if (typeof window.registerInspectorTab !== 'function'){
    console.warn('[tests-tab] registerInspectorTab fehlt.');
    return;
  }

  // --------------------------- [Inline-CSS] ----------------------------------
  (function injectCSS(){
    if (document.getElementById('insp-tests-inline-style')) return;
    const css = `
#inspector .tests-toolbar{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:.25rem 0 .75rem}
#inspector .tests-btn{padding:.25rem .6rem;border:1px solid #333;background:#222;border-radius:.5rem;color:#ddd;cursor:pointer;font-size:13px}
#inspector .tests-btn:hover{background:#303036}
#inspector .tests-grid{display:grid;grid-template-columns:1fr;gap:.75rem}
#inspector .tests-card{border:1px solid #2a2a2e;border-radius:.6rem;padding:.6rem;background:#111}
#inspector .tests-card h4{margin:.1rem 0 .45rem}
#inspector table.tests-table{width:100%;border-collapse:collapse;font-size:13px}
#inspector table.tests-table th,#inspector table.tests-table td{padding:.3rem .4rem;border-bottom:1px dashed #262626;vertical-align:top}
#inspector .muted{opacity:.75}
#inspector .warn{color:#ffcc00}
#inspector .err{color:#ff6666}
#inspector .ok{color:#8ab4f8}
#inspector .badge{display:inline-block;min-width:1.6em;text-align:center;border-radius:.45rem;padding:.05rem .35rem;background:#2a2f39;opacity:.9}
#inspector .dup{background:rgba(255, 204, 0, .1)}
#inspector .right{text-align:right}
#inspector .tests-hr{border:0;border-top:1px solid #262626;margin:.5rem 0}
#inspector .code{font-family:monospace;background:#0f1013;border:1px solid #2a2a2e;border-radius:.35rem;padding:.25rem .4rem;display:inline-block}
    `.trim();
    const s = document.createElement('style');
    s.id = 'insp-tests-inline-style';
    s.textContent = css;
    document.head.appendChild(s);
  })();

  // --------------------------- [Utils] ---------------------------------------
  const $ = (sel, root=document) => root.querySelector(sel);
  const fmt = (v)=> v==null ? '' : String(v);
  function baseName(url){
    try{
      const u = url.split('#')[0];
      const [path, query] = u.split('?');
      const file = path.split('/').pop() || '';
      const v = (query||'').split('&').find(p => p.startsWith('v=')) || '';
      return { file, query:(query||''), v: v ? v.slice(2) : '' };
    }catch{ return { file: '', query:'', v:'' }; }
  }

  function scanScripts(){
    const items = [...document.scripts].map(s => {
      const src = s.getAttribute('src') || '';
      const {file, v} = baseName(src);
      return {
        src, file, v,
        isInline: !src,
      };
    });

    // Gruppieren nach file (ohne Query) – Duplikate erkennen
    const map = new Map();
    for (const it of items){
      if (it.isInline) continue;
      const key = it.file;                      // bewusst nur der Dateiname
      const arr = map.get(key) || [];
      arr.push(it);
      map.set(key, arr);
    }
    const groups = [...map.entries()].map(([file, rows]) => ({
      file,
      count: rows.length,
      versions: [...new Set(rows.map(r => r.v || '(ohne)'))],
      rows
    })).sort((a,b)=> a.file.localeCompare(b.file));

    const inlineCount = items.filter(i => i.isInline).length;

    return { items, groups, inlineCount };
  }

  function csvFromGroups(groups){
    const head = 'file,count,versions,src\n';
    const body = groups.flatMap(g => g.rows.map(r =>
      `"${g.file}","${g.count}","${g.versions.join(' | ')}","${r.src.replace(/"/g,'""')}"`
    )).join('\n');
    return head + body + '\n';
  }

  function download(name, data, mime='application/octet-stream'){
    const url = URL.createObjectURL(new Blob([data], {type:mime}));
    const a = Object.assign(document.createElement('a'), {href:url, download:name});
    document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // --------------------------- [Rendering] -----------------------------------
  function renderScriptsCard(container){
    const {groups, inlineCount} = scanScripts();

    const card = document.createElement('div'); card.className='tests-card';
    const h4 = document.createElement('h4'); h4.textContent = 'Geladene Skripte';
    const p = document.createElement('p');
    const dupCount = groups.filter(g => g.count>1).length;
    p.innerHTML = [
      `<span class="ok">Gesamt:</span> ${groups.length} Dateien`,
      ` &nbsp;•&nbsp; <span class="muted">inline:</span> ${inlineCount}`,
      ` &nbsp;•&nbsp; <span class="${dupCount? 'warn':'ok'}">Duplikat-Gruppen:</span> ${dupCount}`
    ].join('');

    const table = document.createElement('table'); table.className='tests-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Datei</th>
          <th class="right">Anzahl</th>
          <th>Version(en)</th>
          <th>Quelle (eine Zeile pro Vorkommen)</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tb = table.tbody || table.querySelector('tbody');

    for (const g of groups){
      const tr = document.createElement('tr');
      if (g.count>1) tr.classList.add('dup');

      const srcList = g.rows.map(r => `<div class="muted">${r.src}</div>`).join('');

      tr.innerHTML = `
        <td><span class="code">${g.file}</span></td>
        <td class="right"><span class="badge">${g.count}</span></td>
        <td>${g.versions.map(v=>`<span class="badge">${v||'(ohne)'}</span>`).join(' ')}</td>
        <td>${srcList || '<span class="muted">(ohne src – inline)</span>'}</td>
      `;
      tb.appendChild(tr);
    }

    const hr = document.createElement('div'); hr.className='tests-hr';

    // Copy/Export Buttons
    const actions = document.createElement('div'); actions.className='tests-toolbar';
    const bCopy = document.createElement('button'); bCopy.className='tests-btn'; bCopy.textContent='Copy Übersicht';
    const bJson = document.createElement('button'); bJson.className='tests-btn'; bJson.textContent='Export JSON';
    const bCsv  = document.createElement('button'); bCsv.className='tests-btn';  bCsv.textContent='Export CSV';

    bCopy.onclick = async ()=>{
      const lines = [];
      for (const g of groups){
        lines.push(`${g.file}\t${g.count}\t${g.versions.join(' | ')}`);
        for (const r of g.rows) lines.push(`  - ${r.src||'(inline)'}`);
      }
      const text = lines.join('\n');
      try{ await navigator.clipboard.writeText(text); console.info('[tests] Übersicht kopiert.'); }
      catch(e){ console.warn('[tests] Copy fehlgeschlagen:', e); }
    };
    bJson.onclick = ()=>{
      const json = JSON.stringify(groups, null, 2);
      download('scripts-overview.json', json, 'application/json');
    };
    bCsv.onclick = ()=>{
      const csv = csvFromGroups(groups);
      download('scripts-overview.csv', csv, 'text/csv');
    };

    actions.append(bCopy, bJson, bCsv);

    card.append(h4, p, table, hr, actions);
    container.append(card);
  }

  function renderQuickButtons(container){
    const card = document.createElement('div'); card.className='tests-card';
    const h4 = document.createElement('h4'); h4.textContent = 'Quick-Events';
    const bar = document.createElement('div'); bar.className='tests-toolbar';

    const btn = (txt, fn) => {
      const b = document.createElement('button'); b.className='tests-btn'; b.textContent = txt; b.onclick = fn; return b;
    };

    bar.append(
      btn('Inspector öffnen',  ()=> window.dispatchEvent(new CustomEvent('req:insp:open')) ),
      btn('Inspector schließen',()=> window.dispatchEvent(new CustomEvent('req:insp:close')) ),
      btn('Toggle',            ()=> (window.Inspector?.toggle?.(), null)),
      btn('Build Snapshot',    ()=> window.dispatchEvent(new CustomEvent('req:build:snapshot')) ),
      btn('Res Snapshot',      ()=> window.dispatchEvent(new CustomEvent('req:res:snapshot')) ),
      btn('Overlay an',        ()=> window.dispatchEvent(new CustomEvent('cb:path:overlay:on')) ),
      btn('Overlay aus',       ()=> window.dispatchEvent(new CustomEvent('cb:path:overlay:off')) ),
      btn('Heatmap an',        ()=> window.dispatchEvent(new CustomEvent('cb:path:heatmap:on')) ),
      btn('Heatmap aus',       ()=> window.dispatchEvent(new CustomEvent('cb:path:heatmap:off')) )
    );

    card.append(h4, bar);
    container.append(card);
  }

  // --------------------------- [Tab-Setup] -----------------------------------
  window.registerInspectorTab('tests', function setup(section){
    section.innerHTML = '<h2>Tests & Diagnose</h2>';
    const grid = document.createElement('div'); grid.className='tests-grid';
    section.append(grid);

    renderQuickButtons(grid);
    renderScriptsCard(grid);

    // Beim Anzeigen nochmals refreshen, damit late-loader erfasst werden
    let initial = true;
    window.addEventListener('cb:insp:tab:change', (e)=>{
      if (e?.detail?.tab !== 'tests') return;
      // Beim ersten Wechsel nichts neu rendern: das Tab ist frisch
      if (initial){ initial = false; return; }
      // Nur die Skript-Karte neu aufbauen
      const old = section.querySelector('.tests-card:nth-of-type(2)'); // zweite Karte = Skripte
      old?.remove();
      renderScriptsCard(grid);
    });
  });

})();
