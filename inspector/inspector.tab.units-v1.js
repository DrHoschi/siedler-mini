/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.units-v1.js
 * Version : v25.12.13-a
 *
 * Zweck   :
 *   Inspector Tab "Units" – schnell Units spawnen/clearen + Snapshot/Counts.
 *
 * Benötigt:
 *   - core/game.units.js (>= v25.12.13-units-spawn-bridge1)
 *     Events:
 *       → req:units:snapshot
 *       → req:units:spawn   { unitId|id, count?, at? }
 *       → req:units:clear
 *       ← cb:units:snapshot { units, counts, hq }
 *       ← cb:units:changed  { reason, counts, total }
 *
 * Hinweis:
 *   - Unit-Definitionen kommen idealerweise aus Registry.list('units')
 *     (Option B: data/units.json via Registry geladen).
 * ========================================================================== */
(function () {
  'use strict';

  const esc = (s)=> String(s ?? '').replace(/[&<>"]/g, c => (
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'
  ));

  function pretty(obj){
    try { return JSON.stringify(obj ?? {}, null, 2); }
    catch { return '(JSON Fehler)'; }
  }

  function getRegistryUnitList(){
    try {
      if (window.Registry && typeof window.Registry.list === 'function') {
        const arr = window.Registry.list('units');
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch {}
    // Fallback: bekannte IDs (falls Registry noch nicht ready ist)
    return [
      { id:'u.carrier',     name:'Träger'      },
      { id:'u.builder',     name:'Bauarbeiter' },
      { id:'u.villager',    name:'Dorfbewohner'},
      { id:'u.lumberjack',  name:'Holzfäller'  },
      { id:'u.fisher',      name:'Fischer'     },
      { id:'u.stonecutter', name:'Steinmetz'   },
    ];
  }

  function reqSnapshot(){
    try { window.dispatchEvent(new CustomEvent('req:units:snapshot', { detail:{} })); } catch {}
    try { document.dispatchEvent(new CustomEvent('req:units:snapshot', { detail:{} })); } catch {}
  }

  function reqSpawn(unitId, count, at){
    const detail = { unitId, count: (count|0)||1 };
    if (at) detail.at = at;
    try { window.dispatchEvent(new CustomEvent('req:units:spawn', { detail })); } catch {}
    try { document.dispatchEvent(new CustomEvent('req:units:spawn', { detail })); } catch {}
  }

  function reqClear(){
    try { window.dispatchEvent(new CustomEvent('req:units:clear', { detail:{} })); } catch {}
    try { document.dispatchEvent(new CustomEvent('req:units:clear', { detail:{} })); } catch {}
  }

  function readGameUnitsSnapshotFallback(){
    // Wenn kein cb:units:snapshot kommt (z.B. alte Version), lesen wir direkt.
    try {
      const U = window.GameUnits;
      if (!U || typeof U.getUnits !== 'function') return null;
      const units = U.getUnits() || [];
      const counts = Object.create(null);
      for (const u of units){
        const k = u.kind || (u.type === 'carrier' ? 'u.carrier' : u.type) || 'unknown';
        counts[k] = (counts[k]||0)+1;
      }
      return { units, counts, hq: (typeof U.getHQPos==='function'?U.getHQPos():null) };
    } catch { return null; }
  }

  function renderUnitsTab(sectionEl) {
    const unitDefs = getRegistryUnitList();

    sectionEl.innerHTML = [
      '<div class="insp-pad">',
        '<h3>Units</h3>',

        '<div class="insp-block">',
          '<h4>Quick</h4>',
          '<div class="insp-row" style="gap:8px; flex-wrap:wrap;">',
            '<button type="button" class="insp-btn" data-act="snap">Snapshot</button>',
            '<button type="button" class="insp-btn" data-act="clear">Clear</button>',
            '<span style="opacity:.8; margin-left:6px;">Spawn:</span>',
            '<label style="display:inline-flex;align-items:center;gap:6px;">',
              '<span style="opacity:.8;">Anzahl</span>',
              '<input class="insp-input" data-act="amt" value="1" style="width:60px;" />',
            '</label>',
            '<button type="button" class="insp-btn" data-act="pack">Pack (2 Carrier + 1 Builder)</button>',
          '</div>',

          '<div class="insp-row" style="gap:8px; flex-wrap:wrap; margin-top:10px;">',
            unitDefs.map(u => (
              `<button type="button" class="insp-btn" data-unit="${esc(u.id)}">${esc(u.name||u.id)} +</button>`
            )).join(''),
          '</div>',

          '<div class="insp-row" style="gap:10px; flex-wrap:wrap; margin-top:10px;">',
            '<span style="opacity:.75;">Counts:</span>',
            '<span class="tag" data-out="counts">(…)</span>',
            '<span class="tag" data-out="hq">HQ: ?</span>',
          '</div>',

          '<details style="margin-top:10px;">',
            '<summary style="cursor:pointer; user-select:none;">Units Snapshot (JSON)</summary>',
            '<pre class="out out-units" style="margin-top:8px;">(warte …)</pre>',
          '</details>',
        '</div>',
      '</div>'
    ].join('');

    const outPre   = sectionEl.querySelector('.out-units');
    const outCounts= sectionEl.querySelector('[data-out="counts"]');
    const outHQ    = sectionEl.querySelector('[data-out="hq"]');
    const inpAmt   = sectionEl.querySelector('[data-act="amt"]');

    function applySnapshot(snap){
      if (!snap) return;
      if (outPre) outPre.textContent = pretty(snap);

      // counts
      const c = snap.counts || {};
      const parts = Object.keys(c).sort().map(k => `${k}:${c[k]}`);
      if (outCounts) outCounts.textContent = parts.length ? parts.join('  ') : '(leer)';

      // hq
      const hq = snap.hq;
      if (outHQ) outHQ.textContent = hq ? `HQ: ${hq.tx?.toFixed?.(2) ?? hq.tx}, ${hq.ty?.toFixed?.(2) ?? hq.ty}` : 'HQ: ?';
    }

    function getAmt(){
      const n = Number(String(inpAmt?.value ?? '1').trim());
      return Number.isFinite(n) ? Math.max(1, n|0) : 1;
    }

    // Buttons
    sectionEl.addEventListener('click', (ev)=>{
      const btn = ev.target?.closest?.('button');
      if (!btn) return;

      const act = btn.dataset.act || '';
      const unitId = btn.dataset.unit;

      if (act === 'snap') { reqSnapshot(); return; }
      if (act === 'clear'){ reqClear(); return; }
      if (act === 'pack'){
        reqSpawn('u.carrier', 2, 'hq');
        reqSpawn('u.builder', 1, 'hq');
        return;
      }

      if (unitId){
        reqSpawn(unitId, getAmt(), 'hq');
      }
    });

    // Live Updates
    function onSnap(e){ applySnapshot(e.detail); }
    function onChanged(){
      // nach Change: Snapshot ziehen (damit JSON & Counts konsistent bleiben)
      reqSnapshot();
    }

    window.addEventListener('cb:units:snapshot', onSnap);
    document.addEventListener('cb:units:snapshot', onSnap);

    window.addEventListener('cb:units:changed', onChanged);
    document.addEventListener('cb:units:changed', onChanged);

    // Initial: Snapshot (oder Fallback)
    reqSnapshot();
    setTimeout(()=>{
      // Falls Snapshot nie kommt: direkt lesen
      const fb = readGameUnitsSnapshotFallback();
      if (fb) applySnapshot(fb);
    }, 150);
  }

  window.registerInspectorTab('units', renderUnitsTab);
})();
