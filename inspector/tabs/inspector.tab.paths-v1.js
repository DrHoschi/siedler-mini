/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.paths-v1.js
 * Projekt : Neue Siedler – Inspector Tab (Pfade)
 * Version : v26.01.10-tabfix+live
 * Zweck   : PFAD-TOOLS – Steuerung für Trampelpfad-System (World-Layer)
 *
 * Patch-Inhalte:
 *  [1] syntaktisch clean (keine kaputten Template-Strings)
 *  [2] robuste Auto-Registration (egal Lade-Reihenfolge):
 *      - Primär: window.InspectorContent.register('paths', renderFn)
 *      - Fallback: window.registerInspectorTab('paths', renderFn)
 *      - Notfall: Render in <section data-panel="paths"> falls vorhanden
 *  [3] Live-Statusanzeige:
 *      - zeigt Epoche, Terrain, Wear, Stage, Stamps, WearTiles
 *      - synchronisiert Slider/Buttons aus cb:path:state
 *
 * Hinweis:
 *   Die Bridge-Datei inspector/inspector.bridges.js hört auf die Events und
 *   ruft PathOverlay.* – zusätzlich ruft dieser Tab die API direkt, falls
 *   die Bridge mal nicht greift (Debug-Härtung).
 * ========================================================================== */

(function(){
  'use strict';

  // --------------------------------------------------------------------------
  // Run-Once Guard
  // --------------------------------------------------------------------------
  if (window.__INSP_TAB_PATHS_V261010__) return;
  window.__INSP_TAB_PATHS_V261010__ = true;

  const TAB_ID = 'paths';
  const TAB_LABEL = 'Pfade';
  const TAB_ICON = '🟤';

  // --------------------------------------------------------------------------
  // Helper
  // --------------------------------------------------------------------------
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  /**
   * Zentrales Senden + Direct-Call (härtet gegen fehlende Bridges ab)
   */
  function send(type, detail){
    try{ window.dispatchEvent(new CustomEvent(type, { detail })); }catch(_){/*noop*/}

    const PO = window.PathOverlay;
    if (!PO) return;
    try{
      if (type === 'cb:path:overlay:on')   PO.setEnabled?.(true);
      if (type === 'cb:path:overlay:off')  PO.setEnabled?.(false);
      if (type === 'cb:path:debug:on')     PO.setDebug?.(true);
      if (type === 'cb:path:debug:off')    PO.setDebug?.(false);

      if (type === 'cb:path:preset')       PO.setPreset?.(detail?.preset);
      if (type === 'cb:path:width')        PO.setWidthMult?.(detail?.widthMult);
      if (type === 'cb:path:softness')     PO.setSoftnessMult?.(detail?.softnessMult);

      if (type === 'cb:path:decay:speed')  PO.setDecaySpeed?.(detail?.mult);
      if (type === 'cb:path:decay:freeze') PO.setDecayPaused?.(!!detail?.paused);

      // Optional: Epoche im Inspector testen/setzen
      if (type === 'cb:path:epoch:set')    PO.setEpoch?.(detail?.epoch);
      if (type === 'cb:path:epochlock:set')PO.setEpochLockEnabled?.(!!detail?.enabled);
    }catch(e){
      // NICHT spammen
      window.__INSP_PATHS_DIRECT_ERR__ = window.__INSP_PATHS_DIRECT_ERR__ || {};
      const k = String(e && (e.message||e) || 'err');
      if (!window.__INSP_PATHS_DIRECT_ERR__[k]){
        window.__INSP_PATHS_DIRECT_ERR__[k] = 1;
        console.warn('[insp/paths] direct PathOverlay call failed:', e);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  function render(sectionEl){
    if (!sectionEl) return;

    sectionEl.innerHTML = `
      <div class="insp-pad">
        <h3>${TAB_ICON} ${TAB_LABEL}</h3>

        <div class="row">
          <button type="button" data-a="ovl-on">Overlay an</button>
          <button type="button" data-a="ovl-off">Overlay aus</button>
          <button type="button" data-a="dbg-on">Debug an</button>
          <button type="button" data-a="dbg-off">Debug aus</button>
        </div>

        <div class="row" style="margin-top:10px;">
          <label>Preset</label>
          <button type="button" data-a="preset-classic">CLASSIC</button>
          <button type="button" data-a="preset-modern">MODERN</button>
          <span style="opacity:.75">(MODERN = Siedler-3-Style)</span>
        </div>

        <div class="row" style="margin-top:10px;">
          <label>Breite</label>
          <input type="range" data-a="width" min="10" max="150" step="5" value="100">
          <span data-a="width-l" style="min-width:62px;text-align:right;opacity:.8">100%</span>
        </div>

        <div class="row" style="margin-top:10px;">
          <label>Softness</label>
          <input type="range" data-a="soft" min="50" max="200" step="5" value="100">
          <span data-a="soft-l" style="min-width:62px;text-align:right;opacity:.8">100%</span>
        </div>

        <div class="row" style="margin-top:10px;">
          <label>Decay</label>
          <input type="range" data-a="decay" min="0" max="300" step="5" value="100">
          <span data-a="decay-l" style="min-width:62px;text-align:right;opacity:.8">100%</span>
          <button type="button" data-a="freeze">Freeze</button>
        </div>

        <div class="row" style="margin-top:10px;opacity:.85;">
          <label>Status</label>
          <span data-a="live">–</span>
        </div>

        <pre data-a="state" style="opacity:.75;margin-top:8px;white-space:pre-wrap"></pre>
      </div>
    `;

    const q = (a)=> sectionEl.querySelector(`[data-a="${a}"]`);

    // Buttons
    q('ovl-on')?.addEventListener('click', ()=> send('cb:path:overlay:on'));
    q('ovl-off')?.addEventListener('click', ()=> send('cb:path:overlay:off'));
    q('dbg-on')?.addEventListener('click', ()=> send('cb:path:debug:on'));
    q('dbg-off')?.addEventListener('click', ()=> send('cb:path:debug:off'));

    q('preset-classic')?.addEventListener('click', ()=> send('cb:path:preset', { preset:'CLASSIC' }));
    q('preset-modern')?.addEventListener('click', ()=> send('cb:path:preset', { preset:'MODERN' }));

    // Sliders
    const sw = q('width');
    const swL = q('width-l');
    sw?.addEventListener('input', ()=>{
      const pct = Number(sw.value)||100;
      const mult = pct/100;
      if (swL) swL.textContent = `${pct}%`;
      send('cb:path:width', { percent:pct, widthMult:mult });
    });

    const ss = q('soft');
    const ssL = q('soft-l');
    ss?.addEventListener('input', ()=>{
      const pct = Number(ss.value)||100;
      const mult = pct/100;
      if (ssL) ssL.textContent = `${pct}%`;
      send('cb:path:softness', { percent:pct, softnessMult:mult });
    });

    const sd = q('decay');
    const sdL = q('decay-l');
    let frozen = false;
    sd?.addEventListener('input', ()=>{
      const pct = Number(sd.value)||100;
      const mult = pct/100;
      if (sdL) sdL.textContent = `${pct}%`;
      send('cb:path:decay:speed', { percent:pct, mult });
    });
    q('freeze')?.addEventListener('click', ()=>{
      frozen = !frozen;
      q('freeze').textContent = frozen ? 'Unfreeze' : 'Freeze';
      send('cb:path:decay:freeze', { paused: frozen });
    });

    // Live State
    const stateBox = q('state');
    const liveBox  = q('live');

    function setBtnActive(btn, on){
      if (!btn) return;
      btn.dataset.on = on ? '1' : '0';
    }

    function updateFromState(st){
      if (!st) return;
      if (stateBox) stateBox.textContent = JSON.stringify(st, null, 2);

      // Live-Zeile
      if (liveBox){
        const ep = st.epoch ?? '?';
        const terr = st.lastTerrain ?? '-';
        const wear = (st.lastWear ?? 0);
        const stage = st.lastStage ?? 0;
        const stamps = st.stamps ?? 0;
        const wearTiles = st.wearTiles ?? 0;
        liveBox.textContent = `Epoche ${ep} (max ${st.maxStageEffective ?? st.epochMaxStage ?? '?'}) | Terrain: ${terr} | Wear: ${wear.toFixed ? wear.toFixed(2) : wear} | Stage: ${stage} | Stamps: ${stamps} | WearTiles: ${wearTiles}`;
      }

      // Slider sync (clamped)
      if (sw){
        const pct = clamp(Math.round(Number(st.widthMult ?? 1) * 100), 10, 150);
        sw.value = String(pct);
        if (swL) swL.textContent = `${pct}%`;
      }
      if (ss){
        const pct = clamp(Math.round(Number(st.softnessMult ?? 1) * 100), 50, 200);
        ss.value = String(pct);
        if (ssL) ssL.textContent = `${pct}%`;
      }
      if (sd){
        const pct = clamp(Math.round(Number(st.decaySpeedMult ?? 1) * 100), 0, 300);
        sd.value = String(pct);
        if (sdL) sdL.textContent = `${pct}%`;
      }

      // Buttons active markieren
      setBtnActive(q('ovl-on'),  !!st.enabled);
      setBtnActive(q('ovl-off'), !st.enabled);
      setBtnActive(q('dbg-on'),  !!st.debug);
      setBtnActive(q('dbg-off'), !st.debug);
    }

    // Initial pull
    try{ updateFromState(window.PathOverlay?.getState?.()); }catch(_){/*noop*/}

    // Live Push
    if (!window.__INSP_PATHS_STATE_LISTENER__){
      window.__INSP_PATHS_STATE_LISTENER__ = true;
      window.addEventListener('cb:path:state', (e)=>{
        // Wir broadcasten, aber nur aktualisieren, wenn ein Tab existiert
        const st = e?.detail;
        // Alle offenen Pfade-Sections updaten
        document.querySelectorAll('section[data-panel="paths"], section[data-panel="paths"] .insp-pad, [data-panel="paths"]')
          .forEach(()=>{/* noop; Aktualisierung erfolgt per jeweiligem Tab-Closure */});
      });
    }

    // Lokaler Listener für diesen Tab
    window.addEventListener('cb:path:state', (e)=> updateFromState(e?.detail));
  }

  // --------------------------------------------------------------------------
  // Registration (robust)
  // --------------------------------------------------------------------------
  function tryRegister(){
    if (window.__INSP_PATHS_REGISTERED__) return true;

    // 1) Neu: InspectorContent
    if (window.InspectorContent && typeof window.InspectorContent.register === 'function'){
      window.InspectorContent.register(TAB_ID, render);
      window.__INSP_PATHS_REGISTERED__ = true;
      return true;
    }

    // 2) Legacy: registerInspectorTab
    if (typeof window.registerInspectorTab === 'function'){
      window.registerInspectorTab(TAB_ID, render, { label: TAB_LABEL, icon: TAB_ICON });
      window.__INSP_PATHS_REGISTERED__ = true;
      return true;
    }

    // 3) Notfall: vorhandenes Panel direkt rendern
    const sec = document.querySelector(`section[data-panel="${TAB_ID}"]`) || document.querySelector(`[data-panel="${TAB_ID}"]`);
    if (sec){
      render(sec);
      window.__INSP_PATHS_REGISTERED__ = true;
      return true;
    }

    return false;
  }

  // Sofort probieren + bei relevanten Events erneut
  tryRegister();
  document.addEventListener('DOMContentLoaded', tryRegister, { once:true });
  window.addEventListener('cb:insp:core:ready', tryRegister);
  window.addEventListener('req:insp:content:mount', tryRegister);

})();
