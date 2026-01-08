/* ============================================================================
 * ui/ui-building-menu.js
 * v26.01.08-menu-visible-hotfix
 * ----------------------------------------------------------------------------
 * HOTFIX:
 *  - Menü wurde geöffnet (Log vorhanden), war aber unsichtbar:
 *      -> z-index / display / positioning / hidden-class mismatch
 *  - Dieser Patch erzwingt Sichtbarkeit + hoher z-index.
 *  - Robust gegen verschiedene Hidden-Klassen: hidden / is-hidden.
 * ========================================================================== */
(function () {
  'use strict';

  const LOG = window.CBLog || { info:console.log, warn:console.warn, ok:console.log, error:console.error };

  // Prevent double-bind
  if (window.__UI_BUILDING_MENU_BOUND__) return;
  window.__UI_BUILDING_MENU_BOUND__ = true;

  const UI_ROOT = document.getElementById('ui-root') || document.body;

  let panel = document.getElementById('ui-building-menu');
  let current = null;

  function ensurePanel(){
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'ui-building-menu';

    // --- Force visibility layer ---
    panel.style.position = 'fixed';
    panel.style.left = '12px';
    panel.style.top  = '72px';
    panel.style.zIndex = '99999';
    panel.style.pointerEvents = 'auto';
    panel.style.display = 'block';

    // basic fallback styling (falls CSS fehlt / überschrieben)
    panel.style.minWidth = '240px';
    panel.style.maxWidth = '320px';
    panel.style.padding = '10px';
    panel.style.borderRadius = '12px';
    panel.style.background = 'rgba(245, 236, 219, 0.95)';
    panel.style.border = '2px solid rgba(120,90,40,0.9)';
    panel.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
    panel.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial';

    // Title row
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
      const next = !current.workPaused;
      current.workPaused = next;
      syncPause(btnPause, next);
      syncSubtitle(next);
      window.dispatchEvent(new CustomEvent('req:building:setPaused', {
        detail: { id: current.id||null, uid: current.uid||null, paused: next }
      }));
    });

    footer.appendChild(btnWorkArea);
    footer.appendChild(btnPause);

    panel.appendChild(header);
    panel.appendChild(sub);
    panel.appendChild(body);
    panel.appendChild(footer);

    UI_ROOT.appendChild(panel);

    // Start hidden
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

    panel.style.display = 'block';
    panel.classList.remove('hidden','is-hidden');

    const t = panel.querySelector('#ui-building-title');
    if (t) t.textContent = current.id || 'Gebäude';

    setField('id', current.id);
    setField('status', current.status);
    setField('category', current.category);
    setField('pos', `${current.x ?? '?'}, ${current.y ?? '?'} (${current.w}×${current.h})`);

    const btn = panel.querySelector('#ui-building-btn-pause');
    syncPause(btn, current.workPaused);
    syncSubtitle(current.workPaused);

    LOG.info('[ui-building] Menü sichtbar (hotfix) für', current.id);
  }

  function hide(){
    ensurePanel();
    panel.style.display = 'none';
    panel.classList.add('hidden');
    current = null;
  }

  // Listen to multiple possible events
  ['cb:building:menu-open','cb:building:selected','cb:building:select'].forEach((name)=>{
    window.addEventListener(name, (ev)=> show(ev.detail));
  });

  ensurePanel();
  LOG.ok('✅ [ui-building] Menu-visible-hotfix loaded');
})();
