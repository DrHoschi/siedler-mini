/* ============================================================================
 * Datei   : ui/ui-inspector.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.30-final-hotfix (bootGuard+drossel, minimal refresh)
 * Zweck   : Inspector-Bridge (Open/Close/Toggle) + Fallbacks für alte Strukturen
 *           – Active-View-Fallback (.insp-view/.insp-frame)
 *           – Zuletzt aktiver Tab (localStorage)
 *           – Slots/Legacy-Container automatisch anlegen
 *           – Header-X schließt robust
 * Hinweis : Hotfix reduziert Event-Traffic und verhindert Ready-Schleifen.
 * ============================================================================ */

(function(){
  'use strict';
  const MOD = '[ui-inspector]';
  const LOGI = (window.CBLog?.info || console.info).bind(console, MOD);
  const LOGO = (window.CBLog?.ok   || console.log ).bind(console, MOD);
  const LOGW = (window.CBLog?.warn || console.warn).bind(console, MOD);
  const LOGE = (window.CBLog?.error|| console.error).bind(console, MOD);

  const SEL = {
    host1: '#inspector',
    host2: '#inspector-overlay',
    tabs : '#inspector .insp-tabs [role="tab"], #inspector .insp-tabs .insp-tab',
    views: '#inspector .insp-content .insp-view, #inspector .insp-content .insp-frame'
  };
  const LAST_KEY = 'insp:lastTab';

  const q  = (s)=>document.querySelector(s);
  const qa = (s)=>Array.from(document.querySelectorAll(s));
  const host = ()=> q(SEL.host1) || q(SEL.host2) || null;

  function setBodyFlag(on){
    document.body.classList.toggle('is-inspector', !!on);
    document.body.classList.toggle('inspector-open', !!on);
  }
  function setHostOpen(on){
    const h = host(); if (!h) return;
    h.classList.toggle('open', !!on);
    if (on){
      h.style.removeProperty('display');
      h.style.removeProperty('visibility');
      h.style.removeProperty('opacity');
      h.removeAttribute('hidden');
    }
  }
  function isOpen(){
    const h = host();
    return document.body.classList.contains('is-inspector') || (h && h.classList.contains('open'));
  }

  function ensureIdsAndLinkTabs(){
    const views = qa('#inspector .insp-content > .insp-view, #inspector .insp-content > .insp-frame');
    const tabs  = qa(SEL.tabs);
    if (!views.length) return;
    views.forEach((v,i)=>{ if (!v.id && !v.getAttribute('data-tab')) v.id = 'insp-auto-' + i; });
    tabs.forEach((t,i)=>{
      const has = t.hasAttribute('aria-controls') || t.hasAttribute('data-tab');
      if (!has){
        const v = views[i] || views[0];
        if (v?.id) t.setAttribute('aria-controls', v.id);
      }
    });
  }

  function ensureActiveView(prefKey){
    let views = qa(SEL.views);
    if (!views.length) views = qa('#inspector .insp-frame, #inspector .insp-view');
    if (!views.length) return;
    const hasActive = views.some(v => v.classList.contains('is-active') || getComputedStyle(v).display !== 'none');
    if (hasActive) return;
    const stored = localStorage.getItem(LAST_KEY) || '';
    let target =
      (stored && (q(`#insp-${stored}`) || q(`#inspector .insp-view[data-tab="${stored}"], #inspector .insp-frame[data-tab="${stored}"]`))) ||
      (prefKey && (q('#'+prefKey) || q(`#inspector .insp-view[data-tab="${prefKey}"], #inspector .insp-frame[data-tab="${prefKey}"]`))) ||
      q('#insp-logs') ||
      q('#inspector .insp-view[data-tab="logs"], #inspector .insp-frame[data-tab="logs"]') ||
      views[0];
    views.forEach(v => v.classList.toggle('is-active', v === target));
    LOGI('ensureActiveView →', (target && (target.id || target.getAttribute('data-tab'))) || '(erste)');
  }

  function syncAriaFromActive(){
    let views = qa(SEL.views);
    if (!views.length) views = qa('#inspector .insp-frame, #inspector .insp-view');
    const tabs  = qa(SEL.tabs);
    if (!views.length || !tabs.length) return;
    const active =
      views.find(v => v.classList.contains('is-active')) ||
      views.find(v => getComputedStyle(v).display !== 'none');
    if (!active) return;
    const activeId  = active.id || '';
    const activeKey = active.getAttribute('data-tab') || activeId;
    tabs.forEach(t => {
      const ctrl = t.getAttribute('aria-controls');
      const tkey = t.getAttribute('data-tab') || ctrl || '';
      t.setAttribute('aria-selected', String(tkey === activeKey));
    });
  }

  function pingRefresh(activeKey){
    try{ window.dispatchEvent(new CustomEvent('req:insp:refresh')); }catch{}
    if (activeKey){
      try{ window.dispatchEvent(new CustomEvent(`req:insp:${activeKey}:refresh`)); }catch{}
    }
  }

  const API = {
    open(tabKey){
      window.Inspector?.open?.(tabKey);
      setBodyFlag(true); setHostOpen(true);
      ensureIdsAndLinkTabs(); ensureActiveView(tabKey); syncAriaFromActive();
      window.dispatchEvent(new CustomEvent('cb:inspector:open'));
      window.dispatchEvent(new CustomEvent('cb:insp:open'));
      window.dispatchEvent(new CustomEvent('inspector:ready'));
      pingRefresh(tabKey || localStorage.getItem(LAST_KEY) || 'logs');
    },
    close(){
      window.Inspector?.close?.();
      setHostOpen(false); setBodyFlag(false);
      window.dispatchEvent(new CustomEvent('cb:inspector:close'));
    },
    toggle(tabKey){
      window.Inspector?.toggle?.(tabKey);
      const nowOpen = !isOpen();
      setHostOpen(nowOpen); setBodyFlag(nowOpen);
      if (nowOpen){
        ensureIdsAndLinkTabs(); ensureActiveView(tabKey); syncAriaFromActive();
        window.dispatchEvent(new CustomEvent('inspector:ready'));
        pingRefresh(tabKey || localStorage.getItem(LAST_KEY) || 'logs');
      } else {
        window.dispatchEvent(new CustomEvent('cb:inspector:close'));
      }
    },
    exportLogsJSON(){
      const root = document.querySelector('#inspector [data-slot="logs-view"]') || document.getElementById('logs-list')?.parentElement;
      if (!root){ LOGW('Logs-Slot fehlt'); return; }
      const rows = Array.from(root.querySelectorAll('.insp-logline')).map(el=>{
        const lvl = ['ok','info','warn','error'].find(c => el.classList.contains(c)) || 'info';
        const ts  = (el.querySelector('.ts')?.textContent||'').replace(/\[|\]/g,'') || '';
        const msg = el.querySelector('.txt')?.textContent || el.textContent || '';
        return { ts, lvl, msg: msg.trim() };
      });
      const blob = new Blob([JSON.stringify({ ts:new Date().toISOString(), count:rows.length, items:rows }, null, 2)], {type:'application/json'});
      const fname = `logs_${new Date().toISOString().replace(/[:\.]/g,'-')}.json`;
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a);
      a.click(); a.remove(); URL.revokeObjectURL(a.href);
      LOGO('JSON exportiert →', fname);
      window.dispatchEvent(new CustomEvent('cb:insp:export:logs', { detail:{ format:'json', count: rows.length }}));
    }
  };
  window.UIInspector = API;

  window.addEventListener('cb:insp:tab:change', (e)=>{
    const tabKey = e.detail?.tab || '';
    if (tabKey) { try { localStorage.setItem(LAST_KEY, tabKey); } catch(_){ } }
    ensureIdsAndLinkTabs();
    let target = null;
    if (tabKey){
      target = document.getElementById(`insp-${tabKey}`) ||
               q(`#inspector .insp-view[data-tab="${tabKey}"], #inspector .insp-frame[data-tab="${tabKey}"]`);
    }
    const views = qa(SEL.views);
    if (target) views.forEach(v => v.classList.toggle('is-active', v === target)); else ensureActiveView();
    syncAriaFromActive();
    pingRefresh(tabKey || localStorage.getItem(LAST_KEY) || 'logs');
  }, { passive:true });

  ['cb:insp:open','cb:inspector:open','req:insp:open'].forEach(evt=>{
    window.addEventListener(evt, ()=>{
      setBodyFlag(true); setHostOpen(true);
      ensureIdsAndLinkTabs(); ensureActiveView(); syncAriaFromActive();
    }, { passive:true });
  });

  function readyLog(){
    LOGO('bereit (Bridge v25.10.30-final-hotfix)');
    window.dispatchEvent(new Event('cb:inspector:ready'));
  }
  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', readyLog, { once:true })
    : readyLog();
})();

/* --- Delegation: Tab-Klick -> Event -------------------------------------- */
(function(){
  'use strict';
  document.addEventListener('click', (e)=>{
    const el = e.target.closest?.('#inspector .insp-tabs [role="tab"], #inspector .insp-tabs .insp-tab');
    if (!el) return;
    const key = (el.getAttribute('data-tab') || (el.getAttribute('aria-controls') || '').replace(/^insp-/, '') || '').trim();
    if (!key) return;
    window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail: { tab:key }}));
  }, { passive:true });
})();

/* --- Slot & Legacy-Ziele automatisch bereitstellen ------------------------ */
(function(){
  'use strict';
  const LEGACY = {
    logs:      ['logs-list','log-table','log-container'],
    build:     ['build-info','build-grid','build-cats','build-msg','build-count','build-table'],
    paths:     ['pf-events','pf-table','pf-overlay','pf-info'],
    resources: ['r-table','res-table','resource-grid'],
    tests:     ['t-table','test-container','test-grid'],
    ui:        ['ui-info','ui-table','ui-log'],
    diag:      ['diag-table','diag-grid']
  };
  const TAB_SLOTS = { logs:'logs-view', build:'build-view', paths:'paths-view',
    resources:'resources-view', tests:'tests-view', ui:'ui-view', diag:'diag-view' };

  const findView = (k)=> document.getElementById(`insp-${k}`)
    || document.querySelector(`#inspector .insp-content > .insp-view[data-tab="${k}"]`)
    || document.querySelector(`#inspector .insp-content > .insp-frame[data-tab="${k}"]`);

  function ensureSlot(view, slotName){
    if (!view || !slotName) return;
    let slot = view.querySelector(`[data-slot="${slotName}"]`);
    if (!slot){
      slot = document.createElement('div');
      slot.setAttribute('data-slot', slotName);
      slot.className = 'insp-slot pad';
      const hint = document.createElement('div'); hint.className = 'hint';
      hint.textContent = `(${slotName} – wartet auf Modul-Render)`;
      slot.appendChild(hint); view.appendChild(slot);
    }
  }

  function ensureTargetsFor(key){
    const view = findView(key); if (!view) return;
    ensureSlot(view, TAB_SLOTS[key]);
    (LEGACY[key]||[]).forEach(id=>{
      if (!view.querySelector('#'+id)){
        const c = document.createElement('div'); c.id = id; c.className = 'pad'; view.appendChild(c);
      }
    });
  }

  function ensureAll(){ Object.keys(TAB_SLOTS).forEach(ensureTargetsFor); }

  window.addEventListener('inspector:ready', ensureAll, { passive:true });
  window.addEventListener('cb:insp:open',    ensureAll, { passive:true });
  window.addEventListener('cb:insp:tab:change', (e)=> ensureTargetsFor(e.detail?.tab||'logs'), { passive:true });

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', ensureAll, { once:true })
    : ensureAll();
})();

/* --- Close-Guard (Header-X schließt immer zuverlässig) -------------------- */
(function(){
  'use strict';
  function hardClose(){
    if (window.UIInspector?.close) window.UIInspector.close();
    const h = document.getElementById('inspector') || document.getElementById('inspector-overlay');
    if (h) h.classList.remove('open');
    document.body.classList.remove('is-inspector','inspector-open');
    const btn = document.getElementById('btn-inspector'); if (btn) btn.hidden = false;
    try{ window.dispatchEvent(new CustomEvent('cb:inspector:close')); }catch{}
  }
  document.addEventListener('click', (e)=>{
    const closeBtn = e.target.closest?.('#inspector .insp-close'); if (!closeBtn) return;
    e.preventDefault(); hardClose();
  }, { passive:false });
  ['cb:inspector:close','req:insp:close'].forEach(evt=>{
    window.addEventListener(evt, hardClose, { passive:true });
  });

  /* --- Hotfix: Safe boot guard (max. 3 asynchrone Versuche) --------------- */
  let BOOT_DONE = false, BOOT_TRIES = 0;
  const bootGuard = () => {
    if (BOOT_DONE) return;
    const h = document.getElementById('inspector') || document.getElementById('inspector-overlay');
    if (!h) return;
    const open = document.body.classList.contains('is-inspector') || h.classList.contains('open');
    if (!open) return;
    const active = document.querySelector('#inspector .insp-content > .insp-frame.is-active, #inspector .insp-content > .insp-view.is-active');
    if (active) { BOOT_DONE = true; return; }
    if (BOOT_TRIES++ > 3) { BOOT_DONE = true; return; }
    setTimeout(()=> window.UIInspector?.open?.('logs'), 30);
  };
  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', bootGuard, { once:true })
    : bootGuard();
  window.addEventListener('cb:insp:open', bootGuard, { once:true, passive:true });
  window.addEventListener('inspector:ready', bootGuard, { once:true, passive:true });
})();