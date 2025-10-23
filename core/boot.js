/* ============================================================================
 * Datei   : core/boot.js
 * Projekt : Neue Siedler
 * Version : v25.10.23-fix2 (basierend auf v25.10.19-final)
 * Zweck   : Boot-Manager (UI/Assets/Registry orchestrieren) → Spielstart
 *           – KEIN zusätzliches Cover, nur Body-Klassen
 *           – Explizit HUD + Build anzeigen lassen nach Start
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * ========================================================================== */

/* ============================================================================
 * [Imports]
 * ========================================================================== */
// (leer)

/* ============================================================================
 * [Konstanten]
 * ========================================================================== */
const BOOT_VER = 'v25.10.23-fix2';
const ok   = (m)=> (window.CBLog?.ok   || console.log   )(`[boot] ${m}`);
const info = (m)=> (window.CBLog?.info || console.info  )(`[boot] ${m}`);
const warn = (m)=> (window.CBLog?.warn || console.warn  )(`[boot] ${m}`);

const EV = {
  UI_READY_A       : 'cb:ui-ready',
  UI_READY_B       : 'cb:ui:ready',
  ASSETS_READY_A   : 'cb:assets-ready',
  ASSETS_READY_B   : 'cb:assets:ready',
  REGISTRY_READY_A : 'cb:registry-ready',
  REGISTRY_READY_B : 'cb:registry:ready',
  BOOT_READY_A     : 'cb:boot-ready',
  BOOT_READY_B     : 'cb:boot:ready',
  GAME_START_A     : 'cb:game-start',
  GAME_START_B     : 'cb:game:start',
  GAME_RESET_A     : 'cb:game-reset',
  GAME_RESET_B     : 'cb:game:reset',
  REQ_GAME_START_A : 'req:game-start',
  REQ_GAME_START_B : 'req:game:start',
};

/* ============================================================================
 * [Hilfsfunktionen]
 * ========================================================================== */
function setStartState(){
  document.body.classList.add('is-start');
  document.body.classList.remove('is-playing','inspector-open','is-paused');
}
function setPlayingState(){
  document.body.classList.remove('is-start');
  document.body.classList.add('is-playing');
}

/* ============================================================================
 * [Klassen]
 * ========================================================================== */
class BootManager{
  constructor(){
    this.uiReady = false;
    this.assetsReady = false;
    this.registryReady = false;
    this.startRequested = false;

    // Event-Wiring (Aliasse)
    addEventListener(EV.UI_READY_A,       ()=> this.onUIReady());
    addEventListener(EV.UI_READY_B,       ()=> this.onUIReady());
    addEventListener(EV.ASSETS_READY_A,   ()=> this.onAssetsReady());
    addEventListener(EV.ASSETS_READY_B,   ()=> this.onAssetsReady());
    addEventListener(EV.REGISTRY_READY_A, ()=> this.onRegistryReady());
    addEventListener(EV.REGISTRY_READY_B, ()=> this.onRegistryReady());
    addEventListener(EV.REQ_GAME_START,   ()=> this.onStartRequested());

    info(`BootManager initialisiert (${BOOT_VER})`);
    this._fallbackUiReady();
    ok('BootManager aktiv');
  }

  _fallbackUiReady(){
    if (document.readyState === 'complete' || document.readyState === 'interactive'){
      queueMicrotask(()=> this.onUIReady());
    } else {
      addEventListener('DOMContentLoaded', ()=> this.onUIReady(), { once:true });
    }
  }

  onUIReady(){
    if (this.uiReady) return;
    this.uiReady = true;
    info('UI bereit – warte auf Assets & Registry …');
    setStartState();
    // Info-Event (Alias B), wie in deinen Logs
    dispatchEvent(new CustomEvent(EV.BOOT_READY_B));
  }
  onAssetsReady(){
    if (this.assetsReady) return;
    this.assetsReady = true;
    ok('Assets bereit ✓');
    this._maybeStart();
  }
  onRegistryReady(){
    if (this.registryReady) return;
    this.registryReady = true;
    ok('Registry bereit ✅');
    this._maybeStart();
  }
  onStartRequested(){
    this.startRequested = true;
    this._maybeStart();
  }

  _maybeStart(){
    if (!this.uiReady || !this.assetsReady || !this.registryReady) return;
    if (!this.startRequested) return;

    ok('Boot abgeschlossen → cb:boot:ready');
    dispatchEvent(new CustomEvent(EV.BOOT_READY_B));

    ok('Spielstart → cb:game:start');
    dispatchEvent(new CustomEvent(EV.GAME_START_B));
    dispatchEvent(new CustomEvent(EV.GAME_START_A));

    setPlayingState();

    // Sichtbarkeits-Trigger: HUD & Baumenü (deine bestehenden Listener nutzen das)
    dispatchEvent(new CustomEvent('req:hud:show'));
    dispatchEvent(new CustomEvent('req:buildmenu:show'));
  }
}

/* ============================================================================
 * [Hauptlogik]
 * ========================================================================== */
(function initBoot(){
  window.SiedlerBoot = new BootManager();

  // Saubermachen bei Boot: Altklassen entfernen
  addEventListener(EV.BOOT_READY_B, ()=>{
    document.body.classList.remove('inspector-open','is-paused');
  }, { once:true });
})();

/* ============================================================================
 * [Exports]
 * ========================================================================== */
export {};
