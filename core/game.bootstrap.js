/* ============================================================================
 * Datei   : core/game.bootstrap.js
 * Projekt : Neue Siedler
 * Version : v25.10.24-mapctrl
 * Zweck   : Boot ↔ Spiel verbinden, Canvas vorbereiten, Platzier-Controller
 * ========================================================================== */

(function(root, factory){
  root.SiedlerGameBootstrap = factory();
})(typeof window !== "undefined" ? window : this, function(){

  const VER = "v25.10.24-mapctrl";
  const LOG = (m)=> (window.CBLog?.ok || console.log)(`[bootstrap] ${m}`);

  class GameBootstrap {
    constructor(){
      // IDs an dein aktuelles Markup angepasst
      this.canvas  = document.getElementById("game");
      this.ctx     = this.canvas?.getContext("2d");
      this.hudRoot = document.getElementById("hud-root");

      // Guards
      if (!this.canvas || !this.ctx) {
        console.error("[bootstrap] Canvas #game fehlt!");
        return;
      }

      // Boot & Start
      addEventListener("cb:boot:ready",  () => this.onBootReady(),  { once:true });
      addEventListener("cb:game:start",  () => this.onGameStart(),  { once:true });

      // Ressourcen-Snapshot initial, sobald Registry fertig
      addEventListener("cb:registry:ready", () => {
        try { dispatchEvent(new Event("req:res:snapshot")); } catch(e){}
      }, { once:true });

      // Resize
      addEventListener("resize", () => this.resizeCanvas());

      // --- Platzier-Controller (UI → Game events) -------------------------
      this._placingId = null;

      // Merke aktuell gewünschtes Gebäude
      addEventListener('req:place:start', (ev)=>{
        this._placingId = ev?.detail?.buildingId || null;
      });

      // Beende Plazieren (egal ob bestätigt oder abgebrochen)
      addEventListener('cb:place:done', ()=>{
        this._placingId = null;
      });

      // Pointer → Tile umrechnen
      const toTile = (clientX, clientY) => {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const ts = (window.Game?.tileSize)||32;
        return { tx: Math.floor(x/ts), ty: Math.floor(y/ts) };
      };

      // Maus/Touch bewegt → Vorschau
      const onMove = (x, y) => {
        if (!this._placingId) return;
        const {tx,ty} = toTile(x,y);
        dispatchEvent(new CustomEvent('req:place:cursor', { detail:{ tx, ty, id: this._placingId }}));
      };

      // Klick/Touch → bestätigen
      const onClick = (x, y) => {
        if (!this._placingId) return;
        const {tx,ty} = toTile(x,y);
        dispatchEvent(new CustomEvent('req:place:confirm', { detail:{ tx, ty }}));
      };

      // Pointer-Handler
      this.canvas.addEventListener('mousemove', (e)=> onMove(e.clientX, e.clientY), { passive:true });
      this.canvas.addEventListener('click',     (e)=> onClick(e.clientX, e.clientY));
      this.canvas.addEventListener('touchmove', (e)=> { const t=e.touches[0]; if(t) onMove(t.clientX,t.clientY); }, { passive:true });
      this.canvas.addEventListener('touchend',  (e)=> { const t=e.changedTouches[0]; if(t) onClick(t.clientX,t.clientY); });

      LOG(`initialisiert (${VER})`);
    }

    onBootReady(){
      LOG("Boot ready – Canvas baseline");
      this.resizeCanvas();
      this.drawSplash();
    }

    onGameStart(){
      LOG("Starte Spiel – Szene initialisieren");
      this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      // einfache neutrale Fläche; deine Map-Engine kann hier später rein
      this.ctx.fillStyle="#1a1d22";
      this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
      dispatchEvent(new CustomEvent("cb:game:initialized"));
      // Game-Loop starten (sicher)
      try { Game.start(); } catch(e){ console.error('[bootstrap] Game.start()', e); }
    }

    resizeCanvas(){
      this.canvas.width  = Math.floor(window.innerWidth);
      this.canvas.height = Math.floor(window.innerHeight);
    }

    drawSplash(){
      this.ctx.fillStyle = "rgba(0,0,0,0.15)";
      this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
      this.ctx.fillStyle = "#fff";
      this.ctx.font = "18px Inter, system-ui, sans-serif";
      this.ctx.fillText("Warte auf Start …", 24, 40);
    }
  }

  window.__gameBootstrap = new GameBootstrap();
  return GameBootstrap;
});
