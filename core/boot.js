/* ============================================================================
 * Datei   : core/boot.js
 * Projekt : Neue Siedler
 * Version : v25.10.20
 * Zweck   : Boot-Sequenz – Initialisierung & Startsteuerung
 *
 *  - Wartet auf: UI + Assets + Registry (alle ready)
 *  - Reagiert auf: req:game:start
 *  - Bestätigt Boot: cb:boot:ready
 *  - Startet Spiel:  cb:game:start  (+ UI/Map/HUD/Buildmenu-Requests)
 *
 * Kompatibilität:
 *  - ui-start feuert bei dir: cb:ui-ready (Bindestrich!)
 *  - Dieser Boot lauscht auf beide Varianten (Bindestrich UND Doppelpunkt):
 *      cb:ui-ready        / cb:ui:ready
 *      cb:assets-ready    / cb:assets:ready
 *      cb:registry-ready  / cb:registry:ready
 * ============================================================================ */
(function(root, factory){
  root.SiedlerBoot = factory();
})(typeof window !== "undefined" ? window : this, function(){

  const BOOT_VERSION = "v25.10.19-final";

  // Kurze Logger-Delegates (gehen in CBLog oder die Konsole)
  const ok   = (m)=> (window.CBLog?.ok   || console.log   )(`[boot] ${m}`);
  const info = (m)=> (window.CBLog?.info || console.info  )(`[boot] ${m}`);
  const warn = (m)=> (window.CBLog?.warn || console.warn  )(`[boot] ${m}`);
  const err  = (m)=> (window.CBLog?.err  || console.error )(`[boot] ${m}`);

  // Erwartete Event-Namen (samt Alias)
  const EV = {
    UI_READY_A       : 'cb:ui-ready',        // Bindestrich  (bei dir im ui-start)
    UI_READY_B       : 'cb:ui:ready',        // Doppelpunkt (Fallback)
    ASSETS_READY_A   : 'cb:assets-ready',
    ASSETS_READY_B   : 'cb:assets:ready',
    REGISTRY_READY_A : 'cb:registry-ready',
    REGISTRY_READY_B : 'cb:registry:ready',

    REQ_GAME_START   : 'req:game:start',
    BOOT_READY       : 'cb:boot:ready',
    GAME_START       : 'cb:game:start'
  };

  class BootManager {
    constructor(){
      // interner Status
      this.uiReady = false;
      this.assetsReady = false;
      this.registryReady = false;
      this.bootReadyEmitted = false;
      this.startRequested = false;

      // Ready-Quellen (beide Varianten „A“ & „B“)
      window.addEventListener(EV.UI_READY_A,       ()=> this.onUIReady());
      window.addEventListener(EV.UI_READY_B,       ()=> this.onUIReady());
      window.addEventListener(EV.ASSETS_READY_A,   ()=> this.onAssetsReady());
      window.addEventListener(EV.ASSETS_READY_B,   ()=> this.onAssetsReady());
      window.addEventListener(EV.REGISTRY_READY_A, ()=> this.onRegistryReady());
      window.addEventListener(EV.REGISTRY_READY_B, ()=> this.onRegistryReady());

      // Start-Anforderung (vom Startpanel / Button)
      window.addEventListener(EV.REQ_GAME_START,   ()=> this.onStartRequested());

      info(`BootManager initialisiert (${BOOT_VERSION})`);
      this._fallbackUiReady(); // falls ui-start kein explizites UI-Event feuert
      ok('BootManager aktiv');
    }

    /* ---------- Fallback: UI-Ready (DOM) ---------- */
    _fallbackUiReady(){
      const mark = ()=> {
        if (!this.uiReady) {
          window.dispatchEvent(new CustomEvent(EV.UI_READY_A));
          info('UI ready (DOMContentLoaded Fallback)');
        }
      };
      if (document.readyState === 'complete' || document.readyState === 'interactive'){
        setTimeout(mark, 0);
      } else {
        window.addEventListener('DOMContentLoaded', mark, { once:true });
      }
    }

    /* ---------- Ready-Quellen ---------- */
    onUIReady(){
      if (this.uiReady) return;
      this.uiReady = true;
      ok('UI bereit – warte auf Assets & Registry …');
      this.tryBootReady();
    }
    onAssetsReady(){
      if (this.assetsReady) return;
      this.assetsReady = true;
      ok('Assets bereit ✅');
      this.tryBootReady();
    }
    onRegistryReady(){
      if (this.registryReady) return;
      this.registryReady = true;
      ok('Registry bereit ✅');
      this.tryBootReady();
    }

    /* ---------- Boot-Freigabe ---------- */
    tryBootReady(){
      if (this.bootReadyEmitted) return;
      if (this.uiReady && this.assetsReady && this.registryReady){
        this.bootReadyEmitted = true;
        ok(`Boot abgeschlossen → ${EV.BOOT_READY}`);
        window.dispatchEvent(new CustomEvent(EV.BOOT_READY));

        // „Spiel starten“ wurde schon gedrückt? → jetzt nachholen
        if (this.startRequested) this._startGame();
      }
    }

    /* ---------- Start-Flow ---------- */
    onStartRequested(){
      this.startRequested = true;
      if (!this.bootReadyEmitted){
        // Nicht hart abbrechen – wir warten höflich weiter.
        warn('Start zurückgestellt – warte auf Ready (UI/Assets/Registry).');
        return;
      }
      this._startGame();
    }

    _startGame(){
      ok(`Spielstart → ${EV.GAME_START}`);
      // UI: Startpanel ausblenden (ui-start reagiert darauf)
      // window.dispatchEvent(new CustomEvent('req:ui:startpanel:hide'));

  ok('Spielstart → cb:game:start');
     window.dispatchEvent(new CustomEvent(EV.GAME_START)); // 'cb:game:start'
  // window.dispatchEvent(new CustomEvent(EV.GAME_START_B));
  // window.dispatchEvent(new CustomEvent(EV.GAME_START_A));

  setPlayingState();

      // Startpanel zu, Map bauen, HUD/Build zeigen (minimal & sicher):
      window.dispatchEvent(new CustomEvent('req:ui:startpanel:hide'));
      window.dispatchEvent(new CustomEvent('req:map:init'));
       window.dispatchEvent(new CustomEvent(EV.GAME_START));     // 'cb:game:start'
  window.dispatchEvent(new CustomEvent('cb:game-start'));   // Alias, falls jemand darauf hört      window.dispatchEvent(new CustomEvent('req:hud:show'));
      window.dispatchEvent(new CustomEvent('req:buildmenu:show'));

   // 4) Sichtbarkeitszustand sicher setzen (falls CSS darauf reagiert)
  document.body.classList.add('is-playing');

        // 5) HUD & Build öffnen – sofort ...
  window.dispatchEvent(new CustomEvent('req:hud:show'));
  window.dispatchEvent(new CustomEvent('req:buildmenu:show'));

   
      // Spieloberfläche / Feature-Requests
      // window.dispatchEvent(new CustomEvent('req:map:init'));
      // window.dispatchEvent(new CustomEvent('req:hud:show'));
      // window.dispatchEvent(new CustomEvent('req:buildmenu:show'));

      // Bestätigung für Listener
      window.dispatchEvent(new CustomEvent(EV.GAME_START));
    }
  }

  // Singleton-Instanz
  window.__boot = new BootManager();
  return BootManager;
});

/* ---------- Fehler global in den Inspector loggen (ohne Alert-Blocker) ---------- */
window.addEventListener('error', (e)=>{
  (window.CBLog?.err || console.error)(`Uncaught Error: ${e.message} @ ${e.filename}:${e.lineno}`);
});
window.addEventListener('unhandledrejection', (e)=>{
  const msg = e?.reason?.message || String(e.reason || e);
  (window.CBLog?.err || console.error)(`Unhandled Promise Rejection: ${msg}`);
});

// Failsafe: sobald Spiel wirklich startet, erzwinge Layout an
window.addEventListener('cb:game:start', () => {
  document.body.classList.add('is-playing');
  (window.CBLog?.info||console.info)('[layout] failsafe enable (via boot)');
}, { once:true });
