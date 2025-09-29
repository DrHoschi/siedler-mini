// ============================================================================
// Datei : ui/ui-hud.js
// Zweck : HUD (Ressourcenanzeige) initialisieren & aktualisieren
// Sucht : #hud-top  (nicht #hud)
// Events: hört auf cb:game-start (HUD sichtbar machen, Startwerte setzen)
// ============================================================================
(() => {
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[ui-hud]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[ui-hud]', ...a);

  const q = (sel) => document.querySelector(sel);

  function root() {
    const el = q('#hud-top');
    if (!el) warn('Root #hud-top fehlt');
    return el;
  }

  function setValue(name, text) {
    const el = q(`[data-r="${name}"] > b`);
    if (el) el.textContent = text;
  }

  function show() {
    root()?.classList.remove('hidden');
  }

  // Startwerte nach Spielstart setzen
  window.addEventListener('cb:game-start', () => {
    show();
    setValue('wood',  '0');
    setValue('stone', '0');
    setValue('fish',  '0');
    setValue('gold',  '0');
    // Beispiel Bevölkerung "0/5" lassen, falls du Kapazität trackst
    log('sichtbar (v1.0)');
  });

  // Optional: Wenn Gebäude platziert wird, könntest du Kosten abziehen,
  // falls Registry.cost vorhanden ist. Minimalbeispiel:
  // window.addEventListener('cb:build:select', (e) => { /* nur Auswahl */ });
})();

// a) beim Spielstart einmalig anzeigen (auch wenn noch keine Änderung passiert ist)
window.addEventListener('cb:game-start', () => {
  const init = window.Game?.getResources?.() || { wood:0, stone:0, food:0, gold:0, pop:0 };
  renderHUD(init);
  (window.CBLog?.ok||console.log)('[ui-hud] init → cb:hud-ready');
  window.dispatchEvent(new CustomEvent('cb:hud-ready'));
});

// b) bei jeder Änderung aktualisieren
window.addEventListener('cb:res:change', (e) => {
  renderHUD(e.detail);
});
