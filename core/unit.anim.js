/* ============================================================================
 * Datei   : core/unit.anim.js
 * Version : v25.12.14-unit-anim-v3-iso-dirfix
 * Zweck   : Zentrale Frame-Auswahl für Units (idle/walk/work/carry) + 8 dirs.
 *           FIX: Richtung wird in ISO-Projekten aus GRID-Delta -> SCREEN-Delta
 *                abgeleitet (damit "Laufrichtung" optisch stimmt).
 *
 *  - Dieses Projekt rendert ISO: screenX ~ (x - y), screenY ~ (x + y)
 *    Wenn wir die Richtung aus (dx,dy) im Grid direkt nehmen, wirkt das oft
 *    "seitlich / rückwärts". Darum: erst in Screen-Deltas umrechnen.
 *
 *  - Zusätzlich gibt es Tuning-Optionen (Offset/Flip), falls ein Atlas eine
 *    andere Reihenfolge der Richtungen nutzt.
 * ========================================================================== */
(function(){
  'use strict';

  // ---------------------------------------------------------------------------
  // KONSTANTEN
  // ---------------------------------------------------------------------------
  const DIR8 = ['E','SE','S','SW','W','NW','N','NE']; // 0°=E, 45°=SE, ...
  const DEG_PER_STEP = 45;

  // ---------------------------------------------------------------------------
  // GLOBALE TUNING-OPTIONEN (kannst du per Konsole anpassen)
  // ---------------------------------------------------------------------------
  const TUNING = {
    // true: Grid->Screen Umrechnung verwenden (empfohlen für ISO)
    isoProject: true,

    // Rotiert die ermittelte Richtung um N Steps (je Step = 45°).
    // Beispiel: offsetSteps=2 dreht E->S usw.
    offsetSteps: 0,

    // Spiegelung horizontal (tauscht E<->W, NE<->NW, SE<->SW)
    flipX: false,

    // Spiegelung vertikal (tauscht N<->S, NE<->SE, NW<->SW)
    flipY: false,
  };

  function setTuning(opts){
    if (!opts) return;
    for (const k of Object.keys(TUNING)) {
      if (k in opts) TUNING[k] = opts[k];
    }
  }

  // ---------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // ---------------------------------------------------------------------------
  function _wrap8(i){ return ((i % 8) + 8) % 8; }

  function dir8FromAngleDeg(deg){
    const idx = _wrap8(Math.round(deg / DEG_PER_STEP));
    return DIR8[idx];
  }

  function dir8FromDelta(dx, dy){
    // Achtung: dy+ bedeutet "nach unten" => S
    const a = Math.atan2(dy, dx); // -pi..pi
    const deg = (a * 180 / Math.PI + 360) % 360;
    return dir8FromAngleDeg(deg);
  }

  function dir8FromGridDelta(dx, dy){
    // ISO-Projektion: screenX ~ (dx - dy), screenY ~ (dx + dy)
    // Das dreht/transformiert die Richtungen so, dass sie optisch stimmen.
    const sx = dx - dy;
    const sy = dx + dy;
    return dir8FromDelta(sx, sy);
  }

  function applyTuning(dir){
    let idx = DIR8.indexOf(dir);
    if (idx < 0) idx = 2; // Default S
    idx = _wrap8(idx + (TUNING.offsetSteps|0));
    let tuned = DIR8[idx];

    if (TUNING.flipX) {
      const mapX = {E:'W',W:'E',NE:'NW',NW:'NE',SE:'SW',SW:'SE',N:'N',S:'S'};
      tuned = mapX[tuned] || tuned;
    }
    if (TUNING.flipY) {
      const mapY = {N:'S',S:'N',NE:'SE',SE:'NE',NW:'SW',SW:'NW',E:'E',W:'W'};
      tuned = mapY[tuned] || tuned;
    }
    return tuned;
  }

  function pickFrame(frames, tSec, fps){
    if (!frames || !frames.length) return null;
    const i = Math.floor(tSec * (fps || 2)) % frames.length;
    return frames[i];
  }

  function bestDirFallback(dir, dirsMap){
    if (!dirsMap) return null;
    if (dirsMap[dir]) return dir;

    // Diagonalen auf Cardinale runterbrechen
    const fallbacks = {
      NE:['E','N'], SE:['E','S'], SW:['W','S'], NW:['W','N'],
      N:['N','NW','NE','W','E','S'], 
      E:['E','NE','SE','N','S','W'],
      S:['S','SE','SW','E','W','N'],
      W:['W','NW','SW','N','S','E']
    };
    for (const d of (fallbacks[dir] || ['S','E','W','N'])){
      if (dirsMap[d]) return d;
    }
    return Object.keys(dirsMap)[0] || null;
  }

  function normUnitId(k){
    k = String(k || '').trim();
    if (!k) return '';
    if (!k.startsWith('u.')) k = 'u.' + k;
    return k.replace(/_/g,'.').toLowerCase();
  }

  function getUnitDef(u){
    const raw = u?.kind || u?.type || u?.id;
    const id = normUnitId(raw);
    return window.Registry?.getUnit?.(id) || window.Registry?.units?.[id] || null;
  }

  function getAction(u){
    if (u?.__animState) return String(u.__animState);
    if (u?.task && u.task.type) {
      if (u.task.type === 'carry' || u.task.type === 'deliver') return 'walk';
      if (u.task.type === 'work') return 'work';
    }
    return 'idle';
  }

  function _getMoveDelta(u){
    // bevorzugt vx/vy (wenn gesetzt)
    const vx = Number(u?.vx || 0);
    const vy = Number(u?.vy || 0);
    if (Math.abs(vx) + Math.abs(vy) > 1e-4) return {dx:vx, dy:vy};

    // sonst aus task.to / task.target ableiten
    const tx = u?.task?.to?.x ?? u?.task?.dest?.x ?? u?.task?.target?.x;
    const ty = u?.task?.to?.y ?? u?.task?.dest?.y ?? u?.task?.target?.y;
    if (typeof tx === 'number' && typeof ty === 'number') {
      const dx = tx - Number(u?.x || 0);
      const dy = ty - Number(u?.y || 0);
      if (Math.abs(dx) + Math.abs(dy) > 1e-6) return {dx, dy};
    }

    return {dx:0, dy:0};
  }

  function getDir(u){
    const {dx, dy} = _getMoveDelta(u);
    if (Math.abs(dx) + Math.abs(dy) > 1e-6) {
      const base = TUNING.isoProject ? dir8FromGridDelta(dx, dy) : dir8FromDelta(dx, dy);
      const tuned = applyTuning(base);
      u.__lastDir = tuned;
      return tuned;
    }
    return u?.__lastDir || 'S';
  }

  // ---------------------------------------------------------------------------
  // HAUPT: Frame-Auswahl
  // ---------------------------------------------------------------------------
  function getFrameForUnit(u, nowMs){
    const def = getUnitDef(u);
    if (!def) return null;

    const atlasKey = def.atlasKey;
    const anims = def.anims || {};
    const action = getAction(u);
    const dir = getDir(u);

    const a = anims[action] || anims.idle;
    if (!a) {
      // Fallback: Standardframe
      return { atlasKey, frame: def.defaultFrame || 'frame_0_0', action, dir };
    }

    const useDir = bestDirFallback(dir, a.dirs);
    const frames = useDir ? a.dirs[useDir] : null;

    // Seed, damit nicht alle synchron zappeln
    const seed = (Number(u?.id || 0) * 0.1337) % 10;
    const t = ((nowMs || performance.now()) / 1000) + seed;

    const frame = pickFrame(frames, t, a.fps || 2) || def.defaultFrame || 'frame_0_0';
    return { atlasKey, frame, action, dir: useDir || dir };
  }

  // ---------------------------------------------------------------------------
  // EXPORT
  // ---------------------------------------------------------------------------
  window.UnitAnim = window.UnitAnim || {};
  window.UnitAnim.getFrameForUnit = getFrameForUnit;
  window.UnitAnim.normUnitId = normUnitId;
  window.UnitAnim.setTuning = setTuning;
  window.UnitAnim._tuning = TUNING; // Debug-View

})();
