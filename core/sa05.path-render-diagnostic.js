/* ============================================================================
 * SA-05 PERF-03 – Path Render Diagnostic
 * Version: v26.08.31-sa05-pathdiag1
 *
 * Diagnostic only:
 * - keeps PathOverlay state/stamps/wear alive
 * - temporarily disables ONLY drawing path stamps on the main canvas
 * - exposes a small API to switch drawing back on without touching save data
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[sa05-pathdiag]';
  const LOG=(...a)=>(window.CBLog?.ok||console.log)(TAG,...a);
  let installed=false;
  let renderEnabled=false; // diagnostic default: OFF
  let rawDraw=null;

  function install(){
    const inst=window.PathOverlayInstance;
    if(!inst||installed||typeof inst.drawOnMainCanvas!=='function')return false;
    rawDraw=inst.drawOnMainCanvas.bind(inst);
    inst.drawOnMainCanvas=function(ctx){
      if(!renderEnabled)return;
      return rawDraw(ctx);
    };
    installed=true;
    LOG('PERF-03 aktiv: Pfad-Rendering AUS; Pfaddaten bleiben erhalten');
    return true;
  }

  function setRenderEnabled(v){
    renderEnabled=!!v;
    LOG('Pfad-Rendering',renderEnabled?'AN':'AUS');
    return renderEnabled;
  }

  const timer=setInterval(()=>{if(install())clearInterval(timer);},50);
  window.addEventListener('cb:game:start',()=>setTimeout(install,100));
  window.addEventListener('cb:map:ready',()=>setTimeout(install,50));

  window.SA05PathRenderDiagnostic={
    version:'v26.08.31-sa05-pathdiag1',
    install,
    setRenderEnabled,
    isRenderEnabled:()=>renderEnabled
  };
})();
