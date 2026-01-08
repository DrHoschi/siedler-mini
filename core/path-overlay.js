/* ============================================================================
 * Datei   : core/path-overlay.js
 * Projekt : Neue Siedler – Trampelpfade (PathOverlay)
 * Version : v4.9.1-path-stamps-base (2026-01-08)
 *
 * ZIEL DIESER STUFE (A):
 *   - Pfade wieder SICHTBAR machen (stabil)
 *   - Center-Pivot im Atlas wird genutzt (kein zusätzlicher Offset!)
 *   - NUR Stamps (Kreise) – KEIN altes Tile/Heatmap-System mehr
 *   - Quelle: cb:unit:step (Tile-Schritte)
 *
 * NÄCHSTER SCHRITT (B):
 *   - Umstellung auf echte Move-Segmente + 16px Sampling entlang der Linie
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[path-overlay]';
  const LOG  = (window.CBLog?.info  || console.info ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);

  // -------------------------------------------------------------------------
  // KONFIG (Stage A)
  // -------------------------------------------------------------------------
  const CFG = {
    enabled : true,     // global visible
    stamps  : true,     // draw circles
    decay   : true,     // fade out over time
    decayPerSecond: 0.06, // intensity loss per second (0..1)

    // Atlas / Frames
    atlasKey : 'path_sprite_atlas',
    // Wenn du lieber "path_00" etc willst, passe prefix an.
    // Wir wählen pro Stamp random aus allen Frames im Atlas.
    framePrefix: 'path_',

    // Stärke / Alpha
    maxAlpha: 0.65,
    minAlpha: 0.10,

    // Debug
    debugLogEveryNStamps: 0 // 0 = aus
  };

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  // Wir speichern nur noch STAMPS in Welt/Tiles – KEIN Heatmap-Grid.
  // Key: "tx,ty" -> { tx, ty, v }
  const _stamps = new Map();

  // Für throttled debug logging
  let _stampCounter = 0;
  let _lastDecayTs = performance.now();

  // -------------------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------------------
  function getTileSize(){
    // Standard: 64 – wird bei dir dynamisch sein (z.B. 64 oder 128)
    return (window.GameMap && typeof window.GameMap.tileSize === 'number')
      ? window.GameMap.tileSize
      : 64;
  }

  function keyOf(tx, ty){ return String(tx) + ',' + String(ty); }

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function pickPathFrame(){
    // Nutzt Assets.listFrames wenn verfügbar (robust, weil Atlas-JSON evtl. nicht geladen)
    try{
      const names = window.Assets?.listFrames?.(CFG.atlasKey, CFG.framePrefix) || [];
      if (!names.length) return null;
      return names[(Math.random() * names.length) | 0];
    }catch(e){ return null; }
  }

  function stampAtTile(tx, ty, amount=1){
    if (!CFG.enabled) return;
    const k = keyOf(tx, ty);
    const cur = _stamps.get(k);
    if (cur){
      cur.v = clamp(cur.v + amount, 0, 1);
    } else {
      _stamps.set(k, { tx, ty, v: clamp(amount, 0, 1) });
    }

    _stampCounter++;
    if (CFG.debugLogEveryNStamps > 0 && (_stampCounter % CFG.debugLogEveryNStamps === 0)){
      LOG('stamps:', _stamps.size, 'last:', tx, ty);
    }
  }

  function decayTick(now){
    if (!CFG.decay) return;
    const dt = Math.max(0, (now - _lastDecayTs) / 1000);
    _lastDecayTs = now;
    if (dt <= 0) return;

    const dec = CFG.decayPerSecond * dt;
    if (dec <= 0) return;

    for (const [k, s] of _stamps){
      s.v -= dec;
      if (s.v <= 0.001) _stamps.delete(k);
    }
  }

  function applyWorldTransform(ctx, cam){
    const zoom = cam?.zoom ?? 1;
    const camX = cam?.x ?? 0;
    const camY = cam?.y ?? 0;
    ctx.setTransform(zoom, 0, 0, zoom, -camX * zoom, -camY * zoom);
  }

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  function draw(ctx, cam){
    if (!CFG.enabled) return;
    if (!CFG.stamps) return;
    if (!ctx) return;

    decayTick(performance.now());
    applyWorldTransform(ctx, cam);

    const tileSize = getTileSize();

    // Wir zeichnen die Stamps im WORLD-SPACE (Pixel), aber pro Tile-Mitte.
    // WICHTIG: Wir nutzen Assets.drawAtlasFrame mit PIVOT aus Atlas (center pivot).
    // Deshalb: worldX/worldY = Mittelpunkt (tile center). KEIN zusätzlicher Offset!
    const A = window.Assets;
    if (!A || typeof A.drawAtlasFrame !== 'function') return;

    for (const s of _stamps.values()){
      const alpha = clamp(CFG.minAlpha + s.v * (CFG.maxAlpha - CFG.minAlpha), 0, 1);

      const worldX = (s.tx + 0.5) * tileSize;
      const worldY = (s.ty + 0.5) * tileSize;

      const frame = pickPathFrame();
      if (!frame) continue;

      ctx.save();
      ctx.globalAlpha = alpha;

      // align default in Assets = 'pivot' → nutzt fr.pivotX/pivotY
      A.drawAtlasFrame(ctx, CFG.atlasKey, frame, worldX, worldY, {
        align: 'pivot',
        scale: 1
      });

      ctx.restore();
    }
  }

  // -------------------------------------------------------------------------
  // EVENTS (Inspector + Gameplay)
  // -------------------------------------------------------------------------
  function onUnitStep(ev){
    const d = ev?.detail;
    if (!d) return;
    const tx = d.tx;
    const ty = d.ty;
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;
    stampAtTile(tx, ty, 0.45);
  }

  function onToggleStamps(flag){
    CFG.stamps = !!flag;
    LOG('stamps:', CFG.stamps);
  }

  function onToggleOverlay(flag){
    CFG.enabled = !!flag;
    LOG('enabled:', CFG.enabled);
  }

  function onDecay(flag){
    CFG.decay = !!flag;
    LOG('decay:', CFG.decay);
  }

  function onDecaySpeed(v){
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    CFG.decayPerSecond = clamp(n, 0, 1);
    LOG('decayPerSecond:', CFG.decayPerSecond);
  }

  function clearAll(){
    _stamps.clear();
    LOG('clear');
  }

  // -------------------------------------------------------------------------
  // PUBLIC API (global)
  // -------------------------------------------------------------------------
  const API = {
    version: 'v4.9.1-path-stamps-base',
    cfg: CFG,

    // state
    get stampsCount(){ return _stamps.size; },

    // controls
    enable(flag=true){ onToggleOverlay(flag); },
    setStamps(flag=true){ onToggleStamps(flag); },
    setDecay(flag=true){ onDecay(flag); },
    setDecaySpeed(v){ onDecaySpeed(v); },
    clear(){ clearAll(); },

    // draw hook
    draw
  };

  window.PathOverlay = API;

  // -------------------------------------------------------------------------
  // HOOK IN OVERLAYHOOKS
  // -------------------------------------------------------------------------
  function register(){
    if (!window.OverlayHooks || typeof window.OverlayHooks.register !== 'function') return false;
    window.OverlayHooks.register('paths', draw);
    window.OverlayHooks.enable?.('paths', true);
    return true;
  }

  (function waitForHooks(){
    let tries = 0;
    const tick = ()=>{
      if (register()) {
        LOG('registered in OverlayHooks');
        return;
      }
      tries++;
      if (tries > 240) {
        WARN('OverlayHooks nicht gefunden – Pfad-Overlay wird nicht gerendert.');
        return;
      }
      setTimeout(tick, 16);
    };
    tick();
  })();

  // -------------------------------------------------------------------------
  // GLOBAL EVENT WIRING
  // -------------------------------------------------------------------------
  window.addEventListener('cb:unit:step', onUnitStep);

  // Inspector toggles (inspector.tab.paths-v1.js)
  window.addEventListener('cb:path:stamps:on',  ()=>onToggleStamps(true));
  window.addEventListener('cb:path:stamps:off', ()=>onToggleStamps(false));

  window.addEventListener('cb:path:overlay:on',  ()=>onToggleOverlay(true));
  window.addEventListener('cb:path:overlay:off', ()=>onToggleOverlay(false));

  // Heatmap Events existieren im Inspector – wir ignorieren sie bewusst,
  // weil du das alte Tile-System entfernen willst.
  window.addEventListener('cb:path:heatmap:on',  ()=>LOG('heatmap:on ignoriert (Tile-System entfernt)'));
  window.addEventListener('cb:path:heatmap:off', ()=>LOG('heatmap:off ignoriert (Tile-System entfernt)'));

  window.addEventListener('cb:path:decay:on',     ()=>onDecay(true));
  window.addEventListener('cb:path:decay:off',    ()=>onDecay(false));
  window.addEventListener('cb:path:decay:freeze', ()=>onDecay(false));
  window.addEventListener('cb:path:decay:speed',  (ev)=>onDecaySpeed(ev?.detail?.speed ?? ev?.detail ?? ev));

  window.addEventListener('cb:path:clear', clearAll);

  // State request (für Debug/Inspector)
  window.addEventListener('cb:path:state', ()=>{
    LOG('state:', {
      enabled: CFG.enabled,
      stamps: CFG.stamps,
      decay: CFG.decay,
      decayPerSecond: CFG.decayPerSecond,
      stampsCount: _stamps.size
    });
  });

})();
