/* ================================================================================================
   Siedler‑Mini V14.7‑hf2 — core/actor.js
   Zweck: Minimale Actor-Klasse + Rendering-Helfer auf Basis des Carry-Attach-Systems.
   Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Exports
   ================================================================================================ */

// ---------------------------------------------------------
// Imports
// ---------------------------------------------------------
import { drawActorWithCarry } from "./asset.js"; // nutzt dein Carry-System

// ---------------------------------------------------------
// Konstanten
// ---------------------------------------------------------
const DIRS = /** @type {const} */ (["N","E","S","W"]);

// ---------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------
function clampFrame(frame, frames){ return frames > 0 ? (frame % frames + frames) % frames : 0; }
function normalizeDir(d){ return DIRS.includes(d) ? d : "S"; }

// ---------------------------------------------------------
// Klassen
// ---------------------------------------------------------

/**
 * GameActor – minimaler Akteur mit pos, anim, frame, dir, carryItemKey usw.
 * Achtung: Diese Klasse ist bewusst leichtgewichtig gehalten.
 */
export class GameActor {
  /**
   * @param {object} opts
   * @param {{x:number,y:number}} opts.pos
   * @param {"walk_empty"|"walk_carry"|"handover"|string} [opts.anim]
   * @param {number} [opts.frame]
   * @param {"N"|"E"|"S"|"W"} [opts.dir]
   * @param {string|null} [opts.carryItemKey]
   * @param {"shoulder"|"belly"|"hand"|null} [opts.carryStyleOverride]
   * @param {number} [opts.fps]  // Animationsspeed (Frames/Sek)
   */
  constructor({
    pos = {x:0,y:0},
    anim = "walk_empty",
    frame = 0,
    dir = "S",
    carryItemKey = null,
    carryStyleOverride = null,
    fps = 8
  } = {}){
    this.pos = pos;
    this.anim = anim;
    this.frame = frame;
    this.dir = normalizeDir(dir);
    this.carryItemKey = carryItemKey;
    this.carryStyleOverride = carryStyleOverride;
    this.fps = fps;

    // intern
    this._frameAcc = 0;   // Frame-Akkumulator in Sekunden
    this._drawQueue = []; // wird vom Carry-System verwendet
  }

  /**
   * Zeitbasierte Animation (delta in Sekunden).
   * @param {number} dtSeconds
   * @param {object} porterAtlas
   */
  tick(dtSeconds, porterAtlas){
    const def = porterAtlas?.animations?.[this.anim];
    const frames = def?.frames ?? 1;
    const loop = !!def?.loop;

    if (!frames || frames <= 1) return;

    // Akkumulation und Framevorschub
    this._frameAcc += dtSeconds * this.fps;
    while (this._frameAcc >= 1){
      this._frameAcc -= 1;
      this.frame++;
      if (loop) this.frame = clampFrame(this.frame, frames);
      else if (this.frame >= frames) this.frame = frames - 1;
    }
  }

  setDir(d){ this.dir = normalizeDir(d); return this; }
  setAnim(a){ this.anim = a; this.frame = 0; this._frameAcc = 0; return this; }
  setCarry(key, style=null){ this.carryItemKey = key; this.carryStyleOverride = style; return this; }

  /**
   * Zeichnet diesen Actor inkl. getragenem Item (Z-Order korrekt),
   * indem der Convenience-Renderer aus core/asset.js genutzt wird.
   */
  draw(ctx, porterAtlas, itemsAtlas, drawFrame, drawImage){
    drawActorWithCarry(ctx, {
      actor: this,
      porterAtlas,
      itemsAtlas,
      drawFrame,
      drawImage
    });
  }
}

// ---------------------------------------------------------
// Exports
// ---------------------------------------------------------
export default {
  GameActor
};
