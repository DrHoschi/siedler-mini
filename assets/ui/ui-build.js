/* ===========================================================
   ui-build.js — v16.1.13
   Zweck: Leichtgewichtiges Bau-Menü (Panel), steuerbar über GameUI.
   Sichtbarkeit:
   - Panel wird von GameUI.openBuildMenu()/closeBuildMenu() kontrolliert.
   - Build-Button in index.html öffnet dieses Panel.
   Logging:
   - UILog.* wird genutzt, zusätzlich inspector Events.
   =========================================================== */

(function(){
  const VERSION = 'v16.1.13';

  // --- DOM bauen (einmalig) ---
  let $panel, $backdrop, mounted = false;

  function logOk(msg){ window.UILog?.ok?.(`[ui-build ${VERSION}] ${msg}`); }
  function logWarn(msg){ window.UILog?.warn?.(`[ui-build ${VERSION}] ${msg}`); }
  function logErr(msg){ window.UILog?.err?.(`[ui-build ${VERSION}] ${msg}`); }

  function mount() {
    if (mounted) return;

    // halbtransparenter Backdrop (klick schließt)
    $backdrop = document.createElement('div');
    $backdrop.style.position = 'fixed';
    $backdrop.style.inset = '0';
    $backdrop.style.background = 'rgba(0,0,0,.35)';
    $backdrop.style.zIndex = '9500';
    $backdrop.style.display = 'none';
    $backdrop.addEventListener('click', close);

    // Panel links unten, über dem Build-Button
    $panel = document.createElement('div');
    $panel.id = 'buildPanel';
    $panel.style.position = 'fixed';
    $panel.style.left = '14px';
    $panel.style.bottom = '80px';
    $panel.style.width = 'min(92vw, 420px)';
    $panel.style.maxHeight = '70vh';
    $panel.style.overflow = 'auto';
    $panel.style.borderRadius = '14px';
    $panel.style.border = '1px solid #243255';
    $panel.style.boxShadow = '0 12px 34px rgba(0,0,0,.45)';
    $panel.style.background = '#0f1730';
    $panel.style.color = '#eaf0ff';
    $panel.style.zIndex = '9600';
    $panel.style.display = 'none';
    $panel.style.padding = '12px';

    // Header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.gap = '10px';
    const hTitle = document.createElement('div');
    hTitle.textContent = `Bau-Menü (${VERSION})`;
    hTitle.style.fontWeight = '600';
    const btnClose = document.createElement('button');
    btnClose.textContent = '✖';
    btnClose.style.background = '#1a2750';
    btnClose.style.color = '#fff';
    btnClose.style.border = '1px solid #2a3a66';
    btnClose.style.borderRadius = '10px';
    btnClose.style.padding = '6px 10px';
    btnClose.addEventListener('click', close);
    header.appendChild(hTitle);
    header.appendChild(btnClose);

    // Tools: nur EIN LUMBERJACK-Icon (wie gewünscht: nur Hauptsprite)
    const tools = document.createElement('div');
    tools.style.display = 'grid';
    tools.style.gridTemplateColumns = 'repeat(auto-fill, minmax(88px,1fr))';
    tools.style.gap = '10px';
    tools.style.marginTop = '12px';

    // Beispiel-Tool: lumberjack (nur 1 Kachel als Icon)
    tools.appendChild(makeToolCard({
      id: 'lumberjack',
      label: 'Lumberjack',
      // neutraler weißer „Button“-Hintergrund, Bild wirkt wie Icon
      preview: 'assets/buildings/lumberjack/lumberjack_tiers_grid.png',
      previewFrame: { x:0, y:0, w:256, h:256 }, // erstes Feld, du passt das später an
      onPick: ()=> selectTool('lumberjack')
    }));

    // Beispiel-Tools (Road/Path) — optional
    tools.appendChild(makeTextTool('road',  'Road',  ()=>selectTool('road')));
    tools.appendChild(makeTextTool('path',  'Path',  ()=>selectTool('path')));
    tools.appendChild(makeTextTool('house', 'House', ()=>selectTool('house')));

    $panel.appendChild(header);
    $panel.appendChild(tools);

    document.body.appendChild($backdrop);
    document.body.appendChild($panel);
    mounted = true;
    logOk('Bau-Menü bereit');
  }

  function makeTextTool(id, label, onClick){
    const card = document.createElement('button');
    card.style.border = '1px solid #2a3a66';
    card.style.borderRadius = '12px';
    card.style.background = '#fff';  // weißer Button-Hintergrund
    card.style.color = '#0b1320';
    card.style.padding = '12px';
    card.style.fontWeight = '600';
    card.style.cursor = 'pointer';
    card.textContent = label;
    card.title = id;
    card.addEventListener('click', onClick);
    return card;
  }

  function makeToolCard({id, label, preview, previewFrame, onPick}) {
    const card = document.createElement('button');
    card.style.border = '1px solid #2a3a66';
    card.style.borderRadius = '12px';
    card.style.background = '#fff';  // weißer Button-Hintergrund
    card.style.color = '#0b1320';
    card.style.padding = '8px';
    card.style.cursor = 'pointer';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'center';
    card.style.gap = '8px';

    const holder = document.createElement('div');
    holder.style.width = '72px';
    holder.style.height = '72px';
    holder.style.overflow = 'hidden';
    holder.style.borderRadius = '10px';
    holder.style.background = '#fff';

    const img = document.createElement('img');
    img.src = preview + '?v=16.1.13';
    img.alt = label;
    // Spriteframe simulieren (nur EIN Gebäude sichtbar)
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.style.transform = `translate(${-previewFrame.x}px, ${-previewFrame.y}px)`;
    img.style.maxWidth = 'none'; // wichtig: keine Schrumpfung
    holder.appendChild(img);

    const cap = document.createElement('div');
    cap.textContent = label;
    cap.style.fontWeight = '600';

    card.appendChild(holder);
    card.appendChild(cap);

    card.addEventListener('click', onPick);
    return card;
  }

  function selectTool(id){
    // hier ggf. mit Engine verbinden (z.B. window.Game?.setTool)
    if (window.Game?.setTool) {
      window.Game.setTool(id);
    }
    window.dispatchEvent(new CustomEvent('ui:log', { detail:{
      level:'ok', line:`[✅ (ok)] Tool gesetzt: ${id}`, ts: Date.now(), src:`ui-build ${VERSION}`
    }}));
    logOk(`Tool gesetzt: ${id}`);
  }

  // --- API ---
  function open(){
    mount();
    $backdrop.style.display = 'block';
    $panel.style.display = 'block';
  }
  function close(){
    if (!mounted) return;
    $panel.style.display = 'none';
    $backdrop.style.display = 'none';
  }

  // öffentlich machen
  window.UIBuild = { open, close, version: VERSION };

  // Beim Spielstart automatisch öffnen? → NEIN, nur per Button.
  // Aber wir loggen die Bereitschaft noch einmal:
  window.requestAnimationFrame(()=>logOk('Bau-Menü bereit (Panel montierbar)'));
})();
