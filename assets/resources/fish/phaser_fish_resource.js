/**
 * =========================================================================
 *  Datei   : phaser_fish_resource.js
 *  Projekt : Neue Siedler – Epoche 1
 *  Version : v25.12.xx-fish-resource-atlas
 *
 *  Zweck   :
 *    - Lädt das Fisch-Ressourcen-SpriteSheet (8x8, 128×128)
 *    - Stellt Helferfunktionen + Frame-Mapping bereit.
 *
 *  Assets:
 *    PNG : assets/resources/fish/fish_resource_1024.png
 *    JSON: assets/resources/fish/fish_resource_atlas_trimmed.json
 * =========================================================================
 */

// -------------------------------------------------------------------------
// 1. Preload
// -------------------------------------------------------------------------

export function preloadFishResource(scene) {
  scene.load.atlas(
    'fish_resource',
    'assets/resources/fish/fish_resource_1024.png',
    'assets/resources/fish/fish_resource_atlas_trimmed.json'
  );
}

// -------------------------------------------------------------------------
// 2. Frame-Mapping
// -------------------------------------------------------------------------
// Grobe Zuordnung nach Reihen:
//  Reihe 1: einzelne Fisch-Icons
//  Reihe 2: Fisch in Eimer/Fass/aufgehängt
//  Reihe 3: Ressourcensymbole
//  Reihe 4+: Wasser + Sprung-Animation
// -------------------------------------------------------------------------

export const FISH_RESOURCE_FRAMES = {
  // Reihe 1 – Rohfisch-Icons (8 Stück)
  fish_raw_01:     'fish_tile_00',
  fish_raw_02:     'fish_tile_01',
  fish_raw_03:     'fish_tile_02',
  fish_raw_04:     'fish_tile_03',
  fish_raw_05:     'fish_tile_04',
  fish_raw_06:     'fish_tile_05',
  fish_raw_07:     'fish_tile_06',
  fish_raw_08:     'fish_tile_07',

  // Reihe 2 – Fisch in Behältern / getrocknet
  fish_bucket_01:  'fish_tile_08',
  bucket_wood_01:  'fish_tile_09',
  fish_basket_01:  'fish_tile_10',
  fish_barrel_01:  'fish_tile_11',
  fish_hanged_01:  'fish_tile_12',
  fish_hanged_02:  'fish_tile_13',
  fish_smoked_01:  'fish_tile_14',
  fish_smoked_02:  'fish_tile_15',

  // Reihe 3 – Ressourcen/Icons gemischt
  fish_icon_01:    'fish_tile_16',
  fish_crate_01:   'fish_tile_17',
  fish_side_01:    'fish_tile_18',
  fish_side_02:    'fish_tile_19',
  fish_side_03:    'fish_tile_20',
  fish_side_04:    'fish_tile_21',
  fish_side_05:    'fish_tile_22',
  fish_side_06:    'fish_tile_23',

  // Reihe 4 – Wasser-Ringe (Standbild / Idle über Wasser)
  water_idle_01:   'fish_tile_24',
  water_idle_02:   'fish_tile_25',
  water_idle_03:   'fish_tile_26',
  water_idle_04:   'fish_tile_27',
  water_idle_05:   'fish_tile_28',
  water_idle_06:   'fish_tile_29',
  water_idle_07:   'fish_tile_30',
  water_idle_08:   'fish_tile_31',

  // Reihe 5 – Fisch springt (Auftauchen)
  fish_jump_01:    'fish_tile_32',
  fish_jump_02:    'fish_tile_33',
  fish_jump_03:    'fish_tile_34',
  fish_jump_04:    'fish_tile_35',
  fish_jump_05:    'fish_tile_36',
  fish_jump_06:    'fish_tile_37',
  fish_jump_07:    'fish_tile_38',
  fish_jump_08:    'fish_tile_39',

  // Reihe 6 – Fisch oben in der Luft
  fish_jump_09:    'fish_tile_40',
  fish_jump_10:    'fish_tile_41',
  fish_jump_11:    'fish_tile_42',
  fish_jump_12:    'fish_tile_43',
  fish_jump_13:    'fish_tile_44',
  fish_jump_14:    'fish_tile_45',
  fish_jump_15:    'fish_tile_46',
  fish_jump_16:    'fish_tile_47',

  // Reihe 7 – Fisch taucht wieder ein (Splash)
  fish_splash_01:  'fish_tile_48',
  fish_splash_02:  'fish_tile_49',
  fish_splash_03:  'fish_tile_50',
  fish_splash_04:  'fish_tile_51',
  fish_splash_05:  'fish_tile_52',
  fish_splash_06:  'fish_tile_53',
  fish_splash_07:  'fish_tile_54',
  fish_splash_08:  'fish_tile_55',

  // Reihe 8 – alternative Icons / Reserve
  fish_icon_alt_01:'fish_tile_56',
  fish_icon_alt_02:'fish_tile_57',
  fish_icon_alt_03:'fish_tile_58',
  fish_icon_alt_04:'fish_tile_59',
  fish_icon_alt_05:'fish_tile_60',
  fish_icon_alt_06:'fish_tile_61',
  fish_icon_alt_07:'fish_tile_62',
  fish_icon_alt_08:'fish_tile_63'
};

// -------------------------------------------------------------------------
// 3. Convenience-Helfer
// -------------------------------------------------------------------------

export function createFishResourceSprite(scene, x, y, frameKey) {
  return scene.add.image(x, y, 'fish_resource', frameKey).setOrigin(0.5, 0.5);
}

/**
 * Erstellt eine einfache "Fisch springt"-Animation auf einer Sprite-Instanz.
 *
 * @param {Phaser.Scene} scene
 * @param {string} animKey - Animationsname, z.B. 'fish_jump_loop'
 */
export function registerFishJumpAnimation(scene, animKey = 'fish_jump_loop') {
  const frames = [];
  for (let i = 1; i <= 16; i++) {
    const idx = String(i).padStart(2, '0');
    frames.push({ key: 'fish_resource', frame: FISH_RESOURCE_FRAMES['fish_jump_' + idx] });
  }
  scene.anims.create({
    key: animKey,
    frames,
    frameRate: 14,
    repeat: -1
  });
}
