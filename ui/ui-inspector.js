/* ============================================================================
 * Datei   : ui/ui-inspector.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.31-bridge-passive
 * Zweck   : Tabs/ARIA/Active-View – ABER KEINE Sichtbarkeitssteuerung!
 *
 * Lauscht : cb:insp:open, cb:inspector:open (Kompat), cb:insp:tab:change
 * Sendet  : (nichts bzgl. Open/Close)
 * ============================================================================ */
(function(){
  'use strict';

  const MOD = '[ui-inspector]';
  const LOGI = (window.CBLog?.info||console.log).bind(console, MOD);

  const SEL = {
    tabs : '#inspector .insp-tabs [role="tab"], #inspector .insp-tabs .insp-tab',
    views: '#inspector .insp-content .insp-view, #inspector .insp-content .insp-frame'
  };
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

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
    const views = $$(SEL.views);
    if (!views.length) return;
    let target = null;
    if (key){
      target = $('#insp-'+key) || $(`#inspector .insp-view[data-tab="${key}"], #inspector .insp-frame[data-tab="${key}"]`);
    }
    if (!target) target = views[0];
    views.forEach(v => v.classList.toggle('is-active', v === target));
    // ARIA selected sync
    const tabs = $$(SEL.tabs);
    const activeKey = target.getAttribute('data-tab') || target.id;
    tabs.forEach(t=>{
      const tkey = t.getAttribute('data-tab') || t.getAttribute('aria-controls');
      t.setAttribute('aria-selected', String(!!tkey && (tkey === activeKey || ('#'+activeKey)===tkey)));
    });
  }

  // Tab-Klick → cb:insp:tab:change (nur UI)
  document.addEventListener('click', (e)=>{
    const el = e.target.closest?.(SEL.tabs);
    if (!el) return;
    const key = el.getAttribute('data-tab') || (el.getAttribute('aria-controls')||'').replace(/^insp-/, '');
    if (!key) return;
    window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab:key }}));
  }, { passive:true });

  // Reagiere auf Open → nur Tabs/ARIA vorbereiten
  function onOpened(){
    ensureIdsAndLinkTabs();
    activateByKey('logs'); // Default
    LOGI('bereit (Bridge-passive)');
  }
  window.addEventListener('cb:insp:open',       onOpened, { passive:true });
  window.addEventListener('cb:inspector:open',  onOpened, { passive:true });

  // Tab-Wechsel
  window.addEventListener('cb:insp:tab:change', (e)=>{
    const key = e.detail?.tab;
    ensureIdsAndLinkTabs();
    activateByKey(key);
  }, { passive:true });

})();
