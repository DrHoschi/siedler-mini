/* ============================================================================
 * Datei   : core/savegame.js
 * Projekt : Neue Siedler
 * Version : v25.10.27-save1
 * Zweck   : Lokale Spielstände (Snapshots) speichern & laden (LocalStorage)
 *
 * Snapshot-Inhalt (defensiv, optional):
 *   - version, timestamp, gameVersion
 *   - map    : aus MapRuntime.info() (name,width,height,tile,seed)
 *   - time   : Spielzeit aus Game (sekunden)
 *   - res    : Ressourcenwerte (RegistryValues)
 *   - ents   : Entities/Buildings (id, x, y, w, h, type?, stock?)
 *
 * Public API (window.SaveGame):
 *   - list()                       -> [{slot,name,ts,bytes,counts}, ...]
 *   - save({slot?,name?})         -> { ok, slot, bytes }
 *   - load({slot})                -> { ok, slot }
 *   - del({slot})                 -> { ok, slot }
 *   - export({slot})              -> { ok, json }
 *   - import({json, slot?, name?})-> { ok, slot }
 *   - setAutosave({enable, minutes, slot})
 *
 * Events (lauscht):
 *   - req:savegame:list
 *   - req:savegame:save   { slot?, name? }
 *   - req:savegame:load   { slot }
 *   - req:savegame:delete { slot }
 *   - req:savegame:export { slot }
 *   - req:savegame:import { json, slot?, name? }
 *   - req:savegame:autosave { enable, minutes?, slot? }
 *
 * Events (sendet):
 *   - cb:savegame:list    { slots }
 *   - cb:savegame:saved   { slot, bytes }
 *   - cb:savegame:loaded  { slot }
 *   - cb:savegame:deleted { slot }
 *   - cb:savegame:export  { slot, json }
 *   - cb:savegame:error   { message }
 *
 * Integration-Hinweise:
 *   - Entities: Wenn keine direkte API vorhanden ist, senden wir beim Laden
 *               `req:entities:loadSnapshot` mit { ents[] }. Deine Engine kann
 *               darauf reagieren (später Schritt 6).
 *   - Map:     Falls ein Seed vorhanden ist, senden wir `req:map:applySeed`.
 *   - Ressourcen: Werden direkt in RegistryValues geschrieben + cb:res:snapshot.
 *
 * Hotkeys (optional):
 *   - STRG+S  -> save in Slot "quicksave"
 *   - STRG+L  -> load aus Slot "quicksave"
 * ============================================================================ */
(function(root,factory){ root.SaveGame = factory(); })(typeof window!=='undefined'?window:this, function(){
  'use strict';

  const TAG='[savegame]';
  const OK  = (...a)=> (window.CBLog?.ok   || console.log ) (TAG, ...a);
  const LOG = (...a)=> (window.CBLog?.info || console.info)(TAG, ...a);
  const WRN = (...a)=> (window.CBLog?.warn || console.warn)(TAG, ...a);
  const ERR = (...a)=> (window.CBLog?.err  || console.error)(TAG, ...a);

  const NS = 'siedler.save.v1.';        // Namespace für LocalStorage-Keys
  const DEF_SLOT = 'autosave';           // Standard-Slot (Autosave)
  const emit = (n,d={})=> { try{ window.dispatchEvent(new CustomEvent(n,{detail:d})); }catch{} };

  /* ------------------------------ Utils ---------------------------------- */
  function nowISO(){ return new Date().toISOString(); }
  function gameVersion(){
    // Versuche, aus Log-Pfaden/Registry zu lesen; sonst Datum
    try {
      return (window.Registry?.version) || (window.MapRuntime?.version) || 'v?';
    } catch { return 'v?'; }
  }
  function deepClone(x){ return JSON.parse(JSON.stringify(x)); }
  function bytesOf(str){ return new Blob([str]).size|0; }

  function lsSet(key, val){
    localStorage.setItem(key, val);
  }
  function lsGet(key){ return localStorage.getItem(key); }
  function lsDel(key){ localStorage.removeItem(key); }
  function lsKeys(prefix){
    const out=[];
    for (let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if (k && k.startsWith(prefix)) out.push(k);
    }
    return out.sort();
  }

  /* ------------------------- Snapshot bauen ------------------------------ */
  function buildSnapshot(){
    // Ressourcen
    const resMap = (window.RegistryValues || window.Registry?.resources || window.Registry?.data?.resources || {});
    const res = {};
    for (const [k,v] of Object.entries(resMap||{})) res[k]=Number(v||0);

    // Entities/Buildings
    let ents = [];
    try{
      const list = window.Entities?.state?.list;
      if (Array.isArray(list)){
        ents = list.map(e=>({
          id: e.id || e.type || e.kind || 'entity',
          x: e.x|0, y: e.y|0, w: e.w|0, h: e.h|0,
          type: e.type || e.kind || 'entity',
          stock: e.stock ? deepClone(e.stock) : undefined
        }));
      }
    } catch(_){}

    // Map-Info
    let map = null;
    try{ map = window.MapRuntime?.info?.() || null; }catch{}

    // Spielzeit
    let time = null;
    try{
      const t = window.Game && (window.Game.t || window.Game.time || null);
      // unsere Loop liefert t in cb:game:tick-Payload; wir speichern nur Info
      time = typeof t==='number' ? t : null;
    }catch{}

    return {
      version  : '1',
      timestamp: nowISO(),
      gameVersion: gameVersion(),
      map, time, res, ents
    };
  }

  /* ------------------------- Snapshot anwenden --------------------------- */
  function applySnapshot(snap){
    if (!snap || typeof snap!=='object') throw new Error('invalid snapshot');

    // 1) Ressourcen in RegistryValues setzen
    try {
      const store = (window.RegistryValues = window.RegistryValues || {});
      for (const k of Object.keys(store)) delete store[k];
      Object.assign(store, snap.res || {});
      // Spiegel für Inspector/HUD
      try {
        const R = (window.Registry = window.Registry || {}); R.data = R.data || {};
        R.data.resources = store;
      }catch{}
      emit('cb:res:snapshot', { resources: store });
      OK('Ressourcen wiederhergestellt', Object.keys(store).length);
    } catch(e){ WRN('Ressourcen konnten nicht angewendet werden:', e?.message||e); }

    // 2) Map-Seed / Info anfragen (optional)
    if (snap.map && snap.map.seed != null){
      emit('req:map:applySeed', { seed: snap.map.seed, info: snap.map });
    }

    // 3) Entities/Buildings laden – Engine muss reagieren
    if (Array.isArray(snap.ents)){
      emit('req:entities:loadSnapshot', { ents: snap.ents });
    }

    // 4) Spielzeit (informativ)
    if (typeof snap.time === 'number'){
      emit('cb:game:time:set', { t: snap.time });
    }
  }

  /* ---------------------------- Public API ------------------------------- */
  function list(){
    const keys = lsKeys(NS);
    const slots = keys.map(k=>{
      try{
        const raw = lsGet(k);
        const bytes = bytesOf(raw||'');
        const snap = JSON.parse(raw||'{}');
        const counts = {
          ents: Array.isArray(snap.ents)? snap.ents.length : 0,
          res : snap.res ? Object.keys(snap.res).length : 0
        };
        return {
          slot: k.slice(NS.length),
          name: snap.name || k.slice(NS.length),
          ts  : snap.timestamp || null,
          bytes, counts
        };
      }catch{
        return { slot: k.slice(NS.length), name: k.slice(NS.length), ts:null, bytes:0, counts:{ents:0,res:0} };
      }
    });
    return slots;
  }

  function save({slot=DEF_SLOT, name=null}={}){
    try{
      const snap = buildSnapshot();
      if (name) snap.name = String(name);
      const key = NS + String(slot);
      const json = JSON.stringify(snap);
      lsSet(key, json);
      const bytes = bytesOf(json);
      emit('cb:savegame:saved', { slot, bytes });
      OK('gespeichert', slot, bytes+'B');
      return { ok:true, slot, bytes };
    }catch(e){
      const msg = 'Speichern fehlgeschlagen: ' + (e?.message||e);
      ERR(msg);
      emit('cb:savegame:error', { message: msg });
      return { ok:false, message: msg };
    }
  }

  function load({slot}={}){
    try{
      const key = NS + String(slot);
      const raw = lsGet(key);
      if (!raw) throw new Error('Slot leer/nicht vorhanden');
      const snap = JSON.parse(raw);
      applySnapshot(snap);
      emit('cb:savegame:loaded', { slot });
      OK('geladen', slot);
      return { ok:true, slot };
    }catch(e){
      const msg = 'Laden fehlgeschlagen: ' + (e?.message||e);
      ERR(msg);
      emit('cb:savegame:error', { message: msg });
      return { ok:false, message: msg };
    }
  }

  function del({slot}={}){
    try{
      const key = NS + String(slot);
      lsDel(key);
      emit('cb:savegame:deleted', { slot });
      OK('gelöscht', slot);
      return { ok:true, slot };
    }catch(e){
      const msg = 'Löschen fehlgeschlagen: ' + (e?.message||e);
      ERR(msg);
      emit('cb:savegame:error', { message: msg });
      return { ok:false, message: msg };
    }
  }

  function exportSlot({slot}={}){
    try{
      const key = NS + String(slot);
      const raw = lsGet(key);
      if (!raw) throw new Error('Slot leer/nicht vorhanden');
      emit('cb:savegame:export', { slot, json: raw });
      LOG('export', slot);
      return { ok:true, json: raw };
    }catch(e){
      const msg = 'Export fehlgeschlagen: ' + (e?.message||e);
      ERR(msg);
      emit('cb:savegame:error', { message: msg });
      return { ok:false, message: msg };
    }
  }

  function importSlot({json, slot=DEF_SLOT, name=null}={}){
    try{
      const snap = JSON.parse(String(json||'{}'));
      if (name) snap.name = String(name);
      const key = NS + String(slot);
      const raw = JSON.stringify(snap);
      lsSet(key, raw);
      OK('importiert', slot);
      return { ok:true, slot };
    }catch(e){
      const msg = 'Import fehlgeschlagen: ' + (e?.message||e);
      ERR(msg);
      emit('cb:savegame:error', { message: msg });
      return { ok:false, message: msg };
    }
  }

  /* ------------------------- Autosave (optional) -------------------------- */
  let autoTimer = 0;
  let autoCfg   = { enable:false, minutes:5, slot:DEF_SLOT };

  function setAutosave({enable, minutes, slot}={}){
    if (typeof enable==='boolean') autoCfg.enable = enable;
    if (minutes!=null) autoCfg.minutes = Math.max(1, Number(minutes)||5);
    if (slot) autoCfg.slot = String(slot);
    clearInterval(autoTimer);
    if (autoCfg.enable){
      autoTimer = setInterval(()=> save({slot:autoCfg.slot, name:'Autosave'}), autoCfg.minutes*60*1000);
      LOG('Autosave an', autoCfg);
    } else {
      LOG('Autosave aus');
    }
  }

  // Sichtbarkeitswechsel: bei Verlassen des Tabs einmalig autosaven (sofern aktiv)
  document.addEventListener('visibilitychange', ()=>{
    if (document.hidden && autoCfg.enable){
      save({slot:autoCfg.slot, name:'Autosave (hidden)'});
    }
  });

  /* ---------------------------- Event-Bindings ---------------------------- */
  window.addEventListener('req:savegame:list',   ()=> emit('cb:savegame:list',{ slots:list() }));
  window.addEventListener('req:savegame:save',   (e)=> save(e?.detail||{}));
  window.addEventListener('req:savegame:load',   (e)=> load(e?.detail||{}));
  window.addEventListener('req:savegame:delete', (e)=> del(e?.detail||{}));
  window.addEventListener('req:savegame:export', (e)=> exportSlot(e?.detail||{}));
  window.addEventListener('req:savegame:import', (e)=> importSlot(e?.detail||{}));
  window.addEventListener('req:savegame:autosave',(e)=> setAutosave(e?.detail||{}));

  /* ----------------------------- Hotkeys --------------------------------- */
  window.addEventListener('keydown', (e)=>{
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      if (e.key.toLowerCase()==='s') { e.preventDefault(); save({slot:'quicksave', name:'Quicksave'}); }
      if (e.key.toLowerCase()==='l') { e.preventDefault(); load({slot:'quicksave'}); }
    }
  });

  OK('aktiv');
  return { list, save, load, del, export:exportSlot, import:importSlot, setAutosave };
});
