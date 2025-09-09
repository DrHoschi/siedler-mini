/* ============================================================================
 * UI-Build – sehr schlankes Dock für deine bestehenden Baulogiken
 * Version: v17.8.4
 * - Zeigt/verbirgt das Panel zuverlässig
 * - Lässt Platzhalter-Buttons erscheinen, damit es “nicht leer” ist
 * ========================================================================== */

const CATS = (window.BUILD_CATEGORIES && Array.isArray(window.BUILD_CATEGORIES))
  ? window.BUILD_CATEGORIES
  : (window.BUILD_FALLBACK_CATEGORIES || []);

(function(){
  const LOG = (lvl, msg, ...a) =>
    (window.CBLog && CBLog[lvl] ? CBLog[lvl] : console.log).call(null, `[ui-build] ${msg}`, ...a);

  const panel = document.getElementById('build-panel');

  function ensurePanel(){
    if(!panel) return;
    if(panel.childElementCount) return;

    const wrap = document.createElement('div');
    wrap.style.cssText = `
      position:fixed; left:16px; right:16px; bottom:80px;
      max-width:840px; margin:0 auto; padding:12px; 
      background:rgba(240,242,246,.92); color:#243447;
      border:1px solid #cfd7df; border-radius:10px;
      box-shadow:0 14px 40px rgba(0,0,0,.25); backdrop-filter: blur(4px);
      display:none; z-index:2147483600;
    `;
    wrap.setAttribute('role','region');
    wrap.setAttribute('aria-label','Bau-Menü');

    const row = document.createElement('div');
    row.style.display='flex';
    row.style.flexWrap='wrap';
    row.style.gap='8px';

    function addBtn(label, evtName){
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = `
        padding:8px 12px; border-radius:8px; 
        border:1px solid #c6d1db; background:#eef3f7; cursor:pointer;
      `;
      b.addEventListener('click', ()=>{
        // deine bestehende Baulogik kann hier aufsetzen:
        window.dispatchEvent(new CustomEvent('cb:build-action', { detail:{ action: evtName }}));
        LOG('info', `Build-Aktion: ${evtName}`);
      });
      row.appendChild(b);
    }

    addBtn('Straße', 'place-road');
    addBtn('Holzfäller', 'place-lumberjack');
    addBtn('Steinbruch', 'place-stonecutter');
    addBtn('Depot', 'place-depot');
    addBtn('HQ', 'place-hq');

    wrap.appendChild(row);
    panel.appendChild(wrap);
  }

  function setOpen(open){
    ensurePanel();
    const el = panel && panel.firstElementChild;
    if(!el) return;
    el.style.display = open ? 'block' : 'none';
  }

  // Events vom UI-Bridge
  window.addEventListener('cb:build-open',  ()=>setOpen(true));
  window.addEventListener('cb:build-close', ()=>setOpen(false));

  LOG('info', 'geladen (v17.8.4)');
})();
