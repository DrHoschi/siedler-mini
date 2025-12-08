/* ============================================================================
 * Datei   : core/game.place.js
 * Projekt : Neue Siedler
 * Version : v25.12.08-place-controller-skel
 * Zweck   : Platzier-/Ghost-Controller (Skelett)
 *
 * Langfristige Aufgabe dieses Moduls:
 *  - Verwaltung des Platzier-Ghosts (Overlay, Tint, Buttons)
 *  - Integration mit Registry (Building-Icons)
 *  - Bauen bestätigen (cb:build:place senden)
 *
 * Aktuell (Schritt 2 / Skelett):
 *  - Stellt nur ein globales API-Objekt window.GamePlace bereit.
 *  - Alle Methoden sind NO-OP (tun nichts, loggen höchstens).
 *  - core.input.js arbeitet weiter wie bisher, ohne Verhalten zu ändern.
 *
 * Geplantes API (für Phase 3+):
 *  - onSetBuildTool(kind)     → Build-Tool wurde gewählt/geleert
 *  - onPlaceBegin({w,h})      → Baugröße aus Registry
 *  - onCameraChange({x,y,zoom}) → Kameraänderung (für Ghost-Scaling)
 *  - onHoverTile({tx,ty,sx,sy}) → Hover über Map im Platziermodus
 *  - onMapClick({tx,ty,sx,sy})  → Klick auf freie Map im Platziermodus
 *  - onKeyEnter()              → Enter im Platziermodus
 *  - onKeyEscape()             → ESC im Platziermodus
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[place]';
  const OK   = (...a)=> (window.CBLog?.ok   ?? console.log  )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info ?? console.info )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn )(TAG, ...a);

  // ==========================================================================
  // Interner State (wird in späteren Schritten benutzt)
  // ==========================================================================
  //
  // WICHTIG: Im aktuellen Skelett werden diese Variablen NICHT aktiv genutzt,
  // sie sind nur als Platzhalter angelegt, damit wir später sauber einhängen
  // können, ohne die Struktur wieder umzubauen.
  // --------------------------------------------------------------------------

  let currentTool = null;             // z.B. 'b.hq'
  let lastHover   = { tx:0, ty:0, sx:0, sy:0 };
  let lastSize    = { w:3, h:3 };
  let cam         = { x:0, y:0, zoom:1 };

  // Später kommen hier DOM-Refs für Overlay/Ghost/Buttons rein:
  // let overlay, ghost, tint, btnOk, btnCancel;

  // ==========================================================================
  // Externes API – wird von core.input.js (bzw. Boot) aufgerufen
  // ==========================================================================
  //
  // ACHTUNG:
  //  - In Schritt 2 sind alle Methoden NO-OP (tun nichts, außer optional
  //    Logging).
  //  - In Schritt 3/4 werden wir diese Methoden nach und nach mit echter
  //    Ghost-/Platzier-Logik füllen und core.input.js auf dieses API umbauen.
  // --------------------------------------------------------------------------

  const GamePlace = {

    /**
     * Wird aufgerufen, wenn ein Build-Tool gewählt oder abgewählt wird.
     * kind: string oder null (z.B. 'b.hq' oder null zum Deaktivieren)
     */
    onSetBuildTool(kind){
      currentTool = kind || null;
      INFO('onSetBuildTool', currentTool);
      // Schritt 2: NO-OP (core.input.js macht weiterhin alles selbst)
    },

    /**
     * Wird aufgerufen, wenn req:place:begin({w,h}) kommt.
     * cfg: {w:number, h:number}
     */
    onPlaceBegin(cfg){
      if (!cfg) return;
      if (typeof cfg.w === 'number') lastSize.w = cfg.w|0;
      if (typeof cfg.h === 'number') lastSize.h = cfg.h|0;
      INFO('onPlaceBegin', lastSize);
      // Schritt 2: NO-OP
    },

    /**
     * Wird bei cb:camera-change aufgerufen.
     * camState: {x:number, y:number, zoom:number}
     */
    onCameraChange(camState){
      if (!camState) return;
      cam.x    = camState.x ?? cam.x;
      cam.y    = camState.y ?? cam.y;
      cam.zoom = camState.zoom ?? cam.zoom;
      INFO('onCameraChange', cam);
      // Schritt 2: NO-OP
    },

    /**
     * Wird bei Hover über die Map im Platziermodus aufgerufen.
     * p: {tx,ty,sx,sy}
     */
    onHoverTile(p){
      if (!p) return;
      lastHover = p;
      // INFO('onHoverTile', p); // bei Bedarf Debug aktivieren
      // Schritt 2: NO-OP – Ghost wird weiterhin direkt von core.input.js bewegt.
    },

    /**
     * Wird bei Klick auf freie Map im Platziermodus aufgerufen.
     * p: {tx,ty,sx,sy}
     */
    onMapClick(p){
      if (!p) return;
      lastHover = p;
      INFO('onMapClick', p);
      // Schritt 2: NO-OP – placeAt/Buttons laufen noch komplett im Input-Modul.
    },

    /**
     * ENTER im Platziermodus.
     * Soll später die zentrale Bestätigungslogik anstoßen.
     */
    onKeyEnter(){
      INFO('onKeyEnter');
      // Schritt 2: NO-OP – core.input.js ruft noch direkt placeAt(...) auf.
    },

    /**
     * ESC im Platziermodus.
     * Soll später Ghost/Overlay schließen und Tool zurücksetzen.
     */
    onKeyEscape(){
      INFO('onKeyEscape');
      // Schritt 2: NO-OP – core.input.js macht weiterhin resetTool().
    }
  };

  // Global verfügbar machen
  window.GamePlace = GamePlace;

  OK('bereit v25.12.08-place-controller-skel');

})();
