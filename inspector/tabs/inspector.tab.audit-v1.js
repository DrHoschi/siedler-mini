/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.audit-v1.js
 * Projekt : Neue Siedler
 * Version : v1.1.0 (2025-11-05, final)
 *
 * Tab "Audit" – kombiniert:
 *  A) Quellcode-Audit der geladenen <script>-Dateien:
 *     - Duplikate (gleicher src / identischer Inhalt / doppelte Tab-Registrierung)
 *     - Mehrfache Event-Hooks (cb:ui-ready, cb:game-start, req:game:start, ...)
 *     - Startpanel-Konflikte (req:ui:startpanel:hide vs. show, is-playing)
 *     Ausgabe: Tabelle "Datei → Events/Init → Konflikt/Status → Maßnahme" + CSV
 *
 *  B) Laufzeit-Event-Scanner (integriert):
 *     - Hookt window.dispatchEvent (Emits) und addEventListener (Listener)
 *     - Zählt und protokolliert CustomEvents (cb:*, req:*) + Listener je Typ
 *     - Live-Zusammenfassung + Detailanzeige + CSV-Export (Events / Listener)
 *
 * Leitlinien
 * - Keine Projekt-Abhängigkeiten: arbeitet rein über DOM + fetch()
 * - Gleich-Origin erwartet (für fetch der Skripte)
 * - Run-Once-Guards gegen Doppel-Registrierung
 * - Scanner-Guards, damit wir dispatchEvent/addEventListener nur 1× hooken
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
      // Minimaler DOM-Fallback (falls API nie kommt)
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
#inspector .audit-table{width:100%;border-collapse:collapse;font-size:12px}
#inspector .audit-table th,#inspector .audit-table td{border-bottom:1px solid #2a2a2e;padding:.4rem .5rem;text-align:left;vertical-align:top}
#inspector .audit-badge{display:inline-block;border:1px solid #444;border-radius:.4rem;padding:.05rem .4rem;margin:.1rem .25rem .1rem 0}
#inspector .ok{color:#8ab4f8} #inspector .warn{color:#ffcc00} #inspector .err{color:#ff6666}
#inspector .mono{font-family:ui-monospace,Menlo,Consolas,monospace}
#inspector .audit-subtitle{margin:.75rem 0 .35rem;font-weight:700;opacity:.9}
    `;
    document.head.appendChild(st);
  }

  /* ================================ Utils ================================== */
  const $ = (s,sc=document)=> sc.querySelector(s);
  const $$ = (s,sc=document)=> Array.from(sc.querySelectorAll(s));
  function hash32(str){ let h=0; for(let i=0;i<str.length;i++){ h=((h<<5)-h)+str.charCodeAt(i); h|=0; } return (h>>>0).toString(16); }
  function csvEscape(s){ return `"${String(s).replace(/"/g,'""')}"`; }
  function badge(cls, txt){ const b=document.createElement('span'); b.className='audit-badge '+cls; b.textContent=txt; return b; }

  // Regex-Muster (Quellcode-Heuristik)
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

  // Bewertung aus Heuristik
  function assess(file, meta){
    const f = meta.flags;
    const probs = [];
    if (meta.dupSrcCount>1) probs.push({sev:'err', msg:`gleicher <script src> ${meta.dupSrcCount}×`, fix:'Duplikat in index.html entfernen'});
    if (meta.dupHashCount>1) probs.push({sev:'err', msg:`identischer Inhalt ${meta.dupHashCount}×`, fix:'Inline-Duplikat entfernen oder __inline_once(key,fn) nutzen'});
    if (f.boot_init>1)      probs.push({sev:'err', msg:`BootManager-Initialisierung ${f.boot_init}×`, fix:'Nur EIN core/boot.js laden; Run-Once in boot.js'});
    if (f.emit_ui_ready>1)  probs.push({sev:'warn',msg:`cb:ui-ready wird ${f.emit_ui_ready}× emittiert`, fix:'UI meldet sich genau EINMAL ready (Run-Once-Flag setzen)'});
    if (f.startpanel_hide>0 && f.startpanel_show===0) probs.push({sev:'warn', msg:`Startpanel hide (${f.startpanel_hide}) ohne show`, fix:'show/restore ergänzen'});
    if (f.startpanel_hide>0 && f.emit_game_start>0 && f.listen_ui_ready===0) probs.push({sev:'warn', msg:`hide + game-start ohne ui-ready Listener`, fix:'boot.js: cb:ui-ready abwarten (tryStart())'});
    if (f.inspector_register>1) probs.push({sev:'warn', msg:`registerInspectorTab ${f.inspector_register}×`, fix:'Run-Once-Guard (window.__INSP_TABS__) pro Tab'});
    if (!probs.length) probs.push({sev:'ok', msg:'OK', fix:'—'});
    return probs;
  }

  /* ========================= Integrierter Event-Scanner ===================== */
  // Laufzeit-Hooks: dispatchEvent (Emits) + addEventListener (Listener)
  // Guarded, damit wir es nie doppelt patchen.
  function ensureEventScanner(){
    if (window.__EVENT_SCANNER_ACTIVE__) return true;
    window.__EVENT_SCANNER_ACTIVE__ = true;

    // Datenspeicher
    const MAX = 2000; // Ringpuffer
    window.__EVENT_REGISTRY__   = window.__EVENT_REGISTRY__   || [];  // [{type, time, detail, target, file}]
    window.__EVENT_LISTENERS__  = window.__EVENT_LISTENERS__  || new Map(); // type -> [{target, file}]
    window.__EVENT_SUMMARY__    = window.__EVENT_SUMMARY__    || new Map(); // type -> {emit: n, listen: n}

    // Hilfen
    function addSummary(type, kind){
      const rec = window.__EVENT_SUMMARY__.get(type) || { emit:0, listen:0 };
      rec[kind] = (rec[kind]||0) + 1;
      window.__EVENT_SUMMARY__.set(type, rec);
    }
    function guessFileFromStack(){
      try{
        const st = (new Error()).stack || '';
        // nimm die erste stack-Zeile mit .js
        const m = st.split('\n').find(l=>/\.js[:)]/.test(l));
        if (!m) return '';
        const u = m.match(/(https?:\/\/[^\s)]+\.js)/)?.[1] || m.match(/(\/[^)\s]+\.js)/)?.[1] || '';
        return u || '';
      }catch(_){ return ''; }
    }

    // Hook dispatchEvent (nur CustomEvents zählen)
    const _dispatch = window.dispatchEvent.bind(window);
    window.dispatchEvent = function(ev){
      try{
        if (ev && typeof ev.type === 'string' && (/^(cb:|req:)/.test(ev.type))){
          const file = guessFileFromStack();
          const entry = { type:ev.type, time:Date.now(), detail:ev.detail, target:'window', file };
          window.__EVENT_REGISTRY__.push(entry);
          if (window.__EVENT_REGISTRY__.length > MAX) window.__EVENT_REGISTRY__.shift();
          addSummary(ev.type, 'emit');
        }
      }catch(_){}
      return _dispatch(ev);
    };

    // Hook addEventListener (alle Targets, aber nur cb:/req: Typen zählen)
    const _add = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, opts){
      try{
        if (typeof type === 'string' && (/^(cb:|req:)/.test(type))){
          const file = guessFileFromStack();
          const list = window.__EVENT_LISTENERS__.get(type) || [];
          list.push({ target: this===window?'window':(this?.tagName||'object'), file });
          window.__EVENT_LISTENERS__.set(type, list);
          addSummary(type, 'listen');
        }
      }catch(_){}
      return _add.call(this, type, listener, opts);
    };

    (window.CBLog?.info||console.info)('[audit-tab] Event-Scanner aktiv.');
    return true;
  }

  /* ================================ Code-Scan =============================== */
  async function scanAllScripts(){
    const scripts = Array.from(document.scripts||[]);
    const bySrc = new Map();    // src → [script]
    const byHash = new Map();   // hash → [ {idx, inline, src, content} ]

    // Gruppen bilden
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

    // Inhalte laden
    const entries = [];
    for (const s of scripts){
      const src = (s.src||'').trim();
      let content = '';
      let inline = false;
      if (src){
        try { const res = await fetch(src, { cache:'no-store' }); content = await res.text(); }
        catch(e){ content = `/* [audit] fetch fehlgeschlagen: ${e?.message||e} */`; }
      } else {
        inline = true; content = (s.textContent||'');
      }
      const h = hash32(content);
      const dupSrcCount  = src ? (bySrc.get(src)?.length||0) : 0;
      const dupHashCount = (byHash.get(h)?.length||0);

      const flags = {};
      for (const [k, rx] of Object.entries(PAT)){ flags[k] = (content.match(rx)||[]).length; }

      entries.push({
        file: src || `<inline #${entries.length+1}>`,
        inline, src, hash:h,
        dupSrcCount, dupHashCount,
        flags
      });
    }

    // Bewertung
    return entries.map(e => ({ entry:e, assess:assess(e.file, e) }));
  }

  /* ================================ UI ===================================== */
  function mount(sectionEl){
    injectCSS();
    ensureEventScanner();

    sectionEl.innerHTML = '';
    const wrap = document.createElement('div');

    const h = document.createElement('h3'); h.textContent = 'Audit – Code & Live-Events';
    wrap.appendChild(h);

    // ---------- Toolbar ----------
    const bar = document.createElement('div'); bar.className='audit-toolbar';
    const btnScan     = mkBtn('Code-Scan starten');
    const btnCSV      = mkBtn('Export Audit CSV');
    const btnEvtSum   = mkBtn('Live-Events aktualisieren');
    const btnEvtCSV   = mkBtn('Export Events CSV');
    const btnLstCSV   = mkBtn('Export Listener CSV');
    bar.append(btnScan, btnCSV, btnEvtSum, btnEvtCSV, btnLstCSV);
    wrap.appendChild(bar);

    // ---------- Code-Audit Tabelle ----------
    const titleA = subtitle('Code-Audit (Skripte)');
    const tableA = mkTable(['Datei','Events / Init (Zähler)','Konflikt / Status','Empfohlene Maßnahme'], [32,28,20,20]);
    const tbodyA = tableA.querySelector('tbody');
    wrap.appendChild(titleA); wrap.appendChild(tableA);

    // ---------- Live-Events Zusammenfassung ----------
    const titleB = subtitle('Live-Events (Scanner)');
    const tableB = mkTable(['Event','Emits','Listener','Hinweis'], [42,12,12,34]);
    const tbodyB = tableB.querySelector('tbody');
    wrap.appendChild(titleB); wrap.appendChild(tableB);

    // ---------- Details (optional) ----------
    const titleC = subtitle('Event-Details (letzte Emits)');
    const tableC = mkTable(['Zeit','Event','Detail','Quelle'], [14,20,36,30]);
    const tbodyC = tableC.querySelector('tbody');
    wrap.appendChild(titleC); wrap.appendChild(tableC);

    sectionEl.appendChild(wrap);

    let lastAuditRows = [];

    // Helpers UI
    function mkBtn(txt, fn){ const b=document.createElement('button'); b.className='audit-btn'; b.textContent=txt; if(fn) b.addEventListener('click', fn); return b; }
    function mkTable(heads, widths){
      const t = document.createElement('table'); t.className='audit-table';
      const th = heads.map((h,i)=>`<th style="width:${widths[i]}%">${h}</th>`).join('');
      t.innerHTML = `<thead><tr>${th}</tr></thead><tbody></tbody>`;
      return t;
    }
    function subtitle(txt){ const el=document.createElement('div'); el.className='audit-subtitle'; el.textContent=txt; return el; }

    function flagsNode(flags){
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
        box.appendChild( badge(cls, `${label}:${val}`) );
      });
      return box;
    }
    function assessNodes(assess){
      const box = document.createElement('div');
      assess.forEach(a=> box.appendChild(badge(a.sev==='err'?'err':(a.sev==='warn'?'warn':'ok'), a.msg)));
      return box;
    }
    function firstFix(assess){
      const row = assess.find(a=>a.sev!=='ok'); return row ? row.fix : '—';
    }

    async function doAuditScan(){
      tbodyA.innerHTML = `<tr><td colspan="4">Analysiere …</td></tr>`;
      try{
        lastAuditRows = await scanAllScripts();
        tbodyA.innerHTML = '';
        lastAuditRows.forEach(({entry, assess})=>{
          const tr = document.createElement('tr');

          const tdFile = document.createElement('td');
          tdFile.innerHTML = `
            <div class="mono">${entry.file}</div>
            <div class="mono" style="opacity:.7">hash:${entry.hash}${entry.inline?' · inline':''}</div>
            ${entry.dupSrcCount>1?`<div class="err mono">dup src:${entry.dupSrcCount}×</div>`:''}
            ${entry.dupHashCount>1?`<div class="err mono">dup content:${entry.dupHashCount}×</div>`:''}
          `;
          tr.appendChild(tdFile);

          const tdFlags = document.createElement('td'); tdFlags.appendChild( flagsNode(entry.flags) ); tr.appendChild(tdFlags);
          const tdAss   = document.createElement('td'); tdAss.appendChild( assessNodes(assess) ); tr.appendChild(tdAss);
          const tdFix   = document.createElement('td'); tdFix.textContent = firstFix(assess); tr.appendChild(tdFix);

          tbodyA.appendChild(tr);
        });
      }catch(e){
        tbodyA.innerHTML = `<tr><td colspan="4" class="err">Scan-Fehler: ${e?.message||e}</td></tr>`;
      }
    }

    function populateLive(){
      // Zusammenfassung
      tbodyB.innerHTML = '';
      const sum = window.__EVENT_SUMMARY__ || new Map();
      const rows = Array.from(sum.entries()).sort((a,b)=> a[0].localeCompare(b[0]));
      if (!rows.length){
        tbodyB.innerHTML = `<tr><td colspan="4">Noch keine Events erfasst. Starte Aktionen oder wechsle Tabs/Buttons im Spiel.</td></tr>`;
      } else {
        rows.forEach(([type, rec])=>{
          const tr = document.createElement('tr');
          const hint = (rec.emit>1 && rec.listen===0) ? 'Emit mehrfach, kein Listener?' :
                       (rec.listen>1 && rec.emit===0) ? 'Listener mehrfach, kein Emit sichtbar?' : '—';
          tr.innerHTML = `<td class="mono">${type}</td><td>${rec.emit||0}</td><td>${rec.listen||0}</td><td>${hint}</td>`;
          tbodyB.appendChild(tr);
        });
      }

      // Details (letzte N Emits)
      tbodyC.innerHTML = '';
      const list = window.__EVENT_REGISTRY__ || [];
      const last = list.slice(-200).reverse(); // letzte 200 anzeigen
      if (!last.length){
        tbodyC.innerHTML = `<tr><td colspan="4">Keine Emits protokolliert.</td></tr>`;
      } else {
        last.forEach(it=>{
          const t = new Date(it.time).toLocaleTimeString();
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="mono">${t}</td>
            <td class="mono">${it.type}</td>
            <td class="mono" style="max-width:0;word-break:break-word">${safeJSON(it.detail)}</td>
            <td class="mono" title="${it.file||''}">${shorten(it.file||'')}</td>
          `;
          tbodyC.appendChild(tr);
        });
      }
    }

    function safeJSON(v){ try{ return (v==null)?'—':JSON.stringify(v); }catch(_){ return String(v); } }
    function shorten(s){ if(!s) return '—'; return s.length>96 ? ('…'+s.slice(-95)) : s; }

    function exportAuditCSV(){
      if (!lastAuditRows.length){ alert('Bitte zuerst „Code-Scan starten“.'); return; }
      const head = ['Datei','hash','inline','dup_src','dup_content','emit_ui_ready','listen_ui_ready','emit_game_start','listen_game_start','startpanel_hide','startpanel_show','inspector_register','boot_init','Konflikt(e)','Empfehlung'];
      const lines = [head.join(';')];
      lastAuditRows.forEach(({entry, assess})=>{
        const f = entry.flags;
        const probs = assess.map(a=>`${a.sev.toUpperCase()}:${a.msg}`).join(' | ');
        const fix   = assess.map(a=>a.fix).find(Boolean) || '—';
        const row = [
          entry.file, entry.hash, entry.inline, entry.dupSrcCount, entry.dupHashCount,
          f.emit_ui_ready, f.listen_ui_ready, f.emit_game_start, f.listen_game_start,
          f.startpanel_hide, f.startpanel_show, f.inspector_register, f.boot_init,
          probs, fix
        ].map(csvEscape).join(';');
        lines.push(row);
      });
      downloadCSV('audit-report.csv', lines);
    }

    function exportEventsCSV(){
      const list = window.__EVENT_REGISTRY__ || [];
      const head = ['time','event','detail','file'];
      const lines = [head.join(';')];
      list.forEach(it=>{
        const t = new Date(it.time).toISOString();
        lines.push([t, it.type, safeJSON(it.detail), it.file||''].map(csvEscape).join(';'));
      });
      downloadCSV('events-report.csv', lines);
    }

    function exportListenersCSV(){
      const map = window.__EVENT_LISTENERS__ || new Map();
      const head = ['event','target','file'];
      const lines = [head.join(';')];
      map.forEach((arr, type)=>{
        arr.forEach(r=>{
          lines.push([type, r.target||'?', r.file||''].map(csvEscape).join(';'));
        });
      });
      downloadCSV('listeners-report.csv', lines);
    }

    function downloadCSV(name, lines){
      const blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
    }

    // Bindings
    btnScan   .addEventListener('click', doAuditScan);
    btnCSV    .addEventListener('click', exportAuditCSV);
    btnEvtSum .addEventListener('click', populateLive);
    btnEvtCSV .addEventListener('click', exportEventsCSV);
    btnLstCSV .addEventListener('click', exportListenersCSV);

    // Erstlauf
    doAuditScan();
    populateLive();
  }

  /* ============================= Registrierung ============================= */
  universalRegister('Audit', 'insp-tab-audit', mount, 130);

})();
