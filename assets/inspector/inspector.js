/* inspector.js — v16.1.9
 * Vollbild-Inspector / Test-Cockpit für Entwicklung & Debug
 * – per Button unten rechts ein-/ausblendbar (UI steckt in JS, kein externes HTML nötig)
 * – Log-API: Inspector.logOk / logWarn / logErr / log
 * – Keine Spiel-Funktionen (Kartenstart etc.) – die sind im Start-Overlay der index.html
 */

(function(global){
  const VERSION = "16.1.9";

  // ---------- State ----------
  let $root, $panel, $log, isOpen = false;
  const lines = [];
  const MAX_LINES = 400;

  // ---------- Utils ----------
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  const ts = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2,"0");
    const mm = String(d.getMinutes()).padStart(2,"0");
    const ss = String(d.getSeconds()).padStart(2,"0");
    return `[${hh}:${mm}:${ss}]`;
  };

  function pushLine(html){
    lines.push(html);
    if (lines.length > MAX_LINES) lines.shift();
    if ($log) $log.innerHTML = lines.join("\n");
  }

  // ---------- Public Logging ----------
  function log(msg){ pushLine(`${ts()} ${msg}`); }
  function logOk(msg){ pushLine(`${ts()} ✅ (ok) ${msg}`); }
  function logWarn(msg){ pushLine(`${ts()} ⚠️ (warn) ${msg}`); }
  function logErr(msg){ pushLine(`${ts()} ❌ (err) ${msg}`); }

  // ---------- UI ----------
  function ensureUI(){
    if ($root) return;

    // Root (Vollbild)
    $root = el("div");
    $root.id = "inspectorRoot";
    Object.assign($root.style, {
      position:"fixed", inset:"0", zIndex:"2000", display:"none",
      background:"rgba(5,8,8,.90)", color:"#e7fff4",
      backdropFilter:"blur(6px)"
    });

    // Panel
    $panel = el("div");
    Object.assign($panel.style, {
      position:"absolute", inset:"16px",
      border:"1px solid rgba(255,255,255,.08)", borderRadius:"14px",
      boxShadow:"0 20px 60px rgba(0,0,0,.55)",
      background:"linear-gradient(180deg,#0e1615,#0b1211)"
    });
    $root.appendChild($panel);

    // Head
    const head = el("div");
    Object.assign(head.style, {
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,.06)"
    });
    const title = el("div", null, `Inspector (v${VERSION})`);
    Object.assign(title.style, { font:"600 16px system-ui, -apple-system" });
    head.appendChild(title);

    const headBtns = el("div");
    headBtns.appendChild(makeBtn("Log leeren", () => { lines.length = 0; pushLine(""); }));
    headBtns.appendChild(makeBtn("Schließen", toggle));
    head.appendChild(headBtns);

    $panel.appendChild(head);

    // Log
    $log = el("pre");
    Object.assign($log.style, {
      margin:0, padding:"12px", height:"calc(100% - 48px)",
      overflow:"auto", font:"600 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      background:"transparent", whiteSpace:"pre-wrap"
    });
    $panel.appendChild($log);

    document.body.appendChild($root);

    // Erste Zeile
    logOk(`Inspector bereit (inspector.js v${VERSION})`);
  }

  function makeBtn(label, onClick){
    const b = el("button", null, label);
    Object.assign(b.style, {
      cursor:"pointer", marginLeft:"8px",
      background:"#162524", color:"#d7efe6",
      border:"1px solid rgba(255,255,255,.08)",
      borderRadius:"10px", padding:"8px 10px", font:"600 14px system-ui"
    });
    b.addEventListener("click", onClick);
    return b;
  }

  // ---------- API ----------
  function open(){ ensureUI(); $root.style.display = "block"; isOpen = true; }
  function close(){ if (!$root) return; $root.style.display = "none"; isOpen = false; }
  function toggle(){ (isOpen ? close : open)(); }
  async function copyLog(){
    try {
      await navigator.clipboard.writeText($log ? $log.textContent : lines.join("\n"));
      logOk("Log in Zwischenablage");
    } catch(e){
      logErr("Kopieren fehlgeschlagen: " + (e?.message || e));
    }
  }

  // Globale API bereitstellen
  global.Inspector = {
    version: VERSION,
    open, close, toggle, copyLog,
    log, logOk, logWarn, logErr
  };

  // Auto-Init
  ensureUI();
})(window);
