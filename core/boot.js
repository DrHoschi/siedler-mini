/* ============================================================================
 * Datei   : core/boot.js
 * Projekt : Neue Siedler
 * Version : v25.10.16-1
 * Zweck   : Boot-Sequenz – Initialisierung, Event-Hooks
 * ============================================================================
 */
(function(root, factory){
  root.SiedlerBoot = factory();
})(typeof window !== "undefined" ? window : this, function(){

  const BOOT_VERSION = "v25.10.16-1";
  const LOG = (m)=> (window.CBLog?.ok || console.log)(`[boot] ${m}`);

  class BootManager {
    constructor(){
      this.domReady = false;
      this.assetsReady = false;
      this.registryReady = false;
      this.bootAnnounced = false;

      window.addEventListener("cb:ui-ready",        ()=> this.onUIReady());
      window.addEventListener("cb:assets-ready",    ()=> this.onAssetsReady());
      window.addEventListener("cb:registry:ready",  ()=> this.onRegistryReady());
      window.addEventListener("req:game:start",     ()=> this.startGame());
    }
    onUIReady(){ this.domReady = true; LOG("UI bereit, warte auf Assets & Registry …"); this.tryBoot(); }
    onAssetsReady(){ this.assetsReady = true; LOG("Assets bereit ✅"); this.tryBoot(); }
    onRegistryReady(){ this.registryReady = true; LOG("Registry bereit ✅"); this.tryBoot(); }

    tryBoot(){
      if(this.domReady && this.assetsReady && this.registryReady && !this.bootAnnounced){
        this.bootAnnounced = true;
        LOG("Boot abgeschlossen → cb:boot-ready");
        window.dispatchEvent(new CustomEvent("cb:boot-ready"));
      }
    }

    startGame(){
      if(!this.bootAnnounced){
        const msg = "Start abgebrochen – Boot noch nicht vollständig (Assets/Registry fehlen).";
        (window.CBLog?.warn || console.warn)(`[boot] ${msg}`);
        window.dispatchEvent(new CustomEvent("cb:toast", {detail:{type:"warn", msg}}));
        return;
      }
      LOG("Spielstart → cb:game-start");
      window.dispatchEvent(new CustomEvent("cb:game-start"));
    }
  }

  window.__boot = new BootManager();
  LOG(`BootManager initialisiert (${BOOT_VERSION})`);
  return BootManager;
});

// Globale Fehler in den Inspector-Log leiten – ohne störende Alerts
window.addEventListener("error", (e)=>{
  (window.CBLog?.err || console.error)(`Uncaught Error: ${e.message} @ ${e.filename}:${e.lineno}`);
});
window.addEventListener("unhandledrejection", (e)=>{
  const msg = e?.reason?.message || String(e.reason || e);
  (window.CBLog?.err || console.error)(`Unhandled Promise Rejection: ${msg}`);
});
