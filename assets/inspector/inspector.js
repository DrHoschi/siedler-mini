/*  ============================================================
    Inspector / Test-Cockpit (v16.1.4)
    - Floating Toggle-Button (immer sichtbar)
    - Panel komplett ein-/ausblendbar
    - Log-Konsole integriert (Copy / Clear)
    - Cache-Booster & Quick-Start-Buttons drin
    - Bau-Menü-Steuerung hier entfernt (bleibt im Spiel-UI-Button)
    ------------------------------------------------------------
    Einbindung: <script src="./assets/inspector/inspector.js" defer></script>
    Abhängigkeiten: keine harten; nutzt window.TestLog falls vorhanden
    ============================================================  */

(function(){
  const VERSION = "16.1.4";

  // ---------- DOM Helpers ----------
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(html!=null) e.innerHTML = html;
    return e;
  };

  // ---------- Styles (scoped) ----------
  const style = document.createElement("style");
  style.textContent = `
  .insp-toggle{
    position: fixed; left: 12px; top: 56px; z-index: 1500;
    width: 44px; height: 44px; border-radius: 22px;
    background: rgba(0,0,0,.45); color:#fff; border:1px solid rgba(255,255,255,.25);
    display:flex; align-items:center; justify-content:center;
    font: 20px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    backdrop-filter: blur(6px);
    cursor:pointer; user-select:none;
  }
  .insp-root{
    position: fixed; left: 12px; top: 112px; z-index: 1490;
    max-width: min(720px, calc(100vw - 24px)); 
    color:#fff; 
    background: rgba(0,0,0,.45); backdrop-filter: blur(6px);
    border:1px solid rgba(255,255,255,.25); border-radius: 14px;
    padding: 12px; display:none;
    font: 14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  }
  .insp-title{ font-weight:700; font-size:16px; margin:0 0 10px 0; }
  .insp-row{ display:flex; flex-wrap:wrap; gap:10px; margin:8px 0; }
  .insp-btn{
    padding:8px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.25);
    background: rgba(20,20,20,.45); color:#fff; cursor:pointer;
  }
  .insp-badge{ margin-left:8px; opacity:.8; font-weight:600; }
  .insp-note{ opacity:.8; margin-top:6px; }

  /* Log-Konsole */
  .insp-log{
    margin-top:10px; background:rgba(0,0,0,.35);
    border:1px solid rgba(255,255,255,.2); border-radius:10px; padding:8px;
    max-height:min(40vh, 380px); overflow:auto; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:12px;
  }
  .insp-log .l{ margin:2px 0; white-space:pre-wrap; }
  .insp-log .ok{ color:#a4fba6; }
  .insp-log .warn{ color:#ffd479; }
  .insp-log .err{ color:#ff9a9a; }
  .insp-actions{ display:flex; gap:8px; justify-content:flex-end; margin-top:6px; }
  /* Handy quer: Toggle an die Seite, Panel bleibt daneben erreichbar */
  @media (orientation: landscape) and (max-height: 520px){
    .insp-toggle{ left: 12px; top: 12px; }
    .insp-root{ left: 64px; top: 12px; max-width: calc(100vw - 76px); }
  }
  `;
  document.head.appendChild(style);

  // ---------- Toggle Button ----------
  const toggle = el("div","insp-toggle","🛠️");
  toggle.title = "Inspector ein/aus (v"+VERSION+")";
  document.body.appendChild(toggle);

  // ---------- Panel ----------
  const root = el("div","insp-root");
  root.innerHTML = `
    <div class="insp-title">
      Inspector / Test-Cockpit <span class="insp-badge">(v${VERSION})</span>
    </div>

    <div class="insp-row">
      <button class="insp-btn" data-action="start-mini">Start map-mini.json</button>
      <button class="insp-btn" data-action="start-pro">Start map-pro.json</button>
      <button class="insp-btn" data-action="cache">Cache leeren</button>
      <button class="insp-btn" data-action="copylog">Log kopieren</button>
      <button class="insp-btn" data-action="clearlog">Log leeren</button>
    </div>

    <div class="insp-row">
      <span>Ressourcen:</span>
      <button class="insp-btn" data-action="res+100">+100</button>
      <button class="insp-btn" data-action="res+1000">+1000</button>
      <button class="insp-btn" data-action="res0">0</button>
    </div>

    <div class="insp-note">Alle Tools & Booster hier gebündelt; Spieloberfläche bleibt frei.</div>

    <div class="insp-log" id="inspLog"></div>
  `;
  document.body.appendChild(root);

  // ---------- Logging ----------
  const logEl = $("#inspLog", root);
  function addLog(level, msg){
    const L = el("div","l "+(level||"ok"));
    const t = new Date();
    const hh = String(t.getHours()).padStart(2,"0");
    const mm = String(t.getMinutes()).padStart(2,"0");
    const ss = String(t.getSeconds()).padStart(2,"0");
    const ts = `[${hh}:${mm}:${ss}]`;
    L.textContent = `${ts} ${levelIcon(level)} ${pretty(level)} ${msg}`;
    logEl.appendChild(L);
    logEl.scrollTop = logEl.scrollHeight;
  }
  function levelIcon(level){
    if(level==="err") return "❌";
    if(level==="warn") return "⚠️";
    return "✅";
  }
  function pretty(level){
    if(level==="err") return "(err)";
    if(level==="warn") return "(warn)";
    return "(ok)";
  }

  // vorhandene Start-Logs aus TestLog (falls schon gesammelt)
  const preload = (window.TestLog && window.TestLog.drain) ? window.TestLog.drain() : [];
  preload.forEach(e => addLog(e.level, e.msg));

  // Alle zukünftigen Log-Events abgreifen (leichte Integration ohne Code-Änderungen)
  window.addEventListener("game:log", (ev)=>{
    const {level="ok", msg=""} = ev.detail||{};
    addLog(level, msg);
  });

  // Convenience-API für andere Module:
  window.InspectorLog = {
    ok:  (m)=>addLog("ok", m),
    warn:(m)=>addLog("warn", m),
    err: (m)=>addLog("err", m),
  };

  // ---------- Actions ----------
  root.addEventListener("click", (ev)=>{
    const btn = ev.target.closest("[data-action]");
    if(!btn) return;
    const a = btn.getAttribute("data-action");

    // Start Map
    if(a==="start-mini") { emit("ui:start-map","./assets/maps/map-mini.json"); return; }
    if(a==="start-pro")  { emit("ui:start-map","./assets/maps/map-pro.json");  return; }

    // Cache-Booster
    if(a==="cache") { try {
      // Alles leeren, inkl. ServiceWorker-Cache (wenn vorhanden)
      localStorage.clear(); sessionStorage.clear();
      if('caches' in window){ caches.keys().then(keys => keys.forEach(k => caches.delete(k))); }
      addLog("ok","Cache/Storage geleert – Seite ggf. neu laden");
    } catch(e){ addLog("warn","Cache leeren nicht vollständig möglich"); }
      return;
    }

    // Log-Tools
    if(a==="copylog"){
      const text = Array.from(logEl.querySelectorAll(".l")).map(n=>n.textContent).join("\n");
      navigator.clipboard.writeText(text).then(()=>addLog("ok","Log in Zwischenablage"));
      return;
    }
    if(a==="clearlog"){ logEl.innerHTML=""; return; }

    // Ressourcen (nur Events werfen – Spiel kann es verarbeiten)
    if(a==="res+100"){ emit("ui:resources",{delta:100}); addLog("ok","Ressourcen +100"); return; }
    if(a==="res+1000"){ emit("ui:resources",{delta:1000}); addLog("ok","Ressourcen +1000"); return; }
    if(a==="res0"){ emit("ui:resources",{set:0}); addLog("ok","Ressourcen auf 0"); return; }
  });

  function emit(name, detail){
    window.dispatchEvent(new CustomEvent(name,{detail}));
  }

  // ---------- Public API ----------
  const API = {
    open(){ root.style.display="block"; },
    close(){ root.style.display="none"; },
    toggle(){ root.style.display = (root.style.display==="none" || !root.style.display) ? "block":"none"; },
    version: VERSION
  };
  window.GameInspector = API;

  // Toggle-Button-Verhalten
  toggle.addEventListener("click", ()=> API.toggle());

  // Startmeldung
  addLog("ok", `Inspector bereit (inspector.js v${VERSION})`);
})();
