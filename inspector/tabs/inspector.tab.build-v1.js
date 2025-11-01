/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.build-v1.js
 * Version : v1.2.0 (2025-11-01)
 * Zweck   : Build-Tab – zeigt Gebäude als Karten (Bild + Kosten + Zeit + Größe + Tür)
 * API     : window.registerInspectorTab('build', setup)
 * Abhäng. : Bridge sendet 'cb:build:snapshot' mit detail.list (s. Bridge)
 * ========================================================================== */
(function(){
  if (typeof window.registerInspectorTab !== 'function') {
    console.warn('[build-tab] registerInspectorTab fehlt.');
    return;
  }

  const S = { data: null, section: null, toolbar: null, grid: null };

  // --- Hilfen ---------------------------------------------------------------
  const ms = v => (v==null ? '–' : `${Math.round(+v)} ms`);
  const sizeText = s => (s ? `${s.w||'?'}×${s.h||'?'}` : '–');
  const doorText = d => (d ? `(${d.x||0},${d.y||0})` : '–');

  function costText(c){
    if (!c || typeof c!=='object') return '–';
    return Object.entries(c).map(([k,v])=>`${k}:${v}`).join('  ');
  }
  function resText(r){
    if (!r) return '–';
    if (Array.isArray(r)) return r.join(', ');
    if (typeof r==='object') return Object.entries(r).map(([k,v])=>`${k}:${v}`).join(', ');
    return String(r);
  }

  function imgEl(src){
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = 'icon';
    img.referrerPolicy = 'no-referrer';
    img.className = 'build-card-img';
    if (src) img.src = src;
    else img.classList.add('is-missing');
    return img;
  }

  // --- UI -------------------------------------------------------------------
  function injectCSS(){
    if (document.getElementById('insp-build-inline-style')) return;
    const st = document.createElement('style'); st.id='insp-build-inline-style';
    st.textContent = `
#inspector .build-toolbar{display:flex;gap:.5rem;align-items:center;margin:.25rem 0 .75rem}
#inspector .insp-btn{padding:.25rem .6rem;border:1px solid #333;background:#222;border-radius:.5rem;cursor:pointer}
#inspector .build-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.75rem;align-items:start}
#inspector .build-card{border:1px solid #2a2a2e;border-radius:.6rem;padding:.5rem;background:#111}
#inspector .build-card h4{margin:.1rem 0 .45rem}
#inspector .build-card-img{width:100%;height:120px;object-fit:contain;background:#0c0c0c;border:1px solid #222;border-radius:.35rem}
#inspector .build-table{width:100%;border-collapse:collapse;margin-top:.35rem;font-size:.9em}
#inspector .build-table th,#inspector .build-table td{padding:.2rem .25rem;border-bottom:1px dashed #262626;vertical-align:top}
#inspector .build-table th{opacity:.7;text-align:left;width:36%}
#inspector .build-card .is-missing{display:block;min-height:120px;background:repeating-linear-gradient(45deg,#1a1a1a,#1a1a1a 8px,#151515 8px,#151515 16px)}
    `;
    document.head.appendChild(st);
  }

  function renderList(list){
    const g = S.grid; g.innerHTML = '';
    for (const b of (list||[])) {
      const card = document.createElement('div'); card.className='build-card';
      const h4 = document.createElement('h4'); h4.textContent = b.name || b.id;
      const img = imgEl(b.image);

      const tbl = document.createElement('table'); tbl.className='build-table';
      tbl.innerHTML = `
        <tr><th>Kategorie</th><td>${b.category || 'building'}</td></tr>
        <tr><th>Kosten</th><td>${costText(b.cost)}</td></tr>
        <tr><th>Ressourcen</th><td>${resText(b.res)}</td></tr>
        <tr><th>Bauzeit</th><td>${ms(b.timeMs)}</td></tr>
        <tr><th>Größe</th><td>${sizeText(b.size)}</td></tr>
        <tr><th>Tür</th><td>${doorText(b.door)}</td></tr>
      `;
      card.append(h4, img, tbl);
      g.append(card);
    }
    if (!list || !list.length){
      const p = document.createElement('p');
      p.innerHTML = '<em>keine Antwort – prüfe die Bridge / Registry …</em>';
      g.append(p);
    }
  }

  function onSnapshot(ev){
    S.data = ev.detail || {};
    renderList(S.data.list || []);
  }

  function requestSnapshot(){
    window.dispatchEvent(new CustomEvent('req:build:snapshot'));
  }

  // --- Registrierung im Inspector ------------------------------------------
  window.registerInspectorTab('build', function setup(section){
    injectCSS();
    S.section = section;
    section.innerHTML = '<h2>Build</h2>';

    // Toolbar
    const tb = document.createElement('div'); tb.className='build-toolbar';
    const btnReq = document.createElement('button'); btnReq.className='insp-btn'; btnReq.textContent='Snapshot anfordern';
    const btnJson= document.createElement('button'); btnJson.className='insp-btn'; btnJson.textContent='Export JSON';
    const btnCsv = document.createElement('button'); btnCsv.className='insp-btn'; btnCsv.textContent='Export CSV';
    tb.append(btnReq, btnJson, btnCsv);
    section.append(tb);

    // Grid
    const grid = document.createElement('div'); grid.className='build-grid';
    section.append(grid);
    S.toolbar = tb; S.grid = grid;

    btnReq.onclick = requestSnapshot;
    btnJson.onclick = () => {
      const data = JSON.stringify(S.data || {}, null, 2);
      const url = URL.createObjectURL(new Blob([data],{type:'application/json'}));
      const a = Object.assign(document.createElement('a'), {href:url, download:'build-snapshot.json'});
      document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };
    btnCsv.onclick = () => {
      const rows = (S.data?.list||[]).map(b=>[
        JSON.stringify(b.id??''), JSON.stringify(b.name??''), JSON.stringify(b.category??''),
        JSON.stringify(b.image??''), JSON.stringify(b.timeMs??''), JSON.stringify(b.size?`${b.size.w}x${b.size.h}`:''),
        JSON.stringify(b.door?`${b.door.x},${b.door.y}`:''), JSON.stringify(b.cost??{}), JSON.stringify(b.res??{})
      ].join(','));
      const csv = ["id,name,category,image,timeMs,size,door,cost,res"].concat(rows).join('\n');
      const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
      const a = Object.assign(document.createElement('a'), {href:url, download:'build-snapshot.csv'});
      document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };

    // Live-Updates
    window.addEventListener('cb:build:snapshot', onSnapshot);

    // Beim ersten Öffnen direkt anfordern (bequem)
    requestSnapshot();
  });

})();
