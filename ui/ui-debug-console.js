/* ============================================================================
 * Datei    : ui/ui-debug-console.js
 * Version  : v1.0.0 (2025-10-05)
 * Zweck    : Leichtgewichtige, eingebaute Log-Konsole (mobil sichtbar)
 * ============================================================================
 */
(function(){
  const box = document.createElement('div');
  box.id = 'dbg';
  box.style.cssText = 'position:fixed;right:8px;bottom:8px;width:42vw;max-width:520px;max-height:40vh;overflow:auto;background:rgba(0,0,0,.6);color:#fff;font:12px/1.3 ui-monospace,Menlo,monospace;padding:8px;border-radius:10px;z-index:99998;display:none;';
  document.body.appendChild(box);

  const btn = document.createElement('button');
  btn.textContent = 'DBG';
  btn.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:99999;border-radius:999px;border:none;padding:8px 10px;background:#444;color:#fff;font-weight:700';
  btn.onclick = ()=>{ box.style.display = (box.style.display==='none'?'block':'none'); };
  document.body.appendChild(btn);

  function line(kind, args){
    const d = document.createElement('div');
    d.textContent = '['+kind+'] '+args.map(a=> (typeof a==='object'? JSON.stringify(a): String(a))).join(' ');
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }

  const _log = console.log.bind(console);
  const _err = console.error.bind(console);
  console.log  = (...a)=>{ _log(...a); line('LOG', a); };
  console.error= (...a)=>{ _err(...a); line('ERR', a); };

  window.addEventListener('cb:assets-ready',  ()=> line('EV','cb:assets-ready'));
  window.addEventListener('cb:registry:ready',()=> line('EV','cb:registry:ready'));
  window.addEventListener('cb:game-start',    ()=> line('EV','cb:game-start'));
})();
