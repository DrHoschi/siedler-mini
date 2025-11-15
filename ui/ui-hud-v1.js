/* =============================================================================
 * Datei   : ui/ui-hud.js
 * Projekt : Neue Siedler
 * Version : v25.11.17-final-clean
 * Zweck   : Ressourcen-HUD anzeigen & aktualisieren
 * Bereich : NUR HUD!  Keine Build- oder sonstigen UI-Elemente.
 *
 * Struktur pro Ressource (HTML):
 *   <div class="hud__cell" data-res="wood">
 *     <div class="hud__title">Holz</div>
 *     <div class="hud__icon-wrap">
 *       <img class="hud__icon" src="…" alt="Holz">
 *     </div>
 *     <div class="hud__value">128</div>
 *   </div>
 *
 * Styling: komplett in ui-hud.css
 * ========================================================================== */
(function (root, factory) {
  root.UIHUD = factory();
})(typeof window !== 'undefined' ? window : this, function () {

  const TAG = '[hud]';
  const log = (m)=> (window.CBLog?.info||console.info)(`${TAG} ${m}`);
  const ok  = (m)=> (window.CBLog?.ok  ||console.log )(`${TAG} ${m}`);
  const warn= (m)=> (window.CBLog?.warn||console.warn)(`${TAG} ${m}`);

  const $  = (sel, ctx=document)=> ctx.querySelector(sel);
  const el = (tag, cls)=>{ const n=document.createElement(tag); if(cls) n.className=cls; return n; };

  let INIT_DONE = false;

  /* -------------------------------------------------------------------------
   * Fallback-Daten – falls Registry noch nicht existiert
   * ---------------------------------------------------------------------- */
  function defaultResources(){
    return [
      { id:'wood',  label:'Holz',    icon:'assets/icons/resources/wood.png',  value:0 },
      { id:'stone', label:'Stein',   icon:'assets/icons/resources/stone.png', value:0 },
      { id:'food',  label:'Nahrung', icon:'assets/icons/resources/food.png',  value:0 },
      { id:'gold',  label:'Gold',    icon:'assets/icons/resources/gold.png',  value:0 }
    ];
  }

  function fromRegistry(){
    try{
      if (!window.Registry || typeof Registry.list !== 'function') return null;
      const arr = Registry.list('resources') || [];
      if (!arr.length) return null;

      return arr.map(r => ({
        id:    String(r.id || '').trim(),
        label: String(r.label || r.id || '').trim(),
        icon:  r.icon || `assets/icons/resources/${r.id}.png`,
        value: 0
      }));
    } catch {
      return null;
    }
  }

  /* -------------------------------------------------------------------------
   * HUD rendern
   * ---------------------------------------------------------------------- */
  function render(host, model){
    host.innerHTML = '';

    model.forEach(r=>{
      const cell = el('div','hud__cell');
      cell.dataset.res = r.id;

      const title = el('div','hud__title');
      title.textContent = r.label;

      const wrap  = el('div','hud__icon-wrap');
      const img   = el('img','hud__icon');
      img.src = r.icon;
      img.alt = r.label;
      wrap.appendChild(img);

      const val   = el('div','hud__value');
      val.textContent = String(r.value ?? 0);

      cell.append(title, wrap, val);
      host.appendChild(cell);
    });
  }

  /* -------------------------------------------------------------------------
   * Einzelupdate (z. B. cb:res:change)
   * ---------------------------------------------------------------------- */
  function patch(host, id, deltaOrAbs){
    const cell = host.querySelector(`.hud__cell[data-res="${id}"]`);
    if (!cell) return;

    const valEl = cell.querySelector('.hud__value');
    const oldV  = Number(valEl.textContent || 0);

    const newV =
      typeof deltaOrAbs === 'object' && typeof deltaOrAbs.value === 'number'
        ? deltaOrAbs.value
        : (typeof deltaOrAbs === 'number' ? oldV + deltaOrAbs : oldV);

    valEl.textContent = String(newV);

    cell.classList.add('is-updated');
    setTimeout(()=> cell.classList.remove('is-updated'),300);
  }

  /* -------------------------------------------------------------------------
   * Initialisierung
   * ---------------------------------------------------------------------- */
  function init(){
    if (INIT_DONE){
      ok('HUD bereits vorhanden – kein Neuaufbau');
      return;
    }
    INIT_DONE = true;

    let host = $('#hud-root');
    if (!host){
      host = el('div','hud');
      host.id = 'hud-root';
      document.body.appendChild(host);
    } else {
      host.classList.add('hud');
    }

    const model = fromRegistry() || defaultResources();
    render(host, model);

    // Resource-Update
    window.addEventListener('cb:res:change', ev=>{
      const d = ev.detail;
      if (d?.res){
        if ('value' in d) patch(host, d.res, {value:d.value});
        else patch(host, d.res, d.delta||0);
      }
    });

    ok('bereit');
    window.dispatchEvent(new CustomEvent('cb:hud-ready',{detail:{ok:true}}));
  }

  return { init };
});

/* ---------------------------------------------------------------------------
 * Lifecycle
 * ------------------------------------------------------------------------ */
window.addEventListener('cb:game:start',   ()=> window.UIHUD?.init(), {passive:true});
window.addEventListener('cb:registry:ready',()=> window.UIHUD?.init(), {passive:true});
