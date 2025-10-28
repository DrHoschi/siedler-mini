/* ============================================================================
 * Datei   : ui/inspector/inspector.button-bind.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.31-bind5
 * Zweck   : Stabiler Zahnrad-Button-Binder (iOS-fest + „Self-Open“-Fallback)
 *           – Touch→Click Shim (iOS Safari)
 *           – Click-Durchreichung (stopPropagation / preventDefault)
 *           – Z-Index/PointerEvents-Hardening
 *           – Öffnen via UIInspector.open + Events
 *           – Notfall: Erzwingt Sichtbarkeit + aktive „logs“-View
 * ============================================================================ */

(() => {
  'use strict';
  const MOD = '[insp-bind]';
  const log  = (m,...a)=> (window.CBLog?.info||console.log).call(console, MOD, m, ...a);
  const warn = (m,...a)=> (window.CBLog?.warn||console.warn).call(console, MOD, m, ...a);

  const BTN_ID = 'btn-inspector';
  const SAFETY_STYLE_ID = 'insp-safety';
  let wired = false;

  const $  = (s)=>document.querySelector(s);

  /** Button immer nach vorn, feste Größe/Position */
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

  /** Einfaches Safety-CSS: aktive View anzeigen, Host sichtbar */
  function ensureSafetyCSS(){
    if (document.getElementById(SAFETY_STYLE_ID)) return;
    const css = `
      /* safety open + view visibility */
      body.is-inspector #inspector, body.is-inspector #inspector-overlay{display:block!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important}
      #inspector.open, #inspector-overlay.open{display:block!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important}
      #inspector .insp-content > .insp-view, #inspector .insp-content > .insp-frame{display:none!important}
      #inspector .insp-content > .insp-view.is-active, #inspector .insp-content > .insp-frame.is-active{display:block!important}
    `.trim();
    const s = document.createElement('style');
    s.id = SAFETY_STYLE_ID;
    s.textContent = css;
    document.head.appendChild(s);
  }

  /** Notfall-Öffner: setzt Flags + aktiviert „logs“ wenn vorhanden */
  function enforceOpen(attempt=1){
    ensureSafetyCSS();

    // Flags setzen
    document.body.classList.add('is-inspector','inspector-open');
    const host = document.getElementById('inspector') || document.getElementById('inspector-overlay');
    if (host) host.classList.add('open');

    // „logs“ View suchen/aktivieren
    const logsView =
      $('#insp-logs') ||
      $('#inspector .insp-view[data-tab="logs"]') ||
      $('#inspector .insp-frame[data-tab="logs"]');

    if (logsView){
      // vorhandene Views deaktivieren, logs aktivieren
      document.querySelectorAll('#inspector .insp-content > .insp-view, #inspector .insp-content > .insp-frame')
        .forEach(v => v.classList.remove('is-active'));
      logsView.classList.add('is-active');
      log('Self-Open OK (logs aktiv).');
      return;
    }

    // noch kein View im DOM? kurz wiederholen (Bridge rendert gerade)
    if (attempt < 10){
      setTimeout(()=> enforceOpen(attempt+1), 120);
    }else{
      warn('Self-Open: keine „logs“-View gefunden (nach 10 Versuchen).');
    }
  }

  /** Normaler Öffner: API + Events + Fallback */
  function openInspectorRobust(tab='logs'){
    // 1) Bevorzugt Bridge-API
    try{
      if (window.UIInspector?.open) window.UIInspector.open(tab);
      else if (window.Inspector?.open) window.Inspector.open(tab);
    }catch(_){/* egal */ }

    // 2) Events feuern (für ältere Hörer)
    try{
      window.dispatchEvent(new CustomEvent('req:insp:open'));
      window.dispatchEvent(new CustomEvent('cb:insp:open'));
      window.dispatchEvent(new CustomEvent('inspector:ready')); // manche Tabs lauschen darauf
    }catch(_){/* egal */ }

    // 3) Fallback erzwingen (kurz verzögert, damit Bridge Zeit hat)
    requestAnimationFrame(()=> setTimeout(()=> enforceOpen(1), 60));
  }

  /** optional: was liegt über dem Button? */
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
      btn.textContent = '⚙️'; // (Skin kommt aus CSS, hier egal)
      document.body.appendChild(btn);
    }
    bringToFront(btn);
    return btn;
  }

  function wire(){
    if (wired) return;
    const btn = ensureDomButton();

    // sauberes Rebinden: Clone ersetzt alte Listener
    btn.replaceWith(btn.cloneNode(true));
    const b = document.getElementById(BTN_ID);
    bringToFront(b);

    // iOS Touch→Click Shim (der erste Tap wird so nicht „geschluckt“)
    b.addEventListener('touchend', (ev)=>{
      ev.preventDefault();
      ev.stopPropagation();

      // Wenn Overlay drüber liegt: kurz pointer-events kappen
      const top = topElementOver(b);
      if (top){ top.style.pointerEvents = 'none'; setTimeout(()=> top.style.pointerEvents = '', 200); }

      // synthetischer Click
      b.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true }));
    }, { passive:false });

    // Click → robust öffnen
    b.addEventListener('click', (ev)=>{
      ev.preventDefault();
      ev.stopPropagation();
      openInspectorRobust('logs');
    }, { passive:false });

    // Falls der Inspector später „bereit“ meldet → Button ganz oben halten
    window.addEventListener('inspector:ready', ()=> bringToFront(b), { passive:true });

    wired = true;
    log('Button/Hotkey-Handler gebunden (v25.10.31-bind5)');
  }

  // DOM ready → binden
  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', wire, { once:true })
    : wire();

})();
