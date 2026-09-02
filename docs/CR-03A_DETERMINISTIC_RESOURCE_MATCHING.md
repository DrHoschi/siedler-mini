# CR-03A – Deterministic Demand → Resource Matching

Status: IMPLEMENTED / DEVICE TEST PENDING

## Ziel

CR-03A beantwortet ausschließlich die Frage:

> Welche vorhandenen Ressourcen sollen welchen offenen Bedarf decken?

Der Schritt baut auf dem eingefrorenen CR-02-Unterbau auf. Er führt noch keine Transportausführung ein.

## Verbindlicher Scope

CR-03A darf:

- offene bzw. teilweise offene Demands lesen,
- passende Resource-Instanzen anhand derselben `definitionId` finden,
- die tatsächlich noch freie Menge über `ResourceClaims.availableAmount(resourceId)` berücksichtigen,
- Ressourcen deterministisch auswählen,
- einen unveränderlichen Match-Vorschlag zurückgeben,
- mehrere offene Demands in einem Lauf ohne Doppelzuordnung derselben freien Teilmenge planen.

CR-03A darf ausdrücklich nicht:

- Claims oder Reservierungen erzeugen,
- Demand- oder Resource-State verändern,
- Jobs erzeugen,
- Carrier/Units erzeugen oder auswählen,
- Pfade berechnen,
- Bewegung starten,
- Transportprioritäten, Entfernung oder Wegkosten bewerten.

## Deterministische Auswahlregel

Aktuelle Basispolicy:

`DEMAND_ID_ASC_RESOURCE_ID_ASC`

1. Bei Batch-Matching werden matchbare Demands nach stabiler Demand-ID aufsteigend verarbeitet.
2. Passende Resource-Instanzen werden nach stabiler Resource-ID aufsteigend verarbeitet.
3. Pro Ressource wird höchstens die noch freie Menge verwendet.
4. Pro Demand wird höchstens dessen `remainingAmount` vorgeschlagen.
5. Ein temporäres, nur im Matching-Lauf vorhandenes Availability-Ledger verhindert Doppelzuordnungen zwischen mehreren Demands.

Diese Policy ist bewusst technisch und neutral. Nähe, Pfadlänge, Lagerpriorität oder Transportkosten gehören nicht in CR-03A.

## API

`ResourceMatching.matchDemand(demandId)`

Liefert einen eingefrorenen Vorschlag für genau einen Demand.

`ResourceMatching.matchOpenDemands()`

Liefert einen eingefrorenen Batch-Vorschlag für alle aktuell matchbaren Demands mit gemeinsamem temporären Availability-Ledger.

Ein Match enthält mindestens:

- `demandId`
- `consumerId`
- `definitionId`
- `requestedAmount`
- `matchedAmount`
- `unmatchedAmount`
- `complete`
- `policy`
- `selections[]` mit `resourceId`, vorgeschlagener `amount`, `availableBefore`, `location`, `ownerId`

## Matchbarkeit

Automatisch gematcht werden nur Demands mit Status:

- `OPEN`
- `PARTIAL`

und `remainingAmount > 0`.

`RESERVED`, `FULFILLED` und `CANCELLED` erzeugen keine neue Auswahl.

## Invarianten

CR-03A muss erhalten:

- vorgeschlagene Menge je Resource ≤ aktuelle freie Menge,
- vorgeschlagene Gesamtmenge je Demand ≤ `remainingAmount`,
- nur identische Resource-Definition deckt einen Demand,
- gleiche Eingaben → gleiche Auswahl und Reihenfolge,
- kein Resource-/Demand-/Claim-State wird durch Matching verändert,
- keine Jobs, Units, Carrier oder Bewegung entstehen als Nebenwirkung.

## Self-Test

`src/dev/cr-03a-self-test.js` prüft:

- korrekten Resource-Type,
- Berücksichtigung bereits belegter Teilmengen,
- deterministische Wiederholung,
- stabile Demand-/Resource-Reihenfolge,
- kein Double Assignment im Batch,
- partielle Deckung bei Ressourcenmangel,
- Reaktion auf bereits existierende Demand-Reservierungen,
- Ausschluss gecancelter Demands,
- Read-only-Verhalten,
- keine Jobs/Units als Nebenwirkung,
- eingefrorene Match-Ergebnisse.

## Abnahme

CR-03A ist erst nach Geräteprüfung PASS. Vor diesem PASS entstehen aus Match-Vorschlägen weiterhin keine echten Transportaufträge.
