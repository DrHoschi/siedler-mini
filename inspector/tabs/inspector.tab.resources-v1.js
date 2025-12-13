/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.resources-v1.js
 * Version : v25.12.12a (MapResources Tools + Res Snapshot + Cheat Add/Set/Reset)
 *
 * Zweck   :
 *   Inspector Tab "Resources" zeigt 2 Dinge:
 *   1) Welt-Ressourcen (MapResources)  → Bäume/Steine/Fische auf der Karte
 *      - Snapshot / Regen / Clear
 *   2) HUD/Inventar-Ressourcen (ResSystem/HUD) → Holz/Stein/Nahrung/Gold
 *      - req:res:snapshot / cb:res:snapshot
 *      - NEU: Cheat-Tools (Add/Set/Reset) via req:res:add / req:res:set / req:res:reset
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
 *     → req:res:add   (detail:{ wood:+20 } oder { key:'wood', delta:+20 })
 *     → req:res:set   (detail:{ wood:200, stone:50, ... })
 *     → req:res:reset (detail:{ value?:20 })
 *     ← cb:res:snapshot (detail:{ Holz:..., Stein:..., ... } ODER {wood:..., stone:...})
 * ========================================================================== */
(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  const esc = (s)=> String(s ?? '').replace(/[&<>"]/g, c => (
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'
  ));

  function prettyJson(obj){
    try { return連 = 0; } catch(e) {} // (dummy to keep old iPad JS engines calm; no-op)
    try { return JSON.stringify(obj ?? {}, null, 2); }
    catch { return '(Fehler beim JSON)'; }
  }

  function num(v, fallback){
    const n = Number(String(v ?? '').trim());
    return Number.isFinite(n) ? n : fallback;
  }

  // Normalize Keys:
  // - Intern im Code wollen wir: wood/stone/food/gold/fish
  // - Im HUD-Snapshot kommen bei dir teils deutsche Keys (Holz/Stein/Nahrung/Gold).
  //   Wir zeigen beides an, aber senden für Add/Set die EN-Keys.
  const RES_KEYS = ['wood','stone','food','gold','fish'];

  // --------------------------------------------------------------------------
  // Main Render
  // --------------------------------------------------------------------------
  function renderResourcesTab(sectionEl) {
    sectionEl.innerHTML = [
      '<div class="insp-pad">',
        '<h3>Ressourcen</h3>',

        // ----------------------------------------------------------
        // Block 1: MapResources
        // ----------------------------------------------------------
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

        // ----------------------------------------------------------
        // Block 2: HUD/Inventory
        // ----------------------------------------------------------
        '<div class="insp-block" style="margin-top:14px;">',
          '<h4>Inventar/HUD-Ressourcen</h4>',

          '<div class="insp-row" style="gap:8px; flex-wrap:wrap;">',
            '<button type="button" class="insp-btn" data-act="hud-snap">Snapshot anfordern</button>',
            '<span style="opacity:.8; margin-left:6px;">Cheat:</span>',
            '<label style="display:inline-flex;align-items:center;gap:6px;">',
              '<span style="opacity:.8;">Menge</span>',
              '<input class="insp-input" data-act="cheat-amt" value="20" style="width:70px;" />',
            '</label>',
          '</div>',

          '<div class="insp-row" style="gap:8px; flex-wrap:wrap; margin-top:8px;">',
            '<button type="button" class="insp-btn" data-act="add-wood">+ Holz</button>',
            '<button type="button" class="insp-btn" data-act="add-stone">+ Stein</button>',
            '<button type="button" class="insp-btn" data-act="add-food">+ Nahrung</button>',
            '<button type="button" class="insp-btn" data-act="add-gold">+ Gold</button>',
            '<button type="button" class="insp-btn" data-act="add-all">+ Alle</button>',
            '<button type="button" class="insp-btn" data-act="reset-20">Reset auf 20</button>',
          '</div>',

          '<details style="margin-top:10px;">',
            '<summary style="cursor:pointer; user-select:none;">Setzen (exakt)</summary>',
            '<div class="insp-row" style="gap:8px; flex-wrap:wrap; margin-top:8px;">',
              '<label>wood <input class="insp-input" data-act="set-wood" value="" placeholder="z.B. 200" style="width:90px;"></label>',
              '<label>stone <input class="insp-input" data-act="set-stone" value="" placeholder="z.B. 50" style="width:90px;"></label>',
              '<label>food <input class="insp-input" data-act="set-food" value="" placeholder="z.B. 30" style="width:90px;"></label>',
              '<label>gold <input class="insp-input" data-act="set-gold" value="" placeholder="z.B. 10" style="width:90px;"></label>',
              '<label>fish <input class="insp-input" data-act="set-fish" value="" placeholder="z.B. 5" style="width:90px;"></label>',
              '<button type="button" class="insp-btn" data-act="apply-set">Anwenden</button>',
            '</div>',
          '</details>',

          '<pre class="out out-hud" style="margin-top:10px;">(warte …)</pre>',
          '<div style="opacity:.7; font-size:12px; margin-top:6px;">',
            'Hinweis: Buttons senden <code>req:res:add</code> / <code>req:res:set</code> / <code>req:res:reset</code>.',
            ' Falls noch kein Listener existiert, patche ich dir den im Res-System.',
          '</div>',
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

    function cheatAmount(){
      return Math.max(0, num(sectionEl.querySelector('[data-act="cheat-amt"]')?.value, 20));
    }

    // req:res:add — unterstützt 2 Detail-Formate:
    //  A) { wood:+20 }
    //  B) { key:'wood', delta:+20 }
    function reqResAdd(key, delta){
      // Format A (Objekt mit Key)
      const detailA = {};
      detailA[key] = delta;

      // Wir senden A, weil das einfacher ist (du kannst im Listener beide akzeptieren).
      window.dispatchEvent(new CustomEvent('req:res:add', { detail: detailA }));

      // Direkt danach Snapshot anfordern, damit der Output aktualisiert wird
      reqHudSnapshot();
    }

    function reqResReset(value){
      window.dispatchEvent(new CustomEvent('req:res:reset', { detail: { value } }));
      reqHudSnapshot();
    }

    function reqResSet(obj){
      window.dispatchEvent(new CustomEvent('req:res:set', { detail: obj }));
      reqHudSnapshot();
    }

    // Buttons
    sectionEl.querySelector('[data-act="map-snap"]')?.addEventListener('click', reqMapSnapshot);
    sectionEl.querySelector('[data-act="map-regen"]')?.addEventListener('click', reqMapRegen);
    sectionEl.querySelector('[data-act="map-clear"]')?.addEventListener('click', reqMapClear);

    sectionEl.querySelector('[data-act="hud-snap"]')?.addEventListener('click', reqHudSnapshot);

    sectionEl.querySelector('[data-act="add-wood"]')?.addEventListener('click', ()=> reqResAdd('wood', cheatAmount()));
    sectionEl.querySelector('[data-act="add-stone"]')?.addEventListener('click', ()=> reqResAdd('stone', cheatAmount()));
    sectionEl.querySelector('[data-act="add-food"]')?.addEventListener('click', ()=> reqResAdd('food', cheatAmount()));
    sectionEl.querySelector('[data-act="add-gold"]')?.addEventListener('click', ()=> reqResAdd('gold', cheatAmount()));
    sectionEl.querySelector('[data-act="add-all"]')?.addEventListener('click', ()=>{
      const a = cheatAmount();
      const obj = { wood:a, stone:a, food:a, gold:a, fish:a };
      window.dispatchEvent(new CustomEvent('req:res:add', { detail: obj }));
      reqHudSnapshot();
    });

    sectionEl.querySelector('[data-act="reset-20"]')?.addEventListener('click', ()=> reqResReset(20));

    sectionEl.querySelector('[data-act="apply-set"]')?.addEventListener('click', ()=>{
      const obj = {};
      const vWood  = sectionEl.querySelector('[data-act="set-wood"]')?.value;
      const vStone = sectionEl.querySelector('[data-act="set-stone"]')?.value;
      const vFood  = sectionEl.querySelector('[data-act="set-food"]')?.value;
      const vGold  = sectionEl.querySelector('[data-act="set-gold"]')?.value;
      const vFish  = sectionEl.querySelector('[data-act="set-fish"]')?.value;

      // Nur befüllte Felder übernehmen
      if (String(vWood ?? '').trim()  !== '') obj.wood  = num(vWood, 0);
      if (String(vStone ?? '').trim() !== '') obj.stone = num(vStone, 0);
      if (String(vFood ?? '').trim()  !== '') obj.food  = num(vFood, 0);
      if (String(vGold ?? '').trim()  !== '') obj.gold  = num(vGold, 0);
      if (String(vFish ?? '').trim()  !== '') obj.fish  = num(vFish, 0);

      reqResSet(obj);
    });

    // ---------------------------
    // Listeners
    // ---------------------------
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
