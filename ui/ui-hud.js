/* ============================================================================
 * Datei   : ui/ui-hud.js
 * Version : v19.1.0
 * Zweck   : HUD oben – zeigt Ressourcen (Holz/Stein/Gold), sonst nichts
 * Events  : listen -> cb:res:change { wood, stone, gold }
 * Hinweise:
 *   - Bilder optional via window.ICONS.{wood,stone,gold} (Strings/URLs)
 *   - Fallback auf Emoji, falls keine ICONS gesetzt sind
 *   - Öffnen/Schließen des Baumenüs NICHT hier (Build-Button ist unten links)
 * ========================================================================== */

(() => {
  const MOD='ui-hud';
  const log = (...a)=>(window.CBLog?.ok||console.log)(`[${MOD}]`,...a);

  const root = document.getElementById('hud-top');
  if (!root) return;

  // Helper: Icon (Bild aus ICONS oder Emoji)
  function Icon(name, emoji){
    const src = window.ICONS?.[name];
    return src
      ? `<img class="ic" src="${src}" alt="${name}" />`
      : `<span class="ic">${emoji}</span>`;
  }

  // Markup einhängen
  root.innerHTML = `
    <div class="hud-row" role="group" aria-label="Ressourcen">
      <div class="hud-badge">
        ${Icon('wood','🪵')} <span class="val" id="hud-wood">0</span><span class="lbl">Holz</span>
      </div>
      <div class="hud-badge">
        ${Icon('stone','🪨')} <span class="val" id="hud-stone">0</span><span class="lbl">Stein</span>
      </div>
      <div class="hud-badge">
        ${Icon('gold','🪙')} <span class="val" id="hud-gold">0</span><span class="lbl">Gold</span>
      </div>
    </div>
  `;
  root.classList.remove('hidden');

  // Ressourcen-Updates aus dem Spiel
  window.addEventListener('cb:res:change', (e) => {
    const r = e.detail||{};
    if (r.wood  != null) root.querySelector('#hud-wood').textContent  = r.wood;
    if (r.stone != null) root.querySelector('#hud-stone').textContent = r.stone;
    if (r.gold  != null) root.querySelector('#hud-gold').textContent  = r.gold;
  });

  log('HUD bereit (Ressourcen)');
})();
