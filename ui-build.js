/*  Siedler-Mini – Build UI
    Datei: ui-build.js
    Version: v16.0.10
    Verantwortlich:
      - Bau-Menü, Tools, Preise anzeigen
      - Touch/Mouse Platzierung inkl. Ghost-Vorschau
      - Undo Button (Langdruck auf „Abbrechen“)
*/

(function(){
  const VERSION = 'v16.0.10';
  const toolsDef = [
    { id:'road',    label:'Straße',  icon:'🛣️' },
    { id:'path',    label:'Weg',     icon:'🚶'  },
    { id:'bulldoze',label:'Abreißen',icon:'🪓'  },
    { id:'house',   label:'Haus',    icon:'🏠'  },
    { id:'factory', label:'Fabrik',  icon:'🏭'  },
  ];

  const elBar   = document.getElementById('build-bar');
  const elTools = document.getElementById('tools');
  const btnToggle = document.getElementById('toggle-build');
  const canvas = document.getElementById('game-canvas');

  let active = null; // tool-id

  function priceString(cost){
    const arr=[];
    if(cost.coins) arr.push(`🟡${cost.coins}`);
    if(cost.wood)  arr.push(`🪵${cost.wood}`);
    if(cost.stone) arr.push(`🪨${cost.stone}`);
    return arr.join(' · ') || 'gratis';
  }

  function buildToolbar(){
    const prices = GameLoader.getPrices();
    elTools.innerHTML = '';
    toolsDef.forEach(t=>{
      const btn = document.createElement('button');
      btn.className = 'tool';
      btn.dataset.id = t.id;
      btn.innerHTML = `<div style="font-size:20px">${t.icon}</div>
        <div>${t.label}</div>
        <small class="price">${priceString(prices[t.id]||{})}</small>`;
      btn.onclick = ()=> setTool(t.id);
      elTools.appendChild(btn);
    });
  }

  function setTool(id){
    active = id;
    document.querySelectorAll('.tool').forEach(b=>{
      b.classList.toggle('active', b.dataset.id===id);
    });
    logOK(`Tool gesetzt: ${id}`);
  }

  function toggleBar(){
    const vis = elBar.style.display !== 'none';
    if(vis){ elBar.style.display='none'; btnToggle.textContent='🏗️ Bauen'; }
    else   { elBar.style.display='block'; btnToggle.textContent='⬇️ Schließen'; }
  }

  // Ghost handling
  function updateGhost(ev){
    if(!active || active==='bulldoze') { GameLoader.clearGhost(); return; }
    const { x, y } = GameLoader.worldToCell(ev.clientX, ev.clientY);
    const check = GameLoader.canPlace(active, x, y);
    if(check.ok) GameLoader.setGhost(true, x, y);
    else         GameLoader.setGhost(false,x, y);
  }
  function clearGhost(){ GameLoader.clearGhost(); }

  // Place on tap/click
  function onPlace(ev){
    const { x, y } = GameLoader.worldToCell(ev.clientX, ev.clientY);
    if(!active){ logWARN('Kein Tool ausgewählt.'); return; }
    if(active==='cancel'){ setTool(null); return; }
    if(active==='bulldoze'){
      GameLoader.place('bulldoze', x, y);
      return;
    }
    GameLoader.place(active, x, y);
  }

  // Long press on „Abbrechen“ -> Undo
  function enableUndoOnCancel(){
    const cancelBtn = document.createElement('button');
    cancelBtn.className='tool';
    cancelBtn.dataset.id='cancel';
    cancelBtn.innerHTML = `<div style="font-size:20px">⛔</div><div>Abbrechen</div><small class="price">Long-press: Undo</small>`;
    let hold = null;
    cancelBtn.onmousedown = cancelBtn.ontouchstart = ()=>{
      hold = setTimeout(()=>{ GameLoader.undo(); }, 550);
    };
    cancelBtn.onmouseup = cancelBtn.ontouchend = cancelBtn.onmouseleave = ()=>{
      if(hold){ clearTimeout(hold); hold=null; }
    };
    cancelBtn.onclick = ()=> setTool('cancel');
    elTools.appendChild(cancelBtn);
  }

  // HUD init log
  window.addEventListener('load', ()=>{
    try{
      buildToolbar();
      enableUndoOnCancel();
      btnToggle.style.display = 'inline-block';
      btnToggle.onclick = toggleBar;
      logOK(`Bau-Menü bereit (ui-build.js ${VERSION})`);
    }catch(e){
      logERR('Bau-Menü Fehler: '+e.message);
    }
  });

  // Pointer events
  canvas.addEventListener('pointermove', updateGhost);
  canvas.addEventListener('pointerleave', clearGhost);
  canvas.addEventListener('pointerdown', onPlace);

})();
