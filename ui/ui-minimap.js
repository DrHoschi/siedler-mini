/* ============================================================================
 * Datei   : ui/ui-minimap.js
 * Projekt : Neue Siedler – Siedler-Mini
 * Version : v25.12.16-minimap-mvp1
 *
 * Zweck   :
 *   - Kleine Minimap als UI-Overlay (separates Canvas, NICHT im Game-Canvas).
 *   - Zeichnet:
 *       (1) Terrain-Base (aus GameMap._state.grid)  -> 1x pre-render auf Offscreen
 *       (2) Viewport-Rechteck (aus GameCamera + Game-Canvas Size)
 *       (3) Punkte: Units / Buildings / Ressourcen (wenn verfügbar)
 *   - Interaktion:
 *       Klick/Drag in der Minimap -> Kamera dorthin "zentrieren"
 *
 * Warum als UI-Canvas?
 *   - Bleibt sauber unabhängig von Zoom/Transform des Game-Canvas
 *   - Kann über Layout (body.is-playing) ein-/ausgeblendet werden
 *   - Debug-freundlich (einfach toggeln / repositionieren)
 *
 * Abhängigkeiten (defensiv, optional):
 *   - window.GameMap._state : { cols, rows, tileSize, grid }
 *   - window.GameCamera     : { getState(), setState({x,y,zoom}) }
 *   - window.Game           : { ctx } oder <canvas id="game">
 *   - window.GameUnits / window.MapResources / window.Game.buildings
 *
 * Integration:
 *   - index.html: Script nach ui/ui-layout.js laden (damit body.is-playing existiert)
 *   - CSS: ui/css/ui-hud-v5.css (Minimap-Styles)
 *
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * (Keine Imports in diesem Projekt → IIFE + window.* wie in den anderen UI-Modulen)
 * ========================================================================== */
(function(){
  'use strict';

  // =========================================================================
  // [Konstanten]
  // =========================================================================
  const VERSION = 'v25.12.16-minimap-mvp1';
  const TAG     = '[ui.minimap]';

  const LOG  = (...a)=> (window.CBLog?.ok    ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn)(TAG, ...a);
  const ERR  = (...a)=> (window.CBLog?.error ?? console.error)(TAG, ...a);

  // DOM-IDs (bewusst stabil, damit Inspector/Debug schnell drankommt)
  const ROOT_ID   = 'minimap-root';
  const CANVAS_ID = 'minimap-canvas';

  // Default-Optionen (können über window.UIMinimap.configure(...) überschrieben werden)
  const DEFAULTS = {
    cssSizePx : 220,   // sichtbare Größe (CSS px). Intern wird HiDPI gerendert.
    fps       : 8,     // Overlay-Updates pro Sekunde (Terrain-Base wird nicht ständig neu gerendert)
    dotR      : 2.0,   // Basis-Radius (wird * DPR skaliert)
    showGrid  : false, // optional: sehr dezentes Grid (Debug)
    // Farben (bewusst neutral, passend zu deinem rustikalen UI)
    colors    : {
      border   : 'rgba(0,0,0,0.45)',
      viewport : 'rgba(255,255,255,0.90)',
      unit     : 'rgba(255,220,120,0.95)',
      building : 'rgba(255,140, 80,0.95)',
      resource : 'rgba(160,220,255,0.95)',
      // Terrain-Typen:
      grass    : 'rgba( 50,150, 80,0.95)',
      dirt     : 'rgba(150,110, 70,0.95)',
      sand     : 'rgba(200,180,110,0.95)',
      rock     : 'rgba(135,135,135,0.95)',
      water    : 'rgba( 40,120,200,0.95)',
      unknown  : 'rgba( 90, 90, 90,0.95)',
    },

    // TileId → Terrain-Klasse
    // WICHTIG: Dein map-epoch1 nutzt aktuell IDs: 1,5,6,8,9.
    //          map.resources.js definiert Wasser: 8,9  (WATER_TILE_IDS). -> übernehmen wir.
    //          1 ist offensichtlich Standard-Boden (grass).
    //          6 interpretieren wir als "rock/stone-field".
    //          5 interpretieren wir als "dirt/sand/forest-floor".
    //
    // Du kannst das im laufenden Spiel anpassen:
    //   window.UIMinimap.configure({ tileClassById: { 5:'sand', 6:'rock' } })
    tileClassById : {
      1: 'grass',
      5: 'dirt',
      6: 'rock',
      8: 'water',
      9: 'water',
    }
  };

  // =========================================================================
  // [Hilfsfunktionen]
  // =========================================================================

  function dpr(){
    return Math.max(1, window.devicePixelRatio || 1);
  }

  function clamp(v, a, b){
    if (v < a) return a;
    if (v > b) return b;
    return v;
  }

  function $(sel){ return document.querySelector(sel); }

  function createEl(tag, cls){
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function getGameCanvas(){
    // Bevorzugt: #game
    const c = document.getElementById('game');
    if (c && c.getContext) return c;
    // Fallback: Game.ctx.canvas
    const gc = window.Game?.ctx?.canvas;
    if (gc && gc.getContext) return gc;
    return null;
  }

  function getMapState(){
    return window.GameMap?._state || null;
  }

  function isMapReady(map){
    return !!(map && map.grid && map.rows > 0 && map.cols > 0 && map.tileSize > 0);
  }

  function getCameraState(){
    // GameCamera bevorzugt (hat getState)
    if (window.GameCamera?.getState) return window.GameCamera.getState();
    // Fallback: window.GameCamera als simples Objekt
    const c = window.GameCamera;
    if (c && typeof c === 'object') return { x: c.x||0, y: c.y||0, zoom: c.zoom||1 };
    return { x: 0, y: 0, zoom: 1 };
  }

  function setCameraState(next){
    if (window.GameCamera?.setState){
      window.GameCamera.setState(next);
      return true;
    }
    // Minimaler Fallback: direkt schreiben (nicht ideal, aber besser als nichts)
    if (window.GameCamera && typeof window.GameCamera === 'object'){
      if (Number.isFinite(next.x)) window.GameCamera.x = next.x;
      if (Number.isFinite(next.y)) window.GameCamera.y = next.y;
      if (Number.isFinite(next.zoom)) window.GameCamera.zoom = next.zoom;
      return true;
    }
    return false;
  }

  function getWorldSizePx(map){
    return {
      w: (map.cols|0) * (map.tileSize|0),
      h: (map.rows|0) * (map.tileSize|0)
    };
  }

  // Units / Buildings / Resources – defensiv einsammeln
  function collectUnits(){
    // 1) Game.units (direkt)
    if (Array.isArray(window.Game?.units)) return window.Game.units;

    // 2) GameUnits (neues Modul)
    if (window.GameUnits && typeof window.GameUnits.getUnits === 'function'){
      const u = window.GameUnits.getUnits();
      if (Array.isArray(u)) return u;
    }

    // 3) Fallbacks (ältere Stände)
    if (Array.isArray(window.__units)) return window.__units;

    return [];
  }

  function collectBuildings(){
    if (Array.isArray(window.Game?.buildings)) return window.Game.buildings;
    return [];
  }

  function collectResources(){
    // MapResources.state enthält: nodes/trees/stones/fish (tile coords)
    if (window.MapResources?.state){
      const s = window.MapResources.state;
      if (Array.isArray(s.nodes) && s.nodes.length) return s.nodes;
      // fallback: concat
      const out = [];
      if (Array.isArray(s.trees))  out.push(...s.trees);
      if (Array.isArray(s.stones)) out.push(...s.stones);
      if (Array.isArray(s.fish))   out.push(...s.fish);
      return out;
    }
    return [];
  }

  // =========================================================================
  // [Klasse MiniMap]
  // =========================================================================
  class MiniMap {
    constructor(){
      this.version = VERSION;

      // Konfig (kopieren, damit configure() sauber überschreiben kann)
      this.cfg = JSON.parse(JSON.stringify(DEFAULTS));

      // DOM
      this.root   = null;
      this.canvas = null;
      this.ctx    = null;

      // Offscreen: Terrain-Base
      this.baseCanvas = null;
      this.baseCtx    = null;

      // Render-State
      this._timer = 0;
      this._drag  = false;

      // interne Cache-Werte
      this._lastMapSig = '';
    }

    // -----------------------------------------------------------------------
    // Konfiguration (teilweise überschreiben)
    // -----------------------------------------------------------------------
    configure(partial){
      if (!partial || typeof partial !== 'object') return;

      // simple merge (1 Ebene tief – reicht für unsere Defaults)
      for (const k of Object.keys(partial)){
        if (k === 'colors' && partial.colors && typeof partial.colors === 'object'){
          Object.assign(this.cfg.colors, partial.colors);
        } else if (k === 'tileClassById' && partial.tileClassById && typeof partial.tileClassById === 'object'){
          Object.assign(this.cfg.tileClassById, partial.tileClassById);
        } else {
          this.cfg[k] = partial[k];
        }
      }

      // Canvas neu anpassen (wenn schon init)
      if (this.canvas) this._resizeCanvases();
      this.rebuildBase(true);
    }

    // -----------------------------------------------------------------------
    // Init / Destroy
    // -----------------------------------------------------------------------
    init(){
      if (this.root){
        LOG('init(): bereits aktiv – skip');
        return;
      }

      // Root + Canvas
      this.root = document.getElementById(ROOT_ID);
      if (!this.root){
        this.root = createEl('div', 'minimap');
        this.root.id = ROOT_ID;
        document.body.appendChild(this.root);
      }

      this.canvas = document.getElementById(CANVAS_ID);
      if (!this.canvas){
        this.canvas = createEl('canvas', 'minimap__canvas');
        this.canvas.id = CANVAS_ID;
        this.root.appendChild(this.canvas);
      }

      this.ctx = this.canvas.getContext('2d', { alpha:true });

      // Offscreen Base
      this.baseCanvas = document.createElement('canvas');
      this.baseCtx = this.baseCanvas.getContext('2d', { alpha:true });

      // Größe / HiDPI
      this._resizeCanvases();

      // Interaktion
      this._bindPointer();

      // Base einmalig versuchen (wenn Map schon bereit)
      this.rebuildBase(true);

      // Timer für Overlay-Render (throttled)
      this._startTimer();

      // Debug-API
      LOG('bereit', this.version);
      window.dispatchEvent(new CustomEvent('cb:minimap:ready', { detail:{ ok:true, version:this.version } }));
    }

    destroy(){
      this._stopTimer();
      if (this.canvas){
        this.canvas.onpointerdown = null;
        this.canvas.onpointermove = null;
        this.canvas.onpointerup   = null;
        this.canvas.onpointercancel = null;
      }
      if (this.root){
        try { this.root.remove(); } catch {}
      }
      this.root = null;
      this.canvas = null;
      this.ctx = null;
      this.baseCanvas = null;
      this.baseCtx = null;
      this._drag = false;
      this._lastMapSig = '';
      LOG('destroy() – entfernt');
    }

    // -----------------------------------------------------------------------
    // Resize
    // -----------------------------------------------------------------------
    _resizeCanvases(){
      const css = Math.max(120, this.cfg.cssSizePx|0); // minimale Nutzbarkeit
      const r = dpr();

      // sichtbare Größe
      this.canvas.style.width  = css + 'px';
      this.canvas.style.height = css + 'px';

      // interne Buffergröße
      const W = Math.floor(css * r);
      const H = Math.floor(css * r);
      this.canvas.width  = W;
      this.canvas.height = H;

      // Base identisch groß
      this.baseCanvas.width  = W;
      this.baseCanvas.height = H;
    }

    // -----------------------------------------------------------------------
    // Pointer -> Kamera zentrieren
    // -----------------------------------------------------------------------
    _bindPointer(){
      const c = this.canvas;

      const getLocal = (e)=>{
        const rect = c.getBoundingClientRect();
        const r = dpr();
        return {
          x: (e.clientX - rect.left) * r,
          y: (e.clientY - rect.top)  * r
        };
      };

      const panTo = (e)=>{
        const map = getMapState();
        if (!isMapReady(map)) return;

        const p = getLocal(e);
        const { wx, wy } = this._miniToWorld(map, p.x, p.y);

        // Viewport-Size in World-Pixeln bestimmen
        const cam = getCameraState();
        const zoom = cam.zoom || 1;

        const gameCanvas = getGameCanvas();
        const viewW = gameCanvas ? (gameCanvas.width  / zoom) : (10 * map.tileSize);
        const viewH = gameCanvas ? (gameCanvas.height / zoom) : (10 * map.tileSize);

        // neue Kamera so setzen, dass (wx,wy) in der Mitte liegt
        const world = getWorldSizePx(map);
        const nx = clamp(wx - viewW/2, 0, Math.max(0, world.w - viewW));
        const ny = clamp(wy - viewH/2, 0, Math.max(0, world.h - viewH));

        const ok = setCameraState({ x:nx, y:ny });
        if (!ok) WARN('Kamera konnte nicht gesetzt werden (GameCamera fehlt?)');
      };

      c.onpointerdown = (e)=>{
        this._drag = true;
        try { c.setPointerCapture(e.pointerId); } catch {}
        panTo(e);
      };
      c.onpointermove = (e)=>{
        if (!this._drag) return;
        panTo(e);
      };
      c.onpointerup = (e)=>{
        this._drag = false;
        try { c.releasePointerCapture(e.pointerId); } catch {}
      };
      c.onpointercancel = ()=>{
        this._drag = false;
      };
    }

    // -----------------------------------------------------------------------
    // World <-> Minimap Mapping
    // -----------------------------------------------------------------------
    _worldToMini(map, wx, wy){
      const world = getWorldSizePx(map);
      const W = this.canvas.width;
      const H = this.canvas.height;
      const x = (wx / world.w) * W;
      const y = (wy / world.h) * H;
      return { x, y };
    }

    _miniToWorld(map, mx, my){
      const world = getWorldSizePx(map);
      const W = this.canvas.width;
      const H = this.canvas.height;
      const wx = (mx / W) * world.w;
      const wy = (my / H) * world.h;
      return { wx, wy };
    }

    // -----------------------------------------------------------------------
    // Terrain-Base neu rendern (wenn Map sich geändert hat)
    // -----------------------------------------------------------------------
    rebuildBase(force){
      const map = getMapState();
      if (!isMapReady(map)){
        // Map ist noch nicht geladen – wir lassen Base leer und rendern später erneut
        if (force) this._clearBase();
        return;
      }

      const sig = `${map.cols}x${map.rows}@${map.tileSize}:${map.grid?.length||0}`;
      if (!force && sig === this._lastMapSig) return;
      this._lastMapSig = sig;

      this._renderBase(map);
    }

    _clearBase(){
      if (!this.baseCtx) return;
      this.baseCtx.setTransform(1,0,0,1,0,0);
      this.baseCtx.clearRect(0,0,this.baseCanvas.width,this.baseCanvas.height);
    }

    _tileClass(tileId){
      const cls = this.cfg.tileClassById[tileId|0];
      if (cls) return cls;

      // Fallback: "unbekannt" -> aber für neue Maps immer noch visuell unterscheidbar:
      // wir staffeln anhand tileId ein wenig (kein Regenbogen, eher Graustufen).
      return 'unknown';
    }

    _tileColor(tileClass){
      const c = this.cfg.colors;
      if (tileClass === 'grass') return c.grass;
      if (tileClass === 'dirt')  return c.dirt;
      if (tileClass === 'sand')  return c.sand;
      if (tileClass === 'rock')  return c.rock;
      if (tileClass === 'water') return c.water;
      return c.unknown;
    }

    _renderBase(map){
      const ctx = this.baseCtx;
      const W = this.baseCanvas.width;
      const H = this.baseCanvas.height;

      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,W,H);

      const cols = map.cols|0;
      const rows = map.rows|0;
      const grid = map.grid;

      // Pixel pro Tile in der Minimap
      const pxX = W / cols;
      const pxY = H / rows;

      // Terrain: pro Tile ein kleines Rect
      for (let y=0; y<rows; y++){
        const row = grid[y];
        for (let x=0; x<cols; x++){
          const id  = row ? (row[x]|0) : 0;
          const cls = this._tileClass(id);
          ctx.fillStyle = this._tileColor(cls);

          // bewusst "ceil" damit keine Lücken entstehen
          ctx.fillRect(
            Math.floor(x * pxX),
            Math.floor(y * pxY),
            Math.ceil(pxX),
            Math.ceil(pxY)
          );
        }
      }

      // optional: sehr dezentes Grid (nur Debug)
      if (this.cfg.showGrid){
        ctx.strokeStyle = 'rgba(0,0,0,0.10)';
        ctx.lineWidth = Math.max(1, 1 * dpr());
        for (let x=0; x<=cols; x++){
          const xx = x * pxX;
          ctx.beginPath();
          ctx.moveTo(xx,0);
          ctx.lineTo(xx,H);
          ctx.stroke();
        }
        for (let y=0; y<=rows; y++){
          const yy = y * pxY;
          ctx.beginPath();
          ctx.moveTo(0,yy);
          ctx.lineTo(W,yy);
          ctx.stroke();
        }
      }

      // Rahmen
      ctx.strokeStyle = this.cfg.colors.border;
      ctx.lineWidth = Math.max(1, 2 * dpr());
      ctx.strokeRect(0,0,W,H);

      LOG('Base gerendert', { cols, rows, tileSize: map.tileSize });
    }

    // -----------------------------------------------------------------------
    // Overlay rendern (Viewport + Punkte)
    // -----------------------------------------------------------------------
    _drawDot(map, tx, ty, rPx, fill){
      // Eingaben sind tile coords (wie bei Units/Buildings)
      const ts = map.tileSize|0;
      const wx = tx * ts;
      const wy = ty * ts;

      const p = this._worldToMini(map, wx, wy);
      const ctx = this.ctx;

      ctx.beginPath();
      ctx.arc(p.x, p.y, rPx, 0, Math.PI*2);
      ctx.fillStyle = fill;
      ctx.fill();
    }

    _renderOverlay(){
      const ctx = this.ctx;
      const W = this.canvas.width;
      const H = this.canvas.height;

      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,W,H);

      // Map bereit? Wenn nein: nur "leer" lassen.
      const map = getMapState();
      if (!isMapReady(map)){
        // minimaler Rahmen (damit man im UI sieht, dass Minimap existiert)
        ctx.strokeStyle = this.cfg.colors.border;
        ctx.lineWidth = Math.max(1, 2 * dpr());
        ctx.strokeRect(0,0,W,H);
        return;
      }

      // 1) Base
      ctx.drawImage(this.baseCanvas, 0, 0);

      const r = dpr();
      const dotR = Math.max(1, this.cfg.dotR * r);

      // 2) Ressourcen (Trees/Stones/Fish etc.)
      const res = collectResources();
      for (let i=0; i<res.length; i++){
        const n = res[i];
        const tx = Number.isFinite(n.x) ? n.x : n.tx;
        const ty = Number.isFinite(n.y) ? n.y : n.ty;
        if (!Number.isFinite(tx) || !Number.isFinite(ty)) continue;
        this._drawDot(map, tx, ty, dotR, this.cfg.colors.resource);
      }

      // 3) Gebäude (tile coords)
      const buildings = collectBuildings();
      for (let i=0; i<buildings.length; i++){
        const b = buildings[i];
        if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) continue;
        // Gebäudepunkt: Mitte
        const cx = (b.x + (b.w||1)/2);
        const cy = (b.y + (b.h||1)/2);
        this._drawDot(map, cx, cy, dotR*1.2, this.cfg.colors.building);
      }

      // 4) Units (tile coords float)
      const units = collectUnits();
      for (let i=0; i<units.length; i++){
        const u = units[i];
        const tx = Number.isFinite(u.x) ? u.x : u.tx;
        const ty = Number.isFinite(u.y) ? u.y : u.ty;
        if (!Number.isFinite(tx) || !Number.isFinite(ty)) continue;
        this._drawDot(map, tx, ty, dotR, this.cfg.colors.unit);
      }

      // 5) Viewport-Rechteck
      const cam = getCameraState();
      const zoom = cam.zoom || 1;
      const camX = cam.x || 0;
      const camY = cam.y || 0;

      const gameCanvas = getGameCanvas();
      const viewW = gameCanvas ? (gameCanvas.width  / zoom) : (10 * map.tileSize);
      const viewH = gameCanvas ? (gameCanvas.height / zoom) : (10 * map.tileSize);

      const p1 = this._worldToMini(map, camX, camY);
      const p2 = this._worldToMini(map, camX + viewW, camY + viewH);

      ctx.strokeStyle = this.cfg.colors.viewport;
      ctx.lineWidth = Math.max(1, 2 * dpr());
      ctx.strokeRect(p1.x, p1.y, (p2.x - p1.x), (p2.y - p1.y));
    }

    // -----------------------------------------------------------------------
    // Loop (Timer)
    // -----------------------------------------------------------------------
    _startTimer(){
      this._stopTimer();

      // zusätzlich: beim Resize Canvas neu setzen
      window.addEventListener('resize', this._onResize, { passive:true });

      const ms = Math.max(60, Math.floor(1000 / Math.max(1, this.cfg.fps|0)));
      this._timer = window.setInterval(()=>{
        try{
          // Base nur neu bauen, wenn sich Map-Signatur ändert (oder initial)
          this.rebuildBase(false);
          this._renderOverlay();
        }catch(e){
          ERR('render Fehler:', e);
        }
      }, ms);
    }

    _stopTimer(){
      try { window.clearInterval(this._timer); } catch {}
      this._timer = 0;
      window.removeEventListener('resize', this._onResize);
    }

    _onResize = ()=>{
      // Canvas neu skalieren und Base neu rendern
      try{
        if (!this.canvas) return;
        this._resizeCanvases();
        this.rebuildBase(true);
        this._renderOverlay();
      }catch(e){
        ERR('resize Fehler:', e);
      }
    }
  }

  // =========================================================================
  // [Hauptlogik] – Singleton / public API
  // =========================================================================
  if (window.UIMinimap && window.UIMinimap.__isSingleton){
    // Mehrfach-Laden vermeiden (z. B. wenn der User alte Scripts doppelt drin hat)
    WARN('Singleton bereits vorhanden – skip');
    return;
  }

  const mm = new MiniMap();

  // Lifecycle – analog zu HUD:
  // - Bei cb:game:start initialisieren (Map+Camera werden dann erst aufgebaut)
  // - Zusätzlich bei cb:registry:ready (falls man Minimap schon vorher sehen will)
  function autoInit(){
    try{
      // Nur initialisieren, wenn DOM vorhanden ist
      if (!document.body) return;
      mm.init();
    }catch(e){
      ERR('autoInit Fehler:', e);
    }
  }

  window.addEventListener('cb:game:start', autoInit, { passive:true });
  window.addEventListener('cb:registry:ready', autoInit, { passive:true });

  // API global (für Inspector/Debug)
  window.UIMinimap = {
    __isSingleton: true,
    version: VERSION,

    init: ()=> mm.init(),
    destroy: ()=> mm.destroy(),

    // für dich: schnell tile-klassifizierung anpassen, ohne Code zu ändern
    configure: (partial)=> mm.configure(partial),

    // Debug: Base neu rendern
    rebuild: ()=> mm.rebuildBase(true),

    // Debug: einmal Overlay zeichnen (ohne Timer)
    renderOnce: ()=> { mm.rebuildBase(false); mm._renderOverlay(); },

    // raw access (nur Debug)
    _inst: mm
  };

  LOG('geladen', VERSION);

})();
