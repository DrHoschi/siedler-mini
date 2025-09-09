/* ============================================================================
 * Game Bootstrap – minimaler Starter, damit Karte & Systeme hochfahren
 * Version: v17.8.3
 * - Registriert “cb:game-start” und lädt die Map aus <canvas data-map="...">
 * - Sendet Log-Marker wie in deinen bisherigen Logs
 * ========================================================================== */
(function(){
  const LOG = (lvl, msg, ...a) =>
    (window.CBLog && CBLog[lvl] ? CBLog[lvl] : console.log).call(null, `[bootstrap] ${msg}`, ...a);

  const canvas = document.getElementById('game');

  async function loadJSON(url){
    const res = await fetch(url, { cache:'no-store' });
    if(!res.ok) throw new Error(`Map laden fehlgeschlagen: ${res.status}`);
    return await res.json();
  }

  async function start(){
    try{
      const mapUrl = canvas?.dataset?.map;
      if(!mapUrl) throw new Error('Keine Map angegeben (data-map fehlt).');

      LOG('info', 'Modul geladen (v17.6.1)');
      const data = await loadJSON(mapUrl);

      // simple Hintergrundfarbe/“sichtbar machen”, bis Renderer übernimmt
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#243035';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#bdc3c7';
      ctx.font = '14px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillText(`Map geladen: ${mapUrl}`, 16, 24);

      // Signal an Renderer/Engine (deine bestehenden Module können darauf hören)
      window.dispatchEvent(new CustomEvent('cb:map-loaded', { detail:{ data } }));

      LOG('info', 'ready (v17.6.1) [Legacy-Bridge aktiv]');
    }catch(err){
      console.error(err);
      LOG('warn', 'Startfehler: ' + (err?.message || err));
    }
  }

  // Start wenn UI “Start” drückt:
  window.addEventListener('cb:game-start', start, { once: true });

  // Marker wie in deinen Logs:
  (window.CBLog?.info || console.log)('[bootstrap.tests] Test-Event-Bridge aktiv.');
})();
