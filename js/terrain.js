// js/terrain.js
//
// Steuerung & Rendering der Bodentexturen

import { ASSETS } from "../core/assets.js";

export const TERRAIN_TYPES = {
    grass: { id: "grass", src: ASSETS.terrain.grass },
    dirt: { id: "dirt", src: ASSETS.terrain.dirt },
    meadow: { id: "meadow", src: ASSETS.terrain.meadow },
    rock: { id: "rock", src: ASSETS.terrain.rock },
    shore: { id: "shore", src: ASSETS.terrain.shore },

    // neue sm_topdown Texturen
    dirt0: { id: "dirt0", src: ASSETS.terrain.dirt0 },
    earth0: { id: "earth0", src: ASSETS.terrain.earth0 },
    grass0: { id: "grass0", src: ASSETS.terrain.grass0 },
    meadow0: { id: "meadow0", src: ASSETS.terrain.meadow0 },
    meadow1: { id: "meadow1", src: ASSETS.terrain.meadow1 },
    sumpf0: { id: "sumpf0", src: ASSETS.terrain.sumpf0 },
    sumpf1: { id: "sumpf1", src: ASSETS.terrain.sumpf1 },
    rock0: { id: "rock0", src: ASSETS.terrain.rock0 },
    rock1: { id: "rock1", src: ASSETS.terrain.rock1 },
    rock2: { id: "rock2", src: ASSETS.terrain.rock2 },
    rock3: { id: "rock3", src: ASSETS.terrain.rock3 },
    strand_nord0: { id: "strand_nord0", src: ASSETS.terrain.strand_nord0 },
    strand_nord1: { id: "strand_nord1", src: ASSETS.terrain.strand_nord1 },
    strand_ost0: { id: "strand_ost0", src: ASSETS.terrain.strand_ost0 },
    strand_ost1: { id: "strand_ost1", src: ASSETS.terrain.strand_ost1 },
    strand_sued0: { id: "strand_sued0", src: ASSETS.terrain.strand_sued0 },
    strand_sued1: { id: "strand_sued1", src: ASSETS.terrain.strand_sued1 },
    strand_west0: { id: "strand_west0", src: ASSETS.terrain.strand_west0 },
    strand_west1: { id: "strand_west1", src: ASSETS.terrain.strand_west1 },
    tundra_snow0: { id: "tundra_snow0", src: ASSETS.terrain.tundra_snow0 },
    tree_needle0: { id: "tree_needle0", src: ASSETS.terrain.tree_needle0 },
    water0: { id: "water0", src: ASSETS.terrain.water0 }
};

// Beispiel-Renderer
export function drawTerrain(ctx, type, x, y, size) {
    const tex = new Image();
    tex.src = TERRAIN_TYPES[type].src;
    tex.onload = () => {
        ctx.drawImage(tex, x, y, size, size);
    };
}
