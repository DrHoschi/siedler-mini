/* ============================================================================
 * Datei   : core/boot.js
 * Projekt : Neue Siedler
 * Version : v25.10.23-fix1  (basierend auf v25.10.19-final)
 * Zweck   : Boot-Manager – orchestriert UI/Assets/Registry → Start → Spielstart
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * ========================================================================== */

/* ============================================================================
 * [Imports]
 * ========================================================================== */
// (leer) – Boot arbeitet nur mit Browser-Events

/* ============================================================================
 * [Konstanten]
 * ========================================================================== */
const BOOT_VERSION = 'v25.10.23-fix1';
const ok   = (m)=> (window.CBLog?.ok   || console.log   )(`[boot] ${m}`);
const info = (m)=> (window.CBLog?.info || console.info  )(`[boot] ${m}`);
const warn = (m)=> (window.CBLog?.warn || console.warn  )(`[boot] ${m}`);
const err  = (m)=> (window.CBLog?.err  || console.error )(`[boot] ${m}`);

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
  GAME_RESET       : 'cb:game:reset',
  REQ_GAME_START   : 'req:game:start',
};

/* ============================================================================
 * [Hilfsfunktionen]
 * ========================================================================== */
function setStartState(){
  document.body.classList.add('is-start');
  document.body.classList.remove('is-playing','inspector-open','is-paused');
  const cover = document.getElementById('layout-cover');
  if (cover){ cover.classList.remove('open'); cover.style.display=''; cover.style.opacity=''; cover.style.visibility=''; }
}

function setPlayingState(){
  document.body.classList.remove('is-start');
  document.body.classList.add('is-playing');
  const cover = document.getElementById('layout-cover');
  if (cover){ cover.classList.remove('open'); cover.style.display=''; cover.style.opacity=''; cover.style.visibility=''; }
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

    // Quellen (Aliasse berücksichtigen)
    addEventListener(EV.UI_READY_A,       ()=> this.onUIReady());
    addEventListener(EV.UI_READY_B,       ()=> this.onUIReady());
    addEventListener(EV.ASSETS_READY_A,   ()=> this.onAssetsReady());
    addEventListener(EV.ASSETS_READY_B,   ()=> this.onAssetsReady());
    addEventListener(EV.REGISTRY_READY_A, ()=> this.onRegistryReady());
    addEventListener(EV.REGISTRY_READY_B, ()=> this.onRegistryReady());

    // Startanforderung (vom Startpanel/Button)
    addEventListener(EV.REQ_GAME_START,   ()=> this.onStartRequested());

    info(`BootManager initialisiert (${BOOT_VERSION})`);
    this._fallbackUiReady(); // falls ui-start kein UI-Event feuert
    ok('BootManager aktiv');
  }

  _fallbackUiReady(){
    // kleiner Fallback – UI gilt nach DOMContentLoaded als "ready"
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
    // Startzustand hart setzen
    setStartState();
    // Boot-Ready signalisieren (Alias B)
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

    // Spielstart signalisieren (beide Aliasse für maximale Kompatibilität)
    ok('Spielstart → cb:game:start');
    dispatchEvent(new CustomEvent(EV.GAME_START_B));
    dispatchEvent(new CustomEvent(EV.GAME_START_A));

    // Sichtbarkeit sicher schalten
    setPlayingState();

    // Explizit HUD & Build anfragen (damit HUD/Build sichtbar sind)
    dispatchEvent(new CustomEvent('req:hud:show'));
    dispatchEvent(new CustomEvent('req:buildmenu:show'));
  }
}

/* ============================================================================
 * [Hauptlogik]
 * ========================================================================== */
(function initBoot(){
  // Direkt starten
  window.SiedlerBoot = new BootManager();

  // Fail-safe: Einmalig zu Boot-Ready den Startzustand räumen
  addEventListener(EV.BOOT_READY_B, ()=>{
    // ggf. Altklassen entfernen
    document.body.classList.remove('inspector-open','is-paused');
  }, { once:true });
})();

/* ============================================================================
 * [Exports]
 * ========================================================================== */
export {}; // Modulabschluss (ESM-safe, falls via <script type="module"> geladen)
