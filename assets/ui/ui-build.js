<!-- Ablage: ./assets/ui/ui-build.js -->
<script>
/**
 * ui-build.js  v16.1.18
 * -----------------------------------------------------------
 * Minimal-Bau-UI mit globaler API `window.UIBuild`.
 * Nutzt vorhandene DOM-Knoten:
 *  - #build-dock   (Container unten)
 *  - #btn-build    (Floating Button links unten)
 * Tool-Liste ist klein und erweiterbar. Icons optional.
 */
(function(){
  const V = "v16.1.18";
  const log = (lvl,msg)=>{
    try{
      if (window.CBLog){
        const f = window.CBLog[lvl] || window.CBLog.ok;
        f(`${msg} (ui-build.js ${V})`);
      }else{
        console[lvl==="err"?"error":lvl==="warn"?"warn":"log"](`[ui-build] ${msg}`);
      }
    }catch(_){}
  };

  const dock = document.getElementById("build-dock");
  if (!dock){
    log("err","Build-Dock (#build-dock) fehlt – bitte index.html prüfen.");
    return;
  }

  // — Werkzeuge definieren (Name, id, optional Icon) —
  const TOOLS = [
    { id:"road",      label:"Straße",  icon:"./assets/tex/road/topdown_road_straight.png" },
    { id:"path",      label:"Weg",     icon:"./assets/tex/path/topdown_path0.PNG" },
    { id:"bulldozer", label:"Abreißen"},
    { id:"wood0",     label:"Rathaus (Holz)", icon:"./assets/tex/building/Holz_Rathaus_1.png" },
    { id:"cancel",    label:"Abbrechen" }
  ];

  // — State —
  let isOpen = false;
  let active = null;

  // — DOM befüllen —
  const row = document.createElement("div");
  row.className = "row";
  TOOLS.forEach(t=>{
    const b = document.createElement("button");
    b.className = "tool";
    b.dataset.tool = t.id;
    b.title = t.label;
    if (t.icon){
      const img = document.createElement("img");
      img.alt = t.label;
      img.src = t.icon;           // Icons dürfen fehlen; dann bleibt nur Text
      b.appendChild(img);
    }else{
      b.textContent = t.label;
    }
    b.addEventListener("click", ()=>{
      setTool(t.id);
    }, {passive:true});
    row.appendChild(b);
  });
  dock.appendChild(row);

  function markActive(){
    [...dock.querySelectorAll(".tool")].forEach(el=>{
      el.classList.toggle("active", el.dataset.tool===active);
    });
  }

  function setTool(id){
    active = id;
    markActive();
    // An Spiel melden, falls es zuhört:
    try { window.dispatchEvent(new CustomEvent("cb:tool-changed",{detail:{tool:id}})); } catch(_){}
    // kompatibel zu älteren Stellen:
    try { window.Game?.setTool?.(id); } catch(_){}
    log("ok", `Tool gesetzt: ${id}`);
  }

  function open(){
    if (isOpen) return;
    isOpen = true;
    dock.classList.add("open");
    log("ok","Bau-Menü geöffnet");
  }

  function close(){
    if (!isOpen) return;
    isOpen = false;
    dock.classList.remove("open");
    log("ok","Bau-Menü geschlossen");
  }

  // — Public API —
  window.UIBuild = {
    version: V,
    open, close, setTool,
    isOpen: ()=> isOpen,
    getActive: ()=> active
  };

  log("ok","Bau-Menü bereit");
})();
</script>
