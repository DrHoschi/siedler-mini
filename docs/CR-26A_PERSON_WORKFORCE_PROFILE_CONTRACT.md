# CR-26A – Person Workforce Profile Contract

**Status:** IMPLEMENTED / NOT FROZEN

## Zweck

CR-26A ergänzt die eingefrorene CR-23-Personenidentität um einen getrennten, immutable Workforce-Profile-Vertrag.

Die Person bleibt dieselbe bestehende `unit:`-Identität. Spezialisierung und Capabilities beschreiben dauerhafte fachliche Eignung; sie sind weder aktuelle Tätigkeit noch Assignment.

## Vertrag

Ein Workforce Profile enthält ausschließlich:

- `kind: person-workforce-profile`
- `personId`: stabile bestehende `unit:`-ID
- `specialization`
- `capabilities[]`: nichtleeres, dedupliziertes, deterministisch sortiertes immutable Capability-Set

Unterstützte V1-Spezialisierungen:

- `GENERAL_RESIDENT`
- `CARRIER`
- `BUILDER`
- `LUMBERJACK`
- `QUARRY_WORKER`
- `FISHER`
- `HUNTER`

Unterstützte V1-Capabilities:

- `CAN_MOVE`
- `CAN_SIMPLE_TRANSPORT`
- `CAN_BUILD`
- `CAN_LUMBERJACK`
- `CAN_QUARRY`
- `CAN_FISH`
- `CAN_HUNT`

## Architekturregel

Ein temporärer Job darf weder `personId` noch Spezialisierung oder Capability-Set verändern. CR-26A erzeugt keinen zweiten Person-Typ und keinen neuen Person-Store.

## Nicht im Scope

- `FREE / ASSIGNED / UNAVAILABLE`,
- Assignment oder Assignment-ID,
- Job-ID/JobQueue/JobEngine-Auswahl,
- Priorisierung und Candidate Selection,
- Reachability, Pathfinding, Bewegung,
- Completion/Cancel/Recovery,
- Produktionszeit oder Worker-Ausführung,
- Builder-Ausführung,
- Transport-/Logistikänderungen,
- SaveGame, Rendering, UI, Inspector, Balancing.

## Verification

`src/dev/cr-26a-self-test.js` prüft Person-ID-Basis, V1-Spezialisierungen/Capabilities, kanonisches Capability-Set, Validierungsfehler, Determinismus/Immutability und Scope-Leakage.

CR-26A darf erst nach fokussiertem Verification-/Freeze-Gate auf **PASS / FROZEN / 0 BLOCKER** gesetzt werden.
