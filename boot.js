/* =============================================================================
 * Siedler‑Mini — boot.js v1.5
 * Startfenster sofort ausblenden, Backdrop (Logo) vollflächig anzeigen, dann
 * weich ausblenden (3s) – spätestens nach 60s Timeout; Menü-Button in Toast,
 * Inspector responsiv & maximierbar, Debug‑Ringpuffer, Diag.
 * =========================================================================== */

const SAVE_KEY       = 'siedler:lastSave';
const SAVE_META_KEY  = 'siedler:lastSaveMeta';
const BUILD_FALLBACK = 'V?.?.?';

const TEX_READY_TIMEOUT_MS = 60_000;
const TEX_POLL_MS          = 250;
const BACKDROP_FADE_MS     = 3_000;

const $  = (id) => document.getElementById(id);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

let __busy = false;
const guard = (fn) => async (...a) => { if (__busy) return; __busy=true; try{ await fn(...a); } finally{ __busy=false; } };

/* ---------- Debug-Ringpuffer ---------- */
const DBG_CAP = 200;
const __dbg = [];
function dbg(...msg){
  const line = `[${new Date().toLocaleTimeString()}] ` +
               msg.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
  __dbg.push(line); while (__dbg.length > DBG_CAP) __dbg.shift();
  console.log(line);
  const box = $('quickDiag');
  if (box) {
    const tail = __dbg.slice(-12).join('\n');
    box.textContent = tail;
  }
  if (!document.hidden) paintInspectorBasic();
}
function dbgExportTxt(){
  const blob = new Blob([__dbg.join('\n')], {type:'text/plain'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `debug-${Date.now()}.txt`; a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 800);
}

/* ---------- FS ---------- */
function canFullscreen(){
  return !!(document.documentElement.requestFullscreen||
            document.documentElement.webkitRequestFullscreen||
            document.documentElement.msRequestFullscreen);
}
function toggleFullscreen(){
  const de = document.documentElement;
  const req = de.requestFullscreen || de.webkitRequestFullscreen || de.msRequestFullscreen;
  const exit= document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if (!req) return;
  if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) exit?.call(document);
  else req.call(de);
}

/* ---------- Badge & Diag ---------- */
function setBuildBadge(){
  const el = $('buildBadge'); if(!el) return;
  const build = (window.__BUILD_STR__) ||
                (typeof window.__BUILD_VER__ === 'string' && window.__BUILD_VER__) ||
                `${BUILD_FALLBACK} • ${new Date().toISOString().slice(0,10).replace(/-/g,'')}`;
  el.textContent = build;
}
function paintDiag(){
  const box = $('quickDiag'); if(!box) return;
  const L = [];
  const ok=(b,t,e='')=>L.push(`[${b?'OK':'FAIL'}] ${t}${e?(' • '+e):''}`);
  ok(!!$('stage'),'Canvas #stage');
  ok(!!window.GameLoader,'GameLoader vorhanden');
  ok(typeof window.GameLoader?.start==='function','GameLoader.start()');
  ok(typeof window.GameLoader?.continueFrom==='function','GameLoader.continueFrom()');
  ok(!!$('mapSelect'),'Map‑Select',$('mapSelect')?.value||'—');
  const swActive = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
  ok(swActive,'ServiceWorker aktiv', swActive?'Ja':'Nein');
  let has=false; try{has=!!localStorage.getItem(SAVE_KEY);}catch{}
  ok(has,'Spielstand vorhanden', has?'Weiterspielen möglich':'—');
  box.textContent = L.join('\n');
}

/* ---------- Continue-Button ---------- */
function updateContinueButton(){
  const btn=$('btnContinue'); if(!btn) return;
  let has=false; try{has=!!localStorage.getItem(SAVE_KEY);}catch{}
  if(has) btn.removeAttribute('disabled'); else btn.setAttribute('disabled','true');
}

/* ---------- Confirms ---------- */
async function confirmOverwriteIfNeeded(){
  let has=false; try{has=!!localStorage.getItem(SAVE_KEY);}catch{}
  return has ? window.confirm('Vorhandenen Spielstand überschreiben?') : true;
}
async function confirmResetAll(){
  return window.confirm('Alle Spielstände wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.');
}

/* ---------- Cache-Bust ---------- */
async function hardReloadWithBust(){
  try{ if(window.caches?.keys){ const keys=await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k))); } }catch{}
  const url=new URL(location.href); url.searchParams.set('v',String(Date.now())); location.replace(url.toString());
}

/* ---------- Inspector ---------- */
function openInspector(){
  const ins=$('inspector'); if(!ins) return;
  ins.hidden=false;
  const bMax=$('btnInspectorToggleMax');
  if(bMax) bMax.textContent = ins.classList.contains('max') ? 'Fenstergröße' : 'Maximieren';
  paintInspectorBasic();
}
function closeInspector(){ const ins=$('inspector'); if(ins) ins.hidden=true; }
function toggleInspectorMax(){
  const ins=$('inspector'); if(!ins) return;
  ins.classList.toggle('max');
  const bMax=$('btnInspectorToggleMax');
  if(bMax) bMax.textContent = ins.classList.contains('max') ? 'Fenstergröße' : 'Maximieren';
}
function paintInspectorBasic(){
  const el=$('inspectorContent'); if(!el) return;
  let meta=null; try{ const raw=localStorage.getItem(SAVE_META_KEY); meta=raw?JSON.parse(raw):null; }catch{}
  const when=meta?.when ? new Date(meta.when).toLocaleString() : '—';
  const W=window.GameLoader?._world;
  const map=W?.state?.mapUrl ?? '—';
  const t=typeof W?.state?.time==='number'? W.state.time.toFixed(1)+' s' : '—';
  const p=W?.state?.player ? `x=${W.state.player.x?.toFixed?.(2)??'?'}, y=${W.state.player.y?.toFixed?.(2)??'?'}` : '—';
  el.innerHTML = `
    <div class="kv">
      <div><strong>Build</strong></div><div>${$('buildBadge')?.textContent||'—'}</div>
      <div><strong>Map</strong></div><div>${map}</div>
      <div><strong>Spielzeit</strong></div><div>${t}</div>
      <div><strong>Player</strong></div><div>${p}</div>
      <div><strong>Letztes Save</strong></div><div>${when}</div>
      <div><strong>FS‑Support</strong></div><div>${canFullscreen()?'Ja':'Nein'}</div>
      <div><strong>UA</strong></div><div style="white-space:normal">${navigator.userAgent}</div>
    </div>
    <hr style="border-color:#2a2f38;">
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button id="dbgSaveNow">Jetzt speichern</button>
      <button id="dbgLoadNow">Save laden</button>
      <button id="dbgPause">${W?.running?'Pausieren':'Fortsetzen'}</button>
      <button id="dbgExport">Log exportieren</button>
    </div>
    <hr style="border-color:#2a2f38;">
    <pre style="max-height:200px;overflow:auto;background:#0b0f14;border:1px dashed #2b3340;border-radius:8px;padding:8px;margin:0;">${__dbg.slice(-50).join('\n')}</pre>
  `;
  const $q=(id)=>el.querySelector('#'+id);
  $q('dbgSaveNow')?.addEventListener('click',()=>{const W=window.GameLoader?._world;if(!W?.snapshot)return;
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(W.snapshot()));localStorage.setItem(SAVE_META_KEY,JSON.stringify({when:Date.now(),map:W.state.mapUrl}));updateContinueButton();paintInspectorBasic();dbg('SaveNow OK');}catch(e){dbg('SaveNow FAIL',e?.message||e);}
  });
  $q('dbgLoadNow')?.addEventListener('click',async()=>{try{const raw=localStorage.getItem(SAVE_KEY);if(!raw||!window.GameLoader?.continueFrom)return;
    const snap=JSON.parse(raw);await window.GameLoader.continueFrom(snap);updateContinueButton();paintInspectorBasic();dbg('LoadNow OK');
  }catch(e){dbg('LoadNow FAIL',e?.message||e);}});
  $q('dbgPause')?.addEventListener('click',()=>{const W=window.GameLoader?._world;if(!W)return; if(W.running&&W.pause)W.pause(); else if(!W.running&&W.play)W.play(); paintInspectorBasic(); dbg('PauseToggle',W.running?'running':'paused');});
  $q('dbgExport')?.addEventListener('click',dbgExportTxt);
}

/* ---------- Startpanel & Backdrop ---------- */
function showStartPanel(){ const p=$('startPanel'); if(p) p.classList.remove('hidden'); }
function hideStartPanelOnly(){ const p=$('startPanel'); if(p) p.classList.add('hidden'); }

/* Textur‑Ready Heuristik (kannst du an Asset‑Loader koppeln) */
function areTexturesReady(){
  try{
    if (typeof window.Asset?.areTexturesReady === 'function') return !!window.Asset.areTexturesReady();
    if (typeof window.Asset?.texturesReady === 'boolean')    return !!window.Asset.texturesReady;
    const W = window.GameLoader?._world;
    if (typeof W?.texturesReady === 'boolean') return !!W.texturesReady;
  }catch{}
  return false;
}

/* Fade‑Watcher State */
let __fadeDone = false;
let __fadeInt  = null;
let __fadeTmo  = null;

function stopFadeWatcher(){ if(__fadeInt){clearInterval(__fadeInt);__fadeInt=null;} if(__fadeTmo){clearTimeout(__fadeTmo);__fadeTmo=null;} }
function resetBackdropState(){
  __fadeDone=false; stopFadeWatcher();
  const bd=$('startBackdrop'); if(bd){ bd.classList.remove('fade-out','hidden'); bd.style.opacity=''; }
}

/* Backdrop ausblenden, sobald Texturen ready ODER Timeout erreicht */
function fadeOutBackdropWhenReady({maxWaitMs=TEX_READY_TIMEOUT_MS}={}){
  const bd=$('startBackdrop'); if(!bd) return;
  if(__fadeDone){ dbg('Backdrop already done'); return; }
  stopFadeWatcher();
  const startTs=Date.now();

  function doFade(){
    if(__fadeDone) return;
    __fadeDone=true; stopFadeWatcher();
    if(!bd.classList.contains('fade-out')){
      dbg('Backdrop fade start');
      bd.classList.add('fade-out');
      const onEnd=()=>{ bd.classList.add('hidden'); bd.removeEventListener('transitionend',onEnd); dbg('Backdrop hidden'); };
      bd.addEventListener('transitionend',onEnd);
      setTimeout(()=>{ if(!bd.classList.contains('hidden')){ bd.classList.add('hidden'); dbg('Backdrop hidden (fallback)'); } }, BACKDROP_FADE_MS+250);
    }
  }

  __fadeInt=setInterval(()=>{ 
    if(areTexturesReady()){ dbg('Textures READY -> fade'); doFade(); }
    else if(Date.now()-startTs>=maxWaitMs){ dbg('Textures TIMEOUT -> fade'); doFade(); }
  }, TEX_POLL_MS);
  __fadeTmo=setTimeout(()=>{ dbg('Textures TIMEOUT -> fade (abs)'); doFade(); }, maxWaitMs+50);
}

/* ---------- Boot ---------- */
(() => {
  if (window.__BOOT_INIT_DONE__) return; window.__BOOT_INIT_DONE__=true;

  window.addEventListener('DOMContentLoaded', () => {
    // Startfenster sichtbar (Backdrop ist per default sichtbar)
    showStartPanel();

    setBuildBadge();
    paintDiag();
    updateContinueButton();
    dbg('UI ready');

    const bNew     = $('btnStart');
    const bCont    = $('btnContinue');
    const bReset   = $('btnReset');
    const bFS      = $('btnFull');
    const bMenu    = $('btnMenu');        // <-- NEU: Menü wieder öffnen
    const bInsp    = $('btnInspector');
    const bInspX   = $('btnInspectorClose');
    const bInspMax = $('btnInspectorToggleMax');
    const bCache   = $('btnCacheClear');

    // Neues Spiel: Panel SOFORT weg, Backdrop bleibt bis Fade
    on(bNew,'click',guard(async()=>{
      if(!(await confirmOverwriteIfNeeded())) return;
      const url=$('mapSelect')?.value; if(!url){ alert('Keine Karte ausgewählt.'); return; }
      dbg('NewGame start',url);
      hideStartPanelOnly();    // sofort weg
      resetBackdropState();    // sicherstellen, dass Backdrop sichtbar ist
      await window.GameLoader?.start(url);
      fadeOutBackdropWhenReady();
      paintInspectorBasic();
    }));

    // Weiterspielen
    on(bCont,'click',guard(async()=>{
      try{
        const raw=localStorage.getItem(SAVE_KEY); if(!raw){ updateContinueButton(); return; }
        const snap=JSON.parse(raw);
        dbg('Continue start');
        hideStartPanelOnly();
        resetBackdropState();
        await window.GameLoader?.continueFrom(snap);
        fadeOutBackdropWhenReady();
      }catch(err){
        dbg('Continue FAIL',err?.message||err); try{localStorage.removeItem(SAVE_KEY);}catch{}
      }finally{ updateContinueButton(); paintInspectorBasic(); }
    }));

    // Reset
    on(bReset,'click',guard(async()=>{
      if(!(await confirmResetAll())) return;
      try{ localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_META_KEY); dbg('Reset OK'); }
      catch(e){ dbg('Reset FAIL',e?.message||e); }
      updateContinueButton(); paintDiag(); resetBackdropState();
      const box=$('quickDiag'); if(box) box.textContent=(box.textContent?box.textContent+'\n':'')+'[OK] Spielstände gelöscht.';
      paintInspectorBasic();
    }));

    // Menü (Startfenster wieder öffnen – ohne Backdrop)
    on(bMenu,'click',()=>{
      const p=$('startPanel'); if(!p) return;
      p.classList.remove('hidden');      // Startfenster sichtbar
      // Backdrop NICHT aktivieren; Spiel bleibt im Hintergrund sichtbar
      dbg('Menu open');
    });

    // Vollbild
    on(bFS,'click',()=>{ if(canFullscreen()) toggleFullscreen(); });

    // Inspector
    on(bInsp,'click',openInspector);
    on(bInspX,'click',closeInspector);
    on(bInspMax,'click',toggleInspectorMax);

    // Cache leeren
    on(bCache,'click',guard(async()=>{ dbg('Cache clear'); await hardReloadWithBust(); }));

    document.addEventListener('visibilitychange',()=>dbg('visibility',document.visibilityState));
  });
})();

/* ---------- Export ---------- */
window.BootUI = Object.freeze({
  setBuildBadge, paintDiag, updateContinueButton, paintInspectorBasic, dbg, dbgExportTxt
});
