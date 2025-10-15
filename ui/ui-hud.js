/* =============================================================================
 * Datei   : ui/ui-hud.js
 * Projekt : Neue Siedler
 * Version : v1.8.1 (2025-10-14)
 * Zweck   : Ressourcen-HUD initialisieren & aktualisieren
 * API     : HUD.init({ bus, container, registry, fetchSnapshot })
 * Hinweise:
 *   - bus: dein Event-Bus (emit/on). Fallback: window.dispatchEvent / CustomEvent
 *   - container: optional; sonst erstellt HUD selbst <div class="hud">
 *   - registry: optional; wenn vorhanden: Reihenfolge & Labels von Ressourcen
 *   - fetchSnapshot(): async/Sync Funktion → {holz:0, stein:0, ...}
 * Events:
 *   - hört auf  'cb:registry:ready'  -> baut HUD
 *   - hört auf  'cb:res:change'      -> aktualisiert Menge/Highlight (Platzhalter)
 *   - emittiert 'cb:hud-ready'
 * Debug:
 *   - window.HUD = HUD  (für Inspector)
 * ============================================================================= */
(function(root,factory){
  root.HUD = factory();
})(typeof window!=="undefined"?window:this,function(){

  const DEFAULT_RESOURCES = [
    {id:"holz",   label:"Holz",   icon:"../../assets/icons/resources/wood.png"},
    {id:"stein",  label:"Stein",  icon:"../../assets/icons/resources/stone.png"},
    {id:"fisch",  label:"Fisch",  icon:"../../assets/icons/resources/fish.png"},
    {id:"nahrung",label:"Nahrung",icon:"../../assets/icons/resources/food.png"},
    {id:"gold",   label:"Gold",   icon:"../../assets/icons/resources/gold.png"},
    {id:"bev",    label:"Bev.",   icon:"../../assets/icons/resources/citizen.png"},
  ];

  const q = (sel,ctx=document)=>ctx.querySelector(sel);
  const el = (tag,cls)=>{ const n=document.createElement(tag); if(cls) n.className=cls; return n; };

  function ensureBus(bus){
    if(bus) return bus;
    // Sehr kleiner Fallback-Bus auf DOM-Basis
    return {
      on(type,fn){ window.addEventListener(type,(e)=>fn(e.detail||e)); },
      emit(type,detail){ window.dispatchEvent(new CustomEvent(type,{detail})); }
    };
  }

  function buildCells(container, resList){
    container.innerHTML = "";
    resList.forEach(r=>{
      const cell  = el("div","hud__cell");
      const title = el("p","hud__title"); title.textContent = r.label;
      const wrap  = el("div","hud__icon-wrap");
      const icon  = el("img","hud__icon"); icon.alt = r.label; icon.src = r.icon;

      wrap.appendChild(icon);
      cell.appendChild(title);
      cell.appendChild(wrap);
      container.appendChild(cell);
    });
  }

  function HUD_init(opts={}){
    const bus   = ensureBus(opts.bus);
    const host  = opts.container || (function(){
      let n = q(".hud");
      if(!n){ n = el("div","hud"); document.body.appendChild(n); }
      return n;
    })();

    // Ressourcenliste: Registry bevorzugt
    const resources = (opts.registry && Array.isArray(opts.registry.resources))
      ? opts.registry.resources.map(r=>({
          id: r.id, label: r.label || r.id,
          icon: (r.icon || (r.id && `assets/ui/icons/${r.id}.png`))
        }))
      : DEFAULT_RESOURCES;

    buildCells(host, resources);

    // Optional: Startwerte besorgen (Snapshot)
    if (typeof opts.fetchSnapshot === "function"){
      try{
        const snap = opts.fetchSnapshot() || {};
        // Hier könntest du Mengen-Overlays/Badges setzen (später)
        // aktuell bewusst weggelassen: reine Icon-/Layout-Validierung
      }catch(e){ console.warn("[HUD] snapshot failed:", e); }
    }

    // Hooks
    bus.on("cb:registry:ready", ()=>{ /* wenn Registry später lädt -> neu aufbauen */
      buildCells(host, resources);
    });
    bus.on("cb:res:change", (payload)=>{
      // Platzhalter für zukünftige Mengen-/Highlight-Updates
      // console.debug("[HUD] res change", payload);
    });

    bus.emit("cb:hud-ready", { ok:true });
    return { bus, host, resources };
  }

  return { init: HUD_init };
});
