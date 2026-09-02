# CR-04A – Transport Job Contract

Stand: 2026-09-02
Status: **COMPLETE**

## Ziel

CR-04A definiert ausschließlich den Datenvertrag eines Transportauftrags auf Basis des in CR-03 bereits reservierten Ressourcenanteils.

Die Systemgrenze bleibt bewusst eng:

- **CR-03 FROZEN:** Welche Ressource wird welchem Demand zugeordnet und dafür reserviert?
- **CR-04A COMPLETE:** Welche Daten muss ein daraus später entstehender Transportauftrag verbindlich tragen und wann ist dieser Vertrag gültig?
- **CR-04B:** Erzeugt später kontrolliert TransportJobs aus Assignment-/Claim-Ergebnissen.

CR-04A erzeugt selbst keine Jobs im DomainStore und enthält keine Runtime-Transportlogik.

## Verbindlicher TransportJob-Datensatz

Ein gültiger `TransportJob` enthält:

| Feld | Bedeutung |
|---|---|
| `id` | stabile ID `transport-job:*` |
| `kind` | fest `transport-job` |
| `claimId` | konkreter aktiver CR-03 Claim, der die Ressource reserviert |
| `demandId` | Demand, zu dem der Claim gehört |
| `resourceId` | konkrete reservierte Ressource |
| `definitionId` | Resource-Type |
| `sourceLocation` | Snapshot der aktuellen Ressourcenquelle (`cell` oder `owner`) |
| `targetId` | aktueller `consumerId` des Demands |
| `amount` | exakt die durch den referenzierten Claim reservierte Menge |
| `status` | in CR-04A ausschließlich `PENDING` |

## Ownership und Referenzmodell

CR-04A dupliziert keine Reservierungslogik. Der Claim bleibt die verbindliche Quelle dafür, welcher konkrete Ressourcenanteil für welchen Consumer/Demand reserviert ist.

Der TransportJob referenziert deshalb einen konkreten `claimId`. Ein eigener `assignmentId` wird in CR-04A nicht eingeführt, weil CR-03 Assignments derzeit Ergebnisobjekte und keine eigenständig persistierten Domain-Entities mit Stable ID sind.

Ein TransportJob entspricht in CR-04A genau einem aktiven Claim. Das bedeutet zugleich:

`TransportJob.amount === Claim.amount`

Teilung eines Claims auf mehrere TransportJobs oder Zusammenfassung mehrerer Claims in einen Job ist nicht Bestandteil von CR-04A und muss später ausdrücklich entschieden werden.

## Validierungsinvarianten

Ein TransportJob ist nur gültig, wenn alle folgenden Bedingungen erfüllt sind:

1. `id`, `claimId`, `demandId`, `resourceId`, `definitionId`, Quelle und Ziel verwenden gültige Stable IDs.
2. `amount` ist eine positive Safe-Integer-Menge.
3. Der referenzierte Claim existiert und ist `ACTIVE`.
4. `claim.demandId === job.demandId`.
5. `claim.resourceId === job.resourceId`.
6. `claim.consumerId === job.targetId`.
7. `claim.amount === job.amount`.
8. Der Demand existiert und gehört zum gleichen Consumer und Resource-Type.
9. Der Demand ist `PARTIAL` oder `RESERVED`; erfüllte oder abgebrochene Demands sind nicht transportierbar.
10. Die Ressource existiert, hat den gleichen Resource-Type und befindet sich im Zustand `RESERVED`.
11. `sourceLocation` entspricht der aktuellen `resource.location`.
12. Als Quelle sind in CR-04A nur `cell` und `owner` zulässig; `none` ist keine transportierbare Quelle.
13. Der einzige in CR-04A zulässige Status ist `PENDING`.

## Verbotene Nebenwirkungen

Das Definieren oder Validieren eines TransportJob-Contracts darf insbesondere **nicht**:

- Claims erzeugen, verändern, freigeben oder konsumieren,
- Demand-Mengen oder Demand-Status verändern,
- Resource-Mengen, Resource-State oder Resource-Location verändern,
- einen Eintrag in `domains.jobs` anlegen,
- Units oder Carrier erzeugen oder auswählen,
- Route oder Path bestimmen,
- Positionen oder Bewegungsfortschritt verändern,
- einen Demand allein durch die Existenz des Contracts erfüllen.

## Explizit nicht Teil von CR-04A

- Assignment → TransportJob-Erzeugung
- Job-Persistenz / Job-Store-Lifecycle
- Carrier-Auswahl oder Carrier-Reservierung
- Kapazitätsprüfung eines Carriers
- Wegfindung
- Route/Path
- Bewegung
- Pickup/Dropoff
- Statusübergänge nach `PENDING`
- Claim-Splitting oder Job-Batching
- physische Zielpunktauflösung hinter `targetId`

## Tests und Integration

Die Contract-Tests liegen in `src/dev/cr-04a-self-test.js` und werden über `src/dev/cr-04a-self-test.node.js` ausführbar gemacht.

Die CR-03-Freeze-Regression besitzt zusätzlich den Node-Runner `src/dev/cr-03-freeze-gate.node.js`.

Das gemeinsame Gate `src/dev/cr-04a-integration-gate.node.js` führt CR-03 Regression und CR-04A Contract Tests zusammen. `npm run ci` führt davor außerdem Clean-Runtime-Syntax- und Strukturprüfung aus.

Verbindlicher Abschlusslauf:

- GitHub Actions Workflow: `CI Baseline`
- Run: `4199`
- Head: `64e03900e86ae169398e5d5e0ee3bea12fedaca9`
- Ergebnis: **PASS / 0 Blocker**

Damit sind gemeinsam bestätigt:

- Clean-Runtime-Syntaxgate PASS,
- Clean-Runtime-Strukturgate PASS,
- CR-03 Regression PASS,
- CR-04A Contract Tests PASS,
- keine Carrier-, Routing- oder Movement-Abhängigkeit in CR-04A.

## Abschluss

**CR-04A – Transport Job Contract: COMPLETE**

CR-04 als Gesamtblock bleibt **IN PROGRESS / NOT FROZEN**.

Der nächste fachliche Schritt ist **CR-04B – Controlled Assignment → TransportJob Creation**. Dort darf erstmals kontrolliert aus einem bestehenden CR-03 Assignment/Claim ein persistierter TransportJob entstehen. Carrier-Auswahl, Wegfindung und Bewegung bleiben weiterhin außerhalb des Scopes.
