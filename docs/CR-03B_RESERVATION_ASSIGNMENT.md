# CR-03B – Matching → Reservation Assignment

Status: IMPLEMENTED / DEVICE TEST PENDING

## Ziel

CR-03B bildet die kontrollierte Brücke zwischen dem rein lesenden CR-03A-Matching und den bereits vorhandenen CR-02-Claims. Ein bestätigter Match-Vorschlag darf jetzt in echte Demand-verknüpfte Reservierungen überführt werden.

CR-03B erzeugt weiterhin keinerlei Transportlogik.

## Erlaubter Scope

- CR-03A Match-Proposals lesen.
- Vor dem Schreiben den gesamten Einzel- oder Batch-Vorschlag vollständig prüfen.
- Resource-Type gegen Demand prüfen.
- aktuelle Restmenge des Demands prüfen.
- aktuelle freie Ressourcenmenge prüfen.
- doppelte Zuweisung innerhalb eines Batchs verhindern.
- nach erfolgreichem Preflight vorhandene `ResourceDemands.reserve()`- und damit CR-02-Claim-Mechanik verwenden.
- Claims mit `source = CR-03B_MATCH_PROPOSAL` kennzeichnen.
- resultierenden Demand-Status und Restbedarf zurückgeben.

## Ausdrücklich nicht erlaubt

- Jobs erzeugen.
- Träger oder andere Units auswählen oder erzeugen.
- Wegfindung.
- Bewegung.
- Transportaufträge.
- Entfernung, Laufzeit oder Transportkosten als Priorität verwenden.
- Produktion oder Baufortschritt starten.

## Preflight-/Atomaritätsvertrag

Vor dem ersten Claim wird der komplette zu bestätigende Vorschlag gegen den aktuellen Zustand geprüft. Enthält der Vorschlag eine ungültige, veraltete oder überbuchende Auswahl, wird er verworfen, bevor irgendeine neue Reservierung geschrieben wird.

Geprüft werden insbesondere:

- Demand existiert und ist `OPEN` oder `PARTIAL`.
- Consumer und Resource-Type entsprechen noch dem Demand.
- `requestedAmount` entspricht dem aktuellen `remainingAmount`.
- jede Selection verweist auf eine existierende, nicht vollständig konsumierte Ressource des richtigen Typs.
- Selection-Mengen sind positive Ganzzahlen.
- die aktuelle freie Ressourcenmenge reicht aus.
- die Summe der Selections überschreitet den Restbedarf nicht.
- `matchedAmount` und `unmatchedAmount` stimmen mit den Selections überein.
- ein Demand kommt in einem Batch nur einmal vor.

Da der Preflight vollständig vor der Commit-Phase erfolgt und die Commit-Phase synchron auf derselben Runtime ausgeführt wird, gibt es bei einem vorab erkennbaren Fehler keine Teilreservierung.

## Resultat

Nach erfolgreichem Assignment gilt weiterhin die CR-02-Mengenlogik:

`verfügbar + reserviert + konsumiert = ursprüngliche Ressourcenmenge`

Auf Demand-Seite gilt weiterhin:

`Restbedarf = Sollmenge − reserviert − erfüllt`

Ein vollständig reservierter Demand wird `RESERVED`, ein teilweise reservierter Demand bleibt `PARTIAL`.

## Selbsttest

`src/dev/cr-03b-self-test.js` prüft:

- bestätigte Matches erzeugen Demand-verknüpfte ACTIVE-Claims,
- Demand-Fortschritt stimmt mit den erzeugten Claims überein,
- Ressourcenmengen bleiben invariant,
- keine Jobs oder Units entstehen,
- erneutes Verwenden eines veralteten Proposals wird abgewiesen,
- ein fehlerhafter Batch wird vor dem ersten Write vollständig abgewiesen,
- ein Vorschlag mit falschem Resource-Type wird vor dem Write abgewiesen.

## Geräte-Gate

Die Testseite muss auf dem CR-03B-Branch sichtbar `CR-03B ASSIGNMENT: PASS` melden. Erst danach wird CR-03B als PASS / COMPLETE geführt.
