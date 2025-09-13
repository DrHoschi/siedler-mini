/* ============================================================================
 * Neue Siedler – Core Engine + Entities-Bridge (robust)
 * Datei: assets/core/game.js
 * Version: v18.0.1
 *
 * WICHTIG:
 *  - Die Entities-Bridge (drawEntities + Event-Handler) wird IMMER gesetzt,
 *    auch wenn GameCore bereits initialisiert ist (Inspector-"skip"-Fall).
 *  - drawEntities greift NICHT auf eine lokale 'state'-Variable zu, sondern
 *    liest immer window.GameCore?.state → kein Endlos-Fehler mehr.
 *  - Build-Events landen immer bei Game.place() (falls vorhanden), sonst
 *    direkt im State oder zunächst in einer Pending-Queue.
 * ============================================================================ */
(function () {
  'use strict';

  const LOG  = (...a)=> (window.CBLog?.info  || console.log)('[GameCore]', ...a);
  const OK   = (...a)=> (window.CBLog?.ok    || console.log)('[GameCore]', ...a);
  const WARN = (...a)=> (window.CBLog?.warn  || console.warn)('[GameCore]', ...a);
  const ERR  = (...a)=> (window.CBLog?.error || console.error)('[GameCore]', ...a);

  // -------------------------------------------------------------------------
  // Kategorien & Platzhalterfarben (NICHT für Platzierbar/Blockiert!):
  // Diese Farben sind nur die "Familienfarben" der Gebäude.
  // -------------------------------------------------------------------------
  const CATEGORY_COLORS = {
    Verwaltung : '#5B8DEF', // blau
    Nahrung    : '#F39C12', // amber/orange (NICHT grün/rot!)
    Rohstoffe  : '#8E44AD', // violett
    Wohnen     : '#27AE60', // grünlich (nur Familienfarbe, nicht status)
    Infrastruktur:'#2C3E50',// dunkel
    Deko       : '#95A5A6', // grau
    Militär    : '#E74C3C', // rot (Familienfarbe, Statusfarben werden separat geregelt)
    Sonstiges  : '#BDC3C7'
  };

  // Mapping: Gebäudekürzel → Kategorie
  const KIND_TO_CAT = {
    // Verwaltung/Allg.
    hq: 'Verwaltung', depot: 'Verwaltung',
    // Nahrung
    farm: 'Nahrung', fisher: 'Nahrung', windmill: 'Nahrung',
    // Rohstoffe
    lumberjack: 'Rohstoffe', stonecutter: 'Rohstoffe', smith: 'Rohstoffe',
    // Wohnen
    house: 'Wohnen',
    // Infrastruktur
    road: 'Infrastruktur', 'road-curve':'Infrastruktur', 'road-cross':'Infrastruktur',
    // Deko/Landschaft
    grass:'Deko', meadow:'Deko', rock:'Deko', sand:'Deko', water:'Deko',
    // Militär
    guardtower:'Militär'
  };

  function colorForKind(kind){
    const cat = KIND_TO_CAT[kind] || 'Sonstiges';
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS.Sonstiges;
  }

  // Pending-Queue falls Build-Events kommen, bevor die Engine steht
  const PENDING = [];

  // -------------------------------------------------------------------------
  // Globale, robuste drawEntities – IMMER definieren (vor evtl. Engine-Skip)
  // Greift ausschließlich über window.GameCore?.state zu (keine Closure!).
  // -------------------------------------------------------------------------
  window.drawEntities = function drawEntities(ctx) {
    const st = window.GameCore?.state;
    const list = st?.entities?.buildings;
    if (!Array.isArray(list) || list.length === 0) return;

    // Sprite-Cache im globalen Namespace halten
    const SPRITES = (window.__SPRITES__ ||= new Map());
    const SPRITE_BASE = 'assets/buildings';

    function getSprite(kind){
      if (!kind) return null;
      if (SPRITES.has(kind)) return SPRITES.get(kind);
      const img = new Image();
      img.onload  = () => OK('Sprite geladen:', kind);
      img.onerror = () => { SPRITES.set(kind, 'error'); WARN('Sprite fehlt:', kind); };
      img.src = `${SPRITE_BASE}/${kind}.png`;
      SPRITES.set(kind, img);
      return img;
    }

    for (const b of list) {
      const spr = getSprite(b.kind);
      if (spr && spr !== 'error' && spr.complete) {
        ctx.drawImage(spr, b.x, b.y, b.w, b.h);
      } else {
        // Platzhalter in Familienfarbe
        const fill = colorForKind(b.kind);
        ctx.save();
        ctx.fillStyle = fill;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(0,0,0,.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        ctx.fillStyle = '#111';
        ctx.font = '12px system-ui,sans-serif';
        ctx.fillText(b.kind || '???', b.x + 6, b.y + b.h/2 + 4);
        ctx.restore();
      }
    }
  };

  // -------------------------------------------------------------------------
  // Build-Event-Handler – IMMER registrieren. Leiten an Game.place weiter,
  // oder puffern bis die Engine bereit ist.
  // -------------------------------------------------------------------------
  function placeViaAPI(kind, x, y){
    if (!kind) return;
    if (typeof window.Game?.place === 'function') {
      window.Game.place(kind, x, y);
      return true;
    }
    // Versuch: direkt in den State schreiben, falls vorhanden
    const st = window.GameCore?.state;
    if (st?.map && st?.entities) {
      const t = st.map.tile || 64;
      const snap = (v)=> Math.round(v / t) * t;
      const pos = (()=>{
        // Kamera-Mitte als Fallback
        const cam = window.GameCamera || {};
        const cvs = document.getElementById('game') || document.querySelector('canvas');
        if (!cvs) return {x:0,y:0};
        const dpr = Math.max(1, window.devicePixelRatio||1);
        const w = (cvs.width  / dpr) / (cam.scale||1);
        const h = (cvs.height / dpr) / (cam.scale||1);
        return { x: (cam.x||0) + w/2, y: (cam.y||0) + h/2 };
      })();
      const bx = snap(typeof x==='number'?x:pos.x);
      const by = snap(typeof y==='number'?y:pos.y);
      const b = { id: ++st.entities._idseq, kind, x: bx, y: by, w: t, h: t };
      st.entities.buildings.push(b);
      OK('Gebäude platziert (direct):', kind, '→', bx, by, '(gesamt:', st.entities.buildings.length, ')');
      return true;
    }
    // Noch keine API/kein State → puffern
    PENDING.push({kind, x, y});
    WARN('place gepuffert:', kind);
    return false;
  }

  function onBuildPlace(ev){
    const d = ev?.detail || {};
    placeViaAPI(d.kind, d.x, d.y);
  }
  function onBuildAction(ev){
    const d = ev?.detail || {};
    const a = d.action || '';
    if (!a.startsWith('place-')) return;
    placeViaAPI(a.slice(6));
  }

  // Nur einmal registrieren
  if (!window.__build_handlers_bound__) {
    window.addEventListener('cb:build:place', onBuildPlace);
    window.addEventListener('build:action',   onBuildAction);
    window.addEventListener('cb:build-action',onBuildAction);
    window.__build_handlers_bound__ = true;
    OK('Build-Events gebunden.');
  }

  // -------------------------------------------------------------------------
  // Engine-Definition (nur wenn noch nicht vorhanden)
  // -------------------------------------------------------------------------
  if (window.GameCore?.Engine) {
    WARN('bereits initialisiert – skip Engine-Init (Bridge ist aktiv).');
    return;
  }

  const GameCore = (window.GameCore = window.GameCore || {});
  const state = (GameCore.state = GameCore.state || {
    version: '18.0.1',
    map:    { tile:64, cols:16, rows:16, url:null, data:null },
    entities: { buildings:[], _idseq:0 },
    ui: { started:false }
  });

  function snap(v,tile){ return Math.round(v / tile) * tile; }

  function cameraCenterWorld() {
    const cam = window.GameCamera || {};
    const cvs = document.getElementById('game') || document.querySelector('canvas');
    if (!cvs) return {x:0,y:0};
    const dpr = Math.max(1, window.devicePixelRatio||1);
    const w = (cvs.width  / dpr) / (cam.scale||1);
    const h = (cvs.height / dpr) / (cam.scale||1);
    return { x:(cam.x||0)+w/2, y:(cam.y||0)+h/2 };
  }

  function placeBuilding(kind, x, y){
    if (!kind) return null;
    const t = state.map.tile || 64;
    const c = cameraCenterWorld();
    const bx = snap(typeof x==='number'?x:c.x, t);
    const by = snap(typeof y==='number'?y:c.y, t);
    const b  = { id: ++state.entities._idseq, kind, x:bx, y:by, w:t, h:t };
    state.entities.buildings.push(b);
    OK('Gebäude platziert:', kind, '→', bx, by, '(gesamt:', state.entities.buildings.length, ')');
    return b;
  }

  async function loadMap(url){
    try{
      const res = await fetch(url, { cache:'no-store' });
      if (!res.ok) throw new Error('HTTP '+res.status);
      const json = await res.json();
      state.map.data = json;
      if (json?.tile) state.map.tile = json.tile;
      if (json?.cols) state.map.cols = json.cols;
      if (json?.rows) state.map.rows = json.rows;
      OK('Map geladen:', url);
      return true;
    }catch(e){
      ERR('Map-Load fehlgeschlagen:', e?.message||e); return false;
    }
  }

  async function start(mapUrl){
    if (state.ui.started) return;
    state.ui.started = true;

    const cvs = document.getElementById('game') || document.querySelector('canvas');
    const url = mapUrl || cvs?.getAttribute('data-map') || 'assets/maps/map-mini.json';
    state.map.url = url;
    await loadMap(url);

    // Pending-Builds abarbeiten
    if (PENDING.length){
      const cp = PENDING.splice(0, PENDING.length);
      cp.forEach(p => placeBuilding(p.kind, p.x, p.y));
      OK('Pending-Builds verarbeitet:', cp.length);
    }

    LOG('Engine ready (v'+state.version+').');
  }

  function stop(){
    state.ui.started = false;
    WARN('Engine gestoppt.');
  }

  // API nach außen
  GameCore.Engine = { start, stop };
  const Game = (window.Game = window.Game || {});
  Game.place = placeBuilding;
  Game.state = state;

  LOG('Modul geladen env:' + (window.__ENV_VERSION__ || 'unknown'));
})();
