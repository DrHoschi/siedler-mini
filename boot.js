// Siedler‑Mini — BOOT/GLUE v11.1r6
// - HUD Buttons verdrahten (Start/Reload/Debug/Save/FS)
// - Map‑Auswahl füllen, Auto‑Start, Query-Param ?map=…
// - Version/Boost-ID ins Badge + ins Debug-Overlay
// - arbeitet nur mit window.* APIs (kein ES‑Modul)

(function(){
  const VERSION = '11.1r6';
  const BUST = (() => {
    const d = new Date(), p = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  })();

  // DOM
  const $ = s => document.querySelector(s);
  const els = {
    stage: $('#stage'), dbg: $('#debugOverlay'), badge: $('#badge'),
    btnStart: $('#btnStart'), btnReload: $('#btnReload'),
    btnDebug: $('#btnDebug'), btnSave: $('#btnSaveDebug'), btnFS: $('#btnFullscreen'),
    map: $('#mapSelect'), auto: $('#autoStart')
  };

  // Badge + Debug‑Banner
  function updateBadge(){
    if (els.badge) els.badge.textContent = `V${VERSION} • ${BUST}`;
    if (typeof window.setDebug === 'function') {
      window.setDebug(`[Boot ${VERSION}] bereit (${BUST})`);
    } else if (els.dbg) {
      els.dbg.style.display = 'block';
      els.dbg.textContent = `[Boot ${VERSION}] bereit (${BUST})`;
    }
  }

  // Debug toggle
  function setDebugVisible(on){
    document.body.classList.toggle('debug-on', !!on);
    localStorage.setItem('sm:debugOn', on ? '1' : '0');
    if (typeof window.setDebug === 'function') window.setDebug(on ? `[Boot ${VERSION}] Debug aktiv …` : '');
  }
  function getDebugVisible(){ return localStorage.getItem('sm:debugOn') === '1'; }

  // Vollbild
  const isFS  = () => document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
  const enter = el => (el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen||el.mozRequestFullScreen).call(el);
  const exit  = ()  => (document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen||document.m
