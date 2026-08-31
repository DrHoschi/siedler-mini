/* ============================================================================
 * SA-04 Housing Menu
 * Version: v26.08.31-sa04-housing-menu2
 * - shows Bewohner current/capacity
 * - shows tax amount and countdown for residential buildings
 * - hides irrelevant Lager/Arbeitsbereich/Pause controls on housing buildings
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
  function ensureRows(panel){
    const body=panel?.querySelector('#ui-building-body');if(!body)return{};
    let residents=panel.querySelector('[data-row="residents"]');
    if(!residents){residents=document.createElement('div');residents.dataset.row='residents';Object.assign(residents.style,{marginTop:'6px',paddingTop:'6px',borderTop:'1px solid rgba(120,90,40,.35)'});residents.innerHTML='<b>Bewohner:</b> <span data-k="residents">0 / 0</span>';body.appendChild(residents);}
    let tax=panel.querySelector('[data-row="tax"]');
    if(!tax){tax=document.createElement('div');tax.dataset.row='tax';Object.assign(tax.style,{marginTop:'5px'});tax.innerHTML='<b>Steuern:</b> <span data-k="tax">0 Gold</span><br><span style="font-size:12px">Nächste Zahlung in <span data-k="tax-next">—</span></span>';body.appendChild(tax);}
    return{residents,tax};
  }
  function update(){
    const panel=document.getElementById('ui-building-menu');if(!panel)return;
    const H=window.SA04Housing;
    const isHousing=!!(selected&&H?.isHousing?.(selected));
    const rows=ensureRows(panel);
    if(rows.residents)rows.residents.style.display=isHousing?'block':'none';
    if(rows.tax)rows.tax.style.display=isHousing?'block':'none';
    if(isHousing){
      const cur=H.residentsFor(selected).length,cap=H.capacityFor(selected);
      const rel=rows.residents?.querySelector('[data-k="residents"]');if(rel)rel.textContent=`${cur} / ${cap}`;
      const T=window.SA04HousingTaxes;
      const amount=T?.expectedAmount?.(selected)??0;
      const secs=T?.secondsRemaining?.(selected)??0;
      const tel=rows.tax?.querySelector('[data-k="tax"]');if(tel)tel.textContent=`${amount} Gold / 10 s`;
      const nel=rows.tax?.querySelector('[data-k="tax-next"]');if(nel)nel.textContent=`${secs} s`;
      const stock=panel.querySelector('[data-row="stock"]');if(stock)stock.style.display='none';
      const work=[...panel.querySelectorAll('button')].find(b=>b.textContent==='Arbeitsbereich');if(work)work.style.display='none';
      const pause=panel.querySelector('#ui-building-btn-pause');if(pause)pause.style.display='none';
    }
  }
  function restoreNonHousingControls(){
    const panel=document.getElementById('ui-building-menu');if(!panel)return;
    const work=[...panel.querySelectorAll('button')].find(b=>b.textContent==='Arbeitsbereich');if(work)work.style.display='';
    const pause=panel.querySelector('#ui-building-btn-pause');if(pause)pause.style.display='';
  }
  function onSelect(ev){selected=buildingFromDetail(ev?.detail||{});if(!(selected&&window.SA04Housing?.isHousing?.(selected)))restoreNonHousingControls();setTimeout(update,190);}
  ['cb:building:menu-open','cb:building:selected','cb:building:select'].forEach(name=>window.addEventListener(name,onSelect));
  ['cb:housing:residents-changed','cb:housing:tax-collected','cb:housing:tax-restored'].forEach(name=>window.addEventListener(name,()=>update()));
  setInterval(update,500);
  window.SA04HousingMenu={version:'v26.08.31-sa04-housing-menu2',update};
})();