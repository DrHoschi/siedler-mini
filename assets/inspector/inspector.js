/* ------------------------------------------------------------------
   Datei : assets/inspector/inspector.js
   Vers. : v16.1.6
   Zweck : Vollbild-Inspector (ein-/ausblendbar), Konsolen-Hooks, 
           Log-Stream mit Icons, Copy-to-Clipboard, Public API:
           - window.GameInspector.toggle(true|false)
           - window.GameInspector.push(level, message)
           - window.GameInspector.copyToClipboard()
   ------------------------------------------------------------------ */
(function(){
  "use strict";

  const VERSION = "v16.1.6";

  // DOM-Referenzen (werden erst gefunden, wenn index.html geladen ist)
  let elOverlay, elLog, elClose, elClear;

  // interner Buffer (optional hilfreich für spätere Persistenz)
  const buffer = [];

  // Icons + CSS-Klasse je Level
  const LVL = {
    ok:   { icon: "✅", cls: "log-ok"   },
    warn: { icon: "⚠️", cls: "log-warn" },
    err:  { icon: "❌", cls: "log-err"  },
    info: { icon: "💬", cls: ""         },
    raw:  { icon: "•",  cls: ""         }
  };

  // Hilfsfunktion: Zeitstempel
  function ts(){
    const d = new Date();
    return d.toLocaleTimeString([], {hour12:false});
  }

  // In den Inspector-Log schreiben
  function push(level, msg){
    if (!elLog){
      // vor Initialisierung puffern
      buffer.push({level, msg, t: Date.now()});
      return;
    }
    const meta = LVL[level] || LVL.info;
    const line = document.createElement('div');
    line.className = meta.cls;
    line.textContent = `[${ts()}] ${meta.icon} (${level}) ${String(msg)}`;
    elLog.appendChild(line);
    elLog.scrollTop = elLog.scrollHeight;
  }

  // Public API
  const API = {
    version: VERSION,
    toggle(forceOpen){
      if (!elOverlay) return;
      const show = (typeof forceOpen === "boolean")
        ? forceOpen
        : (elOverlay.style.display !== 'grid');
      elOverlay.style.display = show ? 'grid' : 'none';
    },
    push,
    copyToClipboard(){
      if (!elLog) return;
      let text = "";
      // alle Einträge in Plaintext zusammensetzen
      elLog.childNodes.forEach(n => { text += (n.textContent || "") + "\n"; });
      try{
        navigator.clipboard.writeText(text.trim());
        push('ok', 'Log in Zwischenablage');
      }catch(e){
        push('err', 'Clipboard fehlgeschlagen: ' + (e?.message || e));
      }
    }
  };

  // Global verfügbar machen
  window.GameInspector = API;

  // Init sobald DOM da ist
  function initDOM(){
    elOverlay = document.getElementById('inspector-overlay');
    elLog     = document.getElementById('inspector-log');
    elClose   = document.getElementById('inspector-close');
    elClear   = document.getElementById('inspector-clear');

    if (!elOverlay || !elLog){
      // Falls index.html noch nicht die neuen Elemente hat, leise aussteigen
      console.warn('[Inspector] Overlay-Elemente nicht gefunden (index nicht aktualisiert?)');
      return;
    }

    // Event-Handler
    elClose?.addEventListener('click', () => API.toggle(false));
    elClear?.addEventListener('click', () => { elLog.innerHTML = ''; });

    // gepufferte Logs nachtragen
    if (buffer.length){
      buffer.forEach(e => push(e.level, e.msg));
      buffer.length = 0;
    }

    // Begrüßung
    push('ok', `Inspector bereit (${VERSION})`);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initDOM);
  } else {
    initDOM();
  }

  // ----------- Console Hooks (Spiegeln in den Inspector) -----------
  // Wir bewahren die originalen Methoden auf und rufen sie weiterhin auf.
  const _log   = console.log.bind(console);
  const _warn  = console.warn.bind(console);
  const _error = console.error.bind(console);
  const _info  = console.info.bind(console);

  console.log = function(...args){
    try { API.push('ok', args.join(' ')); } catch(_) {}
    _log(...args);
  };
  console.warn = function(...args){
    try { API.push('warn', args.join(' ')); } catch(_) {}
    _warn(...args);
  };
  console.error = function(...args){
    try { API.push('err', args.join(' ')); } catch(_) {}
    _error(...args);
  };
  console.info = function(...args){
    try { API.push('info', args.join(' ')); } catch(_) {}
    _info(...args);
  };

  // ----------- Spiel-Hooks (optional) -----------
  // game.js kann die Version melden:
  //   window.dispatchEvent(new CustomEvent('cb:game-version', {detail:{version:'vX.Y.Z'}}));
  window.addEventListener('cb:game-version', (ev) => {
    const v = ev?.detail?.version || 'unbekannt';
    push('ok', `game.js initialisiert (v=${v})`);
  });

  // Wenn das Spiel startet:
  //   window.dispatchEvent(new CustomEvent('cb:game-started'));
  window.addEventListener('cb:game-started', () => {
    push('ok', 'Game gestartet (Event)');
  });
})();
