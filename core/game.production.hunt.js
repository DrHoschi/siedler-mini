/* ============================================================================
 * Datei    : core/game.production.hunt.js
 * Version  : v25.12.28-hunt-skeleton
 *
 * STATUS: Skeleton / vorbereitet
 *   - Der Jäger (Unit) + Jägerhütte (Building) kommen später.
 *   - Dieses Modul ist schon da, damit wir die Architektur wie bei
 *     game.production.wood.js / fish.js / stone.js sauber spiegeln können.
 *
 * Ziel-Design (aus deinem Konzept / PDF):
 *   - Produktionsmodul registriert sich bei Production.registerModule(...)
 *   - Gibt bei Erfolg NUR cb:prod:output aus:
 *       { bId, item:'meat', qty, by:'hunter' } (+ optional 'pelt')
 *   - Tier-Quelle kommt aus MapAnimals (dynamische Map-Ressource).
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[prod.hunt]';
  const LOG=(...a)=>(window.CBLog?.info||console.info)(TAG,...a);

  // ------------------------------------------------------------
  // API der zentralen Production (in deinem Projekt vorhanden)
  // ------------------------------------------------------------
  function register(){
    if (!window.Production?.registerModule){
      // Production noch nicht da – später nochmal versuchen
      return false;
    }

    // Minimaler Platzhalter: Kein Job-Loop, kein Tick – nur Registrierung
    // (damit die Module-Liste vollständig ist und wir später erweitern können).
    Production.registerModule('hunt', {
      version: 'v25.12.28-hunt-skeleton',
      // tick(ms) ist optional – hier noch nicht nötig
      tick(){},
      // start/build hooks folgen später
    });

    LOG('registriert (skeleton)');
    return true;
  }

  // Versuch: direkt registrieren
  if (!register()){
    // Fallback: nach registry-ready nochmal probieren
    window.addEventListener('cb:registry:ready', () => { try{ register(); }catch(_){ } });
  }

  // Expose (Debug)
  window.ProdHunt = { register };

})();
