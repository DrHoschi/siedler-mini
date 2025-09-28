/* ============================================================================
 * Datei: assets/core/core.entities.js
 * Version: v17.6.3
 * Zweck:
 *  - Zentrale Entity-Verwaltung (nur Gebäude)
 *  - Platzhalter-Rendering mit Kategoriefarben
 *  - Robustes drawEntities (mit Debug-Overlay)
 *  - HQ-Spritepfad korrigiert (assets/buildings/hq_wood.png)
 * Abhängigkeiten: window.EntitiesRegistry (optional), window.GameCamera (optional)
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[entities]';
  const LOG  = (...a)=> (window.CBLog?.info||console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn||console.warn)(TAG, ...a);

  // --- State -----------------------------------------------------------------
  const S = (window.__EntitiesState__ ||= {
    tile: 64,
    list: [],         // {id, kind, x,y,w,h, cat}
    idseq: 0,
    sprites: new Map() // kind -> Image | 'error'
  });

  // --- Kategorie-Farben (Platzhalter) ---------------------------------------
  const CAT_COL = {
    admin:   '#0172e6', // Verwaltung
    storage: '#8b5cf6', // Lager/Depot
    food:    '#eab308', // Nahrung
    resource:'#22c55e', // Rohstoffe
    defense: '#ef4444', // Militär
    housing: '#14b8a6', // Wohnen
    default: '#f59e0b'  // Fallback
  };

  // Registry-Lookup (optional)
  function reg(kind){ return window.EntitiesRegistry?.get?.(kind) || null; }
  function catOf(kind){ return reg(kind)?.cat || 'default'; }

  // Sprite ermitteln (Registry → Map → Heuristik)
  function spritePath(kind) {
    const k = (kind||'').toLowerCase();
    const fromReg = reg(k)?.sprite || reg(k)?.icon || null;
    if (fromReg) return fromReg;
    // Heuristik (aus deiner filelist – alles lowercase in assets/buildings/)
    const map = {
      rathaus: 'assets/buildings/rathaus_wood1.png',
      house: 'assets/buildings/wohnhaus_wood0_ug0.png',
      wohnhaus: 'assets/buildings/wohnhaus_wood0_ug0.png',
      depot: 'assets/buildings/depot_wood.png',
      farm: 'assets/buildings/farm_wood.png',
      hq: 'assets/buildings/hq_wood.png',
      fisher: 'assets/buildings/fischer_wood1.png',
      steinmetz:'assets/buildings/steinmetz_wood.png',
      schmied: 'assets/buildings/schmied_wood0.png',
      windmuehle:'assets/buildings/windmuehle_wood.png',
      wachturm:'assets/buildings/wachturm_wood.png',
      lumberjack:'assets/buildings/lumberjack_wood.png',
      baecker:'assets/buildings/baecker_wood.png'
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

  // --- API: platzieren ------------------------------------------------------
  function snap(v,t=S.tile){ return Math.round(v/t)*t; }

  function place(kind, x, y){
    const k = (kind||'').toLowerCase();
    if (!k) return null;

    // Kameramitte fallback
    if (typeof x!=='number' || typeof y!=='number'){
      const cam = window.GameCamera||{};
      const cvs = document.getElementById('game') || document.querySelector('canvas');
      const dpr = Math.max(1, window.devicePixelRatio||1);
      if (cvs) {
        const zoom = cam.zoom||1;
        const w = (cvs.width/dpr)/zoom;
        const h = (cvs.height/dpr)/zoom;
        x = (cam.x||0) + w/2;
        y = (cam.y||0) + h/2;
      } else { x = 0; y = 0; }
    }

    const b = {
      id: ++S.idseq,
      kind: k,
      x: snap(x), y: snap(y),
      w: S.tile, h: S.tile,
      cat: catOf(k)
    };
    loadSprite(k);
    S.list.push(b);
    LOG('platziert:', k, '→', b.x, b.y, '(gesamt:', S.list.length, ')');
    return b;
  }

  // Rathaus automatisch in Kartenmitte beim Spielstart
  function placeTownHallOnce(){
    if (S.__autoRathausPlaced) return;
    S.__autoRathausPlaced = true;

    const cvs = document.getElementById('game') || document.querySelector('canvas');
    if (!cvs) return;
    const dpr = Math.max(1, window.devicePixelRatio||1);
    const zoom = (window.GameCamera?.zoom)||1;
    const cx = ((cvs.width/dpr)/zoom)/2 + (window.GameCamera?.x||0);
    const cy = ((cvs.height/dpr)/zoom)/2 + (window.GameCamera?.y||0);
    const b = place('rathaus', cx, cy);
    LOG('Rathaus automatisch platziert (Kartenmitte):', b.x, b.y);
  }

  // --- Rendering ------------------------------------------------------------
  function drawPlaceholder(ctx, b){
    const col = CAT_COL[b.cat] || CAT_COL.default;
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
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y); ctx.lineTo(b.x+b.w, b.y+b.h);
    ctx.moveTo(b.x+b.w, b.y); ctx.lineTo(b.x, b.y+b.h);
    ctx.stroke();
    ctx.restore();
  }

  // Die vom Renderer aufgerufene Zeichenfunktion
  function drawEntities(ctx){
    if (!ctx || !S.list.length) return;
    // Wichtig: Renderer hat bereits Welt-Transform gesetzt → nicht resetten!
    for (const b of S.list){
      const spr = S.sprites.get(b.kind) || loadSprite(b.kind);
      if (spr && spr !== 'error' && spr.complete) {
        try {
          ctx.drawImage(spr, b.x, b.y, b.w, b.h);
        } catch(e){
          WARN('drawImage Fehler für', b.kind, e?.message||e);
          drawPlaceholder(ctx,b);
        }
      } else {
        drawPlaceholder(ctx,b);
      }
      // minimale Debug-Hilfe
      drawDebugCross(ctx,b);
    }
  }

  // --- Events ---------------------------------------------------------------
  window.addEventListener('cb:build:place', (ev)=>{
    const d = ev?.detail||{};
    place(d.kind, d.x, d.y);
  });
  window.addEventListener('cb:build-action', (ev)=>{
    const a = ev?.detail?.action||'';
    if (a.startsWith('place-')) place(a.slice(6));
  });

  // Auto-Rathaus beim Start
  window.addEventListener('cb:game-start', placeTownHallOnce);

  // --- Exports --------------------------------------------------------------
  window.drawEntities = drawEntities;
  window.Entities = { place, state: S };

  LOG('drawEntities global gebunden → Renderer kann Entities zeichnen.');
  LOG('Modul geladen (v17.6.3).');
})();
