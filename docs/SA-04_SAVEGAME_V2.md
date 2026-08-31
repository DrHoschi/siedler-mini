# SA-04 – SaveGame V2 + echter Continue-Pfad

Status: PASS / FROZEN
Datum: 2026-08-31
Branch: `feature/sa-04-savegame-v2`
Basis: `main` @ `c4b904fa0609ba4e93d0ae52e3e9401d3b594ecd`

## Ziel

Den bisherigen `continue`-Pseudo-Neustart durch einen kontrollierten V2-Restore ersetzen und die für den aktuellen 2D-Teststand relevanten Wirtschafts-/Runtime-Zustände nach Reload zuverlässig fortsetzen.

## Persistierter fachlicher Zustand

- Meta/World und Kartenidentität
- zentrale Ressourcen `RegistryValues`
- Gebäude inklusive Bauzustand und stabiler UID
- Pausezustand `workPaused`
- MapResources
- Units-Grundzustand
- Trampelpfad-Wear und sichtbare Stamps
- physischer `BuildingStock` vor Produktionsgebäuden
- Wohnhaus-Bewohnerzuordnung über Unit/Home-UID
- Steuer-Timer pro Wohnhaus

Bewusst nicht gespeichert werden Runtime-Zustände wie JobQueue, Carrier-/Builder-Tasks, Navigation/A*-Caches, Renderer, DOM, Asset-Caches oder Timer-Handles. Diese werden bei Continue rekonstruiert.

## Implementierte Restore-/Runtime-Regeln

1. `new` und `continue` sind getrennte Boot-Pfade. Continue startet nur mit gültigem SaveGame V2.
2. Gebäude werden vor dem normalen Startrest restauriert; Ressourcen werden gegen Legacy-Startwerte nochmals abgesichert.
3. Nach MapReady werden MapResources und Units restauriert und die HQ-Position rekonstruiert.
4. Fehlende Baustellen-Lieferjobs werden aus `needs - delivered` neu erzeugt; überzählige Lieferungen werden blockiert.
5. Gespeicherte Gebäude-UIDs bleiben stabil; neue UID-Kollisionen werden abgefangen.
6. Produktionsgebäude werden nach Continue rehydriert; Output landet physisch im BuildingStock und wird erst nach Trägerlieferung im HQ global gebucht.
7. BuildingStock wird gespeichert; laufende Carry-Jobs nicht. Nach Continue werden Abholjobs aus dem wiederhergestellten Stock neu erzeugt.
8. Baustellen beginnen erst zu bauen, wenn echte Builder angekommen sind.
9. Laufende Bauphasen nach Continue behalten `buildElapsed/buildProgress`, verlangen aber erneut echte Builder, da `_builderJob` bewusst nicht persistiert wird.
10. Bewohner und Wohnhaus-Steuertimer werden über Continue erhalten; Bewohner werden dedupliziert.

## Praktisch bestätigte Tests – PASS

- Gebäude bleiben nach Reload/Continue erhalten.
- zentrale Ressourcen bleiben nach Reload/Continue erhalten.
- Trampelpfade bleiben nach Reload/Continue erhalten.
- Produktionsgebäude-Pause funktioniert und bleibt nach Continue erhalten.
- Produktionsarbeiter Holzfäller/Steinbruch/Fischer kehren bei Pause ins Gebäude zurück und kommen bei Weiter wieder heraus.
- Jäger produziert Fleisch/Fell; Pause stoppt Jagd/Output und Worker kehrt zum Gebäude zurück.
- Baustellen beginnen nicht vor Ankunft echter Builder zu bauen.
- Träger liefern nicht über den tatsächlichen Baustellenbedarf hinaus.
- sichtbare Baustellenressourcen entsprechen den gelieferten Mengen und verschwinden korrekt bei Fertigstellung.
- Produktionslager werden sichtbar vor Gebäuden dargestellt.
- Produktionslager bleiben nach Reload/Continue erhalten.
- mehrere freie Träger bedienen mehrere Baustellen und Produktionsgebäude parallel; Baustellen bleiben priorisiert.
- HQ-Menü zeigt zentralen Lagerbestand strukturiert an.
- Produktionsgebäude-Menüs zeigen vorgesehene Lagerressourcen auch mit Bestand 0.
- kleines Wohnhaus hat 2/2 echte Bewohner, mittleres Wohnhaus 3/3.
- Bewohnerbelegung bleibt nach Reload/Continue erhalten.
- Test-Steuerregel 1 Gold/Bewohner/10 s funktioniert.
- Gold wird zentral gebucht und im HQ/HUD sichtbar.
- Steuer-Timer und Goldfluss funktionieren auch nach Reload/Continue.
- RT-04: Reload mitten in laufender Bauphase bestanden; Baufortschritt bleibt erhalten, Builder werden neu angefordert und setzen den Bau fort, bereits geliefertes Material wird nicht erneut angefordert.

## Nicht Teil von SA-04 / bewusst später

- Kamera-Position/Zoom im Savegame
- Migration alter `siedler.save.v1.*`-Spielstände
- finales Balancing der Steuerwerte
- finale Item-/Ressourcen-Icons und Fell-Sprite
- langfristige Bereinigung der Legacy-Produktions-/Worker-Doppelpfade
- Bewohner-Arbeits-/Freizeit-AI und finale Bewohner-Sprites

## Freeze

SA-04 ist nach bestandenem RT-04 am 2026-08-31 als `PASS / FROZEN` abgeschlossen. Der Branch `feature/sa-04-savegame-v2` ist damit der verbindliche stabile SA-04-Zwischenstand. `main` bleibt unverändert, bis eine ausdrückliche Freigabe zum Merge erfolgt.
