/* ============================================================================
 * Datei   : ui/ui-inspector.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.31-bridge-passive+api
 * Zweck   : Tabs/ARIA nur UI-seitig. Sichtbarkeit NICHT hier.
 *           Stellt kompatible window.UIInspector-API bereit.
 * ============================================================================ */
(function(){
  'use strict';
  const MOD = '[ui-inspector]';
  const log = (t)=> (window.CBLog?.info||console.log)(MOD, t);

  const SEL = {
    tabs : '#inspector .insp-tabs [role="tab"], #inspector .insp-tabs .insp-tab',
    views: '#inspector .insp-content .insp-view, #inspector .insp-content .insp-frame'
  };
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // ---- UI: Tabs/ARIA -------------------------------------------------------
  function ensureIdsAndLinkTabs(){
    const views = $$(SEL.views);
    const tabs  = $$(SEL.tabs);
    views.forEach((v,i)=>{ if (!v.id && !v.getAttribute('data-tab')) v.id = 'insp-auto-'+i; });
    tabs.forEach((t,i)=>{
      if (!t.hasAttribute('aria-controls') && !t.getAttribute('data-tab')){
        const v = views[i] || views[0];
        if (v?.id) t.setAttribute('aria-controls', v.id);
      }
    });
  }
  function activateByKey(key){
    const views = $$(SEL.views); if (!views.length) return;
    let target = null;
    if (key){
      target = $('#insp-'+key) || $(`#inspector .insp-view[data-tab="${key}"], #inspector .insp-frame[data-tab="${key}"]`);
    }
    if (!target) target = views[0];
    views.forEach(v => v.classList.toggle('is-active', v === target));
    const tabs = $$(SEL.tabs);
    const activeKey = target.getAttribute('data-tab') || target.id;
    tabs.forEach(t=>{
      const tkey = t.getAttribute('data-tab') || t.getAttribute('aria-controls');
      t.setAttribute('aria-selected', String(!!tkey && (tkey === activeKey || ('#'+activeKey)===tkey)));
    });
  }
  document.addEventListener('click', (e)=>{
    const el = e.target.closest?.(SEL.tabs);
    if (!el) return;
    const key = el.getAttribute('data-tab') || (el.getAttribute('aria-controls')||'').replace(/^insp-/, '');
    if (!key) return;
    window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab:key }}));
  }, { passive:true });

  function onOpened(){
    ensureIdsAndLinkTabs();
    // Standardmäßig Logs aktivieren, wenn nichts anderes gesetzt ist
    const anyActive = $(`#inspector .insp-content .is-active`);
    activateByKey(anyActive ? null : 'logs');
    log('geöffnet (UI vorbereitet)');
  }
  window.addEventListener('cb:insp:open',      onOpened, { passive:true });
  window.addEventListener('cb:inspector:open', onOpened, { passive:true });

  window.addEventListener('cb:insp:tab:change', (e)=>{
    ensureIdsAndLinkTabs(); activateByKey(e.detail?.tab);
  }, { passive:true });

  // ---- Kompatible API (wie früher) ----------------------------------------
  // Nur Requests senden; Core schaltet sichtbar.
  const API = {
    open(tab){ window.dispatchEvent(new CustomEvent('req:insp:open'));  if (tab){ window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab } })); } },
    close(){  window.dispatchEvent(new CustomEvent('req:insp:close')); },
    toggle(){ window.dispatchEvent(new CustomEvent('req:insp:toggle')); },
    isOpen(){ return document.body.classList.contains('is-inspector') || document.body.classList.contains('inspector-open'); }
  };
  window.UIInspector = API;

  // Ready-Log (Kompat zu deiner früheren Prüfung)
  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', ()=> (window.CBLog?.ok||console.log)('[ui-inspector] bereit'), { once:true })
    : (window.CBLog?.ok||console.log)('[ui-inspector] bereit');

})();
