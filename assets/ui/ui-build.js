// assets/ui/ui-build.js — v16.1.5
// Reines Bau-Menü. Öffnen mit window.GameUI.openBuildMenu(), Schließen mit closeBuildMenu().

(function(){
  const VERSION = 'ui-build.js v16.1.5';

  // Root anlegen (einmal)
  let root = document.getElementById('buildDock');
  if (!root){
    root = document.createElement('div');
    root.id = 'buildDock';
    Object.assign(root.style, {
      position:'fixed', left:'0', right:'0', bottom:'0', zIndex: 1200,
      background:'rgba(8,28,18,.92)', padding:'8px 10px',
      display:'none', // erst auf Anfrage
      boxShadow:'0 -10px 24px rgba(0,0,0,.35)'
    });
    root.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;overflow-x:auto;padding-bottom:4px;">
        <!-- Buttons werden dynamisch befüllt -->
      </div>
    `;
    document.body.appendChild(root);
  }

  const strip = root.firstElementChild;

  // Kleine Helper
  function addBtn(label, iconHTML, onClick){
    const btn = document.createElement('button');
    btn.innerHTML = iconHTML + '<div style="font-size:12px;margin-top:2px;opacity:.9">'+label+'</div>';
    Object.assign(btn.style, {
      minWidth:'96px', height:'84px', borderRadius:'16px',
      background:'#163c2a', color:'#eafff3', border:'0',
      display:'grid', placeItems:'center'
    });
    btn.addEventListener('click', onClick);
    strip.appendChild(btn);
    return btn;
  }

  // Icons (du kannst später transparente PNGs nehmen – hier neutraler Rahmen)
  function imgIcon(src, alt=''){
    return `<img src="${src}" alt="${alt}" style="display:block;width:64px;height:64px;object-fit:contain;background:white;border-radius:12px;" />`;
  }

  // === Buttons definieren ===
  const buttons = [
    { key:'road',    label:'Straße',  icon:'./assets/tex/road/topdown_road_straight.png' },
    { key:'path',    label:'Weg',     icon:'./assets/tex/path/topdown_path0.PNG' },
    { key:'bulldoze',label:'Abreißen',icon:'./assets/icons/icons_spritesheet_64.png' }, // Platzhalter
    // Lumberjack – nur EIN Bild (dein Wunsch)
    { key:'wood0',   label:'wood0',   icon:'./assets/buildings/lumberjack/lumberjack_tiers_grid.png', frame: {x:0,y:0,w:512,h:512} },
    { key:'factory', label:'Fabrik',  icon:'./assets/icons/icons_spritesheet_64.png' }, // Platzhalter
    { key:'cancel',  label:'Abbrechen', icon:null }
  ];

  // Rendern
  strip.innerHTML = '';
  buttons.forEach(b=>{
    let icon = '';
    if (b.icon){
      icon = imgIcon(b.icon, b.label);
    } else {
      icon = '<div style="width:64px;height:64px;border-radius:12px;border:2px dashed #3d6;display:grid;place-items:center;">✖</div>';
    }
    addBtn(b.label, icon, ()=>{
      if (window.Game && window.Game.setTool){
        window.Game.setTool(b.key);
        window.GameLog?.ok?.(`Tool gesetzt: ${b.key}`);
      } else {
        window.GameLog?.warn?.('Game.setTool fehlt (Tool nicht gesetzt)');
      }
      if (b.key === 'cancel') window.GameUI.closeBuildMenu();
    });
  });

  // API
  window.GameUI = {
    openBuildMenu(){
      root.style.display = 'block';
      window.GameLog?.ok?.(`Bau-Menü geöffnet (${VERSION})`);
    },
    closeBuildMenu(){
      root.style.display = 'none';
      window.GameLog?.ok?.('Bau-Menü geschlossen');
    }
  };

  // Sofortige Bereitschaft melden (wichtig für Start-Overlay-Log)
  window.GameLog?.ok?.(`Bau-Menü bereit (${VERSION})`);
})();
