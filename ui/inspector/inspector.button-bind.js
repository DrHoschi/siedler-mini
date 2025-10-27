/* ============================================================================
 * Datei   : ui/inspector/inspector.button-bind.js
 * Version : v25.10.30-bind3
 * Zweck   : Inspector-Button & Hotkey (I) – bevorzugt UIInspector, kompatibel
 *           mit __INSPECTOR_CORE__.api.* und window.Inspector.* (Altpfade).
 *
 * Hinweise / Mini-Doku:
 *   – Erzeugt bei Bedarf automatisch einen FAB (⚙️), falls nicht vorhanden.
 *   – Bevorzugt window.UIInspector.toggle() → garantiert Events & Active-View.
 *   – Fallbacks feuern cb:insp:open / cb:inspector:close + inspector:ready.
 *   – Einmal-Guard gegen doppelte Bindung.
 *   – Kein Löschen alter Pfade – nur ergänzt/gehärtet.
 * ============================================================================ */
(function () {
  'use strict';

  if (window.__INSPECTOR_BIND_ATTACHED__) return;
  window.__INSPECTOR_BIND_ATTACHED__ = true;

  const MOD = '[insp-bind]';
  const LOG = (window.CBLog?.info || console.info).bind(console, MOD);

  function getRoot(){ return document.getElementById('inspector') || document.getElementById('inspector-overlay'); }
  function isOpen(){
    const r = getRoot();
    return document.body.classList.contains('is-inspector') || (r && r.classList.contains('open'));
  }
  function emit(name, detail){ try{ window.dispatchEvent(new CustomEvent(name, { detail })); }catch{} }

  // ---- zentrale Toggle-Logik ------------------------------------------------
  function toggleInspector(force){
    const want = (typeof force === 'boolean') ? force : !isOpen();

    // (1) Bevorzugt: neue Bridge
    if (window.UIInspector && typeof window.UIInspector.toggle === 'function'){
      window.UIInspector.toggle(want ? undefined : undefined); // Tab-Key optional
      return;
    }

    // (2) Core-API (neuere Altvariante)
    const api = window.__INSPECTOR_CORE__ && window.__INSPECTOR_CORE__.api;
    if (api && typeof api.toggle === 'function'){
      api.toggle(want);
      emit(want ? 'cb:insp:open' : 'cb:inspector:close');
      if (want) emit('inspector:ready');
      return;
    }

    // (3) Ganz alte API
    if (window.Inspector && typeof window.Inspector.toggle === 'function'){
      window.Inspector.toggle(want);
      emit(want ? 'cb:insp:open' : 'cb:inspector:close');
      if (want) emit('inspector:ready');
      return;
    }

    // (4) DOM-Fallback (Notmodus)
    const root = getRoot() || (function () {
      const n = document.createElement('div');
      n.id = 'inspector';
      n.className = 'inspector';
      Object.assign(n.style, { position:'fixed', inset:'0', background:'rgba(0,0,0,.6)', zIndex:50, color:'#fff' });
      n.textContent = 'Inspector';
      document.body.appendChild(n);
      return n;
    })();

    root.classList.toggle('open', want);
    document.body.classList.toggle('is-inspector', want);
    root.style.display = want ? '' : 'none';
    emit(want ? 'cb:insp:open' : 'cb:inspector:close');
    if (want) emit('inspector:ready');
  }

  function bind(){
    let btn = document.getElementById('btn-inspector');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'btn-inspector';
      btn.title = 'Inspector (I)';
      btn.type = 'button';
      btn.textContent = '⚙️';
      Object.assign(btn.style, {
        position:'fixed', right:'12px', bottom:'12px', zIndex:'60', padding:'6px 8px',
        borderRadius:'6px', border:'1px solid #444', background:'rgba(0,0,0,.55)', color:'#e8e8f0',
        fontSize:'25px', lineHeight:'1'
      });
      document.body.appendChild(btn);
    }

    btn.addEventListener('click', () => {
      const before = isOpen();
      toggleInspector();
      setTimeout(()=>{
        if (!isOpen() && before === isOpen() && window.UIInspector?.open){
          window.UIInspector.open(); // garantiert Events + Active-View beim Erstklick
        }
      }, 30);
    });

    // Hotkey: I
    window.addEventListener('keydown', (e) => {
      if (!e || e.repeat) return;
      if ((e.key||'').toLowerCase()==='i' && !e.altKey && !e.ctrlKey && !e.metaKey){
        toggleInspector();
      }
    });

    LOG('Button/Hotkey gebunden (v25.10.30-bind3)');
  }

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', bind, { once: true })
    : bind();

  // Externe Events
  window.addEventListener('req:insp:toggle', () => toggleInspector());
  window.addEventListener('req:insp:open',   () => toggleInspector(true));
  window.addEventListener('req:insp:close',  () => toggleInspector(false));
})();