/* 
====================================================================================
Datei: assets/ui/ui-build.js
Projekt: Neue Siedler
Version: v17.9.13
Zweck: Bau-Dock – unten andocken, max. 1–2 Zeilen sichtbar, Rest scrollt.
Fixes:
- Items-Autoload: __buildItems → BuildAssets → Registry (mehrere Typnamen)
- Niemals „leer“: kleiner Fallback-Satz + deutliche Logs
- Events: cb:build:* UND legacy cb:build-* für komplette Kompatibilität
==================================================================================== */

var UI_BUILD_VERSION = "v17.9.13";
var ICON_SIZE_PX     = 64;
var MAX_VISIBLE_ROWS = 2;

function LOK(m){(window.CBLog?.ok||console.log)(`[ui-build] ${m}`);}
function LIN(m){(window.CBLog?.info||console.log)(`[ui-build] ${m}`);}
function LWR(m){(window.CBLog?.warn||console.warn)(`[ui-build] ${m}`);}
function LER(m){(window.CBLog?.error||console.error)(`[ui-build] ${m}`);}

function el(tag,cls,attrs){ var n=document.createElement(tag);
  if(cls)(Array.isArray(cls)?n.classList.add.apply(n.classList,cls):n.classList.add(cls));
  if(attrs) Object.keys(attrs).forEach(k=>n.setAttribute(k,attrs[k]));
  return n; }
function emit(n,d){ try{window.dispatchEvent(new CustomEvent(n,{detail:d||{}}));}catch(e){} }
function emitBoth(base,detail){ emit(`cb:${base}`,detail); emit(`cb:${base.replace(/:/g,"-")}`,detail); }

function group(items){
  var m=new Map();
  (items||[]).forEach(it=>{
    var c=it.category||"Allg. / Verwaltung";
    if(!m.has(c)) m.set(c,[]);
    m.get(c).push(it);
  });
  return m;
}

/* ------------------- Item-Quellen ------------------- */
function from__buildItems(){
  return Array.isArray(window.__buildItems) ? window.__buildItems.slice() : null;
}
function fromBuildAssets(){
  // Versuche mehrere Namenskonventionen
  var BA = window.BuildAssets || {};
  if (Array.isArray(BA.items)) return BA.items.slice();
  if (typeof BA.list === "function"){
    try{
      var list = BA.list("build") || BA.list("buildings") || BA.list("building");
      if(Array.isArray(list)) return list.slice();
    }catch(_){}
  }
  return null;
}
function fromRegistry(){
  var R = window.Registry;
  if(!R) return null;
  try{
    var tryTypes = ["buildings","building","b"];
    for (var i=0;i<tryTypes.length;i++){
      var t = tryTypes[i];
      var arr = R.list ? R.list(t) : null;
      if(Array.isArray(arr) && arr.length){
        // Normalisiere → {id,name,icon,category}
        return arr.map(function(x){
          var meta = x.meta || R.get?.(t, x.id) || {};
          return {
            id: x.id || meta.id,
            name: x.name || meta.name || x.id,
            icon: x.icon || meta.icon || meta.sprite || meta.image || guessIcon(x.id),
            category: x.category || meta.category || meta.cat || "Allg. / Verwaltung"
          };
        });
      }
    }
  }catch(_){}
  return null;
}
function guessIcon(id){
  // simple, aber hilfreiche Heuristik (deckt deine UI-Icons ab)
  return `assets/ui/build/${(id||"").replace(/^b[.\-:]/,"")}.png`;
}
function ensureItems(items){
  if(Array.isArray(items) && items.length) return items;
  LWR("Keine Items aus Datenquellen erhalten – nutze Fallback.");
  return [
    { id:"b.townhall", name:"Rathaus",   icon:guessIcon("rathaus"),  category:"Allg. / Verwaltung" },
    { id:"b.house",    name:"Wohnhaus",  icon:guessIcon("wohnhaus"), category:"Allg. / Verwaltung" },
    { id:"b.depot",    name:"Depot",     icon:guessIcon("depot"),    category:"Allg. / Verwaltung" },
    { id:"b.fisher",   name:"Fischer",   icon:guessIcon("fischer"),  category:"Produktion / Nahrung" }
  ];
}

/* ------------------- Klasse ------------------- */
function BuildDock(){
  this.root=null; this.grid=null; this.items=[]; this.isOpen=false;
}
BuildDock.prototype._findRoot=function(){
  var r=document.getElementById("build-dock")||document.getElementById("build-panel");
  if(!r){ r=el("div","ui-build-dock",{id:"build-dock","aria-label":"Bau-Menü"}); document.body.appendChild(r); }
  else { r.classList.add("ui-build-dock"); }
  return r;
};
BuildDock.prototype.init=function(){
  this.root=this._findRoot();
  var header=el("div","ui-build-header");
  var title=el("div","ui-build-title"); title.textContent="Bauen";
  var spacer=el("div","ui-build-spacer");
  var close=el("button",["ui-btn","ui-build-close"],{"aria-label":"Schließen (ESC/Back)"}); close.type="button"; close.textContent="✕";
  close.addEventListener("click",this.close.bind(this,"button"));
  header.append(title,spacer,close);

  var body=el("div","ui-build-body");
  this.grid=el("div","ui-build-grid",{id:"build-grid"});
  body.appendChild(this.grid);

  this.root.innerHTML=""; this.root.append(header,body);

  window.addEventListener("keydown",(ev)=>{ if(this.isOpen && ev.key==="Escape") this.close("esc"); });
  window.addEventListener("cb:back",()=>{ if(this.isOpen) this.close("back"); });
  window.addEventListener("resize",()=> this._applyMaxHeight());

  LOK("Modul geladen ("+UI_BUILD_VERSION+")");
};
BuildDock.prototype.setItems=function(items){ this.items=Array.isArray(items)?items:[]; this._render(); };
BuildDock.prototype.open=function(from){
  if(!this.root) this.init();
  this.isOpen=true; this.root.classList.add("is-open");
  this._applyMaxHeight();
  emitBoth("build:open",{from:from||"UI"});
  LIN("geöffnet");
};
BuildDock.prototype.close=function(reason){
  if(!this.root) return;
  this.isOpen=false; this.root.classList.remove("is-open");
  emitBoth("build:close",{reason:reason||"cancel"});
  emitBoth("build:cancel",{via:reason||"cancel"});
  LIN("geschlossen (reason="+(reason||"cancel")+")");
};
BuildDock.prototype._render=function(){
  if(!this.grid) return;
  this.grid.innerHTML="";
  var groups=group(this.items);
  if(groups.size===0){
    var empty=el("div","ui-build-empty"); empty.textContent="Keine Gebäude verfügbar.";
    this.grid.appendChild(empty); return;
  }
  groups.forEach((arr,cat)=>{
    var catEl=el("div","ui-build-category");
    var catHead=el("div","ui-build-category-title"); catHead.textContent=cat;
    var row=el("div","ui-build-category-row");
    arr.forEach((it)=> row.appendChild(this._makeCard(it)));
    catEl.append(catHead,row); this.grid.appendChild(catEl);
  });
};
BuildDock.prototype._makeCard=function(item){
  var btn=el("button",["ui-build-item","ui-card"]); btn.type="button"; btn.title=item.name||item.id;
  var imgW=el("div","ui-build-item-imgwrap");
  var img=el("img","ui-build-item-img",{loading:"lazy",decoding:"async"}); img.src=item.icon||item.sprite||item.image||guessIcon(item.id); img.alt=item.name||item.id||"building";
  var lbl=el("div","ui-build-item-label"); lbl.textContent=item.name||item.id;
  imgW.appendChild(img); btn.append(imgW,lbl);
  btn.addEventListener("click",()=>{ emit("cb:build:select",{buildingId:item.id}); LOK("select "+item.id); });
  return btn;
};
BuildDock.prototype._applyMaxHeight=function(){
  if(!this.root) return;
  var cs=getComputedStyle(document.documentElement);
  var safeB=Number((cs.getPropertyValue("--safe-area-bottom")||"").replace("px",""))||0;
  var cardH=Math.max(ICON_SIZE_PX+28,88), headerH=44, bodyPad=16;
  var maxH=headerH+(cardH*MAX_VISIBLE_ROWS)+bodyPad+safeB;
  this.root.style.setProperty("--build-dock-max-h", maxH+"px");
};

/* ------------------- API & Autoload ------------------- */
(function(){
  var _UI=new BuildDock();

  window.UIBuild={
    init: function(){ _UI.init(); },
    setItems: function(items){ _UI.setItems(items); },
    open: function(from){ _UI.open(from); },
    close: function(r){ _UI.close(r); },
    version: UI_BUILD_VERSION
  };

  document.addEventListener("DOMContentLoaded", function(){
    _UI.init();

    // 1) __buildItems
    var items = from__buildItems();
    // 2) BuildAssets
    if(!items) items = fromBuildAssets();
    // 3) Registry
    if(!items) items = fromRegistry();

    items = ensureItems(items);
    _UI.setItems(items);
    LOK("Items gesetzt ("+items.length+")");
  });

  // Hotkey „B“
  window.addEventListener("keydown", function(ev){
    if(ev.key && ev.key.toLowerCase()==="b") window.UIBuild.open("hotkey");
  });
})();
