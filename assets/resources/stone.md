Inhalt (wichtigste Dateien):
	•	assets/resources/stones_mega_atlas.png
	•	assets/resources/stones_mega_atlas.json  (dein Haupt-Atlas)
	•	assets/resources/stones_mega_phaser.json (Name → FrameIndex)
	•	assets/resources/stones_mega_phaser.js   (Global für dein Spiel)

	Verwendungsidee (analog Bäume):
	•	Roh-Vorkommen auf der Karte: e1_rock_big_raw_v01–08
	•	Erst angeschlagen/mit Rissen: e1_rock_big_cracked_v01–08
	•	Abbau-Schutt in der Umgebung: e1_rubble_large_* / e1_rubble_small_*
	•	Fertige Steinblöcke/Resource-Piles: e1_block_rough_*, e1_block_cut_*
	•	Lagerstapel am HQ/Steinmetz: e1_block_stack_low_*, e1_block_stack_high_*

  Bei den Bäumen/Werkzeugen hatten wir zusätzlich:
	•	eine normale Atlas-JSON (dein assets.draw-Stil) mit x/y/w/h
	•	plus eine extra Datei im Phaser-Stil, die nur sagt:
„Name → FrameIndex in der SpriteSheet-Reihenfolge“

Das brauchen wir nicht zwingend für Phaser, aber es macht das Leben leichter:
	•	du kannst im Code NS_STONES_ATLAS.frames.e1_block_cut_v01 verwenden
statt dir zu merken „das ist Frame 40“.
	•	du kannst später bequem Animationen bauen, indem du einfach
die Namen aus der Map nimmst und in scene.anims.create reinsteckst.

Jetzt auch für die Steine angelegt

Ich habe das Demo-Paket erweitert um:
	•	assets/resources/stones_mega_phaser.json
→ JSON mit frames: { name: frameIndex }
	•	assets/resources/stones_mega_phaser.js
→ legt ein Global window.NS_STONES_ATLAS an, inkl. meta + frames.

Du kannst also im Phaser-Code z. B. machen:


    // Beispiel: bestimmten Frame per Namen holen
const frameIndex = window.NS_STONES_ATLAS.frames["e1_block_cut_v01"];
const sprite = this.add.sprite(200, 200, "stones", frameIndex);

