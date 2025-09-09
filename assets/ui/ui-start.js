/* ============================================================================
 * UI-Start – Startbildschirm + Startknopf
 * Version: v17.8.3
 * ========================================================================== */
(function(){
  const LOG = (lvl, msg, ...a) =>
    (window.CBLog && CBLog[lvl] ? CBLog[lvl] : console.log).call(null, `[ui-start] ${msg}`, ...a);

  const startPanel = document.getElementById('start-panel');
  const btnStart   = document.getElementById('btnStart');
  const canvas     = document.getElementById('game');

  function showStartPanel(show){
    if(!startPanel) return;
    startPanel.style.display = show ? 'block' : 'none';
  }

  function startGame(){
    // Startpanel schließen, Bootstrap anstoßen
    showStartPanel(false);
    window.dispatchEvent(new CustomEvent('cb:ui-ready'));   // Historisch: “UI ist bereit”
    window.dispatchEvent(new CustomEvent('cb:game-start')); // Spielstart
    LOG('info', 'cb:ui-ready & cb:game-start dispatcht');
  }

  // Startbutton
  if(btnStart) btnStart.addEventListener('click', (e)=>{
    e.preventDefault();
    startGame();
  });

  // Canvas als sichere Größe
  if(canvas){
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }

  LOG('info', 'geladen (v17.8.3)');
})();
