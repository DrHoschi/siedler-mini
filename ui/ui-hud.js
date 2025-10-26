/* =============================================================================
 * Datei   : ui/ui-hud.js
 * Projekt : Neue Siedler
 * Version : v25.10.26-hud2
 * Zweck   : Ressourcen-HUD initialisieren & live aktualisieren
 *
 * Events  : listen  -> cb:game-start, cb:registry:ready,
 *                       cb:res:snapshot, cb:res:change, cb:res:reset
 *           emit    -> cb:hud-ready
 *
 * Hinweise:
 *   - Liest Meta (IDs, Icons, Labels, Order) aus window.Registry.list('resources'),
 *     fällt andernfalls auf sinnvolle Defaults zurück.
 *   - Reagiert auf vollständige Snapshots (cb:res:snapshot) und auf inkrementelle
 *     Änderungen (cb:res:change) – unterstützt beide Schemas:
 *         { res, delta } / { res, value }   (HUD-kompatibel)
 *         { id,  old,   value }             (Inspector/Engine-kompatibel)
 *   - Bietet UIHUD.updateResources(map) und UIHUD.setValue(id,value) als öffentliche API.
 *   - Zeichnet nur DOM; Styling via CSS (ui/ui.css, ui-layout.css).
 * ============================================================================ */
(function (root, factory) {
  root.UIHUD = factory();
})(typeof window !== 'undefined' ? window : this, function () {

  const TAG  = '[hud]';
  const OK   = (m,...a)=> (window.CBLog?.ok   || console.log)(`${TAG} ${m}`, ...a);
  const LOG  = (m,...a)=> (window.CBLog?.info || console.info)(`${TAG} ${m}`, ...a);
  const WRN  = (m,...a)=> (window.CBLog?.warn || console.warn)(`${TAG} ${m}`, ...a);

  // --------------------------- Utils ---------------------------
  const $  = (sel, ctx=document)=> ctx.querySelector(sel);
  const el = (tag, cls)=>{ const n=document.createElement(tag); if(cls) n.className=cls; return n; };

  function defaultResources(){
    // Fallback-Reihenfolge Epoche 1 (erweiterbar) – Labels deutsch
    return [
      { id:'wood',  label:'Holz',    icon:'assets/icons/resources/wood.png',  value:0, order:1 },
      { id:'stone', label:'Stein',   icon:'assets/icons/resources/stone.png', value:0, order:2 },
      { id:'food',  label:'Nahrung', icon:'assets/icons/resources/food.png',  value:0, order:3 },
      { id:'gold',  label:'Gold',    icon:'assets/icons/resources/gold.png',  value:0, order:4 }
    ];
  }

  function fromRegistry(){
    try{
      if (!window.Registry || typeof Registry.list !== 'function') return null;
      const resMeta = Registry.list('resources') || [];
      if (!Array.isArray(resMeta) || !resMeta.length) return null;
      return resMeta
        .map((r, i) => ({
          id   : String(r.id || '').trim(),
          label: String(r.label || r.name || r.id || '').trim(),
          icon : r.icon || `assets/icons/resources/${r.id}.png`,
          value: 0,
          order: Number(r.order ?? (1000+i))
        }))
        .sort((a,b)=> (a.order||999)-(b.order||999));
    } catch(e){
      WRN('Registry.list("resources") fehlgeschlagen – nutze Defaults.', e?.message||e);
      return null;
    }
  }

  // --------------------------- Interner Zustand ---------------------------
  let _host   = null;     // DOM-Container
  let _model  = [];       // [{id,label,icon,value,order}]
  let _index  = Object.create(null); // id -> DOM-Zeile (Cache)
  let _ready  = false;    // idempotentes init

  // --------------------------- Rendering ---------------------------
  function render(host, model){
    host.innerHTML = '';
    _index = Object.create(null);

    model.forEach(r=>{
      const cell  = el('div','hud__cell'); cell.dataset.res = r.id;
      const wrap  = el('div','hud__icon-wrap');
      const icon  = el('img','hud__icon'); icon.alt = r.label; icon.src = r.icon;
      const name  = el('div','hud__title'); name.textContent = r.label;
      const val   = el('div','hud__value'); val.textContent = String(Number(r.value||0));

      wrap.appendChild(icon);
      cell.append(name, wrap, val);
      host.appendChild(cell);

      _index[r.id] = { cell, valEl: val };
    });
  }

  function setValue(resId, newValue){
    const row = _index[resId];
    if (!row) return;
    const oldV = Number(row.valEl.textContent || 0);
    const v = Number(newValue||0);
    if (v === oldV) return;
    row.valEl.textContent = String(v);
    // kleines Highlight
    row.cell.classList.add('is-updated');
    setTimeout(()=> row.cell.classList.remove('is-updated'), 250);
  }

  function applySnapshot(map){
    if (!map || typeof map!=='object') return;
    for (const [id,val] of Object.entries(map)){
      setValue(id, Number(val||0));
    }
  }

  function applyChange(detail){
    // Unterstützt beide Schemata:
    // 1) { res, delta } | { res, value }
    if (detail && typeof detail==='object' && 'res' in detail){
      const id = String(detail.res||'').trim();
      if (!id) return;
      if ('value' in detail) setValue(id, Number(detail.value||0));
      else setValue(id, Number(_index[id]?.valEl?.textContent||0) + Number(detail.delta||0));
      return;
    }
    // 2) { id, old, value }
    if (detail && typeof detail==='object' && 'id' in detail){
      const id = String(detail.id||'').trim();
      if (!id) return;
      setValue(id, Number(detail.value||0));
    }
  }

  // --------------------------- API ---------------------------
  function init() {
    if (_ready && _host && _model.length) {
      // bereits vorhanden – erneut nur sichtbar machen
      const btnBuild = $('#btn-build'); if (btnBuild) btnBuild.hidden = false;
      return;
    }

    _host = $('#hud-root');
    if (!_host){
      _host = el('div'); _host.id = 'hud-root';
      document.body.appendChild(_host);
    }

    // Reihenfolge über Registry (falls vorhanden), sonst Defaults
    _model = fromRegistry() || defaultResources();
    render(_host, _model);

    // Build-Button sichtbar machen
    const btnBuild = $('#btn-build');
    if (btnBuild) btnBuild.hidden = false;

    // Fertig
    _ready = true;
    OK('bereit');
    window.dispatchEvent(new CustomEvent('cb:hud-ready', { detail:{ ok:true } }));
  }

  /**
   * Öffentliche API: ganze Map anwenden (z. B. aus cb:res:snapshot oder extern)
   * @param {Record<string, number>} map
   */
  function updateResources(map){
    if (!_ready) init();
    applySnapshot(map);
  }

  /**
   * Öffentliche API: Einzelwert hart setzen
   */
  function setValuePublic(id, value){
    if (!_ready) init();
    setValue(id, value);
  }

  // Exporte
  return {
    init,
    updateResources,
    setValue: setValuePublic,
  };
});

// --------------------------- Lifecycle-Bindings ---------------------------
// HUD aufbauen, sobald Spiel oder Registry bereit ist (idempotent)
window.addEventListener('cb:game-start',    ()=> window.UIHUD?.init?.(), { passive:true });
window.addEventListener('cb:registry:ready',()=> window.UIHUD?.init?.(), { passive:true });

// Vollständige Snapshots anwenden (füllt auch 0er-Keys)
window.addEventListener('cb:res:snapshot', (e)=>{
  const map = e?.detail?.resources || e?.detail || null;
  if (map && typeof map==='object') window.UIHUD?.updateResources?.(map);
}, { passive:true });

// Inkrementelle Änderungen anwenden (beide Schemas unterstützt)
window.addEventListener('cb:res:change', (e)=>{
  const d = e?.detail || e;
  if (!d) return;
  // 1) {res, delta} | {res, value}
  if ('res' in d) {
    const id = String(d.res||'').trim(); if (!id) return;
    if ('value' in d) window.UIHUD?.setValue?.(id, Number(d.value||0));
    else {
      // delta: alter Wert + delta
      const cell = document.querySelector(`.hud__cell[data-res="${id}"] .hud__value`);
      const cur  = Number(cell?.textContent||0);
      window.UIHUD?.setValue?.(id, cur + Number(d.delta||0));
    }
    return;
  }
  // 2) {id, old, value}
  if ('id' in d) {
    const id = String(d.id||'').trim(); if (!id) return;
    window.UIHUD?.setValue?.(id, Number(d.value||0));
  }
}, { passive:true });

// Reset: alle auf 0 (und danach ggf. Snapshot abwarten)
window.addEventListener('cb:res:reset', ()=>{
  const cells = document.querySelectorAll('.hud__cell .hud__value');
  cells.forEach(v => v.textContent = '0');
}, { passive:true });
