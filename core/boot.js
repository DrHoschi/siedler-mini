/* ============================================================================
 * Datei   : core/boot.js
 * Projekt : Neue Siedler
 * Version : v25.10.27-boot2
 * Zweck   : Boot-Sequenz – Initialisierung & Startsteuerung
 *
 *  - Wartet auf: UI + Assets + Registry (alle ready)
 *  - Reagiert auf: req:game:start   (vom Startpanel/Hotkey)
 *  - Bestätigt Boot: cb:boot:ready
 *  - Startet Spiel:  cb:game:start  (+ Alias cb:game-start für Legacy)
 *
 * Kompatibilität:
 *  - Lauscht auf Bindestrich- und Doppelpunkt-Varianten:
 *      cb:ui-ready        / cb:ui:ready
 *      cb:assets-ready    / cb:assets:ready
 *      cb:registry-ready  / cb:registry:ready
 *
 * WICHTIG:
 *  - Wir feuern cb:game:start **genau einmal** (plus Legacy-Alias).
 *  - Keine undefinierten Helfer (z. B. setPlayingState). Body-Class setzen wir selbst.
 * ============================================================================ */
(function(root, factory){
  root.SiedlerBoot = factory();
})(typeof window !== "undefined" ? window : this, function(){

  const BOOT_VERSION = "v25.10.27-boot2";

  // Logger
  const ok   = (m)=> (window.CBLog?.ok   || console.log   )(`[boot] ${m}`);
  const info = (m)=> (window.CBLog?.info || console.info  )(`[boot] ${m}`);
  const warn = (m)=> (window.CBLog?.warn || console.warn  )(`[boot] ${m}`);
  const err  = (m)=> (window.CBLog?.err  || console.error )(`[boot] ${m}`);

  // Eventnamen
  const EV = {
    UI_READY_A       : 'cb:ui-ready',
    UI_READY_B       : 'cb:ui:ready',
    ASSETS_READY_A   : 'cb:assets-ready',
    ASSETS_READY_B   : 'cb:assets:ready',
    REGISTRY_READY_A : 'cb:registry-ready',
    REGISTRY_READY_B : 'cb:registry:ready',

    REQ_GAME_START   : 'req:game:start',
    BOOT_READY       : 'cb:boot:ready',
    GAME_START       : 'cb:game:start',
    GAME_START_LEG   : 'cb:game-start'
  };

  // Helper: Event emit (window + document, failsafe)
  function emit(name, detail){
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
    try { document.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
  }

  class BootManager {
    constructor(){
      this.uiReady = false;
      this.assetsReady = false;
      this.registryReady = false;
      this.bootReadyEmitted = false;
      this.startRequested = false;
      this.gameStarted = false;

      // Ready-Quellen
      addEventListener(EV.UI_READY_A,       ()=> this.onUIReady());
      addEventListener(EV.UI_READY_B,       ()=> this.onUIReady());
      addEventListener(EV.ASSETS_READY_A,   ()=> this.onAssetsReady());
      addEventListener(EV.ASSETS_READY_B,   ()=> this.onAssetsReady());
      addEventListener(EV.REGISTRY_READY_A, ()=> this.onRegistryReady());
      addEventListener(EV.REGISTRY_READY_B, ()=> this.onRegistryReady());

      // Start aus UI/Panel
      addEventListener(EV.REQ_GAME_START,   ()=> this.onStartRequested());

      info(`BootManager initialisiert (${BOOT_VERSION})`);
      this._fallbackUiReady(); // falls ui-start kein Event feuert
      ok('BootManager aktiv');
    }

    /* ---------- Fallback: UI-Ready (DOMContentLoaded) ---------- */
    _fallbackUiReady(){
      const mark = ()=> {
        if (!this.uiReady) {
          this.uiReady = true;
          emit(EV.UI_READY_A);
          info('UI ready (DOMContentLoaded Fallback)');
          this.tryBootReady();
        }
      };
      if (document.readyState === 'complete' || document.readyState === 'interactive'){
        setTimeout(mark, 0);
      } else {
        addEventListener('DOMContentLoaded', mark, { once:true });
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
        emit(EV.BOOT_READY);

        // Nachholen, falls Start schon angefordert
        if (this.startRequested) this._startGame();
      }
    }

    /* ---------- Start-Flow ---------- */
    onStartRequested(){
      this.startRequested = true;
      if (!this.bootReadyEmitted){
        warn('Start zurückgestellt – warte auf Ready (UI/Assets/Registry).');
        return;
      }
      this._startGame();
    }

    _startGame(){
      if (this.gameStarted) return; // Schutz gegen Doppelstarts
      this.gameStarted = true;

      ok(`Spielstart → ${EV.GAME_START}`);
      // Startpanel schließen / UI sichtbar machen
      emit('req:ui:startpanel:hide');

      // Body-State setzen (CSS Layout)
      document.body.classList.add('is-playing');

      // Ein einziges Startsignal senden (+ Legacy-Alias)
      emit(EV.GAME_START);       // 'cb:game:start' (neuer Stil)
      emit(EV.GAME_START_LEG);   // 'cb:game-start' (Altcode)

      // Optional: Build/HUD öffnen (kannst du entfernen, wenn zu aggressiv)
      emit('req:hud:show');
      emit('req:buildmenu:show');
    }
  }

  // Singleton-Instanz
  window.__boot = new BootManager();
  return BootManager;
});

/* ---------- Globale Fehler an Inspector-Log durchreichen ---------- */
addEventListener('error', (e)=>{
  (window.CBLog?.err || console.error)(`Uncaught Error: ${e.message} @ ${e.filename}:${e.lineno}`);
});
addEventListener('unhandledrejection', (e)=>{
  const msg = e?.reason?.message || String(e.reason || e);
  (window.CBLog?.err || console.error)(`Unhandled Promise Rejection: ${msg}`);
});

/* ---------- Failsafe: Layout-Flag sobald das Spiel wirklich startet ---------- */
addEventListener('cb:game:start', () => {
  document.body.classList.add('is-playing');
  (window.CBLog?.info||console.info)('[layout] failsafe enable (via boot)');
}, { once:true });
