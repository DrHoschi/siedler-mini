<!-- Datei: assets/editor/editor.js -->
<script>
// =========================================================================
// Editor-Hook (Stub) — v16.0.7
//  - Liefert window.GameEditor.open(), damit der Start-Button und Logs happy sind
//  - Minimaler Overlay-Editor (nur Platzhalter), kann später ersetzt/erweitert werden
// =========================================================================
(() => {
  const VERSION = "v16.0.7";

  // kleines, simples Overlay als Platzhalter
  let $overlay;

  function ensureOverlay() {
    if ($overlay) return $overlay;
    $overlay = document.createElement("div");
    $overlay.id = "editor-overlay";
    Object.assign($overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.45)",
      display: "none",
      zIndex: "9999",
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      position: "absolute",
      top: "10%",
      left: "50%",
      transform: "translateX(-50%)",
      width: "min(900px, 92vw)",
      maxHeight: "80vh",
      overflow: "auto",
      background: "#111",
      color: "#eee",
      border: "1px solid #3a3a3a",
      borderRadius: "10px",
      boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
      padding: "16px 18px",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    });

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="font-size:22px">🛠️ Mini-Editor (Stub)</span>
        <span style="opacity:.7">— ${VERSION}</span>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button id="edr-close" style="padding:6px 10px">Schließen (Esc)</button>
        </div>
      </div>

      <div style="display:flex;gap:14px;flex-wrap:wrap">
        <div style="flex:1 1 300px;min-width:260px">
          <div style="opacity:.8;margin-bottom:6px">Aktive Map:</div>
          <input id="edr-map" value="assets/maps/map-mini.json"
                 style="width:100%;padding:8px;border:1px solid #3a3a3a;background:#181818;color:#eee;border-radius:6px"/>
        </div>

        <div style="display:flex;align-items:flex-end;gap:8px">
          <button id="edr-load" style="padding:8px 12px">Map laden</button>
          <button id="edr-reload" style="padding:8px 12px">Neu starten</button>
        </div>
      </div>

      <hr style="border:none;border-top:1px solid #2a2a2a;margin:14px 0">

      <div style="opacity:.8;margin-bottom:6px">Hinweis</div>
      <div style="font-size:14px;line-height:1.4;opacity:.9">
        Dies ist nur ein Stub/Hilfs-UI für die Entwicklungsphase.
        Später ersetzen wir ihn durch den richtigen externen Editor.
      </div>
    `;

    $overlay.appendChild(panel);
    document.body.appendChild($overlay);

    panel.querySelector("#edr-close").onclick = hide;
    $overlay.addEventListener("click", (e) => { if (e.target === $overlay) hide(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $overlay.style.display !== "none") hide(); });

    // Actions
    panel.querySelector("#edr-load").onclick = () => {
      const path = /** @type {HTMLInputElement} */(panel.querySelector("#edr-map")).value.trim();
      // Falls dein GameLoader global ist:
      if (window.GameLoader && typeof window.GameLoader.start === "function") {
        window.GameLoader.start(path);
        console.log("✅ (ok) Editor: GameLoader.start", path);
      } else {
        console.warn("⚠️ (warn) Editor: GameLoader.start nicht verfügbar");
        alert("GameLoader.start ist (noch) nicht verfügbar.");
      }
    };

    panel.querySelector("#edr-reload").onclick = () => {
      location.reload();
    };

    return $overlay;
  }

  function show() { ensureOverlay().style.display = "block"; }
  function hide() { ensureOverlay().style.display = "none"; }

  // Exponierter Hook
  window.GameEditor = {
    version: VERSION,
    open() { show(); },
    close() { hide(); },
    isOpen() { return $overlay && $overlay.style.display !== "none"; },
  };

  console.log("✅ (ok) editor.js initialisiert", VERSION);
})();
</script>
