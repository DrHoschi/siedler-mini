/* ui-build.js v16.1.4
   WICHTIGSTE NEUERUNG:
   - Icons aus Gebäude-Atlas (z.B. Lumberjack) werden als EINZELNER Frame gerendert,
     nicht mehr das komplette PNG.
   - Es wird ein 48x48-Thumb über Canvas aus dem Atlas-Frame erzeugt (dataURL).
   - Weiterhin: Build-Bar & Inspector-Hooks wie gehabt.

   Abhängigkeiten: keine (nur DOM/Canvas).
   Pfade:
     assets/buildings/lumberjack/lumberjack_tiers_grid.png
     assets/buildings/lumberjack/lumberjack_tiers_grid.json
*/

window.UIBuild = (function(){
  'use strict';

  const VERSION = '16.1.4';

  /** -----------------------------------------------------------------------
   *  Logging (einheitlich mit Icons / Status)
   *  -------------------------------------------------------------------- */
  const logBoxId = 'logBox';
  function ensureLogBox(){
    let el = document.getElementById(logBoxId);
    if(!el){
      el = document.createElement('pre');
      el.id = logBoxId;
      el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:88px;z-index:11;color:#b6f5b6;background:rgba(0,0,0,0.3);backdrop-filter:blur(10px);padding:12px;border-radius:12px;max-height:40vh;overflow:auto;';
      document.body.appendChild(el);
    }
    return el;
  }
  function logOK(msg){ ensureLogBox().append(`[${time()}] ✅ (ok) ${msg}\n`); }
  function logWARN(msg){ ensureLogBox().append(`[${time()}] ⚠️ (warn) ${msg}\n`); }
  function logERR(msg){ ensureLogBox().append(`[${time()}] ❌ (err) ${msg}\n`); }
  function time(){
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  }

  /** -----------------------------------------------------------------------
   *  Atlas-Lader & Thumb-Renderer
   *  Erwartetes JSON-Format (Texture-Atlas):
   *    { meta: { size:{w,h} }, frames: { "<name>": { frame:{x,y,w,h} } } }
   *  Bei deinem Grid genügt auch eine manuelle Frame-Definition.
   *  -------------------------------------------------------------------- */

  async function loadImage(url){
    const img = new Image();
    img.decoding = 'sync';
    img.src = url;
    await img.decode();
    return img;
  }

  async function loadJSON(url){
    const res = await fetch(url);
    if(!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
    return await res.json();
  }

  /**
   * Erzeugt aus einem Atlas-Frame (sx,sy,sw,sh) ein 48x48 DataURL.
   */
  function frameToDataURL(atlasImage, frame, outSize = 48){
    const {x, y, w, h} = frame;
    const c = document.createElement('canvas');
    c.width = outSize; c.height = outSize;
    const ctx = c.getContext('2d');
    // gleichmäßig auf Zielgröße einpassen (contain)
    const scale = Math.min(outSize / w, outSize / h);
    const dw = Math.round(w * scale);
    const dh = Math.round(h * scale);
    const dx = Math.floor((outSize - dw) / 2);
    const dy = Math.floor((outSize - dh) / 2);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(atlasImage, x, y, w, h, dx, dy, dw, dh);
    return c.toDataURL('image/png');
  }

  /** -----------------------------------------------------------------------
   *  KONFIG: welches Frame nutzt das Bau-Menü für „Haus = Lumberjack“?
   *  Du hast mir CSV geschickt, erste Zeile:
   *    id:0, name:lumberjack_wood0_ug0, role:BuildMenu, frame.x:0, frame.y:0
   *  Wir setzen hier fest: Frame-Größe = 512x512 (dein Raster).
   *  Falls sich das ändert, bitte hier anpassen oder aus JSON lesen.
   *  -------------------------------------------------------------------- */
  const LUMBERJACK_ATLAS_PNG = 'assets/buildings/lumberjack/lumberjack_tiers_grid.png';
  const LUMBERJACK_ATLAS_JSON = 'assets/buildings/lumberjack/lumberjack_tiers_grid.json';
  const LUMBERJACK_FALLBACK_FRAME = { x: 0, y: 0, w: 512, h: 512 }; // BuildMenu-Icon (Tier1 ug0)

  // Wird beim Start geladen & zwischengespeichert
  const IconCache = new Map();

  async function getLumberjackBuildIcon(){
    if(IconCache.has('lumberjack')) return IconCache.get('lumberjack');

    try{
      // Versuche JSON zu lesen (falls Frames dort definiert)
      // Suchstrategie: nimm den ersten Frame mit role=BuildMenu oder Name, der *_ug0 enthält.
      const [atlasImg, atlasJson] = await Promise.all([
        loadImage(LUMBERJACK_ATLAS_PNG),
        loadJSON(LUMBERJACK_ATLAS_JSON).catch(()=>null)
      ]);

      let frame = LUMBERJACK_FALLBACK_FRAME;

      if(atlasJson && atlasJson.frames){
        // Suche nach Eintrag „lumberjack_wood0_ug0“ oder role=BuildMenu
        const entries = Object.entries(atlasJson.frames);
        const best = entries.find(([name, fr]) =>
          /lumberjack.*ug0/i.test(name) || /BuildMenu/i.test(name)
        ) || entries[0];

        if(best){
          const fr = best[1].frame || best[1]; // je nach Export
          if(fr && Number.isFinite(fr.x) && Number.isFinite(fr.y) && fr.w && fr.h){
            frame = { x: fr.x, y: fr.y, w: fr.w, h: fr.h };
          }
        }
      }

      const dataURL = frameToDataURL(atlasImg, frame, 48);
      IconCache.set('lumberjack', dataURL);
      return dataURL;
    }catch(err){
      logWARN(`Lumberjack-Atlas konnte nicht gelesen werden (${err.message}) – benutze Platzhalter.`);
      // Notfall: neutrales Icon (grün)
      const c = document.createElement('canvas');
      c.width = 48; c.height = 48;
      const g = c.getContext('2d');
      g.fillStyle = '#2e6b2e'; g.fillRect(0,0,48,48);
      g.fillStyle = '#cfe9cf'; g.fillRect(8,8,32,32);
      const dataURL = c.toDataURL('image/png');
      IconCache.set('lumberjack', dataURL);
      return dataURL;
    }
  }

  /** -----------------------------------------------------------------------
   *  Build-Bar (Buttons unten)
   *  -------------------------------------------------------------------- */
  let buildBar;

  function ensureBuildBar(){
    if(buildBar) return buildBar;
    buildBar = document.getElementById('buildBar');
    if(!buildBar){
      buildBar = document.createElement('div');
      buildBar.id = 'buildBar';
      document.body.appendChild(buildBar);
    }
    return buildBar;
  }

  function makeBtn(label){
    const b = document.createElement('button');
    b.className = 'buildBtn';
    b.innerHTML = `<img class="bm-icon" alt=""><span>${label}</span>`;
    return b;
  }

  // Wire zu deinem bestehenden Game-API (so wie vorher)
  function setTool(name){
    if(window.Game && typeof window.Game.setTool === 'function'){
      window.Game.setTool(name);
      logOK(`Tool gesetzt: ${name}`);
    }else{
      logWARN(`Tool „${name}“ gesetzt (UI), aber Game.setTool fehlt.`);
    }
  }

  /** Public: initialisieren */
  async function init(){
    ensureBuildBar();

    // Buttons – Straße, Weg, Bulldozer
    const btnRoad = makeBtn('Straße');   btnRoad.onclick = ()=>setTool('road');
    const btnPath = makeBtn('Weg');      btnPath.onclick = ()=>setTool('path');
    const btnBulld = makeBtn('Abreißen');btnBulld.onclick = ()=>setTool('bulldoze');

    // „Haus“ = Lumberjack (nur EIN Frame aus Atlas)
    const btnHouse = makeBtn('Haus');
    btnHouse.onclick = ()=>setTool('house');
    // Icon laden & einsetzen
    try{
      const iconURL = await getLumberjackBuildIcon();
      btnHouse.querySelector('img.bm-icon').src = iconURL;
    }catch(e){
      logWARN(`Lumberjack-Icon konnte nicht erzeugt werden (${e?.message || e}).`);
    }

    // Demo: „Fabrik“ (Platzhalter-Icon)
    const btnFactory = makeBtn('Fabrik');btnFactory.onclick = ()=>setTool('factory');

    // Cancel
    const btnCancel = makeBtn('Abbrechen');btnCancel.onclick = ()=>setTool('cancel');

    // Reihenfolge in Bar
    const bar = ensureBuildBar();
    bar.innerHTML = '';
    [btnRoad, btnPath, btnBulld, btnHouse, btnFactory, btnCancel].forEach(b=>bar.appendChild(b));

    logOK(`Bau-Menü bereit (ui-build.js v${VERSION})`);
  }

  /** -----------------------------------------------------------------------
   *  Inspector-Hooks (Buttons zum Öffnen/Schließen aus deinem Cockpit)
   *  -> einfach aufrufen: UIBuild.openBar(), UIBuild.closeBar()
   *  -------------------------------------------------------------------- */
  function openBar(){
    ensureBuildBar().style.display = 'flex';
    logOK('Bau-Menü geöffnet');
  }
  function closeBar(){
    ensureBuildBar().style.display = 'none';
    logOK('Bau-Menü geschlossen');
  }

  /** API */
  return { init, openBar, closeBar, VERSION };
})();

/* Auto-Init nach DOM-Ready (falls Index das möchte) */
(function(){
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => window.UIBuild?.init());
  }else{
    window.UIBuild?.init();
  }
})();
