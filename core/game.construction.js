/* ============================================================================
 * Datei   : core/game.construction.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.30-buildstep4-multiphasic
 *
 * Zweck   :
 *   - Mehrstufige Baustellen-Logik:
 *       Bild 0 → Bild 1 → Bild 2 → fertiges Gebäude
 *   - Ressourcen werden an Baustelle geliefert (cb:build:deliver)
 *   - Wenn alle Needs erfüllt sind:
 *       → zwei Bauarbeiter werden gespawnt
 *       → 5s Bild 1 (Bauphase 1)
 *       → 5s Bild 2 (Bauphase 2)
 *       → dann fertiges Gebäude
 *   - Zeichnet Boden-Ressourcenkugeln + Fortschrittsbalken
 *   - Zeichnet einfache Bauarbeiter-Kreise, die hin- und herlaufen
 *   - Meldet fertige Gebäude per cb:build:complete
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[construction]';
  const LOG  = (...a)=> (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // ---------------------------------------------------------------------------
  // Phasen & Konstanten
  // ---------------------------------------------------------------------------

  // Grobe Bau-Phasen (für Zustandsautomat)
  const PHASE = {
    SITE    : 0,  // nur Baustelle / Material sammeln (Bild 0)
    BUILD   : 1,  // Bau läuft (Bild 1 + 2)
    COMPLETE: 2   // fertig (fertiges Gebäude)
  };

  // Bauzeit, nachdem alle Ressourcen da sind (in Millisekunden)
  // → 5s Bild 1 + 5s Bild 2 = 10s
  const BUILD_TOTAL_TIME_MS   = 10000;
  const BUILD_STAGE1_TIME_MS  = 5000;   // Grenze zwischen Bild 1 und Bild 2

  // Bauarbeiter-Konstanten
  const BUILDER_COUNT         = 2;
  const BUILDER_SPEED_TPS     = 1.2;    // Tiles pro Sekunde

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen Basis
  // ---------------------------------------------------------------------------

  function getBuildings(){
    return (window.Game && Array.isArray(window.Game.buildings))
      ? window.Game.buildings
      : [];
  }

  function toNumber(v, fallback){
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /**
   * Gebäude finden, dessen Tile-Rechteck die übergebene Position enthält.
   */
  function findBuildingAt(posX, posY){
    const list = getBuildings();
    if (!list.length) return null;

    for (const b of list){
      if (!b) continue;

      const bx = toNumber(b.x, NaN);
      const by = toNumber(b.y, NaN);
      const bw = toNumber(b.w, 1);
      const bh = toNumber(b.h, 1);

      if (!Number.isFinite(bx) || !Number.isFinite(by)) continue;

      const inX = posX >= bx && posX < bx + bw;
      const inY = posY >= by && posY < by + bh;

      if (inX && inY) return b;
    }
    return null;
  }

  /**
   * Grundzustand für Baustellen-Felder sicherstellen.
   *
   * WICHTIG:
   *   buildStage:
   *     0 = Baustelle Bild 0
   *     1 = Baustelle Bild 1
   *     2 = Baustelle Bild 2
   *     3 = fertiges Gebäude
   */
  function ensureConstructionState(b){
    if (!b) return;

    // Soll-Kosten
    if (!b.needs || typeof b.needs !== 'object'){
      const src = (b.cost && typeof b.cost === 'object') ? b.cost : null;
      const fallback = { wood: 2, stone: 1 };

      const needs = {};
      const srcUse = src || fallback;

      for (const key in srcUse){
        const n = toNumber(srcUse[key], 0);
        if (n > 0) needs[key] = n;
      }
      b.needs = needs;
    }

    // Delivered
    if (!b.delivered || typeof b.delivered !== 'object'){
      b.delivered = {};
      for (const k in b.needs){
        b.delivered[k] = 0;
      }
    }

    // Drops (Boden-Ressourcen)
    if (!Array.isArray(b.drops)){
      b.drops = [];
    }

    // Phase
    if (typeof b.buildPhase !== 'number'){
      b.buildPhase = PHASE.SITE;
    }

    // Zeit / Progress
    if (typeof b.buildTime !== 'number' || b.buildTime <= 0){
      b.buildTime = BUILD_TOTAL_TIME_MS;
    }
    if (typeof b.buildElapsed !== 'number'){
      b.buildElapsed = 0;
    }
    if (typeof b.buildProgress !== 'number'){
      b.buildProgress = 0;
    }

    // Status-String
    if (typeof b.status !== 'string'){
      b.status = 'pending';
    }

    // Unter-Baustufe (nur während BUILD)
    if (typeof b.buildSubStage !== 'number'){
      // 0 = Vorbereitung, 1 = Bild1, 2 = Bild2
      b.buildSubStage = 0;
    }

    // Visuelle Stufe für Renderer:
    // 0,1,2 = Baustellen-Bilder, 3 = fertiges Gebäude
    if (typeof b.buildStage !== 'number'){
      if (b.buildPhase === PHASE.COMPLETE){
        b.buildStage = 3;
      } else {
        b.buildStage = 0;
      }
    }

    // Lokale Bauarbeiter der Baustelle
    if (!Array.isArray(b.builders)){
      b.builders = [];
    }
  }

  /**
   * Prüfen, ob alle benötigten Ressourcen geliefert wurden.
   */
  function hasAllMaterial(b){
    if (!b || !b.needs) return false;
    const delivered = b.delivered || {};
    for (const key in b.needs){
      const need = toNumber(b.needs[key], 0);
      if (!need) continue;
      const have = toNumber(delivered[key], 0);
      if (have < need) return false;
    }
    return true;
  }

  /**
   * Drop (Ressourcenkugel) an / um Baustelle erzeugen.
   */
  function addDrop(b, resKey, posX, posY){
    ensureConstructionState(b);

    const bw = toNumber(b.w, 1);
    const bh = toNumber(b.h, 1);

    const cx = b.x + bw / 2;
    const cy = b.y + bh / 2;

    const radius = Math.max(bw, bh) * 0.4;
    const angle  = Math.random() * Math.PI * 2;

    const dropX = cx + Math.cos(angle) * radius;
    const dropY = cy + Math.sin(angle) * radius;

    const drop = {
      res  : resKey,
      x    : dropX,
      y    : dropY,
      time : performance.now?.() ?? Date.now()
    };
    b.drops.push(drop);
  }

  // ---------------------------------------------------------------------------
  // Bauarbeiter (lokal pro Baustelle)
  // ---------------------------------------------------------------------------

  function spawnBuilders(b){
    ensureConstructionState(b);

    const bw = toNumber(b.w, 1);
    const bh = toNumber(b.h, 1);
    const cx = b.x + bw / 2;
    const cy = b.y + bh / 2;

    b.builders = [];

    for (let i = 0; i < BUILDER_COUNT; i++){
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.max(bw, bh) * 0.3;

      const x = cx + Math.cos(angle) * radius * 0.5;
      const y = cy + Math.sin(angle) * radius * 0.5;

      b.builders.push({
        x,
        y,
        targetX   : cx,
        targetY   : cy,
        carryPhase: 0      // 0/1 → ob er "Material" trägt
      });
    }
  }

  function pickNewBuilderTarget(b, worker){
    const bw = toNumber(b.w, 1);
    const bh = toNumber(b.h, 1);
    const cx = b.x + bw / 2;
    const cy = b.y + bh / 2;

    const radius = Math.max(bw, bh) * 0.45;
    const angle  = Math.random() * Math.PI * 2;

    worker.targetX = cx + Math.cos(angle) * radius;
    worker.targetY = cy + Math.sin(angle) * radius;

    // ein/aus „Material tragen“ toggeln
    worker.carryPhase = worker.carryPhase ? 0 : 1;
  }

  function updateBuilders(b, dt){
    if (!Array.isArray(b.builders) || !b.builders.length) return;

    const speed = BUILDER_SPEED_TPS; // Tiles pro Sekunde
    const step  = speed * dt;

    for (const w of b.builders){
      const dx = (w.targetX ?? w.x) - w.x;
      const dy = (w.targetY ?? w.y) - w.y;
      const dist = Math.hypot(dx, dy);

      if (!dist || dist <= step){
        // Ziel erreicht → neues Ziel picken
        pickNewBuilderTarget(b, w);
        continue;
      }

      // ein Stück in Richtung Ziel laufen
      const nx = dx / dist;
      const ny = dy / dist;
      w.x += nx * step;
      w.y += ny * step;
    }
  }

  // ---------------------------------------------------------------------------
  // Bau fertig
  // ---------------------------------------------------------------------------

  function completeBuilding(b){
    ensureConstructionState(b);

    b.buildPhase    = PHASE.COMPLETE;
    b.buildElapsed  = b.buildTime;
    b.buildProgress = 1;
    b.status        = 'done';

    // fertiges Gebäude anzeigen
    b.buildSubStage = 2;
    b.buildStage    = 3;

    // Drops & Bauarbeiter entfernen
    b.drops    = [];
    b.builders = [];

    try{
      window.dispatchEvent(new CustomEvent('cb:build:complete', {
        detail:{
          id : b.id,
          x  : b.x,
          y  : b.y,
          w  : b.w,
          h  : b.h
        }
      }));
    }catch(e){
      WARN('cb:build:complete dispatch fehlgeschlagen', e);
    }

    LOG('Gebäude fertig', {
      id       : b.id,
      needs    : b.needs,
      delivered: b.delivered
    });
  }

  // ---------------------------------------------------------------------------
  // Event: Material geliefert – cb:build:deliver
  // ---------------------------------------------------------------------------

  window.addEventListener('cb:build:deliver', (ev)=>{
    const d     = ev.detail || {};
    const posX  = toNumber(d.x, NaN);
    const posY  = toNumber(d.y, NaN);
    const res   = String(d.res || 'wood');
    const amount= toNumber(d.amount, 1) || 1;

    if (!Number.isFinite(posX) || !Number.isFinite(posY)){
      WARN('cb:build:deliver ohne gültige Koordinaten', d);
      return;
    }

    const b = findBuildingAt(posX, posY);
    if (!b){
      WARN('cb:build:deliver – kein Gebäude an Position gefunden', { posX, posY, detail:d });
      return;
    }

    ensureConstructionState(b);

    // Delivered hochzählen, aber maximal bis Need
    const needTotal = toNumber(b.needs[res], 0);
    const prev      = toNumber(b.delivered[res], 0);
    let next        = prev + amount;
    if (needTotal > 0 && next > needTotal){
      next = needTotal;
    }
    b.delivered[res] = next;

    // Nur die „neuen“ Mengen als Drops anzeigen
    let inc = next - prev;
    if (inc < 0) inc = 0;
    for (let i = 0; i < inc; i++){
      addDrop(b, res, posX, posY);
    }

    // Wenn jetzt alles da ist → Bauphase starten
    if (hasAllMaterial(b) && b.buildPhase === PHASE.SITE){
      b.buildPhase     = PHASE.BUILD;
      b.buildElapsed   = 0;
      b.buildProgress  = 0;
      b.buildSubStage  = 1;   // wir steigen direkt mit Bild 1 ein
      b.status         = 'building';
      b.hasMaterial    = true;
      b.buildStage     = 1;   // Bild 1 sichtbar
      spawnBuilders(b);
    }

    LOG('Material geliefert', {
      id       : b.id,
      posX, posY,
      res,
      amount,
      needs    : b.needs,
      delivered: b.delivered
    });
  });

  // ---------------------------------------------------------------------------
  // Tick: Baufortschritt (pro Frame aus game.js)
  // ---------------------------------------------------------------------------

  function tick(dt){
    const list = getBuildings();
    if (!list.length) return;

    const ms = dt * 1000;

    for (const b of list){
      ensureConstructionState(b);

      switch (b.buildPhase){
        case PHASE.SITE: {
          // Ressourcen einsammeln, noch kein Bau
          b.status        = 'pending';
          b.buildStage    = 0;   // Bild 0
          b.buildSubStage = 0;
          break;
        }

        case PHASE.BUILD: {
          b.buildElapsed  += ms;
          let progress     = b.buildElapsed / b.buildTime;
          if (progress < 0) progress = 0;
          if (progress > 1) progress = 1;

          b.buildProgress  = progress;
          b.status         = 'building';

          // Unterphasen & Bilder:
          //   0.00–0.50 → Bild 1
          //   0.50–1.00 → Bild 2
          if (b.buildElapsed < BUILD_STAGE1_TIME_MS){
            b.buildSubStage = 1;
            b.buildStage    = 1;
          } else if (b.buildElapsed < b.buildTime){
            b.buildSubStage = 2;
            b.buildStage    = 2;
          }

          // Bauarbeiter bewegen
          updateBuilders(b, dt);

          if (progress >= 1){
            completeBuilding(b);
          }
          break;
        }

        case PHASE.COMPLETE:
        default:
          b.status        = 'done';
          b.buildStage    = 3;   // fertiges Gebäude
          b.buildSubStage = 2;
          // Bauarbeiter sollten schon entfernt sein
          break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: Drops + Fortschrittsbalken + Bauarbeiter
  // ---------------------------------------------------------------------------

  function worldToScreen(Game, wx, wy){
    const tileSize = Game.tileSize || 64;
    const cam      = Game.camera || {};

    if (typeof cam.worldToScreen === 'function'){
      return cam.worldToScreen(wx, wy);
    }

    const cx    = toNumber(cam.x, 0);
    const cy    = toNumber(cam.y, 0);
    const zoom  = toNumber(cam.zoom, 1);

    return {
      x    : (wx - cx) * tileSize * zoom,
      y    : (wy - cy) * tileSize * zoom,
      zoom : zoom,
      size : tileSize * zoom
    };
  }

  function render(Game){
    if (!Game || !Game.ctx) return;
    const ctx = Game.ctx;
    const list = getBuildings();
    if (!list.length) return;

    ctx.save();

    for (const b of list){
      if (!b) continue;
      ensureConstructionState(b);

      const bw = toNumber(b.w, 1);
      const bh = toNumber(b.h, 1);
      const cx = b.x + bw / 2;
      const cy = b.y + bh / 2;

      const camPos = worldToScreen(Game, cx, cy);
      const sz     = camPos.size || (Game.tileSize || 64);
      const zoom   = camPos.zoom || 1;

      // ---------------------------------------------------------------
      // 1) Boden-Drops (Ressourcenkugeln)
      // ---------------------------------------------------------------
      if (Array.isArray(b.drops) && b.drops.length){
        for (const drop of b.drops){
          const dPos = worldToScreen(Game, drop.x, drop.y);

          const r  = sz * 0.15;
          const sx = dPos.x;
          const sy = dPos.y;

          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);

          let fill = '#c8a060'; // Holz
          if (drop.res === 'stone') fill = '#b0b0b0';
          if (drop.res === 'food' || drop.res === 'fish') fill = '#c06060';

          ctx.fillStyle = fill;
          ctx.fill();

          ctx.lineWidth   = 2 * zoom;
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.stroke();
        }
      }

      // ---------------------------------------------------------------
      // 2) Bauarbeiter-Kreise (nur während BUILD)
      // ---------------------------------------------------------------
      if (b.buildPhase === PHASE.BUILD &&
          Array.isArray(b.builders) &&
          b.builders.length){
        for (const w of b.builders){
          const wPos = worldToScreen(Game, w.x, w.y);
          const r    = sz * 0.12;

          // Körper
          ctx.beginPath();
          ctx.arc(wPos.x, wPos.y, r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(220,180,120,0.95)';
          ctx.fill();

          ctx.lineWidth   = 1.5 * zoom;
          ctx.strokeStyle = 'rgba(60,30,0,0.7)';
          ctx.stroke();

          // Kopf
          ctx.beginPath();
          ctx.arc(wPos.x, wPos.y - r * 0.9, r * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,230,200,0.95)';
          ctx.fill();

          // ggf. „Material“ auf den Schultern
          if (w.carryPhase){
            ctx.beginPath();
            ctx.arc(wPos.x + r * 0.8, wPos.y - r * 0.4, r * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          }
        }
      }

      // ---------------------------------------------------------------
      // 3) Baufortschrittsbalken (für SITE + BUILD)
      // ---------------------------------------------------------------
      if (b.buildPhase !== PHASE.COMPLETE){
        const progress = (b.buildPhase === PHASE.BUILD)
          ? b.buildProgress
          : 0;

        const barWidth  = bw * sz * 0.8;
        const barHeight = Math.max(3, sz * 0.08);
        const barX      = camPos.x - barWidth / 2;
        const barY      = camPos.y - bh * sz * 0.6 - barHeight;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        if (progress > 0){
          ctx.fillStyle = 'rgba(80,200,80,0.9)';
          ctx.fillRect(barX+1, barY+1, (barWidth-2) * progress, barHeight-2);
        }

        ctx.lineWidth   = 1.5;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.strokeRect(barX, barY, barWidth, barHeight);
      }
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  window.GameConstruction = {
    tick,
    render
  };
  LOG('Construction-Modul aktiv (buildstep4-multiphasic)');

})();
