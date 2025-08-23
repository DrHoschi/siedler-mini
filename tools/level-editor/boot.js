// Siedler‑Mini • Level‑Editor v1 — BOOT
// Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports

// Imports
import { LevelEditor } from './editor.js';

// Konstanten
const $ = (q, el=document)=> el.querySelector(q);

// Hilfsfunktionen
function downloadText(name, text){
  const a = document.createElement('a');
  a.download = name;
  a.href = URL.createObjectURL(new Blob([text], {type:'application/json'}));
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}
async function fetchJson(url){ const r=await fetch(url); if(!r.ok) throw new Error(r.status+' '+url); return r.json(); }

// Hauptlogik
const editor = new LevelEditor({
  canvas: $('#cv'),
  inspector: $('#inspector'),
  status: { msg:$('#stMsg'), xy:$('#stXY'), sel:$('#stSel'), layer:$('#stLayer') },
  ui: {
    // global
    chkGrid: $('#chkGrid'), chkColl: $('#chkColl'), chkSnap: $('#chkSnap'),
    mode: $('#mode'), tool: $('#tool'), brush: $('#brush'),
    // map
    tileRow: $('#tileRow'),
    addUrl: $('#addUrl'), btnAddUrl: $('#btnAddUrl'), addFile: $('#addFile'),
    layerSel: $('#layerSel'), btnAddLayer: $('#btnAddLayer'), btnDelLayer: $('#btnDelLayer'),
    // entities
    entType: $('#entType'), entName: $('#entName'), btnEntAdd: $('#btnEntAdd'), entList: $('#entList'),
    // triggers
    trigName: $('#trigName'), btnTrigAdd: $('#btnTrigAdd'), trigList: $('#trigList'),
    // props
    mapW:$('#mapW'), mapH:$('#mapH'), tileSize:$('#tileSize'),
    btnResize:$('#btnResize'), btnCenter:$('#btnCenter'), propBox:$('#propBox'),
    // tabs
    tabs: document.querySelectorAll('.tab'), panels: { tilesTab:$('#tilesTab'), entitiesTab:$('#entitiesTab'), triggersTab:$('#triggersTab') }
  }
});

// Start-Overlay
const start = $('#start');
$('#startBlank').onclick = ()=> bootNew();
$('#startLoad' ).onclick = ()=> $('#btnOpen').click();
$('#startDemo' ).onclick = async ()=>{
  try {
    const json = await fetchJson('../../assets/maps/map-demo.json');
    editor.load(json); start.remove();
  } catch(e){ alert('Demo nicht gefunden: assets/maps/map-demo.json'); }
};
function bootNew(){
  const w=+$('#startW').value||32, h=+$('#startH').value||18, t=+$('#startT').value||64;
  editor.createBlank(w,h,t);
  start.remove();
}

// Header‑Buttons
$('#btnNew').onclick = bootNew;
$('#btnOpen').onclick = ()=>{
  const inp = Object.assign(document.createElement('input'), {type:'file', accept:'.json,application/json'});
  inp.onchange = async ()=>{
    const file = inp.files?.[0]; if(!file) return;
    const json = JSON.parse(await file.text());
    editor.load(json); start?.remove?.();
  };
  inp.click();
};
$('#btnSave').onclick = ()=>{
  const json = editor.export();
  downloadText((json?.meta?.title||'level')+'.json', JSON.stringify(json,null,2));
};
$('#btnExportPng').onclick = ()=> editor.exportPng();

// Palette: URL/Datei/DragDrop
$('#btnAddUrl').onclick = ()=> {
  const url = $('#addUrl').value.trim(); if(!url) return;
  editor.addTileFromUrl(url);
  $('#addUrl').value='';
};
$('#addFile').onchange = async ev=>{
  const f = ev.target.files?.[0]; if(!f) return;
  const url = URL.createObjectURL(f);
  await editor.addTileFromUrl(url, f.name);
  setTimeout(()=>URL.revokeObjectURL(url), 30000);
};
$('#tilesTab').ondragover = ev=>{ ev.preventDefault(); ev.dataTransfer.dropEffect='copy'; };
$('#tilesTab').ondrop = ev=>{
  ev.preventDefault();
  [...(ev.dataTransfer.files||[])].forEach(async f=>{
    if(!f.type.startsWith('image/')) return;
    const url = URL.createObjectURL(f);
    editor.addTileFromUrl(url, f.name);
    setTimeout(()=>URL.revokeObjectURL(url), 30000);
  });
};

// Tabs
for(const tab of editor.ui.tabs){
  tab.onclick = ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    Object.values(editor.ui.panels).forEach(p=>p.classList.remove('active'));
    const id = tab.dataset.tab;
    editor.ui.panels[id].classList.add('active');
    // Modus passend setzen
    if(id==='tilesTab') editor.setMode('tiles');
    if(id==='entitiesTab') editor.setMode('entities');
    if(id==='triggersTab') editor.setMode('triggers');
  };
}

// Exports (optional)
export { editor };
