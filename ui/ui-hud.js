// ============================================================================
// Datei : ui/ui-hud.js
// Version: v1.0.3
// Zweck : HUD initial zeigen & Werte aktualisieren – tolerant bei Selectors
// ============================================================================
(() => {
  const log = (...a)=>(window.CBLog?.ok||console.log)('[ui-hud]',...a);
  const $ = s => document.querySelector(s);

  // tolerant: data-r="wood" > b  ODER  #res-wood
  function setVal(key, val){
    const elData = $(`[data-r="${key}"] > b`) || $(`[data-r="${key}"]`) || $(`#res-${key}`);
    if (elData) elData.textContent = String(val);
  }
  function render(res){
    if(!res) return;
    setVal('wood',  res.wood ?? 0);
    setVal('stone', res.stone ?? 0);
    setVal('fish',  res.fish ?? 0);
    setVal('gold',  res.gold ?? 0);
    setVal('pop',   res.pop ?? 0);
  }

  // Beim Spielstart HUD sichtbar + Startwerte holen
  window.addEventListener('cb:game-start', () => {
    const hud = $('#hud-top'); if(hud){ hud.hidden=false; hud.classList.remove('hidden'); }
    const init = window.Game?.getResources?.() || {wood:0,stone:0,fish:0,gold:0,pop:0};
    render(init);
    log('sichtbar (init) → cb:hud-ready');
    window.dispatchEvent(new CustomEvent('cb:hud-ready'));
  });

  // Laufende Updates
  window.addEventListener('cb:res:change', e => render(e.detail));
})();
