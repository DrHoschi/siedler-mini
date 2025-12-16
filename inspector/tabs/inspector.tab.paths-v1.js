/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.paths-v1.js
 * Version : v25.12.01
 * Zweck   : PFAD-TOOLS – Buttons für Overlay/Heatmap (steuern Spielmodule)
 *
 * Bridge  : inspector/inspector.bridges.js verdrahtet die Events ins Spiel.
 * Events  : Inspector sendet:
 *            'cb:path:overlay:on'  | 'cb:path:overlay:off'
 *            'cb:path:heatmap:on'  | 'cb:path:heatmap:off'
 *            'cb:path:layer:on'    | 'cb:path:layer:off'   (Stamps)
 * Hinweis : Es wird NICHT mehr UIInspector.pathOverlay/heatmap aufgerufen,
 *           weil diese Funktionen in deinem Projekt nicht existieren.
 * ========================================================================== */

/* ============================================================================
 * TEIL 1 – Legacy-Tab-Registrierung (altes Inspector-API)
 *   - Wird über window.registerInspectorTab(...) eingebunden.
 *   - Nutzt bereits die Event-API (cb:path:overlay/heatmap:*).
 * ========================================================================== */
(function () {
  function renderPathsTab(sectionEl) {
    sectionEl.innerHTML = [
      '<div class="insp-pad">',
      '<h3>Paths / Overlays</h3>',
      '<div class="row">',
      '  <button type="button" data-action="ovl-on">Overlay ON</button>',
      '  <button type="button" data-action="ovl-off">Overlay OFF</button>',
      '</div>',
      '<div class="row" style="margin-top:8px;">',
      '  <button type="button" data-action="heat-on">Heatmap ON</button>',
      '  <button type="button" data-action="heat-off">Heatmap OFF</button>',
      '</div>',
      '<div class="row" style="margin-top:8px;">',
      '  <button type="button" data-action="layer-on">Layer (Stamps) ON</button>',
      '  <button type="button" data-action="layer-off">Layer (Stamps) OFF</button>',
      '</div>',
      '<div class="row" style="margin-top:10px;align-items:center;gap:8px;">',
      '  <label style="min-width:110px;opacity:.85">Decay Speed</label>',
      '  <input type="range" data-action="decay-speed" min="0" max="300" step="5" value="100" style="flex:1">',
      '  <span data-action="decay-speed-label" style="min-width:52px;text-align:right;opacity:.8">100%</span>',
      '</div>',
      '<div class="row" style="margin-top:8px;">',
      '  <button type="button" data-action="decay-freeze">Freeze Decay</button>',
      '  <button type="button" data-action="decay-unfreeze">Unfreeze</button>',
      '</div>',
      '<p style="opacity:.7;margin-top:8px">',
      'Hinweis: Overlay = sichtbar/unsichtbar. Layer = Pfad-Stamps an/aus. Heatmap = Intensitätsfläche.',
      '</p>',
      '<pre data-action="paths-state" style="opacity:.75;margin-top:8px;white-space:pre-wrap"></pre>',
      '</div>'
    ].join('');

    // Zentrale Helper-Funktion: schickt Events ins Spiel
    const send = (type, detail) => window.dispatchEvent(new CustomEvent(type, { detail }));

    sectionEl.querySelector('[data-action="ovl-on"]')
      .addEventListener('click', () => send('cb:path:overlay:on'));

    sectionEl.querySelector('[data-action="ovl-off"]')
      .addEventListener('click', () => send('cb:path:overlay:off'));

    sectionEl.querySelector('[data-action="heat-on"]')
      .addEventListener('click', () => send('cb:path:heatmap:on'));

    sectionEl.querySelector('[data-action="heat-off"]')
      .addEventListener('click', () => send('cb:path:heatmap:off'));

    sectionEl.querySelector('[data-action="layer-on"]')
      .addEventListener('click', () => send('cb:path:layer:on'));

    sectionEl.querySelector('[data-action="layer-off"]')
      .addEventListener('click', () => send('cb:path:layer:off'));

    // Decay Speed Slider
    const sl = sectionEl.querySelector('[data-action="decay-speed"]');
    const slLabel = sectionEl.querySelector('[data-action="decay-speed-label"]');
    sl?.addEventListener('input', () => {
      const percent = Number(sl.value) || 0;
      const mult = percent / 100;
      if (slLabel) slLabel.textContent = `${percent}%`;
      send('cb:path:decay:speed', { percent, mult });
      // Fallback: direkt ins Modul (falls Bridge mal nicht greift)
      try{ window.PathOverlay?.setDecaySpeed?.(mult); }catch(_){/*noop*/}
    });

    // Freeze/Unfreeze
    sectionEl.querySelector('[data-action="decay-freeze"]')
      .addEventListener('click', () => {
        send('cb:path:decay:freeze', { paused: true });
        try{ window.PathOverlay?.setDecayPaused?.(true); }catch(_){/*noop*/}
      });
    sectionEl.querySelector('[data-action="decay-unfreeze"]')
      .addEventListener('click', () => {
        send('cb:path:decay:freeze', { paused: false });
        try{ window.PathOverlay?.setDecayPaused?.(false); }catch(_){/*noop*/}
      });

    // Status live anzeigen (optional)
    const stateBox = sectionEl.querySelector('[data-action="paths-state"]');
    const updateState = (st)=>{
      if (!stateBox) return;
      stateBox.textContent = st ? JSON.stringify(st, null, 2) : '';
    };
    // Initial pull
    try{ updateState(window.PathOverlay?.getState?.()); }catch(_){/*noop*/}
    window.addEventListener('cb:path:state', (e)=> updateState(e.detail));
  }

  // Legacy-API des Inspectors (Adapter kümmert sich um Einbindung)
  window.registerInspectorTab && window.registerInspectorTab('paths', renderPathsTab);
})();

/* ============================================================================
 * TEIL 2 – Neues Panel-Layout (data-panel="paths")
 *   - Wird über das Event 'cb:insp:tab:change' aktiviert.
 *   - Zeichnet eine Toolbar + Statuszeile.
 *   - Nutzt dieselbe Event-API wie oben (KEIN UIInspector.* mehr!).
 * ========================================================================== */
(() => {

  // Hilfsfunktion: zentrales Event-Dispatching für Overlay/Heatmap
  function send(type, detail) {
  // 1) Standard: Event dispatch (wie bisher)
  window.dispatchEvent(new CustomEvent(type, { detail }));

  // 2) HARDENING: Falls Bridge/Listener mal nicht greift, direkt das Modul ansprechen,
  //    sofern es im selben Window verfügbar ist. (Schadet nicht, hilft sofort beim Debug.)
  const PO = window.PathOverlay;
  if (!PO) return;
  try{
    if (type === 'cb:path:overlay:on')  PO.toggle?.(true);
    if (type === 'cb:path:overlay:off') PO.toggle?.(false);
    if (type === 'cb:path:heatmap:on')  PO.setHeatmap?.(true);
    if (type === 'cb:path:heatmap:off') PO.setHeatmap?.(false);
    if (type === 'cb:path:layer:on')    { PO.setVisible?.(true); PO.setStamps?.(true); }
    if (type === 'cb:path:layer:off')   PO.setStamps?.(false);
    if (type === 'cb:path:stamps:on')   { PO.setVisible?.(true); PO.setStamps?.(true); }
    if (type === 'cb:path:stamps:off')  PO.setStamps?.(false);
    // Decay
    if (type === 'cb:path:decay:freeze') PO.setDecayPaused?.(!!(detail && detail.paused));
    if (type === 'cb:path:decay:on')     PO.setDecayPaused?.(false);
    if (type === 'cb:path:decay:off')    PO.setDecayPaused?.(true);
    if (type === 'cb:path:decay:speed'){
      const d = detail || {};
      if (d.mult != null)    PO.setDecaySpeed?.(d.mult);
      if (d.percent != null) PO.setDecaySpeed?.(Number(d.percent)/100);
      if (d.perSec != null)  PO.setDecayPerSec?.(d.perSec);
    }
  }catch(err){
    // NICHT spammen – nur einmal pro Fehlerart
    window.__PATHS_TAB_DIRECT_CALL_ERR__ = window.__PATHS_TAB_DIRECT_CALL_ERR__ || {};
    const key = String(err && err.message || err);
    if (!window.__PATHS_TAB_DIRECT_CALL_ERR__[key]){
      window.__PATHS_TAB_DIRECT_CALL_ERR__[key] = 1;
      console.warn('[inspector.paths] direct PathOverlay call failed:', err);
    }
  }
}

  // Status-Text unten im Panel aktualisieren
  function setInfo(msg) {
    const box = document.querySelector('[data-panel="paths"] #paths-info');
    if (box) box.textContent = msg;
  }

  function mount(panel){
    panel.innerHTML = `
      <div class="insp-toolbar">
        <strong>Pfade</strong>
        <span class="spacer"></span>
        <button class="insp-btn" id="p-ov-on">Overlay an</button>
        <button class="insp-btn" id="p-ov-off">Overlay aus</button>
        <button class="insp-btn" id="p-hm-on">Heatmap an</button>
        <button class="insp-btn" id="p-hm-off">Heatmap aus</button>
        <button class="insp-btn" id="p-layer-on">Layer an</button>
        <button class="insp-btn" id="p-layer-off">Layer aus</button>
      </div>
      <div class="pad" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <label style="opacity:.85">Decay Speed</label>
        <input id="p-decay-speed" type="range" min="0" max="300" step="5" value="100" style="min-width:200px;flex:1">
        <span id="p-decay-speed-label" class="muted" style="min-width:52px;text-align:right">100%</span>
        <button class="insp-btn" id="p-decay-freeze">Freeze Decay</button>
      </div>
      <div id="paths-info" class="pad muted">(keine Daten)</div>
      <pre id="paths-state" class="pad muted" style="white-space:pre-wrap;opacity:.75"></pre>
    `;

    const btnOverlayOn  = panel.querySelector("#p-ov-on");
    const btnOverlayOff = panel.querySelector("#p-ov-off");
    const btnHeatOn     = panel.querySelector("#p-hm-on");
    const btnHeatOff    = panel.querySelector("#p-hm-off");
    const btnLayerOn    = panel.querySelector("#p-layer-on");
    const btnLayerOff   = panel.querySelector("#p-layer-off");

    const slDecay       = panel.querySelector("#p-decay-speed");
    const slDecayLabel  = panel.querySelector("#p-decay-speed-label");
    const btnFreeze     = panel.querySelector("#p-decay-freeze");

    let decayPaused = false;

    function renderState(st){
      const pre = panel.querySelector('#paths-state');
      if (pre) pre.textContent = st ? JSON.stringify(st, null, 2) : '';
      if (typeof st?.decayPaused === 'boolean'){
        decayPaused = st.decayPaused;
        if (btnFreeze) btnFreeze.textContent = decayPaused ? 'Unfreeze Decay' : 'Freeze Decay';
      }
      // Slider sync
      if (slDecay && st?.decaySpeedMult != null){
        const pct = Math.round(Number(st.decaySpeedMult) * 100);
        slDecay.value = String(Math.max(0, Math.min(300, pct)));
        if (slDecayLabel) slDecayLabel.textContent = `${slDecay.value}%`;
      }
    }

    // Overlay EIN
    btnOverlayOn?.addEventListener("click", () => {
      send('cb:path:overlay:on');
      setInfo('Overlay eingeschaltet (Event cb:path:overlay:on).');
    });

    // Overlay AUS
    btnOverlayOff?.addEventListener("click", () => {
      send('cb:path:overlay:off');
      setInfo('Overlay ausgeschaltet (Event cb:path:overlay:off).');
    });

    // Heatmap EIN
    btnHeatOn?.addEventListener("click", () => {
      send('cb:path:heatmap:on');
      setInfo('Heatmap eingeschaltet (Event cb:path:heatmap:on).');
    });

    // Heatmap AUS
    btnHeatOff?.addEventListener("click", () => {
      send('cb:path:heatmap:off');
      setInfo('Heatmap ausgeschaltet (Event cb:path:heatmap:off).');
    });

    // Layer EIN/AUS (Buttons waren im HTML, aber unten noch nicht verdrahtet)
    btnLayerOn?.addEventListener("click", () => {
      send('cb:path:layer:on');
      setInfo('Layer/Stamps eingeschaltet (Event cb:path:layer:on).');
    });
    btnLayerOff?.addEventListener("click", () => {
      send('cb:path:layer:off');
      setInfo('Layer/Stamps ausgeschaltet (Event cb:path:layer:off).');
    });

    // Decay Speed Slider
    slDecay?.addEventListener('input', () => {
      const percent = Number(slDecay.value) || 0;
      const mult = percent / 100;
      if (slDecayLabel) slDecayLabel.textContent = `${percent}%`;
      send('cb:path:decay:speed', { percent, mult });
      setInfo(`Decay Speed gesetzt: ${percent}% (mult=${mult.toFixed(2)}).`);
    });

    // Freeze Toggle
    btnFreeze?.addEventListener('click', () => {
      decayPaused = !decayPaused;
      send('cb:path:decay:freeze', { paused: decayPaused });
      btnFreeze.textContent = decayPaused ? 'Unfreeze Decay' : 'Freeze Decay';
      setInfo(decayPaused ? 'Decay eingefroren (Freeze).' : 'Decay läuft wieder (Unfreeze).');
    });

    // Initial State pull
    try{ renderState(window.PathOverlay?.getState?.()); }catch(_){/*noop*/}
    window.addEventListener('cb:path:state', (e)=> renderState(e.detail));
  }

  // Wenn dein Spiel Status liefert, hier in die Info-Zeile schreiben
  window.addEventListener("cb:paths:ready", (e)=>{
    const box = document.querySelector('[data-panel="paths"] #paths-info');
    if (!box) return;
    const detail = e.detail ?? { ready: true };
    box.textContent = JSON.stringify(detail, null, 2);
  });

  // Tab-Wechsel abfangen und Panel bei Bedarf erst dann aufbauen
  function ensureMountedOnShow(){
    window.addEventListener("cb:insp:tab:change", (e)=>{
      if (e.detail?.tab !== "paths") return;
      const panel = document.querySelector('[data-panel="paths"]');
      if (!panel) return;
      if (!panel.querySelector("#paths-info")) {
        mount(panel);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", ensureMountedOnShow);
  } else {
    ensureMountedOnShow();
  }
})();


