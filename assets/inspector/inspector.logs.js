/* ============================================================================
 * Inspector Logs – v18.13.5
 *  - Rendert Filter + Logliste in die vorgegebenen Slots
 *  - Holt Historie aus CBLog.getBuffer(), streamt neue Einträge
 *  - Copy/Export-Buttons, Suche, Level-Filter
 *  - KEIN body-Append, nur Slots (ins-logs-controls / ins-logs-view)
 * ========================================================================== */
(function () {
  'use strict';

  const MOD = '[inspector.logs]';
  const VER = 'v18.13.5';
  const core = window.__INSPECTOR_CORE__;
  if (!core || !core.api || typeof core.api.getSlot !== 'function') {
    console.warn(MOD, 'Core API fehlt – breche ab.');
    return;
  }

  const ok   = (...a)=> (window.CBLog?.ok   || console.log).call(console, MOD, ...a);
  const warn = (...a)=> (window.CBLog?.warn || console.warn).call(console, MOD, ...a);

  // --- State ----------------------------------------------------------------
  let els = { view:null, search:null, bInfo:null, bOk:null, bWarn:null, bErr:null };
  const state = { showInfo:true, showOk:true, showWarn:true, showErr:true, q:'', counts:{info:0,ok:0,warn:0,err:0} };
  let raw = [];       // Rohpuffer (Objekte oder Strings)
  let lastLen = 0;    // für Poll-Fallback
  let pollTimer = null;

  // --- Utils ----------------------------------------------------------------
  const LVL = { info:'log-info', ok:'log-ok', warn:'log-warn', err:'log-error', error:'log-error' };

  function detectLevel(line) {
    if (!line) return 'info';
    if (typeof line === 'object') {
      return String(line.lvl || line.level || 'info').toLowerCase();
    }
    const s = String(line);
    if (/\bERR(OR)?\b/i.test(s))  return 'err';
    if (/\bWARN(ING)?\b/i.test(s))return 'warn';
    if (/\bOK\b/i.test(s))        return 'ok';
    if (/\bINFO\b/i.test(s))      return 'info';
    return 'info';
  }

  function toText(line) {
    if (line == null) return '';
    if (typeof line === 'object') {
      const t = line.t || line.time || '';
      const src = line.src || line.source || 'console';
      const msg = line.msg ?? line.message ?? line.text ?? JSON.stringify(line);
      return t ? `[${t}] ${src} ${msg}` : `${src} ${msg}`;
    }
    return String(line);
  }

  function readBuffer() {
    try {
      const buf = window.CBLog?.getBuffer?.();
      return Array.isArray(buf) ? buf.slice() : [];
    } catch(_){ return []; }
  }

  // --- Mount UI -------------------------------------------------------------
  function buildControls() {
    const host = core.api.getSlot('logs-controls');
    if (!host) return;
    host.innerHTML = '';

    const bar = document.createElement('div');
    bar.className = 'ins-controls';

    // Toggle helper
    const mkToggle = (label, key, title)=>{
      const btn = document.createElement('button');
      btn.className = 'ins-toggle';
      btn.type = 'button';
      btn.title = title || '';
      btn.innerHTML = `<span class="tbox">${label}</span>`;
      btn.classList.toggle('active', !!state[key]);
      btn.addEventListener('click', ()=>{
        state[key] = !state[key];
        btn.classList.toggle('active', !!state[key]);
        renderList();
      });
      return btn;
    };

    const tInfo = mkToggle('INFO', 'showInfo', 'Info ein/aus');
    const tOk   = mkToggle('OK',   'showOk',   'Ok ein/aus');
    const tWarn = mkToggle('WARN', 'showWarn', 'Warn ein/aus');
    const tErr  = mkToggle('ERR',  'showErr',  'Fehler ein/aus');

    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Suche…';
    search.className = 'ins-search';
    search.addEventListener('input', ()=>{
      state.q = (search.value || '').trim().toLowerCase();
      renderList();
    });
    els.search = search;

    const btnCopy = document.createElement('button');
    btnCopy.className = 'ins-btn';
    btnCopy.type = 'button';
    btnCopy.textContent = 'Kopieren';
    btnCopy.addEventListener('click', async ()=>{
      try {
        const all = raw.map(toText).join('\n');
        await navigator.clipboard.writeText(all);
        flash(btnCopy);
      } catch(_){ alert('Kopieren fehlgeschlagen'); }
    });

    const btnExport = document.createElement('button');
    btnExport.className = 'ins-btn';
    btnExport.type = 'button';
    btnExport.textContent = 'Export';
    btnExport.addEventListener('click', ()=>{
      const blob = new Blob([raw.map(toText).join('\n')], {type:'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='logs.txt';
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    bar.append(tInfo,tOk,tWarn,tErr,search,btnCopy,btnExport);
    host.appendChild(bar);
  }

  function mountView() {
    const host = core.api.getSlot('logs-view');
    if (!host) return;
    host.innerHTML = '';
    const view = document.createElement('div');
    view.className = 'slot-logs-view ins-logview';
    host.appendChild(view);
    els.view = view;
  }

  function flash(el){
    el.classList.add('ins-flash');
    setTimeout(()=> el.classList.remove('ins-flash'), 600);
  }

  // --- Render ---------------------------------------------------------------
  function renderList() {
    if (!els.view) return;

    const q = state.q;
    state.counts.info = state.counts.ok = state.counts.warn = state.counts.err = 0;

    const frag = document.createDocumentFragment();
    for (let i=0;i<raw.length;i++){
      const ent = raw[i];
      const txt = toText(ent);
      const lvl = detectLevel(ent);

      // Stats
      if (state.counts[lvl] != null) state.counts[lvl]++;

      // Level-Filter
      if ((lvl==='info' && !state.showInfo) ||
          (lvl==='ok'   && !state.showOk)   ||
          (lvl==='warn' && !state.showWarn) ||
          (lvl==='err'  && !state.showErr)) continue;

      // Text-Filter
      if (q && !txt.toLowerCase().includes(q)) continue;

      const line = document.createElement('div');
      line.className = `${LVL[lvl]||'log-info'} log-line`;
      line.textContent = txt;
      frag.appendChild(line);
    }

    els.view.innerHTML = '';
    els.view.appendChild(frag);
    // Auto an Ende scrollen
    els.view.scrollTop = els.view.scrollHeight;
  }

  function pushOne(ent){
    if (!els.view) return;
    raw.push(ent);
    // Nur rendern, wenn Eintrag die Filter besteht
    const txt = toText(ent);
    const lvl = detectLevel(ent);
    const q = state.q;
    const passLevel =
      (lvl!=='info'||state.showInfo) &&
      (lvl!=='ok'  ||state.showOk)   &&
      (lvl!=='warn'||state.showWarn) &&
      (lvl!=='err' ||state.showErr);
    const passText = !q || txt.toLowerCase().includes(q);

    if (passLevel && passText) {
      const line = document.createElement('div');
      line.className = `${LVL[lvl]||'log-info'} log-line`;
      line.textContent = txt;
      els.view.appendChild(line);
      els.view.scrollTop = els.view.scrollHeight;
    }
  }

  // --- Stream / Poll --------------------------------------------------------
  function startStream(){
    // Historie
    raw = readBuffer();
    lastLen = raw.length;
    renderList();

    // Live via Event
    if (typeof window.CBLog?.on === 'function') {
      try {
        window.CBLog.on('append', pushOne);
        ok('Stream verbunden.', VER);
        return;
      } catch(_){}
    }
    // Fallback Poll
    pollTimer = setInterval(()=>{
      const buf = readBuffer();
      if (buf.length !== lastLen) {
        const diff = buf.slice(lastLen);
        lastLen = buf.length;
        diff.forEach(pushOne);
      }
    }, 800);
    warn('Poll-Fallback aktiv (kein CBLog.on).');
  }

  function stopStream(){
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    if (typeof window.CBLog?.off === 'function') {
      try { window.CBLog.off('append', pushOne); } catch(_){}
    }
  }

  // --- Mount in Core --------------------------------------------------------
  core.api.mount('logs', ()=>{
    buildControls();
    mountView();
    startStream();

    ok('bereit %s', VER);
    return ()=> stopStream();
  });

  // Optional: Wenn Inspektor bereits offen ist (z.B. AutoOpen aus Alt-Caches),
  // sofort Slots initial befüllen:
  if (document.body.classList.contains('inspector-open')) {
    try { buildControls(); mountView(); startStream(); } catch(_){}
  }
})();
