/* ============================================================================
 * Datei   : ui/ui-hud.js
 * Version : v19.0.0
 * Zweck   : HUD oben – Ressourcen & Build-Toggle
 * Events  : emit  -> cb:build:open|close
 *           listen-> cb:res:change
 * Hinweis : Build-Button öffnet/schließt Dock; kompatibel zu Lastenheft.  [oai_citation:1‡Lastenheft_NeueSiedler_Vollversion v1.0.pdf](file-service://file-3LhVFNfaWzhV5CMo8PkBF7)
 * ========================================================================== */

(() => {
  const MOD='ui-hud';
  const log = (...a)=>(window.CBLog?.ok||console.log)(`[${MOD}]`,...a);

  const root = document.getElementById('hud-top');
  if (!root) return;

  root.innerHTML = `
    <div class="hud-row">
      <button id="btn-build-toggle" class="btn">Bauen</button>
      <span class="hud-sep"></span>
      <div class="hud-badge"><span class="ic">🪵</span><span class="val" id="hud-wood">0</span><span class="lbl">Holz</span></div>
      <div class="hud-badge"><span class="ic">🪨</span><span class="val" id="hud-stone">0</span><span class="lbl">Stein</span></div>
      <div class="hud-badge"><span class="ic">🪙</span><span class="val" id="hud-gold">0</span><span class="lbl">Gold</span></div>
    </div>
  `;
  root.classList.remove('hidden');

  const btn = root.querySelector('#btn-build-toggle');
  let isOpen = false;
  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    window.dispatchEvent(new CustomEvent(isOpen ? 'cb:build:open' : 'cb:build:close', { detail:{ from:'HUD' }}));
  });

  // Ressourcenänderungen (später aus Game)
  window.addEventListener('cb:res:change', (e) => {
    const r = e.detail||{};
    if (r.wood!=null)  root.querySelector('#hud-wood').textContent  = r.wood;
    if (r.stone!=null) root.querySelector('#hud-stone').textContent = r.stone;
    if (r.gold!=null)  root.querySelector('#hud-gold').textContent  = r.gold;
  });

  log('Modul geladen (v19.0.0)');
})();
