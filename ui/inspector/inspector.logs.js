/* ============================================================================
 * Datei   : ui/inspector/inspector.logs.js
 * Projekt : Neue Siedler – Inspector (Logs-Tab)
 * Version : v18.15.0 (final restore)
 * Zweck   : Logs-Panel mit:
 *           - 4 Filtern (Info/Warnung/Fehler/Erfolg)
 *           - Kopieren in Zwischenablage (nur sichtbare Zeilen)
 *           - Export als JSON
 *           - Optionaler „Ursprung/Quelle“-Prefix je Logzeile
 *           - Kompakte Zeitstempel
 *
 * Abh.    : window.Inspector (Core), optional window.CBLog.buffer
 * Events  : cb:insp:tab:change (zum Re-Render)
 *           cb:insp:export:logs (bei Copy/JSON)
 * API     : UIInspector.exportLogsToClipboard() / exportLogsJSON()
 *           (plus rückwärtskompatibel Inspector.exportLogsToClipboard/JSON)
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.logs]';

  /* ------------------------------ Konfiguration ------------------------------ */
  const CONFIG = {
    SHOW_SOURCE: false,               // Ursprung/Quelle standardmäßig ausblenden
    TIME_FMT: { hour:'2-digit', minute:'2-digit', second:'2-digit' }, // kompakt
    SYMBOLS: { error:'❌', warn:'⚠️', info:'ℹ', ok:'✅' },             // Symbole
    LEVELS:  ['info','warn','error','ok']                              // Reihenfolge
  };

  /* ------------------------------ Hilfsfunktionen ---------------------------- */
  const L = {
    info : (window.CBLog?.info || console.info).bind(console, MOD),
    ok   : (window.CBLog?.ok   || console.log ).bind(console, MOD),
    warn : (window.CBLog?.warn || console.warn).bind(console, MOD),
    err  : (window.CBLog?.error|| console.error).bind(console, MOD)
  };

  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function cleanMsg(raw){
    // 1) in String überführen (console.* kann mehrere args haben)
    let txt = '';
    if (Array.isArray(raw)) {
      txt = raw.map(a => (typeof a === 'object' && a !== null) ? JSON.stringify(a) : String(a)).join(' ');
    } else if (typeof raw === 'object' && raw !== null) {
      txt = raw.msg ?? raw.message ?? raw.text ?? JSON.stringify(raw);
    } else {
      txt = String(raw ?? '');
    }
    // 2) führendes "console" / "[console]" entfernen
    txt = txt.replace(/^\s*\[?\s*console\s*\]?\s*[:\-]?\s*/i, '');
    // 3) Whitespace säubern
    return txt.replace(/\s+/g,' ').trim();
  }

  function normalizeLevel(x){
    const lvl = String(x ?? 'info').toLowerCase();
    return CONFIG.LEVELS.includes(lvl) ? lvl : 'info';
  }

  function originOf(x){
    // Versuch, die Quelle/Ursprung zu ermitteln (verschiedene Felder abdecken)
    return x.origin || x.src || x.source || x.module || x.tag || x.channel || '';
  }

  // Datenquelle: CBLog.buffer (falls vorhanden)
  function readBuffer(){
    const buf = Array.isArray(window.CBLog?.buffer) ? window.CBLog.buffer : [];
    return buf.map(x => ({
      ts     : x.ts || x.time || Date.now(),
      lvl    : normalizeLevel(x.lvl || x.level),
      msg    : cleanMsg(x.msg ?? x.message ?? x.text ?? x.args ?? ''),
      source : originOf(x)
    }));
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
    // Grundlayout
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

    function lineHTML(d){
      const icon = CONFIG.SYMBOLS[d.lvl] || CONFIG.SYMBOLS.info;
      const ts   = new Date(d.ts).toLocaleTimeString([], CONFIG.TIME_FMT);
      const src  = (CONFIG.SHOW_SOURCE && d.source) ? `<span class="src" style="opacity:.7">[${d.source}]</span> ` : '';
      // Text wird nachträglich über textContent gesetzt (keine HTML-Injektion)
      return `
        <div class="insp-logline ${d.lvl}">
          <span class="sym">${icon}</span>
          <span class="ts">[${ts}]</span>
          ${src}<span class="txt"></span>
        </div>`;
    }

    // Render-Funktion
    function render(){
      // Setting übernehmen (falls Nutzer „Quelle“ toggelt)
      CONFIG.SHOW_SOURCE = !!refs.showSource?.checked;

      const data = readBuffer();
      if (!data.length){
        refs.list.innerHTML = `<div class="insp-placeholder">Keine CBLog-Einträge gefunden (buffer leer)</div>`;
        refs.count.textContent = `Logs gesamt: 0`;
        return;
      }

      refs.list.innerHTML = data.map(lineHTML).join('');
      // sichere Text-Setzung
      $$('.insp-logline .txt', refs.list).forEach((node, i)=>{
        node.textContent = data[i].msg;
      });

      refs.count.textContent = `Logs gesamt: ${data.length}`;
      applyFilters();
    }

    // Filter anwenden (zeigt/verbirgt Zeilen)
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

    // Sichtbaren Text extrahieren (für „Kopieren“)
    function visibleLinesText(){
      return Array.from(refs.list.querySelectorAll('.insp-logline'))
        .filter(el => el.style.display !== 'none')
        .map(el => el.innerText.replace(/\s+/g,' ').trim())
        .join('\n');
    }

    // Vollständige JSON-Daten extrahieren
    function exportRows(){
      return Array.from(refs.list.querySelectorAll('.insp-logline')).map(el=>{
        const lvl = CONFIG.LEVELS.find(k => el.classList.contains(k)) || 'info';
        const ts  = (el.querySelector('.ts')?.textContent||'').replace(/\[|\]/g,'');
        const src = el.querySelector('.src')?.textContent?.replace(/^\[|\]$/g,'') || '';
        const msg = el.querySelector('.txt')?.textContent || '';
        return { ts, lvl, msg: msg.trim(), source: src };
      });
    }

    /* ------------------------------ Buttons/Events --------------------------- */
    // Filter
    $$('.insp-filters input[type="checkbox"]', host).forEach(chk=>{
      chk.addEventListener('change', applyFilters);
    });

    // Quelle anzeigen/ausblenden
    refs.showSource?.addEventListener('change', ()=> render());

    // Refresh
    $('#log-refresh', host).addEventListener('click', ()=>{
      render();
      refs.hint.textContent = 'aktualisiert';
      setTimeout(()=> refs.hint.textContent = '', 1200);
    });

    // Kopieren
    $('#log-copy', host).addEventListener('click', async ()=>{
      const text = visibleLinesText();
      const ok = await copyText(text);
      refs.hint.textContent = ok ? `kopiert (${text ? text.split('\n').length : 0})` : 'Kopieren fehlgeschlagen';
      window.dispatchEvent(new CustomEvent('cb:insp:export:logs', { detail:{ format:'text', count:(text?text.split('\n').length:0) }}));
      setTimeout(()=> refs.hint.textContent = '', 1500);
    });

    // Export JSON
    $('#log-export', host).addEventListener('click', ()=>{
      const rows = exportRows();
      const blob = new Blob([JSON.stringify({ ts:new Date().toISOString(), count:rows.length, items:rows }, null, 2)], {type:'application/json'});
      const name = `logs_${new Date().toISOString().replace(/[:\.]/g,'-')}.json`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
      refs.hint.textContent = `exportiert (${rows.length})`;
      window.dispatchEvent(new CustomEvent('cb:insp:export:logs', { detail:{ format:'json', count: rows.length }}));
      setTimeout(()=> refs.hint.textContent = '', 1500);
    });

    // Beim Tab-Wechsel auf „logs“ automatisch (re-)rendern
    window.addEventListener('cb:insp:tab:change', (e)=>{
      if ((e.detail?.tab||'') === 'logs') render();
    });

    // Initial
    render();
    L.ok('bereit v18.15.0');
  });

  /* -------------------------- Komfort-API (Exports) -------------------------- */
  // Damit deine alten Buttons/Shortcuts weiterhin funktionieren.
  async function exportLogsToClipboardBridge(){
    const host = document.querySelector('#inspector [data-slot="logs-view"]');
    if (!host) return false;
    // nutzt die sichtbaren Zeilen im DOM (Filter respektiert)
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

  // neue & alte Bezeichner bereitstellen (kein neues File nötig)
  window.UIInspector = Object.assign(window.UIInspector||{}, {
    exportLogsToClipboard: exportLogsToClipboardBridge,
    exportLogsJSON: exportLogsJSONBridge
  });
  window.Inspector = Object.assign(window.Inspector||{}, {
    exportLogsToClipboard: exportLogsToClipboardBridge,
    exportLogsJSON: exportLogsJSONBridge
  });

})();
