/* ============================================================================
 * Datei   : core/entities.js
 * Projekt : Neue Siedler
 * Version : v25.10.25-final
 * Zweck   : Zentrale Entity-Verwaltung (Gebäude) + Rendering-Hook
 *
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 *
 * Events  :
 *   – listen: cb:build:place {kind,x?,y?}, cb:build-action {action:"place-<id>"},
 *             cb:game-start (Auto-HQ)
 *   – emit  : cb:entities:changed { type:"add|remove|clear", count, last? }
 *
 * Abhängigkeiten (optional):
 *   – Registry (core/registry.js): Farben/Sprites/Kategorien (fallbacks vorhanden)
 *   – GameCamera: zur Berechnung von Bildschirmmitte bei fehlenden Koordinaten
 *   – CBLog: einheitliche Logs
 *
 * Hinweise:
 *   – Renderer ruft window.drawEntities(ctx) im Welt-Transform auf (nicht resetten).
 *   – Registry-Integration gemäß Lastenheft/Standards (IDs b.*, Kategorien, Sprite-Paths).
 * ============================================================================ */

(() => {
  'use strict';

  /* ==========================================================================
   * [Imports / Logger]
   * ========================================================================== */
  const TAG  = '[entities]';
  const LOG  = (...a)=> (window.CBLog?.info  ?? console.log )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn)(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error ?? console.error)(TAG, ...a);

  /* ==========================================================================
   * [Konstanten & Meta]
   * ========================================================================== */
  const VERSION = 'v25.10.25-final';
  const DEFAULT_TILE = 64;

  // Platzhalter-Kategoriefarben (werden von Registry überschrieben, falls vorhanden)
  const CAT_COL_FALLBACK = {
    admin:   '#0172e6',
    storage: '#8b5cf6',
    food:    '#eab308',
    resource:'#22c55e',
    defense: '#ef4444',
    housing: '#14b8a6',
    default: '#f59e0b'
  };

  // interner State (einmal pro Seite)
  const S = (window.__EntitiesState__ ||= {
    tile: DEFAULT_TILE,
    idseq: 0,
    list: /** @type {Array<{id:number, kind:string, x:number,y:number,w:number,h:number,cat:string}>} */([]),
    sprites: new Map() // key: kind → HTMLImageElement | 'error'
  });

  // Event-Helfer
  const EVT = (name, detail)=> window.dispatchEvent(new CustomEvent(name, { detail }));

  /* ==========================================================================
   * [Registry-Helfer]
   * ========================================================================== */
  function regGet(type, id){
    try { return window.Registry?.get?.(type, id) ?? null; }
    catch { return null; }
  }
  function regList(type, pred=null){
    try { return window.Registry?.list?.(type, pred) ?? []; }
    catch { return []; }
  }
  function regColorForCategory(cat){
    // Versuch: Registry.meta('enums') o. Ressourcenfarben
    try{
      const r = regGet('resource','res.'+cat);
      if (r?.color) return r.color;
    }catch{}
    return CAT_COL_FALLBACK[cat] || CAT_COL_FALLBACK.default;
  }

  /* ==========================================================================
   * [Sprite-Pfadermittlung]
   * ========================================================================== */
  function spritePath(kind){
    const k = (kind||'').toLowerCase();

    // 1) Über Registry (bevorzugt)
    const bMeta = regGet('building', 'b.'+k) || regGet('building', k);
    if (bMeta?.sprite) return bMeta.sprite;
    if (bMeta?.icon)   return bMeta.icon;

    // 2) Fallback-Heuristik (Legacy-Dateinamen)
    const map = {
      rathaus:    'assets/buildings/hq_wood.png',
      hq:         'assets/buildings/hq_wood.png',
      wohnhaus:   'assets/buildings/wohnhaus_wood0_ug0.png',
      house:      'assets/buildings/wohnhaus_wood0_ug0.png',
      depot:      'assets/buildings/depot_wood.png',
      farm:       'assets/buildings/farm_wood.png',
      fisher:     'assets/buildings/fischer_wood1.png',
      steinmetz:  'assets/buildings/steinmetz_wood.png',
      schmied:    'assets/buildings/schmied_wood0.png',
      windmuehle: 'assets/buildings/windmuehle_wood.png',
      wachturm:   'assets/buildings/wachturm_wood.png',
      lumberjack: 'assets/buildings/lumberjack_wood.png',
      baecker:    'assets/buildings/baecker_wood.png'
    };
    return map[k] || `assets/buildings/${k}.png`;
  }

  function loadSprite(kind){
    const k = (kind||'').toLowerCase();
    if (S.sprites.has(k)) return S.sprites.get(k);
    const img = new Image();
    img.onload  = ()=> LOG('Sprite geladen:', k, '←', img.src);
    img.onerror = ()=> { S.sprites.set(k,'error'); WARN('Sprite fehlt / lädt nicht:', k, img.src); };
    img.src = spritePath(k);
    S.sprites.set(k, img);
    return img;
  }

  /* ==========================================================================
   * [Hilfsfunktionen]
   * ========================================================================== */
  const TileSize = ()=> (window.Game?.tileSize || S.tile || DEFAULT_TILE);

  function snap(v,t=TileSize()){ return Math.round(v/t)*t; }

  function catOf(kind){
    // Aus Registry (Gebäude hat category), sonst 'default'
    const k = (kind||'').toLowerCase();
    const b = regGet('building','b.'+k) || regGet('building', k);
    return (b?.category)||'default';
  }

  function ensureXY(kind, x, y){
    if (typeof x === 'number' && typeof y === 'number') return { x, y };
    // Fallback: Kameramitte (gem. Vorgaben darf Renderer laufen; Kamera verfügbar) 
    const cam = window.GameCamera||{};
    const cvs = document.getElementById('game') || document.querySelector('canvas');
    const dpr = Math.max(1, window.devicePixelRatio||1);
    if (cvs) {
      const zoom = cam.zoom||1;
      const w = (cvs.width/dpr)/zoom;
      const h = (cvs.height/dpr)/zoom;
      return { x:(cam.x||0)+w/2, y:(cam.y||0)+h/2 };
    }
    return { x:0, y:0 };
  }

  /* ==========================================================================
   * [API: Platzieren/Entfernen]
   * ========================================================================== */
  function place(kind, x, y){
    const k = (kind||'').toLowerCase();
    if (!k){ WARN('place(): kind fehlt'); return null; }

    const p = ensureXY(k, x, y);
    const t = TileSize();

    const b = {
      id: ++S.idseq,
      kind: k,
      x: snap(p.x, t), y: snap(p.y, t),
      w: t, h: t,
      cat: catOf(k)
    };
    loadSprite(k);
    S.list.push(b);

    LOG('platziert:', k, '→', b.x, b.y, '(anzahl:', S.list.length, ')');
    EVT('cb:entities:changed', { type:'add', count:S.list.length, last:{ id:b.id, kind:b.kind } });
    return b;
  }

  function removeById(id){
    const i = S.list.findIndex(e=>e.id===id);
    if (i>=0){
      const [removed] = S.list.splice(i,1);
      EVT('cb:entities:changed', { type:'remove', count:S.list.length, last:{ id:removed.id, kind:removed.kind } });
      return removed;
    }
    return null;
  }

  function clear(){
    S.list.length = 0;
    EVT('cb:entities:changed', { type:'clear', count:0 });
  }

  /* ==========================================================================
   * [Rendering]
   * ========================================================================== */
  function drawPlaceholder(ctx, b){
    const col = regColorForCategory(b.cat);
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = col;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeRect(b.x+0.5, b.y+0.5, b.w-1, b.h-1);
    // Label
    ctx.fillStyle = '#000';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(b.kind, b.x+4, b.y + b.h/2 + 4);
    ctx.restore();
  }

  function drawDebugCross(ctx, b){
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y); ctx.lineTo(b.x+b.w, b.y+b.h);
    ctx.moveTo(b.x+b.w, b.y); ctx.lineTo(b.x, b.y+b.h);
    ctx.stroke();
    ctx.restore();
  }

  /** Vom Renderer aufrufen – Welttransform ist bereits gesetzt. */
  function drawEntities(ctx){
    if (!ctx || !S.list.length) return;
    for (const b of S.list){
      const spr = S.sprites.get(b.kind) || loadSprite(b.kind);
      if (spr && spr !== 'error' && spr.complete) {
        try { ctx.drawImage(spr, b.x, b.y, b.w, b.h); }
        catch(e){ WARN('drawImage Fehler:', b.kind, e?.message||e); drawPlaceholder(ctx,b); }
      } else {
        drawPlaceholder(ctx,b);
      }
      drawDebugCross(ctx,b); // minimale Orientierungshilfe
    }
  }

  /* ==========================================================================
   * [Hauptlogik – Events]
   * ========================================================================== */
  // Build-Flow: Platzierung aus Dock/Platziermodus (Lastenheft Kap. 4.3/Flows)
  window.addEventListener('cb:build:place', (ev)=>{
    const d = ev?.detail||{};
    place(d.kind, d.x, d.y);
  });
  window.addEventListener('cb:build-action', (ev)=>{
    const a = ev?.detail?.action||'';
    if (a.startsWith('place-')) place(a.slice(6));
  });

  // Auto-HQ beim Start (MVP)
  window.addEventListener('cb:game-start', ()=>{
    if (S.list.some(e=>e.kind==='rathaus' || e.kind==='hq')) return;
    const t = ensureXY('rathaus'); // Kameramitte
    const b = place('rathaus', t.x, t.y);
    LOG('Auto-HQ platziert:', b?.x, b?.y);
  });

  /* ==========================================================================
   * [Exports – Public API]
   * ========================================================================== */
  window.Entities = {
    place, removeById, clear,
    state: S,
    version: VERSION
  };

  // Backwards-compatibler Draw-Hook (Renderer ruft window.drawEntities(ctx))
  window.drawEntities = drawEntities;

  LOG('Modul geladen ('+VERSION+') – drawEntities global verfügbar.');
})();
