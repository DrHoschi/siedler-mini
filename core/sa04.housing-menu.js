/* ============================================================================
 * SA-04 Housing Menu
 * Version: v26.08.31-sa04-housing-menu1
 * - adds Bewohner current/capacity to residential building menu
 * - hides irrelevant Lager/Arbeitsbereich/Pause controls on housing buildings
 * - leaves all other building menus untouched
 * ========================================================================== */
(function(){
  'use strict';
  let selected=null;

  function buildingFromDetail(d){
    const src=d?.building||d||{};
    const uid=src.uid||src.buildingUid||null;
    const id=src.id||src.kind||src.buildingId||null;
    const list=window.Game?.buildings||[];
    return (uid&&list.find(b=>b&&String(b.uid)===String(uid)))
      || (id&&list.find(b=>b&&b.id===id&&Number(b.x)===Number(src.x??src.tileX)&&Number(b.y)===Number(src.y??src.tileY)))
      || null;
  }
  function ensureRow(panel){
    let row=panel?.querySelector('[data-row="residents"]');
    if(row)return row;
    const body=panel?.querySelector('#ui-building-body');if(!body)return null;
    row=document.createElement('div');row.dataset.row='residents';
    Object.assign(row.style,{marginTop:'6px',paddingTop:'6px',borderTop:'1px solid rgba(120,90,40,.35)'});
    row.innerHTML='<b>Bewohner:</b> <span data-k="residents">0 / 0</span>';
    body.appendChild(row);return row;
  }
  function update(){
    const panel=document.getElementById('ui-building-menu');if(!panel)return;
    const H=window.SA04Housing;
    const isHousing=!!(selected&&H?.isHousing?.(selected));
    const row=ensureRow(panel);if(row)row.style.display=isHousing?'block':'none';
    if(isHousing&&row){
      const cur=H.residentsFor(selected).length,cap=H.capacityFor(selected);
      const el=row.querySelector('[data-k="residents"]');if(el)el.textContent=`${cur} / ${cap}`;
    }
    if(!isHousing)return;
    const stock=panel.querySelector('[data-row="stock"]');if(stock)stock.style.display='none';
    const work=[...panel.querySelectorAll('button')].find(b=>b.textContent==='Arbeitsbereich');if(work)work.style.display='none';
    const pause=panel.querySelector('#ui-building-btn-pause');if(pause)pause.style.display='none';
  }
  function restoreNonHousingControls(){
    const panel=document.getElementById('ui-building-menu');if(!panel)return;
    const work=[...panel.querySelectorAll('button')].find(b=>b.textContent==='Arbeitsbereich');if(work)work.style.display='';
    const pause=panel.querySelector('#ui-building-btn-pause');if(pause)pause.style.display='';
  }
  function onSelect(ev){
    selected=buildingFromDetail(ev?.detail||{});
    if(!(selected&&window.SA04Housing?.isHousing?.(selected)))restoreNonHousingControls();
    setTimeout(update,190);
  }
  ['cb:building:menu-open','cb:building:selected','cb:building:select'].forEach(name=>window.addEventListener(name,onSelect));
  window.addEventListener('cb:housing:residents-changed',()=>update());
  setInterval(update,500);
  window.SA04HousingMenu={version:'v26.08.31-sa04-housing-menu1',update};
})();