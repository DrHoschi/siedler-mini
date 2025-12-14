/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.assets-v1.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.12.14-assets-tab
 *
 * Zweck   :
 *   Neuer Inspector-Tab "Assets"
 *   - Zeigt live den Ladezustand von Atlanten/Assets an (ok:true/false).
 *   - Hilft sofort zu verstehen, warum Fallbacks greifen (404, JSON kaputt, PNG kaputt).
 *
 * Datenquellen (robust, Reihenfolge):
 *   1) window.AssetStatus.atlas   (von core/asset.js gepflegt, bevorzugt)
 *   2) window.Assets.atlases      (Map mit Entry {name, ok, jsonUrl, imageUrl, names...})
 *
 * Hinweise:
 *   - KEIN module/exports (Inspector läuft bewusst "classic").
 *   - Debug/Checker bleibt drin.
 * ========================================================================== */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }

  function btn(label, onClick) {
    const b = el('button', 'insp-btn', label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function safe(v, fallback='') {
    return (v == null) ? fallback : String(v);
  }

  function yesNoIcon(ok) {
    return ok ? '✅' : '❌';
  }

  function getAtlasStatusList() {
    // 1) AssetStatus (bevorzugt)
    const s = window.AssetStatus?.atlas;
    if (s && typeof s === 'object') {
      return Object.entries(s).map(([name, st]) => ({
        name,
        ok: !!st?.ok,
        frames: st?.frames ?? st?.frameCount ?? null,
        jsonUrl: st?.jsonUrl ?? st?.json ?? st?.jsonTried ?? '',
        imageUrl: st?.imageUrl ?? st?.png ?? '',
        err: st?.err ?? st?.error ?? ''
      }));
    }

    // 2) Fallback: Assets.atlases Map
    const a = window.Assets?.atlases;
    if (a && typeof a.forEach === 'function') {
      const out = [];
      a.forEach((entry, name) => {
        out.push({
          name: entry?.name || name,
          ok: !!entry?.ok,
          frames: entry?.names?.length ?? null,
          jsonUrl: entry?.jsonUrl ?? '',
          imageUrl: entry?.imageUrl ?? '',
          err: (entry?.ok ? '' : (window.Assets?.state?.errors?.slice(-1)[0] || ''))
        });
      });
      return out;
    }

    return [];
  }

  // Kopieren in die Zwischenablage (Safari: kann fehlschlagen – dann loggen wir)
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(String(text));
      return true;
    } catch (e) {
      console.warn('[insp/assets] clipboard failed', e);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Tab Render
  // --------------------------------------------------------------------------

  function render(sec) {
    sec.textContent = '';

    const root = el('div', 'insp-pane');
    const title = el('div', 'insp-title', 'Assets');
    const sub = el('div', 'insp-sub', 'Atlas-Status & Debug-Hilfe (ok:true/false)');

    // Controls
    const controls = el('div', 'insp-row');
    const onlyBroken = el('label', 'insp-label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = false;
    onlyBroken.appendChild(cb);
    onlyBroken.appendChild(document.createTextNode(' nur Fehler anzeigen'));

    const refreshBtn = btn('↻ Refresh', () => buildTable());
    const copyBtn = btn('Copy JSON', async () => {
      const rows = getAtlasStatusList();
      const ok = await copyToClipboard(JSON.stringify(rows, null, 2));
      if (!ok) console.log('[insp/assets] rows:', rows);
    });

    controls.appendChild(refreshBtn);
    controls.appendChild(copyBtn);
    controls.appendChild(onlyBroken);

    // Table container
    const box = el('div', 'insp-box');
    const tableWrap = el('div', 'insp-tablewrap');
    box.appendChild(tableWrap);

    // Small hint / quick console probes
    const hint = el('div', 'insp-hint');
    hint.innerHTML =
      '<div><b>Quick Checks (Konsole):</b></div>' +
      '<div><code>window.AssetStatus?.atlas</code></div>' +
      '<div><code>Array.from(window.Assets?.atlases?.values()||[]).map(a=>({name:a.name,ok:a.ok}))</code></div>';

    root.appendChild(title);
    root.appendChild(sub);
    root.appendChild(controls);
    root.appendChild(box);
    root.appendChild(hint);

    sec.appendChild(root);

    function buildTable() {
      tableWrap.textContent = '';

      const rowsAll = getAtlasStatusList()
        .sort((a,b)=> String(a.name).localeCompare(String(b.name)));

      const rows = cb.checked ? rowsAll.filter(r=>!r.ok) : rowsAll;

      if (!rows.length) {
        tableWrap.appendChild(el('div', 'insp-empty',
          'Keine Atlas-Infos verfügbar. (Wurde core/asset.js schon gepatcht? / sind Atlanten geladen?)'));
        return;
      }

      const t = document.createElement('table');
      t.className = 'insp-table';

      const thead = document.createElement('thead');
      const hr = document.createElement('tr');
      ['OK','AtlasKey','Frames','JSON','PNG','Error'].forEach(h=>{
        const th = document.createElement('th'); th.textContent = h; hr.appendChild(th);
      });
      thead.appendChild(hr);
      t.appendChild(thead);

      const tbody = document.createElement('tbody');

      rows.forEach(r=>{
        const tr = document.createElement('tr');
        tr.className = r.ok ? 'ok' : 'bad';

        const tdOk = document.createElement('td'); tdOk.textContent = yesNoIcon(r.ok);
        const tdName = document.createElement('td'); tdName.textContent = safe(r.name);
        const tdFrames = document.createElement('td'); tdFrames.textContent = (r.frames==null?'':String(r.frames));
        const tdJson = document.createElement('td'); tdJson.textContent = safe(r.jsonUrl);
        const tdPng = document.createElement('td'); tdPng.textContent = safe(r.imageUrl);
        const tdErr = document.createElement('td'); tdErr.textContent = safe(r.err);

        tr.appendChild(tdOk);
        tr.appendChild(tdName);
        tr.appendChild(tdFrames);
        tr.appendChild(tdJson);
        tr.appendChild(tdPng);
        tr.appendChild(tdErr);

        tbody.appendChild(tr);
      });

      t.appendChild(tbody);
      tableWrap.appendChild(t);

      // Live: Checkbox wirkt sofort
      // (Safari iOS: change event zuverlässig)
    }

    cb.addEventListener('change', buildTable);

    // Initial build
    buildTable();

    // Optional: auto-refresh beim Assets-ready event
    window.addEventListener('cb:assets-ready', () => {
      // nur wenn Tab offen gerendert ist
      try { buildTable(); } catch {}
    });
  }

  // --------------------------------------------------------------------------
  // Register Tab
  // --------------------------------------------------------------------------
  if (typeof window.registerInspectorTab === 'function') {
    window.registerInspectorTab('assets', render);
  } else {
    console.warn('[insp/assets] registerInspectorTab fehlt (Adapter nicht geladen?)');
  }

})();
