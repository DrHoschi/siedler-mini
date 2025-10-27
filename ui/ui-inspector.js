/* ============================================================================
 * Datei   : ui/ui-inspector.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.30-final
 * Zweck   : Inspector-Bridge (Open/Close/Exports/Bridges) + Fallbacks:
 *           - Sichtbarkeit: body.is-inspector + Host.open
 *           - Active-View-Fallback: .insp-view/.insp-frame
 *           - ARIA-Sync (Tabs ↔ Views)
 *           - "Zuletzt aktiver Tab" merken (localStorage)
 *
 * Hinweise:
 *   • Nichts gelöscht – Altpfade bleiben (window.Inspector.*). Neue Logik nur ergänzt.
 *   • Hotkey/Btn-Bind ist HIER deaktiviert, weil du inspector.button-bind.js nutzt.
 *   • UI-Tab "leer": CSS deckt .insp-frame ab; hier zusätzlich ensureActiveView().
 *   • Events: cb:inspector:open / cb:insp:open / inspector:ready (Kompat-Modus)
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
    // preferredKey: 'insp-logs' ODER 'logs' (data-tab)
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
      ensureActiveView(tabKey ? (tabKey.startsWith('insp-') ? tabKey : tabKey) : undefined);
      syncAriaFromActive();
      // 3.3 Events (Kompat-Modus)
      window.dispatchEvent(new CustomEvent('cb:inspector:open'));
      window.dispatchEvent(new CustomEvent('cb:insp:open'));
      window.dispatchEvent(new CustomEvent('inspector:ready')); // wichtig: einige Tabs hören hierauf
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
        ensureActiveView(tabKey ? (tabKey.startsWith('insp-') ? tabKey : tabKey) : undefined);
        syncAriaFromActive();
        window.dispatchEvent(new CustomEvent('inspector:ready'));
      }else{
        window.dispatchEvent(new CustomEvent('cb:inspector:close'));
      }
    },

    // Exporte (unverändert – Beispiel)
    exportLogsJSON(){
      const root = document.querySelector('#inspector [data-slot="logs-view"]');
      if (!root){ LOGW('Logs-Slot fehlt'); return; }
      const rows = Array.from(root.querySelectorAll('.insp-logline')).map(el=>{
        const lvl = ['ok','info','warn','error'].find(c => el.classList.contains(c)) || 'info';
        const ts  = (el.querySelector('.ts')?.textContent||'').replace(/\[|\]/g,'');
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
  // 4.1 Merken des zuletzt aktiven Tabs
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
