// === assets/ui/ui-bridge.js ===
// Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
// (keine Imports hier – Browser-Bundle)

// ──────────────────────────────────────────────────────────────────────────────
// Konstanten
const LOG = (window.CBLog?.info) ? (...a)=>window.CBLog.info('[ui-bridge]', ...a)
                                 : (...a)=>console.log('[ui-bridge]', ...a);

const EV = (name, detail={}) => {
  // doppelt feuern: neue "cb:build:open" & alte "cb:build-open" Varianten
  if (/^cb:build:(open|close)$/.test(name)) {
    const legacy = name.replace('cb:build:', 'cb:build-');
    window.dispatchEvent(new CustomEvent(name,   { detail }));
    window.dispatchEvent(new CustomEvent(legacy, { detail }));
    return;
  }
  window.dispatchEvent(new CustomEvent(name, { detail }));
};

// ──────────────────────────────────────────────────────────────────────────────
function $(sel){ return document.querySelector(sel); }
function findBuildRoot(){
  return $('#build-dock') || $('#build-panel'); // kompatibel alt/neu
}

// ──────────────────────────────────────────────────────────────────────────────
// Build-Dock State
let _buildOpen = false;
function openBuild()  { const root=findBuildRoot(); if(!root) return LOG('Build-Root fehlt'); root.hidden=false; _buildOpen=true; EV('cb:build:open',{root}); }
function closeBuild() { const root=findBuildRoot(); if(!root) return; root.hidden=true;  _buildOpen=false; EV('cb:build:close',{root}); }
function toggleBuild(){ _buildOpen ? closeBuild() : openBuild(); }

// ──────────────────────────────────────────────────────────────────────────────
// Inspector-Bridge (nicht anfassen: nutzt vorhandenes System, sonst Fallback)
let _inspOpen = false;

function tryCallInspector(method){
  try {
    if (window.Inspector && typeof window.Inspector[method] === 'function') {
      window.Inspector[method]();
      return true;
    }
    // mögliche Alternativ-Namen aus älteren Ständen:
    if (window.InspectorCore && typeof window.InspectorCore[method] === 'function') {
      window.InspectorCore[method]();
      return true;
    }
    if (window.__inspector && typeof window.__inspector[method] === 'function') {
      window.__inspector[method]();
      return true;
    }
  } catch (e) {
    console.warn('[ui-bridge] Inspector call failed:', e);
  }
  return false;
}

function fireInspector(evt){
  // Events, die alte & neue Stände verstehen können
  // neu:
  window.dispatchEvent(new CustomEvent(`inspector:${evt}`));
  // legacy:
  window.dispatchEvent(new CustomEvent(`cb:inspector-${evt}`));
}

function openInspector(){
  if (tryCallInspector('open')) { _inspOpen = true; return; }
  fireInspector('open'); _inspOpen = true;
}
function closeInspector(){
  if (tryCallInspector('close')) { _inspOpen = false; return; }
  fireInspector('close'); _inspOpen = false;
}
function toggleInspector(){
  if (tryCallInspector('toggle')) { _inspOpen = !_inspOpen; return; }
  fireInspector('toggle'); _inspOpen = !_inspOpen;
}

// Rückkanal: falls der Inspector seinen Status selber meldet
window.addEventListener('inspector:opened', ()=>{ _inspOpen = true;  });
window.addEventListener('inspector:closed', ()=>{ _inspOpen = false; });

// ──────────────────────────────────────────────────────────────────────────────
// Hauptlogik: GameUI exportieren
window.GameUI = {
  // Build
  openBuild, closeBuild, toggleBuild, isBuildOpen:()=>_buildOpen,
  // Inspector
  openInspector, closeInspector, toggleInspector, isInspectorOpen:()=>_inspOpen
};

LOG('bereit (Bridge installiert)');
