# CR-02C – Resource Demand Contract

Status: IMPLEMENTED / DEVICE TEST PENDING

## Ziel
CR-02C führt die autoritative Bedarfsseite für Ressourcen ein. Ein Demand beschreibt, welche Resource-Definition ein zukünftiger Verbraucher benötigt, in welcher Sollmenge und wie viel davon bereits reserviert bzw. erfüllt ist.

## Scope
Ein Demand besitzt eine stabile `demand:*`-ID, `consumerId`, `definitionId`, `targetAmount`, Metadaten und einen abgeleiteten Status.

Der Fortschritt wird ausschließlich aus dem Demand selbst und den zugeordneten Claims abgeleitet:

- `reservedAmount`: Summe ACTIVE Claims
- `fulfilledAmount`: Summe CONSUMED Claims
- `remainingAmount = max(0, targetAmount - reservedAmount - fulfilledAmount)`

Statuswerte:

- `OPEN`: noch nichts gedeckt
- `PARTIAL`: teilweise reserviert oder erfüllt
- `RESERVED`: Restbedarf 0, aber noch mindestens ein Claim ACTIVE
- `FULFILLED`: Sollmenge vollständig konsumiert/erfüllt
- `CANCELLED`: Demand abgebrochen

## Claim-Verknüpfung
Demand-Claims werden über `ResourceDemands.reserve(...)` angelegt. Dieser Pfad erzwingt:

1. Demand existiert und ist nicht CANCELLED.
2. Resource existiert.
3. Resource `definitionId` entspricht der vom Demand geforderten Definition.
4. Claim-Menge ist positiv.
5. Claim-Menge überschreitet niemals den aktuellen `remainingAmount`.
6. `consumerId` und `demandId` werden deterministisch aus dem Demand gesetzt.

Damit kann ein Demand mit Sollmenge 6 nach einer Reservierung von 4 nur noch maximal 2 weitere Einheiten beanspruchen.

## Release und Consume
`releaseClaim()` gibt eine aktive Reservierung frei und erhöht damit den Restbedarf wieder.

`consumeClaim()` überführt die Claim-Menge in erfüllte Menge. Konsumierte Menge wird nicht erneut Restbedarf.

## Autoritative Ownership
- Resource-Definitionen und Resource-Instanzen: CR-02A `ResourceState`
- Mengenreservierung und Claim-Lifecycle: CR-02B `ResourceClaims`
- Bedarf, Fortschritt und Demand-Status: CR-02C `ResourceDemands`

CR-02C erzeugt keinen zweiten Ressourcenbestand und kopiert keine Resource-Mengen als eigene Wahrheit.

## Nicht im Scope
CR-02C enthält ausdrücklich noch keine:

- automatische Ressourcensuche
- automatische Claim-Zuweisung
- Job-Erzeugung
- Träger/Carrier
- Bewegung/Navigation
- Baustellenlogik
- Lagerlogik
- Produktion
- Priorisierung konkurrierender Demands

## Regression / Self-Test
Der CR-02C-Test prüft mindestens:

- stabile Demand-ID
- Sollmenge und initialen Restbedarf
- eindeutige Demand↔Claim-Verknüpfung
- partielle Reservierung
- Schutz gegen Reservierung über den Restbedarf
- Schutz gegen falschen Resource-Type
- vollständige Reservierungsdeckung
- Übergang reserviert → erfüllt durch Consume
- deterministische Statusableitung
- tief eingefrorenen Snapshot
- keine produktiven Buildings, Units oder Jobs

Zusätzlich muss die komplette Regression CR-00 → CR-01A → CR-01B → CR-01C → CR-01 Freeze-Gate → CR-02A → CR-02B weiterhin PASS bleiben.

## Device Gate
GitHub Pages Branch:

`feature/cr-02c-resource-demand-contract`

Erwartete Anzeige:

`CR-02C SELF-TEST: PASS`

Bei PASS kann CR-02C auf PASS / FROZEN gesetzt werden.
