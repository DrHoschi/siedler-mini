/* ============================================================================
 * Datei   : core/game.construction.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.30-build-resources
 *
 * Zweck   :
 *   - Steuert die Bauphasen von Gebäuden (Baustelle → Material → Finish → fertig)
 *   - Verarbeitet Material-Lieferungen der Träger (cb:build:deliver)
 *   - Meldet fertige Gebäude mit exakter Instanz-Position (cb:build:complete)
 *
 *   - NEU (Baustellen-Logik Schritt 1):
 *       • Pro Gebäude/“Baustelle“ Bau-Ressourcen führen:
 *           - b.buildNeeds      : { wood: x, stone: y, ... }
 *           - b.buildDelivered  : { wood: n, stone: m, ... }
 *           - b.buildDrops      : [{ res, tileX, tileY, offX, offY }, ...]
 *           - b.buildStatus     : 'pending' | 'building' | 'done'
 *       • Bei cb:build:deliver:
 *           - delivered-Zähler erhöhen
 *           - Baustelle als „hat Material“ markieren
 *           - Ressourcen-Drop auf dem Boden registrieren
 *           - Event cb:build:drop-resource für das Rendering feuern
 * ========================================================================== */

(function () {
  'use strict';

  const TAG  = '[construction]';
  const LOG  = (...a) => (window.CBLog?.ok  ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // ---------------------------------------------------------------------------
  // Bau-Phasen (interne State-Maschine)
  // ---------------------------------------------------------------------------

  const PHASE = {
    SITE    : 0,
    MATERIAL: 1,
    FINISH  : 2,
    COMPLETE: 3
  };

  const TIME = {
    SITE    : 2000,  // Zeit bis zum Wechsel in MATERIAL (Fallback)
    MATERIAL: 1500,
    FINISH  : 1200
  };

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen: Zugriff & Basis
  // ---------------------------------------------------------------------------

  function getBuildings() {
    return (window.Game && Array.isArray(window.Game.buildings))
      ? window.Game.buildings
      : [];
  }

  function toNumberOr(obj, key, fallback) {
    const v = Number(obj?.[key]);
    return Number.isFinite(v) ? v : fallback;
  }

  /**
   * Finde Gebäude, dessen Tile-Rechteck die übergebene Position enthält.
   *  - b.x, b.y  ... linke obere Ecke (Tile-Koordinaten)
   *  - b.w, b.h  ... Breite/Höhe in Tiles
   *  - posX,posY ... irgendein Punkt (z.B. Gebäude-Mitte) in Tiles
   */
  function findBuildingAt(posX, posY) {
    const list = getBuildings();
    if (!list.length) return null;

    for (const b of list) {
      if (!b) continue;

      const bx = toNumberOr(b, 'x', NaN);
      const by = toNumberOr(b, 'y', NaN);
      const bw = toNumberOr(b, 'w', 1);
      const bh = toNumberOr(b, 'h', 1);

      if (!Number.isFinite(bx) || !Number.isFinite(by)) continue;

      const inX = posX >= bx && posX < bx + bw;
      const inY = posY >= by && posY < by + bh;

      if (inX && inY) return b;
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // NEU: Ressourcen-State pro Baustelle initialisieren
  // ---------------------------------------------------------------------------
  /**
   * Stellt sicher, dass ein Gebäude alle Felder für die Baustellen-Logik besitzt:
   *   - buildNeeds      : Soll-Kosten (falls bekannt)
   *   - buildDelivered  : bisher gelieferte Mengen
   *   - buildDrops      : visuelle Boden-Ressourcen um die Baustelle herum
   *   - buildStatus     : 'pending' | 'building' | 'done'
   *
   * Kosten werden – wenn vorhanden – aus b.cost oder b.buildCost übernommen.
   * Fallback: leere Needs (rein visueller Modus, Phase läuft dann über Timer).
   */
  function ensureBuildResourceState(b) {
    if (!b) return;

    // Needs (Soll-Kosten)
    if (!b.buildNeeds) {
      const srcCost = (b.cost && typeof b.cost === 'object')
        ? b.cost
        : (b.buildCost && typeof b.buildCost === 'object')
          ? b.buildCost
          : null;

      const needs = {};

      if (srcCost) {
        for (const key in srcCost) {
          const v = Number(srcCost[key]);
          if (Number.isFinite(v) && v > 0) {
            needs[key] = v;
          }
        }
      }

      // Wenn keine Kosten bekannt sind, bleibt es einfach leer
      b.buildNeeds = needs;
    }

    // Delivered (Ist-Mengen)
    if (!b.buildDelivered || typeof b.buildDelivered !== 'object') {
      b.buildDelivered = {};
    }

    // Drops (Boden-Ressourcen um die Baustelle)
    if (!Array.isArray(b.buildDrops)) {
      b.buildDrops = [];
    }

    // Status-String gem. Spec: pending | building | done
    if (typeof b.buildStatus !== 'string') {
      b.buildStatus = 'pending';
    }
  }

  /**
   * NEU: Einen Ressourcen-Drop für dieses Gebäude registrieren.
   *
   * - tileX, tileY : Tile-Position der Baustelle (oder Ziel-Tile)
   * - Es wird ein kleiner Random-Offset in Tile-Space dazugefügt, damit die
   *   Kugeln nicht alle exakt übereinander liegen.
   *
   * Parallel wird ein Event cb:build:drop-resource gefeuert, damit ein
   * Renderer (z.B. dein bestehendes Kugel-/Bubble-Overlay) die Ressource
   * sichtbar auf dem Boden darstellen kann.
   */
  function registerGroundDrop(b, resType, tileX, tileY) {
    if (!b) return;
    ensureBuildResourceState(b);

    const offX = (Math.random() - 0.5) * 0.6; // ca. ±0.3 Tiles
    const offY = (Math.random() - 0.5) * 0.6;

    const drop = {
      res  : resType,
      tileX: tileX,
      tileY: tileY,
      offX,
      offY
    };

    b.buildDrops.push(drop);

    // Optional: Event für ein zentrales Render-Modul
    try {
      window.dispatchEvent(new CustomEvent('cb:build:drop-resource', {
        detail: {
          buildingId: b.id,
          x        : tileX,
          y        : tileY,
          res      : resType,
          offX,
          offY
        }
      }));
    } catch (e) {
      WARN('cb:build:drop-resource dispatch fehlgeschlagen', e);
    }
  }

  /**
   * NEU: Status-String (pending | building | done) anhand der numerischen
   * buildStage-Angabe fortschreiben.
   */
  function updateBuildStatusFromStage(b) {
    if (!b) return;
    ensureBuildResourceState(b);

    switch (b.buildStage) {
      case PHASE.SITE:
        b.buildStatus = 'pending';
        break;
      case PHASE.MATERIAL:
      case PHASE.FINISH:
        b.buildStatus = 'building';
        break;
      case PHASE.COMPLETE:
        b.buildStatus = 'done';
        break;
      default:
        // keine Änderung
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Event: Material geliefert (von GameUnits)
  //  -> cb:build:deliver { x, y, res?, amount?, jobId? }
  //
  // Bisher:
  //   - nur: b.hasMaterial = true;
  //
  // Neu:
  //   - Sicherstellen, dass Baustellen-State vorhanden ist
  //   - delivered-Zähler für die Ressource hochzählen
  //   - Boden-Ressourcen-Drop registrieren (mehrfach, falls amount > 1)
  // ---------------------------------------------------------------------------
  window.addEventListener('cb:build:deliver', (ev) => {
    const d   = ev.detail || {};
    const x   = toNumberOr(d, 'x', NaN);
    const y   = toNumberOr(d, 'y', NaN);
    const res = (typeof d.res === 'string' && d.res) ? d.res : 'wood';
    const amountRaw = Number(d.amount);
    const amount    = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 1;

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      WARN('cb:build:deliver ohne gültige Koordinaten', d);
      return;
    }

    const b = findBuildingAt(x, y);
    if (!b) {
      WARN('cb:build:deliver – kein Gebäude an Position gefunden', { x, y, detail: d });
      return;
    }

    ensureBuildResourceState(b);

    // Flag setzen: dieses Gebäude hat Material bekommen (beschleunigt die Phase)
    b.hasMaterial = true;

    // delivered-Zähler pflegen
    const prev = Number(b.buildDelivered[res] || 0);
    let next   = prev + amount;

    const need = Number(b.buildNeeds?.[res] || 0);
    if (need > 0 && next > need) {
      next = need; // nicht über das Soll hinaus hochzählen
    }
    b.buildDelivered[res] = next;

    // Boden-Drops registrieren (pro „Einheit“ eine Kugel um die Baustelle)
    for (let i = 0; i < amount; i++) {
      registerGroundDrop(b, res, x, y);
    }

    LOG('Material geliefert', {
      id      : b.id,
      x       : b.x,
      y       : b.y,
      w       : b.w,
      h       : b.h,
      fromX   : x,
      fromY   : y,
      res,
      amount,
      delivered: b.buildDelivered,
      needs    : b.buildNeeds,
      jobId   : d.jobId
    });
  });

  // ---------------------------------------------------------------------------
  // Tick: Bauphasen voranschieben
  //  - läuft immer, egal ob Events kommen oder nicht
  //  - Events dienen dazu, schneller voranzukommen
  //
  // NEU:
  //   - pro Gebäude ensureBuildResourceState(b)
  //   - buildStatus ('pending'/'building'/'done') aus buildStage ableiten
  // ---------------------------------------------------------------------------
  function tick(dt) {
    const list = getBuildings();
    if (!list.length) return;

    const ms = dt * 1000;

    for (const b of list) {
      if (!b) continue;

      // Sicherheits-Init für alte Saves / neue Instanzen
      ensureBuildResourceState(b);

      if (typeof b.buildStage !== 'number') b.buildStage = PHASE.SITE;
      if (typeof b.buildTimer !== 'number') b.buildTimer = 0;

      switch (b.buildStage) {
        case PHASE.SITE: {
          b.buildTimer += ms;

          // Fallback: nach TIME.SITE geht's auch ohne Lieferung weiter,
          // aber wenn hasMaterial früh gesetzt wird, sofort Phase MATERIAL.
          if (b.hasMaterial || b.buildTimer > TIME.SITE) {
            b.buildStage = PHASE.MATERIAL;
            b.buildTimer = 0;
            LOG('Phase MATERIAL', b.id);
          }
          break;
        }

        case PHASE.MATERIAL: {
          b.buildTimer += ms;

          // Mit Material: schneller bauen
          const limit = b.hasMaterial ? TIME.MATERIAL * 0.6 : TIME.MATERIAL;
          if (b.buildTimer > limit) {
            b.buildStage = PHASE.FINISH;
            b.buildTimer = 0;
            LOG('Phase FINISH', b.id);
          }
          break;
        }

        case PHASE.FINISH: {
          b.buildTimer += ms;
          if (b.buildTimer > TIME.FINISH) {
            b.buildStage  = PHASE.COMPLETE;
            b.buildTimer  = 0;
            b.hasMaterial = false;

            // Fertiges Gebäude inkl. Koordinaten melden
            try {
              window.dispatchEvent(new CustomEvent('cb:build:complete', {
                detail: {
                  id: b.id,
                  x : b.x,
                  y : b.y,
                  w : b.w,
                  h : b.h
                }
              }));
            } catch (e) {
              WARN('cb:build:complete dispatch fehlgeschlagen', e);
            }

            LOG('Gebäude fertig', b.id);
          }
          break;
        }

        case PHASE.COMPLETE:
        default:
          // nichts mehr zu tun
          break;
      }

      // Zum Schluss in jeder Runde den Status-String aktualisieren
      updateBuildStatusFromStage(b);
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  window.GameConstruction = { tick };
  LOG('Construction-Modul aktiv (build-resources)');
})();
