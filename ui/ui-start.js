/* ============================================================================
 * Datei: ui/ui-start.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: Startpanel – Buttons & Events.
 * Datum: 2025-09-21
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * Hinweis: Debug/Inspector NIE entfernen. Ereignisse nutzen (cb:*).
 * ============================================================================ */

// --- CBLog (Fallback) --------------------------------------------------------
window.CBLog = window.CBLog || {
  ok:   (...a)=>console.log('✅', ...a),
  info: (...a)=>console.log('ℹ️', ...a),
  warn: (...a)=>console.warn('⚠️', ...a),
  error:(...a)=>console.error('❌', ...a),
};

const UISTART_VERSION="v1.0.0";
function toggleFullscreen(target){const docEl=document.documentElement;if(target==='enter')docEl.requestFullscreen?.();if(target==='exit')document.exitFullscreen?.();}
(function initUIStart(){
  CBLog.ok("[ui-start] Modul geladen ("+UISTART_VERSION+")");
  const btnNew=document.getElementById('btn-new');
  const btnCont=document.getElementById('btn-continue');
  const btnReset=document.getElementById('btn-reset');
  const btnFull=document.getElementById('btn-fullscreen');
  const btnOpenInsp=document.getElementById('btn-open-insp');
  btnNew?.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('cb:start:new',{ detail:{ difficulty:'normal' } })));
  btnCont?.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('cb:start:continue',{ detail:{ slot:0 } })));
  btnReset?.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('cb:start:reset',{ detail:{ confirm:true } })));
  btnFull?.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('cb:start:fullscreen',{ detail:{ target: document.fullscreenElement ? 'exit' : 'enter' } })));
  btnOpenInsp?.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('cb:insp:open',{ detail:{ tab:'Logs' } })));
  window.addEventListener('cb:start:fullscreen',(ev)=>toggleFullscreen(ev.detail.target));
})();
