// inspector.js – v16.1.17
// Kompakter Inspector mit Log-Konsole.
// Layout bleibt schlank; blockiert nur, wenn offen.

(function(){
  const V = 'v16.1.17';

  // DOM
  let root, box, pre, btnCopy, btnClear, btnClose, btnRetry;
  let isOpen = false;

  // Hilfs-Log
  function ts(){ const d=new Date(); return d.toTimeString().slice(0,8); }
  function line(type, msg){
    const icon = type==='ok'  ? '✅'
               : type==='err' ? '❌'
               : type==='warn'? '⚠️' : 'LOG';
    pre.textContent += `[${ts()}] ${icon} ${msg}\n`;
    pre.scrollTop = pre.scrollHeight;
  }

  // API → von außen nutzbar
  window.CBInspector = {
    open(){ ensure(); root.classList.remove('cb-inspector-closed'); root.style.display='block'; isOpen=true; },
    close(){ root.style.display='none'; isOpen=false; root.classList.add('cb-inspector-closed'); },
    toggle(){ (isOpen ? this.close : this.open).call(this); },
    log(type, msg){ ensure(); line(type, msg); },
    version(){ return V; }
  };

  function ensure(){
    if (root) return;

    // Root (Overlay)
    root = document.createElement('div');
    root.id = 'cb-inspector';
    root.className = 'cb-inspector-closed';
    Object.assign(root.style, {
      position:'fixed', left:0, top:0, width:'100vw', height:'100vh',
      background:'rgba(0,0,0,.75)', zIndex: 12000, display:'none'
    });
    // Panel
    box = document.createElement('div');
    Object.assign(box.style, {
      position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
      width:'min(100vw - 36px, 1000px)',
      background:'#0f1311', color:'#dfe9e2',
      border:'1px solid rgba(255,255,255,.12)', borderRadius:'12px',
      boxShadow:'0 20px 70px rgba(0,0,0,.55)'
    });

    // Header
    const head = document.createElement('div');
    head.style.display='flex'; head.style.alignItems='center'; head.style.justifyContent='space-between';
    head.style.padding='10px 12px'; head.style.borderBottom='1px solid rgba(255,255,255,.08)';
    const title = document.createElement('div');
    title.textContent = 'Inspector  ' + V;
    const tools = document.createElement('div');
    tools.style.display='flex'; tools.style.gap='8px';

    btnCopy = mkBtn('Log kopieren', ()=> {
      try {
        navigator.clipboard.writeText(pre.textContent||'');
        line('ok', 'Log in Zwischenablage');
      } catch(e){ line('err','Clipboard: '+e.message); }
    });
    btnClear = mkBtn('Log leeren', ()=> { pre.textContent=''; });
    btnRetry = mkBtn('Start (retry)', ()=> {
      const sel = document.querySelector('#map-select');
      const url = sel?.value || './assets/maps/map-mini.json';
      line('ok', 'Retry Start → ' + url);
      window.dispatchEvent(new CustomEvent('cb:retry-start', { detail:{ url } }));
    });
    btnClose = mkBtn('Schließen ✖', ()=> window.CBInspector.close());

    tools.append(btnCopy, btnClear, btnRetry, btnClose);
    head.append(title, tools);

    // Body/Log
    pre = document.createElement('pre');
    Object.assign(pre.style, { margin:0, padding:'12px', height:'70vh', overflow:'auto', font:'12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' });

    // Compose
    box.append(head, pre);
    root.appendChild(box);
    document.body.appendChild(root);

    // „geschlossen“ soll nicht klicken blocken
    root.classList.add('cb-inspector-closed');

    // Eigene Begrüßung
    line('ok', `Inspector bereit (inspector.js ${V})`);
    // Index-Ping, falls vorhanden:
    try { window.CBLog?.ok?.('UI bereit (index v16.1.17)'); } catch(_){}
  }

  function mkBtn(label, onClick){
    const b = document.createElement('button');
    b.textContent = label;
    Object.assign(b.style, {
      height:'32px', padding:'0 10px',
      background:'#1b2b22', color:'#e7f0ea',
      border:'1px solid rgba(255,255,255,.2)', borderRadius:'8px', cursor:'pointer'
    });
    b.addEventListener('click', onClick);
    return b;
  }

  // Global-Events verdrahten
  window.addEventListener('cb:ui-ready', ev => line('ok', `UI bereit (index ${ev?.detail?.v||'unbekannt'})`));
  window.addEventListener('cb:engine-ready', ev => line('ok', `game.js geladen, ${ev?.detail?.v||'unbekannt'}`));
  window.addEventListener('cb:game-started', ev => line('ok', `Event: cb:game-started empfangen`));
  window.addEventListener('cb:retry-start', ev => {
    const url = ev?.detail?.url;
    if (!url) return;
    if (!window.GameLoader?._start){
      line('warn','Engine noch nicht bereit – warte auf GameLoader.start …');
      setTimeout(()=>window.dispatchEvent(new CustomEvent('cb:retry-start',{detail:{url}})),250);
      return;
    }
    window.GameLoader._start(url).catch(e=> line('err', 'Retry fehlgeschlagen: '+(e?.message||e)));
  });

  // FAB-Hotkey (optional)
  window.addEventListener('keydown', e=>{
    if ((e.key==='i' || e.key==='I') && (e.ctrlKey||e.metaKey)) {
      window.CBInspector.toggle();
    }
  });

  // Initialisieren
  ensure();
})();
