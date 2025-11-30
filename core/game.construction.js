/* ============================================================================
 * Datei   : core/game.construction.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.30-buildstep3
 *
 * Zweck   :
 *   - Steuert die Bauphasen von Gebäuden (Baustelle → Bau → fertig)
 *   - Verarbeitet Material-Lieferungen der Träger (cb:build:deliver)
 *   - Zählt Needs/Delivered pro Baustelle
 *   - Erzeugt Boden-Drops (Ressourcenkugeln) um die Baustelle
 *   - Zeichnet Drops + Baufortschrittsbalken
 *   - Meldet fertige Gebäude (cb:build:complete)
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[construction]';
  const LOG  = (...a)=> (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // Phasen im Bauprozess
  const PHASE = {
    SITE    : 0,  // Baustelle angelegt, wartet auf Material
    BUILD   : 1,  // alle Ressourcen da, Bau läuft (Progress-Balken)
    COMPLETE: 2   // Bau fertig, fertiges Gebäude
  };

  // Bauzeit, nachdem alle Ressourcen da sind (ms)
  const DEFAULT_BUILD_TIME = 6000;

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen: Basis
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
   * Gebäude finden, dessen Tile-Rechteck die Positions-Koordinate enthält.
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
   * Standardwerte für Baustellen-Felder setzen.
   */
  function ensureConstructionState(b){
    if (!b) return;

    // Soll-Kosten (needs)
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
      b.buildTime = DEFAULT_BUILD_TIME;
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

    // Visuelle Bau-Stufe für game.renderer.js:
    //   0 = Baustelle zeichnen
    //   1 = fertiges Gebäude zeichnen
    if (typeof b.buildStage !== 'number'){
      b.buildStage = (b.buildPhase === PHASE.COMPLETE) ? 1 : 0;
    }
  }

  /**
   * Sind alle benötigten Ressourcen geliefert?
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
   * Drop (Ressourcenkugel) um die Baustelle erzeugen.
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

  /**
   * Bau abschließen: Phase COMPLETE, Drops löschen, fertiges Gebäude melden.
   * WICHTIG: buildStage = 1 → Renderer zeichnet jetzt das richtige Gebäude.
   */
  function completeBuilding(b){
    ensureConstructionState(b);

    b.buildPhase    = PHASE.COMPLETE;
    b.buildElapsed  = b.buildTime;
    b.buildProgress = 1;
    b.status        = 'done';

    // fertiges Gebäude sichtbar machen
    b.buildStage    = 1;

    // Drops löschen
    b.drops = [];

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

    // Nur die "neuen" Einheiten als Drops auf den Boden legen
    let inc = next - prev;
    if (inc < 0) inc = 0;
    for (let i = 0; i < inc; i++){
      addDrop(b, res, posX, posY);
    }

    // Wenn jetzt alles da ist → Bauphase starten
    if (hasAllMaterial(b) && b.buildPhase === PHASE.SITE){
      b.buildPhase    = PHASE.BUILD;
      b.buildElapsed  = 0;
      b.buildProgress = 0;
      b.status        = 'building';
      b.hasMaterial   = true;
      b.buildStage    = 0; // noch Baustellen-Grafik
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
          // wartet auf Material
          b.status     = 'pending';
          b.buildStage = 0;  // sicherstellen, dass Baustelle gezeichnet wird
          break;
        }

        case PHASE.BUILD: {
          b.buildElapsed  += ms;
          b.buildProgress  = Math.min(1, b.buildElapsed / b.buildTime);
          b.status         = 'building';
          b.buildStage     = 0;  // immer noch Baustelle + Fortschrittsbalken

          if (b.buildProgress >= 1){
            completeBuilding(b);
          }
          break;
        }

        case PHASE.COMPLETE:
        default:
          b.status = 'done';
          // buildStage bleibt 1 → fertiges Gebäude
          break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering: Drops + Baufortschrittsbalken
  // ---------------------------------------------------------------------------
  function worldToScreen(Game, wx, wy){
    const tileSize = Game.tileSize || 64;
    const cam      = Game.camera || {};

    // Kamera-Helper bevorzugen
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

      // 1) Drops (Boden-Ressourcen)
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

      // 2) Baufortschrittsbalken
      if (b.buildPhase !== PHASE.COMPLETE){
        const progress = (b.buildPhase === PHASE.BUILD)
          ? b.buildProgress
          : 0;

        const barWidth  = bw * sz * 0.8;
        const barHeight = Math.max(3, sz * 0.08);
        const barX      = camPos.x - barWidth / 2;
        const barY      = camPos.y - bh * sz * 0.6 - barHeight;

        // Hintergrund
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Füllung
        if (progress > 0){
          ctx.fillStyle = 'rgba(80,200,80,0.9)';
          ctx.fillRect(barX+1, barY+1, (barWidth-2) * progress, barHeight-2);
        }

        // Rahmen
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
  LOG('Construction-Modul aktiv (buildstep3)');

})();
