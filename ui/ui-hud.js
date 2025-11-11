/* ============================================================================
 * Datei   : ui/ui-hud.js
 * Projekt : Neue Siedler
 * Version : v25.11.16-final-fix1
 * Zweck   : Ressourcen-HUD (Holzleiste) sicher anzeigen & live aktualisieren
 *
 * Warum diese Fix-Version?
 * - HUD verschwand nach Update → hierrobust gemacht:
 *   1) Rendert **sofort** nach DOMContentLoaded (nicht nur per Events)
 *   2) Rendert **idempotent** (mehrfacher Init unkritisch)
 *   3) Nutzt **klassische UND neue** Klassennamen parallel
 *      (kompatibel zu bestehenden CSS-Selektoren)
 *   4) Löst **req:res:snapshot** aus, damit Werte geladen werden
 *   5) Kein doppeltes Listener-Chaos
 *
 * Ereignisse (Standard)
 *  Lauscht : cb:registry:ready
 *           cb:game:start
 *           cb:res:change     { res, value? | delta? }
 *           cb:res:reset      { snapshot }      (optional)
 *           cb:res:snapshot   { snapshot }      (Antwort auf req:res:snapshot)
 *  Sendet  : cb:hud-ready     { ok:true }
 *  Fordert : req:res:snapshot
 *
 * Hinweise
 * - Sichtbarkeit wird über CSS (body.is-playing) gesteuert → ui-layout.js setzt das.
 * - Diese Datei erzeugt #hud-root falls nicht vorhanden.
 * ========================================================================== */

/* ------------------------------- Logging ---------------------------------- */
const _TAG  = '[hud]';
const _OK   = (...a)=>(window.CBLog?.ok   ?? console.log)(_TAG, ...a);
const _LOG  = (...a)=>(window.CBLog?.info ?? console.info)(_TAG, ...a);
const _WARN = (...a)=>(window.CBLog?.warn ?? console.warn)(_TAG, ...a);
const _ERR  = (...a)=>(window.CBLog?.error?? console.error)(_TAG, ...a);

/* ------------------------------- Konstanten -------------------------------- */
const DEFAULT_ICONS_BASE = 'assets/icons/resources/';
const FALLBACK_RESOURCES = [
  { id:'wood',  name:'Holz',    icon:'wood.png',  order:10 },
  { id:'stone', name:'Stein',   icon:'stone.png', order:20 },
  { id:'food',  name:'Nahrung', icon:'food.png',  order:30 },
  { id:'gold',  name:'Gold',    icon:'gold.png',  order:40 },
];

/* ------------------------------- Hilfsfunktionen --------------------------- */
function iconsBase(){
  try{
    const base = (typeof window.Registry?.iconsBase === 'function')
      ? window.Registry.iconsBase()
      : DEFAULT_ICONS_BASE;
    return (base || DEFAULT_ICONS_BASE).replace(/\/?$/,'/');
  }catch{ return DEFAULT_ICONS_BASE; }
}
function readResources(){
  try{
    if (typeof window.Registry?.list === 'function'){
      const list = window.Registry.list('resources');
      if (Array.isArray(list) && list.length){
        return list.map((r,i)=>({
          id:    r.id    ?? `res_${i}`,
          name:  r.name  ?? (r.id||`Res ${i}`),
          icon:  r.icon  ?? `${r.id||`res_${i}`}.png`,
          order: Number(r.order ?? (i+1)*10)
        })).sort((a,b)=>(a.order|0)-(b.order|0));
      }
    }
  }catch(e){ _WARN('Registry-Lesen fehlgeschlagen → Fallback', e?.message||e); }
  return FALLBACK_RESOURCES.slice();
}
function el(tag, cls, attrs){
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}
const fmt = v => Number.isFinite(v) ? String(v|0) : '0';

/* --------------------------------- State ---------------------------------- */
const HUD = {
  mounted   : false,
  $root     : null,
  $bar      : null,
  iconsBase : DEFAULT_ICONS_BASE,
  ids       : [],
  nodes     : new Map(),             // id → {cell,labelEl,valueEl,iconEl}
  values    : Object.create(null),   // id → number
  focus     : null
};

/* ------------------------------ DOM-Aufbau --------------------------------- */
/**
 * Achtung CSS-Kompat: Wir vergeben sowohl „neue“ Klassen (.hud__bar, .hud__cell)
 * als auch „alte“ Varianten (.hud, .hud-bar, .hud-cell …), damit bestehende
 * Styles sicher greifen – unabhängig davon, welche CSS-Version gerade aktiv ist.
 */
function ensureRoot(){
  if (HUD.$root && HUD.$bar) return;

  let root = document.getElementById('hud-root');
  if (!root){
    root = el('div', 'hud-root', { id:'hud-root' });
    document.body.appendChild(root);
  }

  // Nur ersetzen, wenn keine kompatible Struktur existiert
  const hasBar =
    root.querySelector('.hud__bar') ||
    root.querySelector('.hud-bar')  ||
    root.querySelector('.hud');
  if (!hasBar){
    root.innerHTML = `
      <div class="hud__wrap hud-wrap">
        <div class="hud__bar hud-bar hud" role="toolbar" aria-label="Ressourcen"></div>
      </div>
    `;
  }

  HUD.$root = root;
  HUD.$bar  = root.querySelector('.hud__bar, .hud-bar, .hud');
}

/** Eine Zelle erzeugen (mit alten & neuen Klassennamen) */
function createCell(meta){
  const { id, name, icon } = meta;
  const cell   = el('div', 'hud__cell hud-cell', { 'data-res':id, 'tabindex':'0', role:'button', 'aria-label':name });
  const iconEl = el('div', 'hud__icon hud-icon');
  const label  = el('div', 'hud__label hud-label');  label.textContent = name;
  const value  = el('div', 'hud__value hud-value');  value.textContent = '0';

  iconEl.style.backgroundImage = `url("${HUD.iconsBase + icon}")`;
  iconEl.style.backgroundSize  = 'cover';

  cell.append(iconEl, label, value);
  HUD.$bar.appendChild(cell);

  cell.addEventListener('click', ()=> setFocus(id));
  HUD.nodes.set(id, { cell, iconEl, labelEl:label, valueEl:value });
}

/** Komplettaufbau */
function renderAll(resList){
  ensureRoot();

  HUD.$bar.innerHTML = '';
  HUD.nodes.clear();

  HUD.iconsBase = iconsBase();
  HUD.ids = resList.map(r=>r.id);

  for (const r of resList) createCell(r);
  HUD.mounted = true;

  // Bereits bekannte Werte erneut auftragen
  for (const id of HUD.ids) patchValue(id, HUD.values[id]);
}

/** Einzelupdate */
function patchValue(id, value){
  const node = HUD.nodes.get(id);
  HUD.values[id] = Number.isFinite(value) ? (value|0) : 0;
  if (node) node.valueEl.textContent = fmt(HUD.values[id]);
  if (node) node.cell.classList.toggle('is-focus', HUD.focus === id);
}

function setFocus(idOrNull){
  const id = idOrNull || null;
  if (HUD.focus === id) return;
  HUD.focus = id;
  for (const rid of HUD.ids){
    const n = HUD.nodes.get(rid);
    if (n) n.cell.classList.toggle('is-focus', rid === id);
  }
  if (id){
    // optionales Spiegel-Signal an andere Systeme
    window.dispatchEvent(new CustomEvent('req:res:focus', { detail:{ res:id } }));
  }
}

/* ------------------------------- Events ----------------------------------- */
function tryInit(reason){
  try{
    const list = readResources();
    renderAll(list);
    // Werte anfordern (falls ein Ressourcensystem aktiv ist)
    window.dispatchEvent(new CustomEvent('req:res:snapshot'));
    window.dispatchEvent(new CustomEvent('cb:hud-ready', { detail:{ ok:true } }));
    _OK('bereit', { reason, count: HUD.ids.length });
  }catch(e){
    _ERR('Init-Fehler:', e?.message||e);
  }
}
function onRegistryReady(){ tryInit('registry'); }
function onGameStart(){      if (!HUD.mounted) tryInit('game-start'); }
function onResChange(ev){
  const d = ev?.detail || {};
  if (!d.res) return;
  const prev = Number(HUD.values[d.res] ?? 0);
  const next = Number.isFinite(d.value) ? d.value : (prev + (Number(d.delta)||0));
  patchValue(d.res, next);
}
function onResSnapshotOrReset(ev){
  const snap = ev?.detail?.snapshot || ev?.detail || {};
  if (snap && typeof snap === 'object'){
    for (const id of HUD.ids){
      if (Object.prototype.hasOwnProperty.call(snap, id)){
        patchValue(id, Number(snap[id])||0);
      }
    }
  }
}

/* ------------------------------ Bootstrap --------------------------------- */
/**
 * WICHTIG: Neben den Projekt-Events initialisieren wir **zusätzlich**
 * beim DOMContentLoaded – so ist die Leiste immer vorhanden (CSS blendet
 * sie ggf. vor Spielstart aus, siehe ui-layout.css).
 */
(function boot(){
  // Projekt-Events
  window.addEventListener('cb:registry:ready', onRegistryReady);
  window.addEventListener('cb:game:start',     onGameStart, { once:true });

  window.addEventListener('cb:res:change',   onResChange);
  window.addEventListener('cb:res:reset',    onResSnapshotOrReset);
  window.addEventListener('cb:res:snapshot', onResSnapshotOrReset);

  // Sofortige DOM-Initialisierung (failsafe)
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=> { if (!HUD.mounted) tryInit('dom'); });
  } else {
    if (!HUD.mounted) tryInit('dom-now');
  }
})();

/* -------------------------------- Exporte --------------------------------- */
window.HUD = {
  list : ()=> HUD.ids.slice(),
  set  : (id,v)=> patchValue(id,v),
  focus: (id)=> setFocus(id||null),
  render: ()=> renderAll(readResources()),
  snapshot(){
    const values = {}; for (const k of Object.keys(HUD.values)) values[k]=HUD.values[k];
    return { ids:HUD.ids.slice(), values, mounted:HUD.mounted, iconsBase:HUD.iconsBase, focus:HUD.focus };
  }
};

_LOG('geladen (v25.11.16-final-fix1)');
