/* -----------------------------------------------------------
 * UI / Build & Inspector Cockpit
 * Version: v16.1.3
 *
 * WICHTIG:
 *  - Dieses Skript hat KEINE Game-Logik, nur UI/Tests.
 *  - Inspector bündelt Start/Cache/Log/Resourcen/Bau-Menü.
 *  - Toast/HUD richtet sich nach Portrait/Landscape aus.
 *  - Build-Menü nutzt neutrale Kachel hinter Icons/Sprites.
 * --------------------------------------------------------- */

(function(){
  const VERSION = "v16.1.3";
  const log = (...a)=>window.GameLog ? window.GameLog.log(...a) : console.log(...a);

  // ---------- DOM Grundgerüst ----------
  const root = document.getElementById('gameRoot') || document.body;

  // HUD Toast (zeigt Version & kurze Hinweise)
  let hud = document.createElement('div');
  hud.className = 'hud-toast hud-pos-portrait';
  hud.textContent = `UI ${VERSION}`;
  root.appendChild(hud);

  // Build Dock (unten)
  const dock = document.createElement('div');
  dock.id = 'buildDock';
  dock.innerHTML = `<div class="grid" id="buildGrid"></div>`;
  root.appendChild(dock);

  // FABs (links: Cockpit, rechts: Bau)
  const fabLeft = document.createElement('div');
  fabLeft.className = 'fab secondary';
  fabLeft.title = 'Inspector/Cockpit';
  fabLeft.textContent = '⚙︎';
  root.appendChild(fabLeft);

  const fabRight = document.createElement('div');
  fabRight.className = 'fab';
  fabRight.title = 'Bau-Menü';
  fabRight.textContent = '🏗';
  root.appendChild(fabRight);

  // Inspector Panel
  const insp = document.createElement('div');
  insp.id = 'inspector';
  insp.innerHTML = `
    <h3>Inspector / Test-Cockpit (${VERSION})</h3>

    <div class="row">
      <button class="btn" data-start="./assets/maps/map-mini.json">Start map-mini.json</button>
      <button class="btn" data-start="./assets/maps/map-pro.json">Start map-pro.json</button>
      <button class="btn" id="btnCache">Cache leeren</button>
    </div>

    <div class="row">
      <button class="btn" id="btnCopyLog">Log kopieren</button>
      <button class="btn" id="btnOpenBuild">Bau-Menü öffnen</button>
      <button class="btn" id="btnCloseBuild">Bau-Menü schließen</button>
    </div>

    <div class="row">
      <span>Ressourcen:</span>
      <button class="btn" data-res="+100">+100</button>
      <button class="btn" data-res="+1000">+1000</button>
      <button class="btn" data-res="0">0</button>
    </div>

    <small style="opacity:.8;display:block;margin-top:4px">
      Alle Tools & Booster für Tests hier bündeln, damit die Spieloberfläche frei bleibt.
    </small>
  `;
  root.appendChild(insp);

  // ---------- Orientation / Toast Position ----------
  function placeToast(){
    const landscape = window.matchMedia("(orientation: landscape)").matches;
    hud.classList.toggle('hud-pos-portrait', !landscape);
    hud.classList.toggle('hud-pos-landscape', landscape);
  }
  placeToast();
  window.addEventListener('orientationchange', placeToast);
  window.addEventListener('resize', placeToast);

  // ---------- Build-Menü ----------
  const grid = dock.querySelector('#buildGrid');

  // Hilfsbauern: Icon-Kachel erzeugen (mit weißer Platte dahinter)
  function makeTileButton(key, label, imgSrc){
    const btn = document.createElement('button');
    btn.className = 'tile-btn';
    btn.setAttribute('data-tool', key);
    btn.innerHTML = `
      <div class="icon-wrap">
        <img loading="lazy" src="${imgSrc}" alt="">
      </div>
      <div>${label}</div>
    `;
    btn.addEventListener('click', ()=>{
      setActive(btn);
      setTool(key);
    });
    return btn;
  }

  function setActive(btn){
    grid.querySelectorAll('.tile-btn').forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active');
  }

  function openBuild(){
    dock.classList.add('open');
    log("[UI] Bau-Menü geöffnet");
  }
  function closeBuild(){
    dock.classList.remove('open');
    log("[UI] Bau-Menü geschlossen");
  }

  fabRight.addEventListener('click', ()=>{
    (dock.classList.contains('open')? closeBuild : openBuild)();
  });

  // Tool setzen → an Game übergeben (falls vorhanden)
  function setTool(toolKey){
    if (window.GameUI?.setTool){
      window.GameUI.setTool(toolKey);
      log("[UI] Tool gesetzt:", toolKey);
    } else {
      log("[warn] GameUI.setTool fehlt (nur UI gesetzt):", toolKey);
    }
  }

  // Basis-Tools
  const base = [
    {key:'road', label:'Straße', img:'./assets/tex/road/topdown_road_straight.png'},
    {key:'path', label:'Weg', img:'./assets/tex/path/topdown_path0.PNG'},
    {key:'bulldoze', label:'Abreißen', img:'./assets/icons/icons_spritesheet_64.png'}
  ];
  base.forEach(t => grid.appendChild(makeTileButton(t.key, t.label, t.img)));

  // Lumberjack Varianten aus deinem Ordner – einfache Preview (Grid-Sheet verwenden)
  // Hinweis: wir nehmen das Tiers-Grid als Platzhalter-Preview
  const ljPreview = './assets/buildings/lumberjack/lumberjack_tiers_grid.png';
  const lumber = [
    {key:'lumberjack:wood0', label:'wood0', img: ljPreview},
    {key:'lumberjack:wood1', label:'wood1', img: ljPreview},
    {key:'lumberjack:wood2', label:'wood2', img: ljPreview}
  ];
  lumber.forEach(t => grid.appendChild(makeTileButton(t.key, t.label, t.img)));

  // Cancel / Close
  grid.appendChild(makeTileButton('cancel','Abbrechen','./assets/icons/icons_spritesheet_64.png'));

  // ---------- Inspector: Buttons verdrahten ----------
  insp.querySelectorAll('[data-start]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const path = b.getAttribute('data-start');
      if (window.GameLoader?.start){
        log("[ok] GameLoader.start", path);
        window.GameLoader.start(path);
      } else {
        log("❌ GameLoader.start nicht verfügbar – game.js noch nicht initialisiert?");
      }
    });
  });

  document.getElementById('btnCache').addEventListener('click', async ()=>{
    try{
      // Delegiere an vorhandene Methode (falls vorhanden)
      if (window.AppCache?.clear){ await window.AppCache.clear(); }
      // zusätzlich local/sessionStorage
      localStorage.clear(); sessionStorage.clear();
      // SW deregister (best effort)
      if ('serviceWorker' in navigator){
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      log("✅ (ok) Cache/Storage geleert – Seite ggf. neu laden");
    }catch(e){
      log("⚠️ (warn) Cache leeren ging nur teilweise:", e?.message || e);
    }
  });

  document.getElementById('btnCopyLog').addEventListener('click', ()=>{
    if (window.GameLog?.copyToClipboard){
      window.GameLog.copyToClipboard();
      log("✅ (ok) Log in Zwischenablage");
    } else {
      // Fallback: ganzen Text aus #log kopieren
      const el = document.getElementById('log');
      if (!el) return;
      const range = document.createRange(); range.selectNodeContents(el);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      try{ document.execCommand('copy'); } catch(_) {}
      sel.removeAllRanges();
      log("✅ (ok) Log (Fallback) kopiert");
    }
  });

  document.getElementById('btnOpenBuild').addEventListener('click', openBuild);
  document.getElementById('btnCloseBuild').addEventListener('click', closeBuild);

  // Ressourcen-Buttons (nur Testhook)
  insp.querySelectorAll('[data-res]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const val = b.getAttribute('data-res');
      if (window.GameUI?.setResources){
        window.GameUI.setResources(val);
      }
      log("[UI] Ressourcen gesetzt:", val);
    });
  });

  // Inspector toggeln
  fabLeft.addEventListener('click', ()=>{
    insp.classList.toggle('hidden');
  });

  // Initiale Meldung
  log(`[UI] Bau-Menü bereit (ui-build.js ${VERSION})`);

})();
