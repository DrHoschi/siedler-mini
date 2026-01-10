/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.paths-v1.js
 * Version : v26.01.10-clean
 * Zweck   : PFAD-TOOLS – Inspector-Tab für Trampelpfad-System (World-Layer)
 * ========================================================================== */

(function () {
  'use strict';

  const TAB_ID = 'paths';
  const TAB_LABEL = 'Pfade';
  const TAB_ICON = '🟤';

  function send(type, detail) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
    const PO = window.PathOverlay;
    if (!PO) return;
    try {
      if (type === 'cb:path:overlay:on')  PO.setEnabled?.(true);
      if (type === 'cb:path:overlay:off') PO.setEnabled?.(false);
      if (type === 'cb:path:debug:on')    PO.setDebug?.(true);
      if (type === 'cb:path:debug:off')   PO.setDebug?.(false);
      if (type === 'cb:path:preset')      PO.setPreset?.(detail?.preset);
      if (type === 'cb:path:width')       PO.setWidthMult?.(detail?.widthMult);
      if (type === 'cb:path:softness')    PO.setSoftnessMult?.(detail?.softnessMult);
      if (type === 'cb:path:decay:speed') PO.setDecaySpeed?.(detail?.mult);
      if (type === 'cb:path:decay:freeze')PO.setDecayPaused?.(!!detail?.paused);
    } catch (e) {
      console.warn('[paths-tab] direct call failed', e);
    }
  }

  function render(sectionEl) {
    sectionEl.innerHTML = `
      <div class="insp-pad">
        <h3>${TAB_ICON} Pfade</h3>

        <div class="row">
          <button data-a="on">Overlay an</button>
          <button data-a="off">Overlay aus</button>
          <button data-a="dbg-on">Debug an</button>
          <button data-a="dbg-off">Debug aus</button>
        </div>

        <div class="row">
          <label>Preset</label>
          <button data-a="classic">CLASSIC</button>
          <button data-a="modern">MODERN</button>
        </div>

        <div class="row">
          <label>Breite</label>
          <input type="range" data-a="width" min="10" max="150" step="5" value="100">
          <span data-a="width-l">100%</span>
        </div>

        <div class="row">
          <label>Softness</label>
          <input type="range" data-a="soft" min="50" max="200" step="5" value="100">
          <span data-a="soft-l">100%</span>
        </div>

        <div class="row">
          <label>Decay</label>
          <input type="range" data-a="decay" min="0" max="300" step="5" value="100">
          <span data-a="decay-l">100%</span>
          <button data-a="freeze">Freeze</button>
        </div>

        <pre data-a="state" style="opacity:.7"></pre>
      </div>
    `;

    const qs = a => sectionEl.querySelector(`[data-a="${a}"]`);

    qs('on').onclick      = () => send('cb:path:overlay:on');
    qs('off').onclick     = () => send('cb:path:overlay:off');
    qs('dbg-on').onclick  = () => send('cb:path:debug:on');
    qs('dbg-off').onclick = () => send('cb:path:debug:off');
    qs('classic').onclick = () => send('cb:path:preset', { preset: 'CLASSIC' });
    qs('modern').onclick  = () => send('cb:path:preset', { preset: 'MODERN' });

    const w = qs('width'), wl = qs('width-l');
    w.oninput = () => {
      const p = Number(w.value);
      wl.textContent = p + '%';
      send('cb:path:width', { widthMult: p / 100 });
    };

    const s = qs('soft'), sl = qs('soft-l');
    s.oninput = () => {
      const p = Number(s.value);
      sl.textContent = p + '%';
      send('cb:path:softness', { softnessMult: p / 100 });
    };

    const d = qs('decay'), dl = qs('decay-l');
    let frozen = false;
    d.oninput = () => {
      const p = Number(d.value);
      dl.textContent = p + '%';
      send('cb:path:decay:speed', { mult: p / 100 });
    };

    qs('freeze').onclick = () => {
      frozen = !frozen;
      send('cb:path:decay:freeze', { paused: frozen });
    };

    const pre = qs('state');
    const sync = () => {
      const st = window.PathOverlay?.getState?.();
      if (!st) return;
      pre.textContent = JSON.stringify(st, null, 2);
    };
    sync();
    window.addEventListener('cb:path:state', e => {
      pre.textContent = JSON.stringify(e.detail, null, 2);
    });
  }

  function register() {
    if (window.registerInspectorTab) {
      window.registerInspectorTab(TAB_ID, render, {
        label: TAB_LABEL,
        icon: TAB_ICON
      });
      return;
    }
    const panel = document.querySelector(`[data-panel="${TAB_ID}"]`);
    if (panel) render(panel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', register);
  } else {
    register();
  }
})();
