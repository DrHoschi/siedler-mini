/* ============================================================================
 * ui/ui-building-menu.js
 * v26.08.30-sa04-menu2
 * - pause toggle uses authoritative building state
 * - readable dark text on light panel
 * - shows physical BuildingStock output waiting at the building
 * - deliberate tap guard: panning/moving does not open the panel
 * - outside pointer closes the panel automatically
 * ========================================================================== */
(function () {
  'use strict';

  const LOG = window.CBLog || { info:console.log, warn:console.warn, ok:console.log, error:console.error };

  if (window.__UI_BUILDING_MENU_BOUND__) return;
  window.__UI_BUILDING_MENU_BOUND__ = true;

  const UI_ROOT = document.getElementById('ui-root') || document.body;
  const OPEN_DELAY_MS = 160;
  const MOVE_CANCEL_PX = 10;

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

    // Always assert the essential styling. Some project-wide themes use white
    // text, therefore this panel must not inherit its foreground colour.
    panel.style.position = 'fixed';
    panel.style.left = '12px';
    panel.style.top  = '72px';
    panel.style.zIndex = '99999';
    panel.style.pointerEvents = 'auto';
    panel.style.minWidth = '240px';
    panel.style.maxWidth = '320px';
    panel.style.padding = '10px';
    panel.style.borderRadius = '12px';
    panel.style.background = 'rgba(245, 236, 219, 0.97)';
    panel.style.border = '2px solid rgba(120,90,40,0.9)';
    panel.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
    panel.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial';
    panel.style.color = '#2b2117';

    if (panel.dataset.sa04Built === '1') return panel;
    panel.dataset.sa04Built = '1';
    panel.innerHTML = '';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.gap = '8px';

    const title = document.createElement('div');
    title.id = 'ui-building-title';
    title.style.fontWeight = '700';
    title.style.color = '#2b2117';
    title.textContent = 'Gebäude';
    header.appendChild(title);

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.style.width = '34px';
    close.style.height = '34px';
    close.style.borderRadius = '10px';
    close.style.border = '1px solid rgba(120,90,40,0.8)';
    close.style.background = 'rgba(255,255,255,0.9)';
    close.style.color = '#2b2117';
    close.style.fontSize = '22px';
    close.addEventListener('click', (ev)=>{ ev.stopPropagation(); hide(); });
    header.appendChild(close);

    const sub = document.createElement('div');
    sub.id = 'ui-building-subtitle';
    sub.style.fontSize = '12px';
    sub.style.marginTop = '6px';
    sub.style.fontWeight = '700';
    sub.style.color = '#7a2d1c';

    const body = document.createElement('div');
    body.id = 'ui-building-body';
    body.style.marginTop = '8px';
    body.style.fontSize = '13px';
    body.style.lineHeight = '1.45';
    body.style.color = '#2b2117';
    body.innerHTML = `
      <div><b>ID:</b> <span data-k="id">—</span></div>
      <div><b>Status:</b> <span data-k="status">—</span></div>
      <div><b>Kategorie:</b> <span data-k="category">—</span></div>
      <div><b>Position:</b> <span data-k="pos">—</span></div>
      <div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(120,90,40,.35)">
        <b>Bestand am Gebäude:</b> <span data-k="stock">—</span>
      </div>
    `;

    const footer = document.createElement('div');
    footer.id = 'ui-building-footer';
    footer.style.display = 'flex';
    footer.style.gap = '8px';
    footer.style.marginTop = '10px';

    const btnWorkArea = document.createElement('button');
    btnWorkArea.type = 'button';
    btnWorkArea.textContent = 'Arbeitsbereich';
    btnWorkArea.style.flex = '1';
    btnWorkArea.style.padding = '8px 10px';
    btnWorkArea.style.borderRadius = '10px';
    btnWorkArea.style.border = '1px solid rgba(120,90,40,0.8)';
    btnWorkArea.style.background = 'rgba(255,255,255,0.9)';
    btnWorkArea.style.color = '#2b2117';
    btnWorkArea.addEventListener('click', (ev)=>{
      ev.preventDefault(); ev.stopPropagation();
      if (!current) return;
      window.GameWorkArea?.beginSelection?.(current);
      hide();
    });

    const btnPause = document.createElement('button');
    btnPause.type = 'button';
    btnPause.id = 'ui-building-btn-pause';
    btnPause.textContent = 'Pause';
    btnPause.style.flex = '1';
    btnPause.style.padding = '8px 10px';
    btnPause.style.borderRadius = '10px';
    btnPause.style.border = '1px solid rgba(120,90,40,0.8)';
    btnPause.style.background = 'rgba(255,255,255,0.9)';
    btnPause.style.color = '#2b2117';

    btnPause.addEventListener('click', (ev)=>{
      ev.preventDefault(); ev.stopPropagation();
      if (!current || pauseBtnLocked) return;

      const real = findRealBuilding(current.uid, current.id);
      const realPaused = !!(real?.workPaused ?? real?.paused ?? real?.__workPaused);
      const next = !realPaused;

      pauseBtnLocked = true;
      btnPause.disabled = true;
      current.workPaused = next;
      syncPause(btnPause, next);
      syncSubtitle(next);

      window.dispatchEvent(new CustomEvent('req:building:setPaused', {
        detail: { id: current.id||null, uid: current.uid||null, paused: next }
      }));

      setTimeout(()=>{
        pauseBtnLocked = false;
        btnPause.disabled = false;
      }, 250);
    });

    footer.appendChild(btnWorkArea);
    footer.appendChild(btnPause);
    panel.appendChild(header);
    panel.appendChild(sub);
    panel.appendChild(body);
    panel.appendChild(footer);

    panel.style.display = 'none';
    panel.classList.add('hidden');
    return panel;
  }

  function setField(k,v){
    const el = panel?.querySelector(`[data-k="${k}"]`);
    if (el) el.textContent = (v==null?'—':String(v));
  }

  function resourceLabel(id){
    const map={wood:'Holz',stone:'Stein',fish:'Fisch',meat:'Fleisch',pelt:'Fell'};
    return map[id] || id;
  }

  function readStock(uid){
    if (!uid) return [];
    const BS=window.BuildingStock;
    if (!BS?.snapshot) return [];
    try{
      const row=(BS.snapshot()||[]).find(r=>r && String(r.bUid)===String(uid));
      if (!row) return [];
      return Object.entries(row)
        .filter(([k,v])=>k!=='bUid' && Number(v)>0)
        .map(([k,v])=>({id:k,value:Number(v)||0}));
    }catch(_e){ return []; }
  }

  function syncStock(){
    if (!current || !panel || panel.style.display==='none') return;
    const entries=readStock(current.uid);
    setField('stock', entries.length
      ? entries.map(x=>`${resourceLabel(x.id)}: ${x.value}`).join(' · ')
      : '0');
  }

  function syncPause(btn, paused){
    if (!btn) return;
    btn.textContent = paused ? 'Weiter' : 'Pause';
  }

  function syncSubtitle(paused){
    const sub = panel?.querySelector('#ui-building-subtitle');
    if (!sub) return;
    sub.textContent = paused ? 'PAUSIERT' : '';
  }

  function show(detail){
    ensurePanel();
    const b = detail?.building || detail;
    if (!b) return;

    current = {
      id: b.id || b.kind || null,
      uid: b.uid || b.buildingUid || null,
      x: b.x ?? b.tileX,
      y: b.y ?? b.tileY,
      w: b.w ?? 3,
      h: b.h ?? 3,
      status: b.status || 'done',
      category: b.category || '—',
      workPaused: !!b.workPaused
    };

    const real = findRealBuilding(current.uid, current.id);
    if (real) {
      current.uid = real.uid || current.uid;
      current.workPaused = !!(real.workPaused ?? real.paused ?? real.__workPaused);
      current.status = real.status || current.status;
    }

    panel.style.display = 'block';
    panel.classList.remove('hidden','is-hidden');

    const t = panel.querySelector('#ui-building-title');
    if (t) t.textContent = current.id || 'Gebäude';

    setField('id', current.id);
    setField('status', current.status);
    setField('category', current.category);
    setField('pos', `${current.x ?? '?'}, ${current.y ?? '?'} (${current.w}×${current.h})`);
    syncStock();

    const btn = panel.querySelector('#ui-building-btn-pause');
    btn.disabled = false;
    pauseBtnLocked = false;
    syncPause(btn, current.workPaused);
    syncSubtitle(current.workPaused);

    LOG.info('[ui-building] Menü sichtbar für', current.id);
  }

  function hide(){
    if (openTimer){ clearTimeout(openTimer); openTimer=null; }
    if (!panel) return;
    panel.style.display = 'none';
    panel.classList.add('hidden');
    current = null;
  }

  function requestShow(detail){
    if (openTimer) clearTimeout(openTimer);
    openTimer=setTimeout(()=>{
      openTimer=null;
      // A drag/pan gesture must never open the building panel.
      if (pointerMoved) return;
      show(detail);
    },OPEN_DELAY_MS);
  }

  // Track whether the user's gesture was a deliberate tap or a map pan.
  document.addEventListener('pointerdown',(ev)=>{
    pointerStart={x:ev.clientX,y:ev.clientY};
    pointerMoved=false;
    if (panel && panel.style.display!=='none' && !panel.contains(ev.target)) hide();
  },true);

  document.addEventListener('pointermove',(ev)=>{
    if(!pointerStart) return;
    if(Math.hypot(ev.clientX-pointerStart.x,ev.clientY-pointerStart.y)>MOVE_CANCEL_PX){
      pointerMoved=true;
      if(openTimer){ clearTimeout(openTimer); openTimer=null; }
    }
  },true);

  document.addEventListener('pointercancel',()=>{ pointerMoved=true; pointerStart=null; },true);

  // Keep compatibility with all legacy emitters, but guard them through the
  // deliberate-tap filter above instead of opening immediately.
  ['cb:building:menu-open','cb:building:selected','cb:building:select'].forEach((name)=>{
    window.addEventListener(name, (ev)=> requestShow(ev.detail));
  });

  window.addEventListener('cb:building:pause-changed', (ev)=>{
    const d = ev?.detail || {};
    const uid = d.uid || d.buildingUid || null;
    const id  = d.id  || d.buildingId  || null;
    const paused = !!d.paused;

    if (current && ((uid && current.uid===uid) || (!uid && id && current.id===id))) {
      current.workPaused = paused;
      const btn = panel?.querySelector('#ui-building-btn-pause');
      syncPause(btn, paused);
      syncSubtitle(paused);
      pauseBtnLocked = false;
      if (btn) btn.disabled = false;
    }
  });

  window.addEventListener('cb:stock:change',()=>syncStock());
  setInterval(syncStock,500);

  ensurePanel();
  LOG.ok('✅ [ui-building] v26.08.30-sa04-menu2 loaded');
})();
