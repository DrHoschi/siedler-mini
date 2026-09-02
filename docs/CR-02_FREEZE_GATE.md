# CR-02 – Resource State Foundation Freeze Gate

Status: DEVICE TEST PENDING

Basis: CR-02C – Resource Demand Contract

## Ziel

CR-02 wird als geschlossene Resource-State-Foundation geprüft, bevor automatische Demand→Resource-Zuordnung, Jobs, Carrier, Bewegung, Lager oder Produktion beginnen.

## Geprüfte Kette

- CR-02A – Resource State Foundation
- CR-02B – Resource Reservation & Claim Contract
- CR-02C – Resource Demand Contract

## Verbindliche Invarianten

### Ressourcenmenge

Für jede konkrete Ressourceninstanz gilt:

`availableAmount + reservedAmount + consumedAmount = originalAmount`

Keine Reservierung oder Consumption darf Menge erzeugen oder verlieren.

### Demand-Menge

Für jeden aktiven Demand gilt:

`remainingAmount = targetAmount - reservedAmount - fulfilledAmount`

Der Wert darf nicht negativ werden.

## Claim-/Demand-Vertrag

- Claim besitzt stabile `claim:*`-ID.
- Demand besitzt stabile `demand:*`-ID.
- Demand referenziert genau einen `resource-type:*`.
- Ein Demand-Claim muss auf eine Resource desselben Resource-Type zeigen.
- Ein Claim kann nicht über die verfügbare Ressourcenmenge hinaus reservieren.
- Ein Demand kann nicht über seinen Restbedarf hinaus reservieren.
- Release gibt reservierte Menge wieder frei.
- Consume verschiebt reservierte Menge deterministisch in erfüllte/konsumierte Menge.
- Verbrauchte Claims können nicht wieder freigegeben werden.

## Gate-Szenario

Die Regression verwendet isoliert eine Resource mit Menge 6 und einen Demand mit Sollmenge 6:

1. Reserve 4 → reserved=4, remaining=2.
2. Reserve weitere 3 → muss abgewiesen werden.
3. Reserve 2 → reserved=6, remaining=0, Status RESERVED.
4. Consume 4 → fulfilled=4, reserved=2, remaining=0.
5. Release 2 → fulfilled=4, reserved=0, remaining=2.
6. Reserve und Consume 2 → fulfilled=6, remaining=0, Status FULFILLED.
7. Nach jedem Schritt bleibt die Ressourceninvariante exakt erfüllt.

Zusätzlich wird eine Resource-Type-Fehlzuordnung geprüft: Ein Wood-Demand darf nicht mit einer Stone-Resource reserviert werden.

## Scope-Gate

Die produktive Runtime muss beim Freeze-Gate weiterhin leer bleiben:

- Buildings = 0
- Units = 0
- Jobs = 0
- Resource-Instanzen = 0
- Resource-Definitionen = 0
- Claims = 0
- Demands = 0

Die Testdaten dürfen nur in isolierten Testinstanzen entstehen.

## Nicht Bestandteil von CR-02

- automatische Ressourcensuche
- Demand→Resource Matching/Assignment
- Job-Erzeugung
- Carrier/Träger
- Bewegung oder Navigation
- Lagerplätze oder Stapellimits
- Baustellenlogik
- Produktion
- SaveGame-Erweiterung

## Freeze-Kriterium

CR-02 darf erst als PASS / FROZEN gelten, wenn:

- CR-00 bis CR-01 Regression PASS,
- CR-02A PASS,
- CR-02B PASS,
- CR-02C PASS,
- CR-02 Freeze-Gate PASS,
- Open Blockers = 0,
- Gerätetest auf GitHub Pages PASS.

Danach ist als nächster Systemblock die automatische Demand→Resource Matching/Assignment-Schicht zulässig.
