📦 Paket-Inhalt (geplant)

Pfad: assets/icons/

🔹 Status-Icons (Inspector / Logs)
	•	ok.png → ✅
	•	info.png → ℹ️ / 🔵ℹ️ (runde Version)
	•	warn.png → ⚠️
	•	error.png → ❌

🔹 Ressourcen-Icons (HUD)
	•	wood.png → 🌲 Holz
	•	stone.png → 🪨 Stein
	•	fish.png → 🐟 Nahrung (Fisch)
	•	grain.png → 🌾 Getreide
	•	bread.png → 🍞 Brot
	•	bricks.png → 🧱 Ziegel
	•	iron.png → ⛏ Erz/Eisen
	•	tools.png → ⚒ Werkzeuge
	•	weapons.png → ⚔ Waffen
	•	gold.png → 🪙 Gold
	•	paper.png → 📜 Papier
	•	knowledge.png → 📖 Wissen
	•	prestige.png → 🏛 Prestige
	•	diplomacy.png → 🤝 Diplomatiepunkte
	•	population.png → 👥 Bevölkerung

🔹 Debug-/Pfad-Icons
	•	path.png → 👣 Trampelpfade
	•	heatmap.png → 🔥 Heatmap
	•	collision.png → 🚷 Kollisionszonen
	•	entrance.png → 🚪 Türkacheln

🔹 Editor-/Dialog-Icons
	•	confirm.png → ✅
	•	cancel.png → ❌
	•	brush.png → ✏️
	•	eraser.png → 🩹
	•	select.png → 🖱
	•	move.png → ✋
	•	undo.png → ↩️
	•	redo.png → ↪️
	•	save.png → 💾
	•	load.png → 📂
	•	export.png → 📤
	•	import.png → 📥

📂 Sinnvolle Icon-Kategorien (Ordnerstruktur)

1. UI Core (assets/icons/ui/)
	•	Status & Inspector: ok.png, info.png, warn.png, error.png
	•	Debug/Pfade: path.png, heatmap.png, collision.png, entrance.png, stats.png
	•	Editor/Dialoge: confirm.png, cancel.png, brush.png, eraser.png, select.png, move.png, undo.png, redo.png, save.png, load.png, export.png, import.png

⸻

2. Ressourcen (assets/icons/resources/)
	•	Grundressourcen: wood.png, stone.png, fish.png, grain.png, bread.png
	•	Baumaterialien: bricks.png, ore.png, tools.png, weapons.png
	•	Währungen & Abstrakte: gold.png, paper.png, knowledge.png, prestige.png, diplomacy.png, population.png

⸻

3. Nahrungsmittel & Getränke (assets/icons/food/)
	•	Basis: egg.png, fried_egg.png, nest_eggs.png
	•	Mahlzeiten: meal_bento.png, meal_soup.png, meal_stew.png
	•	Getränke: drink_wine.png, drink_soda.png, drink_coffee.png, drink_beer.png, drink_tea.png
	•	Erweiterte Liste: 🍇, 🍎, 🍖, 🍗, 🍕 usw. (kannst du später erweitern)

⸻

4. Gebäude / Bau-Menü (assets/icons/buildings/)
	•	HQ: hq.png
	•	Holzfällerhütte: lumberjack.png
	•	Fischerhütte: fishery.png
	•	Steinbruch: quarry.png
	•	Farm: farm.png
	•	Schmiede, Bäckerei, etc. (für spätere Epochen)

⸻

5. Natur / Dekoration (assets/icons/nature/)
	•	Bäume: tree_broadleaf.png, tree_pine.png, tree_palm.png
	•	Pflanzen: plant_potted.png, plant_seedling.png
	•	Blumen: flower_rose.png, flower_tulip.png, flower_daisy.png, flower_sakura.png
	•	Sonstiges: mushroom.png, clover.png

⸻

6. Tiere (assets/icons/animals/)
	•	Nutztiere: cow.png, goat.png, chicken.png, sheep.png
	•	Wildtiere: wolf.png, bear.png, deer.png
	•	Fische & Meer: fish_animal.png, dolphin.png, whale.png
	•	Insekten: bee.png, butterfly.png, beetle.png

⸻

7. Wetter & Elemente (assets/icons/weather/)
	•	Sonne: sun.png
	•	Regen: rain.png
	•	Schnee: snow.png
	•	Wind: wind.png
	•	Blitz: lightning.png
	•	Feuer: fire.png
	•	Erde: earth.png
	•	Regenbogen: rainbow.png
	•	Tornado: tornado.png

⸻

8. Kultur & Sonstiges (assets/icons/misc/)
	•	Musik: music.png, notes.png
	•	Prestige: trophy.png, castle.png
	•	Karte: map.png
	•	Dekoratives: moai.png, statue.png
	•	Werkzeuge extra: hammer.png, saw.png, pickaxe.png (falls nicht bei Ressourcen)

⸻

👉 Damit hast du:
	•	Klare Trennung nach Gameplay-Logik (HUD vs. Ressourcen vs. Gebäude)
	•	Editor-/Inspector-Icons separat → bleiben sauber unabhängig
	•	Platz für spätere Erweiterungen (Epochen, Deko, Tiere, Wetter etc.)

📋 ICONS_CHECKLIST.md – Befüllungsstatus

✅ Pflicht-Ordner
	•	assets/icons/resources/
→ 15 Ressourcen-Icons (Holz, Stein, Fisch, Getreide, Brot, Ziegel, Erz, Werkzeuge, Waffen, Gold, Papier, Wissen, Prestige, Diplomatie, Bevölkerung)
	•	assets/icons/ui/
→ 21 UI-/Inspector-/Editor-Icons (ok/info/warn/error, Pfad/Heatmap, Editor-Tools etc.)

🔨 In Arbeit / Optional (noch befüllen)
	•	assets/icons/buildings/
→ HQ, Holzfällerhütte, Fischerhütte, Steinbruch, Farm, Schmiede, Bäckerei …
	•	assets/icons/food/
→ Eier, Spiegelei, Mahlzeiten (Suppe, Eintopf), Getränke (Wein, Bier, Kaffee, Tee …)
	•	assets/icons/nature/
→ Bäume (Eiche, Kiefer, Palme), Blumen (Rose, Tulpe, Gänseblümchen …), Pilze, Pflanzen
	•	assets/icons/animals/
→ Nutztiere (Kuh, Ziege, Schaf, Huhn), Wildtiere (Hirsch, Wolf), Fische, Insekten
	•	assets/icons/weather/
→ Sonne, Regen, Schnee, Wind, Blitz, Feuer, Regenbogen, Tornado
	•	assets/icons/misc/
→ Musiknoten, Trophäe, Statue, Karte, Moai

⸻

🧾 Hinweise
	•	Pflicht-Ordner (resources, ui) sind schon fertig → können sofort ins Repo.
	•	Alle optionalen Kategorien kannst du Schritt für Schritt nachziehen (z. B. Epoche für Epoche).
	•	Für jedes Set empfiehlt sich ein eigenes *_preview.png + *_atlas.json.
	•	Registry-Erweiterung: IDs (res.*, b.*, u.*) sollten mit der Registry abgeglichen werden ￼.
