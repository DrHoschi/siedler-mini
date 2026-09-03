# CR-05 – Carrier Assignment Foundation Freeze Gate

Stand: 2026-09-03
Status: **IN PROGRESS / NOT FROZEN**

## Ziel

CR-05 wird erst eingefroren, wenn CR-05A, CR-05B und CR-05C gemeinsam ohne Regression bestehen und die Carrier-Zuweisung als konsistente Domain-Schicht nachgewiesen ist.

## Verbindliche Prüfungen

Das Abschluss-Gate prüft:

- CR-05A Carrier Contract & Availability State Regression,
- CR-05B deterministische Carrier → TransportJob Assignment Regression,
- CR-05C Assignment Release / Availability Recovery Regression,
- kein Carrier kann gleichzeitig zwei aktiven TransportJobs zugewiesen sein,
- jede aktive Job↔Carrier-Zuweisung besitzt genau einen `OCCUPIED` Carrier,
- Release eines `CANCELLED` oder `RELEASED` Jobs entfernt genau dessen Zuweisung,
- der freigegebene Carrier wird wieder `AVAILABLE`,
- freigegebene Carrier können deterministisch erneut verwendet werden,
- keine Route, kein Path, kein Pathfinding, kein Movement, kein Position-/Progress-Zustand und kein Pickup/Dropoff wird eingeführt.

## Invarianten

Für den im Gate erzeugten konsistenten Carrier-Pool gilt:

- `aktive Zuweisungen = OCCUPIED Carrier`,
- alle `unitId` innerhalb aktiver Zuweisungen sind eindeutig,
- jede aktive Zuweisung verweist auf genau einen vorhandenen Carrier,
- Release reduziert die aktive Zuweisungsmenge exakt um eins und stellt exakt den betroffenen Carrier wieder auf `AVAILABLE`.

## Scope-Grenze

CR-05 beantwortet ausschließlich, welcher verfügbare Carrier einen TransportJob übernehmen darf, wie diese Zuweisung gehalten wird und wie sie wieder freigegeben wird.

Ausdrücklich noch nicht Teil von CR-05 sind:

- Distanz- oder Kostenbewertung,
- Route oder Pathfinding,
- Bewegung und Positionsfortschreibung,
- Pickup und Dropoff,
- tatsächlicher Ressourcentransfer,
- Lauf-/Trageanimation,
- Transportfortschritt.

## Abschlussbedingung

CR-05 wird erst bei **CI PASS / 0 Blocker** plus sichtbarem Geräte-/Browser-Gate als **FROZEN** geführt.
