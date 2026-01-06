/* ============================================================================
 * Datei   : core/unit.directions.js
 * Projekt : Neue Siedler – Unit Direction Canon
 * Version : v26.01.06-dirorder-central-v1
 *
 * Zweck   :
 *   - ZENTRALE, einmalige Definition der 8 Richtungs-Tokens (KANONISCH).
 *   - Verhindert "Verdrehungen" durch unterschiedliche Reihenfolgen in Atlanten.
 *   - Bietet kleine Helper:
 *       UnitDirections.order         -> ["N","NE","E","SE","S","SW","W","NW"]
 *       UnitDirections.indexOf(tok)  -> 0..7
 *       UnitDirections.tokenAt(i)    -> Token (mit Wrap)
 *       UnitDirections.applyOffset(tok, steps) -> Token verschoben (45° * steps)
 *
 * WICHTIG:
 *   - Standalone (keine Imports), robust für iOS/Safari + euer Script-Setup.
 *   - Debug/Checker bleibt drin.
 * ============================================================================ */
(function(){
  'use strict';

  // KANONISCHE Ordnung (Uhrzeigersinn, Start bei N)
  const DIR8_ORDER = ["N","NE","E","SE","S","SW","W","NW"];

  function _norm(tok){
    return String(tok||'').toUpperCase().trim();
  }

  function indexOf(tok){
    const t = _norm(tok);
    const i = DIR8_ORDER.indexOf(t);
    return i >= 0 ? i : 0;
  }

  function tokenAt(i){
    const n = DIR8_ORDER.length;
    const k = ((Number(i)||0) % n + n) % n;
    return DIR8_ORDER[k];
  }

  function applyOffset(tok, steps){
    const i = indexOf(tok);
    const s = Number(steps||0)||0;
    return tokenAt(i + s);
  }

  // Optional: Debug-Flag, damit wir im Zweifel schnell sehen, ob die Datei geladen ist.
  const debug = false;
  if (debug && !window.__DIR_DEBUG_ONCE__){
    window.__DIR_DEBUG_ONCE__ = true;
    console.log('[dir] UnitDirections loaded', DIR8_ORDER);
  }

  window.UnitDirections = {
    order: DIR8_ORDER,
    indexOf,
    tokenAt,
    applyOffset
  };
})();
