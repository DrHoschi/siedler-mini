# CR-05C – Carrier Assignment Release / Availability Recovery

Stand: 2026-09-03
Status: **IN PROGRESS / NOT FROZEN**

## Ziel

CR-05C ergänzt die CR-05B-Zuweisung um den kontrollierten Rückweg: Ist ein zugewiesener TransportJob nicht mehr aktiv, wird der Carrier wieder freigegeben.

## Verhalten

`CarrierAssignmentService.release(job)` darf eine bestehende Job↔Carrier-Zuweisung nur für terminale TransportJob-Zustände lösen:

- `CANCELLED`,
- `RELEASED`.

Dabei gilt:

- der Carrier wechselt von `OCCUPIED` auf `AVAILABLE`,
- die Job↔Carrier-Zuweisung wird entfernt,
- Kapazität und aktuelle Location bleiben unverändert,
- der Carrier kann anschließend erneut deterministisch zugewiesen werden,
- wiederholtes Release ist idempotent.

Ein `PENDING` TransportJob darf seinen Carrier nicht freigeben.

## Verbindliche Grenze

CR-05C enthält ausdrücklich noch keine:

- Route oder Pathfinding,
- Distanzbewertung,
- Bewegung oder Position-Fortschreibung,
- Pickup-/Dropoff-Logik,
- Ressourcentransfer,
- Lauf-/Trageanimation,
- neuen TransportJob-Status wie `COMPLETED`.

CR-05C verwendet ausschließlich die bereits vorhandenen CR-04-Zustände `CANCELLED` und `RELEASED`.

## CI-Gate

`npm run test:cr05c` prüft Release bei CANCELLED/RELEASED, Availability Recovery, Link-Entfernung, Idempotenz, Schutz aktiver PENDING-Jobs, Wiederverwendbarkeit und Nebenwirkungsfreiheit. `npm run ci` enthält zusätzlich die komplette CR-03/CR-04/CR-05A/CR-05B-Regression.

Abschluss erst bei **CI PASS / 0 Blocker** und sichtbarem Geräte-/Browser-Gate.
