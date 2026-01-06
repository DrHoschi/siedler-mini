/* ============================================================================
 * core/unit.anim.js
 * v4.1-patch: prefixed-atlas + 8dir + iso-friendly direction mapping
 * ----------------------------------------------------------------------------
 * Ziel:
 *  - Unterstützt ZWEI Atlas-Stile parallel:
 *    (A) "Grid/Legacy":   Idle_NO_0_0 / Walk_SO_2_0 / frame_3_1 ...
 *    (B) "Prefixed":      woodcutter_N_walk_0 / carrier_SW_walk_3 ...
 *  - Automatische Erkennung der vorhandenen Keys im Atlas (kein manuelles Umbenennen nötig)
 *  - Optionales ISO-Projection-Tuning, damit "N/E/S/W" zur Bildschirmrichtung passt
 *
 * WICHTIG:
 *  - Diese Datei ist bewusst standalone (keine Imports), damit sie in deinem Setup robust bleibt.
 *  - Debug/Checker bleibt drin (TUNING.debug)
 * ========================================================================== */
(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // Konstanten / Defaults
  // ---------------------------------------------------------------------------

  /** 8er-Richtungen (Englische Tokens) im Uhrzeigersinn, Start bei E */
  const DIR8_EN = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];

  /** 8er-Richtungen (Deutsche Tokens) im Uhrzeigersinn, Start bei O */
  const DIR8_DE = ["O", "SO", "S", "SW", "W", "NW", "N", "NO"];

  /**
   * Richtungs-Aliase (DE <-> EN), damit alte und neue Atlanten funktionieren.
   * NO = NE, SO = SE, O = E
   */
  const DIR_ALIASES = {
    NO: "NE",
    SO: "SE",
    O: "E",
    NE: "NO",
    SE: "SO",
    E: "O",
  };

  /** Standard-FPS pro Action (nur genutzt, wenn mehrere Frames vorhanden sind). */
  const ACTION_FPS = {
    idle: 2,
    walk: 6,
    work: 6,
    carry: 6,
  };

  /** Globales Tuning (kann per UnitAnim.setTuning überschrieben werden). */
  const TUNING = {
    debug: false,

    /**
     * Wenn true: Richtung aus TILE-Delta in SCREEN-Delta umrechnen (Isometric).
     * Das behebt sehr oft "läuft seitlich/rückwärts", wenn Sprites nach Bildschirmrichtung benannt sind.
     */
    isoProject: true,

    /**
     * Optionaler globaler Offset (in 45°-Schritten) auf die berechnete Richtung.
     * Beispiel: offsetSteps: 1 -> 45° Drehung.
     */
    offsetSteps: 0,

    /**
     * Optional pro AtlasKey überschreiben (z.B. nur für woodcutter_sprite_atlas):
     * perAtlas: { woodcutter_sprite_atlas: { isoProject:true, offsetSteps: 1 } }
     */
    perAtlas: {},
  };

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen (allgemein)
  // ---------------------------------------------------------------------------

  function _clampInt(v, min, max) {
    v = v | 0;
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  function _normAction(a) {
    a = (a || "idle").toString().toLowerCase();
    if (a === "run") return "walk";
    return a;
  }

  /** Einheitstyp/Kind ermitteln (robust gegen verschiedene Datenstände). */
  function _getUnitKind(u) {
    return u?.kind || u?.type || u?.id || "u.unknown";
  }

  /** AtlasKey aus Registry lesen (fallbacks bleiben drin). */
  function _getAtlasKeyForUnit(u) {
    const kind = _getUnitKind(u);
    const reg = window.Registry?.getUnit?.(kind) || window.Registry?.units?.[kind] || null;
    return reg?.atlasKey || "carrier_atlas";
  }

  /** Anim-Action aus Unit-State ableiten. */
  function _getActionForUnit(u) {
    // Von außen kannst du u.__animState setzen (idle/walk/work/carry)
    return _normAction(u?.__animState || u?.state || "idle");
  }

  /**
   * Delta bestimmen:
   * - bevorzugt u.vx/u.vy (falls vorhanden)
   * - sonst task.target vs u.x/u.y
   */
  function _getDelta(u) {
    const vx = Number(u?.vx || 0);
    const vy = Number(u?.vy || 0);
    if (Math.abs(vx) > 1e-6 || Math.abs(vy) > 1e-6) return { dx: vx, dy: vy };

    const tx = Number(u?.task?.to?.x ?? u?.task?.target?.x ?? u?.targetX ?? u?.toX ?? u?.x ?? 0);
    const ty = Number(u?.task?.to?.y ?? u?.task?.target?.y ?? u?.targetY ?? u?.toY ?? u?.y ?? 0);
    const ux = Number(u?.x ?? 0);
    const uy = Number(u?.y ?? 0);

    return { dx: tx - ux, dy: ty - uy };
  }

  /**
   * Optional: TILE-Delta -> SCREEN-Delta (Isometric).
   * Typischer ISO-Project:
   *   sx = dx - dy
   *   sy = dx + dy
   */
  function _isoProjectDelta(dx, dy) {
    return { dx: dx - dy, dy: dx + dy };
  }

  /**
   * Richtung (8er) aus dx/dy bestimmen.
   * Gibt einen Index (0..7) zurück.
   */
  function _dirIndex8FromDelta(dx, dy) {
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return -1;

    // atan2 liefert Winkel in [-pi..pi], 0=+x (E), +90°=+y (S)
    const ang = Math.atan2(dy, dx);
    let deg = (ang * 180) / Math.PI; // [-180..180]
    if (deg < 0) deg += 360;         // [0..360)

    const idx = Math.round(deg / 45) % 8;
    return idx;
  }

  /**
   * Richtungs-Token (EN oder DE) aus Unit bestimmen.
   * - Wenn Unit steht (dx/dy ~ 0): letztes dir token verwenden (u.__lastDir) oder Default "S"
   */
  function _getDirTokenForUnit(u, atlasKey, schemeHint) {
    const per = TUNING.perAtlas?.[atlasKey] || {};
    const isoProject = (per.isoProject ?? TUNING.isoProject) === true;
    const offsetSteps = (per.offsetSteps ?? TUNING.offsetSteps) | 0;

    // 0) Wenn die Render-Pipeline bereits eine 8-dir Richtung liefert (u._dir8),
    //    nutzen wir die als höchste Priorität. Das stabilisiert Worker/Menschen,
    //    deren Movement nicht über vx/vy läuft (Timing-Problem: task.target kann im Render-Tick fehlen).
    const dir8Tok = (typeof u?._dir8 === 'string') ? u._dir8 : null;
    if (dir8Tok) {
      // Token -> Index (EN/DE + Aliases)
      const tokNorm = DIR_ALIASES[dir8Tok] || dir8Tok;
      let idx0 = DIR8_EN.indexOf(tokNorm);
      if (idx0 < 0) idx0 = DIR8_DE.indexOf(tokNorm);
      if (idx0 < 0) idx0 = 4; // Default "S"

      let idx = (idx0 + offsetSteps) % 8;
      if (idx < 0) idx += 8;

      const scheme = schemeHint || "en";
      const tok = scheme === "de" ? DIR8_DE[idx] : DIR8_EN[idx];
      u.__lastDir = tok;
      return tok;
    }

let { dx, dy } = _getDelta(u);
    if (isoProject) {
      const p = _isoProjectDelta(dx, dy);
      dx = p.dx;
      dy = p.dy;
    }

    let idx = _dirIndex8FromDelta(dx, dy);
    if (idx === -1) {
      // idle -> behalte letzte Richtung
      const last = u?.__lastDir;
      return last || "S";
    }

    idx = (idx + offsetSteps) % 8;
    if (idx < 0) idx += 8;

    // schemeHint kann von Atlas-Erkennung kommen
    const scheme = schemeHint || "en";
    const tok = scheme === "de" ? DIR8_DE[idx] : DIR8_EN[idx];

    u.__lastDir = tok;
    return tok;
  }

  /** Prüft: gibt es frameKey exakt im Atlas? */
  function _hasFrame(atlas, key) {
    return !!(atlas && atlas.frames && atlas.frames[key]);
  }

  // ---------------------------------------------------------------------------
  // Auto-Detection: Prefixed-Atlas Index (woodcutter_N_walk_0, ...)
  // ---------------------------------------------------------------------------

  /**
   * Prefixed-Key-Regex:
   *   <prefix>_<DIR>_<action>_<idx>
   * prefix = "woodcutter" etc (kein '_' erlaubt, damit es eindeutig bleibt)
   */
  const RX_PREFIXED = /^([^_]+)_(N|NE|E|SE|S|SW|W|NW|NO|SO|O)_(walk|idle|work|carry)_(\d+)$/i;

  /**
   * Baut einen Index:
   *  {
   *    prefix: "woodcutter",
   *    scheme: "en" | "de",
   *    actions: { walk: { N: ["woodcutter_N_walk_0", ...], ... }, ... }
   *  }
   */
  function _buildPrefixedIndex(atlas) {
    const frames = atlas?.frames ? Object.keys(atlas.frames) : [];
    let prefix = null;
    const actions = {};
    const seenDirs = new Set();

    for (const k of frames) {
      const m = k.match(RX_PREFIXED);
      if (!m) continue;

      prefix = prefix || m[1];
      const dir = m[2].toUpperCase();
      const act = m[3].toLowerCase();
      const idx = parseInt(m[4], 10) | 0;

      (actions[act] ||= {});
      (actions[act][dir] ||= []);
      actions[act][dir].push({ key: k, i: idx });

      seenDirs.add(dir);
    }

    if (!prefix) return null;

    // Scheme: wenn NO/SO/O vorkommen -> "de", sonst "en"
    let scheme = "en";
    for (const d of seenDirs) {
      if (d === "NO" || d === "SO" || d === "O") { scheme = "de"; break; }
    }

    // Sortieren nach idx
    for (const act of Object.keys(actions)) {
      for (const dir of Object.keys(actions[act])) {
        actions[act][dir].sort((a, b) => a.i - b.i);
        actions[act][dir] = actions[act][dir].map(o => o.key);
      }
    }

    return { prefix, scheme, actions };
  }

  // Cache: atlasKey -> prefIndex|null
  const _prefCache = new Map();

  function _getPrefIndex(atlasKey, atlas) {
    if (_prefCache.has(atlasKey)) return _prefCache.get(atlasKey);
    const idx = _buildPrefixedIndex(atlas);
    _prefCache.set(atlasKey, idx);
    return idx;
  }

  // ---------------------------------------------------------------------------
  // Frame-Auswahl (Action/Dir + Animation)
  // ---------------------------------------------------------------------------

  /**
   * legacy "Idle_DIR_fi_0" / "Walk_DIR_fi_0" Muster
   * (wird nur genutzt, wenn solche Keys existieren)
   */
  function _pickLegacyFrame(atlas, action, dirTok, fi) {
    const act = action === "walk" ? "Walk" : action === "work" ? "Work" : action === "carry" ? "Carry" : "Idle";
    const key = `${act}_${dirTok}_${fi}_0`;
    if (_hasFrame(atlas, key)) return key;

    // Fallback: fi=0
    const key0 = `${act}_${dirTok}_0_0`;
    if (_hasFrame(atlas, key0)) return key0;

    // Manche Atlanten haben nur "frame_r_c"
    if (_hasFrame(atlas, "frame_0_0")) return "frame_0_0";

    return null;
  }

  /**
   * Prefixed Frames:
   *  woodcutter_N_walk_0 ... woodcutter_N_walk_3
   */
  function _pickPrefixedFrame(prefIndex, action, dirTok, fi) {
    if (!prefIndex) return null;

    const act = action;
    const actions = prefIndex.actions || {};

    // 1) exakte action vorhanden?
    let list = actions?.[act]?.[dirTok];

    // 2) Wenn idle/work/carry fehlen, nimm walk (sehr praktisch für frühe Sprite-Iterationen)
    if (!list && act !== "walk") list = actions?.walk?.[dirTok];

    // 3) Wenn dirTok in "anderem Scheme" ist, versuch alias
    if (!list) {
      const altDir = DIR_ALIASES[dirTok];
      if (altDir) {
        list = actions?.[act]?.[altDir] || actions?.walk?.[altDir];
      }
    }

    if (!list || !list.length) return null;

    const i = _clampInt(fi, 0, list.length - 1);
    return list[i];
  }

  /**
   * FPS -> Frameindex (fi) berechnen.
   * - Wenn Atlas nur 1 Frame hat: fi=0
   */
  function _frameIndexForNow(nowMs, fps, frameCount) {
    if (!frameCount || frameCount <= 1) return 0;
    const msPerFrame = 1000 / Math.max(1, fps || 1);
    return Math.floor(nowMs / msPerFrame) % frameCount;
  }

  /**
   * Haupt-Picker:
   *  - versucht prefixed
   *  - sonst legacy
   *  - sonst "erstes Frame" fallback
   */
  function _pickFrameName(atlasKey, atlas, action, dirTok, nowMs) {
    // Prefixed-Index
    const prefIndex = _getPrefIndex(atlasKey, atlas);

    // Erkannten Scheme-Hint zurückgeben (für Richtung)
    const schemeHint = prefIndex?.scheme || null;

    // Zuerst passenden DirTok im Scheme entscheiden
    // Wenn Atlas DE-Scheme nutzt, aber unser dirTok EN ist (oder andersrum), aliasen:
    let dirTokUse = dirTok;
    if (schemeHint === "de" && (dirTok === "E" || dirTok === "NE" || dirTok === "SE")) {
      dirTokUse = DIR_ALIASES[dirTok] || dirTok;
    }
    if (schemeHint === "en" && (dirTok === "O" || dirTok === "NO" || dirTok === "SO")) {
      dirTokUse = DIR_ALIASES[dirTok] || dirTok;
    }

    // Prefixed: frame count ermitteln (für fi)
    let prefCount = 0;
    if (prefIndex) {
      const list = (prefIndex.actions?.[action]?.[dirTokUse]) ||
                   (action !== "walk" ? prefIndex.actions?.walk?.[dirTokUse] : null) ||
                   (DIR_ALIASES[dirTokUse] ? (prefIndex.actions?.[action]?.[DIR_ALIASES[dirTokUse]] || prefIndex.actions?.walk?.[DIR_ALIASES[dirTokUse]]) : null);
      prefCount = list?.length || 0;
    }

    const fps = ACTION_FPS[action] ?? 2;
    const fiPref = _frameIndexForNow(nowMs, fps, prefCount);

    const prefFrame = _pickPrefixedFrame(prefIndex, action, dirTokUse, fiPref);
    if (prefFrame && _hasFrame(atlas, prefFrame)) return { frame: prefFrame, schemeHint };

    // Legacy: wir wissen nicht wie viele Frames es wirklich gibt -> probier fi 0..7
    // (weil die meisten Atlanten klein sind)
    for (let tryFi = 0; tryFi < 8; tryFi++) {
      const legacy = _pickLegacyFrame(atlas, action, dirTokUse, tryFi);
      if (legacy) return { frame: legacy, schemeHint };
    }

    // Fallback: nimm erstes Frame, wenn vorhanden
    const keys = atlas?.frames ? Object.keys(atlas.frames) : [];
    return { frame: keys[0] || null, schemeHint };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  const UnitAnim = {
    /** Debug & Tuning setzen. */
    setTuning(partial) {
      if (!partial || typeof partial !== "object") return;
      Object.assign(TUNING, partial);
      // Cache leeren, falls man z.B. perAtlas umstellt
      _prefCache.clear();
      if (TUNING.debug) console.info("[UnitAnim] setTuning", TUNING);
    },

    /**
     * Frame-Key für eine Unit bestimmen.
     * Returns: string | null
     */
    getFrameForUnit(u, nowMs = performance.now()) {
      const atlasKey = _getAtlasKeyForUnit(u);
      const atlas = window.Assets?.getAtlas?.(atlasKey) || null;

      const action = _getActionForUnit(u);

      // Erstmal grob Richtung (schemeHint kommt später aus picker)
      const dirTokRaw = _getDirTokenForUnit(u, atlasKey, "en");

      const picked = _pickFrameName(atlasKey, atlas, action, dirTokRaw, nowMs);

      // Wenn Atlas z.B. DE scheme hat, wollen wir Dir nochmal sauber in diesem Scheme merken,
      // damit Idle richtig bleibt.
      if (picked?.schemeHint) {
        const dirTokFinal = _getDirTokenForUnit(u, atlasKey, picked.schemeHint);
        // (dirTokFinal wird in u.__lastDir gespeichert)
        if (TUNING.debug && Math.random() < 0.01) {
          console.debug("[UnitAnim] dir scheme", { atlasKey, scheme: picked.schemeHint, dirTokRaw, dirTokFinal });
        }
      }

      if (TUNING.debug && Math.random() < 0.01) {
        console.debug("[UnitAnim]", { kind: _getUnitKind(u), atlasKey, action, dir: u.__lastDir, frame: picked?.frame });
      }
      return picked?.frame || null;
    },

    /** Nur Direction debug: {dirTok, atlasKey} */
    getDir(u) {
      const atlasKey = _getAtlasKeyForUnit(u);
      return { dirTok: _getDirTokenForUnit(u, atlasKey, "en"), atlasKey };
    },

    /**
     * Backwards-Compat: 8er-Richtung aus Delta (Tile oder World).
     * Wird von manchen Game-Teilen noch direkt aufgerufen.
     * Returns: "E","SE","S","SW","W","NW","N","NE" (EN-Tokens).
     */
    dir8FromDelta(dx, dy) {
      const x = Number(dx) || 0;
      const y = Number(dy) || 0;
      if (Math.abs(x) < 1e-6 && Math.abs(y) < 1e-6) return "S"; // Default
      const ang = Math.atan2(y, x);
      let deg = (ang * 180) / Math.PI;
      if (deg < 0) deg += 360;
      const idx = Math.round(deg / 45) % 8;
      return DIR8_EN[idx] || "S";
    },

    /** Debug-Hilfe: zeigt, ob prefixed index erkannt wurde */
    debugPrefIndex(atlasKey) {
      const atlas = window.Assets?.getAtlas?.(atlasKey) || null;
      const idx = _getPrefIndex(atlasKey, atlas);
      return idx;
    },

    /* ------------------------------------------------------------------------
     * NEU: UnitAnimResolver-Hooks (Tiere 8×8 + Menschen 8×4 / Mixed States)
     * ------------------------------------------------------------------------
     * Ziel:
     *  - Einheitliche Abfrage von Frame-Listen, egal ob:
     *      - Tiere: 8 Richtungen × 8 Frames (z.B. boar_E_walk_0..7)
     *      - Menschen: 8 Richtungen × 4 Frames (z.B. woodcutter_E_walk_0..3)
     *  - Fehlende States (idle/work/carry) werden automatisch auf walk gemappt
     *  - Diese Methoden sind READ-ONLY und ändern keine Logik im bestehenden Picker.
     * --------------------------------------------------------------------- */

    /**
     * Gibt die verfügbare Frame-Liste für (action, dir) zurück.
     * - action: "idle" | "walk" | "work" | "carry" | ...
     * - dirTok: "N","NE","E","SE","S","SW","W","NW" (oder Scheme-Token)
     *
     * Returns: string[] (kann leer sein)
     */
    resolveFrameList(atlasKey, action, dirTok) {
      const atlas = window.Assets?.getAtlas?.(atlasKey) || null;
      if (!atlas) return [];

      // Prefixed-Index (woodcutter_N_walk_0, boar_E_walk_7, ...)
      const prefIndex = _getPrefIndex(atlasKey, atlas);
      if (prefIndex) {
        // Reuse der internen Logik (inkl. State-Fallback walk)
        const list = (prefIndex.actions?.[action]?.[dirTok]
          || (action !== "walk" ? prefIndex.actions?.walk?.[dirTok] : null)
          || null);

        if (list && list.length) return list.slice();

        // Dir-Alias (falls anderes Scheme verwendet wurde)
        const alt = DIR_ALIASES[dirTok];
        if (alt) {
          const list2 = (prefIndex.actions?.[action]?.[alt]
            || (action !== "walk" ? prefIndex.actions?.walk?.[alt] : null)
            || null);
          if (list2 && list2.length) return list2.slice();
        }
      }

      // Legacy / Grid: wir versuchen, Keys heuristisch zu finden (bestehende Logik)
      // -> wir nehmen hier die gleiche Picker-Strategie: falls nichts da ist, leer.
      //    (Legacy-Resolutions sind in deinem Projekt selten, aber bleiben kompatibel.)
      return [];
    },

    /**
     * Liefert Meta-Infos über den Atlas (falls prefixed erkannt).
     * Returns: { scheme, prefix, actions: string[] } | null
     */
    resolveAtlasInfo(atlasKey) {
      const atlas = window.Assets?.getAtlas?.(atlasKey) || null;
      if (!atlas) return null;
      const prefIndex = _getPrefIndex(atlasKey, atlas);
      if (!prefIndex) return null;
      return {
        scheme: prefIndex.scheme,
        prefix: prefIndex.prefix,
        actions: Object.keys(prefIndex.actions || {}),
      };
    },

    /**
     * Gibt den aktuell verwendeten Frame-Index (0..n-1) zurück, passend zur
     * internen Frame-Auswahl (FPS + nowMs).
     * Returns: number
     */
    getFrameIndexForUnit(u, nowMs = performance.now()) {
      const atlasKey = _getAtlasKeyForUnit(u);
      if (!atlasKey) return 0;
      const atlas = window.Assets?.getAtlas?.(atlasKey) || null;
      if (!atlas) return 0;

      const action = _getActionForUnit(u);
      const dirTok = _getDirTokForUnit(u, atlasKey, atlas);

      // Prefixed bevorzugt (Tiere/Menschen)
      const prefIndex = _getPrefIndex(atlasKey, atlas);
      if (prefIndex) {
        // liste (inkl. State-Fallback walk)
        let list = prefIndex.actions?.[action]?.[dirTok];
        if (!list && action !== "walk") list = prefIndex.actions?.walk?.[dirTok];
        if (!list || !list.length) {
          const alt = DIR_ALIASES[dirTok];
          if (alt) {
            list = prefIndex.actions?.[action]?.[alt] || (action !== "walk" ? prefIndex.actions?.walk?.[alt] : null);
          }
        }
        const frameCount = list && list.length ? list.length : 1;
        const fps = ACTION_FPS[action] || 6;
        return _calcFrameIndex(nowMs, fps, frameCount);
      }

      // Legacy: keine sichere Index-Ermittlung, wir bleiben konservativ
      return 0;
    },
  };

  window.UnitAnim = UnitAnim;
})();
