/* ============================================================================
 * Datei   : ui/ui-inspector.content.js
 * Projekt : Neue Siedler
 * Version : v25.10.31-content (auto-bootstrap UI for Inspector)
 * Zweck   : Baut die sichtbare Inspector-Oberfläche (Tabs + Panels), wenn leer.
 * Abhäng. : ui/ui-inspector.js (stellt Open/Close/Flags bereit)
 * Hinweise:
 *   - Host darf #inspector ODER #inspector-overlay heißen.
 *   - FAB-Variante A (immer sichtbar) bleibt unverändert.
 *   - Zeichnet console.log/warn/error in "Logs" mit; hört auf einige cb:* Events.
 * ========================================================================== */

/* ============================= [1] HELPERS ================================ */
  // ==== BEGIN ui-inspector.content.js (Inline Fix) ====
  document.addEventListener("DOMContentLoaded", function(){
    const host = document.querySelector("#inspector") || document.querySelector("#inspector-overlay");
    if(!host) return console.warn("[insp-content] Kein Host gefunden.");
    if(host.querySelector(".insp-shell")) return;

    host.innerHTML = `
      <div class="insp-shell">
        <div class="insp-header">
          <div class="insp-tabs">
            <button class="insp-tab active" data-insp-tab="logs">Logs</button>
            <button class="insp-tab" data-insp-tab="build">Build</button>
            <button class="insp-tab" data-insp-tab="resources">Ressourcen</button>
            <button class="insp-tab" data-insp-tab="paths">Pfade</button>
            <button class="insp-tab" data-insp-tab="tests">Tests</button>
          </div>
        </div>
        <div class="insp-content">
          <section data-panel="logs">Konsole lädt…</section>
          <section data-panel="build" hidden>Build-Infos</section>
          <section data-panel="resources" hidden>Ressourcen-Infos</section>
          <section data-panel="paths" hidden>Pfade folgen…</section>
          <section data-panel="tests" hidden>Tests</section>
        </div>
      </div>
    `;
    console.log("[insp-content] Markup injiziert.");
  });
  // ==== END ui-inspector.content.js ====
