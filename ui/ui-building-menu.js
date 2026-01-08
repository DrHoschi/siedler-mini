/* ============================================================================
 * Datei   : ui/ui-building-menu.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v26.01.08-menu-restore-pause-toggle
 * Zweck   :
 *   - Gebäude-Menü zuverlässig öffnen, wenn ein Gebäude gewählt wird
 *   - Robust gegen Event-Namens-Varianten (Legacy + neu)
 *   - Pause/Weiter Toggle bleibt erhalten (setzt workPaused am echten Building)
 *
 * WICHTIG (Bugfix):
 *   In einigen Patches ist das Menü "verschwunden", weil:
 *    - falsches Event / Detail-Shape ankam
 *    - oder #ui-root fehlte / Timing
 *    - oder ein früher JS-Fehler die Initialisierung abgebrochen hat
 *
 * Diese Version:
 *   - hängt sich an mehrere Events:
 *       cb:building:menu-open (core.input)
 *       cb:building:select / cb:building:selected (Legacy)
 *   - akzeptiert detail.building ODER detail selbst
 *   - erstellt Panel einmalig und zeigt es sicher an
 *   - Pause wird über ein Request-Event an die Core-Seite gegeben:
 *       req:building:setPaused  detail:{ id|uid, paused:true/false }
 * ========================================================================== */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 0) Guards / Logging
  // ---------------------------------------------------------------------------
  const LOG = window.CBLog || {
    info: (...a)=>console.log('ℹ️', ...a),
    warn: (...a)=>console.warn('⚠️', ...a),
    ok:   (...a)=>console.log('✅', ...a),
    error:(...a)=>console.error('❌', ...a),
  };

  // Wenn Panel bereits existiert, NICHT doppelt initialisieren.
  // (Aber: Wenn nur Flag gesetzt wurde, ohne Panel, lassen wir weiterlaufen.)
  const EXISTING = document.getElementById('ui-building-menu');
  if (EXISTING && EXISTING.__bm_bound__) {
    return;
  }

  // Root finden (Fallback auf body)
  const UI_ROOT = document.getElementById('ui-root') || document.body;
  if (!UI_ROOT) {
    LOG.warn('[ui-building] Kein UI-Root verfügbar – Menü deaktiviert.');
    return;
  }

  // ---------------------------------------------------------------------------
  // 1) State
  // ---------------------------------------------------------------------------
  let panel = EXISTING || null;
  let current = null; // building detail (mind. {id, uid, x,y,w,h,...})

  // ---------------------------------------------------------------------------
  // 2) Helpers
  // ---------------------------------------------------------------------------

  function _normBuilding(d){
    const detail = d || {};
    // Akzeptiere: {building:{...}} oder direkt {...}
    const b = detail.building || detail;
    if (!b) return null;

    // Normalisiere Felder (tileX/tileY vs x/y etc.)
    const id  = b.id  || b.kind || b.buildingId || b.buildingKind || null;
    const uid = b.uid || b.buildingUid || null;

    const x = (Number.isFinite(b.tileX) ? b.tileX : (Number.isFinite(b.x) ? b.x : undefined));
    const y = (Number.isFinite(b.tileY) ? b.tileY : (Number.isFinite(b.y) ? b.y : undefined));

    const w = (Number.isFinite(b.w) ? b.w : (Number.isFinite(b.width) ? b.width : (Number.isFinite(b.size?.w) ? b.size.w : undefined)));
    const h = (Number.isFinite(b.h) ? b.h : (Number.isFinite(b.height)? b.height: (Number.isFinite(b.size?.h) ? b.size.h : undefined)));

    const out = Object.assign({}, b, { id, uid, x, y, w, h });
    return out;
  }

  function ensurePanel(){
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'ui-building-menu';
    // Wir nutzen die CSS-Struktur aus ui-build-v14.css (Panel/hidden)
    panel.className = 'ui-panel hidden';
    panel.style.position = 'absolute'; // wie in deiner CSS
    panel.__bm_bound__ = true;

    // Header
    const header = document.createElement('div');
    header.className = 'ui-panel__header';

    const title = document.createElement('div');
    title.id = 'ui-building-title';
    title.textContent = 'Gebäude';
    header.appendChild(title);

    const close = document.createElement('button');
    close.className = 'ui-btn ui-btn-close';
    close.textContent = '×';
    close.addEventListener('click', hide);
    header.appendChild(close);

    // Subtitle
    const sub = document.createElement('div');
    sub.id = 'ui-building-subtitle';
    sub.textContent = '';
    sub.style.marginLeft = '6px';
    header.appendChild(sub);

    // Body
    const body = document.createElement('div');
    body.id = 'ui-building-body';

    function row(label, key){
      const r = document.createElement('div');
      r.className = 'ui-building-info-row';
      r.innerHTML = `<span>${label}</span><span data-k="${key}">—</span>`;
      return r;
    }
    body.appendChild(row('ID', 'id'));
    body.appendChild(row('Status', 'status'));
    body.appendChild(row('Kategorie', 'category'));
    body.appendChild(row('Position', 'pos'));

    // Footer
    const footer = document.createElement('div');
    footer.id = 'ui-building-footer';

    const btnWorkArea = document.createElement('button');
    btnWorkArea.className = 'ui-btn ui-btn-primary';
    btnWorkArea.textContent = 'Arbeitsbereich setzen';
    btnWorkArea.addEventListener('click', (ev)=>{
      ev.preventDefault(); ev.stopPropagation();
      if (!current) return;
      if (window.GameWorkArea?.beginSelection) {
        window.GameWorkArea.beginSelection(current);
      } else {
        LOG.warn('[ui-building] GameWorkArea.beginSelection fehlt.');
      }
      hide();
    });
    footer.appendChild(btnWorkArea);

    const btnPause = document.createElement('button');
    btnPause.className = 'ui-btn ui-btn-secondary';
    btnPause.id = 'ui-building-btn-pause';
    btnPause.textContent = 'Pause';
    btnPause.addEventListener('click', (ev)=>{
      ev.preventDefault(); ev.stopPropagation();
      if (!current) return;

      // Toggle
      const pausedNow = !!current.workPaused;
      const next = !pausedNow;

      // UI sofort updaten
      current.workPaused = next;
      _syncPauseButton(btnPause, next);
      _syncSubtitle(next);

      // Request an Core (setzt am echten Building)
      try{
        window.dispatchEvent(new CustomEvent('req:building:setPaused', {
          detail: {
            id: current.id || null,
            uid: current.uid || null,
            paused: next
          }
        }));
      }catch(e){
        LOG.error('[ui-building] req:building:setPaused dispatch failed', e);
      }
    });
    footer.appendChild(btnPause);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);

    UI_ROOT.appendChild(panel);

    // Klick außerhalb schließt
    document.addEventListener('pointerdown', (ev)=>{
      if (!panel) return;
      if (panel.classList.contains('hidden')) return;
      if (panel.contains(ev.target)) return;
      hide();
    }, { passive:true });

    return panel;
  }

  function _setField(k, val){
    if (!panel) return;
    const el = panel.querySelector(`[data-k="${k}"]`);
    if (el) el.textContent = (val == null ? '—' : String(val));
  }

  function _syncPauseButton(btn, paused){
    if (!btn) return;
    btn.textContent = paused ? 'Weiter' : 'Pause';
    btn.classList.toggle('is-paused', !!paused);
  }

  function _syncSubtitle(paused){
    const sub = panel?.querySelector('#ui-building-subtitle');
    if (!sub) return;
    sub.textContent = paused ? 'PAUSIERT' : '';
  }

  function positionNearBuilding(b){
    if (!panel) return;

    // Fallback: oben links unter HUD
    let left = 12;
    let top  = 64;

    // Wenn wir eine tileToScreen Funktion haben → daneben setzen
    const cam = window.Camera || window.GameCamera || window.MapCamera || null;
    if (cam && typeof cam.tileToScreen === 'function' && Number.isFinite(b?.x) && Number.isFinite(b?.y)) {
      try{
        const p = cam.tileToScreen(b.x, b.y);
        left = Math.max(10, Math.round(p.x + 40));
        top  = Math.max(10, Math.round(p.y - 40));
      }catch(e){}
    }

    panel.style.left = left + 'px';
    panel.style.top  = top + 'px';
    panel.style.right = 'auto';
  }

  function show(buildingDetail){
    const b = _normBuilding(buildingDetail);
    if (!b || !b.id) {
      LOG.warn('[ui-building] show() ohne gültiges Building', buildingDetail);
      return;
    }

    ensurePanel();
    current = b;

    // Title
    const title = panel.querySelector('#ui-building-title');
    if (title) title.textContent = b.title || b.name || b.label || b.id;

    // Fields
    _setField('id', b.id);
    _setField('status', b.status || 'done');
    _setField('category', b.category || '—');

    const posText = `${(b.x ?? '?')}, ${(b.y ?? '?')} (${(b.w ?? 3)}×${(b.h ?? 3)})`;
    _setField('pos', posText);

    // Pause-UI
    const paused = !!b.workPaused;
    const btnPause = panel.querySelector('#ui-building-btn-pause');
    _syncPauseButton(btnPause, paused);
    _syncSubtitle(paused);

    positionNearBuilding(b);

    panel.classList.remove('hidden');
    LOG.info('[ui-building] Menü geöffnet für', b.id);
  }

  function hide(){
    if (!panel) return;
    panel.classList.add('hidden');
    current = null;
  }

  // ---------------------------------------------------------------------------
  // 3) Event bindings (mehrere Varianten)
  // ---------------------------------------------------------------------------
  function bind(name){
    window.addEventListener(name, (ev)=>{
      const d = ev?.detail || {};
      const b = d.building || d;
      if (!b) return;
      show(b);
    });
  }

  bind('cb:building:menu-open');   // aktuell (core.input)
  bind('cb:building:selected');    // legacy
  bind('cb:building:select');      // legacy/alt

  LOG.ok('✅ [ui-building] Gebäude-Menü READY (robust, multi-event).');
})();
