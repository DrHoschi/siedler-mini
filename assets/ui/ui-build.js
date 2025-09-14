/* ============================================================================
 * Neue Siedler – UI Build Dock
 * Version: v17.9.13
 * Abhängigkeit: window.Registry (assets/core/registry.js)
 * DOM: #build-panel wird gefüllt
 * Events: cb:build-open / cb:build-close / cb:build:select
 * ============================================================================
 */
(function (global, d){
  const logI = (global.CBLog?.info  || console.log).bind(console, "[ui-build]");
  const logW = (global.CBLog?.warn  || console.warn).bind(console, "[ui-build]");
  const logE = (global.CBLog?.error || console.error).bind(console, "[ui-build]");

  const $panel = d.getElementById("build-panel");
  if (!$panel) { logE("Kein #build-panel im DOM gefunden."); return; }

  // --- Styles (kleines Safety-Net, falls CSS nicht geladen wäre) ------------
  const ensureInlineStylesOnce = (() => {
    let done=false; return () => {
      if (done) return; done=true;
      $panel.style.position       = "fixed";
      $panel.style.left           = "0";
      $panel.style.right          = "0";
      $panel.style.bottom         = "0";
      $panel.style.maxHeight      = "42vh";
      $panel.style.padding        = "16px 16px 20px";
      $panel.style.background     = "rgba(16,24,20,.92)";
      $panel.style.backdropFilter = "blur(6px)";
      $panel.style.borderTopLeftRadius  = "24px";
      $panel.style.borderTopRightRadius = "24px";
      $panel.style.boxShadow      = "0 -18px 36px rgba(0,0,0,.35)";
      $panel.style.overflowY      = "auto";
      $panel.style.zIndex         = "2147483600";
      $panel.style.display        = "none";
      $panel.setAttribute("role","dialog");
      $panel.setAttribute("aria-label","Bauen");
    };
  })();

  // --- Render ---------------------------------------------------------------
  function renderCategory(title){
    const h = d.createElement("h3");
    h.textContent = title;
    h.className = "build-cat";
    return h;
  }
  function renderButton(b){
    const btn = d.createElement("button");
    btn.className = "build-btn";
    btn.type = "button";
    btn.setAttribute("data-id", b.id);

    const img = d.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = b.name;
    img.src = b.sprite;

    const cap = d.createElement("span");
    cap.className = "cap";
    cap.textContent = b.name;

    btn.appendChild(img);
    btn.appendChild(cap);

    btn.addEventListener("click", () => {
      selectBuilding(b);
    });

    return btn;
  }
  function selectBuilding(b){
    try {
      global.dispatchEvent(new CustomEvent("cb:build:select", { detail: b }));
    } catch {}
    // Legacy-Brücken – rufen wir „best effort“
    try {
      // ui-bridge → GameCore?
      const ok =
        (global.GameCore?.place && global.GameCore.place(b.id)) ||
        (global.GameCore?.placeBuilding && global.GameCore.placeBuilding(b.id)) ||
        (global.GameCore?.build && global.GameCore.build(b.place || b.id));
      logI(`Build-Aktion: ${b.place || b.id} → ${ok ? "ok" : "noop"}`);
    } catch(e) {
      logW("Build-Aktion (Core) nicht verdrahtet:", e?.message || e);
    }
    close();
  }

  function render(){
    ensureInlineStylesOnce();

    if (!global.Registry || !global.Registry.__ready){
      logW("Registry nicht bereit – Menü bleibt leer bis cb:registry:ready");
      return;
    }

    // Daten holen
    const cats = global.Registry.list("categories");
    const all  = global.Registry.where("buildings", { enabled:true });

    // Panel leeren
    $panel.innerHTML = "";

    if (!cats.length || !all.length){
      const empty = d.createElement("p");
      empty.textContent = "Keine Baueinträge gefunden.";
      empty.style.opacity = ".85";
      empty.style.padding = "12px 8px 4px";
      $panel.appendChild(empty);
      logW("Keine Items in Registry gefunden – Menü leer.", { cats: cats.length, items: all.length });
      return;
    }

    // Layout-Container
    const wrap = d.createElement("div");
    wrap.className = "build-wrap"; // wird von assets/ui/ui-build.css schön gemacht

    // Kategorien → Buttons (einzeiliges Grid, auto-wrap)
    cats.forEach(cat=>{
      const group = d.createElement("section");
      group.className = "build-group";

      group.appendChild(renderCategory(cat.name));
      const row = d.createElement("div");
      row.className = "build-row";

      all.filter(b=>b.cat===cat.id).forEach(b=>{
        row.appendChild(renderButton(b));
      });

      group.appendChild(row);
      wrap.appendChild(group);
    });

    $panel.appendChild(wrap);
  }

  // --- Open/Close/Toggle ----------------------------------------------------
  function open(){
    render();
    $panel.style.display = "block";
    d.body.classList.add("has-build-open");
    try { global.dispatchEvent(new CustomEvent("cb:build-open")); } catch {}
  }
  function close(){
    $panel.style.display = "none";
    d.body.classList.remove("has-build-open");
    try { global.dispatchEvent(new CustomEvent("cb:build-close")); } catch {}
  }
  function toggle(){ ($panel.style.display==="block") ? close() : open(); }

  // Expose in GameUI
  global.GameUI = global.GameUI || {};
  global.GameUI.openBuild   = open;
  global.GameUI.closeBuild  = close;
  global.GameUI.toggleBuild = toggle;

  // Events & Boot
  global.addEventListener("cb:registry:ready", () => {
    logI("Registry bereit – UI wird gebootet.");
    render();
  });
  global.addEventListener("cb:registry:update", render);

  // Optional: wenn Startmenü „Neues Spiel“ dispatcht
  global.addEventListener("cb:game-start", () => {
    // automatisch rendern, aber geschlossen lassen
    render();
  });

  logI("geladen (v17.9.13) – wartet auf Registry.");
})(window, document);
