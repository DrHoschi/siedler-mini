// ============================================================================
// Datei : ui/ui-hud.js
// Zweck : HUD (Ressourcenanzeige) initialisieren & aktualisieren
// Sucht : #hud-top  (nicht #hud)
// Events: hört auf cb:game-start (HUD sichtbar machen + Startwerte),
//         cb:res:change { wood, stone, gold, pop? },
//         optional: cb:pop:change { pop }
// Leitplanken:
//   • Panels/Look kommen aus CSS (.ui-panel + var(--ui-panel-img))
//   • Icons werden NICHT überschrieben – wenn window.ICONS vorhanden ist,
//     werden genau DEINE Pfade benutzt; sonst kurzer Emoji-Fallback (nur Debug)
//   • Kein Build-Toggle im HUD (Button ist separat links unten)
// ============================================================================
(() => {
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[ui-hud]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[ui-hud]', ...a);
  const q    = (sel) => document.querySelector(sel);

  // --- Helpers ---------------------------------------------------------------
  const ICONS = window.ICONS || {}; // DEINE Mappings (nicht überschreiben!)
  const iconTag = (key, emoji) => {
    const src = ICONS[key];
    return src
      ? `<img class="ic" src="${src}" alt="${key}">`
      : `<span class="ic" aria-hidden="true">${emoji}</span>`; // nur Debug-Fallback
  };

  function root() {
    const el = q('#hud-top');
    if (!el) warn('Root #hud-top fehlt');
    return el;
  }
  function setValue(name, text) {
    const el = q(`[data-r="${name}"] > b`);
    if (el) el.textContent = text;
  }
  function show() { root()?.classList.remove('hidden'); }

  // --- Initial-Render (Mini-Panels pro Ressource; Panels via CSS) -----------
  (function renderHUD(){
    const el = root();
    if (!el) return;
    el.innerHTML = `
      <div class="hud-row" role="group" aria-label="Ressourcen">
        <div class="hud-badge" data-r="wood" title="Holz">
          ${iconTag('wood','🪵')} <b>0</b><span class="lbl">Holz</span>
        </div>
        <div class="hud-badge" data-r="stone" title="Stein">
          ${iconTag('stone','🪨')} <b>0</b><span class="lbl">Stein</span>
        </div>
        <div class="hud-badge" data-r="gold" title="Gold">
          ${iconTag('gold','🪙')} <b>0</b><span class="lbl">Gold</span>
        </div>
        <span class="hud-sep" aria-hidden="true"></span>
        <div class="hud-badge" data-r="pop" title="Bevölkerung">
          ${iconTag('people','👥')} <b>0</b><span class="lbl">Bevölkerung</span>
        </div>
      </div>
    `;
  })();

  // --- Liveschaltung ---------------------------------------------------------
  window.addEventListener('cb:game-start', () => {
    show();
    setValue('wood',  '0');
    setValue('stone', '0');
    setValue('gold',  '0');
    setValue('pop',   '0'); // Bevölkerung mit anzeigen
    log('HUD sichtbar (Startwerte gesetzt)');
  });

  window.addEventListener('cb:res:change', (e) => {
    const r = e.detail || {};
    if (r.wood  != null) setValue('wood',  String(r.wood));
    if (r.stone != null) setValue('stone', String(r.stone));
    if (r.gold  != null) setValue('gold',  String(r.gold));
    if (r.pop   != null) setValue('pop',   String(r.pop));
  });

  // Optional separates Bevölkerungs-Event
  window.addEventListener('cb:pop:change', (e) => {
    const v = e.detail?.pop;
    if (v != null) setValue('pop', String(v));
  });
})();
