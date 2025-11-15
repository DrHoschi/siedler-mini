/* =============================================================================
 * Datei   : ui/ui-hud.js
 * Projekt : Neue Siedler
 * Version : v25.11.17-final
 * Zweck   : Ressourcen-HUD initialisieren & aktualisieren
 *
 * Lauscht : cb:game:start, cb:registry:ready, cb:res:change
 * Sendet  : cb:hud-ready
 *
 * WICHTIG
 * - Der Container #hud-root bekommt IMMER die Klasse .hud
 *   → damit greifen die Styles aus ui-hud.css (.hud, .hud__cell, …).
 * - Struktur pro Ressource:
 *     <div class="hud__cell" data-res="wood">
 *       <div class="hud__title">Holz</div>
 *       <div class="hud__icon-wrap">
 *         <img class="hud__icon" src="…" alt="Holz">
 *       </div>
 *       <div class="hud__value">128</div>
 *     </div>
 * - Styling (Holzrahmen, Position, Scrollbarkeit) kommt vollständig aus CSS.
 * ========================================================================== */
(function (root, factory) {
  root.UIHUD = factory();
})(typeof window !== 'undefined' ? window : this, function () {

  /* --------------------------- Logging & Helpers -------------------------- */
  const TAG  = '[hud]';
  const log  = (m)=> (window.CBLog?.info  || console.info)(`${TAG} ${m}`);
  const ok   = (m)=> (window.CBLog?.ok    || console.log )(`${TAG} ${m}`);
  const warn = (m)=> (window.CBLog?.warn  || console.warn)(`${TAG} ${m}`);

  const $  = (sel, ctx=document)=> ctx.querySelector(sel);
  const el = (tag, cls)=>{
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  };

  // Flag, damit init() nur einmal „richtig“ läuft
  let INIT_DONE = false;

  /* --------------------------- Datenquellen ------------------------------ */

  /**
   * Fallback-Ressourcen (Epoche 1) – deutsch beschriftet.
   * Wird verwendet, wenn keine Registry vorhanden ist.
   */
  function defaultResources(){
    return [
      { id:'wood',  label:'Holz',    icon:'assets/icons/resources/wood.png',  value:0 },
      { id:'stone', label:'Stein',   icon:'assets/icons/resources/stone.png', value:0 },
      { id:'food',  label:'Nahrung', icon:'assets/icons/resources/food.png',  value:0 },
      { id:'gold',  label:'Gold',    icon:'assets/icons/resources/gold.png',  value:0 }
    ];
  }

  /**
   * Ressourcen aus der Registry holen (falls vorhanden).
   * Erwartet Registry.list('resources'), formatiert sie passend fürs HUD.
   */
  function fromRegistry(){
    try{
      if (!window.Registry || typeof Registry.list !== 'function') return null;
      const resMeta = Registry.list('resources') || [];
      if (!Array.isArray(resMeta) || !resMeta.length) return null;

      return resMeta.map(r => ({
        id:    String(r.id || '').trim(),
        label: String(r.label || r.id || '').trim(),
        icon:  r.icon || `assets/icons/resources/${r.id}.png`,
        value: 0
      }));
    } catch(e){
      warn('Registry.list("resources") fehlgeschlagen – nutze Defaults.');
      return null;
    }
  }

  /* --------------------------- Render-Funktionen ------------------------- */

  /**
   * Komplette HUD-Leiste neu zeichnen.
   * host = Container (#hud-root mit Klasse .hud)
   * model = Array [{id,label,icon,value}, …]
   */
  function render(host, model){
    host.innerHTML = '';

    model.forEach(r=>{
      const cell = el('div','hud__cell');
      cell.dataset.res = r.id;

      // Titel oben links
      const name = el('div','hud__title');
      name.textContent = r.label;

      // Icon zentriert in der Mitte
      const wrap = el('div','hud__icon-wrap');
      const icon = el('img','hud__icon');
      icon.alt   = r.label;
      icon.src   = r.icon;
      wrap.appendChild(icon);

      // Wert unten rechts
      const val  = el('div','hud__value');
      val.textContent = String(r.value ?? 0);

      cell.append(name, wrap, val);
      host.appendChild(cell);
    });
  }

  /**
   * Einzelne Ressource aktualisieren (Wert ändern + kleines „Highlight“).
   *
   * deltaOrAbs kann sein:
   *   – Zahl           → old + delta
   *   – { value:123 }  → absolut setzen
   */
  function patch(host, resId, deltaOrAbs){
    const cell = host.querySelector(`.hud__cell[data-res="${resId}"]`);
    if (!cell) return;

    const valEl = cell.querySelector('.hud__value');
    const oldV  = Number(valEl?.textContent || 0);

    const newV  =
      (typeof deltaOrAbs === 'object' && typeof deltaOrAbs.value === 'number')
        ? deltaOrAbs.value
        : (typeof deltaOrAbs === 'number'
            ? (oldV + deltaOrAbs)
            : oldV);

    if (valEl) valEl.textContent = String(newV);

    // kleines optisches Feedback
    cell.classList.add('is-updated');
    setTimeout(()=> cell.classList.remove('is-updated'), 300);
  }

  /* ------------------------------ INIT-Logik ----------------------------- */

  function init() {
    if (INIT_DONE) {
      // Bereits aufgebaut → nur Log + Ready-Event sicherstellen
      ok('init() erneut aufgerufen – HUD existiert bereits, überspringe Neuaufbau.');
      window.dispatchEvent(new CustomEvent('cb:hud-ready', { detail:{ ok:true, reused:true } }));
      return;
    }
    INIT_DONE = true;

    // 1) Host finden oder anlegen
    let host = $('#hud-root');
    if (!host){
      host = el('div');
      host.id = 'hud-root';
      document.body.appendChild(host);
    }

    // 2) WICHTIG: HUD-Klasse am Container setzen, damit ui-hud.css greift
    host.classList.add('hud');

    // 3) Reihenfolge ermitteln: Registry → Defaults
    const model = fromRegistry() || defaultResources();

    // 4) Erste Zeichnung
    render(host, model);

    // 5) Build-Button sichtbar machen (falls vorhanden)
    const btnBuild = $('#btn-build');
    if (btnBuild) btnBuild.hidden = false;

    // 6) Events: Ressourcenänderungen anwenden
    window.addEventListener('cb:res:change', (e)=>{
      const d = e?.detail || e;
      // d kann {res, delta} oder {res, value} sein
      if (d && d.res){
        if ('value' in d) {
          patch(host, d.res, { value:d.value });
        } else {
          patch(host, d.res, d.delta || 0);
        }
      }
    });

    ok('bereit');
    window.dispatchEvent(new CustomEvent('cb:hud-ready', { detail:{ ok:true } }));
  }

  /* ------------------------------ Public API ----------------------------- */

  return { init };
});

/* ============================================================================
 * Lifecycle-Hooks (außerhalb der Factory)
 * - sorgen dafür, dass UIHUD.init() zum passenden Zeitpunkt aufgerufen wird.
 * - init() selbst ist idempotent und kümmert sich um Doppelaufrufe.
 * ========================================================================== */
window.addEventListener(
  'cb:game:start',
  ()=> window.UIHUD?.init?.(),
  { passive:true }
);

window.addEventListener(
  'cb:registry:ready',
  ()=> window.UIHUD?.init?.(),
  { passive:true }
);
