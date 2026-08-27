/* ============================================================================
 * Datei   : core/savegame-v2.js
 * Projekt : Neue Siedler
 * Version : v26.08.27-sa04-2
 * Zweck   : SA-04 – fachlicher SaveGame-V2-Snapshot + echter Continue-Pfad.
 *
 * Persistiert:
 *   - Meta/World, Ressourcen, Gebäude/Baufortschritt, MapResources, Units-Grundzustand
 * Rekonstruiert:
 *   - HQ-Runtime und offene Baustellen-Lieferjobs
 * Bewusst NICHT persistiert:
 *   - JobQueue, Unit-Tasks/Nav-Caches, Renderer, DOM, Timer, Asset-Caches
 * ========================================================================== */
(function(){
  'use strict';

  const TAG = '[savegame-v2]';
  const VERSION = 2;
  const NS = 'siedler.save.v2.';
  const DEFAULT_SLOT = 'autosave';
  const LOG  = (...a)=>(window.CBLog?.info || console.info)(TAG, ...a);
  const OK   = (...a)=>(window.CBLog?.ok   || console.log )(TAG, ...a);
  const WARN = (...a)=>(window.CBLog?.warn || console.warn)(TAG, ...a);
  const ERR  = (...a)=>(window.CBLog?.error|| console.error)(TAG, ...a);

  let prepared = null;
  let gameStarted = false;
  let continueActive = false;
  let autosaveTimer = 0;

  function emit(name, detail={}){
    try { window.dispatchEvent(new CustomEvent(name,{detail})); } catch(_) {}
  }

  function clonePlain(value){
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function key(slot){ return NS + String(slot || DEFAULT_SLOT); }

  function validate(snap){
    const errors=[];
    if (!snap || typeof snap !== 'object') errors.push('snapshot fehlt');
    if (Number(snap?.meta?.saveVersion) !== VERSION) errors.push('saveVersion != 2');
    if (!snap?.world || typeof snap.world !== 'object') errors.push('world fehlt');
    if (!snap?.resources || typeof snap.resources !== 'object') errors.push('resources fehlt');
    if (!Array.isArray(snap?.buildings)) errors.push('buildings fehlt');
    if (snap?.units != null && !Array.isArray(snap.units)) errors.push('units ungültig');
    if (snap?.mapResources?.nodes != null && !Array.isArray(snap.mapResources.nodes)) errors.push('mapResources.nodes ungültig');
    return { ok: errors.length===0, errors };
  }

  function read(slot=DEFAULT_SLOT){
    try {
      const raw = localStorage.getItem(key(slot));
      if (!raw) return null;
      const snap = JSON.parse(raw);
      const check = validate(snap);
      if (!check.ok){
        WARN('ungültiger SaveGame-V2', check.errors);
        return null;
      }
      return snap;
    } catch(e){
      WARN('read fehlgeschlagen', e?.message || e);
      return null;
    }
  }

  function sanitizeBuilding(b){
    if (!b || typeof b !== 'object') return null;
    return {
      uid: b.uid || null,
      id: b.id || b.type || b.kind || null,
      x: Number(b.x ?? b.tx ?? 0),
      y: Number(b.y ?? b.ty ?? 0),
      w: Number(b.w ?? 1),
      h: Number(b.h ?? 1),
      entrances: clonePlain(Array.isArray(b.entrances) ? b.entrances : []),
      entranceTx: Number.isFinite(Number(b.entranceTx)) ? Number(b.entranceTx) : null,
      entranceTy: Number.isFinite(Number(b.entranceTy)) ? Number(b.entranceTy) : null,
      status: b.status || null,
      needs: clonePlain(b.needs || {}),
      delivered: clonePlain(b.delivered || {}),
      buildPhase: Number.isFinite(Number(b.buildPhase)) ? Number(b.buildPhase) : null,
      buildStage: Number.isFinite(Number(b.buildStage)) ? Number(b.buildStage) : null,
      buildElapsed: Number.isFinite(Number(b.buildElapsed)) ? Number(b.buildElapsed) : 0,
      buildTime: Number.isFinite(Number(b.buildTime)) ? Number(b.buildTime) : null,
      buildProgress: Number.isFinite(Number(b.buildProgress)) ? Number(b.buildProgress) : null,
      buildSubStage: Number.isFinite(Number(b.buildSubStage)) ? Number(b.buildSubStage) : null,
      hasMaterial: !!b.hasMaterial,
      dropSlots: clonePlain(Array.isArray(b.dropSlots) ? b.dropSlots : []),
      drops: clonePlain(Array.isArray(b.drops) ? b.drops : [])
    };
  }

  function sanitizeUnit(u){
    if (!u || typeof u !== 'object') return null;
    return {
      id: u.id ?? null,
      kind: u.kind || null,
      type: u.type || null,
      x: Number(u.x || 0),
      y: Number(u.y || 0),
      carrying: u.carrying || null,
      homeUid: u.homeUid || u.homeBuildingUid || null
    };
  }

  function buildSnapshot(){
    const G = window.Game || {};
    const mapState = window.GameMap?._state || null;
    const canvas = document.getElementById('game');
    const resources = clonePlain(window.RegistryValues || {});
    const buildings = (Array.isArray(G.buildings) ? G.buildings : [])
      .map(sanitizeBuilding).filter(Boolean);

    let units=[];
    try {
      const list = window.GameUnits?.getUnits?.() || G.units || [];
      units = (Array.isArray(list) ? list : []).map(sanitizeUnit).filter(Boolean);
    } catch(_) {}

    let mapResources = null;
    try {
      const st = window.MapResources?.state;
      if (st) mapResources = {
        seed: Number(st.seed || 0),
        initialized: !!st.initialized,
        nodes: clonePlain(Array.isArray(st.nodes) ? st.nodes : [])
      };
    } catch(_) {}

    return {
      meta: {
        saveVersion: VERSION,
        gameVersion: String(window.Registry?.version || mapState?.version || 'unknown'),
        savedAt: new Date().toISOString()
      },
      world: {
        mapId: String(mapState?.name || canvas?.getAttribute('data-map') || 'data/maps/map-epoch1.json'),
        seed: Number(mapResources?.seed || 0),
        time: Number.isFinite(Number(G.t ?? G.time)) ? Number(G.t ?? G.time) : null
      },
      resources,
      buildings,
      mapResources,
      units,
      paths: null
    };
  }

  function save({slot=DEFAULT_SLOT, name='Autosave'}={}){
    try {
      if (!gameStarted || !window.Game) return {ok:false, skipped:true, message:'Spiel noch nicht gestartet'};
      const snap = buildSnapshot();
      snap.meta.name = String(name || slot);
      const raw = JSON.stringify(snap);
      localStorage.setItem(key(slot), raw);
      OK('gespeichert', {
        slot,
        bytes:raw.length,
        buildings:snap.buildings.length,
        units:snap.units.length,
        mapNodes:snap.mapResources?.nodes?.length || 0
      });
      emit('cb:savegame:v2:saved',{slot, snapshot:snap});
      return {ok:true, slot, snapshot:snap};
    } catch(e){
      const message = 'Speichern fehlgeschlagen: ' + (e?.message || e);
      ERR(message);
      emit('cb:savegame:v2:error',{message});
      return {ok:false, message};
    }
  }

  function restoreResources(snap){
    const store = (window.RegistryValues = window.RegistryValues || {});
    for (const k of Object.keys(store)) delete store[k];
    Object.assign(store, clonePlain(snap.resources || {}));
    try {
      const R=(window.Registry=window.Registry||{}); R.data=R.data||{}; R.data.resources=store;
    } catch(_) {}
    emit('cb:res:snapshot',{resources:store, reason:'savegame-v2-continue'});
  }

  function restoreBuildings(snap){
    if (!window.Game) return 0;
    const list = clonePlain(snap.buildings || []);
    window.Game.buildings = list;
    OK('Gebäude restauriert', list.length);
    emit('cb:savegame:v2:buildings-restored',{count:list.length});
    return list.length;
  }

  function restoreMapResources(snap){
    const saved = snap?.mapResources;
    const st = window.MapResources?.state;
    if (!saved || !st) return 0;

    const nodes = clonePlain(saved.nodes || []);
    st.seed = Number(saved.seed || snap?.world?.seed || st.seed || 0);
    st.nodes.length = 0;
    st.nodes.push(...nodes);

    if (Array.isArray(st.trees))  { st.trees.length=0;  st.trees.push(...st.nodes.filter(n=>n?.kind==='tree')); }
    if (Array.isArray(st.stones)) { st.stones.length=0; st.stones.push(...st.nodes.filter(n=>n?.kind==='stone')); }
    if (Array.isArray(st.fish))   { st.fish.length=0;   st.fish.push(...st.nodes.filter(n=>n?.kind==='fish')); }
    st.initialized = true;

    OK('MapResources restauriert', {seed:st.seed, nodes:st.nodes.length});
    emit('cb:savegame:v2:mapresources-restored',{count:st.nodes.length, seed:st.seed});
    return st.nodes.length;
  }

  function entranceOf(b){
    if (!b) return null;
    if (Number.isFinite(Number(b.entranceTx)) && Number.isFinite(Number(b.entranceTy))){
      return {tx:Number(b.entranceTx)|0, ty:Number(b.entranceTy)|0};
    }
    const e = Array.isArray(b.entrances) ? b.entrances[0] : null;
    if (e) return {tx:(Number(b.x)||0)+(Number(e.dx)||0), ty:(Number(b.y)||0)+(Number(e.dy)||0)};
    return {
      tx:(Number(b.x)||0)+Math.floor(Math.max(1,Number(b.w)||1)/2),
      ty:(Number(b.y)||0)+Math.max(1,Number(b.h)||1)
    };
  }

  function restoreUnits(snap){
    const U = window.GameUnits;
    if (!U || typeof U.getUnits !== 'function') return 0;

    const list = U.getUnits();
    if (!Array.isArray(list)) return 0;
    list.length=0;

    for (const src of (snap.units || [])){
      list.push({
        id: src.id,
        kind: src.kind || null,
        type: src.type || (src.kind === 'u.carrier' ? 'carrier' : 'worker'),
        x: Number(src.x || 0),
        y: Number(src.y || 0),
        carrying: src.carrying || null,
        homeUid: src.homeUid || null,
        task:null,
        _idleTarget:null,
        _nav:null,
        vx:0,
        vy:0
      });
    }

    try {
      if (window.Game) window.Game.units=list;
      window.__units=list;
    } catch(_) {}

    const hq=(window.Game?.buildings||[]).find(b=>b && (b.id==='b.hq' || b.type==='b.hq'));
    const ent=entranceOf(hq);
    if (ent && typeof U.setHQPos === 'function') U.setHQPos(ent);

    OK('Units restauriert', list.length);
    emit('cb:units:changed',{reason:'savegame-v2-restore', total:list.length});
    emit('cb:savegame:v2:units-restored',{count:list.length});
    return list.length;
  }

  function rebuildConstructionJobs(){
    const eng=window.JobEngine;
    const buildings=window.Game?.buildings || [];
    if (!eng || typeof eng.add !== 'function' || !Array.isArray(buildings)) return 0;

    const existing = (typeof eng.getQueue === 'function' ? eng.getQueue() : []) || [];
    let made=0;

    for (const b of buildings){
      if (!b || b.id==='b.hq') continue;
      if (b.status==='done' || Number(b.buildStage)>=3) continue;

      const needs=b.needs || {};
      const delivered=b.delivered || {};
      const ent=entranceOf(b);
      if (!ent) continue;

      for (const res of Object.keys(needs)){
        const need=Math.max(0,Number(needs[res])||0);
        const have=Math.max(0,Number(delivered[res])||0);
        const missing=Math.max(0,Math.ceil(need-have));
        if (!missing) continue;

        const already=existing.filter(j=>j && j.type==='deliver' && j.buildingUid===b.uid && String(j.res)===String(res)).length;
        for (let i=already; i<missing; i++){
          eng.add({
            id:`job-restore-${b.uid || b.id}-${res}-${i}`,
            type:'deliver',
            res:String(res),
            tx:ent.tx|0,
            ty:ent.ty|0,
            to:{x:(ent.tx|0)+0.5,y:(ent.ty|0)+0.5},
            targetX:(Number(b.x)||0)+(Math.max(1,Number(b.w)||1)/2),
            targetY:(Number(b.y)||0)+(Math.max(1,Number(b.h)||1)/2),
            buildingId:b.id,
            buildingUid:b.uid || null,
            __src:'savegame-v2-rebuild'
          });
          made++;
        }
      }
    }

    OK('offene Baustellen-Jobs rekonstruiert', made);
    emit('cb:savegame:v2:jobs-rebuilt',{count:made});
    return made;
  }

  function applyCore(snap){
    const v = validate(snap);
    if (!v.ok) throw new Error('ungültiger V2-Snapshot: ' + v.errors.join(', '));

    restoreBuildings(snap);
    restoreResources(snap);

    // Altarchitektur kann im selben cb:game:start noch Startressourcen setzen.
    // Nach Ende dieses synchronen Dispatchs den fachlichen Save-Wert erneut setzen.
    queueMicrotask(()=>{
      try { restoreResources(snap); } catch(e){ WARN('post-start resource restore', e); }
    });

    emit('cb:savegame:v2:core-restored',{
      buildings:(snap.buildings||[]).length,
      resources:Object.keys(snap.resources||{}).length
    });
  }

  function applyAfterMapReady(snap){
    restoreMapResources(snap);

    // game.js hat GameUnits.init(Game) bereits beim Start ausgeführt.
    // MapReady kommt asynchron später; damit ist jetzt ein sicherer Restore-Zeitpunkt.
    restoreUnits(snap);
    rebuildConstructionJobs();

    emit('cb:savegame:v2:continue-restored',{
      buildings:(snap.buildings||[]).length,
      resources:Object.keys(snap.resources||{}).length,
      mapNodes:snap.mapResources?.nodes?.length || 0,
      units:snap.units?.length || 0
    });
  }

  function prepareContinue({slot=DEFAULT_SLOT}={}){
    const snap = read(slot);
    if (!snap){
      const message='Kein gültiger SaveGame-V2-Spielstand vorhanden.';
      emit('cb:savegame:v2:continue-unavailable',{slot,message});
      return {ok:false, message};
    }
    prepared = snap;
    OK('Continue vorbereitet', {slot, savedAt:snap.meta?.savedAt, buildings:snap.buildings?.length||0});
    return {ok:true, slot, snapshot:snap};
  }

  function hasSave(slot=DEFAULT_SLOT){ return !!read(slot); }

  function clear(slot=DEFAULT_SLOT){
    try { localStorage.removeItem(key(slot)); prepared=null; return {ok:true}; }
    catch(e){ return {ok:false,message:String(e?.message||e)}; }
  }

  function startAutosaveLoop(){
    if (autosaveTimer) return;
    autosaveTimer=setInterval(()=>{
      if (gameStarted && !document.hidden) save({slot:DEFAULT_SLOT,name:'Autosave'});
    }, 30000);
  }

  window.addEventListener('cb:game:start',(ev)=>{
    gameStarted=true;
    continueActive = ev?.detail?.mode === 'continue';
    startAutosaveLoop();

    if (!continueActive) return;
    const snap = prepared || read(DEFAULT_SLOT);
    if (!snap){
      WARN('Continue gestartet, aber Snapshot fehlt');
      return;
    }
    try { applyCore(snap); }
    catch(e){ ERR('Continue Core-Restore fehlgeschlagen', e); emit('cb:savegame:v2:error',{message:String(e?.message||e)}); }
  });

  window.addEventListener('cb:map:ready',()=>{
    if (!continueActive) return;
    const snap=prepared || read(DEFAULT_SLOT);
    if (!snap) return;
    try { applyAfterMapReady(snap); }
    catch(e){ ERR('Continue Post-Map-Restore fehlgeschlagen', e); emit('cb:savegame:v2:error',{message:String(e?.message||e)}); }
  });

  window.addEventListener('req:savegame:save',(ev)=> save(ev?.detail||{}));
  window.addEventListener('req:savegame:v2:save',(ev)=> save(ev?.detail||{}));

  document.addEventListener('visibilitychange',()=>{
    if (document.hidden && gameStarted) save({slot:DEFAULT_SLOT,name:'Autosave'});
  });
  window.addEventListener('pagehide',()=>{
    if (gameStarted) save({slot:DEFAULT_SLOT,name:'Autosave'});
  });

  window.SaveGameV2 = {
    VERSION,
    save, read, validate, hasSave, clear,
    prepareContinue, applyCore, applyAfterMapReady, buildSnapshot,
    restoreResources, restoreBuildings, restoreMapResources, restoreUnits,
    rebuildConstructionJobs
  };
  OK('bereit', 'v2');
  emit('cb:savegame:v2:ready',{version:VERSION, hasSave:hasSave()});
})();
