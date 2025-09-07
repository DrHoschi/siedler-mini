/* ============================================================================
 * Inspector Resources – v18.12.3
 * - Zeigt einfache Ressourcen-/Assets-Infos falls vorhanden
 *   Erwartete Hooks (optional):
 *     Game.Resources?.list() -> Array<{name, amount}>
 *     Game.Assets?.stats()   -> {textures:number, sounds:number, sprites:number}
 * ========================================================================== */
(function(){
  'use strict';
  const core = window.__INSPECTOR_CORE__; if (!core?.api) return;
  const MOD='[inspector.resources]';
  const log=(...a)=>(window.CBLog?.ok||console.log)(MOD,...a);

  function el(t,c,h){ const e=document.createElement(t); if(c) e.className=c; if(h!=null) e.innerHTML=h; return e; }

  core.api.mount('build', ()=>{ /* Build-Tab bleibt Build – diese Datei nutzt eigenes Tab 'resources' nicht */ });

  // Wenn du später einen eigenen Ressourcen-Tab willst:
  // 1) Im Core einen Tab "resources" hinzufügen
  // 2) Hier mount('resources', ...) aktivieren.
  // Aktuell nutzen wir im Build-Tab nur Infos aus diesem Modul.
  core.api.mount('build', ()=>{
    const host = core.api.getSlot('build'); if (!host) return;
    const box = el('div', '', '');
    const res = (window.Game?.Resources?.list?.() || []).slice(0, 50);
    const assets = window.Game?.Assets?.stats?.() || null;

    const lines = [];
    if (assets){
      lines.push(`<div><b>Assets</b>: Textures=${assets.textures??'-'}, Sprites=${assets.sprites??'-'}, Sounds=${assets.sounds??'-'}</div>`);
    }
    if (res.length){
      lines.push('<div><b>Ressourcen (Top 50)</b></div>');
      lines.push('<pre style="margin:6px 0;white-space:pre-wrap">'+
                 res.map(r=>`${r.name.padEnd(20,' ')} ${String(r.amount).padStart(6,' ')}`).join('\n')
                 +'</pre>');
    }else{
      lines.push('<div>Keine Ressourcen-Infos verfügbar.</div>');
    }
    box.innerHTML = lines.join('');
    host.appendChild(box);
    log('ressourcen-info eingeblendet');
  });

})();
