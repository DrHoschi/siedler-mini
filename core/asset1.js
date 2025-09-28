/* ============================================================================
 * assets/core/asset.js – sehr schlanker Asset-Loader
 * Version: v17.8.7
 * API (global):
 *   Assets.add(key, url)
 *   Assets.has(key)            -> boolean
 *   Assets.get(key)            -> HTMLImageElement | null
 *   Assets.loadAll()           -> Promise<void> (lädt manifest)
 *   Assets.ensureReady()       -> Promise<void> (idempotent)
 * Events:
 *   cb:assets-ready            -> wenn alles geladen wurde
 * Notizen:
 *   - Minimal gehalten; lädt PNG/JPG als Image (decode()).
 *   - Default-Manifest enthält das Terrain-Tileset.
 * ========================================================================== */
(function () {
  'use strict';

  var MOD = '[assets]';
  var VER = 'v17.8.7';

  function logOk(m){ try{(window.CBLog?.ok||console.log)(MOD+' '+m);}catch(_){console.log(MOD+' '+m);} }
  function logWarn(m){ try{(window.CBLog?.warn||console.warn)(MOD+' '+m);}catch(_){console.warn(MOD+' '+m);} }
  function logErr(m){ try{(window.CBLog?.err||console.error)(MOD+' '+m);}catch(_){console.error(MOD+' '+m);} }

  // ---- interner Zustand -----------------------------------------------------
  var _manifest = Object.create(null);   // key -> url
  var _images   = Object.create(null);   // key -> HTMLImageElement
  var _ready    = false;
  var _loadingPromise = null;

  // Default-Assets: hier mindestens dein Terrain-Tileset
  _manifest['tileset.terrain'] = 'assets/tiles/tileset.terrain.png';

  // ---- Helpers --------------------------------------------------------------
  function loadImage(url){
    return new Promise(function(resolve, reject){
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = function(){ img.decode?.().finally(function(){ resolve(img); }); };
      img.onerror = function(e){ reject(new Error('Asset-Load fehlgeschlagen: '+url)); };
      img.src = url + (url.includes('?') ? '&' : '?') + 'v=' + (window.__cb?.indexVersion || 'nocache');
    });
  }

  async function loadManifest(){
    var keys = Object.keys(_manifest);
    for (var i=0;i<keys.length;i++){
      var k = keys[i];
      if (_images[k]) continue; // schon geladen
      var url = _manifest[k];
      var img = await loadImage(url);
      _images[k] = img;
      logOk('geladen: '+k+' ('+url+')');
    }
  }

  async function ensureReady(){
    if (_ready) return;
    if (_loadingPromise) return _loadingPromise;
    _loadingPromise = (async function(){
      try{
        await loadManifest();
        _ready = true;
        try{ window.dispatchEvent(new Event('cb:assets-ready')); }catch(_){}
        logOk('ready ('+VER+')');
      }catch(e){
        logErr(e && e.message || e);
        throw e;
      }
    })();
    return _loadingPromise;
  }

  // ---- Public API -----------------------------------------------------------
  var Assets = (window.Assets = window.Assets || {});
  Assets.add = function(key, url){ _manifest[key] = url; _ready = false; };
  Assets.has = function(key){ return !!_images[key]; };
  Assets.get = function(key){ return _images[key] || null; };
  Assets.loadAll    = function(){ _ready=false; _loadingPromise=null; return ensureReady(); };
  Assets.ensureReady= ensureReady;

  // Auto-Warmup, aber nicht blockierend
  ensureReady().catch(function(e){ logWarn('Auto-Warmup: '+(e&&e.message||e)); });

  logOk('Modul geladen ('+VER+')');
})();
