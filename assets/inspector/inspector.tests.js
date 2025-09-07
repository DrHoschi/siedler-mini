/* ============================================================================
 * Datei: assets/inspector/inspector.tests.js
 * Projekt: Siedler-Mini
 * Version: v18.13.0
 *
 * Zweck:
 *  - Test-Tab mit echten Aktionen: Door/Path-Fixes, Carrier-Demo, Engine-Checks
 *  - Nur Events senden; deine Engine/Module reagieren darauf
 *    • cb:test:carrier-demo
 *    • cb:test:path-door
 *    • cb:test:engine-ping
 *    • cb:test:reset-world
 * ========================================================================= */
(function(){
  'use strict';

  const MOD='[inspector.tests]';
  const VER='v18.13.0';
  const core = window.__INSPECTOR_CORE__;
  if (!core || !core.api){ console.warn(MOD,'core fehlt'); return; }

  core.api.mount('tests', ()=>{
    const host = core.api.getSlot('tests');
    if (!host) return;

    host.innerHTML = `
      <div class="ins-tests">
        <div class="grp">
          <div class="grp-title">Pfad / Türen</div>
          <div class="row">
            <button class="ins-btn" data-ev="cb:test:path-door">Tür-Pfad Test</button>
          </div>
        </div>

        <div class="grp">
          <div class="grp-title">Transport / Carrier</div>
          <div class="row">
            <button class="ins-btn" data-ev="cb:test:carrier-demo">Carrier Demo (Rathaus ↔ Depot)</button>
          </div>
        </div>

        <div class="grp">
          <div class="grp-title">Engine</div>
          <div class="row">
            <button class="ins-btn" data-ev="cb:test:engine-ping">Engine Ping</button>
            <button class="ins-btn" data-ev="cb:test:reset-world">Welt zurücksetzen</button>
          </div>
        </div>
      </div>
    `;

    host.querySelectorAll('[data-ev]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const ev = b.getAttribute('data-ev');
        try{ window.dispatchEvent(new Event(ev)); }catch(_){}
        (window.CBLog?.ok||console.log)('[tests]', 'trigger', ev);
      });
    });

    (window.CBLog?.ok||console.log)(MOD,'bereit', VER);
  });

})();
