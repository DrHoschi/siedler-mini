# CR-26C – Deterministic Job Eligibility & Assignment Selection

Stand: 2026-09-05
Status: **IMPLEMENTED / NOT FROZEN**

## Ziel

CR-26C ergänzt auf den eingefrorenen CR-26A/B-Verträgen erstmals eine deterministische Workforce-Eligibility- und Auswahlgrenze.

Ein Eligibility-Request beschreibt ausschließlich:

- `assignmentId`: stabile `assignment:`-Referenz,
- `requiredCapability`: genau eine bereits aus CR-26A bekannte Capability,
- `preconditionsPassed`: expliziter boolescher Preconditions-Eingang,
- `requiresReachability`: ob Reachability für diesen Request erforderlich ist,
- `reachable`: expliziter boolescher Reachability-Eingang nur wenn erforderlich.

Ein Kandidat besteht ausschließlich aus:

- einem gültigen `person-workforce-profile` aus CR-26A,
- einem gültigen `workforce-assignment-state` aus CR-26B,
- identischer `personId` in beiden Werten.

## Eligibility

Eine Person ist nur eligible, wenn gleichzeitig gilt:

1. `requiredCapability` ist im CR-26A-Capability-Set vorhanden,
2. CR-26B-Availability ist `FREE`,
3. `preconditionsPassed === true`,
4. wenn Reachability erforderlich ist, gilt `reachable === true`.

CR-26C berechnet keine Reachability selbst. Es konsumiert ausschließlich den expliziten Eingabewert.

## Deterministische Auswahl

Sind mehrere Personen eligible, wird exakt eine Person anhand der stabilen `personId` deterministisch gewählt. Die Eingabereihenfolge darf das Ergebnis nicht verändern.

`selectAndAssign(...)` setzt die gewählte Person ausschließlich über `WorkforceAssignmentStateContract.assign(...)` aus CR-26B auf `ASSIGNED` und verwendet die Request-`assignmentId`.

Der Eingangs-Profile- und Assignment-State bleiben unverändert und immutable.

## Verbindliche Grenze

CR-26C enthält ausdrücklich keine:

- Jobpriorisierung, Gewichtung oder Distanzwertung,
- JobEngine-Queue oder automatische Jobgenerierung,
- Pathfinding-, Route- oder Bewegungsberechnung,
- Reachability-Berechnung,
- Produktionszeit oder Produktionsausführung,
- Builder-/Construction-Ausführung,
- Transport-/Logistik-Rewrite,
- Completion/Cancel/Recovery-Orchestrierung,
- Population Creation,
- SaveGame,
- Rendering/UI/Inspector/Balancing.

## Abschluss

CR-26C bleibt bis zum fokussierten Verification / Freeze Gate **NOT FROZEN**. Erst bei **PASS / 0 BLOCKER** darf ein immutable CR-26C-Marker gesetzt und danach das gemeinsame CR-26 Completion / Regression / Freeze Gate vorbereitet werden.
