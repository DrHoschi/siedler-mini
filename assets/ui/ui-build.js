// assets/ui/ui-build.js — v16.1.17
// ---------------------------------------------------------
// Einfaches Bau-Dock (Bottom Sheet) für Touch/Tablet.
// Stellt eine GLOBALE API bereit: window.UIBuild.{open,close,toggle,setTool}
// Nutzt CBLog falls vorhanden. Reagiert auf 'cb:game-started'.
// ---------------------------------------------------------
(function(){
  const V='v16.1.17';
  const log = (lvl,msg)=>{
    try{
      if(window.CBLog){
        (window.CBLog[lvl]||window.CBLog.push)(lvl,msg);
      }else{
        console[lvl==='err'?'error':lvl==='warn'?'warn':'log'](msg);
      }
    }catch(_){}
  };

  const elDock = document.getElementById('build-dock');
  if(!elDock){ console.warn('[ui-build] #build-dock fehlt'); return; }

  // --- Tool-Definitionen (Icons optional – einfache Variante) ---
  // NOTE: Für Lumberjack-Preview kannst du die PNGs später austauschen.
  const TOOLS = [
    {id:'road',      label:'Straße'},
    {id:'path',      label:'Weg'},
    {id:'bulldozer', label:'Abreißen'},
    // Rathaus: nur Platzhalter-Button (bauen später ggf. gesperrt)
    {id:'townhall_wood', label:'Rathaus'},
  ];

  // --- UI bauen ---
  const row = document.createElement('div'); row.className='row';
  TOOLS.forEach(t=>{
    const b=document.createElement('button');
    b.className='tool'; b.dataset.id=t.id; b.type='button';
    b.textContent=t.label;
    b.addEventListener('click',()=>{
      setActive(t.id);
      emitTool(t.id);
    });
    row.appendChild(b);
  });
  elDock.appendChild(row);

  function setActive(id){
    elDock.querySelectorAll('.tool').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.id===id);
    });
  }
  function emitTool(id){
    log('ok', `Tool gesetzt: ${id}`);
    // Game-interner Event, damit deine Engine darauf reagieren kann
    window.dispatchEvent(new CustomEvent('cb:tool-set',{detail:{id}}));
    // Abwärtskompatibler Hook:
    try{ window.GameUI?.onToolSelected?.(id); }catch(_){}
  }

  // --- Public API ---
  const api = {
    open(){ elDock.classList.add('open'); log('ok', 'Bau-Menü geöffnet (ui-build.js '+V+')'); },
    close(){ elDock.classList.remove('open'); log('ok', 'Bau-Menü geschlossen'); },
    toggle(){ elDock.classList.contains('open')?api.close():api.open(); },
    setTool(id){ setActive(id); emitTool(id); },
    version: V
  };
  window.UIBuild = api;

  // --- Spielstart: optional automatisch öffnen, Button aktivieren via Bridge ---
  window.addEventListener('cb:game-started', ()=>{
    // nichts automatisch – Bridge blendet Button ein
  });

  log('ok', `[ok] UI bereit (ui-build.js ${V})`);
})();
