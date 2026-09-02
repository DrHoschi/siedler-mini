# CR-01A – Stable IDs & Authoritative World Store

Status: IMPLEMENTED / DEVICE TEST PENDING

Basis: CR-00 PASS / FROZEN
Branch: `feature/cr-01a-stable-ids-world-store`

## Ziel

CR-01A legt die erste autoritative Spielzustandsbasis der Clean Runtime an. Es werden noch keine Map, Gebäude, Träger, Jobs, Wirtschaft, Navigation oder SaveGame-Systeme implementiert.

## Neue Verträge

### Stable IDs

`src/world/stable-id.js`

- stabile, lesbare IDs im Format `<kind>:<sequence>`
- deterministische, getrennte Sequenzen pro Kind
- Sequenzen starten bei 1
- `reserve()` verhindert spätere Wiedervergabe bereits bekannter Sequenzbereiche
- `parseStableId()` validiert IDs
- keine Zufalls-, Zeitstempel- oder DOM-abhängige ID-Erzeugung

Beispiele:

- `world:00000001`
- `entity:00000001`
- `unit:00000001`

### Authoritative World Store

`src/world/world-store.js`

Der `WorldStore` ist ab CR-01A der einzige Besitzer des allgemeinen World-/Entity-Zustands.

Verträge:

- `create(kind, data, options)` erzeugt eine Entity
- `put(entity)` übernimmt eine Entity mit bereits vorhandener Stable ID
- `get(id)` liefert nur einen getrennten, tief eingefrorenen Snapshot
- `update(id, mutator)` ist der kontrollierte Mutationspfad
- `remove(id)` entfernt eine Entity
- `snapshot()` liefert einen tief eingefrorenen World-Snapshot
- doppelte IDs werden abgewiesen
- `id` und `kind` einer bestehenden Entity sind unveränderlich
- jede erfolgreiche World-Mutation erhöht `revision`

Direkte Mutation von außen ist damit nicht Teil des Runtime-Vertrags.

## Runtime-Integration

`src/main.js` erzeugt genau einen `WorldStore` und stellt ihn unter `window.CleanRuntime.world` für Entwicklung und Diagnose bereit. Es wird noch kein produktives Gameplay-System in den Scheduler eingetragen.

## Self-Test

`src/dev/cr-01a-self-test.js` prüft automatisch:

1. deterministische Stable-ID-Sequenzen
2. Parsing und Reservierung vorhandener IDs
3. World create/get/remove
4. Ablehnung doppelter IDs
5. getrennte und tief eingefrorene Snapshots
6. Unveränderlichkeit von Entity-ID und Entity-Kind

Der bestehende CR-00 Foundation-Test läuft weiterhin zusätzlich. Nur wenn beide Testgruppen bestehen, zeigt der Browser:

`CR-01A SELF-TEST: PASS`

## Nicht Bestandteil von CR-01A

- Map-/Tile-Daten
- Gebäude
- Ressourcen
- Units
- Jobs
- Navigation/Pathfinding
- Wirtschaft/Produktion
- Save/Load
- Legacy-Bridges

Diese Bereiche dürfen CR-01A nicht vorwegnehmen.

## Abnahme

CR-01A kann PASS / FROZEN werden, wenn:

- der Browser auf dem Testgerät die neue CR-01A-Seite lädt,
- `CR-01A SELF-TEST: PASS` sichtbar ist,
- keine Legacy-Gameplay-Oberfläche erscheint,
- keine Console-Fehler aus den neuen CR-01A-Modulen auftreten.
