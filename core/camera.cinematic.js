/* ============================================================================
 * core/camera.cinematic.js
 * ----------------------------------------------------------------------------
 * Cinematic Start-Zoom:
 *   1) Map lädt zuerst in "Übersicht" (Fit-to-Map)
 *   2) Danach smooth zum HQ reinzoomen (Ease-Out) – Zielzoom = aktueller GameCamera-Zoom (Option 1)
 *
 * Trigger:
 *   - cb:map:ready   → Map-Größe/Legend bekannt
 *   - cb:hq:pos      → HQ-Position bekannt (kommt aus GameUnits.setHQPos)
 *
 * Wichtig:
 *   - Dieses Modul verknotet NICHT die bestehende Kamera-Logik.
 *   - Game.js kann bei aktivem Cinematic den 1× Kamera-Fokus überspringen
 *     (wantsControl()).
 *
 * Version: v25.12.16-cinematic-1
 * ========================================================================== */
(() => {
  'use strict';

  const VER = 'v25.12.16-cinematic-1';
  const TAG = '[camera.cinematic]';

  const ENABLED = (window.__SIEDLER_DISABLE_CINEMATIC_START !== true);

  // Animations-Parameter
  const DURATION_MS = 1200; // ca. 1.2s (Wunsch)
  const FIT_MARGIN  = 0.92; // etwas Luft um die Map (UI/HUD etc.)

  let mapInfo = null;
  let targetZoom = null;
  let didOverview = false;
  let didRun = false;

  function LOG(...a){ try{ console.log(TAG, ...a); }catch(_e){} }
  function WARN(...a){ try{ console.warn(TAG, ...a); }catch(_e){} }

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t){ return a + (b - a) * t; }
  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  function getCanvas(){
    return document.getElementById('game') || document.querySelector('canvas#game') || null;
  }

  function getCanvasSize(){
    const c = getCanvas();
    if (!c) return { w: 0, h: 0 };
    const r = c.getBoundingClientRect?.();
    const w = (r && r.width)  ? r.width  : (c.width  || 0);
    const h = (r && r.height) ? r.height : (c.height || 0);
    return { w, h };
  }

  function captureTargetZoomOnce(){
    if (targetZoom != null) return;
    // Option 1: aktueller GameCamera-Zoom bleibt Zielzoom
    const z = window.GameCamera?.zoom;
    if (Number.isFinite(z) && z > 0) targetZoom = z;
    else targetZoom = 1.2;
  }

  function computeFitZoom(){
    if (!mapInfo) return null;

    const ts = window.Game?.tileSize || 64;
    const worldW = (mapInfo.cols|0) * ts;
    const worldH = (mapInfo.rows|0) * ts;

    const { w: cw, h: ch } = getCanvasSize();
    if (!cw || !ch || !worldW || !worldH) return null;

    const fit = Math.min(cw / worldW, ch / worldH) * FIT_MARGIN;
    // sinnvoller Clamp – zu klein/zu groß vermeiden
    return clamp(fit, 0.10, 3.00);
  }

  function setOverviewIfPossible(){
    if (!ENABLED) return false;
    if (!mapInfo) return false;
    if (!window.GameCamera || typeof window.GameCamera.centerOn !== 'function') return false;

    captureTargetZoomOnce();

    const fitZoom = computeFitZoom();
    if (!Number.isFinite(fitZoom)) return false;

    const ts = window.Game?.tileSize || 64;
    const cx = ((mapInfo.cols|0) * ts) / 2;
    const cy = ((mapInfo.rows|0) * ts) / 2;

    window.GameCamera.centerOn(cx, cy, { zoom: fitZoom });
    didOverview = true;
    LOG('Übersicht gesetzt (fit)', { fitZoom, cx, cy });
    return true;
  }

  function getCameraCenterFromState(state){
    const s = state || window.GameCamera?.getState?.();
    if (!s) return { cx: 0, cy: 0, zoom: 1 };

    const { w: cw, h: ch } = getCanvasSize();
    const z = (Number.isFinite(s.zoom) && s.zoom > 0) ? s.zoom : (window.GameCamera?.zoom || 1);

    // GameCamera.x/y = Weltkoordinate vom linken oberen Bildschirm-Eck
    const cx = (s.x || 0) + (cw / (2 * z));
    const cy = (s.y || 0) + (ch / (2 * z));
    return { cx, cy, zoom: z };
  }

  function flyToHQ(tx, ty){
    if (!ENABLED) return;
    if (didRun) return;

    // Sicherstellen, dass wir einmal in der Übersicht waren
    if (!didOverview){
      // Versuch jetzt – wenn Kamera/Canvas noch nicht bereit: später nochmal
      if (!setOverviewIfPossible()){
        requestAnimationFrame(() => flyToHQ(tx, ty));
        return;
      }
    }

    captureTargetZoomOnce();

    const cam = window.GameCamera;
    if (!cam || typeof cam.centerOn !== 'function' || typeof cam.getState !== 'function'){
      requestAnimationFrame(() => flyToHQ(tx, ty));
      return;
    }

    const ts = window.Game?.tileSize || 64;
    const endCx = (tx * ts);
    const endCy = (ty * ts);

    const start = getCameraCenterFromState(cam.getState());
    const startCx = start.cx;
    const startCy = start.cy;
    const startZoom = start.zoom;

    const endZoom = (Number.isFinite(targetZoom) && targetZoom > 0) ? targetZoom : startZoom;

    LOG('Cinematic start', { startCx, startCy, startZoom, endCx, endCy, endZoom });

    const t0 = performance.now();
    didRun = true;

    function step(now){
      const t = clamp((now - t0) / DURATION_MS, 0, 1);
      const e = easeOutCubic(t);

      const cx = lerp(startCx, endCx, e);
      const cy = lerp(startCy, endCy, e);
      const z  = lerp(startZoom, endZoom, e);

      cam.centerOn(cx, cy, { zoom: z });

      if (t < 1){
        requestAnimationFrame(step);
      } else {
        LOG('Cinematic done', VER);
      }
    }

    requestAnimationFrame(step);
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------
  window.addEventListener('cb:map:ready', (ev)=>{
    mapInfo = ev?.detail ? { cols: ev.detail.cols, rows: ev.detail.rows } : null;
    if (!mapInfo || !mapInfo.cols || !mapInfo.rows) return;

    // Zielzoom möglichst früh merken, bevor wir evtl. "fit" setzen
    captureTargetZoomOnce();

    // Übersicht so früh wie möglich setzen (damit der Effekt sichtbar ist)
    setOverviewIfPossible();
  });

  window.addEventListener('cb:hq:pos', (ev)=>{
    const d = ev?.detail || {};
    if (!Number.isFinite(d.tx) || !Number.isFinite(d.ty)) return;
    flyToHQ(d.tx, d.ty);
  });

  // -------------------------------------------------------------------------
  // Exports (für Debug / Game.js Skip)
  // -------------------------------------------------------------------------
  window.CameraCinematic = {
    ver: VER,
    enabled: () => ENABLED,
    wantsControl: () => ENABLED, // Game.js: initialen Fokus skippen
    _state: () => ({ didOverview, didRun, targetZoom, mapInfo })
  };

  LOG('bereit', VER, { ENABLED });
})(); 
