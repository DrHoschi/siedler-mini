/* ============================================================================
 * Datei   : core/camera.cinematic.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.17-cinematic-restore-flyin
 * Zweck   : Start-"Cinematic": Erst Map-Übersicht (Fit-to-Map), dann sanft zum HQ
 *           zoomen (Ease-Out) – ohne die Kamera-Logik zu verknoten.
 *
 * WICHTIG:
 *   • "Abbrechen" bedeutet NICHT, dass du etwas tippen MUSST.
 *     Es ist nur ein Sicherheitsnetz:
 *       Wenn während der Kamerafahrt irgendeine User-Interaktion passiert
 *       (Tippen/Draggen/Pinch/Scroll), wird die Fahrt sofort gestoppt und du
 *       hast volle Kontrolle.
 *
 * Trigger / Daten:
 *   • hört auf cb:hq:pos  (detail: {tx, ty})  -> HQ Tile-Position
 *   • wartet zusätzlich darauf, dass GameMap renderfähig ist (GameMap._state.ready)
 *
 * Konfiguration (optional):
 *   • URL:
 *       ?cinematic=0   -> aus
 *       ?cinematic=1   -> erzwingen (auch wenn schon gelaufen)
 *   • Global:
 *       window.__DISABLE_CINEMATIC__ = true  -> aus
 *
 * Hinweis:
 *   • Wir laufen standardmäßig bei JEDEM Start. (Kein "once-only" Default!)
 *     Wenn du später "nur beim ersten Start" willst, bauen wir das als Option ein.
 * ============================================================================ */

(() => {
  'use strict';

  /* ==========================================================================
   * [Konstanten / Logger]
   * ========================================================================== */
  const TAG  = '[cinematic]';
  const LOG  = (...a) => (window.CBLog?.info  ?? console.log )(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn  ?? console.warn)(TAG, ...a);

  // Zoom-Limits (müssen zu core/camera.js passen; dort: 0.25 .. 4.0)
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 4.0;

  // Dauer der "Fahrt" (ms)
  const DURATION_MS = 1200;

  // Wie lange wir maximal warten, bis Map+Camera verfügbar sind (ms)
  const WAIT_TIMEOUT_MS = 5000;

  // "Ease-Out" (quadratisch) – wirkt natürlich: schnell am Anfang, weich am Ende
  const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);

  /* ==========================================================================
   * [State]
   * ========================================================================== */
  let hqTile = null;          // {tx,ty}
  let started = false;        // ob die Fahrt schon gestartet wurde (pro Session)
  let running = false;        // ob gerade animiert wird
  let rafId = 0;              // requestAnimationFrame id
  let cancelBound = false;    // ob Cancel-Listener gebunden sind

  /* ==========================================================================
   * [Utilities]
   * ========================================================================== */

  /** Query-Parameter lesen (klein, robust) */
  function getQueryParam(name){
    try{
      const u = new URL(window.location.href);
      return u.searchParams.get(name);
    } catch { return null; }
  }

  /** Clamp */
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

  /** Tile -> Welt (Pixel) – Zentrum des Tiles */
  function tileToWorldCenter(tx, ty){
    const ms = window.GameMap?._state;
    const ts = ms?.tileSize || 64;
    return { wx: (tx + 0.5) * ts, wy: (ty + 0.5) * ts };
  }

  /** Viewport-Größe aus Canvas */
  function getViewSize(){
    const c = window.Render?.ctx?.canvas || document.getElementById('game');
    if (!c) return { w: 0, h: 0 };
    try{
      const r = c.getBoundingClientRect();
      return { w: r.width || c.width || 0, h: r.height || c.height || 0 };
    } catch {
      return { w: c.width || 0, h: c.height || 0 };
    }
  }

  /** Fit-to-Map Zoom berechnen: min(viewW/worldW, viewH/worldH) */
  function computeFitZoom(){
    const ms = window.GameMap?._state;
    const cols = ms?.cols || 1;
    const rows = ms?.rows || 1;
    const ts   = ms?.tileSize || 64;

    const worldW = cols * ts;
    const worldH = rows * ts;

    const { w: viewW, h: viewH } = getViewSize();
    if (!worldW || !worldH || !viewW || !viewH) return 1;

    // kleine Sicherheitsmarge, damit wirklich "alles sichtbar" ist
    const margin = 0.96;

    const z = Math.min(viewW / worldW, viewH / worldH) * margin;
    return clamp(z, ZOOM_MIN, ZOOM_MAX);
  }

  /** Kamera so setzen, dass die Map möglichst komplett sichtbar ist */
  function setOverview(){
    const ms = window.GameMap?._state;
    const cols = ms?.cols || 1;
    const rows = ms?.rows || 1;
    const ts   = ms?.tileSize || 64;

    const worldW = cols * ts;
    const worldH = rows * ts;

    const z = computeFitZoom();
    const { w: viewW, h: viewH } = getViewSize();
    if (!viewW || !viewH) return;

    // GameCamera.x/y = Weltkoordinaten der linken oberen Ecke
    const viewWorldW = viewW / z;
    const viewWorldH = viewH / z;

    const x = (worldW - viewWorldW) / 2;
    const y = (worldH - viewWorldH) / 2;

    window.GameCamera?.setState?.({ x, y, zoom: z });
    // Hinweis: setState emittiert cb:camera-change in core/camera.js
    LOG('overview gesetzt', { zoom: z, x, y, worldW, worldH, viewW, viewH });
  }

  /** Cancel / Abbrechen: Stoppt die Animation und gibt Kontrolle */
  function cancel(reason){
    if (!running) return;
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    LOG('cancel', { reason });
  }

  /** Cancel-Listener nur während der Fahrt aktivieren */
  function bindCancelListeners(){
    if (cancelBound) return;
    cancelBound = true;

    const onAnyInput = (e) => {
      // wenn der User interagiert, sofort abbrechen
      cancel(e?.type || 'input');
      unbindCancelListeners();
    };

    // Auf dem ganzen Window, damit es sicher greift (Canvas/DOM egal)
    window.addEventListener('pointerdown', onAnyInput, { passive: true, capture: true });
    window.addEventListener('touchstart',  onAnyInput, { passive: true, capture: true });
    window.addEventListener('wheel',       onAnyInput, { passive: true, capture: true });
    window.addEventListener('keydown',     onAnyInput, { passive: true, capture: true });

    // Merken fürs Entfernen:
    bindCancelListeners._handler = onAnyInput;
  }

  function unbindCancelListeners(){
    if (!cancelBound) return;
    cancelBound = false;

    const h = bindCancelListeners._handler;
    if (!h) return;

    window.removeEventListener('pointerdown', h, { capture: true });
    window.removeEventListener('touchstart',  h, { capture: true });
    window.removeEventListener('wheel',       h, { capture: true });
    window.removeEventListener('keydown',     h, { capture: true });

    bindCancelListeners._handler = null;
  }

  /** Haupt-Animation: von overview -> HQ */
  function flyToHQ(){
    if (!hqTile) return;

    const cam = window.GameCamera;
    if (!cam?.getState || !cam?.setState){
      WARN('GameCamera API fehlt – kann nicht fliegen.');
      return;
    }

    // 1) Overview setzen
    setOverview();

    // 2) Start/Ziel definieren
    const start = cam.getState(); // {x,y,zoom}
    const targetZoom = clamp(start.zoom, ZOOM_MIN, ZOOM_MAX); // Option 1: "dein" Zoom? -> wir nehmen den aktuell eingestellten Zielzoom
    // ACHTUNG: In vielen Setups ist "dein" Zielzoom bereits in cam.zoom gespeichert.
    // Wenn du einen fixen Zielzoom willst, können wir hier z.B. 1.25 setzen.

    // Ziel: HQ in der Mitte, Zoom = targetZoom
    const { wx, wy } = tileToWorldCenter(hqTile.tx, hqTile.ty);
    const { w: viewW, h: viewH } = getViewSize();

    // Um HQ zu zentrieren: x = wx - (viewW/zoom)/2
    const endX = wx - (viewW / targetZoom) / 2;
    const endY = wy - (viewH / targetZoom) / 2;

    const end = { x: endX, y: endY, zoom: targetZoom };

    running = true;
    bindCancelListeners();

    const t0 = performance.now();
    LOG('start', { hqTile: {...hqTile}, start, end, durationMs: DURATION_MS });

    const step = (now) => {
      if (!running) return;

      const t = clamp((now - t0) / DURATION_MS, 0, 1);
      const e = easeOutQuad(t);

      const nx = start.x + (end.x - start.x) * e;
      const ny = start.y + (end.y - start.y) * e;
      const nz = start.zoom + (end.zoom - start.zoom) * e;

      cam.setState({ x: nx, y: ny, zoom: nz });

      if (t < 1){
        rafId = requestAnimationFrame(step);
      } else {
        running = false;
        unbindCancelListeners();
        rafId = 0;
        LOG('done', { end });
      }
    };

    rafId = requestAnimationFrame(step);
  }

  /** Startbedingungen prüfen + auslösen */
  function maybeStart(){
    if (started) return;

    // Globale Deaktivierung
    if (window.__DISABLE_CINEMATIC__){
      LOG('skip (global __DISABLE_CINEMATIC__)');
      started = true;
      return;
    }

    // URL-Steuerung
    const qp = getQueryParam('cinematic');
    if (qp === '0'){
      LOG('skip (?cinematic=0)');
      started = true;
      return;
    }

    // Map + Camera ready?
    const ms = window.GameMap?._state;
    const cam = window.GameCamera;

    if (!hqTile) return;
    if (!ms?.ready) return;
    if (!cam?.setState) return;

    // Erzwingen per URL: ?cinematic=1  -> auch wenn wir schon mal gelaufen wären
    // In diesem Modul läuft es ohnehin pro Session nur einmal (started), daher:
    started = true;
    flyToHQ();
  }

  /** Wartet bis Voraussetzungen da sind (polling mit Timeout) */
  function waitForReady(){
    const t0 = performance.now();

    const poll = () => {
      maybeStart();
      if (started) return;

      const dt = performance.now() - t0;
      if (dt > WAIT_TIMEOUT_MS){
        WARN('timeout – cinematic wurde nicht gestartet (Voraussetzungen fehlten)', {
          hqTile,
          mapReady: !!window.GameMap?._state?.ready,
          hasCamera: !!window.GameCamera
        });
        started = true; // nicht endlos weiter pollen
        return;
      }
      setTimeout(poll, 50);
    };

    poll();
  }

  /* ==========================================================================
   * [Events / Hook]
   * ========================================================================== */

  // Event "HQ Position gesetzt" (aus GameUnits)
  window.addEventListener('cb:hq:pos', (ev) => {
    const d = ev?.detail || null;
    if (!d || typeof d.tx !== 'number' || typeof d.ty !== 'number') return;

    // Wir nehmen immer die ERSTE HQ-Pos pro Session als "Kamera-Ziel".
    // (Es gibt bei dir aktuell Hinweise auf ein "zweites HQ"; das ignorieren wir.)
    if (!hqTile){
      hqTile = { tx: d.tx, ty: d.ty };
      LOG('hq-pos', { ...hqTile });
      waitForReady();
    }
  });

  // Debug: direkt beim Laden zeigen, dass das Modul überhaupt aktiv ist
  LOG('module loaded', {
    disableGlobal: !!window.__DISABLE_CINEMATIC__,
    qpCinematic: getQueryParam('cinematic')
  });

})();
