/* ============================================================================
 * Datei   : ui/ui-hud.js
 * Version : v19.2.1
 * Zweck   : HUD oben – Ressourcen + Bevölkerung, Mini-Panels mit Icon
 * Events  : listen -> cb:res:change {wood,stone,gold, pop?}
 * Hinweise:
 *   - Icons/Labels werden bevorzugt aus Registry gelesen:
 *       Registry.get('resource','res.wood'|'res.stone'|'res.gold'|'res.people')?.icon|name
 *   - Fallback: vorhandene window.ICONS{wood,stone,gold,people} (deine Assets!)
 *   - Keinerlei Build-Toggle mehr hier (Button ist separat unten links).
 *   - Hält sich an Lastenheft-Eventkontrakt (nur cb:res:change). 
 * ========================================================================== */

(() => {
  const MOD='ui-hud';
  const log = (...a)=>(window.CBLog?.ok||console.log)(`[${MOD}]`,...a);

  const root = document.getElementById('hud-top');
  if (!root) return;

  // ---- Helpers --------------------------------------------------------------
  const R = () => window.Registry;
  const rget = (id) => R()?.get?.('resource', id) || null;

  // Name/Label aus Registry oder fallback auf Klartext
  function resLabel(id, textFallback){
    return rget(id)?.name || textFallback;
  }

  // Icon-Pfad aus Registry oder fallback auf vorhandene window.ICONS
  function resIcon(id, iconKey, emojiFallback){
    const fromReg = rget(id)?.icon;
    if (fromReg) return `<img class="ic" src="${fromReg}" alt="${iconKey}">`;
    const fromWin = window.ICONS?.[iconKey];
    if (fromWin) return `<img class="ic" src="${fromWin}" alt="${iconKey}">`;
    return `<span class="ic" aria-hidden="true">${emojiFallback}</span>`;
  }

  // ---- Markup (Mini-Panels pro Ressource) ----------------------------------
  root.innerHTML = `
    <div class="hud-row" role="group" aria-label="Ressourcen">
      <div class="hud-badge" title="${resLabel('res.wood','Holz')}">
        ${resIcon('res.wood','wood','🪵')}
        <span class="val" id="hud-wood">0</span>
        <span class="lbl">${resLabel('res.wood','Holz')}</span>
      </div>
      <div class="hud-badge" title="${resLabel('res.stone','Stein')}">
        ${resIcon('res.stone','stone','🪨')}
        <span class="val" id="hud-stone">0</span>
        <span class="lbl">${resLabel('res.stone','Stein')}</span>
      </div>
      <div class="hud-badge" title="${resLabel('res.gold','Gold')}">
        ${resIcon('res.gold','gold','🪙')}
        <span class="val" id="hud-gold">0</span>
        <span class="lbl">${resLabel('res.gold','Gold')}</span>
      </div>
      <span class="hud-sep" aria-hidden="true"></span>
      <div class="hud-badge" title="${resLabel('res.people','Bevölkerung')}">
        ${resIcon('res.people','people','👥')}
        <span class="val" id="hud-pop">0</span>
        <span class="lbl">${resLabel('res.people','Bevölkerung')}</span>
      </div>
    </div>
  `;
  root.classList.remove('hidden');

  // ---- Live-Updates ---------------------------------------------------------
  const setVal = (sel, v) => {
    if (v == null) return;
    const el = root.querySelector(sel);
    if (el) el.textContent = v;
  };

  // Einziger Listener laut Vertrag: Ressourcenänderungen vom Game
  // (Bevölkerung kann hier mitlaufen oder separat cb:pop:change senden)
  window.addEventListener('cb:res:change', (e) => {
    const r = e.detail || {};
    setVal('#hud-wood',  r.wood);
    setVal('#hud-stone', r.stone);
    setVal('#hud-gold',  r.gold);
    if (r.pop != null) setVal('#hud-pop', r.pop);
  });

  // Optional: separater Bevölkerungs-Event (falls euer Game das trennt)
  window.addEventListener('cb:pop:change', (e) => {
    const v = e.detail?.pop;
    setVal('#hud-pop', v);
  });

  log('HUD bereit (Ressourcen + Bevölkerung, Registry-first, v19.2.1)');
})();
