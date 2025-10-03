/* ============================================================================
 * Datei   : ui/ui-place.js
 * Projekt : Neue Siedler – UI
 * Version : v3.3.0 (Canvas-Offsets, präzise Button-Position, Sprite-Resolver)
 *
 * Zweck   : UI-Overlay für das Platzieren von Gebäuden
 * Highlights:
 *   - Engine liefert sx/sy/size in CANVAS-Pixeln → hier korrekt in CSS-Pixel
 *     umgerechnet und zusätzlich um Canvas-Position + Scroll-Offsets ergänzt.
 *   - Overlay wird exakt über das Footprint-Rechteck gelegt.
 *   - ✓ (links-oben) und ✕ (rechts-oben) liegen IM grünen Ghost-Rahmen.
 *   - Sprite-URL kommt aus der Engine (fallback: Registry).
 *   - Overlay verschwindet zuverlässig bei cancel/confirm.
 * ============================================================================ */

(() => {
  'use strict';

  const TAG = '[ui-place]';
  const LOG = (...a) => (window.CBLog?.info || console.log)(TAG, ...a);

  // DOM-Knoten des Overlays
  let root, img, okBtn, cancelBtn;

  // Referenz auf das Canvas (für Offsets)
  let cvs = null;

  // letzte gültige Preview-Daten (für Re-Layout bei Resize)
  let last = null;

  // -- DOM sicherstellen -----------------------------------------------------
  function ensureDOM() {
    if (root) return;

    // Canvas (wird für getBoundingClientRect benötigt)
    cvs = document.getElementById('game');

    // Root-Container des Overlays
    root = document.createElement('div');
    root.className = 'place-overlay';
    root.style.display = 'none';          // erst sichtbar, wenn Daten ankommen
    root.style.position = 'absolute';     // wir hängen an <body>
    root.style.zIndex = '40';
    root.style.pointerEvents = 'none';    // Klicks gehen standardmäßig „durch“

    // Großes Vorschaubild (Sprite)
    img = document.createElement('img');
    img.className = 'place-sprite';
    img.alt = '';
    Object.assign(img.style, {
      position: 'absolute',
      left: '0', top: '0',
      width: '100%', height: '100%',
      imageRendering: 'pixelated',
      pointerEvents: 'none',
    });
    root.appendChild(img);

    // ✓-Button (links-oben, OK innerhalb)
         // okBtn = document.createElement('button');
    okBtn.innerHTML = '<img class="btn-ico" src="assets/icons/ok.png" alt="OK">';
    okBtn.className = 'place-btn ok';
    okBtn.textContent = '✓';
    styleBtn(okBtn, '#2cc36b');
    okBtn.addEventListener('click', () => {
      if (!last || last.invalid) return;
      // gx/gy kommen aus der Engine-Preview – wir geben sie zurück
      window.dispatchEvent(new CustomEvent('cb:place:confirm', {
        detail: { gx: last.gx, gy: last.gy }
      }));
    });
    root.appendChild(okBtn);

    // ✕-Button (rechts-oben, ABBRECHEN innerhalb)
       // cancelBtn = document.createElement('button');
    cancelBtn.innerHTML = '<img class="btn-ico" src="assets/icons/cancel.png" alt="X">';
    cancelBtn.className = 'place-btn cancel';
    cancelBtn.textContent = '✕';
    styleBtn(cancelBtn, '#e5564c');
    cancelBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('cb:place:cancel'));
      hide();
    });
    root.appendChild(cancelBtn);

    // Overlay an <body> hängen – wir rechnen Canvas-Offsets manuell hinein
    (document.body || document.documentElement).appendChild(root);

    // Bei Resize neu positionieren, wenn Preview aktiv ist
    window.addEventListener('resize', () => { if (last) apply(last); });

    LOG('ready');
  }

  function styleBtn(btn, bg) {
    Object.assign(btn.style, {
      position: 'absolute',
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      border: 'none',
      fontWeight: '700',
      lineHeight: '32px',
      textAlign: 'center',
      boxShadow: '0 2px 6px rgba(0,0,0,.35)',
      color: '#fff',
      background: bg,
      pointerEvents: 'auto', // Buttons sollen klickbar sein
      userSelect: 'none',
    });
  }

  // -- Sichtbarkeit ----------------------------------------------------------
  function hide() {
    if (root) root.style.display = 'none';
    last = null;
  }

  // -- Hauptlogik: Daten anwenden -------------------------------------------
  // p: { id, gx, gy, sx, sy, size, w, h, cssScale, invalid, ... }
  //   - sx/sy/size sind CANVAS-Pixel (Engine-Koordinaten!)
  function apply(p) {
    ensureDOM();
    last = p;

    if (!p || p.invalid) { hide(); return; }

    // Schutzwerte
    const cssScale = p.cssScale || { x: 1, y: 1 };
    const k        = p.size || 64;       // Kachelkante (CANVAS-Pixel)
    const wTiles   = p.w || 1;
    const hTiles   = p.h || 1;

    // Canvas-Box + Dokument-Scroll (damit das Overlay absolut am Body ausgerichtet werden kann)
    const r = cvs?.getBoundingClientRect?.() || { left: 0, top: 0 };
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft || 0;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop  || 0;

    // CANVAS → CSS umrechnen + Canvas-Offsets + Scroll addieren
    const leftCSS   = (p.sx || 0) / cssScale.x + r.left + scrollX;
    const topCSS    = (p.sy || 0) / cssScale.y + r.top  + scrollY;
    const widthCSS  = (k * wTiles) / cssScale.x;
    const heightCSS = (k * hTiles) / cssScale.y;

    // Root exakt auf Footprint legen
    root.style.display = 'block';
    root.style.left    = `${leftCSS}px`;
    root.style.top     = `${topCSS}px`;
    root.style.width   = `${widthCSS}px`;
    root.style.height  = `${heightCSS}px`;

    // Sprite-Quelle: bevorzugt Engine-Resolver, ansonsten Registry
    const resolve = window.Game?.__spriteUrlById;
    const spriteURL =
      (typeof resolve === 'function' && resolve(p.id)) ||
      window.Registry?.byId?.(p.id)?.spriteUrl ||
      window.Registry?.byId?.(p.id)?.sprite    ||
      window.Registry?.byId?.(p.id)?.iconUrl   ||
      window.Registry?.byId?.(p.id)?.icon      ||
      '';

    if (spriteURL) {
      img.src = spriteURL;
      img.style.display = 'block';
      // in der Praxis reicht width/height:100% – wir setzen explizit mit
      // berechneten CSS-Pixeln, um jede Layout-Kaskade zu vermeiden
      img.style.width  = `${widthCSS}px`;
      img.style.height = `${heightCSS}px`;
    } else {
      img.style.display = 'none';
    }

    // Buttons innen an die oberen Ecken setzen (nur left/top verwenden!)
    const btnW = okBtn.offsetWidth || 32;
    const pad  = Math.max(6, Math.round(Math.min(widthCSS, heightCSS) * 0.06));

    // ✓ links-oben
    placeBtn(okBtn, pad, pad);

    // ✕ rechts-oben (mit fixer Breite rechnen)
    placeBtn(cancelBtn, Math.max(0, widthCSS - pad - btnW), pad);
  }

  function placeBtn(btn, leftPx, topPx) {
    btn.style.left = `${leftPx}px`;
    btn.style.top  = `${topPx}px`;
    // Sicherheitsreset, falls frühere Styles vorhanden waren:
    btn.style.right = '';
    btn.style.bottom = '';
  }

  // -- Engine-Events ---------------------------------------------------------
  window.addEventListener('cb:place:preview', (e) => {
    const d = e.detail || {};
    if (!d || d.invalid) { hide(); return; }
    apply(d);
  });

  // Nach Confirm/Cancel Overlay weg
  window.addEventListener('cb:place:confirm', hide);
  window.addEventListener('cb:place:cancel',  hide);
})();
