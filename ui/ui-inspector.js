/* ============================================================================
 * Datei   : ui/ui-inspector.js
 * Projekt : Neue Siedler
 * Version : v18.14.7 (Restore Bridge)
 * Zweck   : Zentrales Bindeglied für den Inspector (Open/Close/Exports/Bridges)
 *           - Keine UI, kein DOM-Bau: nutzt nur window.Inspector (Core)
 *           - Reicht Events weiter und bietet Komfort-API (UIInspector.*)
 * Events  : cb:insp:open|close|tab:change|export:logs|export:json
 *           cb:path:overlay:on|off, cb:path:heatmap:on|off
 * ============================================================================ */

(function(){
  'use strict';
  const MOD = '[ui-inspector]';
  const LOGI = (window.CBLog?.info || console.info).bind(console, MOD);
  const LOGO = (window.CBLog?.ok   || console.log ).bind(console, MOD);
  const LOGW = (window.CBLog?.warn || console.warn).bind(console, MOD);
  const LOGE = (window.CBLog?.error|| console.error).bind(console, MOD);

  // --- Guards -----------------------------------------------------------------
  function hasInspector(){
    if (!window.Inspector) { LOGW('kein Inspector-Core gefunden'); return false; }
    return true;
  }
  function isOpen(){
    return document.body.classList.contains('inspector-open')
        || (document.getElementById('inspector')?.classList.contains('open'));
  }

  // --- Convenience: Clipboard & Download -------------------------------------
  async function copyText(txt){
    try{
      if (navigator.clipboard && location.protocol === 'https:'){
        await navigator.clipboard.writeText(txt);
      }else{
        const ta = document.createElement('textarea');
        ta.value = txt; ta.style.position='fixed'; ta.style.top='-2000px';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      return true;
    }catch(e){ LOGW('Clipboard fehlgeschlagen:', e?.message||e); return false; }
  }

  function download(name, blob){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  // --- Öffnen/Schließen (Wrapper) --------------------------------------------
  const API = {
    open(tab){
      if (!hasInspector()) return;
      window.Inspector.open?.(tab);
      window.dispatchEvent(new Event('cb:inspector:open'));
    },
    close(){
      if (!hasInspector()) return;
      window.Inspector.close?.();
      window.dispatchEvent(new Event('cb:inspector:close'));
    },
    toggle(tab){
      if (!hasInspector()) return;
      window.Inspector.toggle?.(tab);
      window.dispatchEvent(new Event(isOpen() ? 'cb:inspector:open' : 'cb:inspector:close'));
    },

    // --- Exporte gemäß Spezifikation -----------------------------------------
    /** Exportiert sichtbare Logzeilen als reinen Text (Zwischenablage) */
    async exportLogsToClipboard(){
      const root = document.querySelector('#inspector [data-slot="logs-view"]');
      if (!root){ LOGW('Logs-Slot fehlt'); return false; }
      const lines = Array.from(root.querySelectorAll('.insp-logline'))
        .filter(el => el.offsetParent !== null) // nur sichtbare (Filter beachten)
        .map(el => el.innerText.replace(/\s+/g,' ').trim());
      const ok = await copyText(lines.join('\n'));
      window.dispatchEvent(new CustomEvent('cb:insp:export:logs', { detail:{ format:'text', count: lines.length }}));
      if (ok) LOGO(`Logs kopiert (${lines.length})`);
      return ok;
    },

    /** Exportiert Logs als JSON-Datei */
    exportLogsJSON(){
      const root = document.querySelector('#inspector [data-slot="logs-view"]');
      if (!root){ LOGW('Logs-Slot fehlt'); return; }
      const rows = Array.from(root.querySelectorAll('.insp-logline')).map(el=>{
        const lvl = ['ok','info','warn','error'].find(c => el.classList.contains(c)) || 'info';
        const ts  = (el.querySelector('.ts')?.textContent||'').replace(/\[|\]/g,'');
        const msg = el.querySelector('.txt')?.textContent || el.textContent || '';
        return { ts, lvl, msg: msg.trim() };
      });
      const blob = new Blob([JSON.stringify({ ts:new Date().toISOString(), count:rows.length, items:rows }, null, 2)], {type:'application/json'});
      const fname = `logs_${new Date().toISOString().replace(/[:\.]/g,'-')}.json`;
      download(fname, blob);
      window.dispatchEvent(new CustomEvent('cb:insp:export:logs', { detail:{ format:'json', count: rows.length }}));
      LOGO(`Logs exportiert (${rows.length}) → ${fname}`);
    },

    /** Allgemeiner JSON-Export (z. B. Ressourcen-/Pfad-Dumps) */
    exportJSON(obj, filename='export.json'){
      const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
      download(filename, blob);
      window.dispatchEvent(new CustomEvent('cb:insp:export:json', { detail:{ file: filename, bytes: blob.size }}));
      LOGO(`JSON exportiert → ${filename}`);
    },

    // --- Bridges: PathOverlay (Inspector steuert Overlay-Module) --------------
    pathOverlay(on=true){
      window.dispatchEvent(new CustomEvent(on ? 'cb:path:overlay:on' : 'cb:path:overlay:off'));
      LOGI(`PathOverlay ${on?'on':'off'}`);
    },
    heatmap(on=true){
      window.dispatchEvent(new CustomEvent(on ? 'cb:path:heatmap:on' : 'cb:path:heatmap:off'));
      LOGI(`Heatmap ${on?'on':'off'}`);
    }
  };

  // global bereitstellen (wie früher dokumentiert)
  window.UIInspector = API; // Komfort-API (öffentliche Brücke)
  // optionaler Alias für alte Aufrufe:
  window.UIInspector?.open && (window.UIInspector.open.defaultTab = 'logs');

  // --- Tab-Change weiterreichen (Spezifikation) -------------------------------
  window.addEventListener('cb:insp:tab:change', (e)=>{
    // Hier keine Logik außer Weiterreichen; Module lauschen bereits darauf
    // (Logs/Tests/Resources/Paths). Event existiert laut Vorgaben.
    // Referenz: ui/ui-inspector.js Spezifikation (Events). 
    // (Dokumentiert im Lastenheft & Inspector-Vorlage)
    // no-op außer Info-Log:
    LOGI(`Tab gewechselt → ${e.detail?.tab||'unknown'}`);
  });

  // --- FAB/Hotkey-Bind (ohne Duplikate) --------------------------------------
  function bindToggles(){
    const btn = document.getElementById('btn-inspector');
    if (btn && !btn.__inspBound){
      btn.__inspBound = true;
      btn.addEventListener('click', ()=> API.toggle());
    }
    // Tastatur: Taste I
    window.addEventListener('keydown', (ev)=>{
      if (ev.defaultPrevented) return;
      if (!ev.ctrlKey && !ev.metaKey && !ev.altKey && String(ev.key||'').toLowerCase()==='i'){
        API.toggle();
      }
    }, { passive:true });
  }

  // --- Lifecycle-Logs & Ready -------------------------------------------------
  function readyLog(){
    LOGO('bereit (Bridge v18.14.7)');
    window.dispatchEvent(new Event('cb:inspector:ready'));
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>{
      bindToggles();
      readyLog();
    });
  }else{
    bindToggles();
    readyLog();
  }

  // Beim Spielstart nochmal kurz melden (nur Info)
  window.addEventListener('cb:game:start', ()=> LOGI('cb:game:start empfangen'));

})();
