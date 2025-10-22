/* ============================================================================
 * Datei   : ui/inspector/inspector.logs.js
 * Zweck   : Logs-Tab mit Filtern + Kopieren + JSON-Export
 * Version : v18.14.7-restore
 * Abh.    : Inspector (Core), optional CBLog.buffer
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.logs]';
  const L = {
    info : (window.CBLog?.info || console.info).bind(console, MOD),
    ok   : (window.CBLog?.ok   || console.log ).bind(console, MOD),
    warn : (window.CBLog?.warn || console.warn).bind(console, MOD),
    err  : (window.CBLog?.error|| console.error).bind(console, MOD)
  };

  // Symbol pro Level
  const SYM = { error:'❌', warn:'⚠️', info:'ℹ', ok:'✅' };
  const KNOWN = ['error','warn','info','ok'];

  // Quelle: CBLog.buffer (falls vorhanden), sonst leer
  function readBuffer(){
    const buf = Array.isArray(window.CBLog?.buffer) ? window.CBLog.buffer : [];
    // Normieren
    return buf.map(x => ({
      ts  : x.ts || x.time || Date.now(),
      lvl : String(x.lvl || x.level || 'info').toLowerCase(),
      msg : (x.msg || x.message || '').toString()
    }));
  }

  // Text-Clipboard
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
    }catch(e){ return false; }
  }

  // UI aufbauen
  (window.Inspector||{}).mount?.('logs', (host)=>{
    host.innerHTML = `
      <div class="insp-logs">
        <div class="insp-actions">
          <button class="insp-btn" id="log-copy">Kopieren</button>
          <button class="insp-btn" id="log-export">Export JSON</button>
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

    const list  = host.querySelector('#logs-list');
    const hint  = host.querySelector('#log-hint');
    const count = host.querySelector('#log-count');

    // Render-Funktion
    function render(){
      const data = readBuffer();
      if (!data.length){
        list.innerHTML = `<div class="insp-placeholder">Keine CBLog-Einträge gefunden. (buffer leer)</div>`;
        count.textContent = `Logs gesamt: 0`;
        return;
      }
      // HTML (sicher einsetzen, msg später als textContent)
      list.innerHTML = data.map(d=>{
        const lvl = KNOWN.includes(d.lvl) ? d.lvl : 'info';
        const icon = SYM[lvl] || SYM.info;
        const ts = new Date(d.ts).toLocaleTimeString();
        return `
          <div class="insp-logline ${lvl}">
            <span class="sym">${icon}</span>
            <span class="ts">[${ts}]</span>
            <span class="txt"></span>
          </div>`;
      }).join('');
      // Text setzten (ohne HTML)
      Array.from(list.querySelectorAll('.insp-logline .txt')).forEach((n,i)=>{
        n.textContent = data[i].msg;
      });
      count.textContent = `Logs gesamt: ${data.length}`;
      applyFilters(); // aktive Filter respektieren
    }

    // Filter anwenden
    function applyFilters(){
      const on = {};
      host.querySelectorAll('.insp-filters input[type="checkbox"]').forEach(chk=>{
        on[chk.dataset.f] = chk.checked;
      });
      Array.from(list.children).forEach(row=>{
        const lvl = KNOWN.find(k => row.classList.contains(k)) || 'info';
        row.style.display = on[lvl] ? '' : 'none';
      });
    }

    // --- Events/Buttons ---
    host.querySelectorAll('.insp-filters input[type="checkbox"]').forEach(chk=>{
      chk.addEventListener('change', applyFilters);
    });

    host.querySelector('#log-refresh').addEventListener('click', ()=>{
      render();
      hint.textContent = 'aktualisiert';
      setTimeout(()=> hint.textContent = '', 1200);
    });

    host.querySelector('#log-copy').addEventListener('click', async ()=>{
      // nur sichtbare Zeilen kopieren (Filter!)
      const lines = Array.from(list.querySelectorAll('.insp-logline'))
        .filter(el => el.style.display !== 'none')
        .map(el => el.innerText.replace(/\s+/g,' ').trim());
      const ok = await copyText(lines.join('\n'));
      hint.textContent = ok ? `kopiert (${lines.length})` : 'Kopieren fehlgeschlagen';
      window.dispatchEvent(new CustomEvent('cb:insp:export:logs', { detail:{ format:'text', count: lines.length }}));
      setTimeout(()=> hint.textContent = '', 1500);
    });

    host.querySelector('#log-export').addEventListener('click', ()=>{
      const rows = Array.from(list.querySelectorAll('.insp-logline')).map(el=>{
        const lvl = KNOWN.find(k => el.classList.contains(k)) || 'info';
        const ts  = (el.querySelector('.ts')?.textContent||'').replace(/\[|\]/g,'');
        const msg = el.querySelector('.txt')?.textContent || '';
        return { ts, lvl, msg: msg.trim() };
      });
      const blob = new Blob([JSON.stringify({ ts:new Date().toISOString(), count:rows.length, items:rows }, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `logs_${new Date().toISOString().replace(/[:\.]/g,'-')}.json`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
      hint.textContent = `exportiert (${rows.length})`;
      window.dispatchEvent(new CustomEvent('cb:insp:export:logs', { detail:{ format:'json', count: rows.length }}));
      setTimeout(()=> hint.textContent = '', 1500);
    });

    // Auto-Render: beim Öffnen des Logs-Tabs
    window.addEventListener('cb:insp:tab:change', (e)=>{
      if ((e.detail?.tab||'') === 'logs') render();
    });

    // Initial
    render();
    L.ok('bereit v18.14.7-restore');
  });

})();
