/* ============================================================================
 * Datei   : core/savegame-v2-uid-guard.js
 * Projekt : Neue Siedler
 * Version : v26.08.27-sa04-1
 * Zweck   : Verhindert UID-Kollisionen bei NEUEN Gebäuden nach V2-Continue,
 *           ohne restaurierte Save-UIDs umzuschreiben.
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[savegame-v2-uid]';
  const LOG=(...a)=>(window.CBLog?.info||console.info)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);

  function uniqueUid(target, wanted){
    const base=String(wanted || 'bld');
    const used=new Set(target.map(b=>b?.uid).filter(Boolean));
    if (!used.has(base)) return base;
    let n=2;
    while (used.has(`${base}-r${n}`)) n++;
    return `${base}-r${n}`;
  }

  function install(){
    const G=window.Game;
    const current=G?.buildings;
    if (!G || !Array.isArray(current)) return false;
    if (current.__SA04_UID_GUARD__) return true;

    const proxy=new Proxy(current,{
      get(target,prop,receiver){
        if (prop==='__SA04_UID_GUARD__') return true;
        if (prop==='push'){
          return function(...items){
            for (const item of items){
              if (!item || typeof item!=='object') continue;
              const wanted=item.uid || 'bld';
              const next=uniqueUid(target,wanted);
              if (next!==wanted){
                WARN('UID-Kollision abgefangen', wanted, '→', next);
                item.uid=next;
              }
            }
            return Array.prototype.push.apply(target,items);
          };
        }
        return Reflect.get(target,prop,receiver);
      }
    });

    G.buildings=proxy;
    LOG('UID-Guard aktiv', current.length);
    return true;
  }

  window.addEventListener('cb:savegame:v2:buildings-restored',()=>install());
  window.SaveGameV2UidGuard={install};
})();
