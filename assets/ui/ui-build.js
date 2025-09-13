/* ============================================================================
 * Datei: assets/ui/ui-build.js
 * Version: v17.9.10
 * Zweck: Build-Panel-Icons & Aktionen
 *  - Thumbnails aus Entities-Registry (korrekte Pfade in assets/buildings/)
 *  - Fallback: heuristische Pfadwahl + Placeholder
 *  - Dispatch moderner Build-Events
 * Abhängigkeiten: (optional) window.EntitiesRegistry
 * ============================================================================ */
(() => {
  'use strict';
  const TAG = '[ui-build]';
  const LOG = (...a)=> (window.CBLog?.info||console.log)(TAG, ...a);
  const WARN= (...a)=> (window.CBLog?.warn||console.warn)(TAG, ...a);

  // --- Helfer ----------------------------------------------------------------
  function lower(s){ return (s||'').toString().trim().toLowerCase(); }
  function q(sel,root=document){ return root.querySelector(sel); }
  function qa(sel,root=document){ return Array.from(root.querySelectorAll(sel)); }

  // Sprite für ein Gebäude bestimmen (aus Registry, sonst Heuristik)
  function resolveSprite(kind){
    const k = lower(kind);
    const R = window.EntitiesRegistry;
    let sprite = null;

    if (R && typeof R.get === 'function') {
      const r = R.get(k);
      sprite = r?.icon || r?.sprite || null;
    }

    if (!sprite) {
      // Heuristik: bevorzugt exakt in assets/buildings/
      // Beispiele aus deiner filelist: rathaus_wood1.png, depot_wood.png, hq_wood.png, wohnhaus_wood0_ug0.png, farm_wood.png, …
      const guesses = [
        `assets/buildings/${k}.png`,
        `assets/buildings/${k}_wood.png`,
        `assets/buildings/${k}_wood0.png`,
        `assets/buildings/${k}_wood1.png`,
        `assets/buildings/${k}_stone.png`,
        `assets/buildings/${k}_stone1.png`,
      ];
      // Spezialfälle (Mapping)
      const map = {
        'house': 'assets/buildings/wohnhaus_wood0_ug0.png',
        'wohnhaus': 'assets/buildings/wohnhaus_wood0_ug0.png',
        'rathaus': 'assets/buildings/rathaus_wood1.png',
        'depot': 'assets/buildings/depot_wood.png',
        'farm': 'assets/buildings/farm_wood.png',
        'hq': 'assets/buildings/hq_wood.png',
        'fisher': 'assets/buildings/fischer_wood1.png',
        'steinmetz': 'assets/buildings/steinmetz_wood.png',
        'schmied': 'assets/buildings/schmied_wood0.png',
        'windmuehle': 'assets/buildings/windmuehle_wood.png',
        'wachturm': 'assets/buildings/wachturm_wood.png',
        'lumberjack': 'assets/buildings/lumberjack_wood.png',
        'baecker': 'assets/buildings/baecker_wood.png'
      };
      if (map[k]) sprite = map[k];
      else sprite = guesses[0];
    }
    return sprite;
  }

  function setThumb(el, kind){
    const box = el.querySelector('[data-thumb]') || el;
    const src = resolveSprite(kind);
    // Wir setzen als CSS-Background, damit Layout stabil bleibt
    box.style.backgroundImage = `url("${src}")`;
    box.style.backgroundSize  = 'cover';
    box.style.backgroundPosition = 'center';
    box.style.backgroundRepeat = 'no-repeat';
    box.setAttribute('data-thumb-src', src);
  }

  // Build-Action dispatchen (modern & legacy)
  function dispatchPlace(kind){
    const detail = { kind };
    window.dispatchEvent(new CustomEvent('cb:build:place', { detail }));
    window.dispatchEvent(new CustomEvent('cb:build-action', { detail: { action: `place-${kind}` }}));
  }

  // --- Init ------------------------------------------------------------------
  function wireButtons(){
    // Erwartete Struktur: Buttons/Items mit data-build-kind, optional data-thumb-Container
    const items = qa('[data-build-kind]');
    items.forEach((it)=>{
      const kind = it.getAttribute('data-build-kind');
      if (!kind) return;
      setThumb(it, kind);
      it.addEventListener('click', (ev)=>{
        ev.preventDefault();
        dispatchPlace(kind);
      }, { passive: true });
    });
    LOG('Build-Buttons verdrahtet:', items.length);
  }

  function ensureThumbHolders(){
    // Falls dein HTML nur Grauflächen hat, geben wir ihnen data-thumb, damit setThumb trifft.
    qa('.ui-build .item, .ui-build .build-item, .build-grid .item').forEach(el=>{
      if (!el.querySelector('[data-thumb]')) {
        const ph = document.createElement('div');
        ph.setAttribute('data-thumb','');
        Object.assign(ph.style, {
          width:'100%', height:'100%', borderRadius:'8px'
        });
        el.prepend(ph);
      }
    });
  }

  function onOpenPanel(){
    ensureThumbHolders();
    wireButtons();
  }

  // Hook an vorhandene UI-Bridge (falls die offen/zu Events schickt)
  window.addEventListener('ui:build:open', onOpenPanel);
  // Fallback: sofort nach DOM ready einmal versuchen
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(onOpenPanel, 0);
  } else {
    document.addEventListener('DOMContentLoaded', onOpenPanel);
  }

  LOG('geladen (v17.9.10)');
})();
