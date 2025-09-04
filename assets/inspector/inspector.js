/* ============================================================================
 * assets/inspector/inspector.js — v18.8.0
 * ---------------------------------------------------------------------------
 * City-Builder Inspector (stabil + robust)
 *  - Autostart: registriert sich sofort nach Laden
 *  - Tabs: Übersicht • Logs • Build (Platzh.) • Pfade • Tests (Platzh.)
 *  - Logs: nutzt CBLog.getBuffer()/dump(), Live-Refresh, Copy, Clear
 *  - Übersicht: FPS, Canvas-Größe, Map-Name, Versionsmarker
 *  - Pfade: Live-Stats aus OverlayHooks/PathOverlay (falls vorhanden),
 *           Liste letzter Pfade inkl. Länge
 *  - Defensive: Kein Modul? => Tab zeigt Hinweis, App läuft weiter
 *  - Öffnen/Schließen API: window.GameUI.toggleInspector() / open / close
 *  - Styles: nutzt deine inspector.css; minimale Inline-Notfallstyles
 * ============================================================================
 */

(function () {
  'use strict';

  // ---- kleine Hilfen -------------------------------------------------------
  const VER = 'v18.8.0';
  const log = (lvl, tag, msg, ...a) =>
    (window.CBLog?.[lvl] || console.log)(`[inspector.core] ${msg}`, ...a);
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);

  // Minimal-Styles nur, falls inspector.css nicht geladen ist
  const ensureBaseStyles = () => {
    if (document.getElementById('inspector-fallback-style')) return;
    const style = document.createElement('style');
    style.id = 'inspector-fallback-style';
    style.textContent = `
      .insp-panel{position:fixed;left:50%;top:18vh;transform:translateX(-50%);
        width:min(860px,92vw);max-height:72vh;overflow:auto;
        background:#151718; color:#eee; border:1px solid #2b2f31; border-radius:14px;
        box-shadow:0 24px 80px rgba(0,0,0,.55); z-index:2147483646; display:none}
      .insp-head{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid #232627}
      .insp-title{font-weight:800;letter-spacing:.3px}
      .insp-ver{opacity:.55;font-size:12px;margin-left:6px}
      .insp-close{margin-left:auto;border:0;border-radius:10px;background:#2a2e30;color:#ddd;padding:8px 12px;cursor:pointer}
      .insp-tabs{display:flex;gap:8px;padding:10px 14px;border-bottom:1px solid #232627}
      .insp-tab{border:0;border-radius:999px;background:#2a2e30;color:#ddd;padding:8px 12px;cursor:pointer}
      .insp-tab.active{background:#3a4a41; color:#e9ffe9}
      .insp-body{padding:12px 14px;}
      .insp-card{background:#0f1112;border:1px solid #232627;border-radius:10px;padding:10px}
      .insp-row{display:flex;flex-wrap:wrap;gap:10px}
      .insp-kv{background:#121415;border:1px solid #1f2325;border-radius:8px;padding:8px 10px;min-width:140px}
      .insp-kv b{display:block;font-size:12px;opacity:.7}
      .insp-actions{display:flex;gap:10px;padding:10px 14px;border-top:1px solid #232627}
      .insp-btn{border:0;border-radius:10px;background:#2a2e30;color:#ddd;padding:8px 12px;cursor:pointer}
      .insp-pre{background:#0b0d0e;color:#e7f1e8;border:1px solid #232627;border-radius:10px;
        padding:10px; font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        white-space:pre; overflow:auto; min-height:220px}
      .insp-muted{opacity:.65}
      .insp-list{display:grid;gap:8px}
      .insp-badge{display:inline-block;padding:.1em .55em;border-radius:999px;background:#2a2e30;font-size:12px}
    `;
    document.head.appendChild(style);
  };

  // ---- DOM anlegen ---------------------------------------------------------
  let root, tabBtns = {}, views = {};
  let rafFPS = null, fpsLast = performance.now(), fpsFrames = 0, fpsValue = 0;
  let liveTimer = null;

  function buildDOM() {
    ensureBaseStyles();

    root = document.createElement('div');
    root.id = 'inspector';
    root.className = 'insp-panel';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Inspector');

    root.innerHTML = `
      <div class="insp-head">
        <div class="insp-title">Inspector <span class="insp-ver">${VER}</span></div>
        <button class="insp-close" type="button">Schließen</button>
      </div>

      <div class="insp-tabs" role="tablist">
        <button class="insp-tab" data-tab="overview" role="tab">Übersicht</button>
        <button class="insp-tab active" data-tab="logs" role="tab">Logs</button>
        <button class="insp-tab" data-tab="build" role="tab">Build</button>
        <button class="insp-tab" data-tab="paths" role="tab">Pfade</button>
        <button class="insp-tab" data-tab="tests" role="tab">Tests</button>
      </div>

      <div class="insp-body">
        <section class="insp-view" data-view="overview" hidden>
          <div class="insp-row" style="margin-bottom:10px">
            <div class="insp-kv"><b>FPS</b><span id="kv-fps">–</span></div>
            <div class="insp-kv"><b>Canvas</b><span id="kv-canvas">–</span></div>
            <div class="insp-kv"><b>Map</b><span id="kv-map">–</span></div>
            <div class="insp-kv"><b>Engine</b><span id="kv-engine">${window.__cb?.indexVersion || '–'}</span></div>
          </div>
          <div class="insp-card insp-muted">
            Tipp: Die Werte aktualisieren sich sekündlich. FPS wird kontinuierlich via rAF gemessen.
          </div>
        </section>

        <section class="insp-view" data-view="logs">
          <div class="insp-card" style="margin-bottom:10px">
            <pre id="insp-log" class="insp-pre">[Log wird geladen…]</pre>
          </div>
          <div class="insp-actions">
            <button class="insp-btn" id="btn-copy">Kopieren</button>
            <button class="insp-btn" id="btn-clear">Leeren</button>
            <button class="insp-btn" id="btn-refresh">Aktualisieren</button>
          </div>
        </section>

        <section class="insp-view" data-view="build" hidden>
          <div class="insp-card insp-muted">
            Build-Tab: später Konfig, Schnell-Place etc. (Platzhalter).
          </div>
        </section>

        <section class="insp-view" data-view="paths" hidden>
          <div class="insp-row" style="margin-bottom:10px">
            <div class="insp-kv"><b>Heatmap Max</b><span id="kv-heat">–</span></div>
            <div class="insp-kv"><b>Aktive Overlays</b><span id="kv-act">–</span></div>
            <div class="insp-kv"><b>Letzte Aktualisierung</b><span id="kv-ts">–</span></div>
          </div>
          <div class="insp-card" style="margin-bottom:10px">
            <div class="insp-badge">Letzte Pfade</div>
            <div id="list-paths" class="insp-list" style="margin-top:8px"></div>
          </div>
          <div class="insp-actions">
            <button class="insp-btn" id="btn-path-refresh">Aktualisieren</button>
          </div>
        </section>

        <section class="insp-view" data-view="tests" hidden>
          <div class="insp-card insp-muted">
            Tests-Tab: Mini-Checks & UI-Demos (Platzhalter).
          </div>
        </section>
      </div>
    `;

    document.body.appendChild(root);

    // Verweise sammeln
    $$('.insp-tab', root).forEach(btn => {
      tabBtns[btn.dataset.tab] = btn;
    });
    $$('.insp-view', root).forEach(v => {
      views[v.dataset.view] = v;
    });

    // Events
    $('.insp-close', root).addEventListener('click', close);
    for (const [name, btn] of Object.entries(tabBtns)) {
      btn.addEventListener('click', () => activateTab(name));
    }
    byId('btn-copy').addEventListener('click', copyLogs);
    byId('btn-clear').addEventListener('click', clearLogs);
    byId('btn-refresh').addEventListener('click', refreshLogs);
    byId('btn-path-refresh').addEventListener('click', refreshPaths);
  }

  // ---- Öffnen/Schließen ----------------------------------------------------
  function open(forceTab) {
    root.style.display = 'block';
    activateTab(forceTab || 'logs');
    startFPS();
    startLiveTick();
    log('info', 0, `geöffnet (${VER})`);
  }
  function close() {
    root.style.display = 'none';
    stopFPS();
    stopLiveTick();
  }
  function toggle(forceTab) {
    if (!root) buildDOM();
    if (root.style.display === 'block') close(); else open(forceTab);
  }

  // Public Bridge für die FABs/UX
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = toggle;
  window.GameUI.openInspector   = open;
  window.GameUI.closeInspector  = close;

  // ---- Tabs ----------------------------------------------------------------
  function activateTab(name) {
    for (const [n, btn] of Object.entries(tabBtns)) {
      btn.classList.toggle('active', n === name);
    }
    for (const [n, v] of Object.entries(views)) {
      v.hidden = (n !== name);
    }
    if (name === 'logs') refreshLogs();
    if (name === 'overview') refreshOverview();
    if (name === 'paths') refreshPaths();
  }

  // ---- Logs ----------------------------------------------------------------
  function readCBLogBuffer() {
    try {
      // bevorzugt gepufferte Liste (inkl. Level/Time)
      if (window.CBLog?.getBuffer) return window.CBLog.getBuffer();
      // oder klassisches dump() (String)
      if (window.CBLog?.dump) return window.CBLog.dump();
    } catch (e) {
      console.warn('[inspector] CBLog read failed:', e);
    }
    return null;
  }

  function formatLog(buf) {
    if (!buf) return '[CBLog nicht verfügbar]';
    if (typeof buf === 'string') return buf;
    // Array mit Objekten {time, level, tag, msg}
    const lines = buf.map(e => {
      const t = new Date(e.time || Date.now());
      const hh = String(t.getHours()).padStart(2, '0');
      const mm = String(t.getMinutes()).padStart(2, '0');
      const ss = String(t.getSeconds()).padStart(2, '0');
      const stamp = `${hh}:${mm}:${ss}`;
      const LV = (e.level || 'LOG').toUpperCase().padEnd(4, ' ');
      const TAG = e.tag ? `[${e.tag}] ` : '';
      return `[${stamp}] ${LV} ${TAG}${e.msg ?? ''}`;
    });
    return lines.join('\n');
  }

  function refreshLogs() {
    const pre = byId('insp-log');
    const buf = readCBLogBuffer();
    const txt = formatLog(buf);
    pre.textContent = txt || '[Keine Log-Einträge vorhanden]';
  }

  function copyLogs() {
    const pre = byId('insp-log');
    const txt = pre.textContent || '';
    navigator.clipboard?.writeText(txt).then(
      () => log('info', 0, 'Logs kopiert'),
      () => alert('Konnte Log nicht kopieren')
    );
  }

  function clearLogs() {
    try {
      if (window.CBLog?.clear) window.CBLog.clear();
    } catch {}
    byId('insp-log').textContent = '[Leerer Puffer]';
  }

  // ---- Übersicht -----------------------------------------------------------
  function startFPS() {
    stopFPS();
    const tick = (now) => {
      fpsFrames++;
      if (now - fpsLast >= 1000) {
        fpsValue = fpsFrames;
        fpsFrames = 0;
        fpsLast = now;
        const el = byId('kv-fps');
        if (el) el.textContent = String(fpsValue);
      }
      rafFPS = requestAnimationFrame(tick);
    };
    rafFPS = requestAnimationFrame(tick);
  }
  function stopFPS() {
    if (rafFPS) cancelAnimationFrame(rafFPS);
    rafFPS = null;
  }

  function refreshOverview() {
    const cvs = byId('game');
    const cvTxt = cvs ? `${cvs.width || cvs.clientWidth || 0}×${cvs.height || cvs.clientHeight || 0}` : '–';
    const mapName = (cvs?.dataset?.map || '').split('/').pop() || (window.GameBoot?.state?.map?.name) || '–';
    byId('kv-canvas').textContent = cvTxt;
    byId('kv-map').textContent = mapName;
    // FPS kommt asynchron über rAF
  }

  // ---- Pfade (Overlay/Path Stats) -----------------------------------------
  function readPathStats() {
    // Mehrere mögliche Quellen defensiv anfragen
    const H = window.OverlayHooks;
    const P = window.PathOverlay || window.PathIndex || {};
    let heatMax = null, active = null, last = [];

    try {
      // OverlayHooks.getStats() → {heatMax, activeCount, lastPaths:[{from:[x,y],to:[x,y],len}]}
      if (H?.getStats) {
        const s = H.getStats();
        heatMax = s.heatMax ?? heatMax;
        active = s.activeCount ?? active;
        if (Array.isArray(s.lastPaths)) last = s.lastPaths;
      }
    } catch {}
    try {
      // Alternativ: P.stats?
      if (P?.stats) {
        heatMax = heatMax ?? P.stats.heatMax;
        active  = active ?? P.stats.activeCount;
        if (!last.length && Array.isArray(P.stats.lastPaths)) last = P.stats.lastPaths;
      }
    } catch {}

    return { heatMax, active, last };
  }

  function renderPathList(list) {
    const host = byId('list-paths');
    host.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      const div = document.createElement('div');
      div.className = 'insp-muted insp-card';
      div.textContent = 'Keine Pfade protokolliert.';
      host.appendChild(div);
      return;
    }
    list.slice(-10).reverse().forEach((p, idx) => {
      const el = document.createElement('div');
      el.className = 'insp-card';
      const from = Array.isArray(p.from) ? p.from.join(',') : (p.from || '?');
      const to   = Array.isArray(p.to)   ? p.to.join(',')   : (p.to   || '?');
      const len  = (typeof p.len === 'number') ? p.len : (p.length || '?');
      el.innerHTML = `<div><span class="insp-badge">#${idx+1}</span>  ${from} → ${to}  <span class="insp-badge">${len}</span></div>`;
      host.appendChild(el);
    });
  }

  function refreshPaths() {
    const { heatMax, active, last } = readPathStats();
    byId('kv-heat').textContent = (heatMax ?? '–');
    byId('kv-act').textContent  = (active  ?? '–');
    byId('kv-ts').textContent   = new Date().toLocaleTimeString();
    renderPathList(last);
  }

  function startLiveTick() {
    stopLiveTick();
    liveTimer = setInterval(() => {
      if (!root || root.style.display !== 'block') return;
      if (!views['overview']?.hidden) refreshOverview();
      if (!views['paths']?.hidden)    refreshPaths();
    }, 1000);
  }
  function stopLiveTick() {
    if (liveTimer) clearInterval(liveTimer);
    liveTimer = null;
  }

  // ---- Boot/Autoregistrierung ---------------------------------------------
  function earlyMark() {
    (window.CBLog?.info || console.log)('[CBLog] Polyfill aktiv (Inspector-Fallback)');
    log('info', 0, `bereit (${VER})`);
  }

  function ensureDOMReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  // sofort aktivierbar (kein externes Event nötig)
  ensureDOMReady(() => {
    if (!byId('inspector')) buildDOM();
    earlyMark();

    // Fallback-Badge: zeigt „Inspector lädt…“ Button, bis Panel verfügbar
    if (!byId('insp-floating-ready')) {
      const badge = document.createElement('div');
      badge.id = 'insp-floating-ready';
      badge.textContent = 'Inspector lädt…';
      badge.style.cssText = 'position:fixed;right:92px;bottom:22px;padding:6px 10px;border-radius:12px;background:rgba(20,20,20,.92);color:#eee;font:12px/1 system-ui;z-index:2147483646;pointer-events:none;opacity:.0;transition:opacity .25s ease';
      document.body.appendChild(badge);
      setTimeout(()=> badge.style.opacity = '.0', 1500);
    }

    // Optional: beim ersten Seitenaufruf sofort öffnen? (hier: nein)
    // open('logs');
  });

  // Exponiere Versionsmarker
  window.__cb = window.__cb || {};
  window.__cb.inspectorVersion = VER;
})();
