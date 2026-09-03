# CR-05B – Carrier → TransportJob Assignment Foundation

Stand: 2026-09-03
Status: **IN PROGRESS / NOT FROZEN**

## Ziel

CR-05B ergänzt CR-05A um die erste kontrollierte Carrier-Zuweisung. Ein bestehender `PENDING` TransportJob darf genau einen geeigneten verfügbaren Carrier erhalten. Die Auswahl ist deterministisch und verändert ausschließlich den Carrier-Availability-Zustand sowie die Assignment-Beziehung.

## Assignment-Regeln

`CarrierAssignmentService.assign(job)`:

- akzeptiert nur einen TransportJob mit stabiler `transport-job:*`-ID,
- berücksichtigt ausschließlich Carrier, die nach CR-05A `AVAILABLE` und für die Job-Menge geeignet sind,
- wählt deterministisch die kleinste stabile `unit:*`-ID aus den geeigneten Kandidaten,
- setzt den ausgewählten Carrier auf `OCCUPIED`,
- speichert die Beziehung `transport-job:* → unit:*`,
- ist für denselben Job idempotent,
- verwendet einen bereits `OCCUPIED` Carrier nicht für einen zweiten Job.

Der TransportJob selbst wird dabei nicht um Routing-, Bewegungs- oder Ausführungszustand erweitert.

## Verbindliche Grenze

CR-05B enthält ausdrücklich noch keine:

- Route, Path oder Pathfinding,
- Bewegung oder Positionsfortschreibung,
- Wegkosten-/Distanzbewertung bei der Carrier-Auswahl,
- Pickup- oder Dropoff-Logik,
- Ressourcentransfer zum/vom Carrier,
- Lauf-/Trageanimation,
- automatische Freigabe eines Carriers nach Jobabschluss.

Die deterministische Auswahl erfolgt in CR-05B ausschließlich über Eignung + stabile `unit:*`-Reihenfolge.

## CI-Gate

`npm run test:cr05b` prüft deterministische Auswahl, OCCUPIED-Übergang, Assignment-Beziehung, Idempotenz, Kapazitätsgrenze, Schutz vor Doppelbelegung und die Abwesenheit von Routing/Movement-Nebenwirkungen.

`npm run ci` enthält CR-05B zusätzlich zur bisherigen CR-03/CR-04/CR-05A-Regression.

Abschluss erst bei **CI PASS / 0 Blocker** und anschließendem sichtbaren Geräte-/Browser-Gate.
