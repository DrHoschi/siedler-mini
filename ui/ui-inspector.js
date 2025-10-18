/* ============================================================================
 * Datei   : ui/inspector.js
 * Projekt : Neue Siedler
 * Version : v1.0.11-monolith (final)
 * Zweck   : Vollbild-Inspector (Logs | Tests | Ressourcen | Pfade | Editor)
 * Highlights:
 *   - EARLY LOG HOOK: spiegelt Logs ab 0ms in einen Buffer (kein Verlust)
 *   - Overlay standardmäßig geschlossen; optionales Auto-Open
 *   - Button toggelt (öffnen/schließen), iOS/HTTPS-Fallbacks für Copy/Export
 *   - Schutz gegen doppelte Inits
 * ============================================================================ */

(function(){
  if (window.__InspectorInstalled) return;
  window.__InspectorInstalled = true;

  const MOD = 'inspector';
  const EB  = window.EventBus || {
    emit:(n,p)=>window.dispatchEvent(new CustomEvent(n,{detail:p}))
  };
  const logOK   = (m)=> (window.CBLog?.ok   || console.log)(`[${MOD}] ${m}`);
  const esc = (s)=> String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const QS = new URLSearchParams(location.search);
  const CFG = Object.assign({ autoOpen: QS.get('insp') === 'open' }, (window.InspectorConfig || {}));

  // --- EARLY LOG HOOK (vor DOM) ------------------------------------------------
  if (!window.__InspectorHooked) {
    window.__InspectorHooked = true;
    const sinkEarly = (type, args)=>{
      try{
        const t = (type==='log' ? 'info' : type);
        const text = (args||[]).map(a => typeof a==='string' ? a : safeJson(a)).join(' ');
        (window.__InspectorBuffer = window.__InspectorBuffer || []).push({ tms:Date.now(), type:t, text });
      }catch(_){}
    };
    ['log','info','warn','error'].forEach(k=>{
      const orig = console[k]?.bind(console) || function(){};
      console[k] = (...a)=>{ sinkEarly(k,a); return orig(...a); };
    });
    addEventListener('error', (e)=>{ sinkEarly('error', [`Uncaught: ${e.message} @ ${e.filename}:${e.lineno}`]); });
    addEventListener('unhandledrejection', (e)=>{
      const msg = e?.reason?.message || String(e.reason || e);
      sinkEarly('error', [`Promise: ${msg}`]);
    });
  }

  // --- State & DOM-Refs --------------------------------------------------------
  const STATE = { open:false, active:'logs', logs:[], filters:{ ok:1, info:1, warn:1, error:1 } };
  let $root, $content, $tabs, $btn;

  // --- Setup -------------------------------------------------------------------
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
    b.hidden = false;         // Button soll nie "verschwinden"
    b.onclick = toggle;       // Toggle (öffnen/schließen)
    return b;
  }

  function buildOverlay(){
    $root = document.getElementById('inspector-overlay');
    if (!$root){
      $root = document.createElement('div');
      $root.id = 'inspector-overlay';
      document.body.appendChild($root);
    }
    // Nie automatisch offen starten:
    $root.classList.remove('open');
    $root.style.display = 'none';

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
      </div>`;
    $content = $root.querySelector('#insp-content');
    $tabs    = $root.querySelector('#insp-tabs');

    // Close (X)
    $root.querySelector('#insp-close').addEventListener('click', close);
    // Tabs
    $tabs.addEventListener('click', (e)=>{
      const t = e.target.closest('.insp-tab');
      if (t) switchTab(t.dataset.tab);
    });

    switchTab(STATE.active);
  }

  function tab(id,label){ return `<div class="insp-tab" data-tab="${id}" role="tab">${label}</div>`; }

  // Tastatur: Ctrl/Cmd + I → Toggle
  addEventListener('keydown', (e)=>{
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i'){
      e.preventDefault(); toggle();
    }
  });

  // --- Toggle / Open / Close ---------------------------------------------------
  function toggle(){ STATE.open ? close() : open(); }
  function open(){
    if (STATE.open) return;
    STATE.open = true;
    $root.classList.add('open');
    $root.style.display = 'block';
    // Sicht aktualisieren
    switchTab(STATE.active);
    EB.emit('cb:insp:open',{tab:STATE.active});
  }
  function close(){
    if (!STATE.open) return;
    STATE.open = false;
    $root.classList.remove('open');
    $root.style.display = 'none';
    EB.emit('cb:insp:close',{});
  }

  // --- Tabs --------------------------------------------------------------------
  function switchTab(id){
    STATE.active = id;
    $tabs.querySelectorAll('.insp-tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===id));
    $content.innerHTML = '';
    if      (id==='logs')   renderLogs();
    else if (id==='tests')  $content.innerHTML = `<div class="insp-placeholder">Tests-Tab</div>`;
    else if (id==='res')    $content.innerHTML = `<div class="insp-placeholder">Ressourcen-Tab</div>`;
    else if (id==='paths')  $content.innerHTML = `<div class="insp-placeholder">Pfade-Tab</div>`;
    else if (id==='editor') $content.innerHTML = `<div class="insp-placeholder">Editor-Tab</div>`;
    EB.emit('cb:insp:tab:change', { tab:id });
  }

  // --- Logs (Hook + Render) ----------------------------------------------------
  function hookLogs(){
    const sink = (type, args)=>{
      const text = (args||[]).map(a => typeof a==='string' ? a : safeJson(a)).join(' ');
      const t = (type==='log' ? 'info' : type);
      const entry = { tms: Date.now(), type:t, text };
      STATE.logs.push(entry);
      if (STATE.active==='logs') appendLine(entry);
    };

    // sanfter Wrap – spiegelt nur
    ['log','info','warn','error'].forEach(k=>{
      const orig = console[k].bind(console);
      console[k] = (...a)=>{ sink(k, a); return orig(...a); };
    });

    // globale Fehler
    addEventListener('error', (e)=>{
      sink('error', [`Uncaught: ${e.message} @ ${e.filename}:${e.lineno}`]);
    });
    addEventListener('unhandledrejection', (e)=>{
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
      </div>`;
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

  function filter(k,label){ return `<label><input type="checkbox" value="${k}" checked> ${label}</label>`; }

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

  // --- Kopieren/Export (mit Fallbacks) ----------------------------------------
  function copyLogs(){
    const txt = STATE.logs.map(e => `[${e.type}] ${e.text}`).join('\n');
    if (navigator.clipboard && window.isSecureContext){
      navigator.clipboard.writeText(txt).catch(()=> fallbackCopy(txt));
    } else {
      fallbackCopy(txt);
    }
    EB.emit('cb:insp:export:logs', { format:'text', count:STATE.logs.length });
  }
  function fallbackCopy(text){
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position='fixed'; ta.style.top='-1000px';
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); }catch(_){}
    ta.remove();
  }
  function exportLogs(){
    const json = JSON.stringify(STATE.logs, null, 2);
    const blob = new Blob([json], { type:'application/json' });
    try{
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'logs.json'; a.click();
      setTimeout(()=> URL.revokeObjectURL(url), 2000);
    }catch(_){
      const a = document.createElement('a');
      a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
      a.download = 'logs.json'; a.click();
    }
    EB.emit('cb:insp:export:json', { kind:'logs', count:STATE.logs.length });
  }

  function symbol(t){ return t==='warn'?'⚠' : t==='error'?'❌' : t==='ok'?'✅' : 'ℹ'; }
  function safeJson(v){ try { return JSON.stringify(v); } catch(_){ return String(v); } }

  // --- Init on DOM ready -------------------------------------------------------
  function init(){
    $btn = ensureButton();
    buildOverlay();
    hookLogs();

    // Puffer-Logs aus dem Early Hook übernehmen
    if (window.__InspectorBuffer?.length){
      for (const e of window.__InspectorBuffer) STATE.logs.push(e);
      window.__InspectorBuffer.length = 0;
      if (STATE.active==='logs') switchTab('logs'); // UI neu ziehen
    }

    // Optional: Auto-Open
    if (CFG.autoOpen) open();

    logOK('bereit (v1.0.11-monolith)');
  }

  if (document.readyState==='complete' || document.readyState==='interactive'){
    setTimeout(init, 0);
  } else {
    addEventListener('DOMContentLoaded', init, { once:true });
  }
})();
