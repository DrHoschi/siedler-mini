/*
  Datei : assets/ui/ui-build.js
  Build : v16.0.9
  Zweck : Bau-Menü UI + Tool-Auswahl (Road/Bulldozer/Haus/etc.)
  Hooks : 
    - window.GameAPI?.setTool(toolId)
    - window.Game?.setTool?.(toolId)
    - document.dispatchEvent(new CustomEvent('game:tool', {detail: toolId}))
  Log   : nutzt window.LogUI (✅⚠️❌)
*/

(function(){
  const VERSION = '16.0.9';

  function logOk(m){ window.LogUI?.ok(m); }
  function logWarn(m){ window.LogUI?.warn(m); }
  function logErr(m){ window.LogUI?.err(m); }

  function ensureRoot(){
    const root = document.getElementById('build-root');
    if (!root) return null;

    // Toggle-Button oben einblenden
    const toggle = document.getElementById('build-toggle');
    if (toggle){
      toggle.style.display = 'inline-block';
      toggle.addEventListener('click', ()=>panel.classList.toggle('hidden'));
    }

    // Panel DOM
    root.innerHTML = `
      <div id="build-panel" class="hidden" role="dialog" aria-label="Bau-Menü" aria-modal="false">
        <div id="build-header">
          <div id="build-title">🏗️ Bauen (v${VERSION})</div>
          <div id="build-spacer"></div>
          <button id="build-close">⬇️</button>
        </div>
        <div id="build-grid">
          <!-- Reihenfolge bewusst kompakt gehalten (iPad) -->
          <button class="build-btn" data-tool="road"><span class="icon">🛣️</span>Straße</button>
          <button class="build-btn" data-tool="path"><span class="icon">🚶</span>Weg</button>
          <button class="build-btn" data-tool="bulldoze"><span class="icon">🪓</span>Abreißen</button>
          <button class="build-btn" data-tool="house"><span class="icon">🏠</span>Haus</button>
          <button class="build-btn" data-tool="factory"><span class="icon">🏭</span>Fabrik</button>
          <button class="build-btn" data-tool="cancel"><span class="icon">⛔</span>Abbrechen</button>
        </div>
      </div>
    `;
    return root.querySelector('#build-panel');
  }

  function callTool(toolId){
    // 1) Bevorzugter Hook
    if (window.GameAPI && typeof window.GameAPI.setTool === 'function'){
      window.GameAPI.setTool(toolId);
      return true;
    }
    // 2) Alternativ alter Hook
    if (window.Game && typeof window.Game.setTool === 'function'){
      window.Game.setTool(toolId);
      return true;
    }
    // 3) Event-Bridge
    document.dispatchEvent(new CustomEvent('game:tool',{detail: toolId}));
    return false; // keine Garantie, dass jemand zuhört
  }

  const panel = ensureRoot();
  if (!panel){
    logErr('Bau-Menü konnte nicht initialisiert werden (build-root fehlt).');
    return;
  }

  // Buttons verdrahten
  const closeBtn = panel.querySelector('#build-close');
  closeBtn.addEventListener('click', ()=>panel.classList.add('hidden'));

  const btns = Array.from(panel.querySelectorAll('.build-btn'));
  let active = null;

  function setActive(btn){
    btns.forEach(b=>b.classList.toggle('active', b===btn));
    active = btn;
  }

  btns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tool = btn.getAttribute('data-tool');
      const ok = callTool(tool);
      setActive(btn);

      if (ok){
        logOk(`Tool gesetzt: ${tool}`);
      }else{
        logWarn(`Tool gewählt (${tool}), aber kein Game-Hook gefunden – nur Event 'game:tool' gesendet.`);
      }
      // Panel automatisch offen lassen, damit iPad-Pro Nutzer mehrfach tippen kann
    }, {passive:true});
  });

  // Sichtbarkeit nach Start automatisch öffnen (optional)
  window.addEventListener('game:started', ()=>{
    panel.classList.remove('hidden');
  });

  logOk(`Bau-Menü bereit (ui-build.js v${VERSION})`);
})();
