/* ============================================================================
 * Datei    : ui/ui-hud.js
 * Projekt  : Neue Siedler
 * Version  : v22.0.0 (2025-10-07)
 * Zweck    : Dynamisches Ressourcen-HUD (1-zeilig, bei kleinen Screens 2-zeilig)
 *
 * Events (listen):
 *   - cb:registry:ready           → Katalog aus Registry ziehen (Ressourcen)
 *   - cb:res:change {res, delta|amount}   → Menge aktualisieren (Game/Core)   [Lastenheft 3.3]
 *   - cb:res:reset  {scope,res?}          → Reset einzelner/aller Ressourcen   [Lastenheft 3.3]
 *   - cb:res:snapshot {amounts:{id:number}} → Voll-Snapshot (optional)
 *
 * Events (emit):
 *   - cb:hud-ready                 → HUD bereit
 *   - req:res:snapshot             → Snapshot anfordern (optional)
 *   - req:res:focus   {resId, active} → Nutzer fokussiert Ressource (Producer/Consumer markieren)
 *   - cb:hud:res:focus {resId, active} → UI-seitige Bestätigung
 *
 * Abhängigkeiten:
 *   - core/registry.js (optional, auto-Fallback)  [Registry Patch]
 *   - assets/icons/resources/<id>.png (Symbole)
 *
 * Hinweise:
 *   - Items sind QUADRATISCH (Panel-Background), Titel oben links, Icon mittig,
 *     Menge unten rechts. Responsive über CSS-Variablen (ui/css/ui-hud.css).
 * ========================================================================== */

(function(){
  'use strict';

  // -------------------------------------------------------------------------
  // [00] DOM / Logging / Utils
  // -------------------------------------------------------------------------
  const $root = document.getElementById('hud-top');
  if (!$root) { (console.error)('[hud] #hud-top fehlt'); return; }

  const logOK  = (...a)=> (window.CBLog?.ok   || console.log )('[hud]', ...a);
  const logInf = (...a)=> (window.CBLog?.info || console.info)('[hud]', ...a);
  const logWrn = (...a)=> (window.CBLog?.warn || console.warn)('[hud]', ...a);

  function emit(name, detail={}){ window.dispatchEvent(new CustomEvent(name, { detail })); }
  function nf(n){ try{ return new Intl.NumberFormat('de-DE').format(n|0); } catch(_){ return String(n|0); } }

  // -------------------------------------------------------------------------
  // [01] Katalog (Registry → Ressourcenliste) + Fallback
  // -------------------------------------------------------------------------
  const SHOW_ALL_RESOURCES = true;                // alle bekannten Ressourcen zeigen
  const currentEpoche = (window.Game?.epoche) || 1;

  const FALLBACK_RES = [
    // Epoche 1 (sichtbar)
    { id:'wood',        name:'Holz',        epoche:1 },
    { id:'stone',       name:'Stein',       epoche:1 },
    { id:'fish',        name:'Fisch',       epoche:1 },
    { id:'gold',        name:'Gold',        epoche:1 },
    { id:'population',  name:'Bevölkerung', epoche:1 },
    // Spätere, werden ggf. jetzt schon angezeigt (SHOW_ALL_RESOURCES)
    { id:'planks',      name:'Bretter',     epoche:2 },
    { id:'bricks',      name:'Ziegel',      epoche:2 },
    { id:'grain',       name:'Getreide',    epoche:2 },
    { id:'flour',       name:'Mehl',        epoche:2 },
    { id:'bread',       name:'Brot',        epoche:2 },
    { id:'iron',        name:'Eisen',       epoche:3 },
    { id:'ironbar',     name:'Eisenbarren', epoche:3 },
    { id:'tools',       name:'Werkzeuge',   epoche:3 },
    { id:'paper',       name:'Papier',      epoche:6 },
    { id:'knowledge',   name:'Wissen',      epoche:6 },
    { id:'taxes',       name:'Steuern',     epoche:7 },
    { id:'prestige',    name:'Prestige',    epoche:10 },
    { id:'diplomacy',   name:'Diplomatie',  epoche:10 },
  ];

  function iconFor(id){ return `assets/icons/resources/${id}.png`; }

  function getResourceCatalog(){
    if (typeof window.Registry?.list === 'function'){
      const reg = (Registry.list('resources') || []).map(r=>({
        id: r.id,
        name: r.name || r.id,
        icon: r.icon || iconFor(r.id),
        epoche: r.epoche || 1,
        order: r.order ?? 999
      }));
      if (!reg.length) return FALLBACK_RES.map(r=>({ ...r, icon: iconFor(r.id), order: 999 }));
      return reg.sort((a,b)=>(a.order||999)-(b.order||999));
    }
    return FALLBACK_RES.map(r=>({ ...r, icon: iconFor(r.id), order: 999 }));
  }

  // -------------------------------------------------------------------------
  // [02] View: Aufbau & Aktualisierung
  // -------------------------------------------------------------------------
  let $grid = null;
  const amounts = new Map();   // id -> number
  const cards   = new Map();   // id -> { el, $amt }

  function buildHUD(){
    const catalog = getResourceCatalog().filter(r => SHOW_ALL_RESOURCES || (r.epoche <= currentEpoche));
    $root.innerHTML = '';

    // Container
    $grid = document.createElement('div');
    $grid.className = 'hud-grid';
    $root.appendChild($grid);

    // Kacheln
    catalog.forEach(r=>{
      const el   = document.createElement('button');
      el.className = 'res-card';
      el.dataset.res = r.id;
      el.title = r.name;

// Titel (oben links)
const $title = document.createElement('span');
$title.className = 'res-title';
$title.textContent = r.name || r.id;
el.setAttribute('data-name', $title.textContent); // Fallback, falls CSS ::before genutzt
el.appendChild($title);

// Icon (mittig)
const $icon = document.createElement('img');
$icon.className = 'res-icon';
$icon.src = r.icon || `assets/icons/resources/${r.id}.png`;
$icon.alt = $title.textContent;
el.appendChild($icon);

// Menge (unten rechts)
const $amt = document.createElement('span');
$amt.className = 'res-amount';
$amt.id = `hud-${r.id}`;
$amt.textContent = (amounts.has(r.id) ? new Intl.NumberFormat('de-DE').format(amounts.get(r.id)) : '0');
el.appendChild($amt);
      el.appendChild($title);
      el.appendChild($icon);
      el.appendChild($amt);

      // Klick → Fokus togglen (Producer/Consumer später markieren)
      el.addEventListener('click', ()=>{
        const active = !el.classList.contains('is-focused');
        document.querySelectorAll('.res-card.is-focused').forEach(x=>x.classList.remove('is-focused'));
        if (active) el.classList.add('is-focused');
        emit('req:res:focus', { resId:r.id, active });
        emit('cb:hud:res:focus', { resId:r.id, active });
      });

      $grid.appendChild(el);
      cards.set(r.id, { el, $amt });
      if (!amounts.has(r.id)) amounts.set(r.id, 0);
    });

    // sichtbar machen
    $root.classList.remove('hidden');
    $root.hidden = false;

    logOK('HUD gebaut:', cards.size, 'Ressourcen');
  }

  function setAmount(id, value){
    const v = Math.max(0, value|0);
    amounts.set(id, v);
    const c = cards.get(id);
    if (c) c.$amt.textContent = nf(v);
  }
  function addAmount(id, delta){
    const v = Math.max(0, (amounts.get(id) || 0) + (delta|0));
    setAmount(id, v);
  }
  function resetAmounts(scope, resId){
    if (scope === 'all' || !resId){
      amounts.forEach((_, id)=> setAmount(id, 0));
    } else {
      setAmount(resId, 0);
    }
  }

  // -------------------------------------------------------------------------
  // [03] Event-Wiring
  // -------------------------------------------------------------------------
  window.addEventListener('cb:registry:ready', buildHUD); // Registry fertig → HUD bauen  [Registry Patch]
  window.addEventListener('cb:ui-ready',        ()=> { if (!cards.size) buildHUD(); });

  // Ressourcen-Änderungen vom Core (Game/Carrier/Produktion)  [Lastenheft 3.3]
  window.addEventListener('cb:res:change', (ev)=>{
    const d = ev?.detail||{};
    const id = d.res || d.id;
    if (!id) return;
    if (typeof d.amount === 'number') setAmount(id, d.amount);
    else if (typeof d.delta === 'number') addAmount(id, d.delta);
  });

  window.addEventListener('cb:res:reset', (ev)=>{
    const d = ev?.detail||{};
    resetAmounts(d.scope||'all', d.res);
  });

  // optionaler Voll-Snapshot
  window.addEventListener('cb:res:snapshot', (ev)=>{
    const a = ev?.detail?.amounts || {};
    Object.keys(a).forEach(id=> setAmount(id, a[id]|0));
  });

  // Initial: HUD melden & Snapshot anfordern
  (function init(){
    logInf('Modul geladen (v22.0.0)');
    emit('cb:hud-ready', { ok:true });
    emit('req:res:snapshot'); // Core kann cb:res:snapshot liefern
  })();
})();
