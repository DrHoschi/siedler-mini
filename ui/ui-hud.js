/* ============================================================================
 * Datei   : ui/ui-hud.js
 * Version : v19.2.0
 * Zweck   : HUD oben – Ressourcen + Bevölkerung, pro Badge Mini-Panel
 * Events  : listen -> cb:res:change {wood,stone,gold[,pop]}
 *                     cb:pop:change {pop}
 * Hinweise:
 *   - Icon-Quelle: window.ICONS.{wood,stone,gold,people} (PNG/SVG)
 *     Fallback auf Emoji, falls nicht gesetzt.
 *   - Build-Button ist separat unten links – kein Toggle im HUD.
 * ========================================================================== */

(() => {
  const MOD='ui-hud';
  const log = (...a)=>(window.CBLog?.ok||console.log)(`[${MOD}]`,...a);

  const root = document.getElementById('hud-top');
  if (!root) return;

  // Helper: Icon als <img> wenn vorhanden, sonst Emoji
  function icon(name, emoji){
    const src = window.ICONS?.[name];
    return src
      ? `<img class="ic" src="${src}" alt="${name}">`
      : `<span class="ic" aria-hidden="true">${emoji}</span>`;
  }

  // Markup: Holz, Stein, Gold, Bevölkerung
  root.innerHTML = `
    <div class="hud-row" role="group" aria-label="Ressourcen">
      <div class="hud-badge" title="Holz">
        ${icon('wood','🪵')}
        <span class="val" id="hud-wood">0</span>
        <span class="lbl">Holz</span>
      </div>
      <div class="hud-badge" title="Stein">
        ${icon('stone','🪨')}
        <span class="val" id="hud-stone">0</span>
        <span class="lbl">Stein</span>
      </div>
      <div class="hud-badge" title="Gold">
        ${icon('gold','🪙')}
        <span class="val" id="hud-gold">0</span>
        <span class="lbl">Gold</span>
      </div>
      <span class="hud-sep" aria-hidden="true"></span>
      <div class="hud-badge" title="Bevölkerung">
        ${icon('people','👥')}
        <span class="val" id="hud-pop">0</span>
        <span class="lbl">Bevölkerung</span>
      </div>
    </div>
  `;
  root.classList.remove('hidden');

  // Updates bündeln
  function setVal(id, v){
    const el = root.querySelector(id);
    if (el && v != null) el.textContent = v;
  }

  // Ressourcenänderungen (optional inkl. pop)
  window.addEventListener('cb:res:change', (e) => {
    const r = e.detail || {};
    setVal('#hud-wood',  r.wood);
    setVal('#hud-stone', r.stone);
    setVal('#hud-gold',  r.gold);
    if (r.pop != null) setVal('#hud-pop', r.pop);
  });

  // Bevölkerung separat
  window.addEventListener('cb:pop:change', (e) => {
    const v = e.detail?.pop;
    setVal('#hud-pop', v);
  });

  log('HUD bereit (Ressourcen + Bevölkerung, Panel-Badges)');
})();
