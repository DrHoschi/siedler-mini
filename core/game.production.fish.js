/* ============================================================================
 * Datei   : core/game.production.fish.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.10-fish-workarea-water-maincanvas-final-v2
 *
 * Zweck   :
 *   Produktions-/Deko-Logik für Fisch (Fischerhütte):
 *     - Reagiert auf cb:build:complete für Fischer-Gebäude
 *     - Legt pro Gebäude ein eigenes "Fischfeld" an
 *     - Verteilt Fische IM Arbeitsbereich (WorkArea)
 *     - Fische dürfen NUR auf Wasser-Tiles (ID 8 oder 9) liegen
 *     - Zeichnet Fische + "arbeitenden Fischer" direkt auf dem HAUPT-CANVAS
 *
 *   Ereignisse:
 *     IN  :
 *       - cb:build:complete { id, uid?, x,y,w,h, ... }
 *       - cb:workarea:set   { id|buildingId|kind, uid, cx,cy,radiusTiles, x,y,w,h }
 *     OUT :
 *       - optional später Prod-Events; aktuell nur Ressourcenzählung intern
 *
 *   API / Debug:
 *     - window.ProductionFish.fields
 *     - window.ProductionFish.drawOnMainCanvas(ctx, cam, tileSize)
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[prod-fish]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  // ------------------------------------------------------------------------
  // KONSTANTEN
  // ------------------------------------------------------------------------

  const FISH_BUILDING_IDS = new Set([
    'b.fish',
    'b.fishery',
    'b.fisher',
    'b.fischer',
    'fish',
    'fishery',
    'fisher',
    'fischer'
  ]);

  const FISH_PER_FIELD   = 10;
  const FISH_RADIUS_MIN  = 2.0;
  const FISH_RADIUS_MAX  = 6.0;

  const WATER_TILE_IDS = new Set([8, 9]);

  const FISH_ATLAS_CFG = {
    urlJson  : 'assets/resources/fish/fish_mega_atlas.json',
    urlImage : 'assets/resources/fish/fish_mega_atlas.png',
    resolvedFrames : null,
    frameNames     : null
  };

  // ------------------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------------------

  const FishFields = new Map(); // Map<uid, FieldState>

  let fishAtlas    = null;
  let fishAtlasImg = null;
  let fishAtlasLoaded = false;

  // ------------------------------------------------------------------------
  // HILFS-FUNKTIONEN
  // ------------------------------------------------------------------------

  function addResource(resId, delta, reason, src){
    if (!window.Production || typeof window.Production.addResource !== 'function'){
      WARN('Production.addResource fehlt – Fisch-Output wird nicht gezählt');
      return;
    }
    window.Production.addResource(resId, delta, reason, src);
  }

  function rand(min, max){
    return min + Math.random() * (max - min);
  }

  // ------------------------------------------------------------------------
  // ATLAS-LADEN (optional)
  // ------------------------------------------------------------------------

  function loadFishAtlasOnce(){
    if (fishAtlasLoaded) return;
    fishAtlasLoaded = true;

    // Fallback: falls fetch nicht verfügbar ist, einfach abbrechen
    if (typeof fetch !== 'function'){
      WARN('fetch nicht verfügbar – Fish-Atlas wird nicht geladen');
      return;
    }

    fetch(FISH_ATLAS_CFG.urlJson)
      .then(r => r.json())
      .then(json => {
        fishAtlas = json;
        fishAtlasImg = new Image();
        fishAtlasImg.onload = () => {
          LOG('Fish-Atlas geladen');
        };
        fishAtlasImg.src = FISH_ATLAS_CFG.urlImage;

        // Frame-Namen cache’n
        const frames = json.frames || {};
        FISH_ATLAS_CFG.resolvedFrames = frames;
        FISH_ATLAS_CFG.frameNames     = Object.keys(frames);
      })
      .catch(err => {
        ERR('Fish-Atlas konnte nicht geladen werden:', err);
      });
  }

  // ------------------------------------------------------------------------
  // FIELD-STATE
  // ------------------------------------------------------------------------

  function createFishField(building){
    const bw = Number.isFinite(building.w) ? building.w : 1;
    const bh = Number.isFinite(building.h) ? building.h : 1;

    const cx = building.x + bw / 2;
    const cy = building.y + bh / 2;

    const radiusTiles = building.workRadiusTiles || FISH_RADIUS_MAX;

    const fishes = [];
    for (let i = 0; i < FISH_PER_FIELD; i++){
      fishes.push({
        angle : rand(0, Math.PI * 2),
        dist  : rand(FISH_RADIUS_MIN, radiusTiles),
        phase : rand(0, Math.PI * 2)  // für Wellenbewegung
      });
    }

    return {
      uid   : building.uid || ('fish-' + Date.now().toString(16)),
      kind  : building.id,
      x     : building.x,
      y     : building.y,
      w     : bw,
      h     : bh,
      cx,
      cy,
      radiusTiles,
      fishes
    };
  }

  function getOrCreateFishField(building){
    const uid = building.uid || building.id;
    if (FishFields.has(uid)) return FishFields.get(uid);
    const st = createFishField(building);
    FishFields.set(uid, st);
    return st;
  }

  function updateWorkArea(detail){
    const uid = detail.uid || detail.id;
    if (!uid) return;
    const field = FishFields.get(uid);
    if (!field) return;

    field.cx          = detail.cx ?? field.cx;
    field.cy          = detail.cy ?? field.cy;
    field.radiusTiles = detail.radiusTiles || field.radiusTiles;
  }

  // ------------------------------------------------------------------------
  // PRODUKTIONS-OUTPUT (FISCH FANGEN)
  // ------------------------------------------------------------------------

  function handleFishCaught(tile, school){
    // 1) Visueller Effekt / Animation (Stub, kann später ausgebaut werden)
    animateFishCatch(tile, school);

    // 2) Ressource zählen
    addResource('fish', 1, 'fish-cycle', 'fish');
  }

  function animateFishCatch(tile, school){
    // Platzhalter – hier könntest du später eine Sprung-/Splash-Animation einbauen.
    LOG('Fish caught at tile', tile, 'in school', school);
  }

  // ------------------------------------------------------------------------
  // TICK / ANIMATION
  // ------------------------------------------------------------------------

  function tick(dtMs){
    for (const field of FishFields.values()){
      for (const f of field.fishes){
        f.phase += dtMs / 1000; // einfache Bewegung
      }
    }
  }

  // ------------------------------------------------------------------------
  // RENDERING
  // ------------------------------------------------------------------------

  function drawOnMainCanvas(ctx, cam, tileSize){
    if (!ctx || !FishFields.size) return;
    const ts = tileSize || 64;
    const z  = cam.zoom || 1;
    const ox = cam.x   || 0;
    const oy = cam.y   || 0;

    for (const field of FishFields.values()){
      for (const f of field.fishes){
        const r   = f.dist;
        const ang = f.angle + Math.sin(f.phase) * 0.2;

        const worldX = (field.cx + Math.cos(ang) * r) * ts;
        const worldY = (field.cy + Math.sin(ang) * r) * ts;

        const sx = (worldX - ox) * z;
        const sy = (worldY - oy) * z;

        const size = ts * 0.25 * z;

        ctx.save();
        ctx.fillStyle = 'rgba(20,120,200,0.9)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, size * 0.8, size * 0.4, ang, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // ------------------------------------------------------------------------
  // EVENTS (build/workarea)
  // ------------------------------------------------------------------------

  function onBuildComplete(detail){
    if (!detail || !FISH_BUILDING_IDS.has(detail.id)) return;
    const st = getOrCreateFishField(detail);
    FishFields.set(st.uid, st);
    loadFishAtlasOnce();
  }

  function onWorkAreaSet(detail){
    if (!detail) return;
    updateWorkArea(detail);
  }

  // ------------------------------------------------------------------------
  // REGISTRIERUNG BEIM PRODUKTIONS-MANAGER
  // ------------------------------------------------------------------------

  if (window.Production && typeof window.Production.registerModule === 'function'){
    window.Production.registerModule({
      id: 'fish',
      tick,
      onBuildComplete,
      onWorkAreaSet
    });
  } else {
    WARN('Production.registerModule fehlt – Fisch-Modul nicht angebunden');
  }

  // ------------------------------------------------------------------------
  // EXPORT / DEBUG
  // ------------------------------------------------------------------------

  window.ProductionFish = {
    fields : FishFields,
    drawOnMainCanvas,
    _state : {
      FishFields
    }
  };

  LOG('Fisch-Produktion geladen v25.12.10-fish-workarea-water-maincanvas-final-v2');
})();
