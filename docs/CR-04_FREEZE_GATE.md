# CR-04 – Transport Job Foundation Freeze Gate

Stand: 2026-09-03
Status: **IN PROGRESS / NOT FROZEN**

## Scope

CR-04 wird als Gesamtblock nur freigegeben, wenn CR-04A, CR-04B und CR-04C gemeinsam mit der CR-03-FROZEN-Regression auf PASS / 0 Blocker stehen.

Geprüft werden insbesondere:

- TransportJob-Contract und Link-Konsistenz,
- kontrollierte Assignment/Claim → TransportJob-Erzeugung,
- genau ein PENDING-Job pro aktivem Claim,
- `TransportJob.amount === Claim.amount`,
- Demand-Invariante `remaining = target - reserved - fulfilled`,
- idempotente Job-Erzeugung,
- CANCELLED hält Claim/Resource reserviert,
- RELEASED gibt Claim/Resource kontrolliert frei,
- idempotente Freigabe ohne Double-Free,
- CR-03 Regression bleibt PASS,
- 0 Carrier / Units als Transportausführung,
- 0 Route / Path / Pathfinding,
- 0 Movement / Position / Progress.

## Verbindliche Grenze

CR-04 friert ausschließlich die Transport Job Foundation ein. Carrier-Auswahl, Carrier-Kapazität, Pickup/Dropoff, Wegfindung und Bewegung gehören ausdrücklich in spätere Entwicklungsblöcke.

## Abschlusskriterium

Erst wenn CI und sichtbarer Geräte-/Browser-Gate beide **PASS / 0 Blocker** melden, wird dieser Status auf **FROZEN** gesetzt.
