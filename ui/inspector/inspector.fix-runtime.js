/* ============================================================================
 * ui/inspector/inspector.fix-runtime.js
 * Stellt sicher, dass der alte Inspector-Split zur Laufzeit benutzbar ist:
 * - Overlay sichtbar/bedienbar (pointer-events, z-index)
 * - DOM-Slots vorhanden (Builder-Init nachholen, falls nötig)
 * - Tab-Buttons binden (cb:insp:tab:change)
 * - offene/zu-API nutzen (Inspector.open/close/toggle), falls vorhanden
 * ========================================================================== */
(function(){
  'use strict';
  const LOG  = (window.CBLog?.info  || console.info).bind(console, '[insp-fix]');
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, '[insp-fix]');
  const ERR  = (window.CBLog?.error || console.error).bind(console, '[insp-fix]');

  const H = () => document.getElementById('inspector');

  /** 1) Sichtbarkeit/Bedienbarkeit erzwingen (aber ohne Hacks, nur sanft) */
  function ensureInteractable(){
    const el = H(); if(!el){ WARN('kein #inspector'); return; }
    el.style.pointerEvents = 'auto';
    el.style.zIndex = Math.max( Number(getComputedStyle(el).zIndex)||0, 100001 );
    // Kinder dürfen Events empfangen:
    el.querySelectorAll('*').forEach(n=>{
      const pe = getComputedStyle(n).pointerEvents;
      if (pe === 'none') n.style.pointerEvents = 'auto';
    });
  }

  /** 2) Slots prüfen; wenn sie fehlen, minimalen DOM herstellen */
  function ensureSlots(){
    const el = H(); if(!el) return false;
    // typische Struktur: header(Tabs) + content(Slots)
    let tabs = el.querySelector('[data-slot="tabs"]');
    let view = el.querySelector('[data-slot="view"]');
    if(!tabs || !view){
      // Minimaler Aufbau – falls der Builder nicht gelaufen ist
      el.innerHTML = `
        <div class="inspector-wrap" style="position:relative;min-height:120px;">
          <div class="inspector-tabs" data-slot="tabs" style="display:flex;gap:8px;padding:8px"></div>
          <div class="inspector-view" data-slot="view" style="padding:8px"></div>
        </div>`;
      tabs = el.querySelector('[data-slot="tabs"]');
      view = el.querySelector('[data-slot="view"]');
      LOG('Slots minimal angelegt');
    }
    // Unter-Slots, die dein Tests-Tab erwartet:
    if(!view.querySelector('[data-slot="tests-view"]')){
      const sect = document.createElement('div');
      sect.setAttribute('data-slot','tests-view');
      view.appendChild(sect);
      LOG('tests-view Slot angelegt');
    }
    return true;
  }

  /** 3) Tabs-Bindings (Header-Knöpfe) → cb:insp:tab:change */
  function bindTabHeader(){
    const el = H(); if(!el) return;
    const tabs = el.querySelector('[data-slot="tabs"]'); if(!tabs) return;
    // Wenn schon echte Tab-Buttons existieren – nichts doppelt binden
    if (tabs.querySelector('[data-tab]')) return;

    // Minimale Header-Buttons erstellen (Logs/Build/Pfade/Ress./Tests)
    const names = [
      ['logs','Logs'],['build','Build'],['paths','Pfade'],['res','Ress.'],['tests','Tests']
    ];
    for(const [id,label] of names){
      const b = document.createElement('button');
      b.textContent = label;
      b.setAttribute('data-tab', id);
      b.className = 'ins-tab';
      b.style.padding = '6px 10px';
      b.style.borderRadius = '8px';
      tabs.appendChild(b);
    }

    tabs.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-tab]');
      if(!btn) return;
      const tab = btn.getAttribute('data-tab');
      window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab } }));
      LOG('tab change →', tab);
    }, { passive:true });

    LOG('Tab-Header gebunden (minimal)');
  }

  /** 4) Öffnen per API – und wenn offen, Standard-Tab aktivieren */
  function ensureOpenBehavior(){
    const insp = window.Inspector || window.__INSPECTOR__ || window.inspector || {};
    const el = H(); if(!el) return;

    // Falls eine echte API existiert, lassen wir sie arbeiten:
    if (typeof insp.open === 'function' && typeof insp.close === 'function'){
      // Nichts weiter tun – der Button-Binder ruft toggle() → open/close
      return;
    }

    // Sonst eigener Fallback: toggle via open/close-Klassen
    window.addEventListener('cb:insp:toggle', ()=>{
      const vis = el.classList.contains('open') || getComputedStyle(el).display !== 'none';
      setOpen(!vis);
    });

    function setOpen(on){
      el.classList.toggle('open', !!on);
      el.style.display       = on ? 'block' : 'none';
      el.style.visibility    = on ? 'visible' : 'hidden';
      el.style.opacity       = on ? '1' : '0';
      el.style.pointerEvents = on ? 'auto' : 'none';
      document.body.classList.toggle('inspector-open', !!on);
      if(on){
        // Standard-Tab melden, damit Inhalte rendern
        window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab:'logs' } }));
      }
    }
  }

  function start(){
    ensureInteractable();
    ensureSlots();
    bindTabHeader();
    ensureOpenBehavior();
    LOG('Runtime-Fix aktiv');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
