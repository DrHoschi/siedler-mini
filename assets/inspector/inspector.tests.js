/* ============================================================================
 * Datei: assets/inspector/inspector.tests.js
 * Projekt: Siedler-Mini – Inspector
 * Version: v18.10.12
 *
 * Zweck:
 *  - TESTS-Tab: kleine Selbstdiagnosen & Smoke-Tests
 *  - Slot-Rendering (keine body-Appends)
 *
 * Abhängigkeit:
 *  - window.__INSPECTOR_CORE__.api  → { mount(tabId, renderFn), getSlot(name), signal(name, payload?) }
 *  - (optional) CBLog Polyfill/Impl (für sanfte Logs)
 * ========================================================================== */
(function () {
  "use strict";

  const MOD = "[inspector.tests]";
  const VER = "v18.10.12";
  const core = window.__INSPECTOR_CORE__;
  if (!core || !core.api || typeof core.api.mount !== "function") {
    console.warn(MOD, "core API fehlt – breche ab.");
    return;
  }

  // ---- Logging helpers -----------------------------------------------------
  const ok   = (...a) => (window.CBLog?.ok   || console.log).apply(console, a);
  const info = (...a) => (window.CBLog?.info || console.log).apply(console, a);
  const warn = (...a) => (window.CBLog?.warn || console.warn).apply(console, a);
  const err  = (...a) => (window.CBLog?.err  || console.error).apply(console, a);

  // ---- Slots helper --------------------------------------------------------
  function qSlot(name) {
    return (
      core.api.getSlot?.(name) ||
      document.getElementById(`ins-${name}`) ||
      document.querySelector(`#inspector .slot-${name}`)
    );
  }

  // ---- minimal UI state ----------------------------------------------------
  const state = {
    items: []  // { id, label, passed, details, ts }
  };

  let els = {
    controls: null,
    view: null,
    btnRun: null,
    btnClear: null,
    btnCopy: null,
    btnExport: null
  };

  // ---- Test definitions ----------------------------------------------------
  const tests = [
    {
      id: "cblog",
      label: "CBLog verfügbar & Puffer lesbar",
      run: () => {
        const has = !!window.CBLog;
        const bufReadable = !!window.CBLog?.getBuffer && Array.isArray(window.CBLog.getBuffer());
        return {
          pass: has && bufReadable,
          details: has
            ? (bufReadable ? "CBLog OK" : "CBLog da, aber getBuffer() liefert nichts Lesbares")
            : "CBLog nicht gefunden"
        };
      }
    },
    {
      id: "canvas",
      label: "#game Canvas existiert & hat Größe",
      run: () => {
        const c = document.getElementById("game");
        const ok = !!c && c.width > 0 && c.height > 0;
        return { pass: ok, details: ok ? `Größe ${c.width}×${c.height}` : "Canvas fehlt/0x0" };
      }
    },
    {
      id: "render",
      label: "Render-API angeschlossen (Frame möglich)",
      run: () => {
        const can = typeof window.Render?.frame === "function";
        if (can) {
          try { window.Render.frame(); } catch (_) {}
        }
        return { pass: !!can, details: can ? "Render.frame() vorhanden" : "Render.frame() fehlt" };
      }
    },
    {
      id: "events",
      label: "CustomEvents sendbar/empfangbar",
      run: () => {
        let got = false;
        const name = "ins:test:event:" + Math.random().toString(36).slice(2);
        const off = () => window.removeEventListener(name, on);
        const on  = () => { got = true; off(); };
        try {
          window.addEventListener(name, on, { once: true });
          window.dispatchEvent(new CustomEvent(name, { detail: 1 }));
        } catch (e) {
          off();
          return { pass: false, details: "CustomEvent unsupported: " + e.message };
        }
        return { pass: got, details: got ? "Event empfangen" : "Kein Empfang" };
      }
    },
    {
      id: "safearea",
      label: "Safe-Area CSS-Var vorhanden",
      run: () => {
        // Prüfen, ob env(safe-area-inset-bottom) ausgewertet werden kann
        const el = document.createElement("div");
        el.style.cssText = "padding-bottom: env(safe-area-inset-bottom, 0px); position:absolute; visibility:hidden;";
        document.body.appendChild(el);
        const val = getComputedStyle(el).paddingBottom;
        el.remove();
        return { pass: !!val, details: "padding-bottom=" + val };
      }
    },
    {
      id: "fps-mini",
      label: "Mini-FPS-Probe (≈ 250ms)",
      run: async () => {
        const start = performance.now();
        let frames = 0;
        let rafId = null;
        await new Promise((res) => {
          const step = () => {
            frames++;
            if (performance.now() - start >= 250) { res(); return; }
            rafId = requestAnimationFrame(step);
          };
          rafId = requestAnimationFrame(step);
        });
        if (rafId) cancelAnimationFrame(rafId);
        const fps = Math.round(frames * (1000 / 250));
        return { pass: fps > 10, details: `~${fps} FPS` };
      }
    }
  ];

  // ---- UI builders ---------------------------------------------------------
  function buildControls() {
    const host = qSlot("tests-controls");
    if (!host) return;
    host.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "ins-controls";

    const mkBtn = (label) => {
      const b = document.createElement("button");
      b.textContent = label;
      return b;
    };

    const btnRun = mkBtn("Alle Tests ausführen");
    btnRun.addEventListener("click", runAll);

    const btnClear = mkBtn("Leeren");
    btnClear.addEventListener("click", () => {
      state.items = [];
      renderList();
    });

    const btnCopy = mkBtn("Kopieren");
    btnCopy.addEventListener("click", async () => {
      try {
        const text = state.items.map(formatItemLine).join("\n") || "Keine Testergebnisse.";
        await navigator.clipboard.writeText(text);
        flash(btnCopy);
      } catch (e) {
        alert("Kopieren fehlgeschlagen: " + e.message);
      }
    });

    const btnExport = mkBtn("Export");
    btnExport.addEventListener("click", () => {
      const blob = new Blob([state.items.map(formatItemLine).join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "inspector-tests.txt";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });

    wrap.append(btnRun, btnClear, btnCopy, btnExport);
    host.appendChild(wrap);

    els.btnRun = btnRun; els.btnClear = btnClear; els.btnCopy = btnCopy; els.btnExport = btnExport;
  }

  function mountView() {
    const host = qSlot("tests-view");
    if (!host) return;
    host.innerHTML = "";
    const box = document.createElement("div");
    box.className = "ins-logview"; // gleiche Scroll/Look&Feel wie Logs
    host.appendChild(box);
    els.view = box;
  }

  // ---- helpers -------------------------------------------------------------
  function flash(el){ el.classList.add("ins-flash"); setTimeout(()=>el.classList.remove("ins-flash"), 600); }

  function formatTime(ts){
    try{
      const d = new Date(ts);
      const hh = String(d.getHours()).padStart(2,"0");
      const mm = String(d.getMinutes()).padStart(2,"0");
      const ss = String(d.getSeconds()).padStart(2,"0");
      return `${hh}:${mm}:${ss}`;
    }catch(_){ return ""; }
  }

  function formatItemLine(it){
    const icon = it.passed ? "✅" : "❌";
    return `[${formatTime(it.ts)}] ${icon} ${it.label} — ${it.details||""}`;
  }

  function renderList(){
    if (!els.view) return;
    const frag = document.createDocumentFragment();
    for (const it of state.items){
      const row = document.createElement("div");
      row.style.whiteSpace = "pre-wrap";
      row.style.display = "flex"; row.style.gap = "8px"; row.style.alignItems = "center";
      const badge = document.createElement("span");
      badge.textContent = it.passed ? "✅" : "❌";
      const text = document.createElement("span");
      text.textContent = `${it.label} — ${it.details||""}  (${formatTime(it.ts)})`;
      text.style.opacity = it.passed ? ".95" : "1";
      if (!it.passed) { text.style.color = "#fca5a5"; }
      row.append(badge, text);
      frag.appendChild(row);
    }
    els.view.innerHTML = "";
    els.view.appendChild(frag);
  }

  async function runAll(){
    info(MOD, "Starte Tests…");
    state.items = [];
    renderList();

    for (const t of tests){
      try{
        const res = await t.run();
        state.items.push({
          id: t.id, label: t.label,
          passed: !!res?.pass,
          details: res?.details || "",
          ts: Date.now()
        });
        renderList();
      }catch(e){
        state.items.push({
          id: t.id, label: t.label,
          passed: false,
          details: "Fehler: " + (e?.message || e),
          ts: Date.now()
        });
        renderList();
      }
    }

    const passedCnt = state.items.filter(i=>i.passed).length;
    const total = state.items.length;
    const summary = `Tests: ${passedCnt}/${total} OK`;
    ok(MOD, summary);
    core.api?.signal?.("tests:done", { passed: passedCnt, total });
    flash(els.btnRun);
  }

  // ---- Tab mount -----------------------------------------------------------
  core.api.mount("tests", () => {
    buildControls();
    mountView();

    // Optional: automatisch einmal kurz prüfen, ob die Umgebung da ist
    state.items = [];
    renderList();

    info(MOD, "bereit", VER);
    return () => { /* nichts zu säubern */ };
  });

})();
