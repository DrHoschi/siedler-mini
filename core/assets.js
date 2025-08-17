// core/assets.js
//
// Hier werden ALLE Grafiken eingebunden.
// Einheitliche Struktur: { id: "name", src: "assets/tex/.../file.ext" }

export const ASSETS = {
    terrain: {
        grass: "assets/tex/terrain/topdown_grass.PNG",
        dirt: "assets/tex/terrain/topdown_dirt.PNG",
        meadow: "assets/tex/terrain/topdown_meadow.PNG",
        rock: "assets/tex/terrain/topdown_rock.PNG",
        shore: "assets/tex/terrain/topdown_shore.PNG",

        // neue sm_topdown Texturen (JPEG + PNG gemischt)
        dirt0: "assets/tex/terrain/sm_topdown_dirt0.jpeg",
        earth0: "assets/tex/terrain/sm_topdown_earth0_ug1.jpeg",
        grass0: "assets/tex/terrain/sm_topdown_grass0.jpeg",
        meadow0: "assets/tex/terrain/sm_topdown_meadow0_ug0.jpeg",
        meadow1: "assets/tex/terrain/sm_topdown_meadow1_ug0.jpeg",
        sumpf0: "assets/tex/terrain/sm_topdown_moor_sumpf0_ug0.jpeg",
        sumpf1: "assets/tex/terrain/sm_topdown_moor_sumpf1_ug0.jpeg",
        rock0: "assets/tex/terrain/sm_topdown_rock0_ug0.jpeg",
        rock1: "assets/tex/terrain/sm_topdown_rock1_ug0.jpeg",
        rock2: "assets/tex/terrain/sm_topdown_rock2_ug0.jpeg",
        rock3: "assets/tex/terrain/sm_topdown_rock3_ug0.jpeg",
        strand_nord0: "assets/tex/terrain/sm_topdown_strand_nord_ug0.jpeg",
        strand_nord1: "assets/tex/terrain/sm_topdown_strand_nord_ug1.jpeg",
        strand_ost0: "assets/tex/terrain/sm_topdown_strand_ost_ug0.jpeg",
        strand_ost1: "assets/tex/terrain/sm_topdown_strand_ost_ug1.jpeg",
        strand_sued0: "assets/tex/terrain/sm_topdown_strand_sued_ug0.jpeg",
        strand_sued1: "assets/tex/terrain/sm_topdown_strand_sued_ug1.jpeg",
        strand_west0: "assets/tex/terrain/sm_topdown_strand_west_ug0.jpeg",
        strand_west1: "assets/tex/terrain/sm_topdown_strand_west_ug1.jpeg",
        tundra_snow0: "assets/tex/terrain/sm_topdown_tundra_snow0_ug0.PNG",
        tree_needle0: "assets/tex/terrain/sm_topdown_tree_needle0_ug0.PNG",
        water0: "assets/tex/terrain/sm_topdown_water0_ug0.jpeg"
    },

    path: {
        path0: "assets/tex/path/topdown_path0.PNG"
    },

    road: {
        // später mehr Roads einfügen
    },

    building: {
        hq: "assets/tex/building/wood/hq_wood.PNG",
        hq_ug1: "assets/tex/building/wood/hq_wood_ug1.PNG",
        depot: "assets/tex/building/wood/depot_wood.PNG",
        depot_ug1: "assets/tex/building/wood/depot_wood_ug.PNG",
        farm: "assets/tex/building/wood/farm_wood.PNG",
        lumberjack: "assets/tex/building/wood/lumberjack_wood.PNG",
        fischer: "assets/tex/building/wood/fischer_wood1.PNG",
        haeuser1: "assets/tex/building/wood/haeuser_wood1.PNG",
        haeuser1_ug1: "assets/tex/building/wood/haeuser_wood1_ug1.PNG",
        haeuser2: "assets/tex/building/wood/haeuser_wood2.PNG",
        stonebraker: "assets/tex/building/wood/stonebraker_wood.PNG",
        wassermuehle: "assets/tex/building/wood/wassermuehle_wood.PNG",
        windmuehle: "assets/tex/building/wood/windmuehle_wood.PNG",
        baeckerei: "assets/tex/building/wood/baeckerei_wood.PNG"
    }
};
