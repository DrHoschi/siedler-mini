// Siedler‑Mini V15.1.0 — BOOT/GLUE (UMD, kein ES-Import)
(() => {
  const VERSION = '15.1.0';
  const BUST = (() => {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  })();

  const $ = s => document.querySelector(s);

  const els = {
    stage: $('#stage'), dbg: $('#debugOverlay'), badge: $('#badge'),
    btnStart: $('#btnStart'), btnReload: $('#btnReload'),
    btnDebug: $('#btnDebug'), btnSave: $('#btnSaveDebug'), btnFS: $('#btnFullscreen'),
    map: $('#mapSelect'), auto: $('#autoStart'),
    spawnC: $('#btnSpawnCarrier'), spawnL: $('#btnSpawnLumberjack'), spawnS: $('#btnSpawnStone'),
    btnPause: $('#btnPause'), btnPaths: $('#btnPaths'),
    toast: $('#toast')
  };

  // Kartenliste hier verwalten
  const MAPS = [
    { label: 'map-demo.json',       url: 'assets/maps/map-demo.json' },
    { label: 'map-pro.json',        url: 'assets/maps/map-pro.json' },
    { label: 'map-checker-16x16',   url: 'assets/maps/map-checker-16x16.json' }
  ];

  // Badge
  function updateBadge(){
    if (els.badge) els.badge.textContent = `V${VERSION} • ${BUST}`;
    if (typeof window.setDebug === 'function') {
      window.setDebug(`[Boot ${VERSION}] bereit (${BUST})`);
    } else if (els.dbg) {
      els.dbg.style.display = 'block';
      els.dbg.textContent = `[Boot ${VERSION}] bereit (${BUST})`;
    }
  }

  // Toast
  function toast(msg){
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.style.display = 'block';
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> els.toast.style.display='none', 4200);
  }
  window.addEventListener('error', e => toast('JS‑Fehler: ' + (e.message || e.error || e)));
  window.addEventListener('unhandledrejection', e => toast('Promise‑Fehler: ' + (e.reason?.message || e.reason)));

  // Debug an/aus
  function setDebugVisible(on){
    document.body.classList.toggle('debug-on', !!on);
    localStorage.setItem('sm:debugOn', on ? '1' : '0');
    if (typeof window.setDebug === 'function') window.setDebug(on ? `[Boot ${VERSION}] Debug aktiv …` : '');
  }
  function getDebugVisible(){ return localStorage.getItem('sm:debugOn') === '1'; }

  // Vollbild
  const isFS = ()=> document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
  const enterFS = el => (el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen||el.mozRequestFullScreen).call(el);
  const exitFS  = ()=> (document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen||document.mozCancelFullScreen).call(document);

  // Map Select
  function fillMaps(){
    if (!els.map) return;
    els.map.innerHTML = '';
    for (const m of MAPS){
      const o = document.createElement('option'); o.value = m.url; o.textContent = m.label; els.map.appendChild(o);
    }
    const last = localStorage.getItem('sm:lastMap');
    if (last && [...els.map.options].some(o=>o.value===last)) els.map.value = last;
  }

  // Start
  function startSelectedMap(){
    const url = els.map?.value;
    if (!url) return;
    if (window.GameLoader?.start) window.GameLoader.start(url);
    window.dispatchEvent(new CustomEvent('ui:start', { detail:{ map:url }}));
  }

  // Wire Buttons
  els.btnStart?.addEventListener('click', startSelectedMap);
  els.map?.addEventListener('change', ()=> localStorage.setItem('sm:lastMap', els.map.value));
  els.btnReload?.addEventListener('click', ()=>{
    const u = new URL(location.href);
    u.searchParams.set('v', `V${VERSION}-${BUST}`);
    location.replace(u.toString());
  });
  els.btnDebug?.addEventListener('click', ()=> setDebugVisible(!getDebugVisible()));
  window.addEventListener('keydown', e => { if (e.code==='F2') setDebugVisible(!getDebugVisible()); });

  els.btnSave?.addEventListener('click', ()=>{
    if (window.SM_DEBUG?.saveLog) window.SM_DEBUG.saveLog();
    else {
      const txt = els.dbg?.textContent || '[kein Debug verfügbar]';
      const blob = new Blob([txt], {type:'text/plain;charset=utf-8'});
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `siedler-mini-debug-${Date.now()}.txt`; a.click(); URL.revokeObjectURL(url);
    }
  });

  els.btnFS?.addEventListener('click', ()=> { if (isFS()) exitFS(); else enterFS(document.documentElement); });

  els.auto?.addEventListener('change', ()=> localStorage.setItem('sm:autoStart', els.auto.checked ? '1':'0'));

  // Actor‑Buttons (rufen Public‑API aus game.js)
  els.spawnC?.addEventListener('click', ()=> window.SM?.spawn?.('carrier'));
  els.spawnL?.addEventListener('click', ()=> window.SM?.spawn?.('lumberjack'));
  els.spawnS?.addEventListener('click', ()=> window.SM?.spawn?.('stonemason'));
  els.btnPause?.addEventListener('click', ()=> window.SM?.pause?.());
  els.btnPaths?.addEventListener('click', ()=> window.SM?.paths?.());

  // Restore + Autostart
  (function restore(){
    fillMaps();
    const dbgOn = getDebugVisible(); setDebugVisible(dbgOn);
    if (localStorage.getItem('sm:autoStart') === '1' && els.auto) els.auto.checked = true;
    updateBadge();
    if (els.auto?.checked && els.map?.value){
      setTimeout(startSelectedMap, 80);
    }
  })();
})();
