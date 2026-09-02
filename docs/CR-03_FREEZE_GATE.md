# CR-03 – Resource Matching & Assignment Foundation – Abschluss-/Freeze-Gate

Status: IMPLEMENTED / DEVICE TEST PENDING

## Ziel

CR-03 wird als zusammenhängende Foundation geprüft, ohne neue Gameplay-Funktion einzuführen.

Geprüfte Kette:

Demand → Matching → Assignment → Claim → Release → Rematching → Reassignment

## Enthaltene CR-03-Blöcke

- CR-03A – Deterministic Demand → Resource Matching
- CR-03B – Matching → Reservation Assignment
- CR-03C – Assignment Consistency / Release & Reassignment

## Freeze-Gate-Prüfungen

1. Deterministisches Matching
   - Demand-ID aufsteigend
   - Resource-ID aufsteigend
   - identische Eingaben erzeugen identische Match-Proposals
   - nur Ressourcen des geforderten Resource-Type werden ausgewählt

2. Matching → Assignment
   - Match-Proposals werden vollständig vorgeprüft
   - Reservierungen werden ausschließlich über die bestehende CR-02 Claim-/Demand-Kette erzeugt
   - Demand-Sollmengen werden nicht überschritten
   - Ressourcenmengen werden nicht überreserviert

3. Release → Rematching → Reassignment
   - Release öffnet exakt den freigegebenen Restbedarf wieder
   - freigegebene Menge wird wieder verfügbar
   - ein frisches Matching kann die offene Menge neu zuordnen
   - alte Claims werden nicht erneut aktiviert oder doppelt gezählt

4. Stale-Proposal-Schutz
   - verändert sich die Ressourcenverfügbarkeit nach Erzeugung eines Match-Proposals, wird das veraltete Proposal verworfen
   - der Fehler wird vor dem ersten neuen Assignment-Claim erkannt
   - danach kann ein frisch erzeugtes Proposal wieder korrekt zugewiesen werden

5. Ressourcen-Mengeninvariante

   available + reserved + consumed = resource.amount

6. Demand-Mengeninvariante

   remaining = target - reserved - fulfilled

7. Scope-Gate
   - 0 Jobs
   - 0 Units/Carrier
   - keine Wegfindung
   - keine Bewegung
   - keine Transportaufträge
   - keine zusätzliche Transport-Domain

## PASS-Kriterium

CR-03 darf nur eingefroren werden, wenn:

- alle bisherigen CR-01-/CR-02-/CR-03 Regressionstests PASS sind,
- der integrierte CR-03 Freeze-Gate-Test PASS ist,
- BlockerCount = 0 ist,
- der Gerätetest `CR-03 FREEZE-GATE: PASS / 0 BLOCKER` bestätigt.

Bis zum erfolgreichen Gerätetest bleibt der Status `IMPLEMENTED / DEVICE TEST PENDING`.

## Danach

Nach PASS / 0 BLOCKER wird CR-03 – Resource Matching & Assignment Foundation als Ganzes FROZEN. Erst danach darf die eigentliche Job-/Transport-Schicht beginnen.
