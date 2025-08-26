<!-- Datei: assets/inspector/inspector.js -->
<script>
// =========================================================================
// Inspector-Hook (Stub) — v16.0.7
//  - Liefert window.GameInspector.toggle(), plus simples Pane mit Log/Info
// =========================================================================
(() => {
  const VERSION = "v16.0.7";

  let $pane;

  function ensurePane() {
    if ($pane) return $pane;

    $pane = document.createElement("div");
    $pane.id = "inspector-pane";
    Object.assign($pane.style, {
      position: "fixed",
      right: "10px",
      bottom: "10px",
      width: "min(480px, 92vw)",
      height: "min(55vh, 520px)",
      background: "#101010",
      color: "#e8e8e8",
      border: "1px solid #2c2c2c",
      borderRadius: "10px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
      display: "none",
      zIndex: "9998",
      overflow: "hidden",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    });

    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px 12px",
      background: "#161616",
      borderBottom: "1px solid #2c2c2c",
    });
    header.innerHTML = `
      <span style="font-size:18px">🔎 Inspector (Stub)</span>
      <span style="opacity:.7">— ${VERSION}</span>
      <div style="margin-left:auto;display:flex;gap:8px">
        <button id="insp-copy" style="padding:6px 10px">Log kopieren</button>
        <button id="insp-close" style="padding:6px 10px">Schließen</button>
      </div>
    `;

    const scroller = document.createElement("div");
    Object.assign(scroller.style, {
      height: "calc(100% - 48px)",
      overflow: "auto",
      padding: "10px 12px",
      fontSize: "13px",
      lineHeight: "1.4",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      background: "#0c0c0c",
    });
    scroller.id = "insp-body";
    scroller.textContent = "Inspector bereit. Hier könnten Live-Daten, Tiles, Entities usw. angezeigt werden.";

    $pane.appendChild(header);
    $pane.appendChild(scroller);
    document.body.appendChild($pane);

    header.querySelector("#insp-close").onclick = () => hide();
    header.querySelector("#insp-copy").onclick = async () => {
      try {
        // Nimmt (wie dein UI-Inspector) alle Zeilen aus #log oder nutzt Konsole-Puffer
        const logEl = document.getElementById("log");
        const text = logEl ? logEl.innerText : scroller.innerText;
        await navigator.clipboard.writeText(text || "");
        console.log("✅ (ok) Inspector: Log in Zwischenablage");
      } catch (e) {
        console.error("❌ (err) Inspector: Copy failed", e);
        alert("Copy fehlgeschlagen.");
      }
    };

    return $pane;
  }

  function show() { ensurePane().style.display = "block"; }
  function hide() { ensurePane().style.display = "none"; }
  function toggle() { ensurePane().style.display = ensurePane().style.display === "none" ? "block" : "none"; }

  // Exponierter Hook
  window.GameInspector = {
    version: VERSION,
    show, hide, toggle,
    setHtml(html) {
      ensurePane();
      document.getElementById("insp-body").innerHTML = html;
    },
    setText(text) {
      ensurePane();
      document.getElementById("insp-body").textContent = text;
    }
  };

  console.log("✅ (ok) inspector.js initialisiert", VERSION);
})();
</script>
