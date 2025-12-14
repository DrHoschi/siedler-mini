/* ============================================================================
 * Datei   : core/unit.anim.js
 * Version : v25.12.14-unit-anim-v3-dir-tokens
 * Zweck   : Zentrale Frame-Auswahl für Units (idle/walk/work/carry) + 8 Richtungen.
 *           Fix: Unterstützt deutsche Dir-Tokens im Atlas/Mapping (NO, SO, O)
 *                und autodetektiert Idle_* Frames (z.B. Idle_N_0_0 ... Idle_SO_0_0).
 *
 * WICHTIG:
 * - Du hast deine Richtungen im Atlas bereits festgelegt (N, NO, O, SO, S, SW, W, NW).
 *   Wir halten uns daran und mappen NE->NO, E->O, SE->SO, sofern diese Keys existieren.
 * - ISO-Projektion ist standardmäßig AUS, damit wir nicht "seitlich/rückwärts" wirken,
 *   wenn deine Richtungen bereits "spielerisch korrekt" benannt sind.
 *   Optional kannst du ISO-Projektion später aktivieren via:
 *     UnitAnim.setTuning({ isoProject:true })
 * ========================================================================== */
(function(){
  'use strict';

  // --------------------------------------------------------------------------
  // TUNING (kannst du live in der Konsole ändern)
  // --------------------------------------------------------------------------
  const _tuning = {
    isoProject: false,   // default: false (weil du die Richtungen schon im Atlas richtig benannt hast)
    offsetSteps: 0,      // 0..7 (je Schritt = 45° Rotation)
    flipX: false,        // Spiegelung links/rechts
    flipY: false         // Spiegelung oben/unten
  };

  // 8er-Richtung in "engine intern" (englisch)
  const DIR8 = ['E','SE','S','SW','W','NW','N','NE'];

  // Alias-Map: intern -> mögliche Dir-Tokens in Atlanten/Defs
  // - Deutsch: O statt E, NO statt NE, SO statt SE
  const DIR_ALIASES = {
    E:  ['E', 'O'],
    W:  ['W'],
    N:  ['N'],
    S:  ['S'],
    NE: ['NE', 'NO'],
    NW: ['NW'],
    SE: ['SE', 'SO'],
    SW: ['SW']
  };

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  function normUnitId(k){
    k = String(k || '').trim();
    if (!k) return '';
    if (!k.startsWith('u.')) k = 'u.' + k;
    return k.replace(/_/g,'.').toLowerCase();
  }

  function _atanDir8(dx, dy){
    // dx: + rechts, dy: + runter
    // Richtung aus Winkel (0°=E)
    const a = Math.atan2(dy, dx); // -pi..pi
    const deg = (a * 180 / Math.PI + 360) % 360;
    const idx = Math.round(deg / 45) % 8;
    return DIR8[idx];
  }

  function dir8FromDelta(dx, dy){
    dx = Number(dx || 0);
    dy = Number(dy || 0);

    // optional ISO-Projektion (default aus)
    if (_tuning.isoProject) {
      // sehr einfache Projektion: grid -> screen
      const sx = dx - dy;
      const sy = (dx + dy) * 0.5;
      dx = sx;
      dy = sy;
    }

    if (_tuning.flipX) dx = -dx;
    if (_tuning.flipY) dy = -dy;

    let d = _atanDir8(dx, dy);

    // Rotation in 45°-Schritten
    if (_tuning.offsetSteps) {
      const i = DIR8.indexOf(d);
      d = DIR8[(i + (_tuning.offsetSteps|0) + 8) % 8];
    }
    return d;
  }

  function pickFrame(frames, tSec, fps){
    if (!frames || !frames.length) return null;
    const f = Math.max(0.1, Number(fps || 2));
    const i = Math.floor(tSec * f) % frames.length;
    return frames[i];
  }

  function _getUnitDef(u){
    const raw = u?.kind || u?.type || u?.id;
    const id = normUnitId(raw);
    return window.Registry?.getUnit?.(id) || window.Registry?.units?.[id] || null;
  }

  function _getAction(u){
    // bevorzugt explizit gesetzter State (Worker/AI setzt das)
    if (u?.__animState) return String(u.__animState);

    // Fallback-Heuristik
    if (u?.task?.type) {
      if (u.task.type === 'work') return 'work';
      if (u.task.type === 'carry' || u.task.type === 'deliver') return 'carry';
      if (u.task.type === 'move' || u.task.type === 'walk') return 'walk';
    }
    return 'idle';
  }

  function _getDeltaForDir(u){
    // 1) vx/vy (wenn vorhanden)
    const vx = Number(u?.vx || 0);
    const vy = Number(u?.vy || 0);
    if (Math.abs(vx) + Math.abs(vy) > 1e-4) return { dx:vx, dy:vy };

    // 2) task-Ziel (to/target/dest)
    const to = u?.task?.to || u?.task?.target || u?.task?.dest || u?.task?.pos;
    if (to && typeof to.x === 'number' && typeof to.y === 'number') {
      const dx = to.x - Number(u?.x || 0);
      const dy = to.y - Number(u?.y || 0);
      if (Math.abs(dx) + Math.abs(dy) > 1e-4) return { dx, dy };
    }

    return { dx:0, dy:0 };
  }

  function _pickDirKey(requestedDir, dirsMap){
    if (!dirsMap) return null;

    // 1) Direkt
    if (dirsMap[requestedDir]) return requestedDir;

    // 2) Aliase (NE->NO, E->O, SE->SO, etc.)
    const aliases = DIR_ALIASES[requestedDir] || [requestedDir];
    for (const a of aliases) {
      if (dirsMap[a]) return a;
    }

    // 3) Diagonalen auf Cardinale runterbrechen
    const fallbacks = {
      NE:['E','N','O','NO'], SE:['E','S','O','SO'],
      SW:['W','S'], NW:['W','N'],
      N:['N','NW','NO','W','O'], E:['E','O','NE','SE','NO','SO'], S:['S','SE','SW','SO'], W:['W','NW','SW']
    };
    for (const d of (fallbacks[requestedDir] || ['S','E','W','N'])) {
      if (dirsMap[d]) return d;
      const als = DIR_ALIASES[d] || [d];
      for (const a of als) if (dirsMap[a]) return a;
    }

    // 4) irgendwas, was existiert
    const keys = Object.keys(dirsMap);
    return keys.length ? keys[0] : null;
  }

  function _autoDetectIdleDirs(atlas){
    // Erkenne Pattern: Idle_<DIR>_0_0 (DIR kann NO, SO, O etc sein)
    const frames = atlas?.frames || {};
    const re = /^Idle_(NW|N|NO|W|S|O|SW|SO)_0_0$/;
    const map = {};
    for (const k of Object.keys(frames)) {
      const m = re.exec(k);
      if (!m) continue;
      const dirToken = m[1]; // z.B. "NO"
      map[dirToken] = [k];   // 1 Frame (später: mehrere Frames möglich)
    }
    return Object.keys(map).length ? map : null;
  }

  function getFrameForUnit(u, nowMs){
    const def = _getUnitDef(u);
    if (!def) return null;

    const atlasKey = def.atlasKey;
    const atlas = window.Assets?.getAtlas?.(atlasKey);

    // Action + Dir
    const action = _getAction(u);
    const {dx,dy} = _getDeltaForDir(u);
    const dir = (Math.abs(dx)+Math.abs(dy) > 1e-4) ? dir8FromDelta(dx,dy) : (u.__lastDir || 'S');

    // Zeit (Seed verhindert Sync-Zappeln)
    const seed = (Number(u?.id || 0) * 0.1337) % 10;
    const tSec = ((nowMs || performance.now()) / 1000) + seed;

    // 1) Datengetriebene Anim-Defs
    const anims = def.anims || {};
    let a = anims[action] || anims.idle;

    // 2) Auto-Detect: Idle_* im Atlas vorhanden -> nutze als idle/walk/carry/work Fallback
    if (!a && atlas) {
      const idleDirs = _autoDetectIdleDirs(atlas);
      if (idleDirs) {
        a = { fps: 2, dirs: idleDirs };
      }
    }

    // 3) Alter Fallback: frame_<row>_<col> (z.B. frame_0_0 ...)
    if (!a && atlas) {
      const keys = Object.keys(atlas.frames || {});
      const f00 = keys.includes('frame_0_0') ? 'frame_0_0' : (keys[0] || null);
      if (f00) {
        a = { fps: 2, dirs: { S:[f00] } };
      }
    }

    // Wenn immer noch nichts: defaultFrame
    if (!a) {
      u.__lastDir = dir || 'S';
      return { atlasKey, frame: def.defaultFrame || 'frame_0_0', action, dir: u.__lastDir };
    }

    const useDirKey = _pickDirKey(dir, a.dirs);
    const frames = useDirKey ? a.dirs[useDirKey] : null;

    const frame = pickFrame(frames, tSec, a.fps || 2) || def.defaultFrame || 'frame_0_0';

    // lastDir merken (für Stillstand)
    u.__lastDir = useDirKey || dir || 'S';

    return { atlasKey, frame, action, dir: u.__lastDir };
  }

  function setTuning(patch){
    if (!patch) return;
    for (const k of Object.keys(patch)) {
      if (k in _tuning) _tuning[k] = patch[k];
    }
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------
  window.UnitAnim = {
    getFrameForUnit,
    normUnitId,
    dir8FromDelta,
    setTuning
  };
})();
