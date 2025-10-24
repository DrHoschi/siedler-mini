/* ============================================================================
 * Datei   : core/input.bridge.js
 * Projekt : Neue Siedler (Bridge)
 * Version : v25.10.26-sync1
 * Zweck   : Rückwärtskompatible Event-Bridge für den Platzier-Flow
 *
 *  Übersetzt ALT → NEU:
 *    - cb:set-build-tool   {type}            → req:place:start {buildingId}
 *    - req:place:begin     {building|id|buildingId} → req:place:start {buildingId}
 *    - cb:hover-tile       {tx,ty}           → req:place:cursor {tx,ty,id}
 *    - cb:place-building   {type,x,y}        → req:place:confirm {tx,ty}
 *
 *  Spiegelt NEU → ALT (sofern nötig), ohne Schleifen:
 *    - req:place:start     {buildingId}      → cb:set-build-tool {type}
 *    - req:place:cancel                         cb:set-build-tool {type:null}
 *
 *  Sicherheit:
 *    - Kennzeichnet Bridge-Events mit detail.__bridge=true (Loop-Schutz)
 *    - Sanitize von Payloads; keine Abhängigkeit von optionalen Modulen
 * ============================================================================ */
(function(){
  'use strict';

  const MOD = '[bridge.input]';
  const log = (...a)=> (window.CBLog?.info || console.info)(MOD, ...a);
  const warn= (...a)=> (window.CBLog?.warn || console.warn)(MOD, ...a);

  // --- kleiner Helper --------------------------------------------------------
  function emit(name, detail){
    try {
      detail = detail || {};
      if (!detail.__bridge) detail.__bridge = true;
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch(e){ warn('emit error', name, e?.message||e); }
  }
  function isBridge(ev){ return !!(ev?.detail && ev.detail.__bridge); }

  // Letzte "aktive" Gebäude-ID (für hover→cursor Mappings)
  let lastBuildingId = null;

  // ===================== ALT → NEU ==========================================
  // 1) cb:set-build-tool { type }
  window.addEventListener('cb:set-build-tool', (ev)=>{
    if (isBridge(ev)) return;                 // von uns selbst? → ignorieren
    const type = ev?.detail?.type ?? ev?.detail ?? null;
    if (type) {
      lastBuildingId = String(type);
      emit('req:place:start', { buildingId: lastBuildingId });
      log('ALT→NEU set-build-tool → req:place:start', lastBuildingId);
    } else {
      lastBuildingId = null;
      emit('req:place:cancel', {});
      log('ALT→NEU set-build-tool(null) → req:place:cancel');
    }
  }, { passive:true });

  // 2) req:place:begin { building | id | buildingId }
  window.addEventListener('req:place:begin', (ev)=>{
    if (isBridge(ev)) return;
    const d = ev?.detail || {};
    const id = d.buildingId || d.id || d.building?.id || d.building || null;
    if (!id) return;
    lastBuildingId = String(id);
    emit('req:place:start', { buildingId: lastBuildingId });
    log('ALT→NEU req:place:begin → req:place:start', lastBuildingId);
  }, { passive:true });

  // 3) cb:hover-tile { tx, ty }  → nur forwards, falls lastBuildingId existiert
  window.addEventListener('cb:hover-tile', (ev)=>{
    if (isBridge(ev)) return;
    if (!lastBuildingId) return;
    const d = ev?.detail || {};
    const tx = Number(d.tx); const ty = Number(d.ty);
    if (Number.isFinite(tx) && Number.isFinite(ty)){
      emit('req:place:cursor', { tx, ty, id: lastBuildingId });
    }
  }, { passive:true });

  // 4) cb:place-building { type, x, y } → req:place:confirm { tx, ty }
  window.addEventListener('cb:place-building', (ev)=>{
    if (isBridge(ev)) return;
    const d = ev?.detail || {};
    const tx = Number(d.x ?? d.tx);
    const ty = Number(d.y ?? d.ty);
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;
    // (type) ist hier egal; game.js nutzt die zuvor gesetzte lastRequestedId
    emit('req:place:confirm', { tx, ty });
    log('ALT→NEU cb:place-building → req:place:confirm', { tx, ty });
  });

  // ===================== NEU → ALT (nur bei Bedarf) =========================
  // Falls alte Module visuelles Feedback aus cb:set-build-tool erwarten:
  window.addEventListener('req:place:start', (ev)=>{
    if (isBridge(ev)) return;
    const id = ev?.detail?.buildingId;
    if (!id) return;
    lastBuildingId = String(id);
    // Echo nur als "Hinweis" für Alt-Listener; verhindert Loops via __bridge
    emit('cb:set-build-tool', { type: lastBuildingId });
  }, { passive:true });

  window.addEventListener('req:place:cancel', (ev)=>{
    if (isBridge(ev)) return;
    lastBuildingId = null;
    emit('cb:set-build-tool', { type: null });
  }, { passive:true });

  // ================ Diagnostik / Steuerung (optional) =======================
  window.InputBridge = {
    get activeBuilding(){ return lastBuildingId; },
    forceStart(id){ lastBuildingId = String(id); emit('req:place:start', { buildingId: lastBuildingId }); },
    forceCursor(tx,ty){ if (!lastBuildingId) return; emit('req:place:cursor', { tx:Number(tx), ty:Number(ty), id:lastBuildingId }); },
    forceConfirm(tx,ty){ emit('req:place:confirm', { tx:Number(tx), ty:Number(ty) }); }
  };

  log('aktiv v25.10.26-sync1');
})();
