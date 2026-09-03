# CR-05A – Carrier Contract & Availability State

Stand: 2026-09-03
Status: **IN PROGRESS / NOT FROZEN**

## Ziel

CR-05A führt ausschließlich die Domain-Basis eines Trägers ein. Ein Carrier ist eine vorhandene Unit mit stabiler `unit:*`-Referenz und beschreibt nur, ob diese Unit einen bestehenden TransportJob grundsätzlich übernehmen könnte.

## Contract

Ein Carrier enthält:

- `unitId`: stabile `unit:*`-Referenz,
- `capacity`: positive ganzzahlige Tragfähigkeit,
- `state`: `AVAILABLE` oder `OCCUPIED`,
- `location`: aktuelle Location-Referenz `{ kind, refId }`.

## TransportJob-Eignung

`CarrierContract.isSuitableForJob(carrier, job)` liefert nur dann `true`, wenn:

- der Carrier `AVAILABLE` ist,
- der Job ein `transport-job` ist,
- der Job `PENDING` ist,
- die Job-Menge positiv ist,
- `job.amount <= carrier.capacity` gilt.

Die Prüfung ist rein lesend. Sie weist keinen Carrier zu und verändert weder Carrier noch TransportJob.

## Verbindliche Grenze

CR-05A enthält ausdrücklich noch keine:

- automatische Carrier-Auswahl,
- Carrier→TransportJob-Zuweisung,
- Reservierung/Belegung durch einen konkreten Job,
- Pickup- oder Dropoff-Logik,
- Route, Path oder Pathfinding,
- Bewegung, Position-Fortschreibung oder Progress,
- Lauf-/Trageanimation.

Die aktuelle `location` ist lediglich Domain-Zustand und löst keinerlei Bewegung aus.

## CI-Gate

`npm run test:cr05a` prüft Contract, Stable-ID, Kapazität, Availability State, Location-Referenz, TransportJob-Eignung und Nebenwirkungsfreiheit. `npm run ci` enthält CR-05A zusätzlich zur CR-03/CR-04-Regression.

Abschluss erst bei **CI PASS / 0 Blocker** und anschließendem sichtbaren Geräte-/Browser-Gate, soweit für diesen Domain-Schritt eine sichtbare Prüffläche vorhanden ist.
