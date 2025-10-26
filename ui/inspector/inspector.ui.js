/* ============================================================================
 * Datei   : ui/inspector/inspector.ui.js
 * Projekt : Neue Siedler – Inspector (UI-Tab)
 * Version : v25.10.29-final
 *
 * Zweck
 *  - Übersicht „UI/Layers“ mit einfachen Toggles (anzeigen/ausblenden)
 *  - Live-Infos: Element unter Cursor (per Test-Tool kompatibel),
 *                Größe/Box-Modell ausgewählter Elemente
 *  - Greift NUR auf DOM zu; keine Engine-Abhängigkeiten nötig.
 *
 * Abhängigkeiten (optional/robust):
 *  - inspector.core.js (Tab-API; kompatible mount-Bridge enthalten)
 *
 * Ereignisse (lauscht):
 *  - cb:insp:tab:change  → pausiert/reaktiviert UI-spezifische Listener
 * ========================================================================== */
(function(){
  'use strict';

  const MOD='[inspector.ui]';
  const LOG=(window.CBLog?.info  || console.info ).bind(console, MOD);
  const OK =(window.CBLog?.ok    || console.log  ).bind(console, MOD);
  const WRN=(window.CBLog?.warn  || console.warn ).bind(console, MOD);
  const ERR=(window.CBLog?.error || console.error).bind(console, MOD);

  // Doppel-Ladewächter
  if (window.__INSPECTOR_UI_MOUNTED__) { LOG('duplicate load – skipped'); return; }
  window.__INSPECTOR_UI_MOUNTED__ = true;

  /* ----------------------------- Core-Bridge ----------------------------- */
  // Nutzt __INSPECTOR_CORE__.api falls vorhanden; sonst Legacy.
  const core = (function(){
    if (window.__INSPECTOR_CORE__?.api) return window.__INSPECTOR_CORE__.api;
    const ins = window.Inspector || window.UIInspector || {};
    return {
      mount(id, onShow){
        const reg = ins.registerTab || ins.addTab;
        return reg ? reg({ id, title:id, onShow }) : null;
      },
      getSlot(name){
        return document.querySelector(`#inspector [data-slot="${name}"]`)
            || document.querySelector(`[data-inspector-slot="${name}"]`)
            || document.getElementById(`ins-${name}`)
            || document.getElementById(name);
      }
    };
  })();

  /* ------------------------------- State --------------------------------- */
  const state = {
    mounted: false,
    hoverOn: false,
    hoverBox: null,
    mouseMoveHandler: null,
    targets: [
      // <- Falls deine IDs/Klassen anders heißen, hier einfach anpassen.
      { id: 'hud-root',       label: 'HUD',         sel: '#hud-root' },
      { id: 'build-dock',     label: 'Build-Dock',  sel: '#build-dock' },
      { id: 'ui-root',        label: 'UI-Root',     sel: '#ui-root' },
      { id: 'game-canvas',    label: 'Game Canvas', sel: '#game, canvas#game' },
      { id: 'inspector-root', label: 'Inspector',   sel: '#inspector' }
    ]
  };

  /* ------------------------------- Helpers ------------------------------- */
  const $  = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  function el(tag, cls, html){ const n=document.createElement(tag); if(cls) n.className=cls; if(html!=null) n.innerHTML=html; return n; }
  const safe = v => (v==null ? '—' : String(v));

  function findNode(sel){
    if (!sel) return null;
    const parts = sel.split(',').map(s=>s.trim());
    for (const p of parts){
      const n = document.querySelector(p);
      if (n) return n;
    }
    return null;
  }

  function buildRow(cfg){
    const row = el('div','ui-row');
    row.append(
      el('div','ui-col', `<code>${cfg.label}</code><br><small>${cfg.sel.replaceAll('<','&lt;')}</small>`),
    );

    const toggleBox = el('div','ui-col');
    const chk = el('input'); chk.type='checkbox'; chk.checked=true; chk.style.verticalAlign='middle';
    chk.addEventListener('change', ()=>{
      const node = findNode(cfg.sel);
      if (!node) return;
      node.__insp_hidden = !chk.checked;
      // statt display:none → visibility+pointer-events, damit Layout minimal bleibt
      if (node.__insp_hidden){ node.style.visibility='hidden'; node.style.pointerEvents='none'; }
      else                  { node.style.visibility='';       node.style.pointerEvents=''; }
    });
    toggleBox.append(chk);
    row.append(toggleBox);

    const probeBox = el('div','ui-col');
    const btn = el('button','insp-btn','Details');
    btn.addEventListener('click', ()=>{
      const node = findNode(cfg.sel);
      const box = $('#ui-details');
      if (!box){ return; }
      box.innerHTML = node ? nodeDetails(node) : '<div class="warn pad">Element nicht gefunden.</div>';
    });
    probeBox.append(btn);
    row.append(probeBox);

    return row;
  }

  function nodeDetails(n){
    try{
      const cs = getComputedStyle(n);
      const r  = n.getBoundingClientRect();
      return `
        <div class="pad">
          <div><small>Tag</small> <code>${n.tagName.toLowerCase()}${n.id?`#${n.id}`:''}${n.className?'.'+String(n.className).split(/\s+/).join('.') : ''}</code></div>
          <div class="hint" style="margin-top:4px">${n.innerText?.slice(0,80) || '&nbsp;'}</div>
          <div style="margin-top:8px">
            <table class="inspector-table">
              <thead><tr><th>Kategorie</th><th>Wert</th></tr></thead>
              <tbody>
                <tr><td class="pad">position</td><td class="pad"><code>${cs.position}</code></td></tr>
                <tr><td class="pad">z-index</td><td class="pad"><code>${cs.zIndex}</code></td></tr>
                <tr><td class="pad">opacity</td><td class="pad"><code>${cs.opacity}</code></td></tr>
                <tr><td class="pad">pointer-events</td><td class="pad"><code>${cs.pointerEvents}</code></td></tr>
                <tr><td class="pad">visibility</td><td class="pad"><code>${cs.visibility}</code></td></tr>
                <tr><td class="pad">box</td><td class="pad"><code>${Math.round(r.width)}×${Math.round(r.height)} @ ${Math.round(r.left)},${Math.round(r.top)}</code></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }catch(e){ return `<div class="warn pad">Fehler beim Auslesen: ${safe(e?.message)}</div>`; }
  }

  /* ------------------------------ Hover-Box ------------------------------- */
  function ensureHoverBox(){
    if (state.hoverBox) return state.hoverBox;
    const b = el('div','insp-hover-box','');
    b.style.cssText = `
      position:fixed; left:0; top:0; width:0; height:0; z-index:2147483646;
      border:2px solid #60a5fa; border-radius:4px; pointer-events:none; display:none;`;
    document.body.appendChild(b);
    state.hoverBox = b;
    return b;
  }
  function trackHover(e){
    try{
      const t = e.target?.closest?.('#inspector, body *') || e.target; // Inspector selbst ausblenden
      if (!t || $('#inspector')?.contains(t)) { state.hoverBox.style.display='none'; return; }
      const r = t.getBoundingClientRect();
      const b = ensureHoverBox();
      b.style.display='block';
      b.style.left = `${r.left}px`; b.style.top = `${r.top}px`;
      b.style.width= `${r.width}px`; b.style.height=`${r.height}px`;
    }catch(_){/* noop */}
  }
  function enableHover(on){
    state.hoverOn = !!on;
    ensureHoverBox().style.display = on ? 'block' : 'none';
    if (on && !state.mouseMoveHandler){
      state.mouseMoveHandler = (e)=>trackHover(e);
      window.addEventListener('mousemove', state.mouseMoveHandler, {passive:true});
    }
    if (!on && state.mouseMoveHandler){
      window.removeEventListener('mousemove', state.mouseMoveHandler);
      state.mouseMoveHandler = null;
    }
  }

  /* ------------------------------ View-Bau ------------------------------- */
  function buildView(host){
    host.innerHTML = `
      <div class="insp-frame">
        <div class="insp-header">
          <h3>UI / Layers</h3>
          <button class="insp-close" title="Inspector schließen">×</button>
        </div>

        <div class="insp-content">
          <div class="pad">
            <div class="toolbar" style="gap:8px;flex-wrap:wrap">
              <label class="hint" style="display:flex;align-items:center;gap:6px">
                <input id="ui-hover" type="checkbox" />
                <span>Hover-Box (Live-Umriss)</span>
              </label>
              <button class="insp-btn" id="ui-refresh">Refresh</button>
            </div>

            <div class="hint" style="margin:6px 0 10px">
              Tipp: „Details“ zeigt live CSS/Box-Infos zum Ziel-Element. Die Toggle-Schalter
              verwenden <code>visibility</code> + <code>pointer-events</code>, damit nichts „verspringt“.
            </div>

            <div id="ui-rows"></div>

            <h4 style="margin-top:14px">Details</h4>
            <div id="ui-details"></div>
          </div>
        </div>
      </div>
    `;

    // Close
    $('.insp-close', host)?.addEventListener('click', ()=> window.Inspector?.close());

    // Hover-Box Umschalter
    $('#ui-hover', host)?.addEventListener('change', (e)=> enableHover(e.target.checked));

    // Refresh baut die Liste neu (falls DOM/IDs geändert)
    $('#ui-refresh', host)?.addEventListener('click', ()=> renderAll(host));

    renderAll(host);
  }

  function renderAll(host){
    try{
      const box = $('#ui-rows', host);
      box.innerHTML = '';
      state.targets.forEach(cfg => box.appendChild(buildRow(cfg)));
      OK('bereit v25.10.29-final');
    }catch(e){ ERR('renderAll', e?.message||e); }
  }

  /* ------------------------------ Mount/Events ---------------------------- */
  core.mount('ui', (host)=>{
    // ggf. generischen Slot des Cores nutzen
    if (!host?.closest || !host.closest('.insp-content')) {
      host = core.getSlot('generic') || host;
    }
    buildView(host);
  });

  // Tab-Wechsel → Hover-Box nur im aktiven UI-Tab
  window.addEventListener('cb:insp:tab:change', (e)=>{
    const active = e?.detail?.tab || '';
    enableHover(active === 'ui' && $('#ui-hover')?.checked);
  });
})();
