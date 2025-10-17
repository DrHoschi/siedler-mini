/* 
========================================
  Datei: ui/ui-inspector.js
  Projekt: Neue Siedler
  Version: v1.1.2
  Zweck: Vollbild-Inspector (Logs/Tests/Ressourcen/Pfade/Editor)
  Events: cb:insp:open|close|tab:change|export:logs|export:json
========================================
*/

(function(){
  const MOD = 'ui-inspector';

  // -------- Globals (aus Projektstandard) -----------------
  const EB = window.EventBus || {
    emit: (n,p)=>window.dispatchEvent(new CustomEvent(n,{detail:p})),
    on: (n,fn)=>window.addEventListener(n, (e)=>fn(e.detail)),
    off: (n,fn)=>window.removeEventListener(n,fn)
  };
  const Log = window.CBLog || console;

  const STATE = {
    open: false,
    activeTab: 'logs',
    filters: { ok:true, info:true, warn:true, error:true },
    logs: []
  };

  // --------- Install (einmalig von außen aufrufen) --------
  function install(){
    // Button sicherstellen
    const btn = ensureButton();
    btn.addEventListener('click',()=>isOpen?closeIns():openIns());
    // btn.addEventListener('click', () => open());
    // Overlay-Struktur aufbauen
    buildOverlay();
    // Logs abhören
    hookLogs();
    // Resize sicher handhaben (Close-X bleibt sichtbar)
    window.addEventListener('resize', ensureCloseInView);
    EB.emit('cb:insp:ready', { ok:true });
    (window.CBLog?.ok || console.log)(`[${MOD}] Modul geladen (v${version()})`);
  }

  function version(){ return '1.1.2'; }

  // --------- DOM: Button ----------------------------------
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
    btn.hidden = false; // NICHT verschwinden lassen
    return btn;
  }

  // --------- DOM: Overlay ---------------------------------
  function buildOverlay(){
    const root = document.getElementById('inspector-overlay') || (()=> {
      const d = document.createElement('div');
      d.id = 'inspector-overlay';
      document.body.appendChild(d);
      return d;
    })();

    root.innerHTML = '';
    root.appendChild(html(`
      <div class="insp-frame" role="dialog" aria-modal="true" aria-label="Inspector">
        <div class="insp-header">
          <div class="insp-tabs" id="insp-tabs" tabindex="0">
            ${tabBtn('logs','Logs')}
            ${tabBtn('tests','Tests')}
            ${tabBtn('res','Ressourcen')}
            ${tabBtn('paths','Pfade')}
            ${tabBtn('editor','Editor')}
          </div>
          <button class="insp-close" id="insp-close" aria-label="Inspector schließen">✕</button>
        </div>

        <div class="insp-content" id="insp-content">
          <!-- Tab-Inhalt wird gerendert -->
        </div>
      </div>
    `));

    // Handlers
    root.querySelector('#insp-close').addEventListener('click', () => close());
    root.addEventListener('click', (e)=>{
      // Klick neben Frame schließt (optional aus)
      // if (e.target === root) close();
    });

    // Tabwechsel via Click + horizontal scroll w/ touch
    root.querySelector('#insp-tabs').addEventListener('click', (e)=>{
      const t = e.target.closest('.insp-tab');
      if (t) switchTab(t.dataset.tab);
    });

    switchTab(STATE.activeTab);
    ensureCloseInView();
  }

  function tabBtn(id,label){
    const active = (STATE.activeTab === id) ? ' active' : '';
    return `<div class="insp-tab${active}" data-tab="${id}" role="tab">${label}</div>`;
  }

  function ensureCloseInView(){
    // dank CSS position: sticky + Safe-Areas ist es eigentlich safe,
    // hier sorgen wir nur dafür, dass der Header nicht wegscrollt
    const cont = document.getElementById('insp-content');
    if (cont) cont.style.scrollMarginTop = '16px';
  }

  // --------- Öffnen/Schließen ------------------------------
  function open(){
    STATE.open = true;
    document.getElementById('inspector-overlay').classList.add('open');
    const btn = document.getElementById('btn-inspector');
    if (btn) btn.hidden = true; // Button ausblenden, solange offen
    EB.emit('cb:insp:open', { tab: STATE.activeTab });
  }
  function close(){
    STATE.open = false;
    document.getElementById('inspector-overlay').classList.remove('open');
    const btn = document.getElementById('btn-inspector');
    if (btn) btn.hidden = false; // wieder einblenden
    EB.emit('cb:insp:close', {});
  }

  // Optional: Tastenkürzel (Ctrl/Cmd + I)
  window.addEventListener('keydown', (e)=>{
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i'){
      e.preventDefault();
      STATE.open ? close() : open();
    }
  });

  // --------- Tabs rendern ---------------------------------
  function switchTab(id){
    STATE.activeTab = id;
    // Header aktiv markieren
    const tabs = document.querySelectorAll('#insp-tabs .insp-tab');
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === id));
    // Inhalt rendern
    const host = document.getElementById('insp-content');
    if (!host) return;
    if (id === 'logs') renderLogsTab(host);
    else if (id === 'tests') renderTestsTab(host);
    else if (id === 'res') renderResTab(host);
    else if (id === 'paths') renderPathsTab(host);
    else if (id === 'editor') renderEditorTab(host);
    EB.emit('cb:insp:tab:change', { tab:id });
  }

  // --------- Logs: Hook + Render ---------------------------
  function hookLogs(){
    // Wenn CBLog einen Sink unterstützt, nutzen.
    // Fallback: leichte Monkey-Patches, die zusätzlich Events emittieren.
    try {
      const sink = (type, msg) => {
        const entry = normalizeLog(type, msg);
        STATE.logs.push(entry);
        if (STATE.activeTab === 'logs') appendLogLine(entry);
      };
      if (window.CBLog){
        // sanfter Wrap
        ['ok','info','warn','error'].forEach(type=>{
          const orig = window.CBLog[type]?.bind(window.CBLog) || console[type]?.bind(console);
          window.CBLog[type] = (...args) => {
            sink(type, args);
            return orig?.(...args);
          };
        });
      } else {
        ['log','info','warn','error'].forEach(type=>{
          const orig = console[type].bind(console);
          console[type] = (...args)=>{ sink(mapConsoleType(type), args); orig(...args); };
        });
      }
    } catch(e){
      console.warn('[ui-inspector] Log-Hook fehlgeschlagen:', e);
    }
  }

  function mapConsoleType(t){ return t==='log'?'info':(t||'info'); }

  function normalizeLog(type, args){
    const text = args.map(a => typeof a==='string' ? a : JSON.stringify(a)).join(' ');
    const sym = type==='ok'?'✅':type==='warn'?'⚠':type==='error'?'❌':'ℹ';
    const cls = type==='ok'?'ok':type;
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
    if (!list) return;
    if (!STATE.filters[entry.type]) return;
    const el = document.createElement('div');
    el.className = `insp-logline ${entry.type}`;
    const time = new Date(entry.t).toLocaleTimeString();
    el.innerHTML = `<span class="sym">${entry.sym}</span>
                    <span class="ts" style="opacity:.7">${time}</span>
                    <span class="msg">${escapeHtml(entry.text)}</span>`;
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

  // --------- Placeholder-Renderer für andere Tabs ----------
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
      EB.emit('cb:test:run:all', {});
      Log.info('[tests] gestartet');
    });
    host.querySelector('#t-reset').addEventListener('click',()=>{
      EB.emit('cb:test:reset', {});
      Log.info('[tests] reset');
    });
  }

  function renderResTab(host){
    host.innerHTML = `<div style="padding:8px;opacity:.8">Ressourcen-Tab (MVP)</div>`;
  }
  function renderPathsTab(host){
    host.innerHTML = `<div style="padding:8px;opacity:.8">Pfade-Tab (MVP)</div>`;
  }
  function renderEditorTab(host){
    host.innerHTML = `<div style="padding:8px;opacity:.8">Editor-Tab (MVP)</div>`;
  }

  // --------- Utils ----------------------------------------
  function html(str){ const t = document.createElement('template'); t.innerHTML = str.trim(); return t.content; }
  function escapeHtml(s){ return s.replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  // --------- API exportieren -------------------------------
  window.UIInspector = {
    install,
    open, close,
    switchTab
  };
})();
