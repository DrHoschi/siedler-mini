Fisch-Ressource – SpriteSheet Paket
===================================

Dateien:
--------
- fish_resource_1024.png
  → 1024×1024, 8×8 Tiles à 128×128 px (Fisch-Icons + Sprunganimation).

- fish_resource_atlas_trimmed.json
  → Phaser-3-kompatibler Atlas (atlasJSONHash, getrimmt).
    Frames: fish_tile_00 .. fish_tile_63

- phaser_fish_resource.js
  → Loader + Mapping + Animations-Helfer:
    * preloadFishResource(scene)
    * FISH_RESOURCE_FRAMES
    * createFishResourceSprite(scene, x, y, frameKey)
    * registerFishJumpAnimation(scene, animKey)

- fish_resource_tiles/
  → 64 Einzel-PNGs (tile_00.png .. tile_63.png) – optional.

- fish_resource_test.html
  → Kleine Testseite mit Phaser 3:
    * oben ein Rohfisch-Icon, per Button wechselbar
    * in der Mitte ein Fisch, der dauerhaft aus dem Wasser springt

Einbau im Projekt:
------------------
assets/resources/fish/fish_resource_1024.png
assets/resources/fish/fish_resource_atlas_trimmed.json
assets/resources/fish/phaser_fish_resource.js
