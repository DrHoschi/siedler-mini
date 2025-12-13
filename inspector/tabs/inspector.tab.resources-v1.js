/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.resources-v1.js
 * Version : v25.12.12b (Reihenfolge getauscht: Cheat oben, Liste unten)
 *
 * Zweck   :
 *   Inspector Tab "Resources" zeigt 2 Dinge:
 *   1) HUD/Inventar-Ressourcen (ResSystem/HUD) → Holz/Stein/Nahrung/Gold/Fisch
 *      - Snapshot + Cheat Add/Set/Reset (OBEN, damit man nicht scrollen muss)
 *   2) Welt-Ressourcen (MapResources)  → Bäume/Steine/Fische auf der Karte
 *      - Snapshot / Regen / Clear
 *
 * Events:
 *   HUD Ressourcen:
 *     → req:res:snapshot
 *     → req:res:add   (detail:{ wood:+20 } oder { wood:+20, stone:+20, ... })
 *     → req:res:set   (detail:{ wood:200, stone:50, ... })
 *     → req:res:reset (detail:{ value?:20 })
 *     ← cb:res:snapshot (detail: beliebiges Object, wird als JSON angezeigt)
 *
 *   MapResources:
 *     → req:mapres:snapshot
 *     → req:mapres:regen   (detail:{seed?})
 *     → req:mapres:clear
 *     ← cb:mapres:snapshot
 *     ← cb:mapres:regen
 *     ← cb:mapres:clear
 *     ← cb:mapres:changed  (optional)
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------------ */
  const esc = (s)=> String(s ?? '').replace(/[&<>"]/g, c => (
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'
  ));

  function prettyJson(obj){
    try { return JSON.stringify(obj ?? {}, null, 2); }
    catch { return '(Fehler beim JSON)'; }
  }

  function num(v, fallback){
    const n = Number(String(v ?? '').trim());
    return Number.isFinite(n) ? n : fallback;
  }

  // Wir arbeiten intern bevorzugt mit diesen Keys (EN),
  // Snapshot kann aber auch DE liefern. Wir zeigen einfach JSON + optional Kurzwerte.
  const RES_KEYS_EN = ['wood','stone','food','gold','fish'];
  const RES_KEYS_DE = ['Holz','Stein','Nahrung','Gold','Fisch'];

  /* ------------------------------------------------------------------------
   * Render
   * ------------------------------------------------------------------------ */
  function renderResourcesTab(sectionEl) {
    sectionEl.innerHTML = [
      '<div class="insp-pad">',
        '<h3>Ressourcen</h3>',

        /* ============================================================
         * (A) HUD/Inventar – Cheat/Quick Controls (OBEN!)
         * ============================================================ */
        '<div class="insp-block">',
          '<h4>Inventar / HUD (Quick Controls)</h4>',

          '<div class="insp-row" style="gap:8px; flex-wrap:wrap;">',
            '<button type="button" class="insp-btn" data-act="hud-snap">Snapshot</button>',

            '<span style="opacity:.8; margin-left:6px;">Cheat:</span>',

            '<label style="display:inline-flex;align-items:center;gap:6px;">',
              '<span style="opacity:.8;">Menge</span>',
              '<input class="insp-input" data-act="cheat-amt" value="20" style="width:70px;" />',
            '</label>',

            '<button type="button" class="insp-btn" data-act="add-wood">+ Holz</button>',
            '<button type="button" class="insp-btn" data-act="add-stone">+ Stein</button>',
            '<button type="button" class="insp-btn" data-act="add-food">+ Nahrung</button>',
            '<button type="button" class="insp-btn" data-act="add-gold">+ Gold</button>',
            '<button type="button" class="insp-btn" data-act="add-fish">+ Fisch</button>',
            '<button type="button" class="insp-btn" data-act="add-all">+ Alle</button>',

            '<button type="button" class="insp-btn" data-act="reset-20">Reset 20</button>',
          '</div>',

          // Kurze, nicht-scrollige Anzeige (damit du schnell siehst, ob’s wirkt)
          '<div class="insp-row" style="gap:10px; flex-wrap:wrap; margin-top:8px;">',
            '<span style="opacity:.75;">Aktuell:</span>',
            '<span class="tag" data-out="mini-wood">wood: ?</span>',
            '<span class="tag" data-out="mini-stone">stone: ?</span>',
            '<span class="tag" data-out="mini-food">food: ?</span>',
            '<span class="tag" data-out="mini-gold">gold: ?</span>',
            '<span class="tag" data-out="mini-fish">fish: ?</span>',
          '</div>',

          // Lange Liste bewusst nach unten in ein <details> gepackt → weniger scrollen
          '<details style="margin-top:10px;">',
            '<summary style="cursor:pointer; user-select:none;">Inventar-Liste (Snapshot JSON)</summary>',
            '<pre class="out out-hud" style="margin-top:8px;">(warte …)</pre>',
            '<div style="opacity:.7; font-size:12px; margin-top:6px;">',
              'Buttons senden <code>req:res:add</code> / <code>req:res:set</code> / <code>req:res:reset</code>.',
              ' Wenn noch kein Listener existiert, muss das Res-System diese Events annehmen.',
            '</div>',
          '</details>',
        '</div>',

        /* ============================================================
         * (B) MapResources – Weltressourcen
         * ============================================================ */
        '<div class="insp-block" style="margin-top:14px;">',
          '<h4>Welt-Ressourcen (MapResources)</h4>',
          '<div class="insp-row" style="gap:8px; flex-wrap:wrap;">',
            '<button type="button" class="insp-btn" data-act="map-snap">Snapshot</button>',
            '<button type="button" class="insp-btn" data-act="map-regen">Regen</button>',
            '<input class="insp-input" data-act="map-seed" placeholder="Seed (optional)" style="width:140px" />',
            '<button type="button" class="insp-btn" data-act="map-clear">Clear</button>',
          '</div>',
          '<details style="margin-top:10px;">',
            '<summary style="cursor:pointer; user-select:none;">Welt-Ressourcen Liste (Snapshot JSON)</summary>',
            '<pre class="out out-map" style="margin-top:8px;">(warte …)</pre>',
          '</details>',
        '</div>',

      '</div>'
    ].join('');

    // Outputs
    const outMap = sectionEl.querySelector('.out-map');
    const outHud = sectionEl.querySelector('.out-hud');

    // Mini outputs
    const mini = {
      wood:  sectionEl.querySelector('[data-out="mini-wood"]'),
      stone: sectionEl.querySelector('[data-out="mini-stone"]'),
      food:  sectionEl.querySelector('[data-out="mini-food"]'),
      gold:  sectionEl.querySelector('[data-out="mini-gold"]'),
      fish:  sectionEl.querySelector('[data-out="mini-fish"]'),
    };

    /* ----------------------------------------------------------------------
     * HUD Helpers / Requests
     * ---------------------------------------------------------------------- */
    function reqHudSnapshot(){
      if (outHud) outHud.textContent = '(warte auf HUD Snapshot …)';
      window.dispatchEvent(new CustomEvent('req:res:snapshot'));
    }

    function cheatAmount(){
      // Minimum 0, Default 20
      return Math.max(0, num(sectionEl.querySelector('[data-act="cheat-amt"]')?.value, 20));
    }

    // req:res:add — wir senden hier bewusst das einfache Objektformat:
    // { wood:+20 } oder { wood:+20, stone:+20, ... }
    function reqResAdd(obj){
      window.dispatchEvent(new CustomEvent('req:res:add', { detail: obj }));
      // Danach Snapshot ziehen, damit du es sofort siehst
      reqHudSnapshot();
    }

    function reqResReset(value){
      window.dispatchEvent(new CustomEvent('req:res:reset', { detail: { value } }));
      reqHudSnapshot();
    }

    /* ----------------------------------------------------------------------
     * MapResources Requests
     * ---------------------------------------------------------------------- */
    function reqMapSnapshot(){
      if (outMap) outMap.textContent = '(warte auf MapResources …)';
      window.dispatchEvent(new CustomEvent('req:mapres:snapshot'));
    }

    function reqMapRegen(){
      const seedStr = sectionEl.querySelector('[data-act="map-seed"]')?.value?.trim() || '';
      const seed = seedStr ? Number(seedStr) : undefined;
      if (outMap) outMap.textContent = seedStr ? `(regen mit seed=${seedStr} …)` : '(regen …)';
      window.dispatchEvent(new CustomEvent('req:mapres:regen', { detail: { seed } }));
    }

    function reqMapClear(){
      if (outMap) outMap.textContent = '(clear …)';
      window.dispatchEvent(new CustomEvent('req:mapres:clear'));
    }

    /* ----------------------------------------------------------------------
     * Wire UI Actions
     * ---------------------------------------------------------------------- */
    sectionEl.querySelector('[data-act="hud-snap"]')?.addEventListener('click', reqHudSnapshot);

    sectionEl.querySelector('[data-act="add-wood"]')?.addEventListener('click', ()=>{
      reqResAdd({ wood: cheatAmount() });
    });
    sectionEl.querySelector('[data-act="add-stone"]')?.addEventListener('click', ()=>{
      reqResAdd({ stone: cheatAmount() });
    });
    sectionEl.querySelector('[data-act="add-food"]')?.addEventListener('click', ()=>{
      reqResAdd({ food: cheatAmount() });
    });
    sectionEl.querySelector('[data-act="add-gold"]')?.addEventListener('click', ()=>{
      reqResAdd({ gold: cheatAmount() });
    });
    sectionEl.querySelector('[data-act="add-fish"]')?.addEventListener('click', ()=>{
      reqResAdd({ fish: cheatAmount() });
    });

    sectionEl.querySelector('[data-act="add-all"]')?.addEventListener('click', ()=>{
      const a = cheatAmount();
      reqResAdd({ wood:a, stone:a, food:a, gold:a, fish:a });
    });

    sectionEl.querySelector('[data-act="reset-20"]')?.addEventListener('click', ()=>{
      reqResReset(20);
    });

    sectionEl.querySelector('[data-act="map-snap"]')?.addEventListener('click', reqMapSnapshot);
    sectionEl.querySelector('[data-act="map-regen"]')?.addEventListener('click', reqMapRegen);
    sectionEl.querySelector('[data-act="map-clear"]')?.addEventListener('click', reqMapClear);

    /* ----------------------------------------------------------------------
     * Listeners
     * ---------------------------------------------------------------------- */
    window.addEventListener('cb:mapres:snapshot', (e)=>{
      if (outMap) outMap.textContent = prettyJson(e?.detail || {});
    });
    window.addEventListener('cb:mapres:regen', (e)=>{
      // e.detail kann { ok, seed, snap } sein – wir zeigen snap wenn vorhanden.
      const d = e?.detail || {};
      if (outMap) outMap.textContent = prettyJson(d.snap || d);
    });
    window.addEventListener('cb:mapres:clear', (e)=>{
      if (outMap) outMap.textContent = prettyJson(e?.detail || {});
    });
    window.addEventListener('cb:mapres:changed', (e)=>{
      if (outMap) outMap.textContent = prettyJson(e?.detail || {});
    });

    window.addEventListener('cb:res:snapshot', (e)=>{
      const d = e?.detail || {};
      if (outHud) outHud.textContent = prettyJson(d);

      // Mini-Werte: versuchen EN-Keys, sonst DE-Keys
      const wood  = (d.wood  ?? d.Holz);
      const stone = (d.stone ?? d.Stein);
      const food  = (d.food  ?? d.Nahrung);
      const gold  = (d.gold  ?? d.Gold);
      const fish  = (d.fish  ?? d.Fisch);

      if (mini.wood)  mini.wood.textContent  = `wood: ${wood  ?? '?'}`;
      if (mini.stone) mini.stone.textContent = `stone: ${stone ?? '?'}`;
      if (mini.food)  mini.food.textContent  = `food: ${food  ?? '?'}`;
      if (mini.gold)  mini.gold.textContent  = `gold: ${gold  ?? '?'}`;
      if (mini.fish)  mini.fish.textContent  = `fish: ${fish  ?? '?'}`;
    });

    /* ----------------------------------------------------------------------
     * Initial requests (Tab öffnet → sofort Status sehen)
     * ---------------------------------------------------------------------- */
    reqHudSnapshot();
    reqMapSnapshot();
  }

  // Wichtig: Nur EIN Register. Keine Doppel-IIFEs mehr.
  window.registerInspectorTab('resources', renderResourcesTab);
})();
