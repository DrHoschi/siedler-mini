/* ============================================================================
 * Datei   : core/camera.cinematic.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.17-cinematic-skip-firstRun
 * Zweck   : "Genialer Start-Zoom-Effekt" als entkoppeltes Modul
 *
 * Idee:
 *  - Startet NICHT in game.js, sondern reagiert nur auf Events / globale APIs.
 *  - Dadurch keine Kamera-Logik-Verknotung mit Game/Map/Units.
 *
 * Ablauf:
 *  (1) Beim ersten HQ-Positions-Event cb:hq:pos {tx,ty}:
 *      - Kamera kurz auf "Max Overview / Fit-to-Map"
 *  (2) Danach Tween (ease-out) zum HQ und Ziel-Zoom (Option 1 = aktueller Zoom)
 *
 * Quality-of-Life:
 *  - Skip/Cancel bei User-Input (pointerdown / wheel / touchstart / keydown)
 *  - Optional: nur beim ersten Start (LocalStorage Flag)
 *  - Optional: Query-Overrides (?cinematic=1 / ?cinematic=0)
 *
 * Abhängigkeiten:
 *  - window.GameCamera (core/camera.js)
 *  - window.GameMap._state (core/game.map.js) für cols/rows/tileSize
 *
 * Events:
 *  - hört: cb:hq:pos
 *  - sendet (optional): cb:cinematic:start / cb:cinematic:done / cb:cinematic:cancel
 * ========================================================================== */

(function(){
  'use strict';

  /* ===========================================
   * Konfiguration
   * =========================================== */

  const TAG  = '[cinematic]';
  const LOG  = (...a)=> (window.CBLog?.info  || console.info )(TAG, ...a);
  const OK   = (...a)=> (window.CBLog?.ok    || console.log  )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  || console.warn )(TAG, ...a);

  // Dauer des Zoom-Flugs (ms)
  const DURATION_MS = 1200;

  // Kleine Verzögerung nach Fit-to-Map, damit der erste Render sicher passiert
  const START_DELAY_MS = 120;

  // LocalStorage Flag (versioniert, damit spätere Änderungen sauber neu laufen können)
  const LS_KEY = 'siedler.cinematic.seen.v1';

  // Debug/Override: Du kannst in der Konsole schnell testen:
  //   window.__CINEMATIC_FORCE__ = true;  // erzwingen
  //   window.__CINEMATIC_DISABLE__ = true; // deaktivieren
  //   window.__SIEDLER_HQ_EDGE_MARGIN_TILES / __SIEDLER_HQ_WATER_MARGIN_TILES (anderen Patch)
  const FORCE   = !!window.__CINEMATIC_FORCE__;
  const DISABLE = !!window.__CINEMATIC_DISABLE__;

  /* ===========================================
   * Hilfsfunktionen
   * =========================================== */

  function emit(name, detail = {}) {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch(_) {}
  }

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  // Ease-Out Cubic (schnell am Anfang, weich zum Ende)
  function easeOutCubic(t){
    t = clamp(t, 0, 1);
    return 1 - Math.pow(1 - t, 3);
  }

  function getCanvas(){
    return document.querySelector('#game');
  }

  function getMapState(){
    // GameMap ist bewusst "einfach": GameMap._state enthält cols/rows/tileSize
    return window.GameMap?._state || null;
  }

  function getCameraApi(){
    // GameCamera ist als globales Objekt implementiert (siehe core/camera.js)
    return window.GameCamera || null;
  }

  function getCameraState(cam){
    // Einige Teile des Codes lesen direkt cam.x/cam.y/cam.zoom,
    // deshalb unterstützen wir beide Varianten.
    if (!cam) return { x:0, y:0, zoom:1 };
    if (typeof cam.getState === 'function') return cam.getState();
    return { x: cam.x ?? 0, y: cam.y ?? 0, zoom: cam.zoom ?? 1 };
  }

  function setCameraState(cam, st){
    if (!cam) return;
    if (typeof cam.setState === 'function') {
      cam.setState(st);
      return;
    }
    // Fallback: direkte Felder setzen (sollte selten nötig sein)
    if (typeof st.x === 'number') cam.x = st.x;
    if (typeof st.y === 'number') cam.y = st.y;
    if (typeof st.zoom === 'number') cam.zoom = st.zoom;
  }

  function centerOffsetFor(worldX, worldY, canvasW, canvasH, zoom){
    // Kamera-Offset (Top-Left) so berechnen, dass worldX/worldY in der Mitte liegt
    const viewW = canvasW / zoom;
    const viewH = canvasH / zoom;
    return {
      x: worldX - viewW / 2,
      y: worldY - viewH / 2
    };
  }

  function computeFitToMap(cam, mapState, canvas){
    // Fit Zoom: ganze Map sichtbar (mit kleinem Padding)
    const cols = mapState?.cols ?? 1;
    const rows = mapState?.rows ?? 1;
    const ts   = mapState?.tileSize ?? 64;

    const worldW = cols * ts;
    const worldH = rows * ts;

    const r = canvas.getBoundingClientRect();
    const canvasW = Math.max(1, r.width);
    const canvasH = Math.max(1, r.height);

    // Fit so, dass Welt ins Canvas passt
    let fitZoom = Math.min(canvasW / worldW, canvasH / worldH);
    // leichtes Padding (damit "Rand" sichtbar bleibt)
    fitZoom *= 0.98;

    // Wenn Kamera clamped: versuche an Min/Max zu halten (falls verfügbar)
    // Wir kennen ZOOM_MIN/ZOOM_MAX nicht direkt; setState wird intern clampen.
    // Trotzdem: harte Grenzen vermeiden (0 oder negative)
    fitZoom = Math.max(0.05, fitZoom);

    // Zentrum der Welt in der Mitte halten
    const center = centerOffsetFor(worldW/2, worldH/2, canvasW, canvasH, fitZoom);

    return { fitZoom, centerX: center.x, centerY: center.y, canvasW, canvasH, worldW, worldH };
  }

  /* ===========================================
   * Hauptlogik
   * =========================================== */

  // Singleton-Guard (falls Skript doppelt eingebunden ist)
  if (window.__CINEMATIC_START__){
    LOG('bereits aktiv – skip');
    return;
  }
  window.__CINEMATIC_START__ = true;

  // Query Overrides: ?cinematic=0 oder ?cinematic=1
  const qs = new URLSearchParams(location.search);
  const qsVal = qs.get('cinematic');
  const qsDisable = (qsVal === '0' || qsVal === 'false' || qsVal === 'off');
  const qsForce   = (qsVal === '1' || qsVal === 'true'  || qsVal === 'on');

  // First-Run check (wenn nicht force)
  const seen = (()=>{
    try { return localStorage.getItem(LS_KEY) === '1'; } catch(_) { return false; }
  })();

  if ((DISABLE || qsDisable) && !FORCE && !qsForce){
    LOG('deaktiviert (Flag/Query).');
    return;
  }
  if (seen && !FORCE && !qsForce){
    LOG('bereits gesehen (LocalStorage) – skip.');
    return;
  }

  let running = false;
  let cancelled = false;
  let rafId = 0;

  function cancel(reason){
    if (!running || cancelled) return;
    cancelled = true;
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    detachSkipInputs();
    WARN('cancel', reason || 'user');
    emit('cb:cinematic:cancel', { reason: String(reason||'user') });
  }

  let skipHandlersAttached = false;
  const onUserInput = (ev)=> cancel(ev?.type || 'input');

  function attachSkipInputs(){
    if (skipHandlersAttached) return;
    skipHandlersAttached = true;
    // Sobald Spieler irgendwas macht: abbrechen
    window.addEventListener('pointerdown', onUserInput, { passive:true, once:true });
    window.addEventListener('touchstart', onUserInput, { passive:true, once:true });
    window.addEventListener('wheel',      onUserInput, { passive:true, once:true });
    window.addEventListener('keydown',    onUserInput, { passive:true, once:true });
  }

  function detachSkipInputs(){
    if (!skipHandlersAttached) return;
    skipHandlersAttached = false;
    window.removeEventListener('pointerdown', onUserInput);
    window.removeEventListener('touchstart', onUserInput);
    window.removeEventListener('wheel',      onUserInput);
    window.removeEventListener('keydown',    onUserInput);
  }

  function markSeen(){
    try { localStorage.setItem(LS_KEY, '1'); } catch(_) {}
  }

  // Der Cinematic startet NUR beim ersten cb:hq:pos.
  addEventListener('cb:hq:pos', (ev)=>{
    if (running || cancelled) return;

    const cam = getCameraApi();
    const mapState = getMapState();
    const canvas = getCanvas();

    if (!cam || !canvas || !mapState){
      WARN('fehlende Abhängigkeiten:', { cam: !!cam, canvas: !!canvas, mapState: !!mapState });
      return;
    }

    const tx = ev?.detail?.tx;
    const ty = ev?.detail?.ty;
    if (typeof tx !== 'number' || typeof ty !== 'number'){
      WARN('cb:hq:pos ohne tx/ty', ev?.detail);
      return;
    }

    // Zielzoom = Option 1: aktueller GameCamera-Zoom (vor Fit-to-Map)
    const before = getCameraState(cam);
    const targetZoom = before.zoom ?? 1;

    // Fit-to-Map State berechnen & setzen
    const fit = computeFitToMap(cam, mapState, canvas);
    setCameraState(cam, { x: fit.centerX, y: fit.centerY, zoom: fit.fitZoom });

    // Zielpunkt = Mitte der HQ-Tile (Weltkoordinaten)
    const ts = mapState.tileSize ?? 64;
    const hqWorldX = (tx + 0.5) * ts;
    const hqWorldY = (ty + 0.5) * ts;

    const r = canvas.getBoundingClientRect();
    const canvasW = Math.max(1, r.width);
    const canvasH = Math.max(1, r.height);

    const targetOffset = centerOffsetFor(hqWorldX, hqWorldY, canvasW, canvasH, targetZoom);

    // Startzustand für Tween = aktueller (nach Fit)
    const start = getCameraState(cam);

    // Cinematic aktiv
    running = true;
    cancelled = false;
    attachSkipInputs();
    emit('cb:cinematic:start', { tx, ty, targetZoom });

    LOG('start', {
      fitZoom: fit.fitZoom,
      targetZoom,
      start,
      target: { x: targetOffset.x, y: targetOffset.y }
    });

    const t0 = performance.now() + START_DELAY_MS;

    function tick(now){
      if (!running || cancelled) return;

      const t = (now - t0) / DURATION_MS;
      const k = easeOutCubic(t);

      // Interpolation
      const x = start.x + (targetOffset.x - start.x) * k;
      const y = start.y + (targetOffset.y - start.y) * k;
      const z = start.zoom + (targetZoom     - start.zoom) * k;

      setCameraState(cam, { x, y, zoom: z });

      if (t < 1){
        rafId = requestAnimationFrame(tick);
      } else {
        // Ende
        running = false;
        detachSkipInputs();
        markSeen();
        OK('done');
        emit('cb:cinematic:done', { tx, ty, targetZoom });
      }
    }

    rafId = requestAnimationFrame(tick);
  });

})();
