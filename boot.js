/* =============================================================================
 * boot.js • v1.8
 * - Version im unteren Inspector-Bar-Badge
 * - Build-Menü-Toggle-Icon im HUD (öffnen/schließen)
 * - Rest: wie v1.7 (Startpanel, Backdrop-Fade, Inspector, Clipboard, FS-Icon)
 * =========================================================================== */

const SAVE_KEY       = 'siedler:lastSave';
const SAVE_META_KEY  = 'siedler:lastSaveMeta';
const BUILD_FALLBACK = 'V?.?.?';

const TEX_READY_TIMEOUT_MS = 60_000; // Merker: beim nächsten Anfassen auf 10_000 reduzieren
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
  const box = $('quickDiag'); if (box) box.textContent = __dbg.slice(-12).join('\n');
  if (!document.hidden) paintInspectorBasic();
}
function dbgExportTxt(){
  const blob = new Blob([__dbg.join('\n')], {type:'text/plain'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `debug-${Date.now()}.txt`; a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 800);
}
async function dbgCopyClipboard(){
  try{ await navigator.clipboard.writeText(__dbg.join('\n')); dbg('Clipboard: Log kopiert'); }
  catch(e){ dbg('Clipboard FAIL', e?.message || e); }
}

/* ---------- Fullscreen ---------- */
function canFullscreen(){
  return !!(document.documentElement.requestFullscreen||
            document.documentElement.webkitRequestFullscreen||
            document.documentElement.msRequestFullscreen);
}
function isFullscreen(){
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
}
function updateFSIcon(){
  const b = $('btnFS'); if (!b) return;
  const use = b.querySelector('use');
  b.title = isFullscreen() ? 'Vollbild verlassen' : 'Vollbild';
  if (use) use.setAttribute('href', isFullscreen() ? '#i-exit' : '#i-full');
}
function toggleFullscreen(){
  const de = document.documentElement;
  const req = de.requestFullscreen || de.webkitRequestFullscreen || de.msRequestFullscreen;
  const exit= document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if (!req) return;
  if (isFullscreen()) exit?.call(document);
  else req.call(de);
}

/* ---------- Badge/Version + Diag ---------- */
function setBuildBadge(){
  const ver = (window.__BUILD_STR__) ||
              (typeof window.__BUILD_VER__ === 'string' && window.__BUILD_VER__) ||
              `${BUILD_FALLBACK} • ${new Date().toISOString().slice(0,10).replace(/-/g,'')}`;
  const elBottom = $('versionBadge');
  if (elBottom) elBottom.textContent = ver;
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
function openInspector(){ const ins=$('inspector'); if(!ins) return; ins.hidden=false;
  const bMax=$('btnInspectorToggleMax'); if(bMax) bMax.textContent = ins.classList.contains('max') ? 'Fenstergröße' : 'Maximieren';
  paintInspectorBasic();
}
function closeInspector(){ const ins=$('inspector'); if(ins) ins.hidden=true; }
function toggleInspectorMax(){ const ins=$('inspector'); if(!ins) return; ins.classList.toggle('max');
  const bMax=$('btnInspectorToggleMax'); if(bMax) bMax.textContent = ins.classList.contains('max') ? 'Fenstergröße' : 'Maximieren';
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
      <div><strong>Version</strong></div><div>${$('versionBadge')?.textContent||'—'}</div>
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
      <button id="dbgCopy">Kopieren</button>
      <button id="dbgExport">Export (TXT)</button>
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
  $q('dbgCopy')?.addEventListener('click',dbgCopyClipboard);
}

/* ---------- Startpanel & Backdrop ---------- */
function showStartPanel(){ const p=$('startPanel'); if(p) p.classList.remove('hidden'); }
function hideStartPanelOnly(){ const p=$('startPanel'); if(p) p.classList.add('hidden'); }

function areTexturesReady(){
  try{
    if (typeof window.Asset?.areTexturesReady === 'function') return !!window.Asset.areTexturesReady();
    if (typeof window.Asset?.texturesReady === 'boolean')    return !!window.Asset.texturesReady;
    const W = window.GameLoader?._world; if (typeof W?.texturesReady === 'boolean') return !!W.texturesReady;
  }catch{}
  return false;
}

let __fadeDone=false, __fadeInt=null, __fadeTmo=null;
function stopFadeWatcher(){ if(__fadeInt){clearInterval(__fadeInt);__fadeInt=null;} if(__fadeTmo){clearTimeout(__fadeTmo);__fadeTmo=null;} }
function resetBackdropState(){ __fadeDone=false; stopFadeWatcher(); const bd=$('startBackdrop'); if(bd){ bd.classList.remove('fade-out','hidden'); bd.style.opacity=''; } }
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

/* ---------- Build-Menü ---------- */
function showBuildMenu(){ const m=$('buildMenu'); if(m) m.hidden=false; }
function hideBuildMenu(){ const m=$('buildMenu'); if(m) m.hidden=true; }
function toggleBuildMenu(){ const m=$('buildMenu'); if(!m) return; m.hidden = !m.hidden; dbg(m.hidden?'BuildMenu hidden':'BuildMenu shown'); }

/* ---------- Boot ---------- */
(() => {
  if (window.__BOOT_INIT_DONE__) return; window.__BOOT_INIT_DONE__=true;

  window.addEventListener('DOMContentLoaded', () => {
    showStartPanel(); setBuildBadge(); paintDiag(); updateContinueButton(); dbg('UI ready');

    // FS Icon initial + on change
    updateFSIcon();
    ['fullscreenchange','webkitfullscreenchange','msfullscreenchange'].forEach(evt=>{
      document.addEventListener(evt, updateFSIcon);
    });

    const bNew     = $('btnStart');
    const bCont    = $('btnContinue');
    const bReset   = $('btnReset');
    const bFS      = $('btnFS');
    const bBuildT  = $('btnBuildToggle');
    const bMenu    = $('btnMenu');
    const bMenuX   = $('btnMenuClose');
    const bBuildX  = $('btnBuildMenuHide');
    const bInsp    = $('btnInspector');
    const bInspX   = $('btnInspectorClose');
    const bInspMax = $('btnInspectorToggleMax');
    const bCache   = $('btnCacheClear');

    // Tool-Buttons (Baumenü) -> handled in game.js

    on(bNew,'click',guard(async()=>{
      if(!(await confirmOverwriteIfNeeded())) return;
      const url=$('mapSelect')?.value; if(!url){ alert('Keine Karte ausgewählt.'); return; }
      dbg('NewGame start',url);
      hideStartPanelOnly(); resetBackdropState();
      await window.GameLoader?.start(url);
      showBuildMenu(); fadeOutBackdropWhenReady(); paintInspectorBasic();
    }));

    on(bCont,'click',guard(async()=>{
      try{
        const raw=localStorage.getItem(SAVE_KEY); if(!raw){ updateContinueButton(); return; }
        const snap=JSON.parse(raw);
        dbg('Continue start');
        hideStartPanelOnly(); resetBackdropState();
        await window.GameLoader?.continueFrom(snap);
        showBuildMenu(); fadeOutBackdropWhenReady();
      }catch(err){ dbg('Continue FAIL',err?.message||err); try{localStorage.removeItem(SAVE_KEY);}catch{} }
      finally{ updateContinueButton(); paintInspectorBasic(); }
    }));

    on(bReset,'click',guard(async()=>{
      if(!(await confirmResetAll())) return;
      try{ localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_META_KEY); dbg('Reset OK'); }
      catch(e){ dbg('Reset FAIL',e?.message||e); }
      updateContinueButton(); paintDiag(); resetBackdropState();
      const box=$('quickDiag'); if(box) box.textContent=(box.textContent?box.textContent+'\n':'')+'[OK] Spielstände gelöscht.';
      paintInspectorBasic();
    }));

    // Menü öffnen/schließen
    on(bMenu,'click',()=>{ showStartPanel(); hideBuildMenu(); dbg('Menu open'); });
    on(bMenuX,'click',()=>{ hideStartPanelOnly(); dbg('Menu close'); });

    // Buildmenü
    on(bBuildX,'click',()=>{ hideBuildMenu(); dbg('BuildMenu close'); });
    on(bBuildT,'click',()=>{ toggleBuildMenu(); });

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
  setBuildBadge, paintDiag, updateContinueButton, paintInspectorBasic,
  dbg, dbgExportTxt
});
