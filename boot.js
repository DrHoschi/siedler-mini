/* =============================================================================
 * Siedler‑Mini — boot.js v1.3
 * Startfenster, Inspector‑Toast, Vollbild, Cache leeren, Weiterspielen, Reset,
 * Diag/Debug, responsiver Inspector, und: Backdrop‑Logo mit sanftem Fade‑Out
 * (3s), ausgelöst bei Textur‑Ready ODER spätestens nach 60s Timeout.
 * =========================================================================== */

/* ----------------------------------------
 * Konstanten
 * --------------------------------------*/
const SAVE_KEY       = 'siedler:lastSave';
const SAVE_META_KEY  = 'siedler:lastSaveMeta';
const BUILD_FALLBACK = 'V?.?.?';

const TEX_READY_TIMEOUT_MS = 60_000;  // spätester Punkt fürs Fade
const TEX_POLL_MS          = 250;     // Poll-Intervall für Textur-Ready
const BACKDROP_FADE_MS     = 3_000;   // CSS-Transition (muss zur CSS passen)

/* ----------------------------------------
 * Mini-Utilities
 * --------------------------------------*/
const $  = (id) => document.getElementById(id);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
let __busy = false;
const guard = (fn) => async (...a) => { if (__busy) return; __busy=true; try{ await fn(...a); } finally{ __busy=false; } };

/* ----------------------------------------
 * Debug-Ringpuffer + Ausgabe (Inspector + QuickDiag)
 * --------------------------------------*/
const DBG_CAP = 200;
const __dbg = [];
function dbg(...msg){
  const line = `[${new Date().toLocaleTimeString()}] ${msg.map(x=> typeof x==='string'?x:JSON.stringify(x)).join(' ')}`;
  __dbg.push(line); while (__dbg.length > DBG_CAP) __dbg.shift();
  console.log(line);
  // QuickDiag anreichern, wenn vorhanden
  const box = $('quickDiag'); if (box) {
    const tail = __dbg.slice(-10).join('\n');
    box.textContent = box.textContent ? (box.textContent.split('\n').slice(0,20).join('\n') + '\n' + tail) : tail;
  }
  // Inspector aktualisieren (Basic)
  if (!document.hidden) paintInspectorBasic();
}
function dbgExportTxt(){
  const blob = new Blob([__dbg.join('\n')], {type:'text/plain'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `debug-${Date.now()}.txt`; a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
}

/* ----------------------------------------
 * Feature-Checks
 * --------------------------------------*/
function canFullscreen() {
  return !!(document.documentElement.requestFullscreen ||
            document.documentElement.webkitRequestFullscreen ||
            document.documentElement.msRequestFullscreen);
}
function toggleFullscreen() {
  const de = document.documentElement;
  const req = de.requestFullscreen || de.webkitRequestFullscreen || de.msRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if (!req) return;
  if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) exit?.call(document);
  else req.call(de);
}

/* ----------------------------------------
 * Build/Badge & Diagnosen
 * --------------------------------------*/
function setBuildBadge() {
  const el = $('buildBadge'); if (!el) return;
  const build =
    (window.__BUILD_STR__) ||
    (typeof window.__BUILD_VER__ === 'string' && window.__BUILD_VER__) ||
    `${BUILD_FALLBACK} • ${new Date().toISOString().slice(0,10).replace(/-/g,'')}`;
  el.textContent = build;
}

function paintDiag() {
  const box = $('quickDiag'); if (!box) return;
  const L = [];
  const ok = (b, t, extra='') => L.push(`[${b ? 'OK' : 'FAIL'}] ${t}${extra ? (' • ' + extra) : ''}`);

  ok(!!$('stage'), 'Canvas #stage');
  ok(!!window.GameLoader, 'GameLoader vorhanden');
  ok(typeof window.GameLoader?.start === 'function', 'GameLoader.start()');
  ok(typeof window.GameLoader?.continueFrom === 'function', 'GameLoader.continueFrom()');
  ok(!!$('mapSelect'), 'Map‑Select', $('mapSelect')?.value || '—');

  const swActive = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
  ok(swActive, 'ServiceWorker aktiv', swActive ? 'Ja' : 'Nein');

  let hasSave = false;
  try { hasSave = !!localStorage.getItem(SAVE_KEY); } catch {}
  ok(hasSave, 'Spielstand vorhanden', hasSave ? 'Weiterspielen möglich' : '—');

  box.textContent = L.join('\n');
}

/* ----------------------------------------
 * Continue-Button Status
 * --------------------------------------*/
function updateContinueButton() {
  const btn = $('btnContinue'); if (!btn) return;
  let has = false; try { has = !!localStorage.getItem(SAVE_KEY); } catch {}
  if (has) btn.removeAttribute('disabled'); else btn.setAttribute('disabled', 'true');
}

/* ----------------------------------------
 * Confirm-Dialoge
 * --------------------------------------*/
async function confirmOverwriteIfNeeded() {
  let has = false; try { has = !!localStorage.getItem(SAVE_KEY); } catch {}
  return has ? window.confirm('Vorhandenen Spielstand überschreiben?') : true;
}
async function confirmResetAll() {
  return window.confirm('Alle Spielstände wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.');
}

/* ----------------------------------------
 * Cache-Bust Reload
 * --------------------------------------*/
async function hardReloadWithBust() {
  try {
    if (window.caches?.keys) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); }
  } catch {/* ignore */}
  const url = new URL(location.href); url.searchParams.set('v', String(Date.now())); location.replace(url.toString());
}

/* ----------------------------------------
 * Inspector öffnen/schließen/maximieren
 * --------------------------------------*/
function openInspector(){
  const ins = $('inspector'); if (!ins) return;
  ins.hidden = false;
  const bMax = $('btnInspectorToggleMax');
  if (bMax) bMax.textContent = ins.classList.contains('max') ? 'Fenstergröße' : 'Maximieren';
  paintInspectorBasic();
}
function closeInspector(){ const ins = $('inspector'); if (ins) ins.hidden = true; }
function toggleInspectorMax(){
  const ins = $('inspector'); if (!ins) return;
  ins.classList.toggle('max');
  const bMax = $('btnInspectorToggleMax');
  if (bMax) bMax.textContent = ins.classList.contains('max') ? 'Fenstergröße' : 'Maximieren';
}

/* ----------------------------------------
 * Inspector Basis-Ansicht (falls game.js nichts liefert)
 * --------------------------------------*/
function paintInspectorBasic(){
  const el = $('inspectorContent'); if (!el) return;

  let meta = null; try { const raw = localStorage.getItem(SAVE_META_KEY); meta = raw ? JSON.parse(raw) : null; } catch {}
  const when = meta?.when ? new Date(meta.when).toLocaleString() : '—';

  const W = window.GameLoader?._world;
  const map = W?.state?.mapUrl ?? '—';
  const t   = typeof W?.state?.time === 'number' ? W.state.time.toFixed(1)+' s' : '—';
  const p   = W?.state?.player ? `x=${W.state.player.x?.toFixed?.(2) ?? '?'}, y=${W.state.player.y?.toFixed?.(2) ?? '?'}` : '—';

  el.innerHTML = `
    <div class="kv">
      <div><strong>Build</strong></div><div>${$('buildBadge')?.textContent || '—'}</div>
      <div><strong>Map</strong></div><div>${map}</div>
      <div><strong>Spielzeit</strong></div><div>${t}</div>
      <div><strong>Player</strong></div><div>${p}</div>
      <div><strong>Letztes Save</strong></div><div>${when}</div>
      <div><strong>FS‑Support</strong></div><div>${canFullscreen() ? 'Ja' : 'Nein'}</div>
      <div><strong>UA</strong></div><div style="white-space:normal">${navigator.userAgent}</div>
    </div>
    <hr style="border-color:#2a2f38;">
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button id="dbgSaveNow">Jetzt speichern</button>
      <button id="dbgLoadNow">Save laden</button>
      <button id="dbgPause">${W?.running ? 'Pausieren' : 'Fortsetzen'}</button>
      <button id="dbgExport">Log exportieren</button>
    </div>
    <hr style="border-color:#2a2f38;">
    <pre style="max-height:200px;overflow:auto;background:#0b0f14;border:1px dashed #2b3340;border-radius:8px;padding:8px;margin:0;">${__dbg.slice(-50).join('\n')}</pre>
  `;

  const $q = (id)=> el.querySelector('#'+id);
  $q('dbgSaveNow')?.addEventListener('click', () => {
    if (W?.snapshot) {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(W.snapshot()));
        localStorage.setItem(SAVE_META_KEY, JSON.stringify({ when: Date.now(), map: W.state.mapUrl }));
        updateContinueButton(); paintInspectorBasic(); dbg('SaveNow OK');
      } catch(e){ dbg('SaveNow FAIL', e.message||e); }
    }
  });
  $q('dbgLoadNow')?.addEventListener('click', async () => {
    try{
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw || !window.GameLoader?.continueFrom) return;
      const snap = JSON.parse(raw);
      await window.GameLoader.continueFrom(snap);
      updateContinueButton(); paintInspectorBasic(); dbg('LoadNow OK');
    } catch(e){ dbg('LoadNow FAIL', e.message||e); }
  });
  $q('dbgPause')?.addEventListener('click', () => {
    if (!W) return;
    if (W.running && W.pause) W.pause(); else if (!W.running && W.play) W.play();
    paintInspectorBasic(); dbg('PauseToggle', W.running?'running':'paused');
  });
  $q('dbgExport')?.addEventListener('click', dbgExportTxt);
}

/* ----------------------------------------
 * Startpanel & Backdrop-Steuerung
 * --------------------------------------*/
function hideStartPanelOnly(){
  const panel = $('startPanel'); if (panel) panel.hidden = true;
}

/** Prüft, ob Texturen „bereit“ sind (mehrere mögliche Quellen) */
function areTexturesReady(){
  try{
    if (typeof window.Asset?.areTexturesReady === 'function') return !!window.Asset.areTexturesReady();
    if (typeof window.Asset?.texturesReady === 'boolean')    return !!window.Asset.texturesReady;
    const W = window.GameLoader?._world;
    if (typeof W?.texturesReady === 'boolean') return !!W.texturesReady;
  }catch{}
  return false;
}

/** Lässt den Backdrop sanft ausblenden, sobald Texturen bereit sind – oder nach Timeout */
function fadeOutBackdropWhenReady({maxWaitMs=TEX_READY_TIMEOUT_MS}={}){
  const bd = $('startBackdrop'); if (!bd) return;
  const startTs = Date.now();

  function doFade(){
    if (!bd.classList.contains('fade-out')) {
      dbg('Backdrop fade start');
      bd.classList.add('fade-out');
      // Sicherheitsnetz: nach Ende der Transition endgültig ausblenden
      const onEnd = () => { bd.classList.add('hidden'); bd.removeEventListener('transitionend', onEnd); dbg('Backdrop hidden'); };
      bd.addEventListener('transitionend', onEnd);
      // Fallback: falls transitionend nicht feuert
      setTimeout(() => { bd.classList.add('hidden'); dbg('Backdrop hidden (fallback)'); }, BACKDROP_FADE_MS + 200);
    }
  }

  // Poller
  const timer = setInterval(() => {
    const waited = Date.now() - startTs;
    if (areTexturesReady()) { clearInterval(timer); dbg('Textures READY → fade'); doFade(); return; }
    if (waited >= maxWaitMs) { clearInterval(timer); dbg('Textures TIMEOUT → fade'); doFade(); return; }
  }, TEX_POLL_MS);
}

/* ----------------------------------------
 * Boot: DOM verdrahten
 * --------------------------------------*/
(() => {
  if (window.__BOOT_INIT_DONE__) return;
  window.__BOOT_INIT_DONE__ = true;

  window.addEventListener('DOMContentLoaded', () => {
    // Startscreen anzeigen
    const panel = $('startPanel'); if (panel) panel.hidden = false;

    setBuildBadge();
    paintDiag();
    updateContinueButton();
    dbg('UI ready');

    // Controls
    const bNew     = $('btnStart');
    const bCont    = $('btnContinue');
    const bReset   = $('btnReset');
    const bFS      = $('btnFull');
    const bInsp    = $('btnInspector');
    const bInspX   = $('btnInspectorClose');
    const bInspMax = $('btnInspectorToggleMax');
    const bCache   = $('btnCacheClear');

    // Neues Spiel
    on(bNew, 'click', guard(async () => {
      if (!(await confirmOverwriteIfNeeded())) return;
      const url = $('mapSelect')?.value;
      if (!url) { alert('Keine Karte ausgewählt.'); return; }
      dbg('NewGame start', url);
      await window.GameLoader?.start(url);
      hideStartPanelOnly();                       // Panel sofort weg
      fadeOutBackdropWhenReady();                 // Logo/Backdrop weich ausblenden
      paintInspectorBasic();
    }));

    // Weiterspielen
    on(bCont, 'click', guard(async () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) { updateContinueButton(); return; }
        const snap = JSON.parse(raw);
        dbg('Continue start');
        await window.GameLoader?.continueFrom(snap);
        hideStartPanelOnly();
        fadeOutBackdropWhenReady();
      } catch (err) {
        dbg('Continue FAIL', err.message||err);
        try { localStorage.removeItem(SAVE_KEY); } catch {}
      } finally {
        updateContinueButton();
        paintInspectorBasic();
      }
    }));

    // Reset (alle Spielstände löschen)
    on(bReset, 'click', guard(async () => {
      if (!(await confirmResetAll())) return;
      try {
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(SAVE_META_KEY);
        dbg('Reset OK');
      } catch(e){ dbg('Reset FAIL', e.message||e); }
      updateContinueButton();
      paintDiag();
      const box = $('quickDiag');
      if (box) box.textContent = (box.textContent ? box.textContent + '\n' : '') + '[OK] Spielstände gelöscht.';
      paintInspectorBasic();
    }));

    // Vollbild
    on(bFS, 'click', () => { if (canFullscreen()) toggleFullscreen(); });

    // Inspector
    on(bInsp,    'click', openInspector);
    on(bInspX,   'click', closeInspector);
    on(bInspMax, 'click', toggleInspectorMax);

    // Cache leeren
    on(bCache, 'click', guard(async () => { dbg('Cache clear'); await hardReloadWithBust(); }));

    // Sichtbarkeitswechsel → Meta‑Debug
    document.addEventListener('visibilitychange', () => dbg('visibility', document.visibilityState));
  });
})();

/* ----------------------------------------
 * Export für andere Module
 * --------------------------------------*/
window.BootUI = Object.freeze({
  setBuildBadge,
  paintDiag,
  updateContinueButton,
  paintInspectorBasic,
  dbg, dbgExportTxt
});
