/* ============================================================================
 * Datei   : ui/inspector.js
 * Projekt : Neue Siedler
 * Version : v1.0.9-monolith (Restore)
 * Zweck   : Vollbild-Inspector (Logs | Tests | Ressourcen | Pfade | Editor)
 * Hinweise: - Öffnet NICHT automatisch, nur per Button (unten rechts) oder Ctrl/Cmd+I
 *           - Export/Kopieren integriert
 *           - Keine externen Teil-Module nötig
 * ============================================================================ */

(function(){
  const MOD = 'inspector';
  const EB  = window.EventBus || {
    emit:(n,p)=>window.dispatchEvent(new CustomEvent(n,{detail:p}))
  };
  const logOK   = (m)=> (window.CBLog?.ok   || console.log)(`[${MOD}] ${m}`);
  const logWarn = (m)=> (window.CBLog?.warn || console.warn)(`[${MOD}] ${m}`);
  const esc = (s)=> String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const STATE = {
    open:false,
    active:'logs',
    logs:[],
    filters:{ ok:1, info:1, warn:1, error:1 }
  };

  let $root, $content, $tabs, $btn;

  // -------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------
  function ensureButton(){
    let b = document.getElementById('btn-inspector');
    if (!b){
      b = document.createElement('button');
      b.id = 'btn-inspector';
      b.className = 'cb-fab cb-fab-inspector';
      b.title = 'Inspector';
      b.setAttribute('aria-label','Inspector öffnen');
      b.textContent = '🛠️';
      document.body.appendChild(b);
    }
    b.hidden = false;
    b.addEventListener('click', toggle);
    return b;
  }

  function buildOverlay(){
    $root = document.getElementById('inspector-overlay');
    if (!$root){
      $root = document.createElement('div');
      $root.id = 'inspector-overlay';
      document.body.appendChild($root);
    }
    $root.innerHTML = `
      <div class="insp-frame" role="dialog" aria-modal="true" aria-label="Inspector">
        <div class="insp-header">
          <div class="insp-tabs" id="insp-tabs" role="tablist" tabindex="0">
            ${tab('logs','Logs')}
            ${tab('tests','Tests')}
            ${tab('res','Ressourcen')}
            ${tab('paths','Pfade')}
            ${tab('editor','Editor')}
          </div>
          <button class="insp-close" id="insp-close" aria-label="Inspector schließen">✕</button>
        </div>
        <div class="insp-content" id="insp-content"></div>
      </div>
    `;
    $content = $root.querySelector('#insp-content');
    $tabs    = $root.querySelector('#insp-tabs');

    $root.querySelector('#insp-close').addEventListener('click', close);
    // optional: Klick außerhalb schließt — bei Bedarf einkommentieren
    // $root.addEventListener('click', (e)=>{ if (e.target === $root) close(); });

    $tabs.addEventListener('click', (e)=>{
      const t = e.target.closest('.insp-tab');
      if (t) switchTab(t.dataset.tab);
    });

    switchTab(STATE.active);
  }

  function tab(id, label){
    return `<div class="insp-tab" data-tab="${id}" role="tab">${label}</div>`;
  }

  // -------------------------------------------------------------
  // Öffnen/Schließen/Toggle
  // -------------------------------------------------------------
  function toggle(){ STATE.open ? close() : open(); }

  function open(){
    if (STATE.open) return;
    STATE.open = true;
    $root.classList.add('open');
    if ($btn) $btn.hidden = true;
    EB.emit('cb:insp:open',{tab:STATE.active});
    // Sicherheit: aktiven Tab neu zeichnen
    switchTab(STATE.active);
  }

  function close(){
    if (!STATE.open) return;
    STATE.open = false;
    $root.classList.remove('open');
    if ($btn) $btn.hidden = false;
    EB.emit('cb:insp:close',{});
  }

  // Tastatur: Ctrl/Cmd + I
  window.addEventListener('keydown', (e)=>{
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i'){
      e.preventDefault();
      toggle();
    }
  });

  // -------------------------------------------------------------
  // Tabs
  // -------------------------------------------------------------
  function switchTab(id){
    STATE.active = id;
    // Tab-Köpfe aktualisieren
    $tabs.querySelectorAll('.insp-tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===id));
    // Inhalt rendern
    $content.innerHTML = '';
    if (id === 'logs') renderLogs();
    else if (id === 'tests')   $content.innerHTML = `<div class="insp-placeholder">Tests-Tab</div>`;
    else if (id === 'res')     $content.innerHTML = `<div class="insp-placeholder">Ressourcen-Tab</div>`;
    else if (id === 'paths')   $content.innerHTML = `<div class="insp-placeholder">Pfade-Tab</div>`;
    else if (id === 'editor')  $content.innerHTML = `<div class="insp-placeholder">Editor-Tab</div>`;
    EB.emit('cb:insp:tab:change', { tab:id });
  }

  // -------------------------------------------------------------
  // Logs (Hook + UI)
  // -------------------------------------------------------------
  function hookLogs(){
    const sink = (type, args)=>{
      const text = args.map(a => typeof a==='string' ? a : safeJson(a)).join(' ');
      // normalisieren (console.log => info)
      const t = (type==='log'?'info':type);
      STATE.logs.push({ tms: Date.now(), type:t, text });
      if (STATE.active==='logs') appendLine({ tms: Date.now(), type:t, text });
    };

    // sanfter Wrap – spiegelt nur
    ['log','info','warn','error'].forEach(k=>{
      const orig = console[k].bind(console);
      console[k] = (...a)=>{ sink(k, a); return orig(...a); };
    });

    // globale Fehler
    window.addEventListener('error', (e)=>{
      sink('error', [`Uncaught: ${e.message} @ ${e.filename}:${e.lineno}`]);
    });
    window.addEventListener('unhandledrejection', (e)=>{
      const msg = e?.reason?.message || String(e.reason || e);
      sink('error', [`Promise: ${msg}`]);
    });
  }

  function renderLogs(){
    $content.innerHTML = `
      <div class="insp-logs">
        <div class="insp-filters">
          ${filter('ok','Erfolg')}
          ${filter('info','Info')}
          ${filter('warn','Warnung')}
          ${filter('error','Fehler')}
        </div>
        <div class="insp-actions">
          <button class="insp-btn" id="logs-copy">Kopieren</button>
          <button class="insp-btn" id="logs-export">Export JSON</button>
          <span id="logs-count" style="margin-left:auto;opacity:.75"></span>
        </div>
        <div id="logs-list"></div>
      </div>
    `;

    $content.querySelector('#logs-copy').addEventListener('click', copyLogs);
    $content.querySelector('#logs-export').addEventListener('click', exportLogs);
    $content.querySelectorAll('.insp-filters input[type=checkbox]').forEach(cb=>{
      cb.checked = !!STATE.filters[cb.value];
      cb.addEventListener('change', ()=>{
        STATE.filters[cb.value] = cb.checked ? 1 : 0;
        redrawLogs();
      });
    });

    redrawLogs();
  }

  function filter(k, label){
    return `<label><input type="checkbox" value="${k}" checked> ${label}</label>`;
  }

  function redrawLogs(){
    const list = document.getElementById('logs-list');
    list.innerHTML = '';
    for (const e of STATE.logs){
      if (!STATE.filters[e.type]) continue;
      appendLine(e);
    }
    updateCount();
  }

  function appendLine(e){
    const list = document.getElementById('logs-list');
    if (!list || !STATE.filters[e.type]) return;
    const el = document.createElement('div');
    el.className = `insp-logline ${e.type}`;
    const ts = new Date(e.tms).toLocaleTimeString();
    el.innerHTML = `
      <span class="sym">${symbol(e.type)}</span>
      <span class="ts">${ts}</span>
      <span class="msg">${esc(e.text)}</span>`;
    list.appendChild(el);
    updateCount();
  }

  function updateCount(){
    const c = document.getElementById('logs-count');
    if (c) c.textContent = `Logs gesamt: ${STATE.logs.length}`;
  }

  function copyLogs(){
    const txt = STATE.logs.map(e => `[${e.type}] ${e.text}`).join('\n');
    navigator.clipboard?.writeText(txt);
    EB.emit('cb:insp:export:logs', { format:'text', count:STATE.logs.length });
  }

  function exportLogs(){
    const blob = new Blob([JSON.stringify(STATE.logs, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'logs.json';
    a.click();
    EB.emit('cb:insp:export:json', { kind:'logs', count:STATE.logs.length });
  }

  function symbol(t){ return t==='warn'?'⚠' : t==='error'?'❌' : t==='ok'?'✅' : 'ℹ'; }
  function safeJson(v){ try { return JSON.stringify(v); } catch(_){ return String(v); } }

  // -------------------------------------------------------------
  // Init on DOM ready
  // -------------------------------------------------------------
  function init(){
    $btn = ensureButton();
    buildOverlay();
    hookLogs();
    logOK('bereit (v1.0.9-monolith)');
  }

  if (document.readyState==='complete' || document.readyState==='interactive'){
    setTimeout(init, 0);
  } else {
    window.addEventListener('DOMContentLoaded', init, { once:true });
  }
})();
