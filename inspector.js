/* inspector.js — v16.1.7
 * Dev-Overlay für Tests/Fehleranalyse.
 * - Öffnen/Schließen per window.GameInspector.toggle()
 * - Button unten rechts (in index.html) ruft toggle() auf
 * - Zeigt gesammelt das Log aus window.Log an (nicht im Spiel sichtbar)
 * - Enthält Cache-Booster & Log-Aktionen, KEINE Spielstart-Funktionen
 */

(function(){
  const VERSION = 'v16.1.7';

  // ---- DOM anlegen (Vollfläche) ----
  const root = document.createElement('div');
  root.id = 'dev-inspector';
  root.style.cssText = `
    position:fixed; inset:0; display:none; background:#000a; backdrop-filter: blur(6px);
  `;

  // Panel
  const panel = document.createElement('div');
  panel.style.cssText = `
    position:absolute; inset: 32px 20px 20px 20px; 
    background:#0b0f0d; border:1px solid #ffffff22; border-radius:14px;
    color:#e9f3ec; display:flex; flex-direction:column; overflow:hidden;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display:flex; align-items:center; gap:.6rem; padding:12px; background:#0f1714; 
    border-bottom:1px solid #ffffff12;
  `;
  header.innerHTML = `
    <strong style="font-size:16px">Inspector (v${VERSION})</strong>
    <span style="margin-left:auto; display:flex; gap:.5rem;">
      <button id="insp-clear" class="insp-btn">Log leeren</button>
      <button id="insp-copy"  class="insp-btn">Log kopieren</button>
      <button id="insp-cache" class="insp-btn">Cache leeren</button>
      <button id="insp-close" class="insp-btn insp-primary">Schließen</button>
    </span>
  `;

  // Buttons-Style
  const styleBtn = document.createElement('style');
  styleBtn.textContent = `
    .insp-btn {
      background:#1a2420; color:#d7f0e1; border:1px solid #ffffff22; padding:.45rem .7rem;
      border-radius:10px; font-weight:700; cursor:pointer;
    }
    .insp-btn:hover { filter: brightness(1.12); }
    .insp-primary { background:#2f8f56; }
  `;

  // Logbereich
  const logWrap = document.createElement('div');
  logWrap.style.cssText = `flex:1 1 auto; overflow:auto; padding:12px; font:12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; background:#070b09;`;

  const logPre = document.createElement('pre');
  logPre.style.cssText = `margin:0; white-space:pre-wrap; color:#cfe9d6;`;
  logWrap.appendChild(logPre);

  // Zusammenbauen
  panel.appendChild(header);
  panel.appendChild(logWrap);
  root.appendChild(styleBtn);
  root.appendChild(panel);
  document.body.appendChild(root);

  // ---- Helpers ----
  function renderLog() {
    try {
      const lines = (window.Log?.dump?.() || []);
      logPre.textContent = lines.join('\n');
      logWrap.scrollTop = logWrap.scrollHeight;
    } catch(e){}
  }

  async function cacheBooster(){
    try {
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if (window.caches) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
      localStorage.clear(); sessionStorage.clear();
      window.Log?.ok?.('Cache/Storage geleert – Seite ggf. neu laden');
      renderLog();
    } catch(e){
      window.Log?.err?.('Cache-Booster Fehler: ' + (e?.message||e));
      renderLog();
    }
  }

  // ---- Events ----
  // neue Logzeilen live anhängen
  window.addEventListener('cb:log-line', (ev) => {
    const line = ev.detail?.line || '';
    logPre.textContent += (logPre.textContent ? '\n' : '') + line;
    logWrap.scrollTop = logWrap.scrollHeight;
  });

  window.addEventListener('cb:log-clear', renderLog);

  // Buttons
  header.querySelector('#insp-close').addEventListener('click', () => toggle(false));
  header.querySelector('#insp-copy').addEventListener('click', () => window.Log?.copy?.());
  header.querySelector('#insp-clear').addEventListener('click', () => { window.Log?.clear?.(); });
  header.querySelector('#insp-cache').addEventListener('click', cacheBooster);

  // ---- API ----
  function toggle(force){
    const show = (typeof force === 'boolean') ? force : (root.style.display === 'none');
    root.style.display = show ? 'block' : 'none';
    if (show) renderLog();
  }

  // Expose
  window.GameInspector = { toggle };

  // Bootstrap-Log
  window.Log?.ok?.(`Inspector bereit (v${VERSION})`);
})();
