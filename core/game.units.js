// ============================================================================
//  Datei   : game.units.js
//  Projekt : Neue Siedler – Units / Träger-Laufzeit
//  Version : v25.11.30-fix-carrier-jumping
//  Autor   : Mann + ChatGPT
//  Zweck   : Verwaltung aller Einheiten (v.a. Träger) + Bewegung / Jobs
// ============================================================================

(function () {
  'use strict';

  const TAG = '[units]';

  // Kleine Log-Helfer (nutzt CBLog, wenn vorhanden)
  const LOG = (...args) => (window.CBLog?.info ?? console.log)(TAG, ...args);
  const WARN = (...args) => (window.CBLog?.warn ?? console.warn)(TAG, ...args);

  // Zentraler Container für alle Units
  const Units = {
    list: [],           // Array aller Einheiten
    byId: Object.create(null), // Map id → Unit
    nextId: 1,          // laufende ID
    hqPos: null,        // Position der HQ (wird von außen gesetzt)
    Game: null,         // Referenz auf Game (für später, falls nötig)
    JobEngine: null,    // Referenz auf JobEngine

    // -------------------------------------------------------------------------
    // init(GameRef, JobEngineRef)
    // -------------------------------------------------------------------------
    init(GameRef, JobEngineRef) {
      this.Game = GameRef || null;
      this.JobEngine = JobEngineRef || null;
      this.list = [];
      this.byId = Object.create(null);
      this.nextId = 1;
      LOG('Units.init abgeschlossen – Units an Game gebunden');
    },

        /**
     * HQ-Position setzen.
     *
     * Akzeptiert:
     *   - Units.setHQPos(x, y)
     *   - Units.setHQPos({ x, y })
     *   - Units.setHQPos({ tx, ty })   // z. B. Gebäude-Tile-Position
     */
    setHQPos(posOrX, y) {
      let x = null;
      let yy = null;

      // Variante A: zwei Zahlen (x, y)
      if (typeof posOrX === 'number' && typeof y === 'number') {
        x = posOrX;
        yy = y;

      // Variante B: Objekt mit x/y oder tx/ty
      } else if (posOrX && typeof posOrX === 'object') {
        const p = posOrX;
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          x = p.x;
          yy = p.y;
        } else if (typeof p.tx === 'number' && typeof p.ty === 'number') {
          // Falls nur Tile-Koordinaten existieren, auf die Mitte der Kachel schieben
          x = p.tx + 0.5;
          yy = p.ty + 0.5;
        }
      }

      // Plausibilitätscheck
      if (!Number.isFinite(x) || !Number.isFinite(yy)) {
        WARN('setHQPos: ungültige Position übergeben', { posOrX, y });
        return;
      }

      Units.hqPos = { x, y: yy };
      LOG('HQPos gesetzt:', Units.hqPos);
    },

    // -------------------------------------------------------------------------
    // spawnCarrier(opts)
    // Erzeugt eine neue Träger-Einheit.
    // opts: { x, y, speed }
    // Wenn x/y fehlen, wird HQ-Position verwendet.
    // -------------------------------------------------------------------------
    spawnCarrier(opts = {}) {
      const { x, y, speed } = opts;
      const hasX = Number.isFinite(x);
      const hasY = Number.isFinite(y);

      let startX = 0;
      let startY = 0;

      if (hasX && hasY) {
        startX = x;
        startY = y;
      } else if (this.hqPos && Number.isFinite(this.hqPos.x) && Number.isFinite(this.hqPos.y)) {
        startX = this.hqPos.x;
        startY = this.hqPos.y;
      } else {
        // Wenn noch keine HQ-Position bekannt ist, einfach (0,0) nehmen.
        WARN('spawnCarrier ohne bekannte HQPos – nutze (0,0) als Start', { x, y });
      }

      const unit = {
        id: this.nextId++,
        type: 'carrier',
        x: startX,
        y: startY,
        tx: startX,     // Ziel-X
        ty: startY,     // Ziel-Y
        speed: Number.isFinite(speed) ? speed : 2.0,
        carrying: null, // { res, qty } oder null
        task: null      // aktueller Job (Build/Transport/etc.)
      };

      this.list.push(unit);
      this.byId[unit.id] = unit;
      LOG('Carrier gespawnt', unit);
      return unit;
    },

    // Alias, falls irgendwo noch spawnUnit() benutzt wird:
    spawnUnit(opts = {}) {
      return this.spawnCarrier(opts);
    },

    // -------------------------------------------------------------------------
    // assignJob(unit, job)
    // Wird von carrier.runtime / JobEngine aufgerufen, wenn ein Job zugewiesen
    // wird. Wir tragen hier nur den Job ein und setzen das Ziel.
    // job: { id, type, from:{x,y}, to:{x,y}, res, qty }
    // -------------------------------------------------------------------------
    assignJob(unit, job) {
      if (!unit || !job) return;
      unit.task = job;

      // Zielkoordinaten übernehmen
      if (job.to && Number.isFinite(job.to.x) && Number.isFinite(job.to.y)) {
        unit.tx = job.to.x;
        unit.ty = job.to.y;
      }

      LOG('assignJob →', { unitId: unit.id, job });
    },

    // -------------------------------------------------------------------------
    // onArrive(unit)
    // Wird aufgerufen, wenn die Unit ihr Ziel erreicht hat.
    // Hier wird je nach Job-Typ entschieden, was passieren soll.
    // -------------------------------------------------------------------------
    onArrive(unit) {
      const job = unit.task;
      if (!job) return;

      LOG('onArrive()', { unitId: unit.id, job });

      // Beispiel-Handling für Build-Job:
      if (job.type === 'build') {
        // Material ist beim Bauplatz angekommen
        if (job.res && job.from && job.to) {
          LOG('Build-Job Material geliefert', {
            unitId: unit.id,
            res: job.res,
            from: job.from,
            to: job.to,
            carrying: unit.carrying
          });
        }
        // Job Engine informieren (falls API vorhanden)
        if (this.JobEngine && typeof this.JobEngine.finishJob === 'function') {
          this.JobEngine.finishJob(job.id, unit);
        }
      }

      // Nach erledigtem Job entladen & Job löschen
      unit.carrying = null;
      unit.task = null;

      // Nach dem Job wieder zur HQ zurücklaufen, wenn wir eine Position haben
      if (this.hqPos && Number.isFinite(this.hqPos.x) && Number.isFinite(this.hqPos.y)) {
        unit.tx = this.hqPos.x;
        unit.ty = this.hqPos.y;
      } else {
        // Wenn keine HQPos bekannt → kein neues Ziel
        unit.tx = unit.x;
        unit.ty = unit.y;
      }
    },

    // -------------------------------------------------------------------------
    // move(unit, dt)
    // Führt die eigentliche Bewegung der Unit in einem Tick aus.
    // dt = Zeit seit letztem Tick (z.B. 0.2s)
    // -------------------------------------------------------------------------
    move(u, dt) {
      if (!u.task) return; // Nichts zu tun

      if (!Number.isFinite(u.speed) || u.speed <= 0) {
        u.speed = 1.2; // Default-Speed
      }

      // -----------------------------------------------------------------------
      // 1) Falls Position noch nie gesetzt oder korrupt ist → reparieren
      // -----------------------------------------------------------------------
      if (!Number.isFinite(u.x) || !Number.isFinite(u.y)) {
        // Versuche zuerst, die Startposition aus dem Job zu nehmen (task.from).
        const from = u.task && u.task.from;
        const hasFrom = from && Number.isFinite(from.x) && Number.isFinite(from.y);
        const hasTarget = Number.isFinite(u.tx) && Number.isFinite(u.ty);

        if (hasFrom) {
          // Start am Lager / HQ / Ausgangspunkt der Lieferung
          u.x = from.x;
          u.y = from.y;
          LOG('Init-Position aus task.from gesetzt', u);
        } else if (hasTarget) {
          // Fallback: Start direkt am Ziel (besser als null → verhindert Springen)
          u.x = u.tx;
          u.y = u.ty;
          LOG('Init-Position aus tx/ty gesetzt', u);
        } else if (this.hqPos && Number.isFinite(this.hqPos.x) && Number.isFinite(this.hqPos.y)) {
          // Letzter sanfter Fallback: HQ-Position
          u.x = this.hqPos.x;
          u.y = this.hqPos.y;
          LOG('Init-Position aus HQPos gesetzt', u);
        } else {
          // *Nur* wenn wirklich gar nichts bekannt ist, hart auf (0,0) gehen.
          u.x = 0;
          u.y = 0;
          WARN('Unit-Position komplett unbekannt – setze auf (0,0)', u);
        }
      }

      // 2) Ziel prüfen
      const dx = u.tx - u.x;
      const dy = u.ty - u.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) {
        // Schon am Ziel → Job abschließen
        this.onArrive(u);
        return;
      }

      // 3) Schrittweite (abhängig von speed & dt)
      const step = u.speed * dt;

      if (step >= distance) {
        // Ziel wird in diesem Tick erreicht
        u.x = u.tx;
        u.y = u.ty;
        this.onArrive(u);
      } else {
        // Richtung normalisieren und ein Stück laufen
        const nx = dx / distance;
        const ny = dy / distance;
        u.x += nx * step;
        u.y += ny * step;
      }
    },

    // -------------------------------------------------------------------------
    // tick(dt)
    // Wird von der Game-Loop aufgerufen (z.B. alle 200ms) und bewegt alle Units.
    // -------------------------------------------------------------------------
    tick(dt) {
      if (!Array.isArray(this.list) || this.list.length === 0) return;
      for (const u of this.list) {
        this.move(u, dt);
      }
    }
  };

  // Expose nach außen
  window.GameUnits = Units;

})();
