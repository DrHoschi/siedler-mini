/* =============================================================================
 * Datei   : ui/ui-hud.js
 * Projekt : Neue Siedler
 * Version : v26.08.28-sa04-resource-sync
 *
 * Zweck:
 *   HUD (Ressourcenleiste) vollständig erzeugen + aktualisieren.
 *   Alle HUD-DIVs werden HIER erzeugt – nichts im Build-Menü!
 *
 * SA-04:
 *   - initiale Werte aus window.RegistryValues übernehmen
 *   - cb:res:snapshot verarbeiten, damit Continue-Restore sichtbar wird
 *
 * Ereignisse:
 *   Lauscht : cb:game:start, cb:registry:ready, cb:res:change, cb:res:snapshot
 *   Sendet  : cb:hud-ready
 * =============================================================================
 */

(function(root, factory){
    root.UIHUD = factory();
})(typeof window !== "undefined" ? window : this, function(){

const TAG  = "[hud]";
const log  = (m)=> (window.CBLog?.info  || console.info)(`${TAG} ${m}`);
const ok   = (m)=> (window.CBLog?.ok    || console.log )( `${TAG} ${m}` );
const warn = (m)=> (window.CBLog?.warn  || console.warn)(`${TAG} ${m}`);

const $ = (s,ctx=document)=> ctx.querySelector(s);
const el = (tag,cls)=>{ const n=document.createElement(tag); if(cls) n.className=cls; return n; };

let INIT_DONE = false;
let HOST = null;

function getResourceValue(id){
    try{
        const v = Number(window.RegistryValues?.[id]);
        return Number.isFinite(v) ? v : 0;
    } catch {
        return 0;
    }
}

function defaultResources(){
    return [
        { id:'wood',  label:'Holz',    icon:'assets/icons/resources/wood.png',  value:getResourceValue('wood') },
        { id:'stone', label:'Stein',   icon:'assets/icons/resources/stone.png', value:getResourceValue('stone') },
        { id:'food',  label:'Nahrung', icon:'assets/icons/resources/food.png',  value:getResourceValue('food') },
        { id:'gold',  label:'Gold',    icon:'assets/icons/resources/gold.png',  value:getResourceValue('gold') }
    ];
}

function fromRegistry(){
    try{
        if (!window.Registry || typeof Registry.list !== "function") return null;
        const meta = Registry.list("resources") || [];
        if (!meta.length) return null;

        return meta.map(r=>({
            id:    String(r.id || "").trim(),
            label: String(r.label || r.id || "").trim(),
            icon:  r.icon || `assets/icons/resources/${r.id}.png`,
            value: getResourceValue(String(r.id || "").trim())
        }));
    } catch {
        return null;
    }
}

function render(host, model){
    host.innerHTML = "";

    model.forEach(r=>{
        const cell = el("div","hud__cell");
        cell.dataset.res = r.id;

        const title = el("div","hud__title");
        title.textContent = r.label;

        const wrap = el("div","hud__icon-wrap");
        const img  = el("img","hud__icon");
        img.src = r.icon;
        img.alt = r.label;
        wrap.appendChild(img);

        const val = el("div","hud__value");
        val.textContent = String(r.value ?? 0);

        cell.append(title, wrap, val);
        host.appendChild(cell);
    });
}

function patch(host, id, deltaOrAbs){
    const cell = host?.querySelector(`.hud__cell[data-res="${id}"]`);
    if (!cell) return;

    const valEl = cell.querySelector(".hud__value");
    const oldV  = Number(valEl.textContent || 0);

    const newV =
        typeof deltaOrAbs === "object" && typeof deltaOrAbs.value === "number"
            ? deltaOrAbs.value
            : typeof deltaOrAbs === "number"
                ? oldV + deltaOrAbs
                : oldV;

    valEl.textContent = String(newV);
    cell.classList.add("is-updated");
    setTimeout(()=> cell.classList.remove("is-updated"), 300);
}

function applySnapshot(resources){
    if (!HOST || !resources || typeof resources !== 'object') return;
    for (const [id, raw] of Object.entries(resources)){
        const value = Number(raw);
        if (!Number.isFinite(value)) continue;
        patch(HOST, id, {value});
    }
}

function init(){
    if (INIT_DONE){
        // Auch bei erneutem Lifecycle-Event aktuellen Store synchronisieren.
        applySnapshot(window.RegistryValues || {});
        ok("HUD schon aktiv – Werte synchronisiert");
        return;
    }
    INIT_DONE = true;

    let host = $("#hud-root");
    if (!host){
        host = el("div","hud");
        host.id = "hud-root";
        document.body.appendChild(host);
    } else {
        host.classList.add("hud");
    }
    HOST = host;

    const model = fromRegistry() || defaultResources();
    render(host, model);

    // Sicherstellen, dass bereits vor HUD-Init restaurierte Werte sichtbar werden.
    applySnapshot(window.RegistryValues || {});

    window.addEventListener("cb:res:change", ev=>{
        const d = ev.detail;
        if (!d?.res) return;

        if ("value" in d) patch(host, d.res, {value:d.value});
        else patch(host, d.res, d.delta ?? 0);
    });

    window.addEventListener("cb:res:snapshot", ev=>{
        const resources = ev?.detail?.resources || window.RegistryValues || {};
        applySnapshot(resources);
    });

    ok("bereit");
    window.dispatchEvent(new CustomEvent("cb:hud-ready",{ detail:{ ok:true } }));
}

return { init, applySnapshot };

});

window.addEventListener("cb:game:start",    ()=> window.UIHUD?.init(), {passive:true});
window.addEventListener("cb:registry:ready",()=> window.UIHUD?.init(), {passive:true});
window.addEventListener("cb:ui-ready",      ()=> window.UIHUD?.init(), {passive:true});

try {
  const uiReady  = !!window.__UI_READY_EMITTED__;
  const regReady = (window.Registry?.isReady?.() || window.Registry?.__ready);
  if (uiReady || regReady) {
    window.UIHUD?.init();
  }
} catch (ex) {
  console.warn('[hud] direkte Initialisierung fehlgeschlagen', ex);
}
