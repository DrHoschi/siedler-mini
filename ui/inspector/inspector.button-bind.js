/* ============================================================================
 * Datei   : ui/inspector/inspector.button-bind.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.31-bind4
 * Zweck   : Stabiler Binder für den Zahnrad-Button (#btn-inspector)
 *           – iOS Touch→Click Shim (passive:false)
 *           – zIndex/PointerEvents-Hardening
 *           – Overlay-Blocker umgehen (elementFromPoint)
 *           – Erster Open = Logs-View
 * ============================================================================
 */

(() => {
  'use strict';
  const MOD = '[insp-bind]';
  const log  = (m,...a)=> (window.CBLog?.info||console.log).call(console, MOD, m, ...a);
  const warn = (m,...a)=> (window.CBLog?.warn||console.warn).call(console, MOD, m, ...a);
  const err  = (m,...a)=> (window.CBLog?.error||console.error).call(console, MOD, m, ...a);

  const BTN_ID = 'btn-inspector';
  let wired = false;

  // Hilfen
  const $ = sel => document.querySelector(sel);
  function bringToFront(el){
    if (!el) return;
    Object.assign(el.style, {
      position: 'fixed',
      right: '12px',
      bottom: '12px',
      width: '46px',
      height: '46px',
      zIndex: '2147483647',     // ganz oben
      pointerEvents: 'auto',
      touchAction: 'manipulation',
    });
  }
  // Prüft, ob “Top-Element” über dem Button liegt (DOM-Overlay) und gibt es zurück
  function getTopElementOver(el){
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cx = Math.round(r.left + r.width  / 2);
    const cy = Math.round(r.top  + r.height / 2);
    const topEl = document.elementFromPoint(cx, cy);
    return (topEl && topEl !== el) ? topEl : null;
  }

  function ensureDomButton(){
    // Falls der Button (noch) nicht existiert, legen wir ihn schlank an
    let btn = document.getElementById(BTN_ID);
    if (!btn){
      btn = document.createElement('button');
      btn.id = BTN_ID;
      btn.setAttribute('aria-label','Inspector');
      btn.textContent = '⚙️'; // Icon wird von CSS überdeckt – egal
      document.body.appendChild(btn);
    }
    bringToFront(btn);
    return btn;
  }

  function openInspector(tab='logs'){
    try{
      // nutzt unsere Bridge (ui-inspector.js), fällt andernfalls auf Alt-API zurück
      if (window.UIInspector?.open) window.UIInspector.open(tab);
      else if (window.Inspector?.open) window.Inspector.open(tab);
    }catch(e){ err('open fail', e); }
  }

  function wire(){
    if (wired) return;
    const btn = ensureDomButton();

    // iOS: erster Touch erzeugt synthetischen Click (passive:false, sonst preventDefault nicht erlaubt)
    const touchHandler = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      // Wenn ein Overlay drüberliegt, den Button noch mal ganz oben fixen
      const top = getTopElementOver(btn);
      if (top){
        // Workaround: kurz pointerEvents abschalten und Button “noch höher”
        top.style.pointerEvents = 'none';
        bringToFront(btn);
        setTimeout(()=> { top.style.pointerEvents = ''; }, 250);
      }

      // synthetischer Click
      btn.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true }));
    };

    // Click öffnet direkt den Inspector (erste View = Logs)
    const clickHandler = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openInspector('logs');
    };

    // Doppelte Bindings vermeiden
    btn.replaceWith(btn.cloneNode(true));
    const realBtn = document.getElementById(BTN_ID);
    bringToFront(realBtn);

    // Events
    realBtn.addEventListener('touchend', touchHandler, { passive:false });
    realBtn.addEventListener('click',    clickHandler, { passive:false });

    // Sicherheitsnetz: Wenn Inspector offen ist, Button weiterhin klickbar halten
    window.addEventListener('inspector:ready', () => bringToFront(realBtn), { passive:true });

    wired = true;
    log('Button/Hotkey-Handler gebunden (v25.10.31-bind4)');
  }

  // DOM Ready → binden
  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', wire, { once:true })
    : wire();

})();
