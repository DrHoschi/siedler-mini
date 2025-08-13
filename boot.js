// boot.js  v14.2
(() => {
  const $ = (s) => document.querySelector(s);

  document.addEventListener('DOMContentLoaded', () => {
    $('#startBtn')?.addEventListener('click', startGame);
    $('#fsBtn')?.addEventListener('click', toggleFullscreen);
    $('#fsBtnTop')?.addEventListener('click', toggleFullscreen);
    $('#resetBtn')?.addEventListener('click', hardReload);
    $('#centerBtn')?.addEventListener('click', () => window.main?.center());
    $('#dbgBtn')?.addEventListener('click', () => window.main?.toggleDebug());

    // Doppeltipp auf die Startkarte => Vollbild
    const card = $('#startCard');
    let last = 0;
    card?.addEventListener('click', () => {
      const now = Date.now();
      if (now - last < 350) toggleFullscreen();
      last = now;
    });
  });

  async function startGame() {
    try {
      const m = await import(`./main.js?v=14.2`);
      if (typeof m.run === 'function') await m.run();
      else if (window.main && typeof window.main.run === 'function') await window.main.run();
      else throw new Error('main.run() fehlt');
    } catch (e) {
      alert(`Startfehler: main.js konnte nicht geladen werden.\n${e.message}`);
      console.error(e);
    }
  }

  async function toggleFullscreen() {
    const root = document.documentElement;
    try {
      if (!document.fullscreenElement) await root.requestFullscreen();
      else await document.exitFullscreen();
    } catch (e) { console.warn('Fullscreen nicht möglich:', e); }
  }

  function hardReload() {
    if ('caches' in window) caches.keys().then(k => k.forEach(c => caches.delete(c)));
    location.replace(location.pathname + `?r=${Date.now()}`);
  }

  // Fallbacks
  window.startGame = startGame;
  window.toggleFullscreen = toggleFullscreen;
  window.hardReload = hardReload;
})();
