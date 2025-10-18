/* ============================================================================
 * Datei   : core/boot.js
 * Projekt : Neue Siedler
 * Version : v25.10.17-2 (final)
 * Zweck   : Boot-Sequenz – Initialisierung & Startsteuerung
 *          - Wartet auf: UI + Assets + Registry (alle ready)
 *          - Reagiert auf: req:game:start
 *          - Bestätigt Boot: cb:boot:ready
 *          - Startet Spiel: cb:game:start + UI/Map/HUD/Buildmenu-Requests
 * ============================================================================ */
(function(root, factory){
  root.SiedlerBoot = factory();
})(typeof window !== "undefined" ? window : this, function(){

  const BOOT_VERSION = "v25.10.17-2";

  // Log-Kürzel
  const ok   = (m)=> (window.CBLog?.ok   || console.log   )(`[boot] ${m}`);
  const info = (m)=> (window.CBLog?.info || console.info  )(`[boot] ${m}`);
  const warn = (m)=> (window.CBLog?.warn || console.warn  )(`[boot] ${m}`);
  const err  = (m)=> (window.CBLog?.err  || console.error )(`[boot] ${m}`);

  // Erwartete Events (alle mit Doppelpunkt!)
  const EV = {
    UI_READY       : 'cb:ui:ready',
    ASSETS_READY   : 'cb:assets:ready',
    REGISTRY_READY : 'cb:registry:ready',
    REQ_GAME_START : 'req:game:start',
    BOOT_READY     : 'cb:boot:ready',
    GAME_START     : 'cb:game:start'
  };

  class BootManager {
    constructor(){
      this.uiReady = false;
      this.assetsReady = false;
      this.registryReady = false;
      this.bootReadyEmitted = false;
      this.startRequested = false;

      // Hooks: Ready-Quellen
      window.addEventListener(EV.UI_READY,       ()=> this.onUIReady());
      window.addEventListener(EV.ASSETS_READY,   ()=> this.onAssetsReady());
      window.addEventListener(EV.REGISTRY_READY, ()=> this.onRegistryReady());

      // Hook: Start-Anforderung (vom Startpanel)
      window.addEventListener(EV.REQ_GAME_START, ()=> this.onStartRequested());

      info(`BootManager initialisiert (${BOOT_VERSION})`);
      this._fallbackUiReady(); // falls UI-Ready nicht explizit gefeuert wird
    }

    /* ---------- Fallback: UI-Ready, falls kein explizites Event kommt ---------- */
    _fallbackUiReady(){
      // Wenn dein ui-start.js EV.UI_READY korrekt feuert, greift dieser Fallback nicht.
      if (document.readyState === 'complete' || document.readyState === 'interactive'){
        // minimaler Delay, um Module zu initialisieren
        setTimeout(()=> {
          if (!this.uiReady) {
            window.dispatchEvent(new CustomEvent(EV.UI_READY));
            info('UI ready (Fallback DOM)');
          }
        }, 0);
      } else {
        window.addEventListener('DOMContentLoaded', ()=>{
          if (!this.uiReady) {
            window.dispatchEvent(new CustomEvent(EV.UI_READY));
            info('UI ready (DOMContentLoaded Fallback)');
          }
        }, { once:true });
      }
    }

    /* -------------------- Ready-Quellen -------------------- */
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

    /* -------------------- Boot-Freigabe -------------------- */
    tryBootReady(){
      if (this.bootReadyEmitted) return;
      if (this.uiReady && this.assetsReady && this.registryReady){
        this.bootReadyEmitted = true;
        ok('Boot abgeschlossen → ' + EV.BOOT_READY);
        window.dispatchEvent(new CustomEvent(EV.BOOT_READY));

        // Falls der Spieler vorher schon "Spiel starten" gedrückt hat,
        // holen wir den Start jetzt nach:
        if (this.startRequested) this._startGame();
      }
    }

    /* -------------------- Start-Flow -------------------- */
    onStartRequested(){
      this.startRequested = true;
      // Noch nicht bereit? -> höflich warten, nicht "abbrechen"
      if (!this.bootReadyEmitted){
        warn('Start zurückgestellt – warte auf Ready (UI/Assets/Registry).');
        return;
      }
      this._startGame();
    }

    _startGame(){
      ok('Spielstart → ' + EV.GAME_START);

      // UI: Startpanel ausblenden (dein ui-start.js reagiert hierdrauf)
      window.dispatchEvent(new CustomEvent('req:ui:startpanel:hide'));

      // Spieloberfläche – Map/HUD/Baumenü
      window.dispatchEvent(new CustomEvent('req:map:init'));
      window.dispatchEvent(new CustomEvent('req:hud:show'));
      window.dispatchEvent(new CustomEvent('req:buildmenu:show'));

      // Game-Start-Bestätigung (falls andere Module zuhören)
      window.dispatchEvent(new CustomEvent(EV.GAME_START));
    }
  }

  window.__boot = new BootManager();
  ok('BootManager aktiv');
  return BootManager;
});

/* ---------- Globale Fehler in Inspector loggen – ohne störende Alerts ---------- */
window.addEventListener("error", (e)=>{
  (window.CBLog?.err || console.error)(`Uncaught Error: ${e.message} @ ${e.filename}:${e.lineno}`);
});
window.addEventListener("unhandledrejection", (e)=>{
  const msg = e?.reason?.message || String(e.reason || e);
  (window.CBLog?.err || console.error)(`Unhandled Promise Rejection: ${msg}`);
});
