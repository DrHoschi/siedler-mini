/* ============================================================================
 * Datei   : core/game-v7.js
 * Projekt : Neue Siedler
 * Version : v25.11.27-step1+2+3
 * Build   : quadratisches Layout (CSS-Rect) · DPR-Backbuffer · Focus-Zoom
 *           View-Culling · Dual-Camera-Events · Wheel-Zoom (Desktop)
 *
 * Zweck   : Einziger Renderer für die Kachel-Map + Gebäude-Visualisierung.
 *           Gekoppelt an das CSS-Layout (#game) und die map-runtime.bridge.js.
 *
 * Neu     : SCHRITT 2 – Produktionssystem
 *           - Gebäude produzieren Ressourcen (Holz / Stein)
 *           - Erzeugte Waren werden als Jobs an das Träger-System übergeben
 *           - Game.takeFromBuilding + Game.deliverToHQ für carrier.js
 *
 *           SCHRITT 3 – Job-Queue
 *           - Jobs werden nicht mehr lokal gehalten, sondern komplett an
 *             GameUnits delegiert (GameUnits.addJob / GameUnits.popJob)
 *           - Carrier holen Jobs weiter über JobEngine.pop()
 *
 *           SCHRITT 1 – Bauphasen
 *           - Gebäude laufen durch Baustelle_0 → Baustelle_1 → Baustelle_2
 *             → fertiges Haus
 *           - Produktion läuft nur, wenn Bauphase COMPLETE ist
 * ========================================================================== */

window.Game = window.Game || {};

/* ============================================================================
 * Units-API
 * - getUnits: nur Durchreicher auf GameUnits (für Inspector/Debug)
 * - addJob / popJob: Brücke auf die JobEngine-Queue
 * ========================================================================== */
Game.getUnits = () => (window.GameUnits?.getUnits?.() || []);

// Jobs landen zentral in der JobEngine-Queue
Game.addJob = (...args) => {
  return window.JobEngine?.add?.(...args);
};

Game.popJob = (...args) => {
  return window.JobEngine?.pop?.(...args);
};

(function(){
  'use strict';

  /* ==========================================================================
   * 0) LOGGING / HILFSALIASE
   * ======================================================================== */
  const TAG  = '[game]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error?? console.error)(TAG, ...a);

  /* ==========================================================================
   * 1) KONSTANTEN & ANZEIGE-PRÄFERENZEN
   * ======================================================================== */
  const VIEW_PREF = { fit: 'cover' }; // 'cover' oder 'contain'

  // ---- Bauphasen für Gebäude-Baustellen ------------------------------
  // 0 = nur abgesteckt, 1 = Material liegt, 2 = fast fertig, 3 = fertig
  const BUILD_PHASE = {
    SITE     : 0,
    MATERIAL : 1,
    FINISH   : 2,
    COMPLETE : 3
  };

  // Dauer je Phase in Sekunden (0→1, 1→2, 2→3)
  const BUILD_PHASE_DUR = [4, 4, 4];

  // ---- Produktionsregeln (Fallback, wenn keine Registry-Infos vorhanden) ----
  const HARDCODED_PRODUCTION = {
    // Holzfäller-Varianten
    'b.woodcutter'  : { res:'wood',  cycleSec:6, amount:1, maxStock:4 },
    'b.lumberjack'  : { res:'wood',  cycleSec:6, amount:1, maxStock:4 },
    'b.holzfaeller' : { res:'wood',  cycleSec:6, amount:1, maxStock:4 },

    // Steinbruch-Varianten
    'b.quarry'      : { res:'stone', cycleSec:8, amount:1, maxStock:4 },
    'b.stonecutter' : { res:'stone', cycleSec:8, amount:1, maxStock:4 },
    'b.steinbruch'  : { res:'stone', cycleSec:8, amount:1, maxStock:4 }
  };

  function getProductionRuleFor(id){
    if (!id) return null;

    // 1) Optional: Registry-Integration für Produktion
    try {
      const reg = window.Registry;
      if (reg && typeof reg.get === 'function'){
        const meta = reg.get('building', id);
        const p = meta?.production;
        if (p){
          return {
            res      : p.res || p.resource || p.id || 'wood',
            cycleSec : p.cycleSec ?? p.cycle ?? 6,
            amount   : p.amount ?? 1,
            maxStock : p.maxStock ?? p.buffer ?? 4,
            pickup   : p.pickup || null
          };
        }
      }
    } catch(e){
      WARN('Registry.production konnte nicht gelesen werden:', e?.message||e);
    }

    // 2) Harte Tabelle
    if (HARDCODED_PRODUCTION[id]) return HARDCODED_PRODUCTION[id];

    // 3) Heuristik nach Name
    if (/wood|holz/i.test(id))  return HARDCODED_PRODUCTION['b.woodcutter'];
    if (/stone|stein/i.test(id))return HARDCODED_PRODUCTION['b.stonecutter'];

    return null;
  }

  /* ==========================================================================
   * 2) MODUL-STATUS (STATE)
   * ======================================================================== */
  const S = {
    // Map / Tileset
    map:null, tileset:null, tilesetUrl:null,
    cols:0, rows:0, tileW:64, tileH:64,
    firstGid:1, tsCols:1, tsRows:1,
    layers:[],

    // Canvas/Context (+DPR)
    canvas:null, ctx:null,
    cssW:0, cssH:0, dpr:1,

    // Kamera
    cam:{ x:0, y:0, zoom:1 },

    // Gebäude-Liste
    // { id, x, y, w, h, stock:{res:menge}, _prodTimer:sec, buildStage }
    buildings: [],

    // HQ-Info
    hqPos   : null,
    hqStock : {},

    // Job-Queue (wird jetzt von GameUnits verwaltet, Feld hier nur noch passiv)
    jobs: [],

    // Laufsteuerung
    running:false, rafId:0,

    // Resize / Fit
    resizeObs:null,
    didInitialFit:false,

    // Gebäude-Sprites
    buildingSprites   : {},
    // Baustellen-Sprites für die Bauphasen (baustelle_0/1/2.png)
    buildPlaceSprites : []
  };

  /* ==========================================================================
   * 3) HILFSFUNKTIONEN – MAP / CANVAS
   * ======================================================================== */

  function deriveTsGrid(){
    if (S.tileset && S.tileW && S.tileH){
      S.tsCols = Math.max(1, Math.floor(S.tileset.width  / S.tileW));
      S.tsRows = Math.max(1, Math.floor(S.tileset.height / S.tileH));
    }
  }

  function normalizeFromTiled(map){
    S.cols  = Number(map.width||0);
    S.rows  = Number(map.height||0);
    S.tileW = Number(map.tilewidth||64);
    S.tileH = Number(map.tileheight||64);

    if (Array.isArray(map.tilesets) && map.tilesets.length){
      const ts0 = map.tilesets[0];
      S.firstGid = Number(ts0.firstgid||1);
      if (Number.isFinite(ts0.columns)) S.tsCols = Number(ts0.columns);
    }
    deriveTsGrid();

    S.layers = [];
    if (Array.isArray(map.layers)){
      for (const L of map.layers){
        if (L?.type==='tilelayer' && Array.isArray(L.data)){
          S.layers.push({ name:L.name||'layer', data: L.data.slice(0) });
        }
      }
    }
  }

  function normalizeFromSimple(map){
    if (Array.isArray(map.size) && map.size.length>=2){
      S.tileW = Number(map.size[0])||64;
      S.tileH = Number(map.size[1])||64;
    }
    const grid = map.tiles;
    S.rows = grid.length; S.cols = grid[0].length;

    const flat = new Array(S.cols * S.rows);
    let i=0;
    for (let r=0;r<S.rows;r++){
      for (let c=0;c<S.cols;c++){
        flat[i++] = grid[r][c]|0;
      }
    }
    S.layers = [{ name:'layer0', data:flat }];
    S.firstGid = 1; S.tsCols = 1; S.tsRows = 1;
    deriveTsGrid();

    INFO('Map (simple) normalisiert:', { cols:S.cols, rows:S.rows, tile:[S.tileW,S.tileH], tsCols:S.tsCols });
  }

  function normalizeMap(map){
    const looksTiled  = Array.isArray(map?.layers) && (map.tilewidth||map.tileheight||map.tilesets);
    const looksSimple = Array.isArray(map?.tiles) && Array.isArray(map?.tiles[0]);
    if (looksTiled) normalizeFromTiled(map);
    else if (looksSimple) normalizeFromSimple(map);
    else {
      WARN('Unbekanntes Map-Format → 1x1-Fallback');
      S.cols=S.rows=1; S.layers=[{name:'layer0',data:[0]}];
    }

    window.Game.tileSize    = S.tileW;
    window.Game.getTileSize = ()=> S.tileW;
  }

  function ensureCanvas(){
    if (S.canvas && S.ctx) return;

    const el = document.getElementById('game');
    if (!el) throw new Error('#game Canvas fehlt');

    const ctx = el.getContext('2d', { alpha:false });
    ctx.imageSmoothingEnabled = false;

    S.canvas = el; S.ctx = ctx;
    S.dpr = (window.devicePixelRatio || 1);

    resizeToCssRect();

    if (typeof ResizeObserver === 'function'){
      S.resizeObs = new ResizeObserver(()=> resizeToCssRect());
      S.resizeObs.observe(S.canvas);
    } else {
      addEventListener('resize', resizeToCssRect);
      addEventListener('orientationchange', resizeToCssRect);
    }

    if (!window.GameCamera && !S.canvas.__wheelZoomWired){
      S.canvas.__wheelZoomWired = true;
      S.canvas.addEventListener('wheel', (ev)=>{
        if (!ev.ctrlKey && !ev.metaKey) return;
        ev.preventDefault();
        const factor = ev.deltaY < 0 ? 1.1 : 1/1.1;
        zoomAt(ev.clientX, ev.clientY, S.cam.zoom * factor);
      }, { passive:false });
    }

    OK('Canvas init (DPR=', S.dpr, ' CSS=', S.cssW+'x'+S.cssH,
       ' BS=', S.canvas.width+'x'+S.canvas.height, ')');
  }

  function resizeToCssRect(){
    if (!S.canvas) return;

    const cssRect = S.canvas.getBoundingClientRect();
    const cssW = Math.max(0, Math.floor(cssRect.width));
    const cssH = Math.max(0, Math.floor(cssRect.height));

    const dpr = (window.devicePixelRatio || 1);
    const backW = Math.max(1, Math.floor(cssW * dpr));
    const backH = Math.max(1, Math.floor(cssH * dpr));

    if (S.canvas.width !== backW)  S.canvas.width  = backW;
    if (S.canvas.height !== backH) S.canvas.height = backH;

    S.cssW = cssW;
    S.cssH = cssH;
    S.dpr  = dpr;

    if (!cssW || !cssH) {
      return;
    }

    if (S.map && !S.didInitialFit){
      try {
        fitToMap(VIEW_PREF.fit);
        S.didInitialFit = true;
      } catch(e){
        WARN('fitToMap@resize fail', e);
      }
    }
  }

  function clear(){
    const c=S.canvas, ctx=S.ctx;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle='#101418';
    ctx.fillRect(0,0,c.width,c.height);
  }

  function applyCamera(){
    const {x,y,zoom} = S.cam;
    S.ctx.setTransform(zoom,0,0,zoom, -x*zoom, -y*zoom);
  }

  function fitToMap(strategy='cover') {
    const worldW = S.cols * S.tileW;
    const worldH = S.rows * S.tileH;
    if (!worldW || !worldH) return;

    const cssW = S.cssW;
    const cssH = S.cssH;
    if (!cssW || !cssH) {
      WARN('fitToMap: CSS-Rect ist noch 0×0 – warte auf sichtbares Layout.');
      return;
    }

    const zContain = Math.min(cssW/worldW, cssH/worldH);
    const zCover   = Math.max(cssW/worldW, cssH/worldH);
    const z        = (strategy === 'contain') ? zContain : zCover;

    S.cam.zoom = clamp(z, 0.1, 6);

    const viewW = cssW / S.cam.zoom;
    const viewH = cssH / S.cam.zoom;

    S.cam.x = Math.max(0, (worldW - viewW) * 0.5);
    S.cam.y = Math.max(0, (worldH - viewH) * 0.5);
  }

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  function zoomAt(clientX, clientY, nextZoom) {
    const c = S.canvas; if (!c) return;
    const rect = c.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;

    const wxBefore = (cx / S.cam.zoom) + S.cam.x;
    const wyBefore = (cy / S.cam.zoom) + S.cam.y;

    const z = clamp(nextZoom || 1, 0.1, 6);
    S.cam.zoom = z;

    S.cam.x = wxBefore - (cx / z);
    S.cam.y = wyBefore - (cy / z);
  }

  /* ==========================================================================
   * 4) ZEICHNEN
   * ======================================================================== */

  function drawTile(gid, dx, dy){
    if (!gid) return;
    const img=S.tileset; if (!img) return;
    const index = (gid|0) - (S.firstGid|0);
    if (index < 0) return;

    const sx = (index % S.tsCols) * S.tileW;
    const sy = Math.floor(index / S.tsCols) * S.tileH;
    S.ctx.drawImage(img, sx,sy,S.tileW,S.tileH, dx,dy,S.tileW,S.tileH);
  }

  function drawLayersCulled(){
    const { cols, rows, tileW, tileH } = S;
    if (!cols || !rows) return;

    const viewW = S.cssW / S.cam.zoom;
    const viewH = S.cssH / S.cam.zoom;
    const vx0   = S.cam.x;
    const vy0   = S.cam.y;
    const vx1   = vx0 + viewW;
    const vy1   = vy0 + viewH;

    const tx0 = Math.max(0, ((vx0 / tileW) | 0) - 1);
    const ty0 = Math.max(0, ((vy0 / tileH) | 0) - 1);
    const tx1 = Math.min(cols-1, ((vx1 / tileW) | 0) + 1);
    const ty1 = Math.min(rows-1, ((vy1 / tileH) | 0) + 1);

    for (const L of S.layers){
      const data=L.data; if(!Array.isArray(data)) continue;

      for (let y=ty0; y<=ty1; y++){
        const rowIndex = y * cols;
        const py = y * tileH;
        for (let x=tx0; x<=tx1; x++){
          const px = x * tileW;
          const gid = data[rowIndex + x] | 0;
          drawTile(gid, px, py);
        }
      }
    }
  }

  // Gebäude- & Baustellen-Sprites
  function loadBuildingSprite(id){
    if (S.buildingSprites[id]) return;
    const img = new Image();
    const url = `assets/icons/buildings/${id}.png`;
    img.src = url;
    S.buildingSprites[id] = img;
  }

  // Baustellen-Grafiken: assets/buildings/building_place/baustelle_0/1/2.png
  function ensureBuildPlaceSprites(){
    if (Array.isArray(S.buildPlaceSprites) && S.buildPlaceSprites.length) return;

    S.buildPlaceSprites = [];
    const phases = [0,1,2];

    for (const idx of phases){
      const img = new Image();
      img.src = `assets/buildings/building_place/baustelle_${idx}.png`;
      S.buildPlaceSprites.push(img);
    }
  }

  function drawBuildings(){
    const ctx = S.ctx;
    const {tileW, tileH} = S;

    ctx.save();
    for (const b of S.buildings){
      const px = b.x * tileW;
      const py = b.y * tileH;
      const pw = (b.w || 1) * tileW;
      const ph = (b.h || 1) * tileH;

      // --- Bauphase ermitteln ----------------------------------------
      let stage = BUILD_PHASE.COMPLETE;
      if (typeof b.buildStage === 'number'){
        stage = b.buildStage;
      }

      let spr = null;

      if (stage < BUILD_PHASE.COMPLETE){
        // Baustellen-Grafiken
        ensureBuildPlaceSprites();
        const idx = Math.min(stage, S.buildPlaceSprites.length - 1);
        spr = S.buildPlaceSprites[idx] || null;
      } else {
        // Fertiges Gebäude
        spr = S.buildingSprites?.[b.id] || null;
      }

      if (spr && spr.complete){
        ctx.drawImage(spr, px, py, pw, ph);
      } else {
        // Fallback: halbtransparente Fläche
        ctx.fillStyle='rgba(255,200,140,0.25)';
        ctx.fillRect(px,py,pw,ph);
        ctx.strokeStyle='rgba(0,0,0,0.35)';
        ctx.lineWidth = 2 / Math.max(1, S.cam.zoom);
        ctx.strokeRect(px+1,py+1,pw-2,ph-2);
      }

      // Kleine Produktionsanzeige, wenn Lager > 0
      if (b.stock){
        const keys = Object.keys(b.stock).filter(k => b.stock[k] > 0);
        if (keys.length){
          ctx.save();
          ctx.setTransform(1,0,0,1,0,0);
          const ts = S.tileW;
          const sx = (b.x * ts) + 4;
          const sy = (b.y * ts) + 4;
          ctx.fillStyle='rgba(0,0,0,0.65)';
          ctx.fillRect(sx, sy, 14, 10);
          ctx.fillStyle='rgba(255,255,0,0.9)';
          ctx.font = '8px sans-serif';
          ctx.fillText(String(keys.length), sx+3, sy+8);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  /* ==========================================================================
   * 4a) BAUPHASEN-UPDATE (SCHRITT 1)
   * ======================================================================== */
  function updateConstruction(dt){
    if (!Array.isArray(S.buildings) || !S.buildings.length) return;

    for (const b of S.buildings){
      if (typeof b.buildStage !== 'number') continue;
      if (b.buildStage >= BUILD_PHASE.COMPLETE) continue;

      const phaseIndex = b.buildStage;
      const dur = BUILD_PHASE_DUR[phaseIndex] || 0;
      if (!dur){
        // Sicherung: wenn Dauer 0 ist → direkt fertig
        b.buildStage = BUILD_PHASE.COMPLETE;
        continue;
      }

      b._buildTimer = (b._buildTimer || 0) + dt;
      if (b._buildTimer >= dur){
        b._buildTimer = 0;
        b.buildStage++;

        if (b.buildStage >= BUILD_PHASE.COMPLETE){
          b.buildStage = BUILD_PHASE.COMPLETE;
          // Hook für später (Inspector, Sounds, etc.)
          try {
            window.dispatchEvent(new CustomEvent('cb:build:completed', {
              detail: { id: b.id, x: b.x, y: b.y, w: b.w, h: b.h }
            }));
          } catch {}
        }
      }
    }
  }

  /* ==========================================================================
   * 4a) PRODUKTIONS-UPDATE (SCHRITT 2)
   * ======================================================================== */
  function updateProduction(dt){
    if (!Array.isArray(S.buildings) || !S.buildings.length) return;

    // HQ-Position bei Bedarf nachziehen
    if (!S.hqPos){
      const hq = S.buildings.find(b => b.id === 'b.hq');
      if (hq) S.hqPos = { x:hq.x, y:hq.y };
    }

    for (const b of S.buildings){

      // Noch im Bau? → keine Produktion
      if (typeof b.buildStage === 'number' &&
          b.buildStage < BUILD_PHASE.COMPLETE){
        continue;
      }

      const rule = getProductionRuleFor(b.id);
      if (!rule) continue;

      b._prodTimer = (b._prodTimer || 0) + dt;
      const cycle = rule.cycleSec || 6;
      if (b._prodTimer < cycle) continue;
      b._prodTimer = 0;

      const resId   = rule.res;
      const amount  = rule.amount ?? 1;
      const maxStock= rule.maxStock ?? 4;
      if (!resId) continue;

      b.stock = b.stock || {};
      const cur = b.stock[resId] || 0;
      if (cur >= maxStock){
        // Lager voll → warten, bis Träger etwas abgeholt haben
        continue;
      }

      // 1) Produktion im Gebäude-Lager erhöhen
      b.stock[resId] = cur + amount;

      // 2) Träger-Job erzeugen
      const from = {
        x: (rule.pickup?.x ?? b.x),
        y: (rule.pickup?.y ?? b.y)
      };
      const to = S.hqPos || { x:b.x, y:b.y };

            const job = {
        type: 'carry',
        res : resId,
        from,
        to
      };

      // NEU: Job direkt ins zentrale Job-System schieben
      if (typeof Game?.addJob === 'function') {
        // Bevorzugt über Game → GameUnits
        Game.addJob(job);
      } else if (window.GameUnits?.addJob) {
        // Fallback: direkt auf GameUnits
        try {
          window.GameUnits.addJob(job);
        } catch (e) {
          WARN('GameUnits.addJob Fehler:', e?.message || e);
        }
      } else {
        // Letzte Absicherung: Log, damit wir es im Inspector sehen
        WARN('Kein Job-System für erzeugten Job gefunden', job);
      }

      // Debug-Event für Inspector / Diagnose
      try {
        window.dispatchEvent(new CustomEvent('cb:prod:created', {
          detail: { buildingId: b.id, res: resId, from, to }
        }));
      } catch (e) {
        // optional
      }
    }
  }

  /* ==========================================================================
   * 4b) FRAME-LOOP
   * ======================================================================== */
  function frame(){
    if (!S.running) return;

    try {
      const dt = 1/60;

      // 1) Bauphasen (Baustelle 0/1/2 → fertiges Gebäude)
      updateConstruction(dt);

      // 2) Produktion nur bei fertigen Gebäuden → erzeugt Jobs
      updateProduction(dt);

      // 3) Träger / Units ticken lassen
      window.dispatchEvent(new CustomEvent('cb:game:tick', {
        detail: { dt }
      }));

      // Map + Gebäude zeichnen
      clear();
      applyCamera();
      drawLayersCulled();
      drawBuildings();

      // Overlays
      if (window.OverlayHooks?.draw) {
        try {
          const ctx = S.ctx;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          const cam = window.GameCamera?.getState?.() || {
            x: S.cam.x,
            y: S.cam.y,
            zoom: S.cam.zoom
          };
          window.OverlayHooks.draw(ctx, cam);
        } catch (e) {
          WARN('OverlayHooks.draw Fehler:', e?.message || e);
        }
      }

      // Render-Event
      try {
        window.dispatchEvent(new CustomEvent('cb:game:render', {
          detail: {
            ctx: S.ctx,
            cam: {
              x: S.cam.x,
              y: S.cam.y,
              zoom: S.cam.zoom
            },
            tileW: S.tileW,
            tileH: S.tileH
          }
        }));
      } catch (e) {
        WARN('cb:game:render Fehler:', e?.message || e);
      }

    } catch (e) {
      // Ganz wichtig: Fehler loggen, aber den Loop NICHT stoppen
      ERR('frame() Fehler:', e?.message || e);
    }

    // Egal was passiert ist: Nächsten Frame wieder planen
    S.rafId = requestAnimationFrame(frame);
  }

  /* ==========================================================================
   * 5) PLATZIEREN (API intern)
   * ======================================================================== */

  function placeInternal(id, x, y, opt = {}) {
    const w = (opt.w | 0) || 3;
    const h = (opt.h | 0) || 3;

    if (!(Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0)) {
      return { ok: false, reason: 'invalid_xy' };
    }

    const bx = x | 0;
    const by = y | 0;

    const b = {
      id,
      x: bx,
      y: by,
      w,
      h,

      // Lager / Produktion
      stock      : {},
      _prodTimer : 0,

      // Bauphasen
      // 0 = Baustelle abgesteckt, 1 = Material, 2 = Gerüst, 3 = fertig
      buildStage  : BUILD_PHASE.SITE,
      _buildTimer : 0
    };

    S.buildings.push(b);

    if (!S.hqPos && id === 'b.hq'){
      S.hqPos = { x:bx, y:by };
    }

    loadBuildingSprite(id);
    ensureBuildPlaceSprites();

    window.dispatchEvent(
      new CustomEvent('cb:build:placed', {
        detail: { id, x: bx, y: by, w, h }
      })
    );

    window.dispatchEvent(
      new CustomEvent('req:carrier:createTask', {
        detail: {
          type: 'build',
          buildingId: id,
          x: bx,
          y: by,
          w,
          h
        }
      })
    );

    return { ok: true, id, x: bx, y: by, w, h };
  }

  /* ==========================================================================
   * 6) PUBLIC API (Game.*)
   * ======================================================================== */

  const Game = window.Game;

  Game.start = function(map, opt={}){
    try {
      ensureCanvas();

      S.tileset    = opt.tileset    || S.tileset || null;
      S.tilesetUrl = opt.tilesetUrl || S.tilesetUrl || null;
      if (S.tileset) INFO('Tileset bereit:', S.tilesetUrl || '(inline)'); else WARN('Tileset fehlt');

      S.map = map || null;
      try { normalizeMap(S.map); } catch(e){ WARN('Map-Normalisierung fehlgeschlagen:', e?.message||e); }

      S.didInitialFit = false;
      resizeToCssRect();

      if (!S.running){
        S.running = true;
        S.rafId = requestAnimationFrame(frame);
      }
    } catch (e) {
      ERR('Game.start Fehler:', e?.message||e);
    }
  };

  Game.placeBuilding = function(id,x,y,opt){
    const r=placeInternal(id,x,y,opt||{});
    if(!r.ok) WARN('placeBuilding fail',r);
    return r;
  };

  // SCHRITT 3 – Job-Queue
  //  Leitplanke: Game verwaltet die Jobs NICHT mehr selbst,
  //  sondern reicht sie 1:1 an das Units-Modul (GameUnits) weiter.
  //  CarrierRuntime holt sich Jobs immer über JobEngine.pop().
  JobEngine.add = function(job){
    if (!job) return;
    if (window.GameUnits?.addJob){
      try {
        window.GameUnits.addJob(job);
      } catch(e){
        WARN('JobEngine.add → GameUnits.addJob Fehler:', e?.message || e);
      }
    } else {
      WARN('Game.addJob → GameUnits.addJob fehlt – Job wird verworfen', job);
    }
  };

  Game.popJob = function(){
    if (window.GameUnits?.popJob){
      try {
        return window.GameUnits.popJob() || null;
      } catch(e){
        WARN('Game.popJob → GameUnits.popJob Fehler:', e?.message || e);
      }
    }
    return null;
  };

  // Hooks für carrier.js
  Game.takeFromBuilding = function(tx,ty,res){
    if (!res) return 0;
    const b = S.buildings.find(b => b.x===tx && b.y===ty && b.stock && b.stock[res] > 0);
    if (!b) return 0;
    b.stock[res] -= 1;
    if (b.stock[res] <= 0) delete b.stock[res];
    return 1;
  };

  Game.deliverToHQ = function(res,qty){
    if (!qty) return true;
    S.hqStock[res] = (S.hqStock[res] || 0) + qty;

    try {
      window.dispatchEvent(new CustomEvent('cb:res:change', {
        detail: { res, delta:qty, source:'hq' }
      }));
    } catch(e){
      // Fallback, falls HUD noch nicht da ist
    }
    return true;
  };

  // Debug
  window.Game.__dbg = {
    state: S,
    resize: ()=> resizeToCssRect(),
    fitToMap: (mode)=> fitToMap(mode||VIEW_PREF.fit),
    zoomAt,
    prodRules: HARDCODED_PRODUCTION
  };

  /* ==========================================================================
   * 7) EVENT-BRIDGES
   * ======================================================================== */

  addEventListener('cb:map:ready', (e)=>{
    const d=e.detail||{};
    Game.start(d.map, { tileset:d.tileset, tilesetUrl:d.tilesetUrl });
  });

  addEventListener('cb:game:start', ()=>{
    try{
      ensureCanvas();
      if(!S.running){ S.running=true; S.rafId=requestAnimationFrame(frame); }
    } catch(e){
      ERR('cb:game:start Fehler:', e?.message||e);
    }
  }, { once:true });

  function onCamera(e){
    const d=e?.detail||{};
    if (typeof d.x==='number')    S.cam.x = d.x;
    if (typeof d.y==='number')    S.cam.y = d.y;
    if (typeof d.zoom==='number') S.cam.zoom = clamp(d.zoom||1, 0.1, 6);
  }
  addEventListener('cb:camera-change', onCamera);
  addEventListener('cb:camera:update', onCamera);

  addEventListener('req:camera:zoomAt', (e)=>{
    const d=e.detail||{};
    if (typeof d.cx==='number' && typeof d.cy==='number' && typeof d.zoom==='number') {
      zoomAt(d.cx, d.cy, d.zoom);
    }
  });

  addEventListener('cb:build:place', (e)=>{
    const d=e.detail||{};
    if (d.__src !== 'input-v25.11.14'){ WARN('Ignoriere ungetaggte Platzierung', d); return; }
    const xi=d.x|0, yi=d.y|0, wi=(d.w|0)||3, hi=(d.h|0)||3;
    const res = Game.placeBuilding(d.buildingId || d.kind, xi, yi, { w:wi, h:hi });
    INFO('Platzierung (akzeptiert)', res);
  });

  OK('Modul geladen (v25.11.27-step1+2+3)');

})();
