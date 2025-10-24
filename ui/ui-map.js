/* ============================================================================
 * Datei   : ui/ui-map.js
 * Projekt : Neue Siedler
 * Zweck   : Map-Canvas initialisieren (quadratischer Viewport) + Platzier-Input
 *
 * Lauscht : cb:game:start, req:map:init, cb:place:preview, cb:place:done,
 *           req:place:start
 * Sendet  : req:place:cursor, req:place:confirm
 *
 * Canvas  : bevorzugt <canvas id="game">, alternativ (alt) <canvas id="game-canvas">
 * Bridge  : 'data-map' (neu) ODER 'data-map-url' (alt) – beides wird akzeptiert.
 *
 * Hinweis : Dieses File zeichnet aktuell nur den dunklen Hintergrund + Grid +
 *           1x1-Preview-Kachel. Das echte Kachel-Rendering macht (wie gehabt)
 *           core/map-runtime.js, das hier nur angestoßen wird.
 * ============================================================================ */
(function(){
  'use strict';

  /* ---------- Logging (robust) -------------------------------------------- */
  const log = (...a)=> (window.CBLog?.info || console.info)('[map]', ...a);
  const warn = (...a)=> (window.CBLog?.warn || console.warn)('[map]', ...a);

  /* ---------- Canvas finden (Bridge: neu/alt) ------------------------------ */
  // Neu:  <canvas id="game" data-map="data/maps/map-mini.json">
  // Alt:  <canvas id="game-canvas" data-map-url="data/maps/map-mini.json">
  const $c = document.getElementById('game') || document.getElementById('game-canvas');
  if (!$c){ warn('Kein Canvas gefunden (#game oder #game-canvas)'); return; }

  // Map-URL nur an MapRuntime weiterreichen (hier selbst nicht genutzt)
  const mapUrl = $c.dataset.map || $c.dataset.mapUrl || 'data/maps/map-mini.json';

  /* ---------- 2D-Context --------------------------------------------------- */
  const ctx = $c.getContext('2d');

  /* ---------- Quadratischer Viewport --------------------------------------- */
  // Passt das Canvas auf die kürzere Fensterkante an. Das “freigeräumte”
  // Rechteck links/unten/rechts übernimmt das CSS-Layout (HUD/Dock).
  function resizeSquare(){
    const W = document.documentElement.clientWidth;
    const H = document.documentElement.clientHeight;
    const S = Math.min(W, H);   // Quadrat-Kante in CSS-Pixeln

    // Gerätepixel (intern) – für scharfe Linien
    $c.width  = S;
    $c.height = S;

    // CSS-Pixel (sichtbar)
    $c.style.width  = S + 'px';
    $c.style.height = S + 'px';

    draw(); // nach Resize neu zeichnen
  }
  addEventListener('resize', resizeSquare);

  /* ---------- Platzier-Preview-Status ------------------------------------- */
  const tile = (window.Game?.tileSize|0) || 32; // Kachelgröße (Game liefert 32)
  let preview = { tx:-1, ty:-1, valid:false };  // “-1” = unsichtbar

  // Update vom Core (game.js): wo und ob gültig
  addEventListener('cb:place:preview', (ev)=>{
    const { tx, ty, valid } = ev.detail || {};
    if (typeof tx === 'number') preview.tx = tx;
    if (typeof ty === 'number') preview.ty = ty;
    preview.valid = !!valid;
    draw();
  });

  /* ---------- Minimal-Renderer (Grid + Ghost) ------------------------------ */
  function draw(){
    const w = $c.width, h = $c.height;
    // Hintergrund
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#181b20';
    ctx.fillRect(0,0,w,h);

    // dezentes Grid (Debug/Fallback)
    ctx.strokeStyle = '#242933';
    ctx.lineWidth = 1;
    for (let x=0; x<=w; x+=tile) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for (let y=0; y<=h; y+=tile) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

    // 1x1 Preview-Kachel (der Core prüft Validität)
    if (preview.tx>=0 && preview.ty>=0){
      const x = preview.tx * tile;
      const y = preview.ty * tile;
      ctx.fillStyle   = preview.valid ? 'rgba(60,200,120,0.35)' : 'rgba(200,60,60,0.35)';
      ctx.strokeStyle = preview.valid ? 'rgba(60,200,120,0.85)' : 'rgba(200,60,60,0.85)';
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, tile, tile);
      ctx.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
    }
  }

  /* ---------- Input → Platzier-Flow ---------------------------------------- */
  // Dieser Teil übersetzt Maus/Touch auf Kachel-Koordinaten und feuert
  // die req:* Events (Cursor/Confirm). “placing” ist nur für Lokalzustand.
  let placing   = false;        // sind wir gerade im Platzieren?
  let currentId = null;         // ID aus req:place:start (nur Info/Weitergabe)

  // Vom Build-Menü: “ich will b.xyz platzieren”
  addEventListener('req:place:start', (ev)=>{
    currentId = ev.detail?.buildingId || null;
    placing   = !!currentId;
  });

  // Hilfsfunktion: Client-Koordinaten → Tile relativ zum Canvas
  function clientToTile(ev){
    const rect = $c.getBoundingClientRect();
    const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
    const cy = (ev.touches ? ev.touches[0].clientY : ev.clientY) - rect.top;
    const tx = Math.max(0, Math.floor(cx / tile));
    const ty = Math.max(0, Math.floor(cy / tile));
    return { tx, ty };
  }

  // Cursor verschieben (Core prüft Validität und antwortet mit cb:place:preview)
  function sendCursor(ev){
    if (!placing || !currentId) return;
    const { tx, ty } = clientToTile(ev);
    dispatchEvent(new CustomEvent('req:place:cursor', { detail:{ tx, ty, id: currentId } }));
  }

  // Bestätigen (Core setzt Gebäude bei Erfolg, cb:place:done folgt)
  function sendConfirm(ev){
    if (!placing || !currentId) return;
    ev.preventDefault();
    const { tx, ty } = clientToTile(ev);
    dispatchEvent(new CustomEvent('req:place:confirm', { detail:{ tx, ty } }));
  }

  // Maus
  $c.addEventListener('mousemove', sendCursor, { passive:true });
  $c.addEventListener('click',     sendConfirm);
  // Touch
  $c.addEventListener('touchmove', sendCursor,  { passive:true });
  $c.addEventListener('touchend',  sendConfirm, { passive:false });

  // Platzieren beendet → Preview ausblenden & neu zeichnen
  addEventListener('cb:place:done', ()=>{
    placing = false;
    currentId = null;
    preview.tx = preview.ty = -1;
    preview.valid = false;
    draw();
  });

  /* ---------- MapRuntime anstoßen (Bridge) --------------------------------- */
  // Wenn core/map-runtime.js vorhanden ist, darf es initialisiert werden.
  // Reihenfolge in index.demo.html:
  //   core/map-runtime.js  →  ui/ui-map.js  →  core/boot.js
  function initMapRuntimeIfPresent(){
    try {
      if (window.MapRuntime?.init){
        MapRuntime.init($c, mapUrl);  // echte Map laden/zeichnen (statt Grid)
        log('MapRuntime.init →', mapUrl);
      } else {
        // kein Fehler – wir bleiben beim Grid (Fallback)
        log('MapRuntime nicht gefunden – Grid-Fallback bleibt aktiv');
      }
    } catch(e){
      warn('MapRuntime.init Fehler:', e?.message || e);
    }
  }

  /* ---------- Boot-Wiring --------------------------------------------------- */
  // Boot triggert den Map-Start:
  addEventListener('req:map:init', ()=>{ resizeSquare(); draw(); initMapRuntimeIfPresent(); }, { once:true });
  // Falls Boot später kommt, aber Spielstart schon da ist:
  addEventListener('cb:game:start', ()=>{ resizeSquare(); draw(); initMapRuntimeIfPresent(); }, { once:true });

  // Minimal-Absicherung: bei DOM-ready schon mal korrekt dimensionieren
  if (document.readyState === 'loading'){
    addEventListener('DOMContentLoaded', resizeSquare, { once:true });
  } else {
    resizeSquare();
  }

  log('bereit (ui/ui-map.js Bridge aktiv)');
})();
