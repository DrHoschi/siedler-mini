/* ============================================================================
 * UI Build Panel – v17.8.5
 * - Rendert Bau-Menü inkl. Kategorien, Buttons & Vorschaubildern
 * - Nutzt Events aus ui-bridge: cb:build-open / cb:build-close
 * - Dispatcht build:action mit {action}
 * - Schreibt Logs via CBLog.ok/info
 * ========================================================================== */

(function () {
  const LOG = {
    ok : (msg,...a)=> (window.CBLog?.ok || console.log)(`[ui-build] ${msg}`,...a),
    info: (msg,...a)=> (window.CBLog?.info|| console.log)(`[ui-build] ${msg}`,...a),
    warn: (msg,...a)=> (window.CBLog?.warn|| console.warn)(`[ui-build] ${msg}`,...a),
    err : (msg,...a)=> (window.CBLog?.error||console.error)(`[ui-build] ${msg}`,...a),
  };

  // Zielcontainer (wird in index.html als leeres DIV bereitgestellt)
  const PANEL = document.getElementById('build-panel');
  if (!PANEL) {
    LOG.err('Kein #build-panel gefunden – Abbruch.');
    return;
  }

  // --- Datenmodell: Kategorien & Einträge (entspricht deinem Mockup) -----
  // Pfade stammen aus deiner filelist (PNG/JPEG groß genug für eine Vorschau).
  // Du kannst später beliebig erweitern – nur "action" konsistent halten.
  const CATS = [
    {
      title: 'Allg. / Verwaltung',
      items: [
        { label:'Rathaus',  action:'place-hq',
          img:'assets/tex/building/wood/hq_wood.PNG' },
        { label:'Wohnhaus', action:'place-house',
          img:'assets/tex/building/wood/Wohnhaus_wood1_ug0.png' },
        { label:'Depot',    action:'place-depot',
          img:'assets/tex/building/wood/depot_wood.png' },
      ]
    },
    {
      title: 'Produktion / Nahrung',
      items: [
        { label:'Fischer',  action:'place-fisher',
          img:'assets/tex/building/wood/fischer_wood1.PNG' },
        { label:'Farm',     action:'place-farm',
          img:'assets/tex/building/wood/farm_wood.png' },
        { label:'Mühle',    action:'place-windmill',
          img:'assets/tex/building/wood/windmuehle_wood.PNG' },
      ]
    },
    {
      title: 'Produktion / Rohstoffe',
      items: [
        { label:'Holzfäller', action:'place-lumberjack',
          img:'assets/tex/building/wood/lumberjack_wood.PNG' },
        { label:'Steinmetz',  action:'place-stonecutter',
          img:'assets/tex/building/wood/steinmetz_wood.png' },
        { label:'Schmied',    action:'place-smith',
          img:'assets/tex/building/wood/Schmied_wood0.png' },
      ]
    },
    {
      title: 'Wohnen',
      items: [
        { label:'Haus', action:'place-house',
          img:'assets/tex/building/wood/Wohnhaus_wood0_ug0.png' },
      ]
    },
    {
      title: 'Infrastruktur',
      items: [
        { label:'Straße', action:'place-road',
          img:'assets/tex/road/topdown_road_straight.png' },
        { label:'Kurve',  action:'place-road-curve',
          img:'assets/tex/road/topdown_road_corner.png' },
        { label:'Kreuzung', action:'place-road-cross',
          img:'assets/tex/road/topdown_road_cross.png' },
      ]
    },
    {
      title: 'Deko / Landschaft',
      items: [
        { label:'Gras',   action:'paint-grass',
          img:'assets/tex/terrain/topdown_grass.PNG' },
        { label:'Wiese',  action:'paint-meadow',
          img:'assets/tex/terrain/topdown_meadow.PNG' },
        { label:'Fels',   action:'paint-rock',
          img:'assets/tex/terrain/topdown_rock.PNG' },
        { label:'Sand',   action:'paint-sand',
          img:'assets/tex/terrain/topdown_shore.PNG' },
        { label:'Wasser', action:'paint-water',
          img:'assets/tex/terrain/sm_topdown_water0_ug0.jpeg' },
      ]
    },
    {
      title: 'Militär',
      items: [
        { label:'Wachturm', action:'place-guardtower',
          // In deinem Repo heißt die Datei mit einem Leerzeichen vor "_wood"
          img:'assets/tex/building/wood/wachturm _wood.png' }
      ]
    },
  ];

  // --------- Hilfsfunktionen ------------------------------------------------
  function createEl(tag, cls, html){
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html!=null) el.innerHTML = html;
    return el;
  }
  function button(label, img, action){
    const b = createEl('button','bm-btn');
    const fig = createEl('div','bm-thumb');
    fig.style.backgroundImage = `url("${img}")`;
    const cap = createEl('div','bm-cap', label);
    b.append(fig, cap);
    b.addEventListener('click', ()=>{
      try{
        window.dispatchEvent(new CustomEvent('build:action', { detail:{ action } }));
        LOG.ok('Build-Aktion: %s', action);
      }catch(e){
        LOG.warn('Dispatch fehlgeschlagen (%s): %o', action, e);
      }
    });
    return b;
  }

  function render(){
    PANEL.innerHTML = ''; // clean
    const wrap = createEl('div','bm-wrap');
    CATS.forEach(cat=>{
      const sec = createEl('section','bm-sec');
      sec.append(
        createEl('h3','bm-title', cat.title),
        createEl('div','bm-grid')
      );
      cat.items.forEach(it=>{
        sec.querySelector('.bm-grid').append(
          button(it.label, it.img, it.action)
        );
      });
      wrap.append(sec);
    });
    PANEL.append(wrap);
  }

  // --------- Sichtbarkeit (via ui-bridge Events) ----------------------------
  function show(){ PANEL.style.display = 'block'; }
  function hide(){ PANEL.style.display = 'none'; }

  window.addEventListener('cb:build-open', show);
  window.addEventListener('cb:build-close', hide);

  // --------- Grundlayout (minimal, ergänzt deine ui-build.css) --------------
  const STYLE_ID = 'bm-inline-style-1785';
  if (!document.getElementById(STYLE_ID)) {
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
      #build-panel{ display:none; position:fixed; left:0; right:0; bottom:0;
        max-height:55vh; background:rgba(234,236,238,.96); color:#2C3E50;
        border-top:1px solid #BFC9CA; box-shadow:0 -12px 36px rgba(0,0,0,.18);
        backdrop-filter: blur(4px); z-index: 2147483645; overflow:auto; }
      .bm-wrap{ padding:14px 16px 18px; }
      .bm-sec{ margin-bottom:16px; }
      .bm-title{ margin:0 0 8px; font:600 14px/1.2 system-ui,Segoe UI,Roboto,Arial; opacity:.9;}
      .bm-grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(94px,1fr)); gap:10px; }
      .bm-btn{ display:flex; flex-direction:column; gap:6px; align-items:center; justify-content:flex-start;
        padding:8px; border:1px solid #BFC9CA; border-radius:8px; background:#F2F4F6; cursor:pointer; }
      .bm-btn:focus{ outline:2px solid rgba(52,152,219,.35); outline-offset:2px; }
      .bm-thumb{ width:78px; height:60px; background:#D5D8DC center/contain no-repeat; border-radius:6px; }
      .bm-cap{ font:500 12px/1.15 system-ui,Segoe UI,Roboto,Arial; text-align:center; color:#2C3E50; }
      @media (orientation:landscape){
        #build-panel{ max-height:70vh; }
      }
    `;
    document.head.appendChild(st);
  }

  // --------- Init -----------------------------------------------------------
  try {
    render();
    LOG.info('geladen (v17.8.5)');
  } catch(e){
    LOG.err('Render-Fehler: %o', e);
  }
})();
