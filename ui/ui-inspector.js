/* ============================================================================
 * Datei   : ui/ui-inspector.js
 * Projekt : Neue Siedler
 * Version : v1.0.9
 * Zweck   : Debug-/QA-Overlay (Logs | Tests | Ressourcen | Pfade | Editor)
 * ============================================================================
 */

(function(){
  const MOD = 'ui-inspector';
  const LOG = (m)=> (window.CBLog?.ok || console.log)(`[${MOD}] ${m}`);
  const EB  = window.EventBus || {
    emit:(n,p)=>window.dispatchEvent(new CustomEvent(n,{detail:p}))
  };

  let state = { open:false, active:'logs', logs:[], filters:{ok:1,info:1,warn:1,error:1} };
  let root, content, tabs;

  // --------------------------------------------------------------------------
  //  Setup
  // --------------------------------------------------------------------------
  window.addEventListener('DOMContentLoaded', build);
  function build(){
    // Button
    let btn = document.getElementById('btn-inspector');
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'btn-inspector';
      btn.className = 'cb-fab cb-fab-inspector';
      btn.textContent = '🛠️';
      document.body.appendChild(btn);
    }
    btn.addEventListener('click', toggle);

    // Overlay
    root = document.createElement('div');
    root.id = 'inspector-overlay';
    root.innerHTML = `
      <div class="insp-frame">
        <div class="insp-header">
          <div class="insp-tabs" id="insp-tabs">
            ${tabBtn('logs','Logs')}
            ${tabBtn('tests','Tests')}
            ${tabBtn('res','Ressourcen')}
            ${tabBtn('paths','Pfade')}
            ${tabBtn('editor','Editor')}
          </div>
          <button class="insp-close" id="insp-close">✕</button>
        </div>
        <div class="insp-content" id="insp-content"></div>
      </div>`;
    document.body.appendChild(root);

    content = root.querySelector('#insp-content');
    tabs    = root.querySelector('#insp-tabs');

    root.querySelector('#insp-close').addEventListener('click', close);
    tabs.addEventListener('click', e=>{
      const t = e.target.closest('.insp-tab');
      if(t) switchTab(t.dataset.tab);
    });

    hookLogs();
    switchTab('logs');
    LOG('Modul geladen (v1.0.9)');
  }

  // --------------------------------------------------------------------------
  //  UI – Tabs, Öffnen/Schließen
  // --------------------------------------------------------------------------
  function tabBtn(id,label){ return `<div class="insp-tab" data-tab="${id}">${label}</div>`; }
  function toggle(){ state.open ? close() : open(); }
  function open(){
    state.open = true;
    root.classList.add('open');
    document.getElementById('btn-inspector').hidden = true;
    EB.emit('cb:insp:open',{tab:state.active});
  }
  function close(){
    state.open = false;
    root.classList.remove('open');
    document.getElementById('btn-inspector').hidden = false;
    EB.emit('cb:insp:close',{});
  }

  function switchTab(id){
    state.active = id;
    tabs.querySelectorAll('.insp-tab')
        .forEach(t=>t.classList.toggle('active',t.dataset.tab===id));
    content.innerHTML = '';
    if(id==='logs') renderLogs();
    else if(id==='tests') content.innerHTML = '<div class="insp-placeholder">Tests-Tab</div>';
    else if(id==='res')   content.innerHTML = '<div class="insp-placeholder">Ressourcen-Tab</div>';
    else if(id==='paths') content.innerHTML = '<div class="insp-placeholder">Pfade-Tab</div>';
    else if(id==='editor')content.innerHTML = '<div class="insp-placeholder">Editor-Tab</div>';
    EB.emit('cb:insp:tab:change',{tab:id});
  }

  // --------------------------------------------------------------------------
  //  Logs-Tab
  // --------------------------------------------------------------------------
  function hookLogs(){
    const sink=(type,args)=>{
      const txt=args.map(a=>typeof a==='string'?a:JSON.stringify(a)).join(' ');
      const entry={t:Date.now(),type,text:txt};
      state.logs.push(entry);
      if(state.active==='logs') append(entry);
    };
    ['log','info','warn','error'].forEach(k=>{
      const orig=console[k].bind(console);
      console[k]=(...a)=>{ sink(k,a); orig(...a); };
    });
  }

  function renderLogs(){
    content.innerHTML = `
      <div class="insp-logs">
        <div class="insp-filters">
          ${filter('ok','Erfolg')} ${filter('info','Info')}
          ${filter('warn','Warnung')} ${filter('error','Fehler')}
        </div>
        <div class="insp-actions">
          <button class="insp-btn" id="copyLogs">Kopieren</button>
          <button class="insp-btn" id="exportLogs">Export JSON</button>
          <span id="logCount" style="margin-left:auto;opacity:.7"></span>
        </div>
        <div id="logList"></div>
      </div>`;
    content.querySelector('#copyLogs').onclick = copy;
    content.querySelector('#exportLogs').onclick = exportJson;
    content.querySelectorAll('.insp-filters input').forEach(cb=>{
      cb.onchange=()=>{ state.filters[cb.value]=cb.checked?1:0; redraw(); };
    });
    redraw();
  }

  function filter(k,l){ return `<label><input type="checkbox" value="${k}" checked> ${l}</label>`; }
  function redraw(){
    const list = document.getElementById('logList'); list.innerHTML='';
    for(const e of state.logs){ if(!state.filters[e.type]) continue; append(e); }
    document.getElementById('logCount').textContent=`Logs gesamt: ${state.logs.length}`;
  }
  function append(e){
    const el=document.createElement('div');
    el.className=`insp-logline ${e.type}`;
    const t=new Date(e.t).toLocaleTimeString();
    el.innerHTML=`<span class="sym">${sym(e.type)}</span><span class="ts">${t}</span><span class="msg">${escape(e.text)}</span>`;
    document.getElementById('logList')?.appendChild(el);
  }
  function sym(t){ return t==='warn'?'⚠':t==='error'?'❌':t==='ok'?'✅':'ℹ'; }

  function copy(){
    const txt=state.logs.map(e=>`[${e.type}] ${e.text}`).join('\n');
    navigator.clipboard?.writeText(txt);
    EB.emit('cb:insp:export:logs',{format:'txt',count:state.logs.length});
  }
  function exportJson(){
    const blob=new Blob([JSON.stringify(state.logs,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='logs.json';
    a.click();
    EB.emit('cb:insp:export:json',{entity:'logs',count:state.logs.length});
  }

  // --------------------------------------------------------------------------
  //  Utils
  // --------------------------------------------------------------------------
  function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
})();
