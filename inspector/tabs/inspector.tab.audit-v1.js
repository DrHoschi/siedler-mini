/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.audit-v1.js
 * Projekt : Neue Siedler
 * Version : v1.0.0 (2025-11-04, final)
 * Zweck   : Inspector-Tab "Audit" – Laufzeit-Analyse der eingebundenen JS-Dateien:
 *           - Duplikate (gleicher src / identische Inhalte / mehrfach registrierte Tabs)
 *           - Mehrfache Event-Hooks (cb:ui-ready, cb:game-start, req:game:start, ...)
 *           - Startpanel-Konflikte (req:ui:startpanel:hide vs. show, is-playing)
 * Ausgabe : Tabelle "Datei → Event/Init → Konflikt/OK → Empfohlene Maßnahme"
 *
 * Leitlinien
 * - Keine Projekt-Abhängigkeiten: arbeitet rein über DOM + fetch()
 * - Läuft in der Seite (gleiche Origin) → kann Script-Quellen einlesen
 * - Schützt sich gegen Doppelladen (Run-Once)
 * - CSV-Export für Befundliste
 *
 * Empfohlene Maßnahmen (Heuristik)
 * - Run-Once-Guards für Tabs/Module (window.__INSP_TABS__, window.__MODULES__)
 * - Doppelte Inline-Blöcke entfernen oder __inline_once('key', fn) nutzen
 * - Nur EIN BootManager (core/boot.js) laden
 * - UI meldet cb:ui-ready genau EINMAL
 * ========================================================================== */

(function(){
  'use strict';

  /* ============================== Run-Once ================================= */
  window.__INSP_TABS__ = window.__INSP_TABS__ || {};
  if (window.__INSP_TABS__['audit-v1']) return;
  window.__INSP_TABS__['audit-v1'] = true;

  /* ======================= Late Registration Helper ======================== */
  function universalRegister(tabTitle, tabId, mountFn, order){
    const tryAPI = ()=>{
      if (typeof window.registerInspectorTab === 'function'){
        window.registerInspectorTab(tabTitle, mountFn, { id: tabId, order: order||130 });
        (window.CBLog?.info||console.info)('[audit-tab] via API registriert.');
        return true;
      }
      return false;
    };
    if (tryAPI()) return;
    const onReady = ()=>{ if (tryAPI()) cleanup(); };
    function cleanup(){
      window.removeEventListener('cb:insp:core:ready', onReady);
      window.removeEventListener('cb:insp:content:ready', onReady);
      clearInterval(poll); clearTimeout(tout);
    }
    window.addEventListener('cb:insp:core:ready', onReady);
    window.addEventListener('cb:insp:content:ready', onReady);
    const poll = setInterval(onReady, 200);
    const tout = setTimeout(()=>{
      clearInterval(poll);
      // Minimaler DOM-Fallback
      const insp = document.querySelector('#inspector');
      const tabs = insp?.querySelector('.insp-tabs');
      const content = insp?.querySelector('.insp-content');
      if (tabs && content) {
        const btn = document.createElement('button');
        btn.textContent = tabTitle; btn.dataset.tab = tabId; tabs.appendChild(btn);
        const sec = document.createElement('section');
        sec.id = tabId; content.appendChild(sec);
        tabs.querySelectorAll('button').forEach(b=>{
          b.addEventListener('click', ()=>{
            const id = b.dataset.tab;
            content.querySelectorAll('section').forEach(s=> s.style.display = (s.id===id?'block':'none'));
            window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab: b.textContent } }));
          });
        });
        mountFn(sec); sec.style.display='block';
        console.info('[audit-tab] DOM-Fallback aktiv.');
      } else {
        console.warn('[audit-tab] Weder API noch .insp-tabs/.insp-content vorhanden.');
      }
    }, 10000);
  }

  /* ================================= CSS =================================== */
  function injectCSS(){
    if (document.getElementById('insp-audit-inline-style')) return;
    const st = document.createElement('style');
    st.id = 'insp-audit-inline-style';
    st.textContent = `
#inspector .audit-toolbar{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:.25rem 0 .75rem}
#inspector .audit-btn{padding:.25rem .6rem;border:1px solid #333;background:#222;border-radius:.5rem;cursor:pointer}
#inspector .audit-input{padding:.25rem .5rem;border:1px solid #333;background:#111;border-radius:.4rem;min-width:220px}
#inspector .audit-table{width:100%;border-collapse:collapse;font-size:12px}
#inspector .audit-table th,#inspector .audit-table td{border-bottom:1px solid #2a2a2e;padding:.4rem .5rem;text-align:left;vertical-align:top}
#inspector .audit-badge{display:inline-block;border:1px solid #444;border-radius:.4rem;padding:.05rem .4rem;margin-right:.25rem}
#inspector .ok{color:#8ab4f8} #inspector .warn{color:#ffcc00} #inspector .err{color:#ff6666}
#inspector .mono{font-family:ui-monospace,Menlo,Consolas,monospace}
    `;
    document.head.appendChild(st);
  }

  /* ================================ Utils ================================== */
  const $ = (s,sc=document)=> sc.querySelector(s);
  const $$ = (s,sc=document)=> Array.from(sc.querySelectorAll(s));
  function hash32(str){
    let h=0; for(let i=0;i<str.length;i++){ h=((h<<5)-h) + str.charCodeAt(i); h|=0; }
    return (h>>>0).toString(16);
  }
  function csvEscape(s){ return `"${String(s).replace(/"/g,'""')}"`; }

  // Muster für Events/Init (heuristisch)
  const PAT = {
    emit_ui_ready: /dispatchEvent\s*\(\s*new\s+CustomEvent\s*\(\s*['"]cb:ui-ready['"]/g,
    listen_ui_ready: /addEventListener\s*\(\s*['"]cb:ui-ready['"]/g,

    emit_game_start: /dispatchEvent\s*\(\s*new\s+CustomEvent\s*\(\s*['"](cb:game-start|req:game:start)['"]/g,
    listen_game_start: /addEventListener\s*\(\s*['"](cb:game-start|req:game:start)['"]/g,

    startpanel_hide: /['"]req:ui:startpanel:hide['"]/g,
    startpanel_show: /['"]req:ui:startpanel:show['"]/g,

    inspector_register: /registerInspectorTab\s*\(/g,
    boot_init: /\[boot\]\s*BootManager\s+initialisiert|class\s+BootManager|BootManager\s*=/g,
  };

  // Bewertung/Empfehlung aus Befunden ableiten
  function assess(file, meta){
    const f = meta.flags;
    const probs = [];

    // Duplikate
    if (meta.dupSrcCount>1) probs.push({sev:'err', msg:`gleicher <script src> ${meta.dupSrcCount}×`, fix:'Doppelte Einbindung in index.html entfernen'});
    if (meta.dupHashCount>1) probs.push({sev:'err', msg:`identischer Inhalt ${meta.dupHashCount}×`, fix:'Inline-Duplikat entfernen oder __inline_once(key,fn) nutzen'});

    // BootManager mehrfach
    if (f.boot_init>1) probs.push({sev:'err', msg:`BootManager-Initialisierung ${f.boot_init}×`, fix:'Nur EIN boot.js laden; Run-Once-Guard in boot.js'});

    // UI-Ready mehrfach gesendet
    if (f.emit_ui_ready>1) probs.push({sev:'warn', msg:`cb:ui-ready wird ${f.emit_ui_ready}× emittiert`, fix:'UI meldet sich genau EINMAL ready (Run-Once-Flag setzen)'});

    // Startpanel-Konflikte
    if (f.startpanel_hide>0 && f.startpanel_show===0) probs.push({sev:'warn', msg:`Startpanel wird versteckt (hide=${f.startpanel_hide}), aber kein show`, fix:'Startpanel show/restore bei Bedarf ergänzen'});
    if (f.startpanel_hide>0 && f.emit_game_start>0 && f.listen_ui_ready===0) probs.push({sev:'warn', msg:`hide + game-start ohne UI-ready Listener`, fix:'boot.js: auf cb:ui-ready hören (tryStart())'});

    // Inspector-Tabs doppelt
    if (f.inspector_register>1) probs.push({sev:'warn', msg:`registerInspectorTab ${f.inspector_register}×`, fix:'Run-Once-Guard (window.__INSP_TABS__) pro Tab'});

    // Nichts Auffälliges?
    if (!probs.length) probs.push({sev:'ok', msg:'OK', fix:'—'});

    return probs;
  }

  /* ================================ Scan =================================== */
  async function scanAll(){
    const scripts = Array.from(document.scripts||[]);
    const bySrc = new Map();    // src → [script]
    const byHash = new Map();   // hash → [ {idx, inline, src, content} ]

    // 1) Gruppen bilden
    scripts.forEach((s, idx)=>{
      const src = (s.src||'').trim();
      if (src) {
        const arr = bySrc.get(src)||[]; arr.push({el:s, idx}); bySrc.set(src, arr);
      } else {
        const txt = (s.textContent||'').trim();
        const h = hash32(txt);
        const arr = byHash.get(h)||[]; arr.push({idx, inline:true, src:'<inline>', content:txt}); byHash.set(h, arr);
      }
    });

    // 2) Inhalte laden (nur src) – gleiche Origin angenommen
    const entries = [];
    for (const s of scripts){
      const src = (s.src||'').trim();
      let content = '';
      let inline = false;
      if (src){
        try {
          const res = await fetch(src, { cache:'no-store' });
          content = await res.text();
        } catch(e) {
          content = `/* [audit] fetch fehlgeschlagen: ${e?.message||e} */`;
        }
      } else {
        inline = true;
        content = (s.textContent||'');
      }
      const h = hash32(content);
      const dupSrcCount = src ? (bySrc.get(src)?.length||0) : 0;
      const dupHashCount = (byHash.get(h)?.length||0);

      // Muster zählen
      const flags = {};
      for (const [k, rx] of Object.entries(PAT)){
        flags[k] = (content.match(rx)||[]).length;
      }

      entries.push({
        file: src || `<inline #${entries.length+1}>`,
        inline, src, hash:h,
        dupSrcCount, dupHashCount,
        flags
      });
    }

    // 3) Bewertung + empfohlene Maßnahme
    const rows = entries.map(e=>{
      const assessList = assess(e.file, e);
      return { entry:e, assess:assessList };
    });

    return rows;
  }

  /* =============================== UI Mount ================================ */
  function mount(sectionEl){
    injectCSS();
    sectionEl.innerHTML = '';
    const wrap = document.createElement('div');

    const h = document.createElement('h3');
    h.textContent = 'Audit – Duplikate, Event-Hooks, Startpanel-Konflikte';
    wrap.appendChild(h);

    // Toolbar
    const bar = document.createElement('div'); bar.className='audit-toolbar';
    const btnScan = document.createElement('button'); btnScan.className='audit-btn'; btnScan.textContent='Scan starten';
    const btnCSV  = document.createElement('button'); btnCSV.className='audit-btn';  btnCSV.textContent='Export CSV';
    const hint = document.createElement('span'); hint.className='mono'; hint.style.opacity='.8';
    hint.textContent = 'Scannt alle aktuell eingebundenen <script>-Dateien.';
    bar.append(btnScan, btnCSV, hint);
    wrap.appendChild(bar);

    // Tabelle
    const table = document.createElement('table'); table.className='audit-table';
    table.innerHTML = `
      <thead><tr>
        <th style="width:32%">Datei</th>
        <th style="width:28%">Events / Init (Zähler)</th>
        <th style="width:20%">Konflikt / Status</th>
        <th style="width:20%">Empfohlene Maßnahme</th>
      </tr></thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    wrap.appendChild(table);

    sectionEl.appendChild(wrap);

    // Render-Hilfen
    function badge(cls, txt){ const b=document.createElement('span'); b.className='audit-badge '+cls; b.textContent=txt; return b; }
    function flagsToNode(flags){
      const box = document.createElement('div');
      const map = [
        ['emit_ui_ready','emit ui-ready'],
        ['listen_ui_ready','listen ui-ready'],
        ['emit_game_start','emit game-start'],
        ['listen_game_start','listen game-start'],
        ['startpanel_hide','startpanel:hide'],
        ['startpanel_show','startpanel:show'],
        ['inspector_register','registerInspectorTab'],
        ['boot_init','BootManager']
      ];
      map.forEach(([k,label])=>{
        const val = flags[k]||0;
        const cls = val>1 ? 'warn' : (val>0 ? 'ok':'');
        const b = badge(cls, `${label}:${val}`);
        box.appendChild(b);
        box.appendChild(document.createTextNode(' '));
      });
      return box;
    }

    function assessToNodes(assess){
      const box = document.createElement('div');
      assess.forEach(a=>{
        const cls = a.sev==='err'?'err':(a.sev==='warn'?'warn':'ok');
        box.appendChild(badge(cls, a.msg));
        box.appendChild(document.createElement('br'));
      });
      return box;
    }

    function firstFix(assess){
      const row = assess.find(a=>a.sev!=='ok');
      return row ? row.fix : '—';
    }

    let lastRows = [];

    async function doScan(){
      tbody.innerHTML = `<tr><td colspan="4">Analysiere … bitte warten.</td></tr>`;
      try{
        lastRows = await scanAll();
        tbody.innerHTML = '';
        lastRows.forEach(({entry, assess})=>{
          const tr = document.createElement('tr');

          // Datei
          const tdFile = document.createElement('td');
          tdFile.innerHTML = `
            <div class="mono">${entry.file}</div>
            <div class="mono" style="opacity:.7">hash:${entry.hash}${entry.inline?' · inline':''}</div>
            ${entry.dupSrcCount>1?`<div class="err mono">dup src:${entry.dupSrcCount}×</div>`:''}
            ${entry.dupHashCount>1?`<div class="err mono">dup content:${entry.dupHashCount}×</div>`:''}
          `;
          tr.appendChild(tdFile);

          // Events / Init
          const tdFlags = document.createElement('td');
          tdFlags.appendChild( flagsToNode(entry.flags) );
          tr.appendChild(tdFlags);

          // Konflikt / Status
          const tdAss = document.createElement('td');
          tdAss.appendChild( assessToNodes(assess) );
          tr.appendChild(tdAss);

          // Maßnahme
          const tdFix = document.createElement('td');
          tdFix.textContent = firstFix(assess);
          tr.appendChild(tdFix);

          tbody.appendChild(tr);
        });
      }catch(e){
        tbody.innerHTML = `<tr><td colspan="4" class="err">Scan-Fehler: ${e?.message||e}</td></tr>`;
      }
    }

    function exportCSV(){
      if (!lastRows.length){ alert('Bitte zuerst scannen.'); return; }
      const head = ['Datei','hash','inline','dup_src','dup_content','emit_ui_ready','listen_ui_ready','emit_game_start','listen_game_start','startpanel_hide','startpanel_show','inspector_register','boot_init','Konflikt(e)','Empfehlung'];
      const lines = [head.join(';')];

      lastRows.forEach(({entry, assess})=>{
        const flags = entry.flags;
        const probs = assess.map(a=>`${a.sev.toUpperCase()}:${a.msg}`).join(' | ');
        const fix   = assess.map(a=>a.fix).filter(Boolean)[0] || '—';
        const row = [
          entry.file, entry.hash, entry.inline, entry.dupSrcCount, entry.dupHashCount,
          flags.emit_ui_ready, flags.listen_ui_ready,
          flags.emit_game_start, flags.listen_game_start,
          flags.startpanel_hide, flags.startpanel_show,
          flags.inspector_register, flags.boot_init,
          probs, fix
        ].map(csvEscape).join(';');
        lines.push(row);
      });

      const blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'audit-report.csv';
      document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
    }

    btnScan.addEventListener('click', doScan);
    btnCSV .addEventListener('click', exportCSV);

    // Beim ersten Öffnen sofort scannen
    doScan();
  }

  /* ============================= Registrierung ============================= */
  universalRegister('Audit', 'insp-tab-audit', mount, 130);

})();
