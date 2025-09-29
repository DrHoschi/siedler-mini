// ============================================================================
// Datei : ui/ui-hud.js
// Projekt: Neue Siedler
// Version: v1.0.1
// Zweck : HUD (Ressourcenanzeige) initialisieren & aktualisieren
// Sucht : #hud-top  (Container), einzelne Werte via [data-r="wood|stone|fish|gold|pop"] > b
// Events: hört auf cb:game-start (HUD sichtbar machen, Startwerte setzen)
//         hört auf cb:res:change (Werte aktualisieren)
// ============================================================================
(() => {
  const log  = (...a) => (window.CBLog?.ok   || console.log)('[ui-hud]', ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)('[ui-hud]', ...a);

  const q = (sel) => document.querySelector(sel);
  function root(){ const el=q('#hud-top'); if(!el) warn('Root #hud-top fehlt'); return el; }
  function setValue(name, text){ const el=q(`[data-r="${name}"] > b`); if(el) el.textContent = String(text); }

  function renderHUD(res){
    if (!res) return;
    setValue('wood',  res.wood ?? 0);
    setValue('stone', res.stone ?? 0);
    setValue('fish',  res.fish ?? 0);
    setValue('gold',  res.gold ?? 0);
    setValue('pop',   res.pop ?? 0);
  }

  function show(){ root()?.classList.remove('hidden'); }

  // Beim Spielstart HUD zeigen & Startwerte ziehen
  window.addEventListener('cb:game-start', () => {
    show();
    const init = (window.Game?.getResources?.() || { wood:0, stone:0, fish:0, gold:0, pop:0 });
    renderHUD(init);
    log('sichtbar (init) → cb:hud-ready');
    window.dispatchEvent(new CustomEvent('cb:hud-ready'));
  });

  // Laufende Updates
  window.addEventListener('cb:res:change', (e) => renderHUD(e.detail));
})();
