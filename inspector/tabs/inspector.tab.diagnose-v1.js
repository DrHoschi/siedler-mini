/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.diagnose-v1.js
 * Projekt : Neue Siedler
 * Version : v1.0.0 (2025-11-04)
 * Zweck   : Inspector-Tab "Diagnose" – Sichtbarkeit & Init-Fixes, Event-Trigger,
 *           Script-Duplikat-Check, Global-Flags, Layer-Übersicht.
 *
 * Struktur: Imports → Konstanten → Hilfsfunktionen → UI/Render → Events → Export
 * Hinweise:
 * - Nicht entfernen: Debug/Diagnose gehört fest zur Toolchain.
 * - Greift NUR über Events/DOM zu – keine harten Projekt-Abhängigkeiten.
 * - Robust: registriert sich über registerInspectorTab(...) ODER baut sich selbst ein.
 * ========================================================================== */

/* -------------------------------- Imports --------------------------------- */
// (keine externen Imports)

/* ----------------------------- Konstanten --------------------------------- */
const DIAG = {
  ID: 'insp-tab-diagnose',
  TITLE: 'Diagnose',
  STYLE_ID: 'insp-diagnose-inline-style',
  SELECTORS_DEFAULT: [
    '#game', '#ui-root', '#hud-root', '#build-dock'
  ],
  QUICK_EVENTS: [
    {label:'Assets ready', ev:'cb:assets-ready'},
    {label:'Registry ready', ev:'cb:registry:ready'},
    {label:'Game start', ev:'cb:game-start'},
    {label:'Game stop', ev:'cb:game:stop'},
    {label:'HUD snapshot', ev:'cb:res:snapshot'},
    {label:'Build snapshot', ev:'cb:build:snapshot'},
  ],
  OVERLAY_EVENTS: [
    {label:'PathOverlay ON', ev:'cb:path:overlay:on', detail:{active:true}},
    {label:'PathOverlay OFF', ev:'cb:path:overlay:off', detail:{active:false}},
    {label:'Heatmap ON', ev:'cb:path:heatmap:on', detail:{active:true}},
    {label:'Heatmap OFF', ev:'cb:path:heatmap:off', detail:{active:false}},
  ],
};

/* --------------------------- Hilfsfunktionen ------------------------------ */
/** Kurzlog (nicht invasiv) */
function dlog(...args){ (window.CBLog?.info||console.log)('[diag]',...args); }

/** sicheres dispatchen eines CustomEvents */
function fire(ev, detail) {
  try {
    window.dispatchEvent(new CustomEvent(ev, { detail }));
    dlog('event', ev, detail||'');
  } catch(e) {
    (window.CBLog?.warn||console.warn)('[diag] dispatch fail', ev, e);
  }
}

/** Element aus Selektor holen (null-sicher) */
function $(sel){ try { return document.querySelector(sel); } catch(_) { return null; } }

/** Sichtbarkeit toggeln (display) – merkt ursprünglichen Zustand per dataset */
function setVisible(el, on){
  if(!el) return;
  if(!el.dataset.origDisplay) el.dataset.origDisplay = (getComputedStyle(el).display || '');
  el.style.display = on ? (el.dataset.origDisplay || 'block') : 'none';
}

/** Canvas-Fix: Größe erzwingen / an Fenster anpassen */
function fixCanvasSize(w, h){
  const c = $('#game');
  if(!c) return false;
  if(w === 'fit' && h === 'fit'){
    c.width  = window.innerWidth;
    c.height = window.innerHeight;
  } else {
    if(Number.isFinite(w)) c.width  = w;
    if(Number.isFinite(h)) c.height = h;
  }
  c.style.display = 'block';
  dlog('canvas size', c.width+'x'+c.height);
  return true;
}

/** Scripts duplikate erkennen (gleiches src oder gleicher Inline-Inhalt-Hash) */
function findScriptDuplicates(){
  const scripts = Array.from(document.scripts||[]);
  const bySrc = new Map(), inlineMap = new Map(), dupes = [];

  // nach src gruppieren
  scripts.forEach(s=>{
    const key = (s.src||'').trim();
    if(key){
      const arr = bySrc.get(key)||[];
      arr.push(s); bySrc.set(key, arr);
    } else {
      // Inline-Block: einfachen Hash
      const txt = (s.textContent||'').trim();
      const hash = txt ? (txt.length + ':' + simpleHash(txt)) : 'empty';
      const arr = inlineMap.get(hash)||[];
      arr.push(s); inlineMap.set(hash, arr);
    }
  });

  bySrc.forEach((arr, key)=>{ if(arr.length>1) dupes.push({type:'src', key, count:arr.length}); });
  inlineMap.forEach((arr, key)=>{ if(arr.length>1) dupes.push({type:'inline', key, count:arr.length}); });
  return dupes;
}

/** sehr einfacher String-Hash (ausreichend für Inline-Erkennung) */
function simpleHash(s){
  let h = 0; for(let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i))|0; }
  return (h>>>0).toString(16);
}

/** Global-Flags einsammeln (soft-checks) */
function readGlobals(){
  return {
    inspector: !!window.inspector || !!$('#inspector'),
    inspectorContent: !!window.inspectorContent,
    registerInspectorTab: typeof window.registerInspectorTab === 'function',
    registry: !!window.registry,
    uiBuild: !!$('#build-dock'),
    pathOverlay: !!document.querySelector('[data-path-overlay], #path-overlay'),
    bridge_v120: !!window.InspectorBridge120 || !!window.Bridge_v120,
    console_hooked: !!window.__cb_console_hooked
  };
}

/** DOM-Layer aufnehmen: sichtbarkeit, z-index, bounds */
function scanLayers(selectors){
  const list = [];
  selectors.forEach(sel=>{
    const el = $(sel);
    if(!el){ list.push({sel, found:false}); return; }
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    list.push({
      sel, found:true,
      visible: cs.display!=='none' && cs.visibility!=='hidden' && r.width>0 && r.height>0,
      z: cs.zIndex || 'auto',
      opacity: cs.opacity || '1',
      bounds: {x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height)}
    });
  });
  return list;
}

/* ------------------------------ UI / Render ------------------------------- */
function ensureStyle(){
  if(document.getElementById(DIAG.STYLE_ID)) return;
  const css = `
#${DIAG.ID}{padding:8px;}
#${DIAG.ID} .diag-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;}
#${DIAG.ID} .card{background:#2c2f36;border:1px solid #3a3f47;border-radius:6px;padding:10px;}
#${DIAG.ID} .card h3{margin:0 0 6px 0;font-size:14px}
#${DIAG.ID} .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#${DIAG.ID} .row + .row{margin-top:6px}
#${DIAG.ID} .small{font-size:12px;opacity:.85}
#${DIAG.ID} table{width:100%;border-collapse:collapse;font-size:12px}
#${DIAG.ID} th, #${DIAG.ID} td{border-bottom:1px solid #3a3f47;padding:4px 6px;text-align:left}
#${DIAG.ID} code{background:#1f2126;padding:2px 4px;border-radius:3px}
#${DIAG.ID} button{cursor:pointer}
  `.trim();
  const st = document.createElement('style');
  st.id = DIAG.STYLE_ID; st.textContent = css; document.head.appendChild(st);
}

function render(root){
  ensureStyle();
  root.innerHTML = `
    <section id="${DIAG.ID}">
      <div class="diag-grid">
        <div class="card">
          <h3>Quick Actions</h3>
          <div class="row" id="diag-quick-ev"></div>
          <div class="row" style="margin-top:8px">
            <button id="diag-open-insp">Inspector öffnen</button>
            <button id="diag-close-insp">Inspector schließen</button>
            <button id="diag-toggle-insp">Inspector toggle</button>
          </div>
          <div class="row" style="margin-top:8px">
            ${DIAG.OVERLAY_EVENTS.map((e,i)=>`<button class="ov" data-idx="${i}">${e.label}</button>`).join('')}
          </div>
        </div>

        <div class="card">
          <h3>Canvas & Layer</h3>
          <div class="row">
            <label>Canvas Größe:</label>
            <input id="diag-w" type="number" min="1" placeholder="Breite"> ×
            <input id="diag-h" type="number" min="1" placeholder="Höhe">
            <button id="diag-apply">Anwenden</button>
            <button id="diag-fitwin">Fit Window</button>
          </div>
          <div class="row small">Layer Sichtbarkeit:</div>
          <div class="row" id="diag-layers"></div>
          <div class="row small" id="diag-layer-table"></div>
        </div>

        <div class="card">
          <h3>Globals & Status</h3>
          <pre class="small" id="diag-globals"></pre>
          <div class="row"><button id="diag-refresh">Refresh</button></div>
        </div>

        <div class="card">
          <h3>Script-Duplikate</h3>
          <div class="small" id="diag-dupes">–</div>
          <div class="row"><button id="diag-scan-dupes">Neu scannen</button></div>
        </div>
      </div>
    </section>
  `;

  // Quick event buttons
  const q = $('#diag-quick-ev');
  DIAG.QUICK_EVENTS.forEach(e=>{
    const b = document.createElement('button');
    b.textContent = e.label;
    b.addEventListener('click', ()=>fire(e.ev));
    q.appendChild(b);
  });

  // Inspector open/close/toggle
  $('#diag-open-insp') .addEventListener('click', ()=>fire('req:insp:open'));
  $('#diag-close-insp').addEventListener('click', ()=>fire('req:insp:close'));
  $('#diag-toggle-insp').addEventListener('click', ()=>fire('req:insp:toggle'));

  // Overlay buttons
  root.querySelectorAll('.ov').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const cfg = DIAG.OVERLAY_EVENTS[Number(btn.dataset.idx)||0];
      fire(cfg.ev, cfg.detail||undefined);
    });
  });

  // Canvas controls
  $('#diag-apply').addEventListener('click', ()=>{
    const w = parseInt(($('#diag-w')?.value||''), 10);
    const h = parseInt(($('#diag-h')?.value||''), 10);
    fixCanvasSize(Number.isFinite(w)?w:undefined, Number.isFinite(h)?h:undefined);
  });
  $('#diag-fitwin').addEventListener('click', ()=>fixCanvasSize('fit','fit'));

  // Layer toggles
  const layerBox = $('#diag-layers');
  DIAG.SELECTORS_DEFAULT.forEach(sel=>{
    const el = document.createElement('label');
    el.className = 'row';
    el.style.gap = '8px';
    el.innerHTML = `<input type="checkbox" data-sel="${sel}"><code>${sel}</code>`;
    const cb = el.querySelector('input');
    const found = $(sel);
    const vis = found ? (getComputedStyle(found).display!=='none') : false;
    cb.checked = !!found && vis;
    cb.disabled = !found;
    cb.title = found ? 'anzeigen/verstecken' : 'Element nicht gefunden';
    cb.addEventListener('change', ()=>{
      setVisible($(sel), cb.checked);
      renderLayerTable(); // live refresh
    });
    layerBox.appendChild(el);
  });

  function renderLayerTable(){
    const rows = scanLayers(DIAG.SELECTORS_DEFAULT)
      .map(r=>{
        if(!r.found) return `<tr><td><code>${r.sel}</code></td><td colspan="4">nicht gefunden</td></tr>`;
        const b = r.bounds;
        return `<tr>
          <td><code>${r.sel}</code></td>
          <td>${r.visible?'✅':'❌'}</td>
          <td>${r.z}</td>
          <td>${b.w}×${b.h}</td>
          <td>${b.x},${b.y}</td>
        </tr>`;
      }).join('');
    $('#diag-layer-table').innerHTML = `
      <table>
        <thead><tr><th>Layer</th><th>Vis</th><th>z</th><th>Größe</th><th>Pos</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }
  renderLayerTable();

  // Globals
  function renderGlobals(){ $('#diag-globals').textContent = JSON.stringify(readGlobals(), null, 2); }
  renderGlobals();
  $('#diag-refresh').addEventListener('click', ()=>{ renderGlobals(); renderLayerTable(); });

  // Duplikate
  function renderDupes(){
    const list = findScriptDuplicates();
    if(!list.length){ $('#diag-dupes').textContent = 'Keine Duplikate gefunden.'; return; }
    $('#diag-dupes').innerHTML = `
      <table>
        <thead><tr><th>Typ</th><th>Schlüssel</th><th>Anzahl</th></tr></thead>
        <tbody>
          ${list.map(d=>`<tr><td>${d.type}</td><td class="small"><code>${escapeHtml(d.key)}</code></td><td>${d.count}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }
  $('#diag-scan-dupes').addEventListener('click', renderDupes);
  renderDupes();

  // Auto-Fix Vorschläge (optional per Event)
  // 1) Canvas aktivieren wenn 0x0
  const c = $('#game');
  if(c){
    const r = c.getBoundingClientRect();
    if(r.width===0 || r.height===0){ fixCanvasSize('fit','fit'); }
  }
  // 2) Build/HUD Anzeigen wenn vorhanden aber "none"
  ['#build-dock','#hud-root','#ui-root'].forEach(sel=>{
    const el = $(sel);
    if(el && getComputedStyle(el).display==='none'){ setVisible(el, true); }
  });
}

/** kleine HTML-Escape */
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

/* ------------------------------ Events/Init ------------------------------- */
/** Tab-Registration, kompatibel mit 2 Wegen:
 *  A) window.registerInspectorTab(name, mountFn, opts)
 *  B) Selbstanbau: fügt Tab-Button & Section in #inspector ein
 */
(function install(){
  const tryRegister = ()=>{
    const mount = (sectionEl)=>render(sectionEl);
    if(typeof window.registerInspectorTab === 'function'){
      // Weg A: Offizielle API
      window.registerInspectorTab(DIAG.TITLE, mount, { id: DIAG.ID, order: 999 });
      dlog('Diagnose-Tab registriert (API)');
    } else {
      // Weg B: fallback – Tabs manuell erweitern
      const insp = document.querySelector('#inspector');
      if(!insp){ return false; }
      const tabs = insp.querySelector('.insp-tabs');
      const content = insp.querySelector('.insp-content');
      if(!tabs || !content){ return false; }

      // Button
      const btn = document.createElement('button');
      btn.textContent = DIAG.TITLE;
      btn.dataset.tab = DIAG.ID;
      tabs.appendChild(btn);

      // Section
      const sec = document.createElement('section');
      sec.id = DIAG.ID;
      sec.style.display = 'none';
      content.appendChild(sec);

      // Wechsel-Logik (einfacher Adapter)
      tabs.querySelectorAll('button').forEach(b=>{
        b.addEventListener('click', ()=>{
          const id = b.dataset.tab;
          content.querySelectorAll('section').forEach(s=>s.style.display = (s.id===id?'block':'none'));
          window.dispatchEvent(new CustomEvent('cb:insp:tab:change',{detail:{tab:b.textContent||id}}));
        });
      });

      // Direkt aktivieren beim ersten Öffnen
      window.addEventListener('cb:insp:open', ()=>{
        // Falls noch nicht gerendert
        if(!sec.dataset.mounted){ render(sec); sec.dataset.mounted = '1'; }
      });
      dlog('Diagnose-Tab registriert (Fallback)');
    }
    return true;
  };

  // Core ready → registrieren
  window.addEventListener('cb:insp:core:ready', tryRegister);
  window.addEventListener('cb:insp:content:ready', tryRegister);
  // falls Inspector bereits offen war
  setTimeout(tryRegister, 0);
})();

/* -------------------------------- Exports --------------------------------- */
// (keine – reines UI-Modul)
