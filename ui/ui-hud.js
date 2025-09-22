/* ============================================================================
 * Datei: ui/ui-hud.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: HUD – Ressourcenanzeige.
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

const UIHUD_VERSION="v1.0.0";
(function initHUD(){
  CBLog.ok("[ui-hud] Modul geladen ("+UIHUD_VERSION+")");
  const hud=document.createElement('div');
  hud.id="hud";
  hud.style.cssText="position:fixed;top:8px;left:8px;padding:8px 10px;background:rgba(0,0,0,.4);border:1px solid #000;border-radius:8px";
  hud.textContent="Holz: 0 | Stein: 0 | Fisch: 0";
  document.body.appendChild(hud);
  function update(res,delta){
    const t=window.STATE_RES||{wood:0,stone:0,fish:0};
    t[res]=(t[res]||0)+delta;
    window.STATE_RES=t;
    hud.textContent=`Holz: ${t.wood||0} | Stein: ${t.stone||0} | Fisch: ${t.fish||0}`;
  }
  window.addEventListener('cb:res:change',(ev)=>update(ev.detail.res,ev.detail.delta));
  window.dispatchEvent(new CustomEvent('cb:hud-ready',{ detail:{} }));
})();
