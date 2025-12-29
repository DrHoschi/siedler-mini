/* ============================================================================
 * Datei   : core/game.production.hunt.js
 * Version : v25.12.29-hunt-v1-output-only
 *
 * Ziel:
 *   - Jägerhütte (b.hunter) erzeugt Fleisch + Fell
 *   - Jagd-Logik: sucht nächstes Tier im WorkArea-Radius und "verbraucht" es
 *   - Output NUR über cb:prod:output (Zählen/Jobs macht game.production.js)
 *
 * Abhängigkeiten:
 *   - window.Production.registerModule
 *   - window.MapAnimals (findNearestInRadius + consumeAnimal)
 *
 * Hinweis:
 *   - Das Gebäude selbst ist in data/buildings.json vorhanden, aktuell enabled:false
 *     (bis du Sprite/Atlas/Icon fertig hast).
 * ============================================================================ */
(function(){
  'use strict';

  const TAG='[ProdHunt]';
  const LOG=(...a)=>(window.CBLog?.info||console.info)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);

  const Mod = {
    id: 'prod.hunt',
    _hunters: new Map(), // uid -> state
    _workAreaByUid: new Map()
  };

  function getCenter(d){
    const bx = d.x * (window.Game?.tileSize || 64);
    const by = d.y * (window.Game?.tileSize || 64);
    const ts = (window.Game?.tileSize || 64);
    const bw = (d.w||3)*ts;
    const bh = (d.h||3)*ts;
    return { x: bx + bw/2, y: by + bh/2, bw, bh, ts };
  }

  function onBuildComplete(d){
    const kind = d.id || d.kind;
    if (kind !== 'b.hunter') return;
    const uid = d.uid || `b.hunter@${d.x},${d.y}`;
    Mod._hunters.set(uid, {
      uid,
      kind,
      x:d.x, y:d.y, w:d.w||3, h:d.h||3,
      t:0,
      cycleMs: d.cycle ?? 4500
    });
    LOG('registered hunter', uid);
  }

  function onWorkAreaSet(d){
    const uid = d.uid;
    if (!uid) return;
    // Erwartet: { uid, radiusTiles, ... }
    if (d.radiusTiles != null){
      Mod._workAreaByUid.set(uid, { radiusTiles: Number(d.radiusTiles)||5 });
    }
  }

  function tick(dtMs){
    const MapAnimals = window.MapAnimals;
    if (!MapAnimals?.findNearestInRadius) return;

    for (const h of Mod._hunters.values()){
      h.t += dtMs;

      const wa = Mod._workAreaByUid.get(h.uid);
      const radiusTiles = wa?.radiusTiles ?? 5;
      const ts = window.Game?.tileSize || 64;
      const radiusPx = radiusTiles * ts;

      if (h.t < h.cycleMs) continue;
      h.t = 0;

      const c = getCenter(h);

      // Nächstes Tier (deer + fox)
      const a = MapAnimals.findNearestInRadius(c.x, c.y, radiusPx, ['deer','fox']);
      if (!a) continue;

      const killed = MapAnimals.consumeAnimal(a.uid);
      if (!killed) continue;

      // Loot-Regel (einfach & später feinjustierbar):
      // - deer: 2 meat, 1 pelt
      // - fox : 1 meat, 2 pelt
      const drops = (killed.kind==='fox')
        ? [{item:'meat', qty:1},{item:'pelt',qty:2}]
        : [{item:'meat', qty:2},{item:'pelt',qty:1}];

      for (const dr of drops){
        try{
          window.dispatchEvent(new CustomEvent('cb:prod:output', {
            detail:{
              bId  : h.uid,
              uid  : h.uid,
              kind : 'b.hunter',
              item : dr.item,
              qty  : dr.qty,
              x    : c.x,
              y    : c.y,
              w    : c.bw,
              h    : c.bh
            }
          }));
        }catch(e){
          WARN('cb:prod:output dispatch failed', e);
        }
      }
    }
  }

  // Register into central Production
  function boot(){
    const P = window.Production;
    if (!P?.registerModule){
      WARN('Production API not ready yet, retry on cb:game:start');
      return false;
    }
    P.registerModule({
      id: Mod.id,
      onBuildComplete,
      onWorkAreaSet,
      tick
    });
    LOG('registered to Production');
    return true;
  }

  // Try now + on start
  boot();
  window.addEventListener('cb:game:start', boot);

  window.ProdHunt = Mod; // optional debug
})();
