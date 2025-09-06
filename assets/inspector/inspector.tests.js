/* ============================================================================
 * Datei: assets/inspector/inspector.tests.js
 * Projekt: Siedler-Mini
 * Version: v18.12.0
 *
 * Zweck:
 *   - "Tests"-Tab im Inspector (Pfad-Diagnose, Carrier-Probe, Heatmap-Reset)
 *   - Keine direkte Engine-Kopplung: es werden NUR Custom-Events gefeuert
 *     • cb:test:path-hq-depot
 *     • cb:test:carrier-hq-depot
 *     • cb:test:stop
 *     • cb:paths:reset   (bestehendes Overlay-Feature)
 *
 * Abhängigkeiten:
 *   - inspector.core.js stellt window.__INSPECTOR_CORE__.api bereit:
 *       • core.api.mount(tabId, renderFn)  → Tab registrieren + rendern
 *       • core.api.getSlot(name)           → Slot-Element im Panel
 *       • core.api.signal(name, payload?)  → optionales Signal zurück an Core
 *   - CBLog Polyfill/Impl (sanfte Logs):
 *       • CBLog.ok / info / warn / err     → optional
 *       • fällt auf console.* zurück
 * ========================================================================== */

(function(){
  "use strict";

  const MOD = "[inspector.tests]";
  const VER = "v18.12.0";
  const core = window.__INSPECTOR_CORE__;

  if (!core || !core.api || typeof core.api.mount !== "function") {
    console.warn(MOD, "core API fehlt – breche ab.");
    return;
  }

  // --- Logging helpers (sanft) ----------------------------------------------
  const log  = (...a)=> (window.CBLog?.info || console.log)(MOD, ...a);
  const ok   = (...a)=> (window.CBLog?.ok   || console.log)(MOD, ...a);
  const warn = (...a)=> (window.CBLog?.warn || console.warn)(MOD, ...a);

  // Slot helper (akzeptiert alte + neue Slotnamen)
  function qSlot(name){
    return (
      core.api.getSlot?.(name) ||
      document.getElementById(`ins-${name}`) ||
      document.querySelector(`#inspector .slot-${name}`)
    );
  }

  // Kleine UI-Bausteine
  const mkBtn = (label, title, onClick, className="ins-btn")=>{
    const b = document.createElement("button");
    b.className = className;
    b.type = "button";
    b.textContent = label;
    if (title) b.title = title;
    if (onClick) b.addEventListener("click", onClick);
    return b;
  };

  const mkRow = (...children)=>{
    const d = document.createElement("div");
    d.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;align-items:center";
    children.forEach(c=>d.appendChild(c));
    return d;
  };

  const mkField = (label, type="number", val="", min=null, max=null, step="1")=>{
    const wrap = document.createElement("label");
    wrap.style.cssText = "display:flex;align-items:center;gap:6px";
    const span = document.createElement("span");
    span.className = "muted";
    span.textContent = label;
    const inp = document.createElement("input");
    inp.type = type;
    inp.value = val;
    inp.step = step;
    if (min!=null) inp.min = String(min);
    if (max!=null) inp.max = String(max);
    wrap.append(span, inp);
    return {wrap, input:inp};
  };

  // ---- Tab-Mount -----------------------------------------------------------
  core.api.mount("tests", () => {
    // Slots besorgen (defensiv)
    const body    = qSlot("tests-body")    || qSlot("body") || qSlot("logs-view");   // Fallbacks
    const controls= qSlot("tests-controls")|| qSlot("controls");

    if (controls) controls.innerHTML = "";
    if (body)     body.innerHTML = "";

    // --- Controls -----------------------------------------------------------
    if (controls){
      const btnPath = mkBtn("Pfad: HQ ⇄ Depot testen", "Versucht HQ und Depot zu finden und prüft die Strecke.", ()=>{
        try {
          window.dispatchEvent(new CustomEvent("cb:test:path-hq-depot"));
          ok("Pfad-Test ausgelöst: HQ ⇄ Depot");
        } catch(e){
          warn("Event cb:test:path-hq-depot fehlgeschlagen:", e?.message||e);
        }
      });

      const {wrap: fCount, input: inCount} = mkField("Carrier-Zyklen", "number", "3", 1, 50, "1");
      const btnCarrier = mkBtn("Carrier-Test starten", "Simuliert Carrier zwischen HQ und Depot", ()=>{
        const count = Math.max(1, parseInt(inCount.value||"1",10) || 1);
        try {
          window.dispatchEvent(new CustomEvent("cb:test:carrier-hq-depot", { detail:{ count } }));
          ok(`Carrier-Test ausgelöst (Zyklen=${count})`);
        } catch(e){
          warn("Event cb:test:carrier-hq-depot fehlgeschlagen:", e?.message||e);
        }
      });

      const btnStop = mkBtn("Tests stoppen", "Beendet laufende Test-Tasks", ()=>{
        try {
          window.dispatchEvent(new CustomEvent("cb:test:stop"));
          ok("Test-Stop angefordert");
        } catch(e){
          warn("Event cb:test:stop fehlgeschlagen:", e?.message||e);
        }
      });

      const btnHeatReset = mkBtn("Heatmap zurücksetzen", "Setzt Pfad-Heatmap (Overlay) zurück", ()=>{
        try {
          window.dispatchEvent(new CustomEvent("cb:paths:reset"));
          ok("Heatmap-Reset angefordert");
        } catch(e){
          warn("Event cb:paths:reset fehlgeschlagen:", e?.message||e);
        }
      });

      controls.append(
        mkRow(btnPath, fCount, btnCarrier, btnStop, btnHeatReset)
      );
    }

    // --- Body / Status-Anzeige ---------------------------------------------
    if (body){
      // Kompakter Status-Block
      const status = document.createElement("div");
      status.className = "ins-card";
      status.style.padding = "10px 12px";
      status.innerHTML = `
        <div class="muted" style="margin-bottom:6px">Laufende / letzte Aktionen</div>
        <div id="ins-tests-stream" class="ins-list" style="display:flex;flex-direction:column;gap:6px;"></div>
      `;
      const stream = status.querySelector("#ins-tests-stream");

      // Helfer um Events in der UI zu spiegeln:
      function pushLine(txt, cls="log-info"){
        const line = document.createElement("div");
        line.className = `log-line ${cls}`;
        line.textContent = txt;
        stream.appendChild(line);
        stream.parentElement.scrollTop = stream.parentElement.scrollHeight;
      }

      // Spiegel externe Signale (falls Engine welche sendet)
      const onOK   = e=> pushLine(e.detail?.msg || "OK", "log-ok");
      const onWARN = e=> pushLine(e.detail?.msg || "WARN", "log-warn");
      const onERR  = e=> pushLine(e.detail?.msg || "ERR", "log-error");

      window.addEventListener("cb:test:ok",   onOK);
      window.addEventListener("cb:test:warn", onWARN);
      window.addEventListener("cb:test:err",  onERR);

      // kleiner Hint
      const hint = document.createElement("div");
      hint.className = "muted";
      hint.style.marginTop = "6px";
      hint.textContent = "Hinweis: Die Test-Buttons senden nur Events. Die Spiel-Engine muss darauf reagieren.";

      body.append(status, hint);

      // Unmount-Cleanup
      return ()=>{
        window.removeEventListener("cb:test:ok",   onOK);
        window.removeEventListener("cb:test:warn", onWARN);
        window.removeEventListener("cb:test:err",  onERR);
      };
    }

    log("bereit", VER);
  });

})();
