/* =========================================================================
   assets/inspector/inspector.logfix.js — v1.0.0
   Zweck: Stabilisiert die Log-Anzeige im Inspector:
          - Puffer sofort anzeigen
          - Live-Stream anhängen
          - Bei Tab-Wechsel erneut synchronisieren
   ========================================================================= */
(function(){
  const W = window;
  const wait = (sel, t=8000)=>new Promise((resolve,reject)=>{
    const t0 = performance.now();
    (function loop(){
      const el = document.querySelector(sel);
      if (el) return resolve(el);
      if (performance.now()-t0 > t) return reject(new Error('timeout '+sel));
      requestAnimationFrame(loop);
    })();
  });

  function renderBuffer(into) {
    try {
      const buf = (W.CBLog?.getBuffer?.() || []);
      into.textContent = buf.length ? buf.join('\n') : '[Keine Log-Einträge vorhanden]';
    } catch (e) {
      into.textContent = '[Log konnte nicht gelesen werden]';
    }
  }

  function armLiveStream(into) {
    if (!W.CBLog?.on) return;
    // Doppelte Listener vermeiden
    if (into.__live_armed__) return;
    into.__live_armed__ = true;

    const onLine = (line)=>{
      try {
        // performant anhängen
        into.textContent += (into.textContent ? '\n' : '') + line;
        // Scrollen, falls der Nutzer unten ist
        if (into.parentElement && into.parentElement.scrollTop + into.parentElement.clientHeight >= into.parentElement.scrollHeight - 8) {
          into.parentElement.scrollTop = into.parentElement.scrollHeight;
        }
      } catch {}
    };
    into.__cblog_listener__ = onLine;
    W.CBLog.on(onLine);
  }

  function disarmLiveStream(into){
    if (into?.__cblog_listener__ && window.CBLog?.off){
      window.CBLog.off(into.__cblog_listener__);
      into.__cblog_listener__ = null;
      into.__live_armed__ = false;
    }
  }

  // Sobald die Inspector-UI existiert, Logs initial füllen + streamen
  function syncLogsOnce(root){
    try{
      const pane = root.querySelector?.('#insp-logs-pane .insp-logview') || root.querySelector?.('.insp-logview');
      if (!pane) return;
      renderBuffer(pane);
      armLiveStream(pane);
    }catch{}
  }

  // Öffnen/Schließen des Inspectors abfangen, falls GameUI vorhanden
  (function hookGameUI(){
    const GUI = W.GameUI = W.GameUI || {};
    const origOpen   = GUI.openInspector;
    const origToggle = GUI.toggleInspector;

    GUI.openInspector = function(){
      try { origOpen?.apply(this, arguments); } catch {}
      // leicht verzögert sicherstellen, dass DOM da ist
      setTimeout(()=>wait('#inspector').then(syncLogsOnce).catch(()=>{}), 50);
    };
    GUI.toggleInspector = function(){
      try { origToggle?.apply(this, arguments); } catch {}
      setTimeout(()=>wait('#inspector').then(syncLogsOnce).catch(()=>{}), 50);
    };
  })();

  // Falls der Inspector bereits offen ist (Startseite), sofort synchronisieren
  document.addEventListener('DOMContentLoaded', ()=>{
    const root = document.querySelector('#inspector');
    if (root) setTimeout(()=>syncLogsOnce(root), 0);
  });

  // Tab-Wechsel im Inspector beobachten (delegiert)
  document.addEventListener('click', (ev)=>{
    const btn = ev.target.closest?.('[data-insp-tab]');
    if (!btn) return;
    const tab = btn.getAttribute('data-insp-tab');
    const root = document.querySelector('#inspector');
    if (!root) return;

    const pane = root.querySelector('#insp-logs-pane .insp-logview');
    if (!pane) return;

    if (tab === 'logs'){
      // Beim Wechsel auf „Logs“: erneut Puffer laden + stream sicher
      renderBuffer(pane);
      armLiveStream(pane);
    } else {
      // Beim Wechsel weg: Stream abklemmen (spart CPU)
      disarmLiveStream(pane);
    }
  });
})();
