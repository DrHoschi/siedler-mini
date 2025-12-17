/* =============================================================================
 * Datei   : ui/ui-hud.js
 * Projekt : Neue Siedler
 * Version : v25.11.17-ultra-final
 *
 * Zweck:
 *   HUD (Ressourcenleiste) vollständig erzeugen + aktualisieren.
 *   Alle HUD-DIVs werden HIER erzeugt – nichts im Build-Menü!
 *
 * Struktur pro Ressource (automatisch erzeugt):
 *
 *   <div class="hud__cell" data-res="wood">
 *     <div class="hud__title">Holz</div>
 *     <div class="hud__icon-wrap">
 *       <img class="hud__icon" src="assets/icons/resources/wood.png" alt="Holz">
 *     </div>
 *     <div class="hud__value">0</div>
 *   </div>
 *
 * Styling:
 *   kommt NUR aus ui-hud.css (Holzrahmen, Position, Scroll, Layout)
 *
 * Ereignisse:
 *   Lauscht : cb:game:start, cb:registry:ready, cb:res:change
 *   Sendet  : cb:hud-ready
 * =============================================================================
 */

(function(root, factory){
    root.UIHUD = factory();
})(typeof window !== "undefined" ? window : this, function(){

/* ---------------------------------------------------------------------------
 * Logging
 * ------------------------------------------------------------------------ */
const TAG  = "[hud]";
const log  = (m)=> (window.CBLog?.info  || console.info)(`${TAG} ${m}`);
const ok   = (m)=> (window.CBLog?.ok    || console.log )(`${TAG} ${m}`);
const warn = (m)=> (window.CBLog?.warn  || console.warn)(`${TAG} ${m}`);

/* ---------------------------------------------------------------------------
 * Hilfsfunktionen
 * ------------------------------------------------------------------------ */
const $ = (s,ctx=document)=> ctx.querySelector(s);
const el = (tag,cls)=>{ const n=document.createElement(tag); if(cls) n.className=cls; return n; };

let INIT_DONE = false;

/* ---------------------------------------------------------------------------
 * Default-Ressourcen (nur Epoche 1)
 * ------------------------------------------------------------------------ */
function defaultResources(){
    return [
        { id:'wood',  label:'Holz',    icon:'assets/icons/resources/wood.png',  value:0 },
        { id:'stone', label:'Stein',   icon:'assets/icons/resources/stone.png', value:0 },
        { id:'food',  label:'Nahrung', icon:'assets/icons/resources/food.png',  value:0 },
        { id:'gold',  label:'Gold',    icon:'assets/icons/resources/gold.png',  value:0 }
    ];
}

/* ---------------------------------------------------------------------------
 * Registry lesen (falls vorhanden)
 * ------------------------------------------------------------------------ */
function fromRegistry(){
    try{
        if (!window.Registry || typeof Registry.list !== "function") return null;
        const meta = Registry.list("resources") || [];
        if (!meta.length) return null;

        return meta.map(r=>({
            id:    String(r.id || "").trim(),
            label: String(r.label || r.id || "").trim(),
            icon:  r.icon || `assets/icons/resources/${r.id}.png`,
            value: 0
        }));
    } catch {
        return null;
    }
}

/* ---------------------------------------------------------------------------
 * HUD Zellen rendern
 * ------------------------------------------------------------------------ */
function render(host, model){
    host.innerHTML = "";

    model.forEach(r=>{
        const cell = el("div","hud__cell");
        cell.dataset.res = r.id;

        // Titel
        const title = el("div","hud__title");
        title.textContent = r.label;

        // Icon
        const wrap = el("div","hud__icon-wrap");
        const img  = el("img","hud__icon");
        img.src = r.icon;
        img.alt = r.label;
        wrap.appendChild(img);

        // Wert
        const val = el("div","hud__value");
        val.textContent = String(r.value ?? 0);

        // Zusammenfügen
        cell.append(title, wrap, val);
        host.appendChild(cell);
    });
}

/* ---------------------------------------------------------------------------
 * Einzel-Update (Wert ändern)
 * ------------------------------------------------------------------------ */
function patch(host, id, deltaOrAbs){
    const cell = host.querySelector(`.hud__cell[data-res="${id}"]`);
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

    // highlight
    cell.classList.add("is-updated");
    setTimeout(()=> cell.classList.remove("is-updated"), 300);
}

/* ---------------------------------------------------------------------------
 * Initialisierung
 * ------------------------------------------------------------------------ */
function init(){
    if (INIT_DONE){
        ok("HUD schon aktiv – init() übersprungen");
        return;
    }
    INIT_DONE = true;

    // Container suchen oder anlegen
    let host = $("#hud-root");
    if (!host){
        host = el("div","hud");
        host.id = "hud-root";
        document.body.appendChild(host);
    } else {
        host.classList.add("hud");
    }

    // Reihenfolge bestimmen
    const model = fromRegistry() || defaultResources();

    // Erste Zeichnung
    render(host, model);

    // Resource-Änderungen
    window.addEventListener("cb:res:change", ev=>{
        const d = ev.detail;
        if (!d?.res) return;

        if ("value" in d) patch(host, d.res, {value:d.value});
        else patch(host, d.res, d.delta ?? 0);
    });

    ok("bereit");
    window.dispatchEvent(new CustomEvent("cb:hud-ready",{ detail:{ ok:true } }));
}

/* ---------------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------------ */
return { init };

});

/* ---------------------------------------------------------------------------
 * Lifecycle Events – HUD aufbauen
 * ------------------------------------------------------------------------ */
window.addEventListener("cb:game:start",    ()=> window.UIHUD?.init(), {passive:true});
window.addEventListener("cb:registry:ready",()=> window.UIHUD?.init(), {passive:true});
