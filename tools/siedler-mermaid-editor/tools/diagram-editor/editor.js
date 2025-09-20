/* Diagramm-Editor JS (siehe Chat) */
const MOD = "[diagram-editor]";
const LS_KEY = "siedler.mmd.project.v1";
const DEFAULT_MMD =
`%% Beispiel: Figuren & Items Epoche 1
flowchart LR
  villager["Dorfbewohner"] -->|wird| porter["Träger"]
  villager -->|wird| lumber["Holzfäller"]
  villager -->|wird| fisher["Fischer"]
  villager -->|wird| mason["Steinmetz"]
  lumber -->|produziert| wood["Holzstamm"]
  fisher -->|produziert| fish["Fisch"]
  mason  -->|produziert| stone["Steinblock"]
  porter -->|transportiert| wood
  porter -->|transportiert| fish
  porter -->|transportiert| stone
`;
const DEFAULT_PROJECT = { name:"Epoche-1 Schemata", files:[{ id:"figuren_ep1", name:"04_figuren_epoche1.mmd", content:DEFAULT_MMD, updatedAt:Date.now() }], active:"figuren_ep1", css:"/* Labels größer */\\n.mermaid svg .label { font-size: 12px; }\\n", theme:"dark", maxWidth:2048, scale:1.0 };
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const log=(...a)=>{console.log(MOD,...a); const pre=$("#log"); if(pre) pre.textContent+=`[${new Date().toLocaleTimeString()}] ${a.join(" ")}\\n`;};
function saveToFile(name,text,type="text/plain"){const b=new Blob([text],{type});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3);}
function downloadSVG(svgEl,name){const svg=new XMLSerializer().serializeToString(svgEl);saveToFile(name,svg,"image/svg+xml;charset=utf-8");}
async function downloadPNG(svgEl,name,{width}){const svg=new XMLSerializer().serializeToString(svgEl);const img=new Image();const u=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));await new Promise(res=>{img.onload=()=>res(); img.src=u;});const scale=width?width/img.width:1;const c=document.createElement("canvas");c.width=Math.floor(img.width*scale);c.height=Math.floor(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);c.toBlob(b=>{const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3);URL.revokeObjectURL(u);},"image/png");}
function uid(){return Math.random().toString(36).slice(2,10);}
function readFileAsText(file){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result||""));fr.onerror=reject;fr.readAsText(file,"utf-8");});}
class ProjectStore{static load(){try{const raw=localStorage.getItem(LS_KEY);if(!raw) return structuredClone(DEFAULT_PROJECT);const o=JSON.parse(raw);return {...structuredClone(DEFAULT_PROJECT),...o};}catch(e){log("warn load failed; using default",e);return structuredClone(DEFAULT_PROJECT);} } static save(p){localStorage.setItem(LS_KEY, JSON.stringify(p)); log("saved project",p.name);} }
class MermaidRenderer{constructor(){this.initialized=false;} init(theme,maxWidth,scale){ if(window.mermaid && !this.initialized){ window.mermaid.initialize({startOnLoad:false,theme,securityLevel:"loose",logLevel:"error",maxTextSize:1e7}); this.initialized=true;} $("#preview").style.setProperty("--maxw",`${maxWidth}px`); $("#preview-split").style.setProperty("--maxw",`${maxWidth}px`); this.scale=scale;} async render(code,target){ if(!window.mermaid) throw new Error("Mermaid nicht geladen"); const c=document.createElement("div"); c.className="mermaid"; c.style.transform=`scale(${this.scale})`; c.style.transformOrigin="top left"; c.textContent=code; target.replaceChildren(c); try{ await window.mermaid.run({nodes:[c]}); }catch(e){ const pre=document.createElement("pre"); pre.textContent=`⚠ Render-Fehler:\\n${String(e)}`; target.replaceChildren(pre); throw e; } } }
window.addEventListener("DOMContentLoaded",()=>{
  const store=ProjectStore.load(); const renderer=new MermaidRenderer();
  const startPanel=$("#start-panel"); const ta=$("#ta-mmd"); const taSplit=$("#ta-mmd-split"); const preview=$("#preview"); const previewSplit=$("#preview-split"); const cssTa=$("#ta-css"); const customCss=$("#custom-css");
  $("#inp-project-name").value=store.name; $("#sel-theme").value=store.theme; $("#inp-maxw").value=store.maxWidth; $("#inp-scale").value=store.scale; cssTa.value=store.css;
  function refreshFileList(){ const ul=$("#file-list"); ul.replaceChildren(); for(const f of store.files){ const li=document.createElement("li"); li.className=f.id===store.active?"active":""; const name=document.createElement("span"); name.className="name"; name.textContent=f.name; const actions=document.createElement("span"); const btnSel=document.createElement("button"); btnSel.textContent="Öffnen"; btnSel.onclick=()=>{store.active=f.id; loadActive();}; const btnDel=document.createElement("button"); btnDel.textContent="✕"; btnDel.title="Löschen"; btnDel.onclick=()=>{const idx=store.files.findIndex(x=>x.id===f.id); if(idx>=0){store.files.splice(idx,1); if(!store.files.length) addNewFile(); store.active=store.files[0].id; ProjectStore.save(store); refreshFileList(); loadActive();}}; actions.append(btnSel,btnDel); li.append(name,actions); ul.append(li);} }
  function addNewFile(name="diagram.mmd", content="flowchart LR\\n  A-->B\\n"){ const file={id:uid(), name, content, updatedAt:Date.now()}; store.files.push(file); store.active=file.id; ProjectStore.save(store); refreshFileList(); loadActive(); }
  function loadActive(){ const f=store.files.find(x=>x.id===store.active); if(!f) return; ta.value=f.content; taSplit.value=f.content; refreshFileList(); $("#status").textContent=`Bearbeite: ${f.name}`; renderAll(); }
  function autosave(){ const f=store.files.find(x=>x.id===store.active); if(!f) return; f.content=ta.value; f.updatedAt=Date.now(); store.name=$("#inp-project-name").value||store.name; store.theme=$("#sel-theme").value; store.maxWidth=Number($("#inp-maxw").value)||store.maxWidth; store.scale=Number($("#inp-scale").value)||store.scale; store.css=cssTa.value; ProjectStore.save(store); }
  async function renderAll(){ renderer.init(store.theme, store.maxWidth, store.scale); customCss.textContent=store.css||""; try{ await renderer.render(ta.value, preview); await renderer.render(taSplit.value, previewSplit);}catch(e){ log("render error", e);} }
  if(!store.files?.length) ProjectStore.save(DEFAULT_PROJECT); refreshFileList(); loadActive();
  $("#btn-new").onclick=()=>{startPanel.style.display="none"; addNewFile("diagram.mmd", DEFAULT_MMD);};
  $("#file-open").onchange=async (ev)=>{ const file=ev.target.files?.[0]; if(!file) return; const text=await readFileAsText(file); startPanel.style.display="none"; addNewFile(file.name, text); };
  $("#btn-continue").onclick=()=>{ startPanel.style.display="none"; };
  $("#btn-theme").onclick=()=>{ document.documentElement.classList.toggle("light"); autosave(); renderAll(); };
  $("#btn-kiosk").onclick=()=>{ document.documentElement.classList.toggle("kiosk"); };
  $$("#tabs .tab").forEach(btn=>{ btn.onclick=()=>{ $$("#tabs .tab").forEach(b=>b.classList.remove("active")); btn.classList.add("active"); $$(".tabpane").forEach(p=>p.classList.remove("active")); $(btn.dataset.target).classList.add("active"); renderAll(); }; });
  $("#btn-save-project").onclick=()=>{ autosave(); log("Projekt gespeichert"); };
  $("#btn-export-project").onclick=()=>{ const f=store.files.find(x=>x.id===store.active); if(f) saveToFile(f.name, f.content, "text/plain;charset=utf-8"); };
  $("#inp-project-name").oninput=autosave;
  $("#btn-file-new").onclick=()=>addNewFile("diagram.mmd","flowchart LR\\n  A-->B\\n");
  $("#btn-file-import").onclick=()=>$("#file-open").click();
  $("#btn-file-download").onclick=()=>{ const f=store.files.find(x=>x.id===store.active); if(f) saveToFile(f.name, f.content, "text/plain;charset=utf-8"); };
  $("#btn-render").onclick=renderAll;
  $("#sel-theme").onchange=()=>{ autosave(); renderAll(); };
  $("#inp-maxw").onchange=()=>{ autosave(); renderAll(); };
  $("#inp-scale").onchange=()=>{ autosave(); renderAll(); };
  $("#btn-export-svg").onclick=()=>{ const svg=$("svg",preview)||$("svg",previewSplit); if(svg) downloadSVG(svg,"diagram.svg"); };
  $("#btn-export-png").onclick=async ()=>{ const svg=$("svg",preview)||$("svg",previewSplit); if(svg) await downloadPNG(svg,"diagram.png",{ width:Number($("#inp-maxw").value)||2048 }); };
  $("#btn-css-apply").onclick=()=>{ autosave(); renderAll(); };
  const onEdit=()=>{ autosave(); renderAll(); };
  $("#ta-mmd").addEventListener("input", onEdit);
  $("#ta-mmd-split").addEventListener("input", onEdit);
  for(const el of [$("#ta-mmd"), $("#ta-mmd-split"), $("#preview"), $("#preview-split")]){
    el.addEventListener("dragover", e=>{e.preventDefault();});
    el.addEventListener("drop", async e=>{e.preventDefault(); const file=e.dataTransfer?.files?.[0]; if(!file) return; const text=await readFileAsText(file); $("#ta-mmd").value=text; $("#ta-mmd-split").value=text; onEdit();});
  }
  $("#btn-inspector").onclick=()=>$("#inspector").classList.remove("hidden");
  $("#btn-insp-close").onclick=()=>$("#inspector").classList.add("hidden");
  if(new URLSearchParams(location.search).get("kiosk")==="1") document.documentElement.classList.add("kiosk");
});
