/* ============================================================================
 * Datei   : ui/ui-inspector.js
 * Projekt : Neue Siedler
 * Version : v18.14.8 (Bridge + Visibility/ActiveView Fallback)
 * Zweck   : Inspector-Bridge (Open/Close/Exports/Bridges) + Sichtbarkeits-Fallback
 *           - Ergänzt: Body-Flag + Host.open setzen/entfernen
 *           - Ergänzt: ensureActiveView() → macht 1 View sichtbar (.is-active)
 * Events  : cb:insp:open|close|tab:change|export:logs|export:json
 *           cb:path:overlay:on|off, cb:path:heatmap:on|off
 * Anmerkung:
 *   Nichts entfernt. Ursprüngliche Aufrufe an window.Inspector.* bleiben erhalten.
 * ============================================================================ */

(function(){
  'use strict';
  const MOD = '[ui-inspector]';
  const LOGI = (window.CBLog?.info || console.info).bind(console, MOD);
  const LOGO = (window.CBLog?.ok   || console.log ).bind(console, MOD);
  const LOGW = (window.CBLog?.warn || console.warn).bind(console, MOD);
  const LOGE = (window.CBLog?.error|| console.error).bind(console, MOD);

  // ---------- Selektoren / Helpers -------------------------------------------
  const SEL = {
    host1: '#inspector',
    host2: '#inspector-overlay',
    tabs : '#inspector .insp-tabs [role="tab"]',
    views: '#inspector .insp-content .insp-view'
  };

  function q(sel){ return document.querySelector(sel); }
  function qa(sel){ return Array.from(document.querySelectorAll(sel)); }

  function getHost(){
    return q(SEL.host1) || q(SEL.host2) || null;
  }

  function setBodyFlag(on){
    document.body.classList.toggle('is-inspector', !!on);
    // Für ganz alte Styles zusätzlich:
    document.body.classList.toggle('inspector-open', !!on);
  }

  function setHostOpen(on){
    const host = getHost();
    if (!host) return;
    host.classList.toggle('open', !!on);
    // Sichtbarkeit zusätzlich hart entschärfen (ohne dauerhafte Inline-Styles)
    if (on){
      host.style.removeProperty('display');
      host.style.removeProperty('visibility');
      host.style.removeProperty('opacity');
      host.removeAttribute('hidden');
    }
  }

  /** Sorgt dafür, dass genau EINE View sichtbar ist (CSS erwartet .is-active). */
  function ensureActiveView(preferredId = 'insp-logs'){
    const views = qa(SEL.views);
    if (!views.length) return;

    // Gibt es schon eine aktive?
    const hasActive = views.some(v => v.classList.contains('is-active') || getComputedStyle(v).display !== 'none');
    if (hasActive) return;

    // 1) Bevorzugt Logs
    let target = q('#' + preferredId);
    // 2) Sonst erste View
    if (!target) target = views[0];

    views.forEach(v => v.classList.toggle('is-active', v === target));
    LOGI(`ensureActiveView → ${(target && target.id) || '(erste View)'}`);
  }

  /** Setzt ARIA-States an Tabs passend zur aktiven View (robust gegen Alt-Code). */
  function syncAriaFromActive(){
    const views = qa(SEL.views);
    const tabs  = qa(SEL.tabs);
    if (!views.length || !tabs.length) return;

    const active = views.find(v => v.classList.contains('is-active')) || views.find(v => getComputedStyle(v).display !== 'none');
    if (!active) return;

    const activeId = active.id || '';
    tabs.forEach(t => {
      const ctrl = t.getAttribute('aria-controls');
      t.setAttribute('aria-selected', String(ctrl === activeId));
    });
  }

  function hasInspector(){
    if (!window.Inspector) { LOGW('kein Inspector-Core gefunden'); return false; }
    return true;
  }
  function isOpen(){
    return document.body.classList.contains('is-inspector')
        || (getHost()?.classList.contains('open'));
  }

  // ---------- Convenience: Clipboard & Download (unverändert) -----------------
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

  // ---------- Öffnen/Schließen (mit Body-Flag + Host.open) -------------------
  const API = {
    open(tab){
      if (!hasInspector()) return;
      // 1) Original-Aufruf
      window.Inspector.open?.(tab);
      // 2) Sichtbarkeit hart sicherstellen (Fallback)
      setBodyFlag(true);
      setHostOpen(true);
      ensureActiveView();   // sorgt für sichtbare View
      syncAriaFromActive(); // passt Tabs an
      // 3) Event wie gehabt
      window.dispatchEvent(new Event('cb:inspector:open'));
    },
    close(){
      if (!hasInspector()) return;
      window.Inspector.close?.();
      setHostOpen(false);
      setBodyFlag(false);
      window.dispatchEvent(new Event('cb:inspector:close'));
    },
    toggle(tab){
      if (!hasInspector()) return;
      // Falls Core das intern macht, gut – ansonsten Fallback unten greift.
      window.Inspector.toggle?.(tab);
      const nowOpen = !isOpen();
      setHostOpen(nowOpen);
      setBodyFlag(nowOpen);
      if (nowOpen){ ensureActiveView(); syncAriaFromActive(); }
      window.dispatchEvent(new Event(nowOpen ? 'cb:inspector:open' : 'cb:inspector:close'));
    },

    // ---------- Exporte (unverändert) ----------------------------------------
    async exportLogsToClipboard(){
      const root = document.querySelector('#inspector [data-slot="logs-view"]');
      if (!root){ LOGW('Logs-Slot fehlt'); return false; }
      const lines = Array.from(root.querySelectorAll('.insp-logline'))
        .filter(el => el.offsetParent !== null)
        .map(el => el.innerText.replace(/\s+/g,' ').trim());
      const ok = await copyText(lines.join('\n'));
      window.dispatchEvent(new CustomEvent('cb:insp:export:logs', { detail:{ format:'text', count: lines.length }}));
      if (ok) LOGO(`Logs kopiert (${lines.length})`);
      return ok;
    },
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
    exportJSON(obj, filename='export.json'){
      const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
      download(filename, blob);
      window.dispatchEvent(new CustomEvent('cb:insp:export:json', { detail:{ file: filename, bytes: blob.size }}));
      LOGO(`JSON exportiert → ${filename}`);
    },

    // ---------- Bridges: PathOverlay / Heatmap (unverändert) ------------------
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
  window.UIInspector = API;
  window.UIInspector?.open && (window.UIInspector.open.defaultTab = 'logs');

  // ---------- Tab-Change (nur weiterreichen) ---------------------------------
  window.addEventListener('cb:insp:tab:change', (e)=>{
    LOGI(`Tab gewechselt → ${e.detail?.tab||'unknown'}`);
    // Aktivierungs-Fallback, falls die UI das (noch) nicht gesetzt hat:
    const tabId = e.detail?.tab;
    if (tabId){
      const target = document.getElementById(`insp-${tabId}`);
      if (target){
        qa(SEL.views).forEach(v => v.classList.toggle('is-active', v === target));
        syncAriaFromActive();
      }
    }else{
      ensureActiveView();
      syncAriaFromActive();
    }
  });

  // ---------- FAB/Hotkey-Bind (leicht erweitert) -----------------------------
  function bindToggles(){
    const btn = document.getElementById('btn-inspector');
    if (btn && !btn.__inspBound){
      btn.__inspBound = true;
      btn.addEventListener('click', ()=> API.toggle());
    }
    window.addEventListener('keydown', (ev)=>{
      if (ev.defaultPrevented) return;
      if (!ev.ctrlKey && !ev.metaKey && !ev.altKey && String(ev.key||'').toLowerCase()==='i'){
        API.toggle();
      }
    }, { passive:true });
  }

  // ---------- Ready / Lifecycle ----------------------------------------------
  function readyLog(){
    LOGO('bereit (Bridge v18.14.8 + Fallbacks aktiv)');
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

  // Beim Spielstart nur Info
  window.addEventListener('cb:game:start', ()=> LOGI('cb:game:start empfangen'));
})();
