/* ============================================================================
 * Datei   : ui/ui-inspector.js
 * Projekt : Neue Siedler
 * Version : v25.10.30-final
 * Zweck   : Inspector-Bridge + Sichtbarkeits-Fallbacks (Tabs, Frames, data-tab)
 * Hinweise:
 *   • Unterstützt alte und neue Inspector-Struktur (.insp-view / .insp-frame)
 *   • Tabs können über ID (#insp-logs) ODER data-tab="logs" angesprochen werden.
 *   • Fallback sorgt dafür, dass beim Öffnen immer eine View sichtbar ist.
 * ============================================================================
 */

(function(){
  'use strict';

  const MOD = '[ui-inspector]';
  const LOGI = (window.CBLog?.info || console.info).bind(console, MOD);
  const LOGO = (window.CBLog?.ok   || console.log ).bind(console, MOD);
  const LOGW = (window.CBLog?.warn || console.warn).bind(console, MOD);
  const LOGE = (window.CBLog?.error|| console.error).bind(console, MOD);

  /* ------------------------------------------------------------------------
     Selektoren – erweitert für .insp-frame + data-tab
     ------------------------------------------------------------------------ */
  const SEL = {
    host1: '#inspector',
    host2: '#inspector-overlay',
    tabs : '#inspector .insp-tabs [role="tab"], #inspector .insp-tabs .insp-tab',
    views: '#inspector .insp-content .insp-view, #inspector .insp-content .insp-frame'
  };

  // Kurzhilfen
  function q(sel){ return document.querySelector(sel); }
  function qa(sel){ return Array.from(document.querySelectorAll(sel)); }
  function getHost(){ return q(SEL.host1) || q(SEL.host2) || null; }

  /* ------------------------------------------------------------------------
     Sichtbarkeits-Fallback (alte .insp-frame-Struktur)
     ------------------------------------------------------------------------ */
  function ensureActiveView(preferredId = 'insp-logs'){
    let views = qa(SEL.views);
    if (!views.length) return;

    const hasActive = views.some(v => v.classList.contains('is-active'));
    if (hasActive) return;

    // bevorzugt Logs-View (ID oder data-tab)
    let target = q('#insp-logs') ||
                 q('#inspector .insp-frame[data-tab="logs"], #inspector .insp-view[data-tab="logs"]') ||
                 views[0];

    views.forEach(v => v.classList.toggle('is-active', v === target));
    LOGI(`ensureActiveView → ${target?.id || target?.getAttribute('data-tab') || '(erste)'}`);
  }

  /* ------------------------------------------------------------------------
     Tabs/ARIA-Sync – robust gegen ID- oder data-tab-Struktur
     ------------------------------------------------------------------------ */
  function syncAriaFromActive(){
    let views = qa(SEL.views);
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

  /* ------------------------------------------------------------------------
     IDs/Links prüfen – falls Views keine IDs besitzen
     ------------------------------------------------------------------------ */
  function ensureIdsAndLinkTabs(){
    const host  = getHost();
    if (!host) return;

    const views = qa('#inspector .insp-content > .insp-view, #inspector .insp-content > .insp-frame');
    const tabs  = qa('#inspector .insp-tabs [role="tab"], #inspector .insp-tabs .insp-tab');
    if (!views.length) return;

    // Fehlende IDs auffüllen
    views.forEach((v,i)=>{ if (!v.id && !v.getAttribute('data-tab')) v.id = 'insp-auto-' + i; });

    // Tabs verknüpfen
    tabs.forEach((t,i)=>{
      const hasData = t.hasAttribute('aria-controls') || t.hasAttribute('data-tab');
      if (!hasData){
        const v = views[i] || views[0];
        if (v?.id) t.setAttribute('aria-controls', v.id);
      }
    });
  }

  /* ------------------------------------------------------------------------
     API (gekürzt auf Kernfunktionen)
     ------------------------------------------------------------------------ */
  const API = {
    open(tab){
      setBodyFlag(true);
      setHostOpen(true);
      ensureIdsAndLinkTabs();
      ensureActiveView();
      syncAriaFromActive();
      window.dispatchEvent(new Event('cb:inspector:open'));
    },
    close(){
      setHostOpen(false);
      setBodyFlag(false);
      window.dispatchEvent(new Event('cb:inspector:close'));
    },
    toggle(tab){
      const host = getHost();
      const nowOpen = !(host && (host.classList.contains('open')||document.body.classList.contains('is-inspector')));
      if (nowOpen){
        setBodyFlag(true); setHostOpen(true);
        ensureIdsAndLinkTabs(); ensureActiveView(); syncAriaFromActive();
      } else {
        setHostOpen(false); setBodyFlag(false);
      }
      window.dispatchEvent(new Event(nowOpen ? 'cb:inspector:open' : 'cb:inspector:close'));
    }
  };
  window.UIInspector = API;

  /* ------------------------------------------------------------------------
     Sichtbarkeits-Helfer
     ------------------------------------------------------------------------ */
  function setBodyFlag(on){
    document.body.classList.toggle('is-inspector', !!on);
    document.body.classList.toggle('inspector-open', !!on); // alte Variante
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

  /* ------------------------------------------------------------------------
     Events – Tab-Wechsel (IDs ODER data-tab)
     ------------------------------------------------------------------------ */
  window.addEventListener('cb:insp:tab:change', (e)=>{
    LOGI(`Tab gewechselt → ${e.detail?.tab||'unknown'}`);
    const tabId = e.detail?.tab;
    const allViews = qa(SEL.views);
    if (!allViews.length) { ensureActiveView(); syncAriaFromActive(); return; }

    let target = null;
    if (tabId){
      target = document.getElementById(`insp-${tabId}`) ||
               q(`#inspector .insp-content .insp-view[data-tab="${tabId}"], #inspector .insp-content .insp-frame[data-tab="${tabId}"]`);
    }

    if (target){
      allViews.forEach(v => v.classList.toggle('is-active', v === target));
    }else{
      ensureActiveView();
    }
    syncAriaFromActive();
  });

  /* ------------------------------------------------------------------------
     Init-Log
     ------------------------------------------------------------------------ */
  window.addEventListener('DOMContentLoaded', ()=>{
    LOGO('bereit (v25.10.30-final + Frame/data-tab Support)');
    ensureActiveView();
    syncAriaFromActive();
  });

})();
