/* ============================================================================
 * Datei   : ui/ui-inspector.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.30-final (+patches: final+1 / slot1 / legacy-targets / close-guard)
 * Zweck   : Inspector-Bridge (Open/Close/Exports/Bridges) + Fallbacks
 *           – Sichtbarkeit: body.is-inspector + Host.open
 *           – Active-View-Fallback: .insp-view/.insp-frame
 *           – ARIA-Sync (Tabs ↔ Views)
 *           – "Zuletzt aktiver Tab" merken (localStorage)
 *           – Slots & Legacy-IDs automatisch bereitstellen
 *           – Header-„X“ schließt immer zuverlässig (Close-Guard)
 *
 * Kopf-Kommentar / Mini-Doku:
 *   Lauscht  : cb:insp:open, cb:inspector:open, req:insp:open, cb:insp:tab:change
 *   Sendet   : inspector:ready, cb:inspector:open/close, req:insp:*:refresh
 *   Export   : window.UIInspector.{open,close,toggle,exportLogsJSON}
 *
 * Änderungslog (kurz):
 *   v25.10.30-final  : Grund-Bridge + Memory + Fallbacks
 *   v25.10.30-final+1: Tab-Delegation + Erstöffnungs-Guard
 *   v25.10.30-slot1  : Default-Slots pro Tab automatisch anlegen
 *   v25.10.30-legacy : Legacy-Container pro Tab bereitstellen + Refresh-Pings
 *   v25.10.30-close  : Header-„X“ schließt robust (kein Verschwinden des Zahnrads)
 * ============================================================================ */

(function(){
  'use strict';
  const MOD = '[ui-inspector]';
  const LOGI = (window.CBLog?.info || console.info).bind(console, MOD);
  const LOGO = (window.CBLog?.ok   || console.log ).bind(console, MOD);
  const LOGW = (window.CBLog?.warn || console.warn).bind(console, MOD);
  const LOGE = (window.CBLog?.error|| console.error).bind(console, MOD);

  /* ---------------------------------------------
   * [1] Selektoren / Helpers
   * ------------------------------------------- */
  const SEL = {
    host1: '#inspector',
    host2: '#inspector-overlay',
    tabs : '#inspector .insp-tabs [role="tab"], #inspector .insp-tabs .insp-tab',
    views: '#inspector .insp-content .insp-view, #inspector .insp-content .insp-frame'
  };
  const LAST_KEY = 'insp:lastTab';

  function q(sel){ return document.querySelector(sel); }
  function qa(sel){ return Array.from(document.querySelectorAll(sel)); }
  function getHost(){ return q(SEL.host1) || q(SEL.host2) || null; }
  function setBodyFlag(on){
    document.body.classList.toggle('is-inspector', !!on);
    document.body.classList.toggle('inspector-open', !!on); // Altkompatibel
  }
  function setHostOpen(on){
    const host = getHost(); if (!host) return;
    host.classList.toggle('open', !!on);
    if (on){
      host.style.removeProperty('display');
      host.style.removeProperty('visibility');
      host.style.removeProperty('opacity');
      host.removeAttribute('hidden');
    }
  }
  function isOpen(){
    return document.body.classList.contains('is-inspector')
        || (getHost()?.classList.contains('open'));
  }

  /* ---------------------------------------------
   * [2] Tabs/Views Hilfsfunktionen
   * ------------------------------------------- */
  function ensureIdsAndLinkTabs(){
    const host = getHost(); if (!host) return;
    const views = qa('#inspector .insp-content > .insp-view, #inspector .insp-content > .insp-frame');
    const tabs  = qa(SEL.tabs);
    if (!views.length) return;

    // 2.1 fehlende IDs nur vergeben, wenn weder ID noch data-tab existiert
    views.forEach((v,i)=>{ if (!v.id && !v.getAttribute('data-tab')) v.id = 'insp-auto-' + i; });

    // 2.2 Tabs verlinken, wenn GAR KEIN Target existiert
    tabs.forEach((t,i)=>{
      const hasData = t.hasAttribute('aria-controls') || t.hasAttribute('data-tab');
      if (!hasData){
        const v = views[i] || views[0];
        if (v?.id) t.setAttribute('aria-controls', v.id);
      }
    });
  }

  function ensureActiveView(preferredKey){
    // preferredKey: 'logs' (data-tab) ODER 'insp-logs' (ID)
    let views = qa(SEL.views);
    if (!views.length) views = qa('#inspector .insp-frame, #inspector .insp-view');
    if (!views.length) return;

    // Bereits aktiv?
    const hasActive = views.some(v => v.classList.contains('is-active') || getComputedStyle(v).display !== 'none');
    if (hasActive) return;

    // Präferenz: aus Speicher, sonst Parameter, sonst Logs, sonst erste
    const stored = localStorage.getItem(LAST_KEY) || '';
    let target =
      (stored && (q(`#insp-${stored}`) || q(`#inspector .insp-view[data-tab="${stored}"], #inspector .insp-frame[data-tab="${stored}"]`))) ||
      (preferredKey && (q('#'+preferredKey) || q(`#inspector .insp-view[data-tab="${preferredKey}"], #inspector .insp-frame[data-tab="${preferredKey}"]`))) ||
      q('#insp-logs') ||
      q('#inspector .insp-view[data-tab="logs"], #inspector .insp-frame[data-tab="logs"]') ||
      views[0];

    views.forEach(v => v.classList.toggle('is-active', v === target));
    LOGI(`ensureActiveView → ${(target && (target.id || target.getAttribute('data-tab'))) || '(erste)'}`);
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

  /* ---------------------------------------------
   * [3] Öffnen/Schließen API (kompatibel)
   * ------------------------------------------- */
  const API = {
    open(tabKey){   // tabKey: 'logs' | 'build' | ...
      // 3.1 Alt-API aufrufen (falls vorhanden), NICHT entfernt
      window.Inspector?.open?.(tabKey);
      // 3.2 Sichtbarkeit + Fallbacks
      setBodyFlag(true);
      setHostOpen(true);
      ensureIdsAndLinkTabs();
      ensureActiveView(tabKey);   // vereinfacht: data-tab ODER ID
      syncAriaFromActive();
      // 3.3 Events (Kompat-Modus) + Refresh-Pings
      window.dispatchEvent(new CustomEvent('cb:inspector:open'));
      window.dispatchEvent(new CustomEvent('cb:insp:open'));
      window.dispatchEvent(new CustomEvent('inspector:ready')); // wichtig: einige Tabs hören hierauf
      try{ window.dispatchEvent(new CustomEvent('req:insp:refresh')); }catch{}
      try{
        const k = (tabKey || localStorage.getItem('insp:lastTab') || 'logs');
        window.dispatchEvent(new CustomEvent(`req:insp:${k}:refresh`));
      }catch{}
    },
    close(){
      window.Inspector?.close?.();
      setHostOpen(false);
      setBodyFlag(false);
      window.dispatchEvent(new CustomEvent('cb:inspector:close'));
    },
    toggle(tabKey){
      window.Inspector?.toggle?.(tabKey);
      const nowOpen = !isOpen();
      setHostOpen(nowOpen);
      setBodyFlag(nowOpen);
      if (nowOpen){
        ensureIdsAndLinkTabs();
        ensureActiveView(tabKey); // vereinfacht
        syncAriaFromActive();
        window.dispatchEvent(new CustomEvent('inspector:ready'));
        try{ window.dispatchEvent(new CustomEvent('req:insp:refresh')); }catch{}
        try{
          const k = (tabKey || localStorage.getItem('insp:lastTab') || 'logs');
          window.dispatchEvent(new CustomEvent(`req:insp:${k}:refresh`));
        }catch{}
      }else{
        window.dispatchEvent(new CustomEvent('cb:inspector:close'));
      }
    },

    // Exporte (Beispiel)
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
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a);
      a.click(); a.remove(); URL.revokeObjectURL(a.href);
      LOGO(`JSON exportiert → ${fname}`);
      window.dispatchEvent(new CustomEvent('cb:insp:export:logs', { detail:{ format:'json', count: rows.length }}));
    }
  };

  // Global bereitstellen (NICHTS entfernt)
  window.UIInspector = API;

  /* ---------------------------------------------
   * [4] Tab-Wechsel & Memory
   * ------------------------------------------- */
  // 4.1 Merken des zuletzt aktiven Tabs + Aktivierung
  window.addEventListener('cb:insp:tab:change', (e)=>{
    const tabKey = e.detail?.tab;
    if (tabKey) {
      try { localStorage.setItem(LAST_KEY, tabKey); } catch(_){}
    }
    // Aktivierung robust, egal ob ID oder data-tab
    ensureIdsAndLinkTabs();
    let target = null;
    if (tabKey){
      target = document.getElementById(`insp-${tabKey}`) ||
               q(`#inspector .insp-view[data-tab="${tabKey}"], #inspector .insp-frame[data-tab="${tabKey}"]`);
    }
    const views = qa(SEL.views);
    if (target) views.forEach(v => v.classList.toggle('is-active', v === target));
    else ensureActiveView();
    syncAriaFromActive();

    // Refresh-Pings für das aktive Tab
    try{ window.dispatchEvent(new CustomEvent('req:insp:refresh')); }catch{}
    try{ if (tabKey) window.dispatchEvent(new CustomEvent(`req:insp:${tabKey}:refresh`)); }catch{}
  });

  // 4.2 Falls andere Open-Events genutzt werden → ebenfalls aktivieren
  ['cb:insp:open','cb:inspector:open','req:insp:open'].forEach(evt=>{
    window.addEventListener(evt, ()=>{
      setBodyFlag(true);
      setHostOpen(true);
      ensureIdsAndLinkTabs();
      ensureActiveView();   // nutzt gespeicherten Tab
      syncAriaFromActive();
    }, { passive:true });
  });

  /* ---------------------------------------------
   * [5] Start-Hooks (Hotkey/Btn-Bind hier DEAKTIVIERT)
   * ------------------------------------------- */
  function readyLog(){
    LOGO('bereit (Bridge v25.10.30-final; Hotkey/Btn-Bind extern)');
    window.dispatchEvent(new Event('cb:inspector:ready'));
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=> readyLog(), { once:true });
  }else{
    readyLog();
  }

  // Hinweis zu frühem Spielstart:
  // [FIX-PENDING] Spielstart-Trigger liegt aktuell ggf. im BootManager.
  // Sollte wieder ins Startpanel (ui-start.js) verlagert werden, damit HUD/Assets
  // erst nach Bestätigung starten. (Nur Hinweis; KEINE Änderung hier.)
})();

/* +++ Patch-Zusatz: v25.10.30-final+1 (Delegation + Erstöffnungs-Guard) +++ */
(function(){
  'use strict';

  // [B1] Delegation: Tab-Klick → cb:insp:tab:change (falls Core es nicht feuert)
  document.addEventListener('click', (e)=>{
    const el = e.target.closest?.('#inspector .insp-tabs [role="tab"], #inspector .insp-tabs .insp-tab');
    if (!el) return;
    const key =
      (el.getAttribute('data-tab') || (el.getAttribute('aria-controls') || '').replace(/^insp-/, '') || '').trim();
    if (!key) return;
    window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail: { tab:key }}));
  });

  // [B2] Erstöffnungs-Guard: wenn offen & keine aktive View → logs
  const bootGuard = () => {
    const host = document.getElementById('inspector') || document.getElementById('inspector-overlay');
    if (!host) return;
    const open = document.body.classList.contains('is-inspector') || host.classList.contains('open');
    if (!open) return;
    const active = document.querySelector('#inspector .insp-content > .insp-frame.is-active, #inspector .insp-content > .insp-view.is-active');
    if (!active && window.UIInspector?.open){
      window.UIInspector.open('logs');
    }
  };
  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', bootGuard, { once:true })
    : bootGuard();
  window.addEventListener('inspector:ready', bootGuard, { passive:true });

})();

/* +++ Patch-Zusatz: Slot-Autofixer v25.10.30-slot1 +++ */
(function(){
  'use strict';

  // 1) Mapping: Tab-Key -> data-slot Name
  const TAB_SLOTS = {
    logs:      'logs-view',
    build:     'build-view',
    paths:     'paths-view',
    resources: 'resources-view',
    tests:     'tests-view',
    ui:        'ui-view',
    diag:      'diag-view'
  };

  // 2) Hilfen: View für Tab-Key finden
  function findViewFor(key){
    return (
      document.getElementById(`insp-${key}`) ||
      document.querySelector(`#inspector .insp-content > .insp-view[data-tab="${key}"]`) ||
      document.querySelector(`#inspector .insp-content > .insp-frame[data-tab="${key}"]`)
    );
  }

  // 3) Slot in einem View sicherstellen (falls fehlt)
  function ensureSlot(viewEl, slotName){
    if (!viewEl || !slotName) return null;
    let slot = viewEl.querySelector(`[data-slot="${slotName}"]`);
    if (!slot){
      slot = document.createElement('div');
      slot.setAttribute('data-slot', slotName);
      slot.className = 'insp-slot pad';
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = `(${slotName} – wartet auf Modul-Render)`;
      slot.appendChild(hint);
      viewEl.appendChild(slot);
    }
    return slot;
  }

  // 4) Alle bekannten Tabs durchgehen und Slot garantieren
  function ensureDefaultSlots(){
    Object.entries(TAB_SLOTS).forEach(([key, slotName])=>{
      const view = findViewFor(key);
      if (view) ensureSlot(view, slotName);
    });
  }

  // 5) In Lebenspunkte einklinken
  window.addEventListener('inspector:ready', ensureDefaultSlots, { passive:true });
  window.addEventListener('cb:insp:open',    ensureDefaultSlots, { passive:true });
  window.addEventListener('cb:insp:tab:change', ensureDefaultSlots, { passive:true });

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', ensureDefaultSlots, { once:true })
    : ensureDefaultSlots();

})();

/* +++ Patch-Zusatz: v25.10.30-legacy-targets +++ */
(function(){
  'use strict';

  const LEGACY = {
    logs:      ['logs-list', 'log-table', 'log-container'],
    build:     ['build-info','build-grid','build-cats','build-msg','build-count','build-table'],
    paths:     ['pf-events','pf-table','pf-overlay','pf-info'],
    resources: ['r-table','res-table','resource-grid'],
    tests:     ['t-table','test-container','test-grid'],
    ui:        ['ui-info','ui-table','ui-log'],
    diag:      ['diag-table','diag-grid']
  };

  function findViewFor(key){
    return (
      document.getElementById(`insp-${key}`) ||
      document.querySelector(`#inspector .insp-content > .insp-view[data-tab="${key}"]`) ||
      document.querySelector(`#inspector .insp-content > .insp-frame[data-tab="${key}"]`)
    );
  }

  function ensureTargetsFor(key){
    const view = findViewFor(key);
    if (!view) return;

    // 1) data-slot (fallback)
    const slotName = `${key}-view`; 
    if (!view.querySelector(`[data-slot="${slotName}"]`)){
      const slot = document.createElement('div');
      slot.setAttribute('data-slot', slotName);
      slot.className = 'insp-slot pad';
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = `(${slotName} – wartet auf Modul-Render)`;
      slot.appendChild(hint);
      view.appendChild(slot);
    }

    // 2) Legacy-IDs
    (LEGACY[key] || []).forEach(id=>{
      if (!view.querySelector('#'+id)){
        const c = document.createElement('div');
        c.id = id;
        c.className = 'pad';
        view.appendChild(c);
      }
    });
  }

  function ensureAllTargets(){
    Object.keys(LEGACY).forEach(ensureTargetsFor);
  }

  function pingRefresh(activeKey){
    ['req:insp:refresh',
     'req:insp:logs:refresh',
     'req:insp:build:refresh',
     'req:insp:paths:refresh',
     'req:insp:resources:refresh',
     'req:insp:tests:refresh',
     'req:insp:ui:refresh'
    ].forEach(name => { try{ window.dispatchEvent(new CustomEvent(name)); }catch{} });
    if (activeKey){
      try{ window.dispatchEvent(new CustomEvent(`req:insp:${activeKey}:refresh`)); }catch{}
    }
  }

  window.addEventListener('inspector:ready',  ()=>{ ensureAllTargets(); pingRefresh(); }, { passive:true });
  window.addEventListener('cb:insp:open',      ()=>{ ensureAllTargets(); pingRefresh(); }, { passive:true });
  window.addEventListener('cb:insp:tab:change',(e)=>{ const k=e.detail?.tab; ensureTargetsFor(k||'logs'); pingRefresh(k||'logs'); }, { passive:true });

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', ()=>{ ensureAllTargets(); pingRefresh(); }, { once:true })
    : (ensureAllTargets(), pingRefresh());

})();

/* +++ Patch: v25.10.30-close-guard (Header-X) +++ */
(function(){
  'use strict';

  function hardClose(){
    if (window.UIInspector?.close) window.UIInspector.close();
    const host = document.getElementById('inspector') || document.getElementById('inspector-overlay');
    if (host) host.classList.remove('open');
    document.body.classList.remove('is-inspector','inspector-open');
    const btn = document.getElementById('btn-inspector');
    if (btn) btn.hidden = false;
    try{ window.dispatchEvent(new CustomEvent('cb:inspector:close')); }catch{}
  }

  document.addEventListener('click', (e)=>{
    const closeBtn = e.target.closest?.('#inspector .insp-close');
    if (!closeBtn) return;
    e.preventDefault();
    hardClose();
  }, { passive:false });

  ['cb:inspector:close','req:insp:close'].forEach(evt=>{
    window.addEventListener(evt, ()=> hardClose(), { passive:true });
  });

})();
