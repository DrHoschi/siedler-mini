/* Unit Marker System (Tool / Carry) – v26.01.06-unit-markers-A */
(function(){
  'use strict';
  const BEHIND_DIRS = new Set(['N','NE','NW']);
  function _getRegistry(){ return window.Registry || window.GameRegistry || null; }
  function _getUnitMarkersRoot(){
    const reg = _getRegistry();
    if (!reg) return null;
    return reg.unitMarkers || reg.data?.unitMarkers || reg.data?.unitsMarkers || (reg.get ? reg.get('unitMarkers') : null) || null;
  }
  function _getKind(u){ return String(u?.kind ?? u?.job ?? u?.type ?? 'carrier'); }
  function _getDir8(u){ return String(u?._dir8 || u?._dir || u?.dir || 'S').toUpperCase(); }
  function isAttachmentBehind(dir8){ return BEHIND_DIRS.has(String(dir8).toUpperCase()); }
  function _flipXForDir8(x, dir8){
    const d = String(dir8).toUpperCase();
    return (d==='W' || d==='NW' || d==='SW') ? -x : x;
  }
  function _readFromRegistry(kind, type, dir8){
    const root = _getUnitMarkersRoot();
    if (!root) return null;
    const k = root[kind] || root[String(kind)] || null;
    if (!k) return null;
    const t = k[type] || k[String(type)] || null;
    if (!t) return null;
    if (Number.isFinite(t.x) && Number.isFinite(t.y)) return { x: t.x, y: t.y };
    const d = t[dir8] || t[String(dir8)] || t.S || t.DEFAULT || null;
    if (d && Number.isFinite(d.x) && Number.isFinite(d.y)) return { x: d.x, y: d.y };
    return null;
  }
  function _readFromRegistry(kind, type, dir8){
    const root = _getUnitMarkersRoot();
    if (!root) return null;
    const k = root[kind] || root[String(kind)] || null;
    if (!k) return null;
    const t = k[type] || k[String(type)] || null;
    if (!t) return null;
    if (Number.isFinite(t.x) && Number.isFinite(t.y)) return { x: t.x, y: t.y };
    const d = t[dir8] || t[String(dir8)] || t.S || t.DEFAULT || null;
    if (d && Number.isFinite(d.x) && Number.isFinite(d.y)) return { x: d.x, y: d.y };
    return null;
  }
  function _fallbackMarkerPx(frame, type, dir8){
    const w = Number(frame?.w || 0);
    const h = Number(frame?.h || 0);
    if (!w || !h) return { x: 0, y: 0 };
    let x = 0, y = 0;
    if (type === 'tool'){
      x = w * 0.22;
      y = -h * 0.55;
    } else if (type === 'carry'){
      x = w * 0.06;
      y = -h * 0.38;
    } else {
      x = 0;
      y = -h * 0.4;
    }
    x = _flipXForDir8(x, dir8);
    return { x: Math.round(x), y: Math.round(y) };
  }

  function getMarkerPx(u, type, frame){
    const kind = _getKind(u);
    const dir8 = _getDir8(u);
    const normType = String(type || '').toLowerCase();
    const fromReg = _readFromRegistry(kind, normType, dir8);
    if (fromReg) return { x: fromReg.x, y: fromReg.y, dir8 };
    const fb = _fallbackMarkerPx(frame, normType, dir8);
    return { x: fb.x, y: fb.y, dir8 };
  }

  function getMarkerWorldOffset(u, type, frame, scale){
    const m = getMarkerPx(u, type, frame);
    const s = Number(scale || 1) || 1;
    return { dx: m.x * s, dy: m.y * s, dir8: m.dir8 };
  }

  window.UnitMarkers = {
    getMarkerPx,
    getMarkerWorldOffset,
    isAttachmentBehind
  };
})();
