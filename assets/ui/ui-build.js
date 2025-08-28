/* assets/ui/ui-build.js — v16.1.13
   ----------------------------------------------------------
   Aufgaben:
   - Baut ein simples Bau-Menü (Tool-Picker) auf
   - Aktiviert sich nach Spielstart (Event: 'cb:game-started')
   - Tool setzen & Platzieren per Tap/Klick auf Canvas
   - Robuste Fallbacks + Logging in den Inspector
   ---------------------------------------------------------- */

(function(){
  const VERSION = '16.1.13';

  // ---------- kleine Log-Helfer ----------
  function logOK(msg){ window.Inspector?.log?.('log', `✅ (ok) ${msg}`) || console.log(msg); }
  function logWARN(msg){ window.Inspector?.log?.('warn', `⚠️ (warn) ${msg}`) || console.warn(msg); }
  function logERR(msg){ window.Inspector?.log?.('err', `❌ (err) ${msg}`) || console.error(msg); }

  // ---------- State ----------
  const state = {
    active: false,
    tool: null,
    tileSize: 64,
    canvas: null,
    placeHandler: null,
  };

  // ---------- Tools (einfach & erweiterbar) ----------
  // label = Button-Text (neutraler Hintergrund, nur Icon/Text sichtbar)
  const TOOLS = [
    { id: 'road',    label: 'Straße' },
    { id: 'path',    label: 'Pfad'   },
    { id: 'house',   label: 'Haus'   },
    { id: 'factory', label: 'Fabrik' },
    // Lumberjack kommt später mit Icon/Sprite – Platzhalter hier:
    { id: 'lumberjack', label: 'Lumber' },
  ];

  // ---------- UI Wurzel anlegen ----------
  let host = document.getElementById('cb-build-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'cb-build-host';
    document.body.appendChild(host);
  }

  host.style.position = 'fixed';
  host.style.left = '12px';
  host.style.bottom = '80px'; // Platz für HUD-Button
  host.style.zIndex = 9000;
  host.style.display = 'none'; // sichtbar, wenn Menü geöffnet
  host.style.background = 'rgba(8,10,12,.9)';
  host.style.backdropFilter = 'blur(2px)';
  host.style.padding = '10px';
  host.style.borderRadius = '10px';
  host.style.boxShadow = '0 10px 24px rgba(0,0,0,.35)';

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(3, 72px)';
  grid.style.gap = '8px';

  host.appendChild(grid);

  // Button-Erstellung
  function makeToolButton(tool) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = tool.label;
    btn.title = tool.id;
    Object.assign(btn.style, {
      width:'72px', height:'72px',
      borderRadius:'10px',
      border:'1px solid #2a2f36',
      background:'#fff', color:'#111',   // weißer Hintergrund → wirkt “nur Icon/Text”
      fontSize:'13px',
    });
    btn.addEventListener('click', ()=>{
      setTool(tool.id);
      // Menü automatisch schließen (wie besprochen)
      host.style.display = 'none';
    });
    return btn;
  }

  // Tool-Buttons aufbauen
  for (const t of TOOLS) grid.appendChild(makeToolButton(t));

  // ---------- Öffnen/Schließen vom übergeordneten Button ----------
  // index.html feuert 'cb:build-toggle' wenn 🏗️ gedrückt wird
  window.addEventListener('cb:build-toggle', ()=>{
    host.style.display = (host.style.display === 'none') ? 'block' : 'none';
    if (host.style.display === 'block') logOK(`Bau-Menü geöffnet (ui-build.js v${VERSION})`);
  });

  // ---------- Tool setzen ----------
  function setTool(id){
    state.tool = id;
    logOK(`Tool gesetzt: ${id}`);
    window.dispatchEvent(new CustomEvent('cb:tool-changed',{detail:{tool:id}}));
  }

  // ---------- Platzieren (Canvas-Klick/Tap) ----------
  function toTileXY(evt){
    const rect = state.canvas.getBoundingClientRect();
    const px = (evt.clientX ?? (evt.touches?.[0]?.clientX||0)) - rect.left;
    const py = (evt.clientY ?? (evt.touches?.[0]?.clientY||0)) - rect.top;
    const ts = state.tileSize;
    return { tx: Math.floor(px/ts), ty: Math.floor(py/ts) };
  }

  function placeAt(x,y){
    // 1) bevorzugt Engine-Hook (wenn vorhanden)
    if (window.GameUI?.place) {
      try {
        window.GameUI.place({tool: state.tool, x, y});
        logOK(`Platziert: ${state.tool} @ (${x},${y})`);
        return;
      } catch(e){ logWARN(`GameUI.place fehlgeschlagen: ${e?.message||e}`); }
    }
    if (window.Game?.place) {
      try {
        window.Game.place({tool: state.tool, x, y});
        logOK(`Platziert: ${state.tool} @ (${x},${y})`);
        return;
      } catch(e){ logWARN(`Game.place fehlgeschlagen: ${e?.message||e}`); }
    }
    // 2) Fallback: nur loggen (entwicklerisch ausreichend zum Testen)
    logOK(`(Fallback) Platziert: ${state.tool} @ (${x},${y})`);
  }

  function onCanvasPointer(evt){
    if (!state.active) return;
    if (!state.tool)  { logWARN('Kein Tool ausgewählt'); return; }
    const {tx,ty} = toTileXY(evt);
    placeAt(tx,ty);
    evt.preventDefault();
  }

  // ---------- Aktivierung nach Game-Start ----------
  function activate(){
    if (state.active) return;
    state.active = true;

    // Tilegröße aus Engine, sonst 64
    try {
      state.tileSize = (window.Game?.getTileSize?.() || 64);
    } catch(_) {}

    // Canvas finden
    state.canvas = document.getElementById('gameCanvas') || document.querySelector('canvas');
    if (!state.canvas) {
      logWARN('Kein Canvas gefunden – Platzieren deaktiviert');
    } else {
      // Pointer-Handling
      state.placeHandler = (e)=>onCanvasPointer(e);
      state.canvas.addEventListener('click', state.placeHandler, {passive:false});
      state.canvas.addEventListener('touchstart', state.placeHandler, {passive:false});
    }

    logOK(`Bau-Menü bereit (ui-build.js v${VERSION})`);
  }

  // Engine meldet Start → aktivieren & default-Tool setzen
  window.addEventListener('cb:game-started', ()=>{
    activate();
    if (!state.tool) setTool('path');
  });

  // Falls Engine sofort ready ist (Sicherheitsgurt)
  if (document.readyState !== 'loading') {
    // nichts tun – wir warten bewusst auf cb:game-started
  }

  // Aufräumen (optional, z.B. bei Reload im Inspector)
  window.addEventListener('beforeunload', ()=>{
    if (state.canvas && state.placeHandler) {
      state.canvas.removeEventListener('click', state.placeHandler);
      state.canvas.removeEventListener('touchstart', state.placeHandler);
    }
  });

  // Exporte für Engine (optional)
  window.GameUI = window.GameUI || {};
  window.GameUI.openBuildMenu = ()=>{ host.style.display='block'; };
  window.GameUI.closeBuildMenu = ()=>{ host.style.display='none'; };
  window.GameUI.setTool = setTool;

})();
