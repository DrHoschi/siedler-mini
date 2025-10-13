/* ============================================================================
 * Datei    : ui/ui-hud.js
 * Projekt  : Neue Siedler
 * Version  : v2.1.0 (ICO-Integration)
 * Zweck    : Ressourcen-HUD (Portrait=oben, Landscape=links)
 *            – Quadratische Zellen (Kante = --cell-size aus CSS)
 *            – Panel.svg via Border-Image (9-Slice)
 *            – DB-/Event-Anbindung + Fallback
 *            – Neu: Icon-Quelle bevorzugt aus core/icons-map.js (ICO, 16–512px)
 *
 * Öffentliche API:
 *   HUD.init({
 *     resources?: Array<Resource>,       // optional Startdaten
 *     frameSrc?: string,                 // optional: Pfad zum Panel.svg
 *     tuner?: boolean,                   // optional: Inspector einschalten
 *     restSnapshotUrl?: string,          // optional: REST-Snapshot (GET)
 *     bus?: EventTarget,                 // optional: eigener Event-Bus (default: window)
 *     resourceOrder?: string[]           // optional: Reihenfolge erzwingen
 *   })
 *   HUD.setAmounts({ wood: 135, ... })
 *
 * Events (listen):
 *   - cb:registry:ready
 *   - cb:ui-ready
 *   - cb:res:change   { id, delta?, amount? }
 *   - cb:res:reset    { scope:'all'|'one', id? }
 *   - cb:res:snapshot { amounts:{ <id>: number }, order?: string[] }
 *
 * Events (emit):
 *   - cb:hud-ready                { ok:true }
 *   - req:res:snapshot            {}
 *   - req:res:focus               { resId, active }
 *   - cb:hud:res:focus            { resId, active }
 *
 * DOM-Annahmen:
 *   - <div id="hud-bar" class="hud--portrait"><div id="hud-strip"></div></div>
 *   - CSS ≥ v1.6.0 (Icon-Zentrierung, Rotation, Kante usw.)
 * ========================================================================== */
(function(){
  'use strict';

  // ----------------------------------------------------------------------------
  // [00] DOM/Logging/Utils
  // ----------------------------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const on = (el, ev, fn, opt)    => el && el.addEventListener(ev, fn, opt);

  const $bar   = $('#hud-bar');
  const $strip = $('#hud-strip');
  if (!$bar || !$strip) {
    (console.error)('[HUD] #hud-bar / #hud-strip fehlt – bitte Test-HTML verwenden.');
    return;
  }

  const log = {
    ok  : (...a)=>(window.CBLog?.ok   || console.log )('[hud]', ...a),
    inf : (...a)=>(window.CBLog?.info || console.info)('[hud]', ...a),
    wrn : (...a)=>(window.CBLog?.warn || console.warn)('[hud]', ...a),
    err : (...a)=>(window.CBLog?.err  || console.error)('[hud]', ...a),
  };

  // ----------------------------------------------------------------------------
  // [01] Modul-Status
  // ----------------------------------------------------------------------------
  const state = {
    resources: [],             // Array<Resource>
    byId     : Object.create(null),
    frameSrc : null,
    order    : null,           // optionale Reihenfolge (Array<string>)
    bus      : window,         // EventTarget (default: window)
    restUrl  : null,           // optional REST-Snapshot URL
    tuner    : false,
  };

  // Resource-Shape (zur Orientierung):
  // { id:"wood", name:"Holz", amount:135, icon:"assets/icons/resources/wood_full.ico", variant?: "default"|"transport"|"ui" }

  // ----------------------------------------------------------------------------
  // [01a] Icon-Resolver – nutzt core/icons-map.js, fällt aber robust zurück
  // ----------------------------------------------------------------------------
  // Es gibt folgende Quellen (Priorität absteigend):
  // 1) explizit übergebenes res.icon (beliebiges Format, z. B. .ico/.png/.svg)
  // 2) resolveIcon() aus core/icons-map.js (wenn vorhanden)
  // 3) ICONS[res.id].default aus core/icons-map.js (wenn vorhanden)
  // 4) Standardpfad "assets/icons/resources/<id>_full.ico"
  function pickIcon(res){
    if (!res) return null;

    // 1) Explizit gesetzter Pfad?
    if (res.icon && typeof res.icon === 'string') return res.icon;

    // Variante aus Resource (optional), sonst "default"
    const variant = res.variant || 'default';

    // 2) Resolver-Funktion vorhanden?
    try {
      if (typeof window.resolveIcon === 'function') {
        const p = window.resolveIcon(res.id, variant);
        if (p) return p;
      }
    } catch(e){ /* ignoriere */ }

    // 3) Direkter Zugriff auf ICONS-Map (falls global eingebunden)
    try {
      if (window.ICONS && window.ICONS[res.id]) {
        const entry = window.ICONS[res.id];
        const p = entry?.[variant] || entry?.default;
        if (p) return p;
      }
    } catch(e){ /* ignoriere */ }

    // 4) Fallback-Heuristik (ICO-Standardpfad in /resources/)
    return `assets/icons/resources/${res.id}_full.ico`;
  }

  // ----------------------------------------------------------------------------
  // [02] Orientierung / Docking
  // ----------------------------------------------------------------------------
  function setDocking() {
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    $bar.classList.remove('hud--portrait', 'hud--land-left');
    $bar.classList.add(isPortrait ? 'hud--portrait' : 'hud--land-left');
  }

  // ----------------------------------------------------------------------------
  // [03] Render-Logik
  // ----------------------------------------------------------------------------
  function render(resources) {
    let list = Array.isArray(resources) ? resources.slice(0) : [];
    if (Array.isArray(state.order) && state.order.length) {
      const pos = Object.create(null);
      state.order.forEach((id, i) => pos[id] = i);
      list.sort((a,b) => (pos[a.id] ?? 9999) - (pos[b.id] ?? 9999));
    }

    $strip.innerHTML = '';
    state.byId = Object.create(null);

    for (const res of list) {
      if (!res || !res.id) continue;
      const cell  = document.createElement('div');
      cell.className = 'hud-cell';
      cell.classList.add(`hud-cell--${res.id}`);

      const inner = document.createElement('div');
      inner.className = 'hud-cell__content';

      const iconSrc = pickIcon(res);

      inner.innerHTML = `
        <div class="hud-name">${escapeHtml(res.name ?? res.id)}</div>
        <img class="hud-icon" src="${escapeAttr(iconSrc)}" alt="${escapeAttr(res.name ?? res.id)}">
        <div class="hud-amt" id="amt-${res.id}">${formatAmt(res.amount)}</div>
      `;

      cell.appendChild(inner);
      $strip.appendChild(cell);
      state.byId[res.id] = { ...res, icon: iconSrc }; // effektiver Pfad merken
    }
  }

  function formatAmt(v) {
    if (typeof v !== 'number') return v ?? '0';
    if (v >= 1_000_000) return (v/1_000_000).toFixed(1).replace('.', ',') + ' M';
    if (v >= 10_000)    return Math.round(v/1000) + ' K';
    return String(v);
  }

  function escapeHtml(s='') {
    return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
  function escapeAttr(s='') { return escapeHtml(String(s)); }

  // ----------------------------------------------------------------------------
  // [04] Öffentliche API
  // ----------------------------------------------------------------------------
  const HUD = {
    init(cfg = {}) {
      state.resources = Array.isArray(cfg.resources) ? cfg.resources.slice(0) : demoResources();
      state.frameSrc  = cfg.frameSrc || null;
      state.bus       = cfg.bus || window;
      state.tuner     = !!cfg.tuner;
      state.restUrl   = cfg.restSnapshotUrl || null;
      state.order     = Array.isArray(cfg.resourceOrder) ? cfg.resourceOrder.slice(0) : null;

      if (state.frameSrc) {
        document.documentElement.style.setProperty('--hud-frame-src', `url("${state.frameSrc}")`);
      }

      render(state.resources);
      setDocking();

      on(window, 'resize', setDocking);
      if (screen.orientation?.addEventListener) on(screen.orientation, 'change', setDocking);
      on(window, 'orientationchange', setDocking);

      wireBus(state.bus);
      requestSnapshot();

      if (state.restUrl) {
        fetchSnapshotREST().catch(e => log.wrn('REST snapshot failed', e));
      }

      if (state.tuner) mountTuner();

      emit('cb:hud-ready', { ok: true });
      log.ok('ready – resources:', state.resources.length);
    },

    setAmounts(map) {
      if (!map) return;
      for (const [id, val] of Object.entries(map)) {
        const el = document.getElementById(`amt-${id}`);
        if (el) el.textContent = formatAmt(val);
        if (state.byId[id]) state.byId[id].amount = val;
      }
    }
  };
  window.HUD = HUD;

  // ----------------------------------------------------------------------------
  // [05] Event-Bus Anbindung
  // ----------------------------------------------------------------------------
  function wireBus(bus) {
    if (!bus || !bus.addEventListener) {
      log.wrn('Kein valider Event-Bus – verwende Fallback.');
      return;
    }

    on(bus, 'cb:registry:ready', (ev) => {
      log.inf('registry ready', ev?.detail);
      const d = ev?.detail;
      if (Array.isArray(d?.resources) && d.resources.length) {
        state.resources = normalizeResources(d.resources, state.resources);
        if (d.resources.some(r => 'order' in r)) {
          state.order = d.resources
            .slice(0)
            .sort((a,b) => (a.order ?? 9999) - (b.order ?? 9999))
            .map(r => r.id);
        }
        render(state.resources);
      }
      requestSnapshot();
    });

    on(bus, 'cb:ui-ready', () => {
      log.inf('ui ready');
      requestSnapshot();
    });

    on(bus, 'cb:res:change', (ev) => {
      const d = ev?.detail || ev;
      const id = d?.id;
      if (!id) return;
      const amount = (typeof d.amount === 'number')
        ? d.amount
        : (state.byId[id]?.amount ?? 0) + (Number(d.delta) || 0);
      if (state.byId[id]) state.byId[id].amount = amount;
      const el = document.getElementById(`amt-${id}`);
      if (el) el.textContent = formatAmt(amount);
    });

    on(bus, 'cb:res:reset', (ev) => {
      const d = ev?.detail || ev;
      if (d?.scope === 'all') {
        for (const res of Object.values(state.byId)) res.amount = 0;
        for (const id in state.byId) {
          const el = document.getElementById(`amt-${id}`);
          if (el) el.textContent = '0';
        }
      } else if (d?.scope === 'one' && d.id) {
        if (state.byId[d.id]) state.byId[d.id].amount = 0;
        const el = document.getElementById(`amt-${d.id}`);
        if (el) el.textContent = '0';
      }
    });

    on(bus, 'cb:res:snapshot', (ev) => {
      const d = ev?.detail || ev;
      const amounts = d?.amounts || {};
      const order   = d?.order;
      if (Array.isArray(order) && order.length) state.order = order.slice(0);

      for (const [id, val] of Object.entries(amounts)) {
        if (state.byId[id]) state.byId[id].amount = Number(val) || 0;
      }

      const known = new Set(Object.keys(state.byId));
      const incoming = Object.keys(amounts);
      const hasUnknown = incoming.some(id => !known.has(id));
      if (hasUnknown) {
        if (Array.isArray(d?.resources)) {
          state.resources = normalizeResources(d.resources, state.resources);
        }
        render(state.resources);
      } else {
        for (const [id, val] of Object.entries(amounts)) {
          const el = document.getElementById(`amt-${id}`);
          if (el) el.textContent = formatAmt(Number(val)||0);
        }
      }
    });
  }

  function requestSnapshot() {
    emit('req:res:snapshot', {});
  }

  async function fetchSnapshotREST() {
    if (!state.restUrl) return null;
    const res = await fetch(state.restUrl, { credentials: 'include' }).catch(e => { throw e; });
    if (!res.ok) throw new Error('HTTP '+res.status);
    const json = await res.json();
    if (Array.isArray(json.resources)) {
      state.resources = normalizeResources(json.resources, state.resources);
      render(state.resources);
    }
    if (Array.isArray(json.order)) state.order = json.order.slice(0);
    if (json.amounts) HUD.setAmounts(json.amounts);
    log.ok('REST snapshot applied');
    return json;
  }

  function normalizeResources(incoming, fallbackList) {
    const byId = Object.create(null);
    for (const r of (fallbackList || [])) if (r?.id) byId[r.id] = { ...r };
    for (const r of incoming) if (r?.id) {
      const merged = { ...(byId[r.id]||{}), ...r };
      // ICO-Autofill: wenn kein icon angegeben → aus Map/Fallback bestimmen
      merged.icon = pickIcon(merged);
      byId[r.id] = merged;
    }
    return Object.values(byId);
  }

  function emit(name, detail) {
    try {
      const evt = new CustomEvent(name, { detail, bubbles:false, cancelable:false });
      (state.bus || window).dispatchEvent(evt);
      return true;
    } catch (e) {
      log.wrn('emit failed', name, e);
      return false;
    }
  }

  // ----------------------------------------------------------------------------
  // [06] Inspector-Tuner (Taste "H")
  // ----------------------------------------------------------------------------
  function mountTuner() {
    if (document.getElementById('hud-tuner')) return;

    const box = document.createElement('div');
    box.id = 'hud-tuner';
    box.innerHTML = `
      <label>Zellkante
        <input id="t-cs" type="range" min="56" max="140" value="${readVar('--cell-size', 72)}">
      </label>
      <label>Icon-Scale
        <input id="t-isc" type="range" min="50" max="90" value="${Math.round(readVar('--icon-scale', 0.72)*100)}">
      </label>
      <label>Rotation L
        <select id="t-rot">
          <option value="-90deg">-90°</option>
          <option value="90deg">+90°</option>
        </select>
      </label>
      <span>Toggle <kbd>H</kbd></span>
    `;
    document.body.appendChild(box);

    const setVar = (n,v)=> document.documentElement.style.setProperty(n, v);
    on($('#t-cs'),  'input', e=> setVar('--cell-size',   e.target.value+'px'));
    on($('#t-isc'), 'input', e=> setVar('--icon-scale', (e.target.value/100).toString()));
    on($('#t-rot'), 'change',e=> setVar('--land-rotation', e.target.value));

    on(window, 'keydown', (ev)=>{
      if (ev.key.toLowerCase() === 'h') {
        box.style.display = (box.style.display === 'none' || !box.style.display) ? 'grid' : 'none';
      }
    });
  }
  function readVar(name, fallback) {
    const cs = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!cs) return fallback;
    if (cs.endsWith('px')) return parseInt(cs,10)||fallback;
    const n = Number(cs);
    return Number.isFinite(n) ? n : fallback;
  }

  // ----------------------------------------------------------------------------
  // [07] Demo-Daten (nur Fallback; nutzt bereits ICO-Pfade)
  // ----------------------------------------------------------------------------
  function demoResources() {
    return [
      { id:'wood',  name:'Holz',   amount:120 },
      { id:'stone', name:'Stein',  amount:85  },
      { id:'fish',  name:'Fisch',  amount:42  },
      { id:'food',  name:'Nahrung',amount:63  },
      { id:'gold',  name:'Gold',   amount:7   },
      { id:'population', name:'Bev.', amount:24 }
    ].map(r => ({ ...r, icon: pickIcon(r) }));
  }

  // ----------------------------------------------------------------------------
  // [08] Auto-Init (für Test-Host)
  // ----------------------------------------------------------------------------
  window.addEventListener('DOMContentLoaded', ()=>{
    HUD.init({
      // frameSrc: 'assets/ui/panel.svg',
      // restSnapshotUrl: '/api/resources/snapshot',
      bus: window,
      tuner: true
    });
    setTimeout(()=> HUD.setAmounts({ wood: 135, stone: 93 }), 1500);
  });

})();
