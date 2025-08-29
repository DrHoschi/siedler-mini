<script>
/* ===== CityBuilder Glue (index→game.js) – v16.1.16 =====
   - rührt dein Layout nicht an
   - verbindet Start/Select mit GameLoader._start(mapUrl)
   - schreibt Logs via CBLog (falls vorhanden)
   - zeigt den Bau-Button erst NACH Spielstart
========================================================= */
(function(){
  const LOG = (lvl,msg)=>{
    try{
      if (window.CBLog) {
        if (lvl==='ok')   CBLog.ok(msg);
        else if (lvl==='warn') CBLog.warn(msg);
        else if (lvl==='err')  CBLog.err(msg);
        else CBLog.push(lvl||'log', msg);
      } else {
        console[lvl==='err'?'error':lvl==='warn'?'warn':'log'](msg);
      }
    }catch(_) {}
  };

  // DOM-Hooks aus deinem Start-Panel (IDs bitte so lassen)
  const $startBtn   = document.getElementById('btn-start')     || document.querySelector('[data-cb="start"]');
  const $restartBtn = document.getElementById('btn-restart')   || document.querySelector('[data-cb="restart"]');
  const $mapSelect  = document.getElementById('map-select')    || document.querySelector('[data-cb="map"]');
  const $btnBuild   = document.getElementById('btn-build'); // links unten (sichtbar nach Start)

  // Einmalige Engine-Wartehilfe
  function waitEngineThenStart(mapUrl){
    if (window.GameLoader && typeof GameLoader._start === 'function') {
      GameLoader._start(mapUrl).catch(e=>{
        LOG('err','Start fehlgeschlagen: '+ (e?.message||e));
      });
    } else {
      LOG('warn','Engine noch nicht bereit – warte auf GameLoader.start …');
      const onReady = ()=> {
        window.removeEventListener('cb:engine-ready', onReady);
        try { GameLoader._start(mapUrl); } catch(e){ LOG('err','Start-Fehler: '+e.message); }
      };
      window.addEventListener('cb:engine-ready', onReady, { once:true });
    }
  }

  // Start-Handler (nimmt Wert aus deinem Select)
  function startFromUI(){
    const sel = ($mapSelect && ($mapSelect.value || $mapSelect.dataset.value)) || 'assets/maps/map-mini.json';
    // Falls Select nur einen Dateinamen liefert, Pfad ergänzen
    const mapUrl = sel.match(/^\.?\/?assets\//) ? sel : ('./assets/maps/' + sel.replace(/^\.?\/?assets\/maps\//,''));
    LOG('ok','Start gedrückt → ' + mapUrl);
    waitEngineThenStart(mapUrl);
  }

  // Neu-Start (dein Cache-Booster bleibt wie gehabt separat)
  function restartOnly(){
    LOG('ok','Neu-Start angefordert');
    // Dein Verhalten hier bewusst minimal halten:
    // UI bleibt, Engine rendert neu beim nächsten Start.
  }

  // Events verdrahten (nur wenn Buttons existieren)
  $startBtn   && $startBtn.addEventListener('click', startFromUI);
  $restartBtn && $restartBtn.addEventListener('click', restartOnly);

  // Nach Spielstart: Bau-Button sichtbar machen + optionalen Hook aufrufen
  window.addEventListener('cb:game-started', (ev)=>{
    try { $btnBuild && $btnBuild.classList.add('visible'); } catch(_){}
    LOG('ok','Event: cb:game-started empfangen');
    // Optional: dein UI-Baumenü automatisch öffnen?
    // window.GameUI?.openBuildMenu?.();
  });
})();
</script>
