/* ============================================================================
 * Datei   : core/unit.anim.js
 * Version : v25.12.14-unit-anim-v1
 * Zweck   : Zentrale Frame-Auswahl für Units (idle/walk/work/carry) + 8 dirs.
 * ========================================================================== */
(function(){
  'use strict';

  const DIR8 = ['N','NE','E','SE','S','SW','W','NW'];

  function dir8FromDelta(dx, dy){
    // dy+: nach unten = S
    const a = Math.atan2(dy, dx); // -pi..pi
    const deg = (a * 180 / Math.PI + 360) % 360;
    const idx = Math.round(deg / 45) % 8;
    return DIR8[idx];
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
      N:['N','W','E','S'], E:['E','N','S','W'], S:['S','E','W','N'], W:['W','N','S','E']
    };
    for (const d of (fallbacks[dir] || ['S','E','W','N'])){
      if (dirsMap[d]) return d;
    }
    // irgendwas, was existiert:
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
    // WorkArea/Worker setzt das:
    if (u?.__animState) return String(u.__animState);
    // einfache Heuristik:
    if (u?.task && u.task.type) {
      if (u.task.type === 'carry' || u.task.type === 'deliver') return 'walk';
      if (u.task.type === 'work') return 'work';
    }
    return 'idle';
  }

  function getDir(u){
    // Wenn wir vx/vy haben: perfekt.
    const vx = Number(u?.vx || 0);
    const vy = Number(u?.vy || 0);
    if (Math.abs(vx) + Math.abs(vy) > 1e-4) return dir8FromDelta(vx, vy);

    // sonst: lastDir behalten (stabil)
    return u?.__lastDir || 'S';
  }

  function getFrameForUnit(u, nowMs){
    const def = getUnitDef(u);
    if (!def) return null;

    const atlasKey = def.atlasKey;
    const anims = def.anims || {};
    const action = getAction(u);
    const dir = getDir(u);

    const a = anims[action] || anims.idle;
    if (!a) return { atlasKey, frame: def.defaultFrame || 'frame_0_0' };

    const useDir = bestDirFallback(dir, a.dirs);
    const frames = useDir ? a.dirs[useDir] : null;

    // Seed, damit nicht alle synchron zappeln
    const seed = (Number(u?.id || 0) * 0.1337) % 10;
    const t = ((nowMs || performance.now()) / 1000) + seed;

    const frame = pickFrame(frames, t, a.fps || 2) || def.defaultFrame || 'frame_0_0';

    // lastDir merken
    u.__lastDir = useDir || dir || 'S';

    return { atlasKey, frame, action, dir: u.__lastDir };
  }

  window.UnitAnim = { getFrameForUnit, normUnitId, dir8FromDelta };
})();
