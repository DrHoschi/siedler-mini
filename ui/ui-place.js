/* ============================================================================
 * Datei   : ui/ui-place.js
 * Zweck   : UI-Overlay für Platzieren (Vorschau + ✓/✕ Buttons)
 * Version : v3.3.0 (robust, ohne offsetWidth, keine Race-Conditions)
 * Events  : hört auf 'cb:place:preview' / 'cb:place:confirm' / 'cb:place:cancel'
 * Daten   : preview.detail = { id,gx,gy,sx,sy,size,w,h,cssScale,{...} }
 * Hinweis : sx/sy/size sind CANVAS-Pixel → werden auf CSS-Pixel umgerechnet.
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[ui-place]';
  const LOG  = (...a) => (window.CBLog?.info || console.log)(TAG, ...a);

  let root, spriteImg, okBtn, cancelBtn;
  let last = null; // letzte gültige Preview (für Reposition bei resize)

  function ensureDOM() {
    if (root) return;

    // Root-Overlay (liegt deckungsgleich über dem Canvas)
    root = document.createElement('div');
    root.className = 'place-overlay';
    root.style.display = 'none';       // unsichtbar bis erste gültige Preview kommt
    root.style.position = 'absolute';
    root.style.left = '0';
    root.style.top  = '0';
    root.style.zIndex = '2000';
    root.style.pointerEvents = 'none'; // Standard: durchklickbar – nur Buttons aktivieren wir

    // Großes Vorschaubild (Sprite/Icon)
    spriteImg = document.createElement('img');
    spriteImg.className = 'place-sprite';
    spriteImg.alt = '';
    spriteImg.style.position = 'absolute';
    spriteImg.style.left = '0';
    spriteImg.style.top  = '0';
    spriteImg.style.width = '100%';
    spriteImg.style.height= '100%';
    spriteImg.style.imageRendering = 'pixelated';
    spriteImg.style.pointerEvents = 'none';
    root.appendChild(spriteImg);

    // Buttons
    okBtn = document.createElement('button');
    okBtn.className = 'place-btn ok';
    okBtn.type = 'button';
    okBtn.textContent = '✓';
    baseBtnStyles(okBtn);
    okBtn.style.left = '8px';
    okBtn.style.top  = '8px';
    okBtn.addEventListener('click', () => {
      if (!last || last.invalid) return;
      window.dispatchEvent(new CustomEvent('cb:place:confirm', { detail: { gx: last.gx, gy: last.gy } }));
    });
    root.appendChild(okBtn);

    cancelBtn = document.createElement('button');
    cancelBtn.className = 'place-btn cancel';
    cancelBtn.type = 'button';
    cancelBtn.textContent = '✕';
    baseBtnStyles(cancelBtn);
    cancelBtn.style.right = '8px';
    cancelBtn.style.top   = '8px';
    cancelBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('cb:place:cancel'));
      hide();
    });
    root.appendChild(cancelBtn);

    // Root an denselben Container wie das Canvas hängen (fallback: body)
    (document.getElementById('game')?.parentElement || document.body).appendChild(root);

    // Reposition bei resize
    window.addEventListener('resize', () => { if (last) apply(last); });

    LOG('ready');
  }

  function baseBtnStyles(btn){
    btn.style.position = 'absolute';
    btn.style.minWidth = '32px';
    btn.style.height   = '32px';
    btn.style.border   = '0';
    btn.style.borderRadius = '8px';
    btn.style.fontWeight = '700';
    btn.style.fontSize   = '18px';
    btn.style.lineHeight = '32px';
    btn.style.cursor     = 'pointer';
    btn.style.pointerEvents = 'auto';     // Buttons sollen klickbar sein
    btn.style.boxShadow  = '0 2px 6px rgba(0,0,0,.25)';
    btn.style.color      = '#fff';

    if (btn.classList.contains('ok')) {
      btn.style.background = 'linear-gradient(#1fb070,#15915a)';
    } else {
      btn.style.background = 'linear-gradient(#d85d5d,#b44a4a)';
    }
  }

  function hide() {
    if (root) root.style.display = 'none';
    last = null;
  }

  // sx,sy,size in CANVAS-Pixeln → auf CSS-Pixel umrechnen und Overlay exakt legen.
  function apply(p) {
    ensureDOM();
    if (!p || p.invalid) { hide(); return; }
    last = p;

    const cssScale = p.cssScale || { x: 1, y: 1 };
    const k       = p.size || 64;
    const wTiles  = p.w || 1;
    const hTiles  = p.h || 1;

    const leftCSS   = (p.sx || 0) / cssScale.x;
    const topCSS    = (p.sy || 0) / cssScale.y;
    const widthCSS  = (k * wTiles) / cssScale.x;
    const heightCSS = (k * hTiles) / cssScale.y;

    // Root auf das Footprint-Rechteck legen
    root.style.display = 'block';
    root.style.left    = `${leftCSS}px`;
    root.style.top     = `${topCSS}px`;
    root.style.width   = `${widthCSS}px`;
    root.style.height  = `${heightCSS}px`;

    // Sprite-Quelle (Engine-Helper, Registry-Fallbacks)
    let spriteURL = null;
    try { spriteURL = window.Game?.__spriteUrlById?.(p.id) || null; } catch {}
    if (!spriteURL){
      const b = window.Registry?.byId?.(p.id);
      spriteURL = b?.spriteUrl || b?.sprite || b?.iconUrl || b?.icon || null;
    }

    if (spriteURL){
      spriteImg.src = spriteURL;
      spriteImg.style.display = 'block';
    } else {
      spriteImg.style.display = 'none';
    }

    // Buttons liegen per CSS-Inset innerhalb (oben links / oben rechts)
    // Keine offsetWidth/Height-Messungen nötig → kein Fehler-Loop mehr.
  }

  // Event-Wireup
  window.addEventListener('cb:place:preview', (e) => {
    const d = e?.detail || {};
    if (!d || d.invalid) { hide(); return; }
    apply(d);
  });
  window.addEventListener('cb:place:confirm', hide);
  window.addEventListener('cb:place:cancel',  hide);

  /* ============================================================================
 * Glue: Ghost → Place (mit Registry-Daten, Grid-Snap, Welt-Insert)
 * Behält deinen Haken/Abbrechen-Flow bei. Kostenabzug: TODO-Hook markiert.
 * ============================================================================
 */
(function(){
  'use strict';

  const LOG = (window.CBLog?.ok || console.log).bind(console, '[ui-place-glue]');

  // --- Helpers ----------------------------------------------------------------
  const tileSize = ()=> (window.Game?.map?.tile|0) || 64;
  const snapTile = (px)=> Math.max(0, Math.round(px / tileSize()));
  function defOf(id){
    // 1) Registry bevorzugt (liefert size, label, outputs etc.)
    if (window.Registry?.getBuildingDef){
      const d = Registry.getBuildingDef(id);
      if (d) return d;
    }
    // 2) Fallback minimal
    return { id, label:id, size:[3,3], icon:'', sprite:'', cost:{}, cat:'misc' };
  }
  // legt die finale Instanz (Tiles) in die Welt
  function placeToWorld(def, tx, ty){
    const w = window.Game?.world || (window.Game.world = {buildings:[], units:[]});
    const inst = {
      id: def.id, type: def.id,
      // Tiles (nicht Pixel)
      x: tx|0, y: ty|0, w: (def.size?.[0]||1)|0, h: (def.size?.[1]||1)|0,
      // optionale Infos
      label: def.label || def.id,
      sprite: def.sprite || '',
      icon: def.icon || '',
      stock: {}
    };
    w.buildings.push(inst);
    LOG('placed ✓', inst);

    // Systeme (Produktion/Träger) hängen bereits am Game-Start; nichts extra.
    // Aber: Wenn das HQ platziert wurde → sofort Träger spawnen (Quality-of-life)
    if (String(def.id).toLowerCase()==='hq'){
      const Cx = (tx + inst.w/2) * tileSize();
      const Cy = (ty + inst.h/2) * tileSize();
      window.Carriers?.spawn?.({ role:'carrier', x: Cx - 24, y: Cy - 10 });
      window.Carriers?.spawn?.({ role:'carrier', x: Cx + 24, y: Cy - 10 });
    }

    // HUD initial refresh (falls nötig)
    window.dispatchEvent(new CustomEvent('cb:res:change', { detail:{ src:def.id, res:'__noop__', delta:0 }}));
  }

  // --- Event-Wiring -----------------------------------------------------------
  // 1) Karte angeklickt → dein Ghost übernimmt bereits Anzeige.
  //    Wir merken uns nur die aktuelle Auswahl (id + def) für den Confirm.
  let current = null;

  window.addEventListener('cb:build:select', (ev) => {
    const id = ev?.detail?.id; if (!id) return;
    current = { id, def: defOf(id) };
    // dein existierender Ghost-Code bleibt aktiv (wir ändern hier nichts)
  });

  // 2) Confirm vom Ghost → Koords aus deinem Ghost lesen, in TILES konvertieren,
  //    Welt-Objekt erzeugen und Event cb:build:place emittieren (für Logger/UI).
  window.addEventListener('cb:place:confirm', (ev) => {
    if (!current) return;

    // Quelle der Pixelkoords: dein Ghost legt id="ghost" oder ähnliches an.
    // Falls du schon Pixel-Koords im Event lieferst (ev.detail.x/y px), nimm die direkt.
    let gx = ev?.detail?.x, gy = ev?.detail?.y;
    if (typeof gx !== 'number' || typeof gy !== 'number'){
      const ghost = document.getElementById('ghost');
      if (ghost){
        // aus CSS position extrahieren
        const r = ghost.getBoundingClientRect();
        // Canvas-Offset berücksichtigen
        const game = document.getElementById('game').getBoundingClientRect();
        gx = r.left - game.left + (ghost.dataset?.ox? +ghost.dataset.ox : 0);
        gy = r.top  - game.top  + (ghost.dataset?.oy? +ghost.dataset.oy : 0);
      } else {
        // Notfalls aus Mouse-Event (falls du eins durchreichst)
        gx = +ev?.detail?.px || 0;
        gy = +ev?.detail?.py || 0;
      }
    }

    // TILES (hartes Snap)
    const tx = snapTile(gx), ty = snapTile(gy);

    // Kostenabzug: hier lässt sich später der Wallet/Stock prüfen.
    // --- TODO: checkCost(current.def.cost) && deductCost(...)
    // if (!canAfford(current.def.cost)) { showToast('Zu wenig Rohstoffe'); return; }

    // Welt-Objekt erzeugen
    placeToWorld(current.def, tx, ty);

    // offizielle Build-Event-Bridge
    window.dispatchEvent(new CustomEvent('cb:build:place', {
      detail:{ id: current.id, x: tx, y: ty, w: current.def.size?.[0]||1, h: current.def.size?.[1]||1, def: current.def }
    }));

    // Auswahl leeren; dein Ghost schließt sich ohnehin nach Confirm
    current = null;
  });

  // 3) Abbrechen vom Ghost → nur Auswahl leeren (dein UI macht das Sichtbare)
  window.addEventListener('cb:build:cancel', () => { current=null; });

})();
})();
