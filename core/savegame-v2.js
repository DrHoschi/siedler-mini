/* ============================================================================
 * Datei   : core/savegame-v2.js
 * Projekt : Neue Siedler
 * Version : v26.08.27-sa04-1
 * Zweck   : SA-04 – fachlicher SaveGame-V2-Snapshot + echter Continue-Prepare.
 *
 * Phase 1 (dieser Stand):
 *   - speichert Meta, World, Ressourcen, Gebäude sowie bereits MapResources/Units
 *   - restauriert beim Continue bewusst zuerst nur Ressourcen + Gebäude
 *   - MapResources/Units/Jobs werden in den nächsten SA-04-Schritten freigeschaltet
 *   - speichert KEINE Renderer/DOM/Timer/Nav-Caches/JobQueue
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

  function emit(name, detail={}){
    try { window.dispatchEvent(new CustomEvent(name,{detail})); } catch(_) {}
  }

  function clonePlain(value){
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function key(slot){ return NS + String(slot || DEFAULT_SLOT); }

  function read(slot=DEFAULT_SLOT){
    try {
      const raw = localStorage.getItem(key(slot));
      if (!raw) return null;
      const snap = JSON.parse(raw);
      return validate(snap).ok ? snap : null;
    } catch(e){
      WARN('read fehlgeschlagen', e?.message || e);
      return null;
    }
  }

  function validate(snap){
    const errors=[];
    if (!snap || typeof snap !== 'object') errors.push('snapshot fehlt');
    if (Number(snap?.meta?.saveVersion) !== VERSION) errors.push('saveVersion != 2');
    if (!snap?.world || typeof snap.world !== 'object') errors.push('world fehlt');
    if (!snap?.resources || typeof snap.resources !== 'object') errors.push('resources fehlt');
    if (!Array.isArray(snap?.buildings)) errors.push('buildings fehlt');
    return { ok: errors.length===0, errors };
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
      carrying: u.carrying || null
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
      OK('gespeichert', {slot, bytes:raw.length, buildings:snap.buildings.length, units:snap.units.length});
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
    if (!window.Game) return;
    const list = clonePlain(snap.buildings || []);
    window.Game.buildings = list;
    OK('Gebäude restauriert', list.length);
    emit('cb:savegame:v2:buildings-restored',{count:list.length});
  }

  function applyCore(snap){
    const v = validate(snap);
    if (!v.ok) throw new Error('ungültiger V2-Snapshot: ' + v.errors.join(', '));

    // Gebäude sofort einsetzen: game.js sieht beim späteren cb:map:ready bereits das HQ
    restoreBuildings(snap);
    restoreResources(snap);

    // Andere cb:game:start-Listener können in der Altarchitektur noch Startwerte setzen.
    // Nach Ende des synchronen Start-Dispatchs Ressourcen deshalb einmal erneut anwenden.
    queueMicrotask(()=>{
      try { restoreResources(snap); } catch(e){ WARN('post-start resource restore', e); }
    });

    emit('cb:savegame:v2:core-restored',{
      buildings:(snap.buildings||[]).length,
      resources:Object.keys(snap.resources||{}).length
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

  window.addEventListener('cb:game:start',(ev)=>{
    gameStarted=true;
    if (ev?.detail?.mode !== 'continue') return;
    const snap = prepared || read(DEFAULT_SLOT);
    if (!snap){
      WARN('Continue gestartet, aber Snapshot fehlt');
      return;
    }
    try { applyCore(snap); }
    catch(e){ ERR('Continue Core-Restore fehlgeschlagen', e); emit('cb:savegame:v2:error',{message:String(e?.message||e)}); }
  });

  window.addEventListener('req:savegame:save',(ev)=> save(ev?.detail||{}));
  window.addEventListener('req:savegame:v2:save',(ev)=> save(ev?.detail||{}));

  // Mobile/iOS-freundlicher Autosave bei App-/Tab-Wechsel.
  document.addEventListener('visibilitychange',()=>{
    if (document.hidden && gameStarted) save({slot:DEFAULT_SLOT,name:'Autosave'});
  });
  window.addEventListener('pagehide',()=>{
    if (gameStarted) save({slot:DEFAULT_SLOT,name:'Autosave'});
  });

  window.SaveGameV2 = { VERSION, save, read, validate, hasSave, clear, prepareContinue, applyCore, buildSnapshot };
  OK('bereit', 'v2');
  emit('cb:savegame:v2:ready',{version:VERSION, hasSave:hasSave()});
})();
