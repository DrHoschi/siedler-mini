# SA-04 – SaveGame V2 + echter Continue-Pfad

Status: TEST READY (Arbeitsbranch)
Datum: 2026-08-27
Branch: `feature/sa-04-savegame-v2`
Basis: `main` @ `c4b904fa0609ba4e93d0ae52e3e9401d3b594ecd`

## Ziel

Den bisherigen `continue`-Pseudo-Neustart durch einen kontrollierten V2-Restore ersetzen, ohne die bestehende Gameplay-Architektur groß umzubauen.

## Implementierter Stand

1. `core/savegame-v2.js`
   - Namespace `siedler.save.v2.*`
   - Autosave-Slot `autosave`
   - Snapshot-Version 2
   - speichert Ressourcen, Gebäude/Baufortschritt, MapResources und Units-Grundzustand
   - speichert bewusst keine JobQueue, Unit-Tasks/Nav-Caches, Renderer-, DOM-, Timer- oder Asset-Zustände
   - Autosave bei `visibilitychange`, `pagehide` sowie zyklisch alle 30 Sekunden

2. `core/boot-v1.js`
   - SaveGame V2 ist eigenes Boot-Gate
   - `new` und `continue` bleiben getrennt
   - `continue` darf nur nach erfolgreichem `SaveGameV2.prepareContinue()` starten
   - ohne gültigen V2-Spielstand wird Continue blockiert statt als neues Spiel weiterzulaufen

3. Continue-Restore-Reihenfolge
   - Gebäude vor dem normalen Game-Start-Rest setzen
   - Ressourcen einsetzen und nach dem synchronen Start-Dispatch nochmals absichern
   - nach `cb:map:ready`: MapResources restaurieren
   - Units-Grundzustand restaurieren und HQ-Position aus dem gespeicherten HQ ableiten
   - nur fehlende Baustellen-Lieferjobs aus `needs - delivered` rekonstruieren

4. `core/savegame-v2-uid-guard.js`
   - gespeicherte Gebäude-UIDs bleiben unverändert
   - neue Gebäude nach Continue werden bei einer UID-Kollision vor dem Queue-Aufbau auf eine freie UID umgebogen

## Noch nicht Bestandteil dieses Teststands

- Path-Wear-Restore
- exakte Fortsetzung laufender Carrier-Tasks (absichtlich verworfen; Jobs werden rekonstruiert)
- vollständige Rekonstruktion interner Production-Caches für bereits fertige Produktionsgebäude
- Kamera-Position/Zoom im Savegame
- Migration alter `siedler.save.v1.*`-Spielstände

## Reload-Test RT-01 – Grundzustand

1. Branch starten.
2. `Neues Spiel` wählen.
3. Prüfen, dass HQ und Startressourcen normal erscheinen.
4. Mindestens ein Gebäude platzieren.
5. Ressourcenwert und Gebäudeposition notieren.
6. In der Konsole optional `SaveGameV2.save({slot:'autosave',name:'RT-01'})` ausführen; alternativ Tab/App in den Hintergrund schicken.
7. Seite vollständig neu laden.
8. `Weiterspielen` wählen.

Erwartung:
- kein zweites Auto-HQ
- gespeicherte Gebäude bleiben an ihren Positionen
- Ressourcen entsprechen dem Save und nicht den Startwerten
- MapResources werden nicht neu ausgewürfelt
- gespeicherte Units werden wiederhergestellt

## Reload-Test RT-02 – Baustelle teilweise beliefert

1. Eine Baustelle mit mehreren benötigten Ressourcen erzeugen.
2. Warten, bis nur ein Teil geliefert wurde.
3. Speichern und vollständig reloaden.
4. `Weiterspielen` wählen.

Erwartung:
- `needs` und `delivered` bleiben erhalten
- nur die noch fehlenden Liefermengen erzeugen neue `deliver`-Jobs
- bereits gelieferte Ressourcen werden nicht nochmals angefordert

## Reload-Test RT-03 – Continue ohne V2-Save

1. `SaveGameV2.clear('autosave')` ausführen.
2. Seite reloaden.
3. `Weiterspielen` wählen.

Erwartung:
- kein Spielstart
- kein neues HQ / keine Startressourcen unter dem Deckmantel von Continue
- Boot meldet `no-valid-save-v2`

## Merge-Regel

Nicht nach `main` mergen, bevor RT-01 bis RT-03 praktisch bestanden sind und die Production-Restore-Frage für bereits fertige Produktionsgebäude geprüft wurde.
