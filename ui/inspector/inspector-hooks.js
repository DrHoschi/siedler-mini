/* ui/inspector/inspector-hooks.js

*/
(function(){
  const el = document.getElementById('insp-entrances') || (()=>{
    const box = document.createElement('pre');
    box.id = 'insp-entrances';
    box.style.position = 'fixed';
    box.style.right = '8px';
    box.style.bottom = '8px';
    box.style.zIndex = 9999;
    box.style.padding = '6px 8px';
    box.style.maxWidth = '38ch';
    box.style.font = '12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    box.style.color = '#cfe3ff';
    box.style.background = 'rgba(0,0,0,.35)';
    box.style.border = '1px solid rgba(255,255,255,.15)';
    box.style.borderRadius = '8px';
    box.style.pointerEvents = 'none';
    document.body.appendChild(box);
    return box;
  })();

  window.addEventListener('cb:place:preview', (e)=>{
    const d = e.detail||{};
    if (d.invalid) { el.textContent = 'Preview: —'; return; }
    const lines = [];
    lines.push(`Preview: ${d.id} @ (${d.gx},${d.gy})  size ${d.w}×${d.h}`);
    if (Array.isArray(d.entrancesAbs)){
      for (const {ex,ey,blocked} of d.entrancesAbs){
        lines.push(`  door: (${ex},${ey}) ${blocked?'[BLOCKED]':''}`);
      }
    }
    el.textContent = lines.join('\n');
  });
})();
