// Siedler‑Mini • Level‑Editor v1 (mit Atlas‑Support) — BOOT
// Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
// Projektvorgaben: Startfenster zuerst, Debug/Inspector drin lassen, keine entfernten Debug-Tools.

import { LevelEditor } from './editor.js';

// ————————————————————————————————————————————————
// Mini-Helfer: DOM-Query, Download, Fetch JSON
// ————————————————————————————————————————————————
const $ = (q, el=document)=> el.querySelector(q);

function downloadText(name, text){
  const a = document.createElement('a');
  a.download = name;
  a.href = URL.createObjectURL(new Blob([text], {type:'application/json'}));
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}
async function fetchJson(url){
  const r=await fetch(url);
  if(!r.ok) throw new Error(r.status+' '+url);
  return r.json();
}

// ————————————————————————————————————————————————
// Editor-Instanz erzeugen + UI verdrahten
// ————————————————————————————————————————————————
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
    // ATLAS (NEU)
    addAtlasJson: $('#addAtlasJson'), addAtlasImage: $('#addAtlasImage'),
    atlasPrefix: $('#atlasPrefix'), btnAddAtlas: $('#btnAddAtlas'),
    // Ebenen
    layerSel: $('#layerSel'), btnAddLayer: $('#btnAddLayer'), btnDelLayer: $('#btnDelLayer'),
    // entities
    entType: $('#entType'), entName: $('#entName'), btnEntAdd: $('#btnEntAdd'), entList: $('#entList'),
    // triggers
    trigName: $('#trigName'), btnTrigAdd: $('#btnTrigAdd'), trigList: $('#trigList'),
    // props
    mapW:$('#mapW'), mapH:$('#mapH'), tileSize:$('#tileSize'),
    btnResize:$('#btnResize'), btnCenter:$('#btnCenter'), propBox:$('#propBox'),
    // tabs
    tabs: document.querySelectorAll('.tab'),
    panels: { tilesTab:$('#tilesTab'), entitiesTab:$('#entitiesTab'), triggersTab:$('#triggersTab') }
  }
});

// ————————————————————————————————————————————————
// Start-Overlay: Neues Level / Bestehendes laden / Demo
// ————————————————————————————————————————————————
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

// ————————————————————————————————————————————————
// Header-Buttons: Öffnen/Speichern/Export
// ————————————————————————————————————————————————
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

// ————————————————————————————————————————————————
// Palette: Einzelbild laden (URL/Datei/Drag&Drop) — wie gehabt
// ————————————————————————————————————————————————
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

// Drag&Drop auf Tiles‑Panel (Bilder ODER Atlas‑JSON)
$('#tilesTab').ondragover = ev=>{ ev.preventDefault(); ev.dataTransfer.dropEffect='copy'; };
$('#tilesTab').ondrop = async ev=>{
  ev.preventDefault();
  const files = [...(ev.dataTransfer.files||[])];
  // Wenn ein JSON gedroppt wurde: versuchen, passendes Bild daneben mitzunehmen (heuristisch).
  const jsonFile = files.find(f=> f.name.toLowerCase().endsWith('.json'));
  const imgFile  = files.find(f=> f.type.startsWith('image/'));
  if(jsonFile && imgFile){
    const jsonTxt = await jsonFile.text();
    const imgUrl  = URL.createObjectURL(imgFile);
    await editor.addAtlasFromJson(jsonTxt, imgUrl, { imageName: imgFile.name, prefix: $('#atlasPrefix').value.trim()||'' });
    setTimeout(()=>URL.revokeObjectURL(imgUrl), 30000);
    return;
  }
  // Falls nur Bilder: normal als Tiles laden
  for(const f of files){
    if(!f.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(f);
    await editor.addTileFromUrl(url, f.name);
    setTimeout(()=>URL.revokeObjectURL(url), 30000);
  }
};

// ————————————————————————————————————————————————
// NEU: Atlas importieren (JSON + Bild)
// ————————————————————————————————————————————————
$('#btnAddAtlas').onclick = async ()=>{
  const jf = editor.ui.addAtlasJson.files?.[0];
  const im = editor.ui.addAtlasImage.files?.[0];
  if(!jf || !im){ alert('Bitte JSON und Bild auswählen.'); return; }
  const jsonTxt = await jf.text();
  const imgUrl = URL.createObjectURL(im);
  await editor.addAtlasFromJson(jsonTxt, imgUrl, { imageName: im.name, prefix: $('#atlasPrefix').value.trim()||'' });
  setTimeout(()=>URL.revokeObjectURL(imgUrl), 30000);
};

// ————————————————————————————————————————————————
// Tabs‑Schaltung + Modus setzen
// ————————————————————————————————————————————————
for(const tab of editor.ui.tabs){
  tab.onclick = ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    Object.values(editor.ui.panels).forEach(p=>p.classList.remove('active'));
    const id = tab.dataset.tab;
    editor.ui.panels[id].classList.add('active');
    if(id==='tilesTab') editor.setMode('tiles');
    if(id==='entitiesTab') editor.setMode('entities');
    if(id==='triggersTab') editor.setMode('triggers');
  };
}

// ————————————————————————————————————————————————
// Export (optional) – falls du es von extern importieren willst
// ————————————————————————————————————————————————
export { editor };
