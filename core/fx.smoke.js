/* ============================================================================
 * Datei   : core/fx.smoke.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v26.01.08-fx-smoke-active-by-assignment
 *
 * Zweck:
 *   Rauch (Variante A) am Gebäude-Schornstein rendern – markerbasiert.
 *
 * Design-Ziele (wichtig!):
 *   ✅ Start mit Variante A (Loop-Atlas)
 *   ✅ Daten/Code so gebaut, dass Variante B (Partikel/Emitter) später
 *      ohne Datenbruch möglich ist.
 *   ✅ Rauch erscheint nur, wenn Gebäude "arbeitet".
 *      Ausnahme: HQ darf immer rauchen (wenn chimney marker vorhanden).
 *
 * Voraussetzungen:
 *   - Buildings haben Marker: def.markers.chimney {x,y} (pixel relativ zum Pivot)
 *   - Smoke-Atlas: fx_smoke_sprite_atlas
 *     Frames: smoke_v{0..3}_f{0..3}
 *
 * Working-Definition (heute):
 *   - Mindestens 1 Worker-Unit mit homeBuildingUid/homeUid == building.uid
 *     und u.__animState === 'work'
 *   - "Pause" wird als u.paused / u.__paused / u.task.paused toleriert.
 *   - Wenn ein Gebäude nicht arbeitet (z.B. Pause/Lager voll), sollte der
 *     Worker nicht im 'work'-State sein → Rauch aus.
 *
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[fx:smoke]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // --------------------------------------------------------------------------
  // KONFIG (User-Wunsch)
  // --------------------------------------------------------------------------
  const SMOKE_ATLAS_KEY = 'fx_smoke_sprite_atlas';
  const VARIANTS = 4;
  const FRAMES_PER_VARIANT = 4;

  // Default-FPS: ruhig/siedler-like
  const DEFAULT_FPS = 6; // langsamer (User-Feedback)

  // Wie lange Rauch "nachglühen" darf, falls der Worker-State kurz jittert.
  const ACTIVE_GRACE_MS = 600;

  // Wie lange Rauch nach "Pause" noch auslaufen darf (User-Wunsch)
  const PAUSE_FADE_MS = 900;

  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------
  const _variantByBuildingUid = new Map();   // uid -> 0..3
  const _activeUntilByUid     = new Map();   // uid -> performance.now()+ms
  const _pausedUntilByUid     = new Map();   // uid -> performance.now()+ms (Pause-Fade)

  // --------------------------------------------------------------------------
  // HELFER
  // --------------------------------------------------------------------------
  function _isHQ(b){
    const id = String(b?.id || b?.kind || b?.type || '');
    return id === 'b.hq' || id.endsWith('.hq') || id.includes('b.hq');
  }

  function _isPausedUnit(u){
    return !!(u?.paused || u?.__paused || u?.task?.paused || u?.__pause);
  }
  function _isBuildingWorkPaused(b){
    // Menü/Inspector können später diese Flags setzen.
    return !!(b?.workPaused || b?.__workPaused || b?.paused || b?.__paused);
  }

  function _isBuildingWorkBlocked(b){
    // „Kann nicht arbeiten“: Lager voll / fehlende Inputs / explizite Blockade.
    // Wir prüfen mehrere mögliche Felder, damit es auch mit künftigen Menü-States passt.
    const br = b?.blockedReason || b?.__blockedReason || b?.blockReason || b?.__blockReason;
    if (br) return true;
    return !!(b?.storageFull || b?.__storageFull || b?.workBlocked || b?.__workBlocked || b?.blocked || b?.__blocked || b?.canWork === false || b?.__canWork === false);
  }

  function _isBuildingAllowedToSmoke(b){
    // HQ-Ausnahme bleibt bestehen
    if (_isHQ(b)) return true;

    const uid = b?.uid || b?.bId || null;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    // Pause-Logik mit „Auslaufen“: Rauch soll nicht abrupt stoppen,
    // sondern nach kurzer Zeit ausfaden (User-Wunsch).
    if (_isBuildingWorkPaused(b)){
      if (uid){
        const until = _pausedUntilByUid.get(String(uid));
        if (!until){
          _pausedUntilByUid.set(String(uid), now + PAUSE_FADE_MS);
          return true; // noch kurz weiter rauchen
        }
        if (now < until) return true; // noch in Fade-Zeit
        return false; // Fade-Zeit vorbei → Rauch aus
      }
      return false;
    }else{
      // nicht pausiert → Fade-Deadline resetten
      if (uid) _pausedUntilByUid.delete(String(uid));
    }

    // Blockiert (z.B. Lager voll) → Rauch aus (optional später ebenfalls fade)
    if (_isBuildingWorkBlocked(b)) return false;

    return true;
  }


  function _stableHashToInt(str){
    // Sehr einfache, stabile Hash (deterministisch) – genügt für Variant-Choice.
    const s = String(str || '');
    let h = 2166136261;
    for (let i = 0; i < s.length; i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  function _pickVariantForBuilding(b){
    const uid = String(b?.uid || b?.bId || b?.id || '');
    if (!uid) return 0;
    if (_variantByBuildingUid.has(uid)) return _variantByBuildingUid.get(uid);

    // Stabil pro Gebäude: uid + tile-pos
    const key = `${uid}@${(b?.x|0)},${(b?.y|0)}`;
    const v = _stableHashToInt(key) % VARIANTS;
    _variantByBuildingUid.set(uid, v);
    return v;
  }

  function _markActive(uid){
    if (!uid) return;
    _activeUntilByUid.set(uid, performance.now() + ACTIVE_GRACE_MS);
  }

  function _isActiveNow(uid){
    const until = _activeUntilByUid.get(uid) || 0;
    return performance.now() <= until;
  }

  function _getBuildingDef(b){
    try{
      const R = window.Registry;
      const id = b?.id || b?.kind || b?.type || null;
      if (!R || !id) return null;
      if (typeof R.getBuilding === 'function') return R.getBuilding(id);
      if (typeof R.get === 'function') return R.get('buildings', id);
    }catch(_e){}
    return null;
  }

  function _getChimneyMarkerPx(b){
    const def = _getBuildingDef(b);
    const m = def?.markers?.chimney || null;
    if (m && Number.isFinite(m.x) && Number.isFinite(m.y)) return { x:m.x, y:m.y };
    return null;
  }

  function _isBuildingWorking(b){
    // HQ ist Sonderfall (User-Wunsch)
    if (_isHQ(b)) return true;

    const uid = b?.uid || b?.bId || null;
    if (!uid) return false;

    // Schneller Weg: wenn wir innerhalb der Grace-Window aktiv waren
    if (_isActiveNow(uid)) return true;

    // Sonst: Units scannen (nur Worker)
    try{
      const GU = window.GameUnits;
      const list = (GU && typeof GU.getUnits === 'function') ? (GU.getUnits() || []) : [];
      for (const u of list){
        if (!u || u.type !== 'worker') continue;
        if (_isPausedUnit(u)) continue;
        const hu = u.homeBuildingUid || u.homeUid || u.homeBuildingUidKey || null;
        if (String(hu) !== String(uid)) continue;
        // "Arbeitet" bedeutet hier: Worker gehört zum Gebäude und ist in einem aktiven Arbeitszyklus.
        // Wichtig: Beim Lumberjack läuft der Worker zum Workpoint raus (AnimState='walk').
        // Das Gebäude gilt trotzdem als aktiv → Rauch soll weiterlaufen.
        const aiMode = String(u.__ai?.mode || u.ai?.mode || '');
        const animState = String(u.__animState || u.animState || '');

        // NEU (User-Wunsch):
        // Rauch soll NICHT davon abhängen, ob der Worker gerade im Gebäude ist.
        // Sobald ein Worker dem Gebäude zugeordnet ist (homeUid) und nicht pausiert ist,
        // gilt das Gebäude als "aktiv", solange es nicht explizit blockiert/pausiert ist.
        //
        // Trotzdem: wir lassen die Grace-Window bestehen und versuchen zuerst
        // „echte Arbeitszustände“ zu erkennen (für spätere Feinlogik).
        const isClearlyWorking =
          (animState === 'work') ||
          (aiMode === 'work') ||
          (aiMode === 'toWork') ||
          (aiMode === 'toHome') ||
          (aiMode === 'walkToWork') ||
          (aiMode === 'walkToHome') ||
          (aiMode === 'harvest') ||
          (aiMode === 'chop') ||
          (aiMode === 'gather');

        const fallbackAssigned = true;

        if (isClearlyWorking || fallbackAssigned){
          // Gate: nur wenn das Gebäude grundsätzlich arbeiten darf
          if (_isBuildingAllowedToSmoke(b)){
            _markActive(uid);
            return true;
          }
        }
      }
    }catch(e){
      // nicht crashen
    }
    return false;
  }

  function _frameName(variant, frameIdx){
    const v = Math.max(0, Math.min(VARIANTS-1, variant|0));
    const f = Math.max(0, Math.min(FRAMES_PER_VARIANT-1, frameIdx|0));
    return `smoke_v${v}_f${f}`;
  }

  // --------------------------------------------------------------------------
  // PUBLIC API (für Debug/Inspector später)
  // --------------------------------------------------------------------------
  const SmokeFX = {
    key: SMOKE_ATLAS_KEY,
    getVariantForBuilding: _pickVariantForBuilding,
    isBuildingWorking: _isBuildingWorking,
    getChimneyMarkerPx: _getChimneyMarkerPx,
    markActiveByUid: (uid)=>_markActive(uid),

    /**
     * Zeichnet Rauch an einem Gebäude.
     *
     * Erwartet: building sprite pivot am Fußpunkt (bx + bw/2, by + bh)
     * basePx: 256 Standard (falls spr.basePx existiert, nimm das)
     */
    draw(ctx, b, pivotX, pivotY, scale, opts={}){
      const Assets = window.Assets;
      if (!Assets || typeof Assets.getAtlas !== 'function' || typeof Assets.drawAtlasFrame !== 'function') return false;

      const atlas = Assets.getAtlas(SMOKE_ATLAS_KEY);
      if (!atlas?.ok) return false;

      const marker = _getChimneyMarkerPx(b);
      if (!marker) return false;

      // Working-Gate
      // NEU: Rauch nur wenn Gebäude nicht pausiert / nicht blockiert (Lager voll etc.)
      if (!_isBuildingAllowedToSmoke(b)) return false;
      if (!_isBuildingWorking(b)) return false;

      const variant = _pickVariantForBuilding(b);
      const fps = Number(opts.fps || DEFAULT_FPS) || DEFAULT_FPS;
      const t = performance.now() / 1000;
      const fi = Math.floor(t * fps) % FRAMES_PER_VARIANT;
      const frame = _frameName(variant, fi);

      // Marker ist relativ zum Building-Pivot (SpriteTest-Konvention)
      const wx = pivotX + (marker.x * scale);
      const wy = pivotY + (marker.y * scale);

      // Rauch sollte i.d.R. unabhängig vom Building-Scale skaliert werden.
      // Aber wir hängen ihn bewusst an die Building-Scale, damit z.B. bei
      // Zoom/kleinen Gebäuden stimmig bleibt.
      const smokeScale = scale;

      return Assets.drawAtlasFrame(ctx, SMOKE_ATLAS_KEY, frame, wx, wy, {
        align: 'anchor',
        scale: smokeScale
      });
    }
  };

  window.SmokeFX = SmokeFX;
  LOG('SmokeFX ready', { key: SMOKE_ATLAS_KEY });
})();