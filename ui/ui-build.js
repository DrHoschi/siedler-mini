/* ============================================================================
 * Datei   : ui/ui-build.js
 * Version : v25.11.13-fix2
 * Zweck   : Robust: Build-Dock toggeln (Button-Find, Event-Fallback), kein Auto-Open
 * ========================================================================== */
(function(){
  if (window.UIBuild?.__active) { console.info('[build] bereits aktiv'); return; }

  const S = { open:false, inited:false, dock:null, btn:null };

  const emit = (t,d={})=>window.dispatchEvent(new CustomEvent(t,{detail:d}));
  const LOG  = (...a)=>(window.CBLog?.info||console.info)('[build]',...a);
  const WARN = (...a)=>(window.CBLog?.warn||console.warn)('[build]',...a);

  function qBtn(){
    // 1) bevorzugt #btn-build
    let b = document.getElementById('btn-build');
    if (b) return b;
    // 2) data-action="build-toggle"
    b = document.querySelector('[data-action="build-toggle"]');
    if (b) return b;
    // 3) Fallback: Button mit sichtbarem Text „Bauen“
    b = [...document.querySelectorAll('button')].find(el => (el.textContent||'').trim().toLowerCase().includes('bauen'));
    if (!b) WARN('Kein Build-Button gefunden (#btn-build oder [data-action="build-toggle"]).');
    return b;
  }

  function qDock(){
    let d = document.getElementById('build-dock');
    if (!d){
      // Minimaler Fallback, falls das Dock gar nicht existiert:
      d = document.createElement('div');
      d.id = 'build-dock';
      d.style.cssText = 'position:fixed;right:16px;top:72px;max-height:60vh;overflow:auto;display:none;z-index:9000;';
      d.innerHTML = `<div style="padding:8px;background:#111b;backdrop-filter:blur(2px);border-radius:12px;color:#eee;">
        <button data-close style="float:right">×</button>
        <div><strong>Baumenü</strong></div>
        <div style="opacity:.7;font-size:12px">Dock-Fallback aktiv</div>
      </div>`;
      document.body.appendChild(d);
    }
    return d;
  }

  function openDock(from='button'){
    if (S.open) return;
    S.open = true;
    S.dock.style.display = 'block';
    emit('cb:build:open',{from});
    LOG('open');
  }
  function closeDock(reason='button/x'){
    if (!S.open) return;
    S.open = false;
    S.dock.style.display = 'none';
    emit('cb:build:close',{reason});
    LOG('close');
  }
  function toggleDock(){ S.open ? closeDock('toggle') : openDock('toggle'); }

  function bindButton(){
    const btn = qBtn();
    if (!btn) return;
    if (S.btn === btn) return;          // schon gebunden
    S.btn = btn;
    btn.removeEventListener('click', toggleDock);
    btn.addEventListener('click', toggleDock, { passive:true });
  }

  function bindDock(){
    S.dock = qDock();
    // Schließen-X im Dock
    S.dock.querySelectorAll('[data-close]').forEach(el=>{
      el.onclick = ()=> closeDock('x');
    });
    // Cards → begin place (optional, nur wenn vorhanden)
    S.dock.querySelectorAll('[data-building-id]').forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute('data-building-id');
        const size = (el.getAttribute('data-size')||'3x3').split('x').map(n=>parseInt(n,10)||3);
        emit('cb:set-build-tool',{kind:id});
        emit('req:place:start',{buildingId:id,size});
        document.body.classList.add('is-placing');
        LOG('select', id, '→ begin', size.join('x'));
      };
    });
  }

  function onPlaceResult(e){
    const d = e.detail||{};
    if (d.ok){
      document.body.classList.remove('is-placing');
      closeDock('place');
    }
  }

  function onKeydown(ev){
    if (ev.key==='b' && (ev.ctrlKey||ev.metaKey)) { ev.preventDefault(); toggleDock(); }
  }

  function init(){
    if (S.inited) return;
    S.inited = true;

    bindDock();
    bindButton();

    // Fallback: externes Öffnen per Event
    window.addEventListener('req:build:open',   ()=>openDock('event'));
    window.addEventListener('req:build:close',  ()=>closeDock('event'));
    window.addEventListener('req:build:toggle', ()=>toggleDock());

    // Platzier-Ergebnis aufräumen
    window.addEventListener('cb:place:result', onPlaceResult);

    // Komfort: Cmd/Ctrl+B → Toggle
    window.addEventListener('keydown', onKeydown);

    LOG('bereit', {btn:!!S.btn, dock:!!S.dock});
  }

  // Auto-Init
  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else { init(); }

  window.UIBuild = { __active:true, open:openDock, close:closeDock, toggle:toggleDock, init };
})();
