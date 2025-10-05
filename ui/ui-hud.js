/* ============================================================================
 * Datei    : ui/ui-hud.js
 * Projekt  : Neue Siedler – HUD Ressourcen
 * Version  : v19.0.0 (2025-10-05)
 * Zweck    : HUD-Labels aktualisieren, wenn cb:res:change feuert
 * ============================================================================
 */

(function(){
  const $wood = document.getElementById('hud-wood');
  const $fish = document.getElementById('hud-fish');
  const $stone= document.getElementById('hud-stone');

  function set($el, val){ if($el) $el.textContent = String(val); }

  // einfache Totals lokal puffern
  const totals = { wood:0, fish:0, stone:0 };

  window.addEventListener('cb:res:change', (ev)=>{
    const {res, total} = ev.detail||{};
    totals[res] = total;
    if(res==='wood') set($wood, total);
    if(res==='fish') set($fish, total);
    if(res==='stone') set($stone, total);
  });
})();
