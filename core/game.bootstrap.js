/* ============================================================================
 * Datei   : core/game.bootstrap.js
 * Projekt : Neue Siedler
 * Version : v25.10.16-1
 * Zweck   : Verbindet Boot-Sequenz mit dem Spiel (Canvas/HUD vorbereiten)
 * ============================================================================
 */
<script>
  // einmalig beim Boot, noch bevor das Spiel startet
  window.addEventListener('cb:registry:ready', () => {
    // sanft setzen: nur wenn nicht schon vorhanden
    const R = (window.Registry && Registry.resources) || (window.RegistryValues || {});
    if (R.wood  == null) R.wood  = 10;
    if (R.stone == null) R.stone = 10;
    if (R.fish  == null) R.fish  = 3;
    if (R.gold  == null) R.gold  = 0;

    // Inspector updaten
    window.dispatchEvent(new Event('req:res:snapshot'));
  });
</script>
  
(function(root, factory){
  root.SiedlerGameBootstrap = factory();
})(typeof window !== "undefined" ? window : this, function(){

  const VER = "v25.10.16-1";
  const LOG = (m)=> (window.CBLog?.ok || console.log)(`[bootstrap] ${m}`);

  class GameBootstrap {
    constructor(){
      this.canvas = document.getElementById("game-canvas");
      this.ctx    = this.canvas.getContext("2d");
      this.hudRoot= document.getElementById("ui-root");

      window.addEventListener("cb:boot-ready", ()=> this.onBootReady());
      window.addEventListener("cb:game-start", ()=> this.onGameStart());

      LOG(`initialisiert (${VER})`);
    }

    onBootReady(){
      LOG("Boot ready – Canvas baseline zeichnen");
      this.resizeCanvas();
      window.addEventListener("resize", ()=> this.resizeCanvas());
      this.drawSplash();
    }

    onGameStart(){
      LOG("Starte Spiel – HUD freigeben, Szene initialisieren");
      document.body.classList.add("is-started"); // Startbild weich ausblenden (CSS)
      this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      this.ctx.fillStyle="#2e5939"; this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
      this.ctx.fillStyle="#fff"; this.ctx.font="20px Inter"; this.ctx.fillText("Spiel läuft – (HUD folgt)", 32, 56);
      window.dispatchEvent(new CustomEvent("cb:game:initialized"));
    }

    resizeCanvas(){
      this.canvas.width  = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
    drawSplash(){
      this.ctx.fillStyle = "rgba(0,0,0,0.15)";
      this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
      this.ctx.fillStyle="#fff"; this.ctx.font="18px Inter"; 
      this.ctx.fillText("Warte auf Start …", 24, 40);
    }
  }

  window.__gameBootstrap = new GameBootstrap();
  return GameBootstrap;
});
