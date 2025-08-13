const $ = (s)=>document.querySelector(s);

// Fullscreen
const isFull = () => document.fullscreenElement || document.webkitFullscreenElement;
const reqFS   = async () => { const el=document.documentElement; return (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.()); };
const exitFS  = async () => { return (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.()); };
const toggleFS= () => isFull()?exitFS():reqFS();

function showHUD(show){ $('#hudBar').style.opacity = show? '0.95':'0'; }

// Platzhalterbild bis Game startet
(function drawPH(){
  const c=$('#game'), DPR=Math.floor(devicePixelRatio||1), ctx=c.getContext('2d');
  const size=()=>{ const w=Math.floor(c.clientWidth*DPR),h=Math.floor(c.clientHeight*DPR); if(c.width!==w)c.width=w; if(c.height!==h)c.height=h; };
  size();
  ctx.fillStyle='#0f1823'; ctx.fillRect(0,0,c.width,c.height);
  ctx.save(); ctx.strokeStyle='rgba(255,255,255,.08)'; const st=64*DPR;
  for(let x=0;x<c.width;x+=st){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke();}
  for(let y=0;y<c.height;y+=st){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(c.width,y);ctx.stroke();}
  ctx.restore();
  ctx.fillStyle='#3ca14e';
  const rw=Math.min(c.width*.45,Math.max(220*DPR,c.width*.25)), rh=rw*.45;
  ctx.fillRect((c.width-rw)/2,(c.height-rh)/2+40*DPR,rw,rh);
  ctx.fillStyle='rgba(255,255,255,.92)'; ctx.font=`${48*DPR}px system-ui`; ctx.textAlign='center';
  ctx.fillText('HQ (Platzhalter)', c.width/2, (c.height/2)-10*DPR);
})();

// Fehlerdialog
function err(msg){ $('#errMsg').textContent=String(msg); $('#err').style.display='flex'; }
$('#errClose').onclick=()=>$('#err').style.display='none';

// Buttons
$('#fsBtn').onclick = toggleFS;
$('#btnFS').onclick = toggleFS;
$('#resetBtn').onclick = ()=>{ try{ localStorage.removeItem('sm_v146'); }catch{} location.reload(); };

let controller=null;

async function start(){
  try{
    const mod=await import('./game.js?v=14.6');
    const run=mod.run||mod.default?.run;
    if(typeof run!=='function') throw new Error('main.run() wurde nicht gefunden (Export fehlt?).');
    controller = await run({
      canvas: $('#game'),
      DPR: Math.floor(devicePixelRatio||1),
      onHUD: (k,v)=>{ const el=document.querySelector('#hud'+k); if(el) el.textContent=String(v); },
      onTool: (name)=>{ $('#hudTool').textContent='Tool: '+name; },
      onZoom: (z)=>{ $('#hudZoom').textContent=`Zoom ${z.toFixed(2)}x`; },
      onError: (m)=>err('Startfehler: '+m),
      onReady: ()=>{
        showHUD(true);
        document.querySelectorAll('.tools .tbtn').forEach(b=>b.disabled=false);
        $('#btnCenter').disabled=false;
        setActiveTool('pointer');
      }
    });
  }catch(e){ console.error(e); err(e.message||e); }
}

function setActiveTool(name){
  document.querySelectorAll('.tools .tbtn').forEach(b=>b.classList.toggle('active', b.dataset.tool===name));
}

$('#startBtn').onclick=async()=>{ $('#startCard').style.display='none'; await start(); };
$('#btnCenter').onclick = ()=>controller&&controller.center();
$('#btnDbg').onclick     = ()=>controller&&controller.toggleDebug();

document.querySelectorAll('.tools .tbtn').forEach(b=>{
  b.addEventListener('click', ()=>{
    if(!controller) return;
    const name=b.dataset.tool;
    controller.setTool(name);
    setActiveTool(name);
  });
});

// Doppeltipp auf Canvas -> Vollbild
let lastTap=0;
$('#game').addEventListener('pointerdown', ()=>{
  const t=performance.now(); if(t-lastTap<300) toggleFS(); lastTap=t;
});
