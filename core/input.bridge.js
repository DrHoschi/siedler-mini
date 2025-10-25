/* ============================================================================
 * Datei   : core/input.bridge.js
 * Projekt : Neue Siedler (Bridge)
 * Version : v25.10.26-final
 * Zweck   : Kompatibilitäts-Bridge zwischen ALT (cb:* / req:place:*) und NEU (cb:build:place)
 * Hinweis : Bevorzugt NEUE Events; schützt vor Loops via detail.__bridge
 * ============================================================================ */
(function(){
  'use strict';

  const TAG  = '[bridge.input]';
  const LOG  = (...a)=> (window.CBLog?.info  ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn)(TAG, ...a);

  function emit(name, detail){
    try{
      const d = detail || {};
      if (!d.__bridge) d.__bridge = true;
      window.dispatchEvent(new CustomEvent(name, { detail: d }));
    }catch(e){ WARN('emit', name, e?.message||e); }
  }
  function isBridge(ev){ return !!(ev?.detail && ev.detail.__bridge); }

  // Aktives Tool (für Previews / Confirm aus ALT)
  let activeKind = null;

  /* ================= ALT → NEU ================= */

  // Tool setzen (Alt-Sender benutzen das bereits) → nur merken
  window.addEventListener('cb:set-build-tool', (ev)=>{
    if (isBridge(ev)) return;
    const d = ev?.detail || {};
    const kind = (d.kind ?? d.type ?? null);
    activeKind = kind ? String(kind) : null;

    // Bei Reset zusätzlich Alt-Cancel spiegeln (schadet nicht)
    if (!activeKind) emit('req:place:cancel', {});
  }, { passive:true });

  // Sehr alter Einstiegspunkt
  window.addEventListener('req:place:begin', (ev)=>{
    if (isBridge(ev)) return;
    const d = ev?.detail || {};
    const id = d.buildingId || d.id || d.building?.id || d.building || null;
    if (!id) return;
    activeKind = String(id);
    emit('cb:set-build-tool', { kind: activeKind }); // neue Welt steuert Tool
    LOG('ALT→NEU req:place:begin → cb:set-build-tool', activeKind);
  }, { passive:true });

  window.addEventListener('req:place:start', (ev)=>{
    if (isBridge(ev)) return;
    const id = ev?.detail?.buildingId;
    if (!id) return;
    activeKind = String(id);
    emit('cb:set-build-tool', { kind: activeKind });
    LOG('ALT→NEU req:place:start → cb:set-build-tool', activeKind);
  }, { passive:true });

  // Alt-Hover → optionales Preview (ohne Valid-Check – das macht ggf. Engine)
  window.addEventListener('cb:hover-tile', (ev)=>{
    if (isBridge(ev)) return;
    if (!activeKind) return;
    const { tx, ty } = ev.detail || {};
    if (Number.isFinite(tx) && Number.isFinite(ty)){
      emit('cb:place:preview', { tx, ty, valid:true, kind: activeKind });
    }
  }, { passive:true });

  // Alt-Platzierung → neue Platzierung
  window.addEventListener('cb:place-building', (ev)=>{
    if (isBridge(ev)) return;
    const d = ev?.detail || {};
    const kind = String(d.type ?? d.kind ?? activeKind ?? '');
    const x = Number(d.x ?? d.tx), y = Number(d.y ?? d.ty);
    if (!kind || !Number.isFinite(x) || !Number.isFinite(y)) return;
    emit('cb:build:place', { kind, x, y });
    LOG('ALT→NEU cb:place-building → cb:build:place', { kind, x, y });
  });

  /* ================= NEU → ALT (nur Echo/Kompat) ================= */

  // Neue Platzierung → altes Event spiegeln (einige Alt-UIs erwarten das)
  window.addEventListener('cb:build:place', (ev)=>{
    if (isBridge(ev)) return;
    const d = ev?.detail || {};
    const kind = d.kind ?? activeKind;
    const x = d.x, y = d.y;
    if (!kind || !Number.isFinite(x) || !Number.isFinite(y)) return;
    emit('cb:place-building', { type: kind, x, y });
  });

  // Neues Tool gesetzt (oder Reset) → Alt-Set/Cancel spiegeln
  window.addEventListener('cb:set-build-tool', (ev)=>{
    if (isBridge(ev)) return; // Vermeide Echo-Schleife
    const d = ev?.detail || {};
    const kind = (d.kind ?? d.type ?? null);
    if (kind == null){
      emit('req:place:cancel', {});
    } else {
      emit('req:place:start', { buildingId: String(kind) });
    }
  }, { passive:true });

  // Explizites Cancel aus neuer Welt → altes Cancel
  window.addEventListener('req:place:cancel', (ev)=>{
    if (isBridge(ev)) return;
    activeKind = null;
    emit('cb:set-build-tool', { kind: null });
  }, { passive:true });

  // Diagnose/Manual
  window.InputBridge = {
    get active(){ return activeKind; },
    forceTool(id){ activeKind = String(id); emit('cb:set-build-tool', { kind: activeKind }); },
    forcePlace(x,y){ if (!activeKind) return; emit('cb:build:place', { kind: activeKind, x:Number(x), y:Number(y) }); }
  };

  LOG('aktiv (v25.10.26-final)');
})();
