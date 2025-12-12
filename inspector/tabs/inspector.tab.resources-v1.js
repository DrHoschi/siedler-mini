/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.resources-v1.js
 * Version : v25.12.12 (MapResources Tools + Res Snapshot konsistent)
 *
 * Zweck   :
 *   Inspector Tab "Resources" zeigt 2 Dinge:
 *   1) Welt-Ressourcen (MapResources)  → Bäume/Steine/Fische auf der Karte
 *      - Snapshot / Regen / Clear
 *   2) HUD/Inventar-Ressourcen (ResSystem/HUD) → Holz/Stein/Nahrung/Gold
 *      - req:res:snapshot / cb:res:snapshot
 *
 * Events:
 *   MapResources:
 *     → req:mapres:snapshot
 *     → req:mapres:regen   (detail:{seed?})
 *     → req:mapres:clear
 *     ← cb:mapres:snapshot
 *     ← cb:mapres:regen
 *     ← cb:mapres:clear
 *     ← cb:mapres:changed  (optional)
 *
 *   HUD Ressourcen:
 *     → req:res:snapshot
 *     ← cb:res:snapshot (detail:{ Holz:..., Stein:..., ... })
 * ========================================================================== */
(function () {
  'use strict';

  const esc = (s)=> String(s ?? '').replace(/[&<>"]/g, c => (
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'
  ));

  function renderResourcesTab(sectionEl) {
    sectionEl.innerHTML = [
      '<div class="insp-pad">',
        '<h3>Ressourcen</h3>',

        '<div class="insp-block">',
          '<h4>Welt-Ressourcen (MapResources)</h4>',
          '<div class="insp-row">',
            '<button type="button" class="insp-btn" data-act="map-snap">Snapshot</button>',
            '<button type="button" class="insp-btn" data-act="map-regen">Regen</button>',
            '<input class="insp-input" data-act="map-seed" placeholder="Seed (optional)" style="width:140px" />',
            '<button type="button" class="insp-btn" data-act="map-clear">Clear</button>',
          '</div>',
          '<pre class="out out-map">(warte …)</pre>',
        '</div>',

        '<div class="insp-block" style="margin-top:14px;">',
          '<h4>Inventar/HUD-Ressourcen</h4>',
          '<div class="insp-row">',
            '<button type="button" class="insp-btn" data-act="hud-snap">Snapshot anfordern</button>',
          '</div>',
          '<pre class="out out-hud">(warte …)</pre>',
        '</div>',

      '</div>'
    ].join('');

    const outMap = sectionEl.querySelector('.out-map');
    const outHud = sectionEl.querySelector('.out-hud');

    // ---------------------------
    // MAPRES actions
    // ---------------------------
    function reqMapSnapshot(){
      outMap.textContent = '(warte auf MapResources …)';
      window.dispatchEvent(new CustomEvent('req:mapres:snapshot'));
    }

    function reqMapRegen(){
      const seedStr = sectionEl.querySelector('[data-act="map-seed"]')?.value?.trim() || '';
      const seed = seedStr ? Number(seedStr) : undefined;
      outMap.textContent = seedStr ? `(regen mit seed=${seedStr} …)` : '(regen …)';
      window.dispatchEvent(new CustomEvent('req:mapres:regen', { detail: { seed } }));
    }

    function reqMapClear(){
      outMap.textContent = '(clear …)';
      window.dispatchEvent(new CustomEvent('req:mapres:clear'));
    }

    // ---------------------------
    // HUD actions
    // ---------------------------
    function reqHudSnapshot(){
      outHud.textContent = '(warte auf HUD Snapshot …)';
      window.dispatchEvent(new CustomEvent('req:res:snapshot'));
    }

    // Buttons
    sectionEl.querySelector('[data-act="map-snap"]')?.addEventListener('click', reqMapSnapshot);
    sectionEl.querySelector('[data-act="map-regen"]')?.addEventListener('click', reqMapRegen);
    sectionEl.querySelector('[data-act="map-clear"]')?.addEventListener('click', reqMapClear);

    sectionEl.querySelector('[data-act="hud-snap"]')?.addEventListener('click', reqHudSnapshot);

    // ---------------------------
    // Listeners
    // ---------------------------
    function prettyJson(obj){
      try { return JSON.stringify(obj ?? {}, null, 2); }
      catch { return '(Fehler beim JSON)'; }
    }

    window.addEventListener('cb:mapres:snapshot', (e)=>{
      outMap.textContent = prettyJson(e?.detail || {});
    });

    window.addEventListener('cb:mapres:regen', (e)=>{
      // e.detail: { ok, seed, snap }
      outMap.textContent = prettyJson(e?.detail?.snap || e?.detail || {});
    });

    window.addEventListener('cb:mapres:clear', (e)=>{
      outMap.textContent = prettyJson(e?.detail || {});
    });

    // optional live updates (wenn regen/clear intern cb:mapres:changed feuert)
    window.addEventListener('cb:mapres:changed', (e)=>{
      outMap.textContent = prettyJson(e?.detail || {});
    });

    window.addEventListener('cb:res:snapshot', (e)=>{
      outHud.textContent = prettyJson(e?.detail || {});
    });

    // initial
    reqMapSnapshot();
    reqHudSnapshot();
  }

  // Wichtig: Nur EIN Register. Keine Doppel-IIFEs mehr.
  window.registerInspectorTab('resources', renderResourcesTab);
})();
