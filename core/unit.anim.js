/* ============================================================================
 * Datei   : core/unit.anim.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.14-unit-anim-v3
 *
 * Zweck:
 *   Zentrale, datengetriebene Animations-/Frame-Auswahl für Units:
 *     - actions: idle / walk / work / carry   (später erweiterbar)
 *     - directions: 8 Richtungen (N,NE,E,SE,S,SW,W,NW) mit Fallback auf 4-dir
 *
 * Warum:
 *   Wir wollen NICHT überall im Code hart Frames verdrahten, sondern genau EINEN
 *   Ort haben, der aus (action, dir, time) -> frameName bestimmt.
 *
 * Erwartete Daten (optional) in data/units.json:
 *   {
 *     "id": "u.woodcutter",
 *     "atlasKey": "woodcutter_atlas",
 *     "defaultFrame": "frame_0_0",
 *     "anims": {
 *       "idle": { "fps": 2, "dirs": { "S":["frame_0_0","frame_0_1"] } },
 *       "walk": { "fps": 6, "dirs": { "S":["frame_1_0","frame_1_1"] } },
 *       "work": { "fps": 4, "dirs": { "S":["frame_2_0","frame_2_1"] } },
 *       "carry":{ "fps": 6, "dirs": { "S":["frame_3_0","frame_3_1"] } }
 *     }
 *   }
 *
 * Fallbacks:
 *   - Wenn eine Diagonale fehlt (NE/SE/SW/NW), wird auf E/W/N/S reduziert.
 *   - Wenn anims fehlen, wird defaultFrame oder "frame_0_0" genutzt.
 *
 * Debug:
 *   window.UnitAnim.getFrameForUnit(unit) -> { atlasKey, frame, action, dir }
 * ========================================================================== */
(function(){
  'use strict';

  const TAG = '[unit.anim]';
  const LOG = (...a)=> (window.CBLog?.ok ?? console.log)(TAG, ...a);
  const WARN= (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  const DIR8 = ['E','SE','S','SW','W','NW','N','NE']; // Reihenfolge passend zu atan2° (0°=E, 90°=S)
  const DIR4 = ['E','S','W','N'];

  // -------------------------------------------------------------------------
  // Helpers: Direction
  // -------------------------------------------------------------------------
  function dir8FromDelta(dx, dy){
    // Hinweis: dy+ bedeutet "nach unten" (Screen/Tile Koordinaten) => 90° = S
    const a = Math.atan2(dy, dx);          // -pi..pi
    const deg = (a * 180 / Math.PI + 360) % 360;
    const idx = Math.round(deg / 45) % 8;
    return DIR8[idx] || 'S';
  }

  function dir4FromDir8(d){
    if (d === 'NE' || d === 'SE') return 'E';
    if (d === 'NW' || d === 'SW') return 'W';
    if (d === 'N') return 'N';
    if (d === 'S') return 'S';
    // E/W
    if (d === 'E' || d === 'W') return d;
    return 'S';
  }

  // -------------------------------------------------------------------------
  // Helpers: Frames
  // -------------------------------------------------------------------------
  function pickFrame(frames, tSec, fps){
    if (!Array.isArray(frames) || frames.length === 0) return null;
    const f = Math.max(0.1, Number(fps) || 2);
    const i = Math.floor(tSec * f) % frames.length;
    return frames[i] || null;
  }

  function bestDirFallback(dir, dirsMap){
    if (!dirsMap || typeof dirsMap !== 'object') return null;
    if (dirsMap[dir]) return dir;

    // Diagonalen auf Cardinale reduzieren
    const d4 = dir4FromDir8(dir);
    if (dirsMap[d4]) return d4;

    // Als letzte Rettung: irgendeine existierende Richtung
    const keys = Object.keys(dirsMap);
    return keys[0] || null;
  }


  // -------------------------------------------------------------------------
  // Auto-Fallback (ohne anims im units.json):
  //   Viele Atlanten nutzen Namensschema "frame_<row>_<col>".
  //   Wir picken bevorzugt row0 (idle) und row1 (walk), jeweils die ersten 2–4 Frames.
  // -------------------------------------------------------------------------
  function _numKeySort(a, b){
    const pa = a.split('_').map(x=>parseInt(x,10)).filter(Number.isFinite);
    const pb = b.split('_').map(x=>parseInt(x,10)).filter(Number.isFinite);
    for (let i=0;i<Math.max(pa.length,pb.length);i++){
      const da = pa[i] ?? 0;
      const db = pb[i] ?? 0;
      if (da !== db) return da - db;
    }
    return a.localeCompare(b);
  }

  function autoFramesForAction(atlasKey, action){
    const A = window.Assets?.getAtlas?.(atlasKey);
    const keys = Object.keys(A?.frames || {});
    if (!keys.length) return null;

    // bevorzugte Reihen je nach Action
    const preferRow = (action === 'walk' || action === 'carry') ? 1 : 0;

    const row = keys
      .filter(k => k.startsWith('frame_' + preferRow + '_'))
      .sort(_numKeySort);

    if (row.length >= 2) return row.slice(0, Math.min(4, row.length));

    // fallback: row0
    const row0 = keys
      .filter(k => k.startsWith('frame_0_'))
      .sort(_numKeySort);

    if (row0.length >= 2) return row0.slice(0, Math.min(4, row0.length));

    // last resort: erste Frames overall
    return keys.sort(_numKeySort).slice(0, Math.min(4, keys.length));
  }

  // -------------------------------------------------------------------------
  // Auto-Dir-Fallback (ohne anims im units.json):
  //   Wenn ein Atlas mindestens 8 "frame_<row>_<col>"-Zeilen besitzt, nehmen wir an:
  //     - row 0..7 sind die 8 Richtungen in DIR8-Reihenfolge
  //     - cols sind Anim-Frames (0..n)
  //   Dadurch bekommen wir DIREKTIONEN auch ohne explizite anims.* Daten.
  // -------------------------------------------------------------------------
  function autoDirsForAction(atlasKey, action){
    const A = window.Assets?.getAtlas?.(atlasKey);
    const frames = A?.frames || {};
    const keys = Object.keys(frames);
    if (!keys.length) return null;

    // frame_<row>_<col> parsen
    const rows = new Map(); // row -> [{k,row,col}]
    for (const k of keys){
      const m = /^frame_(\d+)_(\d+)$/.exec(k);
      if (!m) continue;
      const r = parseInt(m[1], 10);
      const c = parseInt(m[2], 10);
      if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
      if (!rows.has(r)) rows.set(r, []);
      rows.get(r).push({ k, r, c });
    }
    if (rows.size < 4) return null;

    const sortedRows = Array.from(rows.keys()).sort((a,b)=>a-b);

    // 8-dir bevorzugt, sonst 4-dir
    let use = null; // '8' | '4'
    if (sortedRows.length >= 8) use = '8';
    else if (sortedRows.length >= 4) use = '4';
    else return null;

    const fps =
      (action === 'walk' || action === 'carry') ? 6 :
      (action === 'work') ? 4 : 2;

    const dirs = {};
    const dirList = (use === '8') ? DIR8 : DIR4;
    const neededRows = (use === '8') ? 8 : 4;

    // Heuristik: wir nehmen die ersten 8/4 numerischen rows (meist 0..7/0..3).
    for (let i=0; i<neededRows; i++){
      const rowIdx = sortedRows[i];
      const dir = dirList[i];
      const items = rows.get(rowIdx) || [];
      items.sort((a,b)=>a.c - b.c);

      // Frames je Action:
      // - idle/work: eher kurz (max 2)
      // - walk/carry: etwas länger (max 4)
      const maxN = (action === 'walk' || action === 'carry') ? 4 : 2;
      const arr = items.map(x=>x.k).slice(0, Math.min(maxN, items.length));
      if (arr.length) dirs[dir] = arr;
    }

    if (!Object.keys(dirs).length) return null;
    return { fps, dirs };
  }

  // -------------------------------------------------------------------------
  // Helpers: Registry / Unit-Def
  // -------------------------------------------------------------------------
  function normUnitId(k){
    k = String(k || '').trim();
    if (!k) return '';
    if (!k.startsWith('u.')) k = 'u.' + k;
    return k.replace(/_/g,'.').toLowerCase();
  }

  function getUnitDef(u){
    const raw = u?.kind || u?.type || u?.id || u?.unitKind || u?.unitType;
    const id  = normUnitId(raw);
    const R   = window.Registry;
    if (!R || !id) return null;

    // Registry kann getUnit(...) haben oder ein plain units-Objekt sein
    if (typeof R.getUnit === 'function') return R.getUnit(id);
    if (typeof R.get === 'function') return R.get('units', id);
    if (R.units && R.units[id]) return R.units[id];
    return null;
  }

  // -------------------------------------------------------------------------
  // Action Heuristik (kann von WorkArea/Jobs überschrieben werden)
  // -------------------------------------------------------------------------
  function getAction(u){
    // Explizit (WorkArea/Worker-Loop setzt z.B. "work")
    if (u && typeof u.__animState === 'string' && u.__animState.length) return u.__animState;

    // Task-Heuristik (best effort)
    const t = u?.task?.type || u?.task?.kind || u?.task?.action || '';
    if (t === 'work') return 'work';
    if (t === 'carry' || t === 'deliver' || t === 'pickup') return 'walk';

    // Velocity -> walk
    const vx = Number(u?.vx || 0);
    const vy = Number(u?.vy || 0);
    if (Math.abs(vx) + Math.abs(vy) > 1e-4) return 'walk';

    return 'idle';
  }

  function getDir(u){
    // 8-dir bevorzugt:
    //  1) vx/vy (echte Bewegung)
    //  2) Task-Ziel (wenn Movement ohne vx/vy implementiert ist)
    //  3) gespeicherte Richtung (u._dir8 / u.__lastDir / u._dir)
    const vx = Number(u?.vx || 0);
    const vy = Number(u?.vy || 0);
    if (Math.abs(vx) > 1e-6 || Math.abs(vy) > 1e-6){
      return dir8FromDelta(vx, vy);
    }

    // Viele unserer Worker bewegen sich "teleport-weise" pro Tick (x/y werden direkt gesetzt),
    // ohne vx/vy zu pflegen. Dann nehmen wir die Richtung zum aktuellen Task-Ziel.
    const tgt = u?.task?.target || u?.task?.dest || u?.task?.to || u?.task?.goal || null;
    const ux = Number(u?.x);
    const uy = Number(u?.y);
    if (tgt && Number.isFinite(tgt.x) && Number.isFinite(tgt.y) && Number.isFinite(ux) && Number.isFinite(uy)){
      const dx = Number(tgt.x) - ux;
      const dy = Number(tgt.y) - uy;
      if (Math.hypot(dx, dy) > 1e-3){
        return dir8FromDelta(dx, dy);
      }
    }

    // bereits gespeicherte Richtungen akzeptieren
    if (typeof u?._dir8 === 'string' && u._dir8) return u._dir8;
    if (typeof u?._dir === 'string' && u._dir){
      // _dir kann 4-dir sein – wir mappen grob auf 8-dir
      const d = u._dir.toUpperCase();
      if (d === 'E' || d === 'W' || d === 'N' || d === 'S') return d;
    }

    return u?.__lastDir || 'S';
  }

  // -------------------------------------------------------------------------
  // Public: Frame für Unit bestimmen
  // -------------------------------------------------------------------------
  function getFrameForUnit(u, nowMs){
    const def = getUnitDef(u);
    if (!def) return null;

    const atlasKey = def.atlasKey || def.spriteAtlasKey || def.sprite?.atlasKey || def.sprite?.atlas || null;
    const anims = def.anims || {};
    const action = getAction(u);
    const dir = getDir(u);

    // anim wählen: action -> fallback idle
    const a = anims[action] || anims.idle || null;
    // Zeit (sek) + Seed (damit nicht alle synchron zappeln)
    const seed = (Number(u?.id || 0) * 0.1337) % 10;
    const t = (((nowMs ?? (performance.now?.() ?? Date.now())) / 1000) + seed);

    let frame = null;
    let usedDir = dir;

    if (a && a.dirs){
      // Datengetrieben (anims in units.json)
      usedDir = bestDirFallback(dir, a.dirs) || dir;
      const frames = a.dirs[usedDir] || null;
      frame = pickFrame(frames, t, a.fps || 2);
    
    } else {
      // Auto-Fallback (ohne anims):
      //  1) Wenn der Atlas wie "8-dir in rows" aussieht, nutzen wir autoDirsForAction()
      //  2) sonst: alte Heuristik (autoFramesForAction) ohne Richtungen
      const autoDir = autoDirsForAction(atlasKey, action);
      if (autoDir && autoDir.dirs){
        usedDir = bestDirFallback(dir, autoDir.dirs) || dir;
        const frames = autoDir.dirs[usedDir] || null;
        frame = pickFrame(frames, t, autoDir.fps || 2);
      } else {
        const auto = autoFramesForAction(atlasKey, action);
        if (auto && auto.length){
          // Ohne definierte dirs setzen wir usedDir stabil auf S
          usedDir = 'S';
          const fps = (action === 'walk' || action === 'carry') ? 6 : 2;
          frame = pickFrame(auto, t, fps);
        }
      }
    }


    if (!frame){
      frame = def.defaultFrame || def.sprite?.defaultFrame || 'frame_0_0';
    }

    // lastDir merken (stabil für idle)
    u.__lastDir = usedDir || dir || 'S';

    return { atlasKey, frame, action, dir: u.__lastDir };
  }

  // -------------------------------------------------------------------------
  // EXPORT
  // -------------------------------------------------------------------------
  window.UnitAnim = {
    getFrameForUnit,
    normUnitId,
    dir8FromDelta,
    dir4FromDir8
  };

  LOG('geladen v25.12.14-unit-anim-v3');
})();
