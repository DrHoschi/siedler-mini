/* ============================================================================
 * Datei   : ui/inspector/inspector.button-bind.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.31-bind6
 * Zweck   : Zahnrad-Button (Toggle) + robustes Öffnen/Schließen (iOS-fest)
 *           – Touch→Click Shim (iOS)
 *           – Toggle: open ODER close
 *           – Close räumt Body/Host-Flags immer auf
 * ============================================================================ */

(() => {
  'use strict';
  const MOD = '[insp-bind]';
  const log  = (m,...a)=> (window.CBLog?.info||console.log).call(console, MOD, m, ...a);
  const warn = (m,...a)=> (window.CBLog?.warn||console.warn).call(console, MOD, m, ...a);

  const BTN_ID = 'btn-inspector';
  const SAFETY_STYLE_ID = 'insp-safety';
  let wired = false;
  let closeGuard = 0;     // zählt "wir schließen gerade"
  let fallbackTimer = 0;  // geplanter Self-Open Fallback

  const $  = (s)=>document.querySelector(s);
  const $$ = (s)=>Array.from(document.querySelectorAll(s));

  const host = ()=> document.getElementById('inspector') || document.getElementById('inspector-overlay');
  const isOpen = ()=> document.body.classList.contains('is-inspector') || host()?.classList.contains('open');

  function bringToFront(el){
    if (!el) return;
    Object.assign(el.style, {
      position: 'fixed',
      right: '12px',
      bottom: '12px',
      width: '46px',
      height: '46px',
      zIndex: '2147483647',
      pointerEvents: 'auto',
      touchAction: 'manipulation',
    });
  }

  function ensureSafetyCSS(){
    if (document.getElementById(SAFETY_STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = SAFETY_STYLE_ID;
    s.textContent = `
      body.is-inspector #inspector, body.is-inspector #inspector-overlay{display:block!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important}
      #inspector.open, #inspector-overlay.open{display:block!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important}
      #inspector .insp-content > .insp-view, #inspector .insp-content > .insp-frame{display:none!important}
      #inspector .insp-content > .insp-view.is-active, #inspector .insp-content > .insp-frame.is-active{display:block!important}
    `;
    document.head.appendChild(s);
  }

  function activateLogs(){
    const logs =
      $('#insp-logs') ||
      $('#inspector .insp-view[data-tab="logs"]') ||
      $('#inspector .insp-frame[data-tab="logs"]');
    if (logs){
      $$('#inspector .insp-content > .insp-view, #inspector .insp-content > .insp-frame')
        .forEach(v=> v.classList.remove('is-active'));
      logs.classList.add('is-active');
    }
  }

  function enforceOpen(){
    if (closeGuard) return; // gerade am Schließen → nicht wieder aufmachen
    ensureSafetyCSS();
    document.body.classList.add('is-inspector','inspector-open');
    host()?.classList.add('open');
    activateLogs();
  }

  function cancelFallback(){
    if (fallbackTimer){
      clearTimeout(fallbackTimer);
      fallbackTimer = 0;
    }
  }

  function openInspectorRobust(tab='logs'){
    cancelFallback();
    try{
      if (window.UIInspector?.open) window.UIInspector.open(tab);
      else if (window.Inspector?.open) window.Inspector.open(tab);
    }catch(_){}
    try{
      window.dispatchEvent(new CustomEvent('req:insp:open'));
      window.dispatchEvent(new CustomEvent('cb:insp:open'));
      window.dispatchEvent(new CustomEvent('inspector:ready'));
    }catch(_){}
    // kurzer Fallback, falls Bridge zu spät rendert
    fallbackTimer = setTimeout(()=> { fallbackTimer = 0; enforceOpen(); }, 80);
  }

  function clearFlags(){
    document.body.classList.remove('is-inspector','inspector-open');
    const h = host(); if (h) h.classList.remove('open');
  }

  function closeInspectorRobust(){
    closeGuard++; // signalisiert: wir wollen wirklich schließen
    cancelFallback();

    // 1) API
    try{
      if (window.UIInspector?.close) window.UIInspector.close();
      else if (window.Inspector?.close) window.Inspector.close();
    }catch(_){}

    // 2) Events
    try{
      window.dispatchEvent(new CustomEvent('req:insp:close'));
      window.dispatchEvent(new CustomEvent('cb:insp:close'));
      window.dispatchEvent(new CustomEvent('cb:inspector:close'));
    }catch(_){}

    // 3) Flags im DOM wirklich entfernen
    clearFlags();

    // 4) kleine Entprellung
    setTimeout(()=> { closeGuard = Math.max(0, closeGuard-1); }, 120);
  }

  function toggleInspector(){
    isOpen() ? closeInspectorRobust() : openInspectorRobust('logs');
  }

  function topElementOver(el){
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cx = Math.round(r.left + r.width/2), cy = Math.round(r.top + r.height/2);
    const top = document.elementFromPoint(cx, cy);
    return (top && top !== el) ? top : null;
  }

  function ensureDomButton(){
    let btn = document.getElementById(BTN_ID);
    if (!btn){
      btn = document.createElement('button');
      btn.id = BTN_ID;
      btn.setAttribute('aria-label','Inspector');
      btn.textContent = '⚙️';
      document.body.appendChild(btn);
    }
    bringToFront(btn);
    return btn;
  }

  function wire(){
    if (wired) return;
    // Zahnrad
    const old = ensureDomButton();
    old.replaceWith(old.cloneNode(true));
    const btn = document.getElementById(BTN_ID);
    bringToFront(btn);

    // Touch→Click Shim (iOS)
    btn.addEventListener('touchend', (ev)=>{
      ev.preventDefault();
      ev.stopPropagation();
      const top = topElementOver(btn);
      if (top){ top.style.pointerEvents = 'none'; setTimeout(()=> top.style.pointerEvents = '', 200); }
      btn.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true }));
    }, { passive:false });

    // Toggle per Click
    btn.addEventListener('click', (ev)=>{
      ev.preventDefault();
      ev.stopPropagation();
      toggleInspector();
    }, { passive:false });

    // Delegation: X-Button im Frame schließt
    document.addEventListener('click', (ev)=>{
      const x = ev.target.closest?.('#inspector .insp-close, #inspector-overlay .insp-close');
      if (!x) return;
      ev.preventDefault();
      ev.stopPropagation();
      closeInspectorRobust();
    }, { passive:false });

    // ESC → Close
    window.addEventListener('keydown', (ev)=>{
      if (ev.key === 'Escape' && isOpen()){
        ev.preventDefault();
        closeInspectorRobust();
      }
    }, { passive:false });

    // Wenn Inspector „ready“ meldet → Button oben halten
    window.addEventListener('inspector:ready', ()=> bringToFront(btn), { passive:true });

    wired = true;
    log('Button/Hotkey-Handler gebunden (v25.10.31-bind6, Toggle aktiv)');
  }

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', wire, { once:true })
    : wire();

})();
