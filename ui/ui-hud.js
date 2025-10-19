/* =============================================================================
 * Datei   : ui/ui-hud.js
 * Projekt : Neue Siedler
 * Version : v25.10.19-final2
 * Zweck   : Ressourcen-HUD initialisieren & aktualisieren
 * Events  : listen  -> cb:game-start, cb:registry:ready, cb:res:change
 *           emit    -> cb:hud-ready
 * Hinweise:
 *   - Greift, falls vorhanden, auf window.Registry zu (labels, icons, order).
 *   - Ohne Registry verwendet es sinnvolle Default-Ressourcen.
 *   - Zeichnet nur DOM; Styling kommt aus den CSS-Dateien (ui/ui.css, ui-layout.css, ...).
 * ============================================================================ */
(function (root, factory) {
  root.UIHUD = factory();
})(typeof window !== 'undefined' ? window : this, function () {

  const TAG = '[hud]';
  const log = (m)=> (window.CBLog?.info||console.info)(`${TAG} ${m}`);
  const warn= (m)=> (window.CBLog?.warn||console.warn)(`${TAG} ${m}`);

  // --------------------------- Utils ---------------------------
  const $  = (sel, ctx=document)=> ctx.querySelector(sel);
  const el = (tag, cls)=>{ const n=document.createElement(tag); if(cls) n.className=cls; return n; };

  function defaultResources(){
    // Fallback-Reihenfolge Epoche 1 (erweiterbar) – Labels deutsch
    return [
      { id:'wood',  label:'Holz',  icon:'assets/icons/resources/wood.png',  value:0 },
      { id:'stone', label:'Stein', icon:'assets/icons/resources/stone.png', value:0 },
      { id:'food',  label:'Nahrung', icon:'assets/icons/resources/food.png', value:0 },
      { id:'gold',  label:'Gold',  icon:'assets/icons/resources/gold.png',  value:0 }
    ];
  }

  function fromRegistry(){
    try{
      if (!window.Registry || typeof Registry.list !== 'function') return null;
      const resMeta = Registry.list('resources') || [];
      if (!Array.isArray(resMeta) || !resMeta.length) return null;
      return resMeta.map(r => ({
        id: String(r.id || '').trim(),
        label: String(r.label || r.id || '').trim(),
        icon: r.icon || `assets/icons/resources/${r.id}.png`,
        value: 0
      }));
    } catch(e){
      warn('Registry.list("resources") fehlgeschlagen – nutze Defaults.');
      return null;
    }
  }

  // Zeichnet Zellen neu
  function render(host, model){
    host.innerHTML = '';
    model.forEach(r=>{
      const cell  = el('div','hud__cell'); cell.dataset.res = r.id;
      const wrap  = el('div','hud__icon-wrap');
      const icon  = el('img','hud__icon'); icon.alt = r.label; icon.src = r.icon;
      const name  = el('div','hud__title'); name.textContent = r.label;
      const val   = el('div','hud__value'); val.textContent = String(r.value ?? 0);

      wrap.appendChild(icon);
      cell.append(name, wrap, val);
      host.appendChild(cell);
    });
  }

  // Aktualisiert eine Ressource – minimal robust
  function patch(host, resId, deltaOrAbs){
    const cell = host.querySelector(`.hud__cell[data-res="${resId}"]`);
    if (!cell) return;

    const valEl = cell.querySelector('.hud__value');
    const oldV  = Number(valEl?.textContent || 0);
    const newV  = (typeof deltaOrAbs === 'object' && typeof deltaOrAbs.value === 'number')
      ? deltaOrAbs.value
      : (typeof deltaOrAbs === 'number' ? (oldV + deltaOrAbs) : oldV);

    if (valEl) valEl.textContent = String(newV);

    // kleines Highlight
    cell.classList.add('is-updated');
    setTimeout(()=> cell.classList.remove('is-updated'), 300);
  }

  // --------------------------- API ---------------------------
  function init() {
    let host = $('#hud-root');
    if (!host){
      host = el('div'); host.id = 'hud-root';
      document.body.appendChild(host);
    }

    // Reihenfolge über Registry (falls vorhanden), sonst Defaults
    const model = fromRegistry() || defaultResources();
    render(host, model);

    // Erstellt/zeigt den Build-Button, wenn noch hidden
    const btnBuild = $('#btn-build');
    if (btnBuild) btnBuild.hidden = false;

    // Events: Ressourcenänderungen anwenden
    window.addEventListener('cb:res:change', (e)=>{
      const d = e?.detail || e;
      // d kann {res, delta} oder {res, value} sein
      if (d && d.res){ patch(host, d.res, ('value' in d) ? {value:d.value} : (d.delta||0)); }
    });

    (window.CBLog?.ok||console.log)('[hud] bereit');
    window.dispatchEvent(new CustomEvent('cb:hud-ready', { detail:{ ok:true } }));
  }

  return { init };
});

// Lifecycle-Hooks: HUD zum Spielstart aufbauen, bei Registry-Ready ebenfalls (idempotent)
window.addEventListener('cb:game-start',   ()=> window.UIHUD?.init?.(), { passive:true });
window.addEventListener('cb:registry:ready',()=> window.UIHUD?.init?.(), { passive:true });
