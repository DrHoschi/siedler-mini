/* ============================================================================
   Datei:   src/ui-build.js
   Version: v16.1.0
   Zweck:   Bau-Menü + Tools. Nutzt BuildingSprites.getBuildMenuEntries()
            und rendert die Icons direkt aus dem Atlas per CSS background-position.
============================================================================ */

(function(){
  const buildBar   = document.getElementById('buildBar');
  const buildPanel = document.getElementById('buildPanel');

  // Hilfs-Renderer für Atlas-Icons
  function makeIconStyle(atlasURL, frame){
    // Wir skalieren die 512x512 Frames auf 36x36 (CSS .ico) via background-size
    // Hintergrundgröße ist bereits 1024x1024 in CSS gesetzt. Versatz negativ.
    return `background-image:url('${atlasURL}');
            background-position:-${frame.x}px -${frame.y}px;`;
  }

  function addBtn(label, iconSpec, onClick){
    const btn = document.createElement('button');
    btn.className = 'buildBtn';
    const ico = document.createElement('div');
    ico.className = 'ico atlas-lj';
    if(iconSpec) ico.setAttribute('style', makeIconStyle(iconSpec.atlas, iconSpec.frame));
    const txt = document.createElement('span'); txt.textContent = label;
    btn.append(ico, txt);
    btn.onclick = onClick;
    buildPanel.appendChild(btn);
  }

  // --- Tool-Wechsel (nur Log/Platzhalter – deine echte Logik kann hier rein)
  function setTool(name){ window.currentTool = name; AppLog.ok(`Tool gesetzt: ${name}`); }

  // Initialisieren
  function initBuildMenu(){
    buildPanel.textContent = '';

    // Standardtools
    addBtn('Straße', null,   ()=>setTool('road'));
    addBtn('Weg',    null,   ()=>setTool('path'));
    addBtn('Abreißen',null,  ()=>setTool('bulldoze'));
    addBtn('Abbrechen',null, ()=>setTool('cancel'));

    // Lumberjack-Varianten aus dem Atlas (Tier 1–3)
    try{
      const entries = window.BuildingSprites?.getBuildMenuEntries?.() || [];
      entries.forEach(e=>{
        addBtn(e.label, e.icon, ()=>setTool(e.placeSpriteName || 'house'));
      });
      AppLog.ok('Bau-Menü (Lumberjack) geladen');
    }catch(err){
      AppLog.warn('Bau-Menü: Lumberjack-Atlas nicht verfügbar');
    }

    buildBar.hidden = false;
    AppLog.ok('Bau-Menü bereit (ui-build.js v16.1.0)');
  }

  // Expose (falls Editor/Inspector später zugreift)
  window.UIBuild = { initBuildMenu };

  // Auto-Start
  window.addEventListener('load', initBuildMenu);
})();
