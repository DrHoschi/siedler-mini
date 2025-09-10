/* Neue Siedler – UI Start (v17.8.9)
   Verantwortlich für das Start-Panel (Titel + Buttons) und das Entfernen des Layers.
*/
(function () {
  const log  = (window.CBLog?.info || console.log);
  const ok   = (window.CBLog?.ok   || console.log);
  const warn = (window.CBLog?.warn || console.warn);
  const err  = (window.CBLog?.err  || console.error);

  log("[ui-start] geladen (v17.8.9)");

  const root = document.getElementById('start-panel');
  if (!root) {
    warn("[ui-start] kein #start-panel gefunden – nichts zu tun.");
    return;
  }

  // Buttons können via HTML vorhanden sein ODER wir hängen sie, falls nicht da, dynamisch rein.
  let btnNew  = root.querySelector('#btnStartNew');
  let btnRes  = root.querySelector('#btnStartResume');
  let btnRst  = root.querySelector('#btnStartReset');
  let btnFull = root.querySelector('#btnStartFullscreen');

  // Falls die Card auskommentiert wurde, bauen wir sie minimal, damit die Buttons existieren.
  if (!btnNew || !btnRes || !btnRst || !btnFull) {
    const card = document.createElement('div');
    card.className = 'ui-start-card';
    card.setAttribute('role','dialog');
    card.setAttribute('aria-modal','true');
    card.innerHTML = `
      <h1>Neue Siedler</h1>
      <div class="actions">
        <button id="btnStartNew" class="btn main">Neues Spiel</button>
        <button id="btnStartResume" class="btn">Weiterspielen</button>
        <button id="btnStartReset" class="btn ghost">Reset</button>
        <button id="btnStartFullscreen" class="btn ghost">Fullscreen</button>
      </div>`;
    // Card einsetzen, falls noch nicht da
    const hasCard = root.querySelector('.ui-start-card');
    if (!hasCard) root.appendChild(card);
    // Buttons re-grabben
    btnNew  = root.querySelector('#btnStartNew');
    btnRes  = root.querySelector('#btnStartResume');
    btnRst  = root.querySelector('#btnStartReset');
    btnFull = root.querySelector('#btnStartFullscreen');
  }

  function hardRemoveStartLayer() {
    try {
      // 1) Start-Panel entfernen
      if (root && root.parentNode) {
        root.parentNode.removeChild(root);
        ok("[ui-start] Start-Layer entfernt.");
      }
      // 2) Sicherheitskehrer: evtl. stehengebliebene Overlays entfernen
      const zombie = document.querySelector('#inspector-fallback');
      if (zombie) {
        zombie.remove();
        warn("[ui-start] inspector-fallback (zombie) entsorgt.");
      }
      // 3) Fokus auf Canvas, damit Safari korrekt rendert
      const canvas = document.getElementById('game');
      canvas?.focus?.();
    } catch (e) {
      err("[ui-start] Entfernen Start-Layer fehlgeschlagen:", e);
    }
  }

  // === Button Aktionen ===
  btnNew?.addEventListener('click', () => {
    ok("[ui-start] Start klick (Neues Spiel)");
    // Event für Engine/Bootstrap
    window.dispatchEvent(new CustomEvent('cb:game-start', { detail:{ mode:'new' } }));
    // Layer weg
    hardRemoveStartLayer();
  });

  btnRes?.addEventListener('click', () => {
    ok("[ui-start] Start klick (Weiterspielen)");
    window.dispatchEvent(new CustomEvent('cb:game-start', { detail:{ mode:'resume' } }));
    hardRemoveStartLayer();
  });

  btnRst?.addEventListener('click', () => {
    ok("[ui-start] Reset klick");
    try {
      localStorage?.clear?.();
      (window.CBLog?.ok||console.log)("[ui-start] Storage geleert.");
    } catch(_){}
  });

  btnFull?.addEventListener('click', async () => {
    ok("[ui-start] Fullscreen klick");
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch(e){ warn("[ui-start] Fullscreen failed:", e); }
  });

})();
