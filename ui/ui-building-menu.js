/* ============================================================================
 * ui/ui-building-menu.js
 * v26.08.31-sa04-menu3
 * - readable compact building panel
 * - Lager instead of long stock wording
 * - item sprite icons beside physical stock values
 * - deliberate tap guard and automatic outside close
 * ========================================================================== */
(function () {
  'use strict';

  const LOG = window.CBLog || { info:console.log, warn:console.warn, ok:console.log, error:console.error };
  if (window.__UI_BUILDING_MENU_BOUND__) return;
  window.__UI_BUILDING_MENU_BOUND__ = true;

  const UI_ROOT = document.getElementById('ui-root') || document.body;
  const OPEN_DELAY_MS = 160;
  const MOVE_CANCEL_PX = 10;
  const SHEET='assets/items/items_master_sprite.PNG';
  const ICONS={
    wood:{label:'Holz',x:0,y:0},
    stone:{label:'Stein',x:128,y:0},
    fish:{label:'Fisch',x:256,y:384},
    meat:{label:'Fleisch',x:384,y:384},
    pelt:{label:'Fell',x:0,y:256}
  };

  let panel = document.getElementById('ui-building-menu');
  let current = null;
  let pauseBtnLocked = false;
  let openTimer = null;
  let pointerStart = null;
  let pointerMoved = false;

  function findRealBuilding(uid, id){
    const candidates = [];
    try {
      if (window.Game?.buildingsByUid && uid && window.Game.buildingsByUid[uid]) return window.Game.buildingsByUid[uid];
      if (window.Game?.buildings?.byUid && uid && window.Game.buildings.byUid[uid]) return window.Game.buildings.byUid[uid];
      if (Array.isArray(window.Game?.buildings?.list)) candidates.push(window.Game.buildings.list);
      if (Array.isArray(window.GameBuildings?.list)) candidates.push(window.GameBuildings.list);
      if (Array.isArray(window.Game?.buildings)) candidates.push(window.Game.buildings);
      if (Array.isArray(window.Buildings?.list)) candidates.push(window.Buildings.list);
    } catch (e) {}
    for (const arr of candidates){
      const hit = arr.find(b => (uid && (b.uid===uid || b.buildingUid===uid)) || (!uid && id && (b.id===id || b.kind===id)));
      if (hit) return hit;
    }
    return null;
  }

  function ensurePanel(){
    if (!panel){
      panel = document.createElement('div');
      panel.id = 'ui-building-menu';
      UI_ROOT.appendChild(panel);
    }

    Object.assign(panel.style,{
      position:'fixed',left:'12px',top:'72px',zIndex:'99999',pointerEvents:'auto',
      minWidth:'240px',maxWidth:'320px',padding:'10px',borderRadius:'12px',
      background:'rgba(245,236,219,.97)',border:'2px solid rgba(120,90,40,.9)',
      boxShadow:'0 8px 20px rgba(0,0,0,.25)',fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,Arial',
      color:'#2b2117'
    });

    if(panel.dataset.sa04Built==='1') return panel;
    panel.dataset.sa04Built='1';
    panel.innerHTML='';

    const header=document.createElement('div');
    Object.assign(header.style,{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'});
    const title=document.createElement('div');
    title.id='ui-building-title';
    title.style.fontWeight='700';
    title.textContent='Gebäude';
    const close=document.createElement('button');
    close.type='button'; close.textContent='×';
    Object.assign(close.style,{width:'34px',height:'34px',borderRadius:'10px',border:'1px solid rgba(120,90,40,.8)',background:'rgba(255,255,255,.9)',color:'#2b2117',fontSize:'22px'});
    close.addEventListener('click',ev=>{ev.stopPropagation();hide();});
    header.append(title,close);

    const sub=document.createElement('div');
    sub.id='ui-building-subtitle';
    Object.assign(sub.style,{fontSize:'12px',marginTop:'6px',fontWeight:'700',color:'#7a2d1c'});

    const body=document.createElement('div');
    body.id='ui-building-body';
    Object.assign(body.style,{marginTop:'8px',fontSize:'13px',lineHeight:'1.45'});
    body.innerHTML=`
      <div><b>ID:</b> <span data-k="id">—</span></div>
      <div><b>Status:</b> <span data-k="status">—</span></div>
      <div><b>Kategorie:</b> <span data-k="category">—</span></div>
      <div><b>Position:</b> <span data-k="pos">—</span></div>
      <div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(120,90,40,.35)">
        <b>Lager:</b> <span data-k="stock"></span>
      </div>`;

    const footer=document.createElement('div');
    footer.id='ui-building-footer';
    Object.assign(footer.style,{display:'flex',gap:'8px',marginTop:'10px'});

    const btnWorkArea=document.createElement('button');
    btnWorkArea.type='button'; btnWorkArea.textContent='Arbeitsbereich';
    Object.assign(btnWorkArea.style,{flex:'1',padding:'8px 10px',borderRadius:'10px',border:'1px solid rgba(120,90,40,.8)',background:'rgba(255,255,255,.9)',color:'#2b2117'});
    btnWorkArea.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();if(!current)return;window.GameWorkArea?.beginSelection?.(current);hide();});

    const btnPause=document.createElement('button');
    btnPause.type='button'; btnPause.id='ui-building-btn-pause'; btnPause.textContent='Pause';
    Object.assign(btnPause.style,{flex:'1',padding:'8px 10px',borderRadius:'10px',border:'1px solid rgba(120,90,40,.8)',background:'rgba(255,255,255,.9)',color:'#2b2117'});
    btnPause.addEventListener('click',ev=>{
      ev.preventDefault(); ev.stopPropagation();
      if(!current||pauseBtnLocked) return;
      const real=findRealBuilding(current.uid,current.id);
      const next=!(real?.workPaused ?? real?.paused ?? real?.__workPaused);
      pauseBtnLocked=true; btnPause.disabled=true; current.workPaused=next;
      syncPause(btnPause,next); syncSubtitle(next);
      window.dispatchEvent(new CustomEvent('req:building:setPaused',{detail:{id:current.id||null,uid:current.uid||null,paused:next}}));
      setTimeout(()=>{pauseBtnLocked=false;btnPause.disabled=false;},250);
    });

    footer.append(btnWorkArea,btnPause);
    panel.append(header,sub,body,footer);
    panel.style.display='none';
    panel.classList.add('hidden');
    return panel;
  }

  function setField(k,v){
    const el=panel?.querySelector(`[data-k="${k}"]`);
    if(el) el.textContent=(v==null?'—':String(v));
  }

  function readStock(uid){
    if(!uid) return [];
    try{
      const row=(window.BuildingStock?.snapshot?.()||[]).find(r=>r&&String(r.bUid)===String(uid));
      if(!row) return [];
      return Object.entries(row).filter(([k,v])=>k!=='bUid'&&Number(v)>0).map(([id,v])=>({id,value:Number(v)||0}));
    }catch(_e){return [];}
  }

  function iconNode(id){
    const cfg=ICONS[id]||{label:id,x:128,y:256};
    const wrap=document.createElement('span');
    Object.assign(wrap.style,{display:'inline-flex',alignItems:'center',gap:'3px',marginRight:'8px',whiteSpace:'nowrap'});
    const icon=document.createElement('span');
    const scale=18/128;
    Object.assign(icon.style,{
      display:'inline-block',width:'18px',height:'18px',backgroundImage:`url(${SHEET})`,
      backgroundRepeat:'no-repeat',backgroundSize:`${1024*scale}px ${1536*scale}px`,
      backgroundPosition:`-${cfg.x*scale}px -${cfg.y*scale}px`,verticalAlign:'middle'
    });
    const txt=document.createElement('span'); txt.textContent=cfg.label;
    wrap.append(icon,txt);
    return wrap;
  }

  function syncStock(){
    if(!current||!panel||panel.style.display==='none') return;
    const host=panel.querySelector('[data-k="stock"]');
    if(!host) return;
    host.innerHTML='';
    const entries=readStock(current.uid);
    if(!entries.length){host.textContent='0';return;}
    for(const e of entries){
      const node=iconNode(e.id);
      const n=document.createElement('b'); n.textContent=` ${e.value}`;
      node.appendChild(n);
      host.appendChild(node);
    }
  }

  function syncPause(btn,paused){if(btn)btn.textContent=paused?'Weiter':'Pause';}
  function syncSubtitle(paused){const sub=panel?.querySelector('#ui-building-subtitle');if(sub)sub.textContent=paused?'PAUSIERT':'';}

  function show(detail){
    ensurePanel();
    const b=detail?.building||detail; if(!b)return;
    current={id:b.id||b.kind||null,uid:b.uid||b.buildingUid||null,x:b.x??b.tileX,y:b.y??b.tileY,w:b.w??3,h:b.h??3,status:b.status||'done',category:b.category||'—',workPaused:!!b.workPaused};
    const real=findRealBuilding(current.uid,current.id);
    if(real){current.uid=real.uid||current.uid;current.workPaused=!!(real.workPaused??real.paused??real.__workPaused);current.status=real.status||current.status;}
    panel.style.display='block'; panel.classList.remove('hidden','is-hidden');
    const t=panel.querySelector('#ui-building-title'); if(t)t.textContent=current.id||'Gebäude';
    setField('id',current.id); setField('status',current.status); setField('category',current.category); setField('pos',`${current.x??'?'}, ${current.y??'?'} (${current.w}×${current.h})`);
    syncStock();
    const btn=panel.querySelector('#ui-building-btn-pause'); btn.disabled=false; pauseBtnLocked=false; syncPause(btn,current.workPaused); syncSubtitle(current.workPaused);
    LOG.info('[ui-building] Menü sichtbar für',current.id);
  }

  function hide(){if(openTimer){clearTimeout(openTimer);openTimer=null;}if(!panel)return;panel.style.display='none';panel.classList.add('hidden');current=null;}
  function requestShow(detail){if(openTimer)clearTimeout(openTimer);openTimer=setTimeout(()=>{openTimer=null;if(!pointerMoved)show(detail);},OPEN_DELAY_MS);}

  document.addEventListener('pointerdown',ev=>{pointerStart={x:ev.clientX,y:ev.clientY};pointerMoved=false;if(panel&&panel.style.display!=='none'&&!panel.contains(ev.target))hide();},true);
  document.addEventListener('pointermove',ev=>{if(!pointerStart)return;if(Math.hypot(ev.clientX-pointerStart.x,ev.clientY-pointerStart.y)>MOVE_CANCEL_PX){pointerMoved=true;if(openTimer){clearTimeout(openTimer);openTimer=null;}}},true);
  document.addEventListener('pointercancel',()=>{pointerMoved=true;pointerStart=null;},true);
  ['cb:building:menu-open','cb:building:selected','cb:building:select'].forEach(name=>window.addEventListener(name,ev=>requestShow(ev.detail)));

  window.addEventListener('cb:building:pause-changed',ev=>{
    const d=ev?.detail||{}; const uid=d.uid||d.buildingUid||null; const id=d.id||d.buildingId||null; const paused=!!d.paused;
    if(current&&((uid&&current.uid===uid)||(!uid&&id&&current.id===id))){current.workPaused=paused;const btn=panel?.querySelector('#ui-building-btn-pause');syncPause(btn,paused);syncSubtitle(paused);pauseBtnLocked=false;if(btn)btn.disabled=false;}
  });
  window.addEventListener('cb:stock:change',()=>syncStock());
  setInterval(syncStock,500);

  ensurePanel();
  LOG.ok('✅ [ui-building] v26.08.31-sa04-menu3 loaded');
})();
