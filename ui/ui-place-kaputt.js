/* ============================================================================
 * Datei   : ui/ui-place.js
 * Projekt : Neue Siedler (Place-Ghost UI)
 * Version : v1.4.0 (robustes Mounting, hoher z-index, Einmal-Confirm)
 * Events  : cb:place:preview  -> Position/Validität des Ghosts
 *           cb:place:confirm  -> bestätigt mit { id, gx, gy }
 *           cb:place:cancel   -> Abbruch
 * ============================================================================ */
(() => {
  const LOG = (window.CBLog?.ok || console.log).bind(console,'[ui-place]');
  const WARN= (window.CBLog?.warn|| console.warn).bind(console,'[ui-place]');
  let $host=null, $ok=null, $cancel=null, last={ id:null, gx:-1, gy:-1, invalid:true }, armed=false;

  function ensureHost(){
    if ($host) return;
    $host = document.createElement('div');
    $host.id = 'ui-place-glue';
    $host.setAttribute('aria-hidden','true');
    $host.innerHTML = `
      <button class="ok"    aria-label="Platzieren">✔</button>
      <button class="cancel"aria-label="Abbrechen">✖</button>
    `;
    Object.assign($host.style, {
      position:'absolute', left:'0px', top:'0px', zIndex: 9999,
      transform:'translate3d(0,0,0)', pointerEvents:'none'
    });
    document.body.appendChild($host);
    $ok     = $host.querySelector('.ok');
    $cancel = $host.querySelector('.cancel');
    styleButtons();
    $ok.addEventListener('click', onConfirm);
    $cancel.addEventListener('click', onCancel);
    LOG('mount ok');
  }

  function styleButtons(){
    const base = {
      position:'absolute', width:'44px', height:'44px', borderRadius:'10px',
      border:'1px solid rgba(0,0,0,.35)', boxShadow:'0 2px 8px rgba(0,0,0,.35)',
      pointerEvents:'auto', fontSize:'22px', lineHeight:'44px', cursor:'pointer',
      userSelect:'none'
    };
    Object.assign($ok.style,     base, { left:'8px',  top:'8px',  background:'rgba(40,140,80,.92)', color:'#fff' });
    Object.assign($cancel.style, base, { right:'8px', top:'8px',  background:'rgba(200,60,60,.92)', color:'#fff' });
  }

  function showAt(sx,sy,size, invalid){
    if (!$host) return;
    const pad=Math.max(8, Math.floor(size*0.15));
    $host.style.left = `${Math.round(sx - pad)}px`;
    $host.style.top  = `${Math.round(sy - pad)}px`;
    $host.style.width  = `${Math.round(size + pad*2)}px`;
    $host.style.height = `${Math.round(size + pad*2)}px`;
    $host.style.display = invalid ? 'none' : 'block';
  }

  function onPreview(ev){
    ensureHost();
    const d = ev?.detail||{};
    last = { id:d.id, gx:d.gx|0, gy:d.gy|0, invalid:!!d.invalid };
    // d.sx/sy/size kommen aus Game (Pixel im Canvas->Screen Raum)
    if (Number.isFinite(d.sx) && Number.isFinite(d.sy) && Number.isFinite(d.size)){
      showAt(d.sx, d.sy, d.size, !!d.invalid);
    }
    armed = !d.invalid;
  }

  function onConfirm(){
    if (!armed || last.invalid || last.id==null) return;
    armed = false; // Einmal-Confirm
    window.dispatchEvent(new CustomEvent('cb:place:confirm', { detail:{ id:last.id, gx:last.gx, gy:last.gy }}));
    $host.style.display='none';
