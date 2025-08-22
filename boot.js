/* boot.js – Basis-Bindings, UI-Wiring, Query-Params, Debug-Helfer */
(() => {
  const qs = new URLSearchParams(location.search);
  const qMap = qs.get('map');           // z.B. ?map=assets/maps/map-demo.json
  const qAuto = qs.get('autostart');    // ?autostart=1
  const qDebug = qs.get('debug');       // ?debug=1

  const $ = (id)=> document.getElementById(id);
  function log(...a){ console.log('[boot]', ...a); }
  function warn(...a){ console.warn('[boot]', ...a); }
  function err(...a){ console.error('[boot]', ...a); }

  // Debugbox-Helfer
  window.setDebug = window.setDebug || function(msg){
    const el = $('debugBox'); if (!el) return;
    el.removeAttribute('hidden'); el.textContent = String(msg||'');
  };

  // UI initialisieren, wenn DOM steht
  window.addEventListener('DOMContentLoaded', () => {
    const mapSel = $('mapSelect');
    const btnStart = $('btnStart');
    const btnReload = $('btnReload');
    const btnFullscreen = $('btnFullscreen');
    const btnToggleDebug = $('btnToggleDebug');
    const cbAuto = $('autoStart');

    // Query-Param „map“ anwenden
    if (qMap && mapSel) {
      // falls Option noch nicht existiert, hinzufügen
      if (![...mapSel.options].some(o=>o.value===qMap)) {
        const opt = document.createElement('option');
        opt.value = qMap; opt.textContent = qMap.split('/').pop();
        mapSel.appendChild(opt);
      }
      mapSel.value = qMap;
    }

    // Button-Events
    if (btnStart) btnStart.addEventListener('click', () => {
      const url = (mapSel && mapSel.value) || 'assets/maps/map-demo.json';
      log('Starte Karte:', url);
      if (window.GameLoader && typeof window.GameLoader.start === 'function') {
        const bust = url + (url.includes('?')?'&':'?') + 'v=' + Date.now();
        window.GameLoader.start(bust);
      } else {
        err('GameLoader.start fehlt – ist game.js geladen?');
        alert('GameLoader.start fehlt – bitte game.js prüfen.');
      }
    });

    if (btnReload) btnReload.addEventListener('click', () => location.reload());

    if (btnFullscreen) btnFullscreen.addEventListener('click', () => {
      const root = document.documentElement;
      if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
      else root.requestFullscreen().catch(()=>{});
    });

    if (btnToggleDebug) btnToggleDebug.addEventListener('click', () => {
      const el = $('debugBox'); if (!el) return;
      if (el.hasAttribute('hidden')) el.removeAttribute('hidden'); else el.setAttribute('hidden','');
    });

    // Auto-Debug via Query
    if (qDebug === '1' || qDebug === 'true') {
      $('debugBox')?.removeAttribute('hidden');
    }

    // Autostart aus Query/Checkbox
    const doAuto = (qAuto === '1' || qAuto === 'true') || (cbAuto && cbAuto.checked);
    if (doAuto && btnStart) {
      setTimeout(()=> btnStart.click(), 100);
    }

    log('UI bereit.');
  });

  // Versions-Badge ins Debug
  try {
    const today = new Date().toISOString().slice(0,10);
    setTimeout(()=> setDebug(`[Boot] Debug aktiv • v11.1r6–${today}`), 50);
  } catch(_) {}

})();
