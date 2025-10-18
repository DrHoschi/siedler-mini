/* 
========================================
  Datei   : ui/ui-inspector.js
  Projekt : Neue Siedler
  Version : v1.1.4 (final fix)
  Zweck   : Vollbild-Inspector (Logs/Tests/Ressourcen/Pfade/Editor)
  Events  : cb:insp:ready | cb:insp:open | cb:insp:close | cb:insp:tab:change
            cb:insp:export:logs | cb:insp:export:json
  Hinweis : Öffnet NICHT automatisch – nur Button oder Ctrl/Cmd+I.
========================================
*/

(function(){
  if (window.UIInspector && window.UIInspector.__installed) return;

  const MOD = 'ui-inspector';
  const EB = window.EventBus || {
    emit: (n,p)=>window.dispatchEvent(new CustomEvent(n,{detail:p})),
    on  : (n,fn)=>window.addEventListener(n, (e)=>fn(e.detail)),
    off : (n,fn)=>window.removeEventListener(n,fn)
  };
  const Log = window.CBLog || console;

  const STATE = {
    open: false,
    activeTab: 'logs',
    filters: { ok:true, info:true, warn:true, error:true },
    logs: []
  };

  const EL = { root:null, frame:null, tabs:null, content:null, btn:null };

  function install(){
    EL.btn = ensureButton();
    EL.btn.addEventListener('click', toggle);

    buildOverlay();
    hookLogs();

    window.addEventListener('resize', ensureCloseInView, { passive:true });
    window.addEventListener('keydown', onKeyToggle);

    EB.emit('cb:insp:ready', { ok:true });
    (window.CBLog?.ok || console.log)(`[${MOD}] Modul geladen (v${version()})`);
  }

  function version(){ return '1.1.4'; }

  // ---------- Button (immer vorhanden, nie automatisch verstecken) -----
  function ensureButton(){
    let btn = document.getElementById('btn-inspector');
    if (!btn){
      btn = document.createElement('button');
      btn.id = 'btn-inspector';
      btn.className = 'cb-fab cb-fab-inspector';
      btn.setAttribute('aria-label','Inspector öffnen');
      btn.title = 'Inspector';
      btn.textContent = '🛠️';
      document.body.appendChild(btn);
    }
    btn.hidden = false;
    return btn;
  }

  // ---------- Overlay & Struktur ---------------------------------------
  function buildOverlay(){
    EL.root = document.getElementById('inspector-overlay') || (()=> {
      const d = document.createElement('div');
      d.id = 'inspector-overlay';
      document.body.appendChild(d);
      return d;
    })();

    EL.root.innerHTML = '';
    EL.root.appendChild(html(`
      <div class="insp-frame" role="dialog" aria-modal="true" aria-label="Inspector" style="display:none">
        <div class="insp-header">
          <div class="insp-tabs" id="insp-tabs" tabindex="0" role="tablist">
            ${tabBtn('logs','Logs')}
            ${tabBtn('tests','Tests')}
            ${tabBtn('res','Ressourcen')}
            ${tabBtn('paths','Pfade')}
            ${tabBtn('editor','Editor')}
          </div>
          <button class="insp-close" id="insp-close" aria-label="Inspector schließen">✕</button>
        </div>
        <div class="insp-content" id="insp-content"></div>
      </div>
    `));

    EL.frame   = EL.root.querySelector('.insp-frame');
    EL.tabs    = EL.root.querySelector('#insp-tabs');
    EL.content = EL.root.querySelector('#insp-content');

    EL.root.querySelector('#insp-close').addEventListener('click', close);
    // EL.root.addEventListener('click',(e)=>{ if(e.target===EL.root) close(); }); // optional

    EL.tabs.addEventListener('click', (e)=>{
      const t = e.target.closest('.insp-tab');
      if (t) switchTab(t.dataset.tab);
    });

    switchTab(STATE.activeTab);
    ensureCloseInView();
  }

  // ---------- Open / Close / Toggle ------------------------------------
  function open(){
    if (STATE.open) return;
    STATE.open = true;

    if (EL.btn) EL.btn.hidden = true;        // Button ausblenden, solange offen
    EL.root.classList.add('open');           // falls CSS .open nutzt
    EL.frame.style.display = 'grid';         // zusätzlich harte Sichtbarkeit

    window.dispatchEvent(new CustomEvent('cb:insp:open'));
    // WICHTIG: KEIN safeRender – direkt Tab zeichnen:
    try { switchTab(STATE.activeTab); } catch(e) { (window.CBLog?.err||console.error)(e); }
  }

  function close(){
    if (!STATE.open) return;
    STATE.open = false;

    if (EL.btn) EL.btn.hidden = false;
    EL.frame.style.display = 'none';
    EL.root.classList.remove('open');

    window.dispatchEvent(new CustomEvent('cb:insp:close'));
  }

  function toggle(){ STATE.open ? close() : open(); }

  function onKeyToggle(e){
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i'){
      e.preventDefault(); toggle();
    }
  }

  // ---------- Tabs ------------------------------------------------------
  function switchTab(id){
    STATE.activeTab = id;
    EL.tabs.querySelectorAll('.insp-tab')
      .forEach(t => t.classList.toggle('active', t.dataset.tab === id));

    if      (id === 'logs')   renderLogsTab(EL.content);
    else if (id === 'tests')  renderTestsTab(EL.content);
    else if (id === 'res')    renderResTab(EL.content);
    else if (id === 'paths')  renderPathsTab(EL.content);
    else if (id === 'editor') renderEditorTab(EL.content);

    EB.emit('cb:insp:tab:change', { tab:id });
  }

  function tabBtn(id,label){
    const active = (STATE.activeTab === id) ? ' active' : '';
    return `<div class="insp-tab${active}" data-tab="${id}" role="tab">${label}</div>`;
  }

  function ensureCloseInView(){
    if (EL.content) EL.content.style.scrollMarginTop = '16px';
  }

  // ---------- Logs (Hook & Render) -------------------------------------
  function hookLogs(){
    try {
      const sink = (type, args) => {
        const entry = normalizeLog(type, args);
        STATE.logs.push(entry);
        if (STATE.activeTab === 'logs') appendLogLine(entry);
      };

      if (window.CBLog){
        ['ok','info','warn','error'].forEach(type=>{
          const orig = window.CBLog[type]?.bind(window.CBLog) || console[type]?.bind(console);
          window.CBLog[type] = (...args)=>{ sink(type, args); return orig?.(...args); };
        });
      } else {
        ['log','info','warn','error'].forEach(type=>{
          const orig = console[type].bind(console);
          console[type] = (...args)=>{ sink(mapConsoleType(type), args); return orig(...args); };
        });
      }

      window.addEventListener('error', (e)=>{
        sink('error', [`Uncaught: ${e.message} @ ${e.filename}:${e.lineno}`]);
      });
      window.addEventListener('unhandledrejection', (e)=>{
        const msg = e?.reason?.message || String(e.reason || e);
        sink('error', [`Promise: ${msg}`]);
      });

    } catch(e){
      console.warn('[ui-inspector] Log-Hook fehlgeschlagen:', e);
    }
  }

  function mapConsoleType(t){ return t==='log' ? 'info' : (t||'info'); }
  function normalizeLog(type, args){
    const text = (args||[]).map(a => typeof a==='string' ? a : safeJson(a)).join(' ');
    const sym  = type==='ok'?'✅' : type==='warn'?'⚠' : type==='error'?'❌' : 'ℹ';
    const cls  = type==='ok'?'ok'  : type;
    return { t: Date.now(), type:cls, sym, text };
  }

  function renderLogsTab(host){
    host.innerHTML = `
      <div class="insp-logs">
        <div class="insp-filters">
          ${filterBox('ok','Erfolg')}
          ${filterBox('info','Info')}
          ${filterBox('warn','Warnung')}
          ${filterBox('error','Fehler')}
        </div>
        <div class="insp-actions">
          <button class="insp-btn" id="logs-copy">Kopieren</button>
          <button class="insp-btn" id="logs-export">Export JSON</button>
          <span id="logs-count" style="margin-left:auto;opacity:.75"></span>
        </div>
        <div id="logs-list"></div>
      </div>
    `;
    host.querySelector('#logs-copy').addEventListener('click', copyLogs);
    host.querySelector('#logs-export').addEventListener('click', exportLogs);
    host.querySelectorAll('.insp-filters input[type=checkbox]').forEach(cb=>{
      cb.checked = !!STATE.filters[cb.value];
      cb.addEventListener('change', ()=>{
        STATE.filters[cb.value] = cb.checked;
        redrawLogs();
      });
    });
    redrawLogs();
  }

  function filterBox(key,label){
    return `<label><input type="checkbox" value="${key}" checked> ${label}</label>`;
  }

  function redrawLogs(){
    const list = document.getElementById('logs-list');
    if (!list) return;
    list.innerHTML = '';
    for (const entry of STATE.logs){
      if (!STATE.filters[entry.type]) continue;
      appendLogLine(entry);
    }
    updateCount();
  }

  function appendLogLine(entry){
    const list = document.getElementById('logs-list');
    if (!list || !STATE.filters[entry.type]) return;
    const el = document.createElement('div');
    el.className = `insp-logline ${entry.type}`;
    const time = new Date(entry.t).toLocaleTimeString();
    el.innerHTML = `
      <span class="sym">${entry.sym}</span>
      <span class="ts" style="opacity:.7">${time}</span>
      <span class="msg">${escapeHtml(entry.text)}</span>
    `;
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
    EB.emit('cb:insp:export:logs', { format:'text', count: STATE.logs.length });
  }

  function exportLogs(){
    const blob = new Blob([JSON.stringify(STATE.logs, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'logs.json'; a.click();
    URL.revokeObjectURL(url);
    EB.emit('cb:insp:export:json', { kind:'logs', count: STATE.logs.length });
  }

  // ---------- Platzhalter-Tabs (deine Inhalte liegen in ui/inspector/*) ---
  function renderTestsTab(host){
    host.innerHTML = `
      <div style="padding:8px">
        <div class="insp-actions">
          <button class="insp-btn" id="t-run-all">Alle Tests starten</button>
          <button class="insp-btn" id="t-reset">Tests zurücksetzen</button>
        </div>
        <div id="t-out"></div>
      </div>`;
    host.querySelector('#t-run-all').addEventListener('click',()=>{
      EB.emit('cb:test:run:all', {}); Log.info('[tests] gestartet');
    });
    host.querySelector('#t-reset').addEventListener('click',()=>{
      EB.emit('cb:test:reset', {});   Log.info('[tests] reset');
    });
  }
  function renderResTab(host){    host.innerHTML = `<div style="padding:8px;opacity:.85">Ressourcen-Tab (Platzhalter)</div>`; }
  function renderPathsTab(host){  host.innerHTML = `<div style="padding:8px;opacity:.85">Pfade-Tab (Platzhalter)</div>`; }
  function renderEditorTab(host){ host.innerHTML = `<div style="padding:8px;opacity:.85">Editor-Tab (Platzhalter)</div>`; }

  // ---------- Utils --------------------------------------------------------
  function html(str){ const t = document.createElement('template'); t.innerHTML = str.trim(); return t.content; }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function safeJson(v){ try { return JSON.stringify(v); } catch(_){ return String(v); } }

  // ---------- Öffentliche API ---------------------------------------------
  window.UIInspector = {
    __installed: true,
    install,
    open, close,
    switchTab
  };
})();
