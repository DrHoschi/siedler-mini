// boot.js  (V13.8.2)
const V = 'V13.8.2';
const qs = sel => document.querySelector(sel);
const startDlg = qs('#startDlg');
const canvas = qs('#game');

function showError(msg, err) {
  console.error('[BOOT]', msg, err);
  alert(msg + (err?.message ? `\n\n${err.message}` : ''));
}

// Dialog öffnen und Double‑Tap für Vollbild
function openStart() {
  if (!startDlg.open) startDlg.showModal();
  // Doppeltipp/Doppelklick -> Vollbild versuchen
  let last = 0;
  startDlg.addEventListener('pointerdown', ev => {
    const t = performance.now();
    if (t - last < 350) requestFullscreen();
    last = t;
  }, { passive:true });
}

async function requestFullscreen() {
  try {
    const el = document.documentElement;
    if (document.fullscreenElement) { await document.exitFullscreen(); }
    else if (el.requestFullscreen) { await el.requestFullscreen(); }
  } catch (e) {
    console.warn('Fullscreen abgelehnt:', e);
  }
}

function wireHUD(main) {
  const setTool = id => () => main.setTool(id);
  qs('#toolPointer').onclick  = setTool('pointer');
  qs('#toolRoad').onclick     = setTool('road');
  qs('#toolHQ').onclick       = setTool('hq');
  qs('#toolLumber').onclick   = setTool('lumber');
  qs('#toolDepot').onclick    = setTool('depot');
  qs('#toolBulldoze').onclick = setTool('bulldoze');

  qs('#fsBtn').onclick = requestFullscreen;
  qs('#centerBtn').onclick = () => main.centerOnMap();
  qs('#debugBtn').onclick = () => main.toggleDebug?.();

  // Debug‑Chips aktualisieren
  const toolChip = qs('#toolChip');
  const zoomChip = qs('#zoomChip');
  main.onToolChanged = (name)=> toolChip.textContent = `Tool: ${name}`;
  main.onZoomChanged = (z)=> zoomChip.textContent = `Zoom ${z.toFixed(2)}×`;
}

async function startGame() {
  // main.js laden (als ES‑Modul)
  let main;
  try {
    main = await import(`./main.js?v=${encodeURIComponent(V)}`);
  } catch (e) {
    showError('Fehler: main.js konnte nicht geladen werden. Prüfe Dateinamen/Pfade.', e);
    return;
  }

  try {
    // Minimal‑API prüfen
    if (!main || typeof main.init !== 'function' || typeof main.run !== 'function') {
      showError('main.js: erwartete Funktionen fehlen (init/run).');
      return;
    }

    // Canvas & HUD an main übergeben
    await main.init({ canvas, version: V });
    wireHUD(main);
    startDlg.close();
    await main.run();  // startet Game‑Loop
  } catch (e) {
    showError('Startfehler in main.run()', e);
  }
}

// Buttons verdrahten
qs('#startBtn').addEventListener('click', startGame);
qs('#startFsBtn').addEventListener('click', async ()=>{
  await requestFullscreen();
  startGame();
});

// Start‑UI zeigen
openStart();

// Fail‑Fast: deutliche Konsoleninfo
console.log(`Siedler‑Mini Boot ${V} bereit. Erwartet: ./main.js, ./render.js, ./core/* vorhanden.`);
