/* =========================================================================
 *  Siedler-Mini — ui-build.js
 *  Version: v16.1.0
 *  Zweck: Build-Menü, Ressourcen-HUD, Free-Build, Pointer-Platzierung
 *  Erwartet: window.CityBuilder aus game.js
 * ========================================================================= */

(function(){
  const V='v16.1.0';
  const log = (t,m)=>window.__gameLog?window.__gameLog(t,m):console.log(`[${t}] ${m}`);

  // Event: UI bereit
  window.dispatchEvent(new CustomEvent('ui-build-ready'));

  // Toolbuttons
  document.querySelectorAll('.tool').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const t = btn.getAttribute('data-tool');
      window.CityBuilder?.setTool(t);
    });
  });

  // Ressourcen-HUD
  const rWood = document.getElementById('rWood');
  const rStone = document.getElementById('rStone');
  const rCoins = document.getElementById('rCoins');
  document.getElementById('btnGive100').addEventListener('click', ()=>{
    window.CityBuilder?.addResources({wood:100, stone:100, coins:100});
    sync();
  });
  document.getElementById('chkFree').addEventListener('change', (e)=>{
    window.CityBuilder?.toggleFreeBuild(!!e.target.checked);
  });

  function sync(){
    const r = window.CityBuilder?.getResources?.()||{wood:0,stone:0,coins:0};
    rWood.textContent = r.wood|0;
    rStone.textContent = r.stone|0;
    rCoins.textContent = r.coins|0;
  }

  // Expose für game.js
  window.CityBuilderUI = {
    syncResources: sync
  };

  // Platzierung per Tap/Klick in Grid
  const canvas = document.getElementById('game');
  function toGrid(x,y){
    const tile = 64; // gleich mit game.js Default
    return {gx: Math.floor(x/tile), gy: Math.floor(y/tile)};
  }
  canvas.addEventListener('click', (e)=>{
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const {gx,gy} = toGrid(x,y);
    const ok = window.CityBuilder?.placeAt?.(gx,gy);
    if (ok) sync();
  }, {passive:true});

  // Erste Sync nach Laden
  setTimeout(sync, 0);
  log('ok', `Bau-Menü bereit (ui-build.js ${V})`);
})();
