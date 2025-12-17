/* ============================================================================
 * Datei   : core/camera.cinematic.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.17-cinematic-proper-longer-zoomtohq
 *
 * Ziel:
 *   • EXACT wie unser "guter Stand": erst komplette Karten-Übersicht,
 *     dann eine saubere, sichtbare Kamerafahrt zum HQ – und am Ende
 *     auf DEINEM Ziel-Zoom (Option 1).
 *
 * WICHTIG:
 *   • Keine "once-only" Logik mehr als Default (kein LocalStorage-Blocker).
 *   • Kein "du musst tippen" – aber falls du während der Fahrt interagierst,
 *     brechen wir sofort ab, damit du Kontrolle hast (Sicherheitsnetz).
 *
 * Konfiguration (optional, fürs Tuning ohne Patch):
 *   window.__CINEMATIC_HOLD_MS__ = 1500;  // wie lange Overview stehen bleibt
 *   window.__CINEMATIC_FLY_MS__  = 1800;  // Dauer der Fahrt zum HQ
 *   window.__DISABLE_CINEMATIC__ = true;  // komplett aus
 *
 * URL:
 *   ?cinematic=0  -> aus
 *   ?cinematic=1  -> an (Default ist ohnehin an)
 * ============================================================================ */

(() => {
  'use strict';

  /* ==========================================================================
   * Logger
   * ========================================================================== */
  const TAG  = '[cinematic]';
  const LOG  = (...a) => (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  /* ==========================================================================
   * Tuning / Defaults
   * ========================================================================== */
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 4.0;

  const HOLD_MS_DEFAULT = 1500;  // <-- Overview sichtbar stehen lassen
  const FLY_MS_DEFAULT  = 1800;  // <-- sichtbare Fahrt, nicht "zack fertig"

  const HOLD_MS = Number.isFinite(window.__CINEMATIC_HOLD_MS__)
    ? Math.max(0, window.__CINEMATIC_HOLD_MS__)
    : HOLD_MS_DEFAULT;

  const FLY_MS = Number.isFinite(window.__CINEMATIC_FLY_MS__)
    ? Math.max(200, window.__CINEMATIC_FLY_MS__)
    : FLY_MS_DEFAULT;

  /* ==========================================================================
   * Helpers
   * ========================================================================== */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function getQueryParam(name){
    try{
      return new URL(window.location.href).searchParams.get(name);
    } catch { return null; }
  }

  function getViewSize(){
    const c = window.Render?.ctx?.canvas || document.getElementById('game');
    if (!c) return { w: 0, h: 0 };
    const r = c.getBoundingClientRect?.();
    return {
      w: (r?.width  || c.width  || 0),
      h: (r?.height || c.height || 0)
    };
  }

  function tileToWorldCenter(tx, ty){
    const ms = window.GameMap?._state;
    const ts = ms?.tileSize || 64;
    return { wx: (tx + 0.5) * ts, wy: (ty + 0.5) * ts };
  }

  function computeFitZoom(){
    const ms = window.GameMap?._state;
    const cols = ms?.cols || 1;
    const rows = ms?.rows || 1;
    const ts   = ms?.tileSize || 64;

    const worldW = cols * ts;
    const worldH = rows * ts;

    const { w: viewW, h: viewH } = getViewSize();
    if (!worldW || !worldH || !viewW || !viewH) return 1;

    const margin = 0.96;
    const z = Math.min(viewW / worldW, viewH / worldH) * margin;
    return clamp(z, ZOOM_MIN, ZOOM_MAX);
  }

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

    const viewWorldW = viewW / z;
    const viewWorldH = viewH / z;

    const x = (worldW - viewWorldW) / 2;
    const y = (worldH - viewWorldH) / 2;

    window.GameCamera?.setState?.({ x, y, zoom: z });
    LOG('overview gesetzt', { zoom: z, x, y });
  }

  /* ==========================================================================
   * State
   * ========================================================================== */
  let hqTile = null;
  let started = false;
  let running = false;
  let rafId = 0;
  let holdTimer = 0;
  let cancelBound = false;

  function cancel(reason){
    if (!running && !holdTimer) return;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;

    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = 0;

    running = false;
    unbindCancelListeners();

    LOG('cancel', { reason });
  }

  function bindCancelListeners(){
    if (cancelBound) return;
    cancelBound = true;

    const onAnyInput = (e) => {
      cancel(e?.type || 'input');
    };

    window.addEventListener('pointerdown', onAnyInput, { passive: true, capture: true });
    window.addEventListener('touchstart',  onAnyInput, { passive: true, capture: true });
    window.addEventListener('wheel',       onAnyInput, { passive: true, capture: true });
    window.addEventListener('keydown',     onAnyInput, { passive: true, capture: true });

    bindCancelListeners._h = onAnyInput;
  }

  function unbindCancelListeners(){
    if (!cancelBound) return;
    cancelBound = false;

    const h = bindCancelListeners._h;
    if (!h) return;

    window.removeEventListener('pointerdown', h, { capture: true });
    window.removeEventListener('touchstart',  h, { capture: true });
    window.removeEventListener('wheel',       h, { capture: true });
    window.removeEventListener('keydown',     h, { capture: true });

    bindCancelListeners._h = null;
  }

  /* ==========================================================================
   * Cinematic: Overview -> Hold -> FlyTo HQ
   * ========================================================================== */
  function flyToHQ(){
    const cam = window.GameCamera;
    if (!cam?.getState || !cam?.setState){
      WARN('GameCamera API fehlt – skip.');
      return;
    }
    if (!hqTile) return;

    // OPTION 1: Zielzoom = Zoom VOR dem Overview (deine Einstellung)
    const pre = cam.getState();
    const targetZoom = clamp(pre?.zoom ?? 1, 0.25, 4.0);

    // 1) Overview setzen
    setOverview();

    // 2) Hold (damit du es siehst)
    bindCancelListeners();

    holdTimer = setTimeout(() => {
      holdTimer = 0;

      const start = cam.getState();

      const { wx, wy } = tileToWorldCenter(hqTile.tx, hqTile.ty);
      const { w: viewW, h: viewH } = getViewSize();

      const endX = wx - (viewW / targetZoom) / 2;
      const endY = wy - (viewH / targetZoom) / 2;

      const end = { x: endX, y: endY, zoom: targetZoom };

      running = true;
      const t0 = performance.now();
      LOG('start', { hqTile: { ...hqTile }, holdMs: HOLD_MS, flyMs: FLY_MS, start, end });

      const step = (now) => {
        if (!running) return;

        const t = clamp((now - t0) / FLY_MS, 0, 1);
        const e = easeOutCubic(t);

        const nx = start.x + (end.x - start.x) * e;
        const ny = start.y + (end.y - start.y) * e;
        const nz = start.zoom + (end.zoom - start.zoom) * e;

        cam.setState({ x: nx, y: ny, zoom: nz });

        if (t < 1){
          rafId = requestAnimationFrame(step);
        } else {
          rafId = 0;
          running = false;
          unbindCancelListeners();
          LOG('done', { end });
        }
      };

      rafId = requestAnimationFrame(step);
    }, HOLD_MS);
  }

  function maybeStart(){
    if (started) return;

    if (window.__DISABLE_CINEMATIC__){
      LOG('skip (__DISABLE_CINEMATIC__)');
      started = true;
      return;
    }

    const qp = getQueryParam('cinematic');
    if (qp === '0'){
      LOG('skip (?cinematic=0)');
      started = true;
      return;
    }

    const ms = window.GameMap?._state;
    const cam = window.GameCamera;

    if (!hqTile) return;
    if (!ms?.ready) return;
    if (!cam?.setState || !cam?.getState) return;

    started = true;
    flyToHQ();
  }

  function waitForReady(){
    const t0 = performance.now();
    const timeoutMs = 5000;

    const poll = () => {
      maybeStart();
      if (started) return;

      if (performance.now() - t0 > timeoutMs){
        WARN('timeout – cinematic nicht gestartet (ready fehlte)', {
          hqTile,
          mapReady: !!window.GameMap?._state?.ready,
          hasCamera: !!window.GameCamera
        });
        started = true;
        return;
      }
      setTimeout(poll, 50);
    };
    poll();
  }

  window.addEventListener('cb:hq:pos', (ev) => {
    const d = ev?.detail;
    if (!d || typeof d.tx !== 'number' || typeof d.ty !== 'number') return;

    if (!hqTile){
      hqTile = { tx: d.tx, ty: d.ty };
      LOG('hq-pos', { ...hqTile });
      waitForReady();
    }
  });

  LOG('module loaded', { HOLD_MS, FLY_MS, qp: getQueryParam('cinematic') });

})();