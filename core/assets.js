// Lädt optionale Texturen. Wenn eine fehlt, wird im Renderer ein Farb-Fallback benutzt.
export const IM = {
  grass:null, water:null, shore:null
};
const LIST = [
  ['grass','assets/grass.png'],
  ['water','assets/water.png'],
  ['shore','assets/shore.png'],
];

export function loadAllAssets(){
  return Promise.all(LIST.map(([k,src])=> loadOne(k,src)));
}

function loadOne(key, src){
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>{ IM[key]=img; res(); };
    img.onerror=()=>{ console.warn('[assets] fehlend:', src); IM[key]=null; res(); };
    img.src=src;
  });
}
