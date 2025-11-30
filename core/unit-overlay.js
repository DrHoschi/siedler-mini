/* ============================================================================
 * Datei    : core/unit.overlay.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v25.11.30-final
 * Zweck    : Einheiten-Overlay (Carrier-Punkte + getragenes Ressourcen-Icon)
 *
 * Architektur:
 *   – nutzt OverlayHooks.register('units', draw) falls vorhanden
 *   – sonst Fallback: hört auf DOM-Event 'cb:render:overlay'
 *   – liest Einheiten aus:
 *       Game.getUnits() ODER Game.__units ODER window.__units ODER GameUnits.getUnits()
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[unit.overlay]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // Darstellung (vor Zoom, in Pixeln)
  const RADIUS = 8;   // Kreisradius
  const ICON   = 18;  // Icongröße (px)

  // Icon-Fallbacks, falls kein icons-map.js vorhanden ist
  const FALLBACK_ICONS = {
    'res.wood' : 'assets/icons/resources/wood.png',
    'res.stone': 'assets/icons/resources/stone.png',
    'res.fish' : 'assets/icons/resources/fish.png'
  };

  const _imgCache = new Map();

  /** Icon-Pfad für eine Ressource bestimmen ***********************************/
  function resIconPath(resId) {
    if (!resId) return null;
    // Versuch 1: icons-map.js / resolveIcon()
    try {
      if (typeof window.resolveIcon === 'function') {
        const key = String(resId).replace(/^res\./, '');
        const p = window.resolveIcon(key);
        if (p) return p;
      }
    } catch (_e) {
      // ignorieren – wir fallen gleich auf Fallbacks zurück
    }

    // Versuch 2: statische Fallbacks
    const id = String(resId);
    if (FALLBACK_ICONS[id]) {
      return FALLBACK_ICONS[id];
    }

    return null;
  }

  /** Bild laden (mit einfachem Cache) ******************************************/
  function getIconImage(resId) {
    const path = resIconPath(resId);
    if (!path) return null;

    if (_imgCache.has(path)) {
      return _imgCache.get(path);
    }

    const img = new Image();
    img.src = path;
    _imgCache.set(path, img);
    return img;
  }

  /** Einheiten-Quelle robust ermitteln *****************************************/
  function getUnitsSafe() {
    try {
      // 1) Game.getUnits()
      if (window.Game && typeof window.Game.getUnits === 'function') {
        const u = window.Game.getUnits();
        if (Array.isArray(u)) return u;
      }
      // 2) GameUnits.getUnits()
      if (window.GameUnits && typeof window.GameUnits.getUnits === 'function') {
        const u = window.GameUnits.getUnits();
        if (Array.isArray(u)) return u;
      }
      // 3) Game.__units
      if (Array.isArray(window.Game?.__units)) return window.Game.__units;
      // 4) globales __units
      if (Array.isArray(window.__units)) return window.__units;
    } catch (_e) {
      // bewusst ignorieren – wir liefern unten ein leeres Array zurück
    }
    return [];
  }

  /** Ein Carrier-Objekt in Weltpixel-Koordinaten (Mitte der Tile) *************/
  function unitToWorldPx(u, ts) {
    const cx = (u.x || 0) * ts + ts / 2;
    const cy = (u.y || 0) * ts + ts / 2;
    const resId = (u.carrying?.res) || (u.carry?.id) || null; // beide Varianten unterstützen
    return { x: cx, y: cy, resId };
  }

  /** Prüfen, ob etwas im sichtbaren Bereich liegt ******************************/
  function isOnScreen(px, py, cam, padding = 64) {
    const left   = cam.x - padding;
    const top    = cam.y - padding;
    const right  = cam.x + cam.w + padding;
    const bottom = cam.y + cam.h + padding;
    return px >= left && px <= right && py >= top && py <= bottom;
  }

  /** Carrier zeichnen (auf bereits transformiertem ctx) ************************/
  function drawCarrier(ctx, sx, sy, zoom, resId) {
    const r = RADIUS * zoom;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle   = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth   = 1.5 * zoom;
    ctx.fill();
    ctx.stroke();

    if (!resId) return;
    const img = getIconImage(resId);
    if (!img || !img.complete) return;

    const size = ICON * zoom;
    ctx.drawImage(
      img,
      sx - size / 2,
      sy - r - size - 2 * zoom, // etwas über dem Kopf
      size,
      size
    );
  }

  /** Haupt-Zeichenroutine für OverlayHooks ************************************/
  function draw(ctx, state) {
    try {
      const units = getUnitsSafe();
      if (!units.length) return;

      const ts = window.Game?.tileSize || 32;

      // Kamera ermitteln
      let camState = state?.camera || null;
      if (!camState) {
        if (window.GameCamera && typeof window.GameCamera.getState === 'function') {
          camState = window.GameCamera.getState();
        } else if (window.Game && typeof window.Game.getCamera === 'function') {
          camState = window.Game.getCamera();
        }
      }
      if (!camState) {
        // Fallback: ganze Canvas als Viewport annehmen
        camState = {
          x: 0,
          y: 0,
          w: ctx.canvas.width,
          h: ctx.canvas.height,
          zoom: 1
        };
      }

      const camX   = camState.x || 0;
      const camY   = camState.y || 0;
      const zoom   = camState.zoom || 1;
      const viewW  = camState.w || ctx.canvas.width;
      const viewH  = camState.h || ctx.canvas.height;

      ctx.save();
      // Kamera-Transformation (Welt → Screen)
      ctx.translate(-camX * zoom, -camY * zoom);
      ctx.scale(zoom, zoom);

      for (const u of units) {
        if (u.type !== 'carrier') continue;

        const wpos = unitToWorldPx(u, ts);
        if (!isOnScreen(wpos.x, wpos.y, { x: camX, y: camY, w: viewW, h: viewH })) {
          continue;
        }

        // zurück in "Screen-Koordinaten" für Kreis-Zeichnung
        const sx = wpos.x;
        const sy = wpos.y;
        // Kreis und Icon zeichnen (Kreis wird im Weltmaßstab gezeichnet, daher zoom in drawCarrier)
        drawCarrier(ctx, sx, sy, 1 / zoom, wpos.resId);
      }

      ctx.restore();
    } catch (err) {
      WARN('Fehler im draw()', err);
    }
  }

  /** Registrierung bei OverlayHooks oder per Fallback **************************/
  function registerWithOverlayHooks() {
    if (!window.OverlayHooks || typeof window.OverlayHooks.register !== 'function') {
      return false;
    }
    window.OverlayHooks.register('units', draw);
    LOG('Overlay über OverlayHooks.register("units", draw) registriert');
    return true;
  }

  function registerFallbackListener() {
    // Fallback: wir hören auf ein generisches Overlay-Event und bekommen ctx über detail.ctx
    try {
      window.addEventListener('cb:render:overlay', (ev) => {
        const ctx = ev?.detail?.ctx;
        const state = ev?.detail?.state || {};
        if (!ctx) return;
        draw(ctx, state);
      });
      LOG('Fallback-Overlay-Listener (cb:render:overlay) registriert');
    } catch (err) {
      WARN('Konnte Fallback-Listener nicht registrieren', err);
    }
  }

  function registerNow(attempt = 0) {
    if (registerWithOverlayHooks()) return;
    if (attempt === 0) {
      // Beim ersten Mal direkt Fallback aktivieren
      registerFallbackListener();
    }
    // Ein paar Mal erneut versuchen, bis OverlayHooks geladen ist
    if (attempt < 10) {
      setTimeout(() => registerNow(attempt + 1), 1000);
    }
  }

  registerNow();
  LOG('Modul geladen v25.11.30-final');
})();
