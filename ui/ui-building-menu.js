/* ============================================================================
 * ui/ui-building-menu.js
 * v26.01.08-menu-visible-hotfix + pause-toggle-fix
 * ----------------------------------------------------------------------------
 * FIX:
 *  - Pause/Weiter musste mehrfach gedrückt werden.
 *    Ursache: UI toggelte auf "lokalem" current.workPaused, der nicht immer dem
 *    echten Building-State entsprach (Core-Update async / Objekt-Kopie).
 *
 * Lösung:
 *  - Bei jedem Klick wird der *echte* Building-State aus dem Spiel geholt
 *    (Lookup via uid oder id), dann next = !real.workPaused.
 *  - Button wird kurz gesperrt (debounce), bis Core den State gesetzt hat.
 *  - Optionales Sync-Event: cb:building:pause-changed (falls vorhanden)
 *    aktualisiert UI auf den echten Wert.
 * ========================================================================== */
(function () {
  'use strict';

  const LOG = window.CBLog || { info:console.log, warn:console.warn, ok:console.log, error:console.error };

  if (window.__UI_BUILDING_MENU_BOUND__) return;
  window.__UI_BUILDING_MENU_BOUND__ = true;

  const UI_ROOT = document.getElementById('ui-root') || document.body;

  let panel = document.getElementById('ui-building-menu');
  let current = null;
  let pauseBtnLocked = false;

  // ------------------------------------------------------------
  // Helpers: locate real building object in runtime
  // ------------------------------------------------------------
  function findRealBuilding(uid, id){
    // Common layouts in this project:
    // - window.Game.buildings.list (array)
    // - window.GameBuildings.list (array)
    // - window.Game.buildingsByUid (map)
    // - window.Game.buildings (array)
    const candidates = [];
    try {
      if (window.Game?.buildingsByUid && uid && window.Game.buildingsByUid[uid]) return window.Game.buildingsByUid[uid];
      if (window.Game?.buildings?.byUid && uid && window.Game.buildings.byUid[uid]) return window.Game.buildings.byUid[uid];

      if (Array.isArray(window.Game?.buildings?.list)) candidates.push(window.Game.buildings.list);
      if (Array.isArray(window.GameBuildings?.list)) candidates.push(window.GameBuildings.list);
      if (Array.isArray(window.Game?.buildings)) candidates.push(window.Game.buildings);
      if (Array.isArray(window.Buildings?.list)) candidates.push(window.Buildings.list);
    } catch (e) {}

    for (const arr of candidates){
      const hit = arr.find(b => (uid && (b.uid===uid || b.buildingUid===uid)) || (id && (b.id===id || b.kind===id)));
      if (hit) return hit;
    }
    return null;
  }

  function ensurePanel(){
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'ui-building-menu';

    panel.style.position = 'fixed';
    panel.style.left = '12px';
    panel.style.top  = '72px';
    panel.style.zIndex = '99999';
    panel.style.pointerEvents = 'auto';
    panel.style.display = 'block';

    panel.style.minWidth = '240px';
    panel.style.maxWidth = '320px';
    panel.style.padding = '10px';
    panel.style.borderRadius = '12px';
    panel.style.background = 'rgba(245, 236, 219, 0.95)';
    panel.style.border = '2px solid rgba(120,90,40,0.9)';
    panel.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
    panel.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.gap = '8px';

    const title = document.createElement('div');
    title.id = 'ui-building-title';
    title.style.fontWeight = '700';
    title.textContent = 'Gebäude';
    header.appendChild(title);

    const close = document.createElement('button');
    close.textContent = '×';
    close.style.width = '34px';
    close.style.height = '34px';
    close.style.borderRadius = '10px';
    close.style.border = '1px solid rgba(120,90,40,0.8)';
    close.style.background = 'rgba(255,255,255,0.8)';
    close.style.fontSize = '22px';
    close.addEventListener('click', hide);
    header.appendChild(close);

    const sub = document.createElement('div');
    sub.id = 'ui-building-subtitle';
    sub.style.fontSize = '12px';
    sub.style.marginTop = '6px';
    sub.style.opacity = '0.8';

    const body = document.createElement('div');
    body.id = 'ui-building-body';
    body.style.marginTop = '8px';
    body.style.fontSize = '13px';
    body.innerHTML = `
      <div><b>ID:</b> <span data-k="id">—</span></div>
      <div><b>Status:</b> <span data-k="status">—</span></div>
      <div><b>Kategorie:</b> <span data-k="category">—</span></div>
      <div><b>Position:</b> <span data-k="pos">—</span></div>
    `;

    const footer = document.createElement('div');
    footer.id = 'ui-building-footer';
    footer.style.display = 'flex';
    footer.style.gap = '8px';
    footer.style.marginTop = '10px';

    const btnWorkArea = document.createElement('button');
    btnWorkArea.textContent = 'Arbeitsbereich';
    btnWorkArea.style.flex = '1';
    btnWorkArea.style.padding = '8px 10px';
    btnWorkArea.style.borderRadius = '10px';
    btnWorkArea.style.border = '1px solid rgba(120,90,40,0.8)';
    btnWorkArea.style.background = 'rgba(255,255,255,0.85)';
    btnWorkArea.addEventListener('click', (ev)=>{
      ev.preventDefault(); ev.stopPropagation();
      if (!current) return;
      window.GameWorkArea?.beginSelection?.(current);
      hide();
    });

    const btnPause = document.createElement('button');
    btnPause.id = 'ui-building-btn-pause';
    btnPause.textContent = 'Pause';
    btnPause.style.flex = '1';
    btnPause.style.padding = '8px 10px';
    btnPause.style.borderRadius = '10px';
    btnPause.style.border = '1px solid rgba(120,90,40,0.8)';
    btnPause.style.background = 'rgba(255,255,255,0.85)';

    btnPause.addEventListener('click', (ev)=>{
      ev.preventDefault(); ev.stopPropagation();
      if (!current) return;
      if (pauseBtnLocked) return;

      // 1) Echten Zustand lesen
      const real = findRealBuilding(current.uid, current.id);
      const realPaused = !!(real?.workPaused ?? real?.paused ?? real?.__workPaused);

      const next = !realPaused;

      // 2) UI sofort anpassen (optimistic), Button kurz sperren
      pauseBtnLocked = true;
      btnPause.disabled = true;

      current.workPaused = next;
      syncPause(btnPause, next);
      syncSubtitle(next);

      // 3) Core-Request senden
      window.dispatchEvent(new CustomEvent('req:building:setPaused', {
        detail: { id: current.id||null, uid: current.uid||null, paused: next }
      }));

      // 4) Fallback-Unlock nach kurzer Zeit, falls kein Sync-Event kommt
      setTimeout(()=>{
        pauseBtnLocked = false;
        btnPause.disabled = false;
      }, 250);
    });

    footer.appendChild(btnWorkArea);
    footer.appendChild(btnPause);

    panel.appendChild(header);
    panel.appendChild(sub);
    panel.appendChild(body);
    panel.appendChild(footer);

    UI_ROOT.appendChild(panel);

    hide();
    return panel;
  }

  function setField(k,v){
    const el = panel?.querySelector(`[data-k="${k}"]`);
    if (el) el.textContent = (v==null?'—':String(v));
  }

  function syncPause(btn, paused){
    if (!btn) return;
    btn.textContent = paused ? 'Weiter' : 'Pause';
  }

  function syncSubtitle(paused){
    const sub = panel?.querySelector('#ui-building-subtitle');
    if (!sub) return;
    sub.textContent = paused ? 'PAUSIERT' : '';
  }

  function show(detail){
    ensurePanel();
    const b = detail?.building || detail;
    if (!b) return;

    current = {
      id: b.id || b.kind || null,
      uid: b.uid || null,
      x: b.x ?? b.tileX,
      y: b.y ?? b.tileY,
      w: b.w ?? 3,
      h: b.h ?? 3,
      status: b.status || 'done',
      category: b.category || '—',
      workPaused: !!b.workPaused
    };

    // Wenn möglich: echten Zustand übernehmen (damit UI korrekt startet)
    const real = findRealBuilding(current.uid, current.id);
    if (real) {
      current.workPaused = !!(real.workPaused ?? real.paused ?? real.__workPaused);
    }

    panel.style.display = 'block';
    panel.classList.remove('hidden','is-hidden');

    const t = panel.querySelector('#ui-building-title');
    if (t) t.textContent = current.id || 'Gebäude';

    setField('id', current.id);
    setField('status', current.status);
    setField('category', current.category);
    setField('pos', `${current.x ?? '?'}, ${current.y ?? '?'} (${current.w}×${current.h})`);

    const btn = panel.querySelector('#ui-building-btn-pause');
    btn.disabled = false;
    pauseBtnLocked = false;
    syncPause(btn, current.workPaused);
    syncSubtitle(current.workPaused);

    LOG.info('[ui-building] Menü sichtbar (pause-fix) für', current.id);
  }

  function hide(){
    ensurePanel();
    panel.style.display = 'none';
    panel.classList.add('hidden');
    current = null;
  }

  // Multi-event open
  ['cb:building:menu-open','cb:building:selected','cb:building:select'].forEach((name)=>{
    window.addEventListener(name, (ev)=> show(ev.detail));
  });

  // Optional: Core sync event (wenn dein Core es feuert)
  window.addEventListener('cb:building:pause-changed', (ev)=>{
    const d = ev?.detail || {};
    const uid = d.uid || d.buildingUid || null;
    const id  = d.id  || d.buildingId  || null;
    const paused = !!d.paused;

    if (current && ((uid && current.uid===uid) || (id && current.id===id))) {
      current.workPaused = paused;
      const btn = panel?.querySelector('#ui-building-btn-pause');
      syncPause(btn, paused);
      syncSubtitle(paused);
      // unlock
      pauseBtnLocked = false;
      if (btn) btn.disabled = false;
    }
  });

  ensurePanel();
  LOG.ok('✅ [ui-building] pause-toggle-fix loaded');
})();
