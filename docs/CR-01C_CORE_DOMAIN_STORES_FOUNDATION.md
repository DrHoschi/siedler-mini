# CR-01C – Core Domain Stores Foundation

Status: DEVICE TEST PENDING

## Ziel

CR-01C führt die ersten fachlichen Runtime-Stores ein, ohne bereits Gameplay-Verhalten zu implementieren.

Die vier Domänen sind strikt getrennt:

- Buildings
- Units
- Resources
- Jobs

## Autoritative Stores

Jede Domäne besitzt einen eigenen `DomainStore`. Die Stores sind die einzige autoritative Quelle für ihren jeweiligen Domänenzustand.

Produktiv werden sie in `CoreDomainStores` zusammengefasst, bleiben intern aber getrennte Stores.

## Verträge

Jeder Store unterstützt kontrolliert:

- stabile IDs pro Domäne
- `create`
- `get`
- `has`
- `update`
- `remove`
- sortierte ID-Snapshots
- tief getrennte/frozen State-Snapshots
- Revisionszähler

IDs und `kind` bestehender Einträge sind unveränderlich. Doppelte IDs werden abgewiesen.

ID-Kinds:

- `building:*`
- `unit:*`
- `resource:*`
- `job:*`

## Runtime-Zustand

Die produktiven vier Stores starten absichtlich leer. Es werden in CR-01C keine produktiven Gebäude, Einheiten, Ressourcen oder Jobs erzeugt.

Die bestehenden CR-01A/CR-01B-Verträge für WorldStore und MapStructure bleiben unverändert.

## Self-Test

Der CR-01C-Test arbeitet mit separaten Testinstanzen und prüft:

1. vier leere getrennte Stores
2. stabile domänenspezifische IDs
3. Isolation zwischen den Domänen
4. getrennte und tief eingefrorene Snapshots
5. Schutz von ID und Kind sowie Duplicate-Rejection

## Nicht Bestandteil von CR-01C

- keine Gebäudeplatzierung
- keine Baustellen
- keine Unit-AI
- keine Carrier
- keine Ressourcenflüsse
- keine Jobscheduler-Logik
- keine Navigation oder Pfade
- keine Produktion
- keine Wirtschaft
- kein SaveGame
- keine Legacy-Runtime

## Abnahme

GitHub Pages auf `feature/cr-01c-core-domain-stores` stellen.

Erwartete sichtbare Ausgabe:

`CR-01C SELF-TEST: PASS`

Bei erfolgreichem Gerätetest kann CR-01C auf PASS / FROZEN gesetzt werden.
