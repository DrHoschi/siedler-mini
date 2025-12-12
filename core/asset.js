/* ============================================================================
 * Datei   : core/asset.js
 * Version : v25.12.11-assets-api-min (register/get/draw + assets-ready once)
 *
 * Zweck   :
 *   - Minimaler, stabiler Asset-Loader + zentrale Zeichen-API
 *   - Stellt bereit:
 *       window.Assets.registerImage(key, url)
 *       window.Assets.get(key)
 *       window.Assets.draw(ctx, key, dx, dy, dw, dh)
 *       window.Assets.ready()  -> Promise
 *
 * WICHTIG:
 *   - Debug/Checker bleibt drin
 *   - cb:assets-ready feuert genau 1×
 * ========================================================================== */
(function(){
  'use strict';

  const TAG='[assets]';
  if (window.__ASSETS_LOADER__) { console.info(TAG,'bereits aktiv – skip'); return; }
  window.__ASSETS_LOADER__ = true;

  const INFO=(...a)=>(window.CBLog?.info||console.info)(TAG, ...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG, ...a);

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const Images = new Map(); // key -> { img, url, ok, err }
  let emitted = false;

  let _readyResolve;
  const _readyPromise = new Promise(res => { _readyResolve = res; });

  function emitOnce(name, detail){
    if (emitted) return;
    emitted = true;
    window.dispatchEvent(new CustomEvent(name,{ detail }));
  }

  function isDrawableImage(img){
    return !!(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  }

  // ---------------------------------------------------------------------------
  // API
  // ---------------------------------------------------------------------------
  const Assets = {
    /**
     * Registriert ein Image-Key → URL.
     * Lädt sofort (lazy wäre auch möglich, aber wir wollen debug-stabil).
     */
    registerImage(key, url){
      key = String(key||'').trim();
      url = String(url||'').trim();
      if (!key || !url) {
        WARN('registerImage: ungültig', { key, url });
        return null;
      }

      // bereits registriert?
      if (Images.has(key)) return Images.get(key).img;

      const img = new Image();
      const rec = { img, url, ok:false, err:null };
      Images.set(key, rec);

      img.onload = () => { rec.ok = true; };
      img.onerror = (e) => { rec.ok = false; rec.err = e; WARN('Image load failed:', key, url, e); };
      img.src = url;

      return img;
    },

    /** Holt das Image (oder null) */
    get(key){
      const rec = Images.get(String(key||''));
      return rec ? rec.img : null;
    },

    /**
     * Zeichnet ein registriertes Image.
     * return true wenn gezeichnet, sonst false.
     */
    draw(ctx, key, dx, dy, dw, dh){
      const img = Assets.get(key);
      if (!isDrawableImage(img)) return false;
      try {
        ctx.drawImage(img, dx, dy, dw, dh);
        return true;
      } catch (e) {
        WARN('draw failed:', key, e);
        return false;
      }
    },

    /** Promise, wenn initiale Registrierung abgeschlossen ist */
    ready(){ return _readyPromise; },

    /** Debug-Snapshot */
    debug(){
      const out = { images: Images.size, keys: Array.from(Images.keys()) };
      return out;
    }
  };

  // Global export
  window.Assets = Assets;

  // ---------------------------------------------------------------------------
  // MINIMAL LOAD LIST (Welt-Ressourcen) – HIER ERWEITERN WIR JETZT
  // ---------------------------------------------------------------------------
  function registerBasePack(){
    // HUD-Icons existieren bereits, aber sind NICHT Weltobjekte.
    // Für Weg A brauchen wir Welt-Sprites (Platzhalter-Pfade – du kannst später tauschen).
    Assets.registerImage('world.tree.0',  'assets/world/trees/tree_0.png');
    Assets.registerImage('world.tree.1',  'assets/world/trees/tree_1.png');
    Assets.registerImage('world.tree.2',  'assets/world/trees/tree_2.png');
    Assets.registerImage('world.tree.3',  'assets/world/trees/tree_3.png');

    Assets.registerImage('world.stone.1', 'assets/world/stones/stone_1.png');
    Assets.registerImage('world.stone.2', 'assets/world/stones/stone_2.png');
    Assets.registerImage('world.stone.3', 'assets/world/stones/stone_3.png');

    Assets.registerImage('world.fish.0',  'assets/world/fish/fish_0.png');
    Assets.registerImage('world.fish.1',  'assets/world/fish/fish_1.png');
    Assets.registerImage('world.fish.2',  'assets/world/fish/fish_2.png');
    Assets.registerImage('world.fish.3',  'assets/world/fish/fish_3.png');
    Assets.registerImage('world.fish.4',  'assets/world/fish/fish_4.png');

    // Hinweis: Diese Dateien müssen existieren – sonst bleibt Fallback aktiv.
  }

  async function loadAll(){
    // 1) Base registrieren
    registerBasePack();

    // 2) Wir "warten" kurz bis Bilder entweder geladen sind oder timeouten
    //    (damit cb:assets-ready nicht ewig hängt)
    const t0 = Date.now();
    const TIMEOUT_MS = 2500;

    function allSettled(){
      for (const rec of Images.values()){
        // complete kann auch true sein, wenn error → dann naturalWidth=0
        if (!rec.img.complete) return false;
      }
      return true;
    }

    while (!allSettled() && (Date.now() - t0) < TIMEOUT_MS) {
      await new Promise(r => setTimeout(r, 50));
    }

    // 3) Summary
    let ok = 0, fail = 0;
    for (const rec of Images.values()){
      if (isDrawableImage(rec.img)) ok++; else fail++;
    }

    const detail = {
      ok: true,
      counts: { images: Images.size, ok, fail },
      version: 'v25.12.11-assets-api-min',
      errors: fail ? ['Some images missing (fallback will draw)'] : []
    };

    INFO('Assets bereit ✓', detail);
    _readyResolve(detail);
    emitOnce('cb:assets-ready', detail);
  }

  loadAll().catch(err=>{
    WARN('loadAll crash', err);
    _readyResolve({ ok:false, error:String(err) });
    emitOnce('cb:assets-ready',{ ok:false, error:String(err) });
  });

})();
