/* ============================================================================
 * Datei   : ui/ui-hud.js
 * Projekt : Neue Siedler
 * Version : v25.11.16-final
 * Zweck   : Ressourcen-HUD (Holzleiste) aufbauen, aktualisieren & fokussieren
 *
 * Ereignisse (Standard):
 *  Lauscht : cb:game:start
 *           cb:registry:ready
 *           cb:res:change     { res, value?, delta? }
 *           cb:res:reset      { snapshot }          (optional)
 *           cb:res:snapshot   { snapshot }          (Antwort auf req:res:snapshot)
 *  Sendet  : cb:hud-ready     { ok:true }
 *  Fordert : req:res:snapshot  → erwartet cb:res:snapshot
 *           req:res:focus     { res }               (wenn Fokus extern gespiegelt wird)
 *
 * Hinweise:
 * - Idempotent: init() kann mehrfach aufgerufen werden (setzt nur einmal auf).
 * - Datenquelle: bevorzugt Registry (Icons, Labels, Reihenfolge). Fallback integriert.
 * - UI: erzeugt (oder nutzt) #hud-root und füllt es dynamisch.
 * - CSS: Styling gehört in ui/css/ui-hud.css (siehe Projektvorgabe).
 * - Logging: nutzt CBLog wenn vorhanden, sonst console.
 *
 * Struktur (Style-Konvention):
 *   Imports → Konstanten → Helpers → Internes State → DOM-Aufbau → Events → Exporte
 * ========================================================================== */

/* -------------------------------- Imports --------------------------------- */
/* keine externen Importe – greift auf window.Registry und window.CBLog zu */

/* ------------------------------ Konstanten -------------------------------- */
const HUD_TAG  = '[hud]';
const HUD_LOG  = (...a)=> (window.CBLog?.info ?? console.info)(HUD_TAG, ...a);
const HUD_OK   = (...a)=> (window.CBLog?.ok   ?? console.log)(HUD_TAG, ...a);
const HUD_WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(HUD_TAG, ...a);
const HUD_ERR  = (...a)=> (window.CBLog?.error?? console.error)(HUD_TAG, ...a);

/** Standard-Icons-Basis, falls Registry keine Basis liefert */
const DEFAULT_ICONS_BASE = 'assets/icons/resources/';

/** Fallback-Ressourcen (werden durch Registry-Daten ersetzt, wenn verfügbar) */
const FALLBACK_RESOURCES = [
  { id:'wood',  name:'Holz',  icon:'wood.png',  order:10 },
  { id:'stone', name:'Stein', icon:'stone.png', order:20 },
  { id:'food',  name:'Nahrung', icon:'food.png', order:30 },
  { id:'gold',  name:'Gold',  icon:'gold.png',  order:40 },
];

/* -------------------------------- Helpers --------------------------------- */
/** sichere Abfrage der Registry-Icons-Basis */
function getIconsBase() {
  try {
    const base = (typeof window.Registry?.iconsBase === 'function')
      ? window.Registry.iconsBase()
      : DEFAULT_ICONS_BASE;
    return (base || DEFAULT_ICONS_BASE).replace(/\/?$/, '/');
  } catch {
    return DEFAULT_ICONS_BASE;
  }
}

/** Ressourcen-Metadaten aus Registry (oder Fallback) holen */
function getResourcesFromRegistryOrFallback() {
  try {
    if (typeof window.Registry?.list === 'function') {
      const list = window.Registry.list('resources'); // erwartet Array von Ressourcen
      if (Array.isArray(list) && list.length) {
        // Normalisieren (id, name, icon, order)
        return list.map((r, i) => ({
          id    : r.id ?? `res_${i}`,
          name  : r.name ?? r.id ?? `Res ${i}`,
          icon  : r.icon ?? `${r.id||`res_${i}`}.png`,
          order : Number(r.order ?? ((i+1)*10)),
        })).sort((a,b)=> (a.order|0) - (b.order|0));
      }
    }
  } catch (e) {
    HUD_WARN('Registry-Lesen fehlgeschlagen – nutze Fallback:', e?.message||e);
  }
  return FALLBACK_RESOURCES.slice();
}

/** kleine DOM-Factory */
function el(tag, cls, attrs) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

/** Formatierungs-Helfer (Ganzzahlen, kein Trennen) – später ausbaubar */
function fmt(value) {
  if (Number.isFinite(value)) return String(value|0);
  return '0';
}

/* ------------------------------- Internals -------------------------------- */
const HUD = {
  mounted      : false,               // wurde DOM erzeugt?
  $root        : null,                // #hud-root
  $bar         : null,                // .hud__bar (Container der Zellen)
  ids          : [],                  // Ressourcennamen in Reihenfolge
  nodes        : new Map(),           // id → { cell, valueEl, iconEl, labelEl }
  values       : Object.create(null), // id → current number
  iconsBase    : DEFAULT_ICONS_BASE,  // Basis-URL für Icons
  focus        : null,                // id der fokussierten Ressource (optional)
};

/* ------------------------------- DOM-Aufbau ------------------------------- */
/** Erzeugt/holt den #hud-root und Grundstruktur */
function ensureRoot() {
  if (HUD.$root && HUD.$bar) return;

  // #hud-root verwenden oder erzeugen
  let root = document.getElementById('hud-root');
  if (!root) {
    root = el('div', 'hud-root', { id: 'hud-root' });
    document.body.appendChild(root);
  }

  // Grundstruktur der Leiste
  root.innerHTML = `
    <div class="hud__wrap">
      <div class="hud__bar" role="toolbar" aria-label="Ressourcen">
        <!-- Zellen werden dynamisch eingefügt -->
      </div>
    </div>
  `;
  HUD.$root = root;
  HUD.$bar  = root.querySelector('.hud__bar');
}

/** Eine HUD-Zelle für eine Ressource erzeugen und ins Mapping eintragen */
function createCell(resMeta) {
  const { id, name, icon } = resMeta;
  const cell   = el('div', 'hud__cell', { 'data-res': id, 'tabindex': '0', 'role': 'button', 'aria-label': name });
  const iconEl = el('div', 'hud__icon');
  const label  = el('div', 'hud__label');  label.textContent = name;
  const value  = el('div', 'hud__value');  value.textContent = '0';

  // Icon als Hintergrundbild (per CSS cover), Pfad über iconsBase
  const url = HUD.iconsBase + icon;
  iconEl.style.backgroundImage = `url("${url}")`;

  cell.appendChild(iconEl);
  cell.appendChild(label);
  cell.appendChild(value);
  HUD.$bar.appendChild(cell);

  // Fokus per Klick (optional verwendbar)
  cell.addEventListener('click', () => setFocus(id));

  HUD.nodes.set(id, { cell, iconEl, labelEl: label, valueEl: value });
}

/** HUD komplett rendern (Zellen neu aufbauen) */
function renderAll(resources) {
  ensureRoot();

  HUD.$bar.innerHTML = '';
  HUD.nodes.clear();
  HUD.ids = resources.map(r => r.id);

  const base = getIconsBase();
  HUD.iconsBase = base;

  for (const r of resources) {
    createCell(r);
  }

  HUD.mounted = true;
  // Nach dem Rendern – bekannte Werte einzeichnen, falls Snapshot bereits existiert
  for (const id of HUD.ids) {
    patchValue(id, HUD.values[id]);
  }
}

/** Einzelne Ressource aktualisieren (Wert + Fokusklasse) */
function patchValue(id, value) {
  if (!HUD.mounted) return;
  const node = HUD.nodes.get(id);
  if (!node) return;
  HUD.values[id] = Number.isFinite(value) ? value|0 : 0;
  node.valueEl.textContent = fmt(HUD.values[id]);

  // Fokus-Visualisierung
  node.cell.classList.toggle('is-focus', HUD.focus === id);
}

/** Fokus setzen/entfernen (optional) */
function setFocus(idOrNull) {
  const id = idOrNull || null;
  if (HUD.focus === id) return;
  HUD.focus = id;

  for (const rid of HUD.ids) {
    const n = HUD.nodes.get(rid);
    if (n) n.cell.classList.toggle('is-focus', rid === id);
  }
  // Optional Spiegelung an andere Systeme:
  if (id) {
    window.dispatchEvent(new CustomEvent('req:res:focus', { detail: { res: id } }));
  }
}

/* --------------------------------- Events --------------------------------- */
/** Initialisierungstrigger: Registry oder Game-Start */
function tryInit(reason) {
  try {
    const list = getResourcesFromRegistryOrFallback();
    renderAll(list);

    // Beim ersten Start gleich einen Snapshot anfordern, wenn verfügbar
    window.dispatchEvent(new CustomEvent('req:res:snapshot'));
    HUD_OK('bereit', { reason, count: HUD.ids.length });
    window.dispatchEvent(new CustomEvent('cb:hud-ready', { detail: { ok:true } }));
  } catch (e) {
    HUD_ERR('Init fehlgeschlagen:', e?.message||e);
  }
}

/** Registry bereit → HUD (re-)initialisieren */
function onRegistryReady() {
  // idempotent: einfach neu rendern mit Registry-Daten
  tryInit('registry');
}

/** Game-Start → falls Registry früher kam oder nicht existiert */
function onGameStart() {
  if (!HUD.mounted) tryInit('game-start');
}

/** Einzelwert-Updates */
function onResChange(ev) {
  const d = ev?.detail || {};
  if (!d.res) return;
  // Entweder absoluter value ODER delta
  const prev = Number(HUD.values[d.res] ?? 0);
  const next = Number.isFinite(d.value) ? d.value : (prev + (Number(d.delta)||0));
  patchValue(d.res, next);
}

/** Komplett-Reset / Snapshot */
function onResSnapshotOrReset(ev) {
  const snap = ev?.detail?.snapshot || ev?.detail || {};
  // snap ist Objekt: {wood: 10, stone: 5, ...}
  if (snap && typeof snap === 'object') {
    for (const id of HUD.ids) {
      if (Object.prototype.hasOwnProperty.call(snap, id)) {
        patchValue(id, Number(snap[id]) || 0);
      }
    }
  }
}

/* ------------------------------- Bootstrap -------------------------------- */
(function boot(){
  // Dom-Listener erst registrieren, dann warten auf Signale
  window.addEventListener('cb:registry:ready', onRegistryReady, { once:false });
  window.addEventListener('cb:game:start',     onGameStart,     { once:true  });

  window.addEventListener('cb:res:change',   onResChange);
  window.addEventListener('cb:res:reset',    onResSnapshotOrReset);
  window.addEventListener('cb:res:snapshot', onResSnapshotOrReset);

  // Falls beides bereits durch ist (spätes Laden des HUD) – defensiv init:
  // (ein einfacher Timeout tick genügt, um bestehende Flags/Events zu verarbeiten)
  setTimeout(() => {
    if (!HUD.mounted) {
      // Wenn Registry schon durch ist, hat evtl. jemand window.Registry?.ready gesetzt.
      // Wir initialisieren hier vorsichtig trotzdem, die Render-Logik ist idempotent.
      tryInit('late-fallback');
    }
  }, 0);
})();

/* -------------------------------- Exporte --------------------------------- */
/** öffentliche, kleine HUD-API (für Inspector/Tests) */
window.HUD = {
  /** IDs der sichtbaren Ressourcen in Anzeige-Reihenfolge */
  list() { return HUD.ids.slice(); },
  /** direkten Wert setzen (z. B. Testfälle) */
  set(id, value){ patchValue(id, value); },
  /** Fokus setzen/entfernen */
  focus(id){ setFocus(id || null); },
  /** Neuaufbau erzwingen (liest erneut Registry → Fallback) */
  render(){ renderAll(getResourcesFromRegistryOrFallback()); },
  /** Debug: liefert internen State (read-only Kopie) */
  snapshot(){
    const values = {}; for (const k of Object.keys(HUD.values)) values[k] = HUD.values[k];
    return {
      ids: HUD.ids.slice(),
      values,
      mounted: HUD.mounted,
      iconsBase: HUD.iconsBase,
      focus: HUD.focus,
    };
  },
};

HUD_LOG('geladen (v25.11.16-final)');
