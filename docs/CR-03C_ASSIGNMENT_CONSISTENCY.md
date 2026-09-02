# CR-03C – Assignment Consistency / Release & Reassignment Gate

Status: IMPLEMENTED / DEVICE TEST PENDING

## Ziel

CR-03C prüft die Stabilität der in CR-03A/CR-03B aufgebauten Kette nach Änderungen an bereits bestehenden Reservierungen.

Verbindliche Kette:

Demand → Matching → Assignment → Claim/Reservation → Release → Rematching → Reassignment

CR-03C führt keine neue Transportlogik ein.

## Geprüfter Scope

- Eine aktive Demand-Reservation kann über den bestehenden CR-02-Release-Pfad freigegeben werden.
- Der freigegebene Anteil wird sofort wieder als verfügbare Ressourcenmenge geführt.
- Der Demand erhält exakt diesen Anteil wieder als Restbedarf.
- Ein neuer CR-03A-Match kann nur den aktuell offenen Restbedarf auswählen.
- CR-03B kann diesen neuen Match erneut in Claims umsetzen.
- Ein bereits erfüllter/reservierter Demand kann nicht mit einem alten Proposal doppelt reserviert werden.
- Wenn sich die Verfügbarkeit zwischen Release und Rematch ändert, wird ausschließlich der aktuelle Zustand verwendet.
- Andere Demands dürfen freigegebene Ressourcen übernehmen; der ursprüngliche Demand muss danach aus den verbleibenden Ressourcen neu gematcht werden.
- Für jede Resource-Instanz bleibt die Mengeninvariante erhalten:

  available + reserved + consumed = resource.amount

- Auf Demand-Seite bleibt erhalten:

  remaining = target - reserved - fulfilled

## Konsistenzszenario

Der Self-Test verwendet mehrere Holzressourcen und zwei konkurrierende Demands.

1. Demand A wird vollständig gematcht und reserviert.
2. Ein Claim von Demand A wird freigegeben.
3. Resource-Verfügbarkeit und Demand-Restbedarf müssen exakt zurückkehren.
4. Demand A wird erneut gematcht und wieder vollständig reserviert.
5. Dasselbe alte Match-Proposal darf danach keine zweite Reservierung erzeugen.
6. Ein weiterer Claim von Demand A wird freigegeben.
7. Demand B reserviert einen Teil der nun freien Ressourcen.
8. Demand A wird auf Basis der veränderten Verfügbarkeit neu gematcht.
9. Die restliche Menge von Demand A wird aus der aktuell noch freien Ressourcenmenge neu zugewiesen.
10. Ressourcen- und Demand-Invarianten werden abschließend geprüft.

## Ausdrücklich außerhalb CR-03C

- Jobs
- Carrier/Units
- Transportaufträge
- Wegfindung
- Bewegung
- Abhol- oder Lieferstatus
- Entfernungskosten
- Lager-/Quellenprioritäten
- Produktionslogik

Der Self-Test verlangt zusätzlich, dass während des gesamten Release-/Reassignment-Zyklus weder Jobs noch Units entstehen.

## PASS-Bedingung

CR-03C ist erst abgeschlossen, wenn der Browser-/Gerätetest auf dem Feature-Branch sichtbar meldet:

`CR-03C CONSISTENCY: PASS`

Erst danach kann das CR-03 Gesamt-Freeze-Gate vorbereitet werden.
