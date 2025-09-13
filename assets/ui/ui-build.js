/* ============================================================================
 * UI Build Panel – v17.8.6
 * - Rendert Bau-Menü inkl. Kategorien, Buttons & Vorschaubildern
 * - Nutzt Events aus ui-bridge: cb:build-open / cb:build-close
 * - DISPATCH:
 *     1) Legacy:   cb:build-action  mit { action: 'place-...' }
 *     2) Modern:   cb:build:place   mit { kind: '...' }
 * - Schreibt Logs via CBLog.ok/info
 * ========================================================================== */

(function () {
  'use strict';

  // -------- Logging --------------------------------------------------------
  const LOG = {
    ok : (msg, ...a) => (window.CBLog?.ok    || console.log   )(`[ui-build] ${msg}`, ...a),
    info: (msg, ...a) => (window.CBLog?.info  || console.log   )(`[ui-build] ${msg}`, ...a),
    warn: (msg, ...a) => (window.CBLog?.warn  || console.warn  )(`[ui-build] ${msg}`, ...a),
    err : (msg, ...a) => (window.CBLog?.error || console.error )(`[ui-build] ${msg}`, ...a),
  };

  // -------- Zielcontainer --------------------------------------------------
  const PANEL = document.getElementById('build-panel');
  if (!PANEL) {
    LOG.err('Kein #build-panel gefunden – Abbruch.');
    return;
  }

  // -------- Datenmodell: Kategorien & Einträge -----------------------------
  // Paths stammen aus deiner Struktur (kannst du jederzeit erweitern).
  const CATS = [
    {
      title: 'Allg. / Verwaltung',
      items: [
        { label:'Rathaus',  action:'place-hq',
          img:'assets/tex/building/wood/hq_wood.PNG', kind:'hq' },
        { label:'Wohnhaus', action:'place-house',
          img:'assets/tex/building/wood/Wohnhaus_wood1_ug0.png', kind:'house' },
        { label:'Depot',    action:'place-depot',
          img:'assets/tex/building/wood/depot_wood.png', kind:'depot' },
      ]
    },
    {
      title: 'Produktion / Nahrung',
      items: [
        { label:'Fischer',  action:'place-fisher',
          img:'assets/tex/building/wood/fischer_wood1.PNG', kind:'fisher' },
        { label:'Farm',     action:'place-farm',
          img:'assets/tex/building/wood/farm_wood.png', kind:'farm' },
        { label:'Mühle',    action:'place-windmill',
          img:'assets/tex/building/wood/windmuehle_wood.PNG', kind:'windmill' },
      ]
    },
    {
      title: 'Produktion / Rohstoffe',
      items: [
        { label:'Holzfäller', action:'place-lumberjack',
          img:'assets/tex/building/wood/lumberjack_wood.PNG', kind:'lumberjack' },
        { label:'Steinmetz',  action:'place-stonecutter',
          img:'assets/tex/building/wood/steinmetz_wood.png', kind:'stonecutter' },
        { label:'Schmied',    action:'place-smith',
          img:'assets/tex/building/wood/Schmied_wood0.png', kind:'smith' },
      ]
    },
    {
      title: 'Wohnen',
      items: [
        { label:'Haus', action:'place-house',
          img:'assets/tex/building/wood/Wohnhaus_wood0_ug0.png', kind:'house' },
      ]
    },
    {
      title: 'Infrastruktur',
      items: [
        { label:'Straße',   action:'place-road',
          img:'assets/tex/road/topdown_road_straight.png', kind:'road' },
        { label:'Kurve',    action:'place-road-curve',
          img:'assets/tex/road/topdown_road_corner.png', kind:'road-curve' },
        { label:'Kreuzung', action:'place-road-cross',
          img:'assets/tex/road/topdown_road_cross.png', kind:'road-cross' },
      ]
    },
    {
      title: 'Deko / Landschaft',
      items: [
        { label:'Gras',   action:'paint-grass',
          img:'assets/tex/terrain/topdown_grass.PNG', kind:'grass' },
        { label:'Wiese',  action:'paint-meadow',
          img:'assets/tex/terrain/topdown_meadow.PNG', kind:'meadow' },
        { label:'Fels',   action:'paint-rock',
          img:'assets/tex/terrain/topdown_rock.PNG', kind:'rock' },
        { label:'Sand',   action:'paint-sand',
          img:'assets/tex/terrain/topdown_shore.PNG', kind:'sand' },
        { label:'Wasser', action:'paint-water',
          img:'assets/tex/terrain/sm_topdown_water0_ug0.jpeg', kind:'water' },
      ]
    },
    {
      title: 'Militär',
      items: [
        { label:'Wachturm', action:'place-guardtower',
          // Achtung: Datei hat ein Leerzeichen vor "_wood"
          img:'assets/tex/building/wood/wachturm _wood.png', kind:'guardtower' }
      ]
    },
  ];

  // -------- Utilities ------------------------------------------------------
  const ce = (t, cls, html) => {
    const el = document.createElement(t);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  };

  const fire = (type, detail) => {
    try {
      window.dispatchEvent(new CustomEvent(type, { detail }));
      return true;
    } catch (e) {
      LOG.warn('Dispatch "%s" fehlgeschlagen: %o', type, e);
      return false;
    }
  };

  function makeButton({label, img, action, kind}) {
    const b = ce('button', 'bm-btn');
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.dataset.action = action;
    b.dataset.kind = kind || '';

    const fig = ce('div','bm-thumb');
    fig.style.backgroundImage = `url("${img}")`;

    const cap = ce('div','bm-cap', label);
    b.append(fig, cap);

    // Klick → beide Events feuern
    b.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation(); // UI-Clicks nicht an Canvas weiterreichen

      // 1) Legacy (Inspector-Logs zeigen diese Aktion oft)
      const okLegacy = fire('cb:build-action', { action });

      // 2) Modern (Engine/Renderer können direkt auf {kind} reagieren)
      // Nur für echte "place-..." sinnvoll → anderenfalls optional
      let okModern = true;
      if ((kind && action.startsWith('place-')) || action.startsWith('paint-')) {
        okModern = fire('cb:build:place', { kind: kind || action.replace(/^place-/, '') });
      }

      LOG.ok('Build-Aktion: %s (legacy:%s / modern:%s)', action, okLegacy?'ok':'fail', okModern?'ok':'skip');
    });

    return b;
  }

  function render() {
    PANEL.innerHTML = '';
    const wrap = ce('div', 'bm-wrap');

    CATS.forEach(cat => {
      const sec  = ce('section', 'bm-sec');
      const head = ce('h3', 'bm-title', cat.title);
      const grid = ce('div', 'bm-grid');

      (cat.items || []).forEach(it => grid.appendChild(makeButton(it)));

      sec.append(head, grid);
      wrap.appendChild(sec);
    });

    PANEL.appendChild(wrap);
  }

  // -------- Sichtbarkeit (via ui-bridge) -----------------------------------
  function show(){ PANEL.style.display = 'block'; }
  function hide(){ PANEL.style.display = 'none'; }

  window.addEventListener('cb:build-open',  show);
  window.addEventListener('cb:build-close', hide);

  // -------- Inline-Styles (ergänzt deine ui-build.css) ---------------------
  const STYLE_ID = 'bm-inline-style-1786';
  if (!document.getElementById(STYLE_ID)) {
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
      #build-panel{
        display:none; position:fixed; left:0; right:0; bottom:0;
        max-height:55vh; background:rgba(234,236,238,.96); color:#2C3E50;
        border-top:1px solid #BFC9CA; box-shadow:0 -12px 36px rgba(0,0,0,.18);
        backdrop-filter: blur(4px); z-index: 2147483645; overflow:auto;
        -webkit-overflow-scrolling: touch;
      }
      .bm-wrap{ padding:14px 16px 18px; }
      .bm-sec{ margin-bottom:16px; }
      .bm-title{ margin:0 0 8px; font:600 14px/1.2 system-ui,Segoe UI,Roboto,Arial; opacity:.9;}
      .bm-grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(94px,1fr)); gap:10px; }
      .bm-btn{
        display:flex; flex-direction:column; gap:6px; align-items:center; justify-content:flex-start;
        padding:8px; border:1px solid #BFC9CA; border-radius:8px; background:#F2F4F6; cursor:pointer;
        user-select:none; -webkit-user-select:none;
      }
      .bm-btn:focus{ outline:2px solid rgba(52,152,219,.35); outline-offset:2px; }
      .bm-thumb{ width:78px; height:60px; background:#D5D8DC center/contain no-repeat; border-radius:6px; }
      .bm-cap{ font:500 12px/1.15 system-ui,Segoe UI,Roboto,Arial; text-align:center; color:#2C3E50; }
      @media (orientation:landscape){
        #build-panel{ max-height:70vh; }
      }
    `;
    document.head.appendChild(st);
  }

  // -------- Init -----------------------------------------------------------
  try {
    render();
    LOG.info('geladen (v17.8.6)');
  } catch (e) {
    LOG.err('Render-Fehler: %o', e);
  }
})();
