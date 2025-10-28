/* ============================================================================
 * Datei   : ui/inspector/inspector.logs.js
 * Projekt : Neue Siedler – Inspector (Logs-Tab)
 * Version : v18.15.1 (final restore, robust sources)
 * Zweck   : Logs-Panel mit:
 *           - 4 Filtern (Info/Warnung/Fehler/Erfolg)
 *           - Kopieren (nur sichtbare Zeilen) & Export JSON
 *           - Optionaler „Quelle“-Prefix je Logzeile
 *           - Kompakte Zeitstempel
 *           - ROBUST: liest Logs aus verschiedenen CBLog-Quellen
 *                     (buffer/history/store/entries/ähnliche Arrays)
 *                     + Auto-Tap als Fallback für künftige Einträge
 * Abh.    : window.Inspector (Core), optional window.CBLog
 * Events  : cb:insp:tab:change, cb:insp:export:logs
 * API     : UIInspector.exportLogsToClipboard(), UIInspector.exportLogsJSON()
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.logs]';

  /* ------------------------------ Konfiguration ------------------------------ */
  const CONFIG = {
    SHOW_SOURCE: false,                              // Quelle/Ursprung anzeigen?
    TIME_FMT: { hour:'2-digit', minute:'2-digit', second:'2-digit' },
    SYMBOLS: { error:'❌', warn:'⚠️', info:'ℹ', ok:'✅' },
    LEVELS : ['info','warn','error','ok']
  };

  /* ------------------------------ Logging-Helper ----------------------------- */
  const L = {
    info : (window.CBLog?.info || console.info).bind(console, MOD),
    ok   : (window.CBLog?.ok   || console.log ).bind(console, MOD),
    warn : (window.CBLog?.warn || console.warn).bind(console, MOD),
    err  : (window.CBLog?.error|| console.error).bind(console, MOD)
  };

  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  /* ------------------------------ Quellen-Erkennung -------------------------- */
  // Finde in CBLog ein Array, das wie eine Logliste aussieht (lvl/msg/time…)
  function findLikelyLogArray(obj){
    if (!obj || typeof obj !== 'object') return null;
    const candidates = [];
    for (const [k,v] of Object.entries(obj)){
      if (!Array.isArray(v)) continue;
      if (!v.length) { candidates.push({k,v,score:1}); continue; }
      const sample = v[0];
      let score = 0;
      if (sample && typeof sample === 'object'){
        const keys = Object.keys(sample);
        if (keys.some(x=>/lvl|level/i.test(x))) score+=2;
        if (keys.some(x=>/msg|message|text/i.test(x))) score+=2;
        if (keys.some(x=>/ts|time|timestamp/i.test(x))) score+=1;
        if (score>0) candidates.push({k,v,score});
      }
    }
    candidates.sort((a,b)=>b.score-a.score);
    return candidates[0]?.v || null;
  }

  // Lokaler Fallback-Puffer, falls gar keine Quelle existiert
  const LOCAL_TAP = [];

  // Versuche, CBLog-Methoden minimal zu tappen (ohne Verhalten zu ändern)
  function ensureAutoTap(){
    const LVS = ['info','ok','warn','error'];
    const cbl = window.CBLog;
    if (!cbl) return false;
    if (cbl.__inspTapped) return true;
    try{
      LVS.forEach(lv=>{
        const orig = cbl[lv];
        if (typeof orig !== 'function') return;
        cbl[lv] = function(...args){
          try{
            const now = Date.now();
            // Message möglichst „roh“ mitgeben, cleanMsg normalisiert später
            LOCAL_TAP.push({ ts: now, lvl: lv, msg: args.length>1?args:args[0], origin:'CBLog' });
          }catch(_){}
          return orig.apply(this, args);
        };
      });
      cbl.__inspTapped = true;
      return true;
    }catch(_){ return false; }
  }

  /* ------------------------------ Normalisierung ----------------------------- */
  function cleanMsg(raw){
    let txt = '';
    if (Array.isArray(raw)) {
      txt = raw.map(a => (typeof a === 'object' && a !== null) ? JSON.stringify(a) : String(a)).join(' ');
    } else if (typeof raw === 'object' && raw !== null) {
      txt = raw.msg ?? raw.message ?? raw.text ?? JSON.stringify(raw);
    } else {
      txt = String(raw ?? '');
    }
    txt = txt.replace(/^\s*\[?\s*console\s*\]?\s*[:\-]?\s*/i, '');
    return txt.replace(/\s+/g, ' ').trim();
  }

  function normalizeLevel(x){
    const lvl = String(x ?? 'info').toLowerCase();
    return CONFIG.LEVELS.includes(lvl) ? lvl : 'info';
  }

  function originOf(x){
    return x.origin || x.src || x.source || x.module || x.tag || x.channel || '';
  }

  // Aus allen bekannten Orten zusammensammeln (ohne Duplikate grob über msg+ts)
  function harvestLogs(){
    const out = [];

    // 1) Bevorzugte Felder
    const cbl = window.CBLog || {};
    const preferred = cbl.buffer || cbl.history || cbl.store || cbl.entries || null;
    if (Array.isArray(preferred)) out.push(...preferred);

    // 2) Weitere Kandidaten automatisch suchen
    const guess = findLikelyLogArray(cbl);
    if (guess && guess !== preferred) out.push(...guess);

    // 3) Lokaler Tap (seit Einbindung)
    if (LOCAL_TAP.length) out.push(...LOCAL_TAP);

    // 4) cbl.dump() (falls vorhanden)
    if (typeof cbl.dump === 'function'){
      try{
        const d = cbl.dump();
        if (Array.isArray(d)) out.push(...d);
      }catch(_){}
    }

    // Normalisieren + deduplizieren (naiv)
    const mapped = out.map(x=>({
      ts     : x.ts || x.time || Date.now(),
      lvl    : normalizeLevel(x.lvl || x.level),
      msg    : cleanMsg(x.msg ?? x.message ?? x.text ?? x.args ?? ''),
      source : originOf(x)
    }));
    const key = r => `${r.ts}|${r.lvl}|${r.msg}`;
    const seen = new Set();
    const unique = [];
    for (const r of mapped){
      const k = key(r);
      if (seen.has(k)) continue;
      seen.add(k); unique.push(r);
    }
    return unique;
  }

  async function copyText(txt){
    try{
      if (navigator.clipboard && location.protocol === 'https:'){
        await navigator.clipboard.writeText(txt);
      }else{
        const ta = document.createElement('textarea');
        ta.value = txt; ta.style.position='fixed'; ta.style.top='-2000px';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      return true;
    }catch{ return false; }
  }

  /* ------------------------------ UI / Rendering ----------------------------- */
  (window.Inspector||{}).mount?.('logs', (host)=>{
    host.innerHTML = `
      <div class="insp-logs">
        <div class="insp-actions">
          <button class="insp-btn" id="log-copy">Kopieren</button>
          <button class="insp-btn" id="log-export">Export JSON</button>
          <label style="margin-left:8px;display:flex;gap:6px;align-items:center">
            <input type="checkbox" id="log-show-source"${CONFIG.SHOW_SOURCE?' checked':''}>
            <span style="opacity:.85">Quelle</span>
          </label>
          <button class="insp-btn" id="log-refresh" title="Neu laden">Refresh</button>
          <span id="log-hint" style="margin-left:6px;opacity:.8;font-size:.9em"></span>
        </div>

        <div class="insp-filters">
          <label><input type="checkbox" data-f="info"  checked> Info</label>
          <label><input type="checkbox" data-f="warn"  checked> Warnung</label>
          <label><input type="checkbox" data-f="error" checked> Fehler</label>
          <label><input type="checkbox" data-f="ok"    checked> Erfolg</label>
          <span id="log-count" style="margin-left:auto;opacity:.8">Logs gesamt: 0</span>
        </div>

        <div id="logs-list"></div>
      </div>
    `;

    const refs = {
      list  : $('#logs-list', host),
      hint  : $('#log-hint', host),
      count : $('#log-count', host),
      showSource: $('#log-show-source', host)
    };

    // Falls keine Quelle gefunden wird: zukünftige Logs via Auto-Tap mitnehmen
    ensureAutoTap();

    function lineHTML(d){
      const icon = CONFIG.SYMBOLS[d.lvl] || CONFIG.SYMBOLS.info;
      const ts   = new Date(d.ts).toLocaleTimeString([], CONFIG.TIME_FMT);
      const src  = (CONFIG.SHOW_SOURCE && d.source) ? `<span class="src" style="opacity:.7">[${d.source}]</span> ` : '';
      return `
        <div class="insp-logline ${d.lvl}">
          <span class="sym">${icon}</span>
          <span class="ts">[${ts}]</span>
          ${src}<span class="txt"></span>
        </div>`;
    }

    function applyFilters(){
      const on = {};
      $$('.insp-filters input[type="checkbox"]', host).forEach(chk=>{
        on[chk.dataset.f] = chk.checked;
      });
      Array.from(refs.list.children).forEach(row=>{
        const lvl = CONFIG.LEVELS.find(k => row.classList.contains(k)) || 'info';
        row.style.display = on[lvl] ? '' : 'none';
      });
    }

    function render(){
      CONFIG.SHOW_SOURCE = !!refs.showSource?.checked;
      const data = harvestLogs();
      if (!data.length){
        refs.list.innerHTML = `<div class="insp-placeholder">Keine Einträge (CBLog-Quellen leer)</div>`;
        refs.count.textContent = `Logs gesamt: 0`;
        return;
      }
      refs.list.innerHTML = data.map(lineHTML).join('');
      $$('.insp-logline .txt', refs.list).forEach((node, i)=>{
        node.textContent = data[i].msg;
      });
      refs.count.textContent = `Logs gesamt: ${data.length}`;
      applyFilters();
    }

    // Buttons/Events
    $$('.insp-filters input[type="checkbox"]', host).forEach(chk=>{
      chk.addEventListener('change', applyFilters);
    });
    refs.showSource?.addEventListener('change', ()=> render());

    $('#log-refresh', host).addEventListener('click', ()=>{
      render();
      refs.hint.textContent = 'aktualisiert';
      setTimeout(()=> refs.hint.textContent = '', 1200);
    });

    $('#log-copy', host).addEventListener('click', async ()=>{
      const lines = Array.from(refs.list.querySelectorAll('.insp-logline'))
        .filter(el => el.style.display !== 'none')
        .map(el => el.innerText.replace(/\s+/g,' ').trim());
      const ok = await copyText(lines.join('\n'));
      refs.hint.textContent = ok ? `kopiert (${lines.length})` : 'Kopieren fehlgeschlagen';
      window.dispatchEvent(new CustomEvent('cb:insp:export:logs', { detail:{ format:'text', count: lines.length }}));
      setTimeout(()=> refs.hint.textContent = '', 1500);
    });

    $('#log-export', host).addEventListener('click', ()=>{
      const rows = Array.from(refs.list.querySelectorAll('.insp-logline')).map(el=>{
        const lvl = CONFIG.LEVELS.find(k => el.classList.contains(k)) || 'info';
        const ts  = (el.querySelector('.ts')?.textContent||'').replace(/\[|\]/g,'');
        const src = el.querySelector('.src')?.textContent?.replace(/^\[|\]$/g,'') || '';
        const msg = el.querySelector('.txt')?.textContent || '';
        return { ts, lvl, msg: msg.trim(), source: src };
      });
      const blob = new Blob([JSON.stringify({ ts:new Date().toISOString(), count:rows.length, items:rows }, null, 2)], {type:'application/json'});
      const name = `logs_${new Date().toISOString().replace(/[:\.]/g,'-')}.json`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
      refs.hint.textContent = `exportiert (${rows.length})`;
      window.dispatchEvent(new CustomEvent('cb:insp:export:logs', { detail:{ format:'json', count: rows.length }}));
      setTimeout(()=> refs.hint.textContent = '', 1500);
    });

    // Beim Wechsel auf „logs“ neu zeichnen
    window.addEventListener('cb:insp:tab:change', (e)=>{
      if ((e.detail?.tab||'') === 'logs') render();
    });

    // Initial
    render();
    L.ok('bereit v18.15.1');
  });

  /* -------------------------- Komfort-API (Exports) -------------------------- */
  async function exportLogsToClipboardBridge(){
    const host = document.querySelector('#inspector [data-slot="logs-view"]');
    if (!host) return false;
    const text = Array.from(host.querySelectorAll('.insp-logline'))
      .filter(el => el.style.display !== 'none')
      .map(el => el.innerText.replace(/\s+/g,' ').trim())
      .join('\n');
    const ok = await (async()=>{ try{
      if (navigator.clipboard && location.protocol === 'https:'){
        await navigator.clipboard.writeText(text);
      }else{
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position='fixed'; ta.style.top='-2000px';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      return true;
    }catch{ return false; } })();
    window.dispatchEvent(new CustomEvent('cb:insp:export:logs', { detail:{ format:'text', count:(text?text.split('\n').length:0) }}));
    return ok;
  }
  function exportLogsJSONBridge(){
    const host = document.querySelector('#inspector [data-slot="logs-view"]');
    if (!host) return;
    const rows = Array.from(host.querySelectorAll('.insp-logline')).map(el=>{
      const lvl = CONFIG.LEVELS.find(k => el.classList.contains(k)) || 'info';
      const ts  = (el.querySelector('.ts')?.textContent||'').replace(/\[|\]/g,'');
      const src = el.querySelector('.src')?.textContent?.replace(/^\[|\]$/g,'') || '';
      const msg = el.querySelector('.txt')?.textContent || '';
      return { ts, lvl, msg: msg.trim(), source: src };
    });
    const blob = new Blob([JSON.stringify({ ts:new Date().toISOString(), count:rows.length, items:rows }, null, 2)], {type:'application/json'});
    const name = `logs_${new Date().toISOString().replace(/[:\.]/g,'-')}.json`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
    window.dispatchEvent(new CustomEvent('cb:insp:export:logs', { detail:{ format:'json', count: rows.length }}));
  }

  window.UIInspector = Object.assign(window.UIInspector||{}, {
    exportLogsToClipboard: exportLogsToClipboardBridge,
    exportLogsJSON: exportLogsJSONBridge
  });
  window.Inspector = Object.assign(window.Inspector||{}, {
    exportLogsToClipboard: exportLogsToClipboardBridge,
    exportLogsJSON: exportLogsJSONBridge
  });

})();
