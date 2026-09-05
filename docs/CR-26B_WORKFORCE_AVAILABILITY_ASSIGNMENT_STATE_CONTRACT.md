# CR-26B – Workforce Availability & Assignment State Contract

Status: **IMPLEMENTED / NOT FROZEN**

## Zweck

CR-26B ergänzt auf dem eingefrorenen CR-26A-Person-Workforce-Profil ausschließlich die temporäre Availability-/Assignment-Ebene einer Person.

Die dauerhafte Person-Identität, Home-Bindung, Spezialisierung und Capabilities bleiben getrennt und werden durch ein Assignment nicht verändert.

## Vertrag

Ein Workforce-Assignment-State enthält:

- `kind: workforce-assignment-state`
- `personId`: stabile bestehende `unit:`-ID
- `availability`: `FREE`, `ASSIGNED` oder `UNAVAILABLE`
- `assignmentId`: genau eine stabile `assignment:`-ID nur im Zustand `ASSIGNED`, sonst `null`

## Zustandsregeln

- `FREE` besitzt kein aktives Assignment.
- `ASSIGNED` besitzt genau ein aktives normales Assignment.
- `UNAVAILABLE` besitzt kein normales Assignment.
- Nur `FREE` darf ein normales Assignment annehmen.
- Ein bereits `ASSIGNED`er Zustand kann kein zweites Assignment annehmen.
- `ASSIGNED` kann kontrolliert zu `FREE` freigegeben werden.
- `FREE` kann kontrolliert `UNAVAILABLE` werden.
- `UNAVAILABLE` kann kontrolliert wieder `FREE` werden.
- Alle Übergänge erzeugen neue immutable Werte und verändern den Eingangszustand nicht.

## Im Scope

- Workforce-Availability-Achse,
- temporäre Assignment-Referenz,
- Ausschluss paralleler normaler Assignments pro Person,
- deterministische Zustandsvalidierung und Übergänge,
- Erhalt derselben `personId` über alle Übergänge.

## Ausdrücklich nicht im Scope

- automatische Kandidatenauswahl,
- Jobpriorisierung,
- Eligibility-Berechnung,
- Reachability/Pathfinding,
- Bewegung,
- fachliche Arbeitsausführung,
- Production-/Builder-/Transport-Integration,
- Completion-/Cancel-/Recovery-Orchestrierung eines konkreten Jobtyps,
- SaveGame,
- Rendering/UI/Inspector/Balance.

## Abgrenzung innerhalb CR-26

- CR-26A – Person Workforce Profile Contract — **PASS / FROZEN / 0 BLOCKER**
- CR-26B – Workforce Availability & Assignment State Contract — **IMPLEMENTED / NOT FROZEN**
- CR-26C – Deterministic Job Eligibility & Assignment Selection — **BLOCKED**

CR-26B darf erst nach eigenem Verification-/Freeze-Gate auf **PASS / FROZEN / 0 BLOCKER** gesetzt werden.
