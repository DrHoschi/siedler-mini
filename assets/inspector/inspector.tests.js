/* ============================================================================
 * Inspector Tests – v18.10.12
 *  - registriert sich beim Core und rendert einfache Selbsttests
 *  - nutzt Slots: 'tests-controls' und 'tests-view'
 * ========================================================================== */
(function(){
  "use strict";

  const MOD = "[inspector.tests]";
  const VER = "v18.10.12";
  const core = window.__INSPECTOR_CORE__;
  if (!core || !core.api || typeof core.api.mount!=="function") {
    console.warn(MOD,"core API fehlt – breche ab.");
    return;
  }

  function slot(n){ return core.api.getSlot?.(n) || null; }

  // Mini-Test-Runner ---------------------------------------------------------
  const tests = [];
  function add(name, fn){ tests.push({name, fn}); }

  function runAll(){
    const out = [];
    for (const t of tests){
      const start = performance.now();
      try {
        const res = t.fn();
        if (res && typeof res.then==="function") {
          // asynchron unterstützen
          out.push(res.then(()=>ok(t, start)).catch(e=>err(t, start, e)));
        } else {
          out.push(Promise.resolve(ok(t,start)));
        }
      } catch(e){
        out.push(Promise.resolve(err(t,start,e)));
      }
    }
    return Promise.all(out);
  }
  function ok(t, start){
    return { name:t.name, ok:true, ms:(performance.now()-start)|0 };
  }
  function err(t,start,e){
    return { name:t.name, ok:false, ms:(performance.now()-start)|0, error:(e&&e.message)||String(e) };
  }

  // Beispiel-Tests -----------------------------------------------------------
  add("CBLog verfügbar", ()=> { if (!window.CBLog) throw new Error("CBLog fehlt"); });
  add("Slots vorhanden", ()=> {
    if (!slot("tests-controls") || !slot("tests-view")) throw new Error("Slots fehlen");
  });
  add("Render-Canvas vorhanden", ()=> {
    const c = document.getElementById("game");
    if (!c || c.tagName!=="CANVAS") throw new Error("Canvas #game fehlt");
  });

  // Rendering ---------------------------------------------------------------
  function renderControls(){
    const host = slot("tests-controls"); if (!host) return;
    host.innerHTML = "";
    const bar = document.createElement("div");
    bar.className = "ins-controls";

    const btn = document.createElement("button");
    btn.className = "ins-toggle active";
    btn.textContent = "Alle Tests ausführen";
    btn.addEventListener("click", ()=> { paint("…läuft…"); runAndPaint(); });

    bar.appendChild(btn);
    host.appendChild(bar);
  }

  function paint(msgOrRows){
    const view = slot("tests-view"); if (!view) return;
    view.innerHTML = "";
    const box = document.createElement("div");
    box.className = "ins-logview";
    if (typeof msgOrRows === "string"){
      box.textContent = msgOrRows;
    } else {
      // Tabelle der Ergebnisse
      msgOrRows.forEach(r=>{
        const line = document.createElement("div");
        line.className = r.ok ? "log-ok" : "log-error";
        line.textContent = `${r.ok?"✅":"❌"} ${r.name} (${r.ms}ms)` + (r.ok?"":` – ${r.error||""}`);
        box.appendChild(line);
      });
    }
    view.appendChild(box);
  }

  async function runAndPaint(){
    try {
      const rows = await runAll();
      paint(rows);
    } catch(e){
      paint("Fehler beim Ausführen der Tests: "+(e&&e.message));
    }
  }

  // Mount ins Tab „tests“ ---------------------------------------------------
  core.api.mount("tests", () => {
    renderControls();
    paint("Bereit. Tippe auf „Alle Tests ausführen“.");
    (window.CBLog?.ok || console.log)(`${MOD} bereit v${VER}`);
    // optionales Unmount:
    return null;
  });
})();
