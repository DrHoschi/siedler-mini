/* ============================================================================
 * Datei   : core/game.build.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.29-split1
 * Zweck   : Gebäude platzieren + Baujobs erzeugen + Events anbinden
 * Lauscht : cb:build:place { buildingId|kind, x|tx, y|ty }
 * Sendet  : cb:build:placed { id, x, y }
 * ========================================================================= */

(function () {
  'use strict';

  const TAG  = '[build]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  //  Hilfsfunktion: Baujob in Queue / direkt zu Units
  // -------------------------------------------------------------------------
  function enqueueBuildJob (building) {
    if (!building) return;
    if (!window.GameUnits) return;

    const hq = GameUnits.hqPos || { x: building.x, y: building.y };
    const job = {
      type      : 'build',
      res       : 'wood',
      from      : { x: hq.x,       y: hq.y },
      to        : { x: building.x, y: building.y },
      buildingId: building.id
    };

    // 1) Bevorzugt über zentrale JobEngine
    if (window.JobEngine?.add) {
      JobEngine.add(job);
    } else if (window.GameUnits?.assignJob) {
      // Fallback: direkt zu einer Einheit
      GameUnits.assignJob(job);
    } else {
      WARN('Kein Job-System verfügbar für Baujob', job);
    }
  }

  // -------------------------------------------------------------------------
  //  Gebäude platzieren (interne API)
  // -------------------------------------------------------------------------
  function place (id, x, y) {
    const reg = window.Registry;
    if (!reg) {
      WARN('Registry fehlt – kann Gebäude nicht platzieren');
      return;
    }

    const def = (typeof reg.getBuilding === 'function')
      ? reg.getBuilding(id)
      : (reg.buildings && reg.buildings[id]) || null;

    if (!def) {
      WARN('Unbekanntes Gebäude:', id);
      return;
    }

    // Gebäudeobjekt über Buildings-Modul erzeugen
    let b = null;
    if (window.Buildings?.create) {
      b = Buildings.create(id, x, y);
    } else {
      // sehr einfacher Fallback – sollte eigentlich nicht mehr vorkommen
      const w = def.size?.w ?? 3;
      const h = def.size?.h ?? 3;
      b = {
        id,
        type      : id,
        x, y, w, h,
        buildStage: 0,
        buildTimer: 0,
        stock     : {}
      };
      (window.Game?.buildings || (window.Game.buildings = [])).push(b);
    }

    if (!b) return;

    // HQ-Spezialfall → Position merken
    if (id === 'b.hq' && window.GameUnits) {
      GameUnits.hqPos = { x, y };
      LOG('HQ gesetzt bei', x, y);
    }

    // Baujob anlegen
    enqueueBuildJob(b);

    // Info-Event für Inspector / UI
    try {
      window.dispatchEvent(new CustomEvent('cb:build:placed', {
        detail: { id: b.id, x: b.x, y: b.y }
      }));
    } catch { /* egal */ }

    LOG('Gebäude platziert:', id, '→', x, y);
  }

  // -------------------------------------------------------------------------
  //  Event-Bind: cb:build:place → place()
  // -------------------------------------------------------------------------
  function onBuildPlace (ev) {
    const d = ev?.detail || {};

    const idRaw = d.buildingId ?? d.kind ?? d.type ?? d.id;
    const id    = idRaw != null ? String(idRaw) : '';
    if (!id) return;

    const rawX = (d.x ?? d.tx);
    const rawY = (d.y ?? d.ty);
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return;

    const x = rawX | 0;
    const y = rawY | 0;

    place(id, x, y);
  }

  window.addEventListener('cb:build:place', onBuildPlace);

  // Export (falls du irgendwann direkt aufrufen willst)
  window.GameBuild = { place };
})();
