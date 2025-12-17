/* ============================================================================
 * Datei   : core/adfinder.registry-rules.js
 * Projekt : Siedler‑Mini (Epoche 1)
 * Version : v25.12.17-adfinder-registry-rules-v1
 * ---------------------------------------------------------------------------
 * Zweck:
 *  - Zentraler, stabiler Default-Blocker für AdFinder.findPath()
 *  - Wasser-Tiles NICHT hardcoded, sondern aus map.metadata.legend erkannt
 *  - Fertige Gebäude blockieren ihren Footprint (Türtile bleibt passierbar)
 *  - Map-Ressourcen (Trees/Stones/Fish) blockieren (wie bisher)
 *  - Optional: Helper AdFinder.findPathToBuilding() (Türziel + Ring-Fallback)
 *
 * Wichtig:
 *  - Dieses Modul ist absichtlich "monkey patch" → wir überschreiben NICHT
 *    core/adfinder.js, sondern legen nur robuste Defaults oben drauf.
 *  - Damit vermeiden wir wieder die klassischen "Map dunkel / Script tot" Fälle.
 * ========================================================================== */
(function(){
  'use strict';

  const TAG = '[adfinder.rules]';
  const LOG  = (window.CBLog?.ok   || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn || console.warn).bind(console, TAG);

  // Mehrfach laden verhindern
  if (window.__ADFINDER_RULES_V1__) return;
  window.__ADFINDER_RULES_V1__ = true;

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  function toInt(v, d=0){
    const n = Number(v);
    return Number.isFinite(n) ? (n|0) : (d|0);
  }

  function getMapState(){
    return window.GameMap?._state || window.Game?.map?._state || null;
  }

  function getGrid(map){
    return map?.grid || map?.tiles || map?.tileGrid || null;
  }

  function getLegend(map){
    // bevorzugt metadata.legend, aber wir nehmen auch direkte legend-Objekte
    return map?.metadata?.legend || map?.legend || null;
  }

  function normName(v){
    return String(v || '').toLowerCase().trim();
  }

  // Cache: Wasser-ID-Set je Legend-Objekt
  let _cachedLegendRef = null;
  let _cachedWaterIds  = null;

  function computeWaterIdSet(map){
    const legend = getLegend(map);
    if (!legend || typeof legend !== 'object') return null;

    // Cache hit?
    if (_cachedLegendRef === legend && _cachedWaterIds) return _cachedWaterIds;

    const ids = new Set();
    for (const k of Object.keys(legend)){
      const name = normName(legend[k]);
      // "river/fluss" behandeln wir auch als Wasser → nicht begehbar
      if (!name) continue;
      if (name.includes('water') || name.includes('ocean') || name.includes('sea') ||
          name.includes('river') || name.includes('fluss') || name.includes('lake')){
        const id = toInt(k, NaN);
        if (Number.isFinite(id)) ids.add(id);
      }
    }

    _cachedLegendRef = legend;
    _cachedWaterIds  = ids;
    return ids;
  }

  function isWaterTileId(tid, map){
    if (!Number.isFinite(tid)) return false;

    const set = computeWaterIdSet(map);
    if (set && set.size) return set.has(tid);

    // Fallback (wenn keine Legend vorhanden ist)
    // Achtung: konservativ – in alten Karten war 9 manchmal "sand".
    return tid === 8 || tid === 9;
  }

  function getResourceNodes(map){
    // 1) MapResources (neuer Pfad)
    const mr = window.MapResources;
    if (mr?.state?.nodes && Array.isArray(mr.state.nodes)) return mr.state.nodes;

    // 2) GameMap._state.objects (einige Karten)
    const objs = map?.objects;
    if (Array.isArray(objs) && objs.length){
      return objs
        .filter(o => o && (o.type === 'tree' || o.type === 'rock' || o.type === 'fish'))
        .map(o => ({ x: toInt(o.x, -999), y: toInt(o.y, -999) }));
    }

    return [];
  }

  function isDoneBuilding(b){
    const stage = (typeof b?.buildStage === 'number') ? b.buildStage : -1;
    return (stage >= 3) || (b?.status === 'done') || (b?.buildPhase === 'complete') || (b?.buildPhase === 3);
  }

  function getBuildingFootprint(b){
    const bx = toInt(b?.tx ?? b?.x, NaN);
    const by = toInt(b?.ty ?? b?.y, NaN);
    const bw = Math.max(1, toInt(b?.w, 1));
    const bh = Math.max(1, toInt(b?.h, 1));
    if (!Number.isFinite(bx) || !Number.isFinite(by)) return null;
    return { bx, by, bw, bh };
  }

  function getDoorTile(b){
    const tx = toInt(b?.entranceTx, NaN);
    const ty = toInt(b?.entranceTy, NaN);
    if (Number.isFinite(tx) && Number.isFinite(ty)) return { tx, ty };

    // Fallback: entrancesAbs[0]
    if (Array.isArray(b?.entrancesAbs) && b.entrancesAbs.length){
      const e = b.entrancesAbs[0];
      const ex = toInt(e?.tx, NaN), ey = toInt(e?.ty, NaN);
      if (Number.isFinite(ex) && Number.isFinite(ey)) return { tx: ex, ty: ey };
    }

    // Fallback: alte Struktur (dx/dy relativ)
    const def = window.Registry?.getBuilding?.(b?.id) || null;
    const entrances = (def && Array.isArray(def.entrances) && def.entrances.length)
      ? def.entrances
      : (Array.isArray(b?.entrances) ? b.entrances : null);

    if (entrances && entrances.length){
      const fp = getBuildingFootprint(b);
      if (fp){
        return { tx: fp.bx + toInt(entrances[0].dx, 0), ty: fp.by + toInt(entrances[0].dy, 0) };
      }
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // Default isBlocked (Registry/Legend/Buildings/Resources)
  // --------------------------------------------------------------------------
  function defaultIsBlocked(tx, ty, allow){
    const map  = getMapState();
    const grid = getGrid(map);
    const cols = toInt(map?.cols ?? map?.width, 0);
    const rows = toInt(map?.rows ?? map?.height, 0);

    // 1) Bounds
    if (tx < 0 || ty < 0) return true;
    if (cols && tx >= cols) return true;
    if (rows && ty >= rows) return true;

    // 2) Terrain (Wasser via Legend)
    let tid = null;
    try{ tid = grid?.[ty]?.[tx]; }catch(e){}
    if (isWaterTileId(tid, map)) return true;

    // 3) Ressourcen-Nodes blockieren
    const nodes = getResourceNodes(map);
    if (Array.isArray(nodes) && nodes.length){
      for (const n of nodes){
        if (!n) continue;
        if ((n.x|0) === tx && (n.y|0) === ty) return true;
      }
    }

    // 4) Fertige Gebäude blockieren Footprint (Türtile bleibt passierbar)
    const buildings = window.Game?.buildings || window.GameBuildings?.list || null;
    if (Array.isArray(buildings) && buildings.length){
      for (const b of buildings){
        if (!b) continue;
        if (!isDoneBuilding(b)) continue;

        const fp = getBuildingFootprint(b);
        if (!fp) continue;

        // Tile im Footprint?
        if (tx >= fp.bx && tx < fp.bx + fp.bw && ty >= fp.by && ty < fp.by + fp.bh){

          // Türtile IM Footprint: passierbar lassen (falls Door-Regel so gesetzt wurde)
          const door = getDoorTile(b);
          if (door && door.tx === tx && door.ty === ty) continue;

          // Explizit erlaubte Tiles/Rectangles
          if (allow){
            if (allow.start && tx === (allow.start.x|0) && ty === (allow.start.y|0)) continue;
            if (allow.goal  && tx === (allow.goal.x|0)  && ty === (allow.goal.y|0))  {
              // Goal innerhalb eines done-Footprints NUR erlauben, wenn auch in allow.rects
              let inRect = false;
              if (Array.isArray(allow.rects)){
                for (const r of allow.rects){
                  if (!r) continue;
                  if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) { inRect = true; break; }
                }
              }
              if (inRect) continue;
            }
            if (Array.isArray(allow.rects)){
              for (const r of allow.rects){
                if (!r) continue;
                if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) continue;
              }
            }
          }

          return true;
        }
      }
    }

    return false;
  }

  // --------------------------------------------------------------------------
  // Monkey patch AdFinder.findPath (nur Default-Blocker setzen)
  // --------------------------------------------------------------------------
  function patchAdFinder(){
    const A = window.AdFinder;
    if (!A || typeof A.findPath !== 'function'){
      WARN('AdFinder nicht bereit – patch wird später versucht');
      return false;
    }
    if (A.__patchedByRulesV1) return true;

    const orig = A.findPath.bind(A);

    A.findPath = function(from, to, opts={}){
      const o = opts || {};
      // Nur wenn der Caller keinen eigenen Blocker gibt:
      if (typeof o.isBlocked !== 'function'){
        o.isBlocked = defaultIsBlocked;
      }
      return orig(from, to, o);
    };

    // Optionaler Helper: Türziel + Ring-Fallback
    A.findPathToBuilding = function(from, building, opts={}){
      const door = getDoorTile(building);
      const fp   = getBuildingFootprint(building);

      const base = door ? { tx: door.tx, ty: door.ty }
                        : (fp ? { tx: fp.bx + Math.floor(fp.bw/2), ty: fp.by + fp.bh } : { tx: 0, ty: 0 });

      const R = Math.max(1, toInt(opts?.goalRing ?? 2, 2));
      const cand = [];

      // 0) zuerst exakt die Tür
      cand.push(base);

      // 1) Ring um die Tür (Manhattan-Ring)
      for (let r=1; r<=R; r++){
        for (let dx=-r; dx<=r; dx++){
          const dy = r - Math.abs(dx);
          cand.push({ tx: base.tx + dx, ty: base.ty + dy });
          if (dy !== 0) cand.push({ tx: base.tx + dx, ty: base.ty - dy });
        }
      }

      // Kandidaten filtern: nicht Wasser + nicht Node + nicht inside done-footprint
      const map = getMapState();
      const grid = getGrid(map);
      const nodes = getResourceNodes(map);
      const nodeSet = new Set(nodes.map(n => ((n.x|0)<<16) ^ (n.y|0)));

      function okGoal(t){
        if (!t) return false;
        const tid = grid?.[t.ty]?.[t.tx];
        if (isWaterTileId(tid, map)) return false;
        if (nodeSet.has(((t.tx|0)<<16) ^ (t.ty|0))) return false;
        // done-building-footprint vermeiden (außer Türtile eines Targets – hier nicht nötig)
        const buildings = window.Game?.buildings || [];
        for (const b of buildings){
          if (!b || !isDoneBuilding(b)) continue;
          const f = getBuildingFootprint(b);
          if (!f) continue;
          if (t.tx >= f.bx && t.tx < f.bx + f.bw && t.ty >= f.by && t.ty < f.by + f.bh) return false;
        }
        return true;
      }

      let best = null;
      for (const t of cand){
        if (!okGoal(t)) continue;
        const p = A.findPath(from, { x: t.tx, y: t.ty }, opts);
        if (p && p.length){
          if (!best || p.length < best.length) best = p;
        }
      }
      return best;
    };

    A.__patchedByRulesV1 = true;
    LOG('AdFinder gepatcht (Default Blocker + findPathToBuilding) ✓');
    return true;
  }

  // Jetzt versuchen, sonst später nachladen (falls Script-Reihenfolge)
  if (!patchAdFinder()){
    const t = setInterval(()=>{
      if (patchAdFinder()) clearInterval(t);
    }, 100);
    setTimeout(()=>{ try{ clearInterval(t); }catch(e){} }, 6000);
  }

})();
