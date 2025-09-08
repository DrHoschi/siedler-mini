<script>
/* ============================================================================
 * overlay.hooks.js – Inspector-Fallback nur, wenn Core NICHT rechtzeitig kommt
 * v1.4
 *  - zeigt nach kurzem Delay einen "Inspector lädt…" Dialog
 *  - verschwindet SOFORT, sobald der Core "ready" meldet
 *  - Close im Fallback schließt NUR den Fallback, NICHT den Inspector
 * ========================================================================== */
(function(){
  "use strict";

  const MOD = "[overlay-hooks]";
  const FALLBACK_ID = "inspector-fallback";
  let tFallback = null;        // Timer, der das Fallback später einblendet
  let mountedOnce = false;     // nur 1x globale Listener setzen

  // Utility: Element-Factory
  function make(tag, cls, text){
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  // Fallback erzeugen (Singleton)
  function ensureFallback(){
    let host = document.getElementById(FALLBACK_ID);
    if (host) return host;

    host = make("div", "ins-fallback-wrap");
    host.id = FALLBACK_ID;

    const panel = make("div", "ins-fallback");
    const head  = make("div", "ins-fallback-head");
    const title = make("div", "ins-fallback-title", "Inspector (Fallback)");
    const btnX  = make("button", "ins-fallback-close");
    btnX.type = "button";
    btnX.setAttribute("aria-label","Schließen");
    btnX.textContent = "Schließen";
    btnX.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      hideFallback(); // nur Dialog ausblenden
    });

    head.append(title, btnX);
    const body  = make("div", "ins-fallback-body", "Inspector lädt…");
    panel.append(head, body);
    host.append(panel);
    document.body.append(host);
    return host;
  }

  function showFallback(){
    const host = ensureFallback();
    host.style.display = "block";
  }
  function hideFallback(){
    const host = document.getElementById(FALLBACK_ID);
    if (host) host.style.display = "none";
    if (tFallback){ clearTimeout(tFallback); tFallback = null; }
  }
  function removeFallback(){
    const host = document.getElementById(FALLBACK_ID);
    if (host && host.parentNode) host.parentNode.removeChild(host);
    if (tFallback){ clearTimeout(tFallback); tFallback = null; }
  }

  // Startet die Fallback-Uhr – wird gecleart, wenn Core rechtzeitig ready ist
  function armFallbackTimer(){
    if (tFallback) { clearTimeout(tFallback); tFallback = null; }
    tFallback = setTimeout(()=>{
      // nur zeigen, wenn der Inspector nicht schon sichtbar & ready ist
      const ins = document.getElementById("inspector");
      const ready = !!window.__INS_READY__;
      const open  = !!document.body.classList.contains("inspector-open");
      if (!ready || !ins || !open) showFallback();
    }, 900); // Delay: < 1s fühlt sich reaktiv an, reicht aber als Safety
  }

  // ── Globale Events vom Core ────────────────────────────────────────────────
  function wireOnce(){
    if (mountedOnce) return;
    mountedOnce = true;

    // Core kündigt "wir öffnen jetzt" an → Fallback-Countdown starten
    document.addEventListener("cb:inspector-open", armFallbackTimer, {passive:true});

    // Core meldet "sichtbar" → Fallback sofort weg
    document.addEventListener("cb:inspector-opened", hideFallback, {passive:true});

    // Core meldet "UI fertig gemountet" → Marker setzen + Fallback weg
    document.addEventListener("cb:inspector-ready", ()=>{
      window.__INS_READY__ = true;
      hideFallback();
    }, {passive:true});

    // Bei Schließen immer aufräumen
    document.addEventListener("cb:inspector-close", removeFallback, {passive:true});

    // Hard-Safety: Wenn #inspector im DOM auftaucht, fallback sicher aus
    const mo = new MutationObserver(()=>{
      if (document.getElementById("inspector")) hideFallback();
    });
    mo.observe(document.documentElement, {childList:true, subtree:true});
  }

  // sofort aktivieren
  wireOnce();

  // Minimal-CSS (nur falls nicht in inspector.css vorhanden)
  const css = `
  .ins-fallback-wrap{
    position:fixed; inset:0; z-index:2147483647; display:none;
    background:rgba(0,0,0,.28); backdrop-filter: blur(2px);
  }
  .ins-fallback{
    position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
    min-width: 280px; max-width: 86vw;
    background:#1f2428; color:#e9eef3; border-radius:12px;
    box-shadow:0 18px 48px rgba(0,0,0,.45);
    overflow:hidden; border:1px solid rgba(255,255,255,.08);
  }
  .ins-fallback-head{
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 12px; border-bottom:1px solid rgba(255,255,255,.08);
  }
  .ins-fallback-title{ font-weight:700; }
  .ins-fallback-close{
    border:none; border-radius:999px; padding:6px 12px; cursor:pointer;
    background:#32414d; color:#fff;
  }
  .ins-fallback-close:active{ transform:translateY(1px); }
  .ins-fallback-body{ padding:14px 12px; opacity:.9; }
  `;
  const styleTag = document.createElement("style");
  styleTag.setAttribute("data-ins","fallback-css");
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  (window.CBLog?.ok || console.log)(MOD, "bereit v1.4");
})();
</script>
