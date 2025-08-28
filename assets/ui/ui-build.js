/* ============================================================================
 * assets/ui/ui-build.js – Bau-Menü (UI-Seite)  v16.1.6
 * Hinweis:
 *  - Reines UI (Buttons/Panel). Engine-Platzierung / Kosten checkt deine Logik.
 *  - Lumberjack-Icon: wir nehmen EINEN Frame (BuildMenu-Variante) – alles weitere
 *    (Placed-Frames, Upgrades) erledigt später die Engine.
 *  - Über GameUI.openBuildMenu() / closeBuildMenu() steuerbar
 * ==========================================================================*/

(function(){
  const UI_BUILD_VERSION = "v16.1.6";

  // Mini-Helper für Logs in Inspector
  function logOK(msg){ console.log(`✅ (ok) ${msg}`); window?.Inspector?.logOk?.(msg); }
  function logWarn(msg){ console.warn(`⚠️ (warn) ${msg}`); window?.Inspector?.logWarn?.(msg); }

  // Panel erzeugen (einfach & leicht)
  let panel;
  function ensurePanel(){
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'buildPanel';
    Object.assign(panel.style, {
      position:'fixed', left:'0', right:'0', bottom:'0', background:'rgba(10,25,18,.92)',
      borderTopLeftRadius:'14px', borderTopRightRadius:'14px', padding:'10px 12px', zIndex:1099
    });
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;justify-content:space-between">
        <strong>Bauen</strong>
        <button id="buildClose" style="background:#214f3d;color:#e8f4ec;border:1px solid #2c6c54;border-radius:10px;padding:8px 12px">Schließen</button>
      </div>
      <div id="buildGrid" style="display:flex;gap:10px;overflow:auto;margin-top:8px;padding-bottom:6px"></div>
    `;
    document.body.appendChild(panel);
    panel.querySelector('#buildClose')?.addEventListener('click', () => window.GameUI.closeBuildMenu());
    return panel;
  }

  // Ein einziges Lumberjack-Icon aus deinem Atlas
  async function addLumberjackIcon(gridEl){
    try{
      // Wir verwenden den vorbereiteten Atlas + JSON
      const metaUrl = "./assets/buildings/lumberjack/lumberjack_tiers_grid.json";
      const pngUrl  = "./assets/buildings/lumberjack/lumberjack_tiers_grid.png";
      const meta = await fetch(metaUrl).then(r=>r.json());
      // Erwartet: ein Frame für BuildMenu – wir wählen id 0 (laut deiner CSV)
      // Falls Struktur anders ist, nimm hier alternativ einen festen Ausschnitt.
      const frame = meta?.frames?.find?.(f => /_ug0/i.test(f.filename)) || meta?.frames?.[0];

      const btn = document.createElement('button');
      btn.style.cssText = "background:#173c2e;border:1px solid #2c6c54;border-radius:12px;padding:8px;display:grid;place-items:center;min-width:96px";
      btn.title = "Lumberjack (Holzfällerhütte)";

      const img = new Image();
      img.src = pngUrl; img.alt = "Lumberjack";
      img.style.cssText = "width:96px;height:auto;border-radius:8px;background:#10271f";
      // Hinweis: Wir zeigen aktuell die GANZE PNG. Wenn du exaktes Cropping willst,
      // setze ein <div> mit background-image & background-position basierend auf frame.x/y/w/h.
      // Für die erste Iteration genügt die Gesamtgrafik (du hast nur ein Hauptbild vorgesehen).
      btn.appendChild(img);

      btn.addEventListener('click', () => {
        // Tool im Spiel setzen – deine Engine-API nehmen, falls vorhanden:
        // z.B. window.Game?.setTool?.("lumberjack");
        // Bis dahin: nur Log
        window?.Inspector?.logOk?.("Tool gesetzt: lumberjack");
      });

      gridEl.appendChild(btn);
      logOK("Lumberjack-UI geladen");
    }catch(e){
      logWarn("Lumberjack-UI noch nicht geladen – " + (e?.message||e));
    }
  }

  // Public API
  window.GameUI = window.GameUI || {};
  window.GameUI.openBuildMenu = async function(){
    const p = ensurePanel();
    const grid = p.querySelector('#buildGrid');
    if (grid && !grid.dataset.init){
      grid.dataset.init = "1";
      await addLumberjackIcon(grid);
      // hier gern: weitere Buttons (Straße, Weg, Abriss, etc.) ergänzen
    }
    p.style.display = "block";
  };
  window.GameUI.closeBuildMenu = function(){
    if (panel) panel.style.display = "none";
  };

  logOK(`Bau-Menü bereit (ui-build.js ${UI_BUILD_VERSION})`);
})();
