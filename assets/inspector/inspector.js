/* inspector.js – v16.1.11
 * Dev-Cockpit/Inspector: immer per Button (unten rechts) ein-/ausblendbar.
 * Enthält: Log-Panel, Log kopieren/Leeren, Ressourcen-Booster (optional).
 * Keine Start-Controls mehr – Start übernimmt index.html.
 */

(function () {
  const VERSION = "v16.1.11";

  // ----------------------------- DOM Grundgerüst -----------------------------
  const root = document.createElement('div');
  root.id = 'cb-inspector-root';
  root.style.cssText = `
    position: fixed; inset: 0; display:none; z-index: 9999;
    background: rgba(0,0,0,.55); backdrop-filter: blur(3px);
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    position:absolute; inset: 4vh 4vw; background:#0b1110; color:#dff4ea;
    border-radius:14px; box-shadow:0 14px 50px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.06);
    display:grid; grid-template-rows:auto 1fr auto; overflow:hidden;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display:flex; align-items:center; gap:10px; padding:14px 14px 10px; border-bottom:1px solid rgba(255,255,255,.06);
  `;
  header.innerHTML = `
    <strong style="font-size:18px;">Inspector / Test-Cockpit</strong>
    <span style="font-size:12px; padding:.2em .6em; border-radius:999px; background:#13201a; color:#9bb6aa;">
      inspector.js ${VERSION}
    </span>
    <span id="insp-status" style="margin-left:auto; color:#24c27a; font-weight:600;">bereit</span>
    <button id="insp-btn-copy" class="insp-btn">Log kopieren</button>
    <button id="insp-btn-clear" class="insp-btn">Log leeren</button>
    <button id="insp-btn-close" class="insp-btn">Schließen</button>
  `;

  const styleBtn = document.createElement('style');
  styleBtn.textContent = `
    .insp-btn{
      height:36px; padding:0 12px; border-radius:10px; border:1px solid rgba(255,255,255,.08);
      background:#14231b; color:#e6f1ec; cursor:pointer; font-weight:600; margin-left:8px;
    }
    .insp-log{
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px; line-height: 1.45; white-space: pre-wrap;
      padding:12px 14px; overflow:auto; background:#070c0b;
    }
    .insp-foot{
      display:flex; gap:10px; align-items:center; padding:10px 14px; border-top:1px solid rgba(255,255,255,.06);
      color:#9bb6aa; font-size:13px;
    }
    .tag{ padding:.12em .5em; border-radius:999px; background:#101a15; border:1px solid rgba(255,255,255,.06); margin-right:6px; }
    .ok{ color:#24c27a } .warn{ color:#e3b64b } .err{ color:#ff6a6a }
  `;

  const logEl = document.createElement('div');
  logEl.className = 'insp-log';
  logEl.id = 'insp-log';

  const footer = document.createElement('div');
  footer.className = 'insp-foot';
  footer.innerHTML = `
    <span class="tag">DPR: <span id="insp-dpr">?</span></span>
    <span class="tag">Index: ${window.__UI_VERSION || 'v?'}</span>
    <span class="tag">Game: <span id="insp-gamev">unbekannt</span></span>
    <span style="margin-left:auto;">Alle Tools & Booster hier gebündelt; Spieloberfläche bleibt frei.</span>
  `;

  panel.appendChild(header);
  panel.appendChild(logEl);
  panel.appendChild(footer);
  root.appendChild(styleBtn);
  root.appendChild(panel);
  document.body.appendChild(root);

  // ----------------------------- State / API --------------------------------
  const state = {
    lines: []
  };

  function fmt(kind, msg){
    const ts = new Date().toTimeString().slice(0,8);
    const icon = kind === 'ok' ? '✅' : kind === 'warn' ? '⚠️' : '❌';
    return `[${ts}] ${icon} (${kind}) ${msg}`;
    // Farben übernimmt CSS-Klasse beim Rendern nicht – bewusst schlicht im Text.
  }

  function render(){
    logEl.textContent = state.lines.join('\n');
    document.getElementById('insp-dpr').textContent = (window.devicePixelRatio || 1);
    document.getElementById('insp-gamev').textContent = (window.Game?.version || window.game?.version || 'unbekannt');
  }

  // Öffnen/Schließen
  function open(){ root.style.display = 'block'; render(); }
  function close(){ root.style.display = 'none'; }

  // Logging
  function push(kind, msg){
    state.lines.push(fmt(kind, msg));
    // Letzte Zeilen sichtbar halten
    if (state.lines.length > 800) state.lines.splice(0, state.lines.length - 800);
    render();
  }
  function clear(){ state.lines.length = 0; render(); }
  async function copyText(){
    const t = logEl.textContent || '';
    try{ await navigator.clipboard.writeText(t); }catch(_){}
    return t;
  }

  // ----------------------------- Events / Buttons ---------------------------
  header.querySelector('#insp-btn-close').addEventListener('click', close);
  header.querySelector('#insp-btn-clear').addEventListener('click', clear);
  header.querySelector('#insp-btn-copy').addEventListener('click', copyText);

  // Öffnen via globalem FAB in index.html
  // (Der Button ruft window.GameInspector.open() auf.)
  // Zusätzlich: Tastenkürzel `i`
  window.addEventListener('keydown', (ev)=>{
    if (ev.key.toLowerCase() === 'i') open();
  });

  // Reagiere auf bekannte UI-Events
  window.addEventListener('cb:game-started', ()=> {
    push('ok', 'Game gestartet (Event empfangen)');
  });

  // ----------------------------- Expose API ---------------------------------
  window.GameInspector = { open, close, push, clear, copyText, version: VERSION };

  // Erstmeldung
  push('ok', `Inspector bereit (inspector.js ${VERSION})`);
})();
