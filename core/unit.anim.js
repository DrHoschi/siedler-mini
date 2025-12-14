/* ============================================================
   core/unit.anim.js
   v4.1 - Unit Animation & Direction Resolver (ISO-friendly)
   ------------------------------------------------------------
   Ziel:
   - Unit-Frames daten-/atlas-getrieben auswählen (idle/walk/work/carry)
   - Richtungen robust bestimmen (auch wenn vx/vy fehlt) aus:
       1) task.to / task.dest / task.target (falls vorhanden)
       2) lastMove (intern gesetzt)
       3) fallback: 'S'
   - Deutsche Richtungs-Tokens unterstützen: N, NO, O, SO, S, SW, W, NW
   - Fix für "läuft rückwärts": per-atlas Default-Offset (woodcutter_atlas = 180°)
     -> weil Sprite-Richtungsreihenfolge/Bewegungsvektor im aktuellen Build
        effektiv um 180° gedreht interpretiert wurde.
   ------------------------------------------------------------
   WICHTIG:
   - Carrier werden i. d. R. separat gerendert -> UnitAnim betrifft primär Worker.
   - Du kannst live tunen:
        UnitAnim.setTuning({ offsetSteps: 4 }) // 180° drehen
        UnitAnim.setTuning({ offsetSteps: 0 }) // zurück
   ============================================================ */

(() => {
  // ------------------------------------------------------------
  // Konstanten / Defaults
  // ------------------------------------------------------------

  // Richtungs-Order (8-dir) für Winkel->Token Mapping.
  // Definition: dx>0 => Osten ("O"), dy>0 => Süden ("S") (Screen/Y-down)
  const DIR_TOKENS = ["O", "SO", "S", "SW", "W", "NW", "N", "NO"];

  // Globales Tuning (kann zur Laufzeit überschrieben werden)
  const TUNING = {
    // Offset in 45°-Schritten (0..7). 4 = 180° Drehung.
    offsetSteps: 0,

    // Wenn true, wird dx/dy invertiert (nur falls notwendig)
    invertDx: false,
    invertDy: false,

    // Debug-Flag: loggt Richtungen/Frames sporadisch
    debug: false,
  };

  // Per-Atlas Defaults (nur anwenden, wenn der User nicht global tuned)
  // woodcutter läuft "rückwärts" => 180° drehen (4 steps).
  const ATLAS_DEFAULTS = {
    "woodcutter_atlas": { offsetSteps: 4 },
  };

  // ------------------------------------------------------------
  // Hilfsfunktionen
  // ------------------------------------------------------------

  function _clampInt(v, a, b) {
    v = (v | 0);
    return v < a ? a : (v > b ? b : v);
  }

  function _getUnitKind(u) {
    return (u && (u.kind || u.type || u.id)) || "";
  }

  function _getAtlasKeyForUnit(u) {
    // Registry kann existieren (dein Projekt)
    const kRaw = _getUnitKind(u);
    const k = (String(kRaw).includes("u.") ? String(kRaw) : ("u." + String(kRaw))).replace(/_/g,".").toLowerCase();

    // 1) Registry.getUnit(k)
    try {
      const def = window.Registry?.getUnit?.(k) || window.Registry?.units?.[k];
      if (def?.atlasKey) return def.atlasKey;
    } catch(e) {}

    // 2) direkte Felder an Unit (falls vorhanden)
    if (u && u.atlasKey) return u.atlasKey;
    if (u && u.atlas) return u.atlas;

    return "";
  }

  function _getActionForUnit(u) {
    // Minimal: falls AI/state gesetzt wurde
    const s = (u && (u.__animState || u.animState || u.state)) || "idle";
    const norm = String(s).toLowerCase();
    if (norm.includes("walk") || norm.includes("move")) return "walk";
    if (norm.includes("work") || norm.includes("mine") || norm.includes("chop") || norm.includes("fish")) return "work";
    if (norm.includes("carry") || norm.includes("haul")) return "carry";
    return "idle";
  }

  function _getMoveVectorFromTask(u) {
    const t = u && (u.task || u._task || u.aiTask);
    if (!t) return null;

    // mögliche Felder in deinem Projekt:
    // t.to {x,y} / t.dest {x,y} / t.target {x,y} / t.tx,t.ty
    const cand = t.to || t.dest || t.target || null;
    if (cand && typeof cand.x === "number" && typeof cand.y === "number") {
      return { dx: (cand.x - (u.x || 0)), dy: (cand.y - (u.y || 0)) };
    }
    if (typeof t.tx === "number" && typeof t.ty === "number") {
      return { dx: (t.tx - (u.x || 0)), dy: (t.ty - (u.y || 0)) };
    }
    return null;
  }

  function _getDirTokenFromVector(dx, dy, atlasKey) {
    if (!isFinite(dx) || !isFinite(dy)) return "S";

    // Optional invert (falls du später mal ein anderes Koordinatensystem hast)
    if (TUNING.invertDx) dx = -dx;
    if (TUNING.invertDy) dy = -dy;

    // Winkel in Screen-Koordinaten (Y down).
    // atan2(dy, dx): 0=O, 90=S, 180=W, -90=N
    const ang = Math.atan2(dy, dx);

    // Quantisierung auf 8 Sektoren:
    // index 0..7 entspricht DIR_TOKENS
    const step = (Math.PI * 2) / 8;
    let idx = Math.round(ang / step); // kann negativ sein
    idx = ((idx % 8) + 8) % 8;

    // Offset: global oder per-atlas default (wenn global==0 und per-atlas existiert)
    let off = _clampInt(TUNING.offsetSteps, 0, 7);
    if (off === 0 && atlasKey && ATLAS_DEFAULTS[atlasKey]?.offsetSteps) {
      off = _clampInt(ATLAS_DEFAULTS[atlasKey].offsetSteps, 0, 7);
    }
    idx = (idx + off) % 8;

    return DIR_TOKENS[idx] || "S";
  }

  function _getDirTokenForUnit(u, atlasKey) {
    // 1) wenn Unit explizit dir gesetzt hat
    const d0 = u && (u.__dir || u.dir || u.facing);
    if (d0 && typeof d0 === "string") {
      const d = d0.toUpperCase();
      if (DIR_TOKENS.includes(d)) return d;
      // Legacy
      if (d === "NE") return "NO";
      if (d === "SE") return "SO";
      if (d === "E") return "O";
      return "S";
    }

    // 2) aus Task-Ziel
    const vTask = _getMoveVectorFromTask(u);
    if (vTask) return _getDirTokenFromVector(vTask.dx, vTask.dy, atlasKey);

    // 3) aus letzter Bewegung (falls vorhanden)
    const lm = u && (u.__lastMove || u.lastMove);
    if (lm && typeof lm.dx === "number" && typeof lm.dy === "number") {
      return _getDirTokenFromVector(lm.dx, lm.dy, atlasKey);
    }

    // 4) aus velocity
    const vx = u && (u.vx ?? u.dx);
    const vy = u && (u.vy ?? u.dy);
    if (typeof vx === "number" && typeof vy === "number" && (Math.abs(vx) + Math.abs(vy)) > 0.0001) {
      return _getDirTokenFromVector(vx, vy, atlasKey);
    }

    return "S";
  }

  function _pickFrameName(atlas, action, dirTok, t) {
    if (!atlas || !atlas.frames) return null;

    // Primär: neue, sprechende Keys wie Idle_NW_0_0 etc.
    const capA = action.charAt(0).toUpperCase() + action.slice(1); // idle->Idle
    const key = `${capA}_${dirTok}_0_0`;
    if (atlas.frames[key]) return key;

    // Fallback: wenn du irgendwann Walk_... etc. hinzufügst, aber action anders heißt
    if (action === "walk") {
      const k2 = `Idle_${dirTok}_0_0`;
      if (atlas.frames[k2]) return k2;
    }

    // Legacy: frame_<row>_<col> (wenn vorhanden)
    // Wir mappen Richtung auf row, col=0
    // Reihenfolge: O,SO,S,SW,W,NW,N,NO -> row 0..7
    const row = DIR_TOKENS.indexOf(dirTok);
    if (row >= 0) {
      const k3 = `frame_${row}_0`;
      if (atlas.frames[k3]) return k3;
    }

    // Last resort: irgendein erster Frame
    const keys = Object.keys(atlas.frames);
    return keys.length ? keys[0] : null;
  }

  // ------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------

  const UnitAnim = {
    /**
     * Globale Tuning-Parameter setzen (optional).
     * Beispiel:
     *   UnitAnim.setTuning({ offsetSteps: 4 })
     */
    setTuning(patch = {}) {
      if (patch && typeof patch === "object") {
        if (patch.offsetSteps != null) TUNING.offsetSteps = _clampInt(patch.offsetSteps, 0, 7);
        if (patch.invertDx != null) TUNING.invertDx = !!patch.invertDx;
        if (patch.invertDy != null) TUNING.invertDy = !!patch.invertDy;
        if (patch.debug != null) TUNING.debug = !!patch.debug;
      }
      return { ...TUNING };
    },

    getTuning() { return { ...TUNING }; },

    /**
     * Ermittelt den Frame-Key für eine Unit.
     * Erwartet, dass Assets.getAtlas(atlasKey) funktioniert.
     */
    getFrameForUnit(u, nowMs = performance.now()) {
      const atlasKey = _getAtlasKeyForUnit(u);
      const atlas = window.Assets?.getAtlas?.(atlasKey) || null;

      const action = _getActionForUnit(u);
      const dirTok = _getDirTokenForUnit(u, atlasKey);
      const frame = _pickFrameName(atlas, action, dirTok, nowMs);

      if (TUNING.debug && Math.random() < 0.01) {
        console.debug("[UnitAnim]", { kind: _getUnitKind(u), atlasKey, action, dirTok, frame });
      }
      return frame || null;
    },

    /**
     * Nur Direction debug: liefert {dirTok, atlasKey}
     */
    getDir(u) {
      const atlasKey = _getAtlasKeyForUnit(u);
      return { dirTok: _getDirTokenForUnit(u, atlasKey), atlasKey };
    },
  };

  // Global export
  window.UnitAnim = UnitAnim;
})();
