# CR-02A – Resource State Foundation

Status: DEVICE TEST PENDING
Branch: `feature/cr-02a-resource-state-contract`
Basis: CR-01 PASS / FROZEN (`01ec78c041f7ff07075764c0bdec7027aec76574`)

## Ziel

CR-02A definiert den ersten autoritativen Ressourcenvertrag der Clean Runtime. Es werden noch keine Transport-, Träger-, Lager-, Produktions- oder Wirtschaftsabläufe implementiert.

## Ownership

- Resource-Definitionen werden von `ResourceState` in einem getrennten Definitions-Store gehalten.
- Konkrete Resource-Instanzen liegen ausschließlich im bereits durch CR-01C eingefrorenen `domains.resources` DomainStore.
- `ResourceState` ist die kontrollierte Fach-API über diesen Store und erzeugt keinen zweiten Resource-Instance-State.
- Standortreferenzen werden gegen den autoritativen `WorldStore` geprüft.

## Resource Definition

Eine Definition besitzt mindestens:

- stabile ID `resource-type:*`
- `technicalName`
- optionales `label`
- `metadata`

CR-02A legt noch keine produktive Ressourcenliste oder Balancewerte fest.

## Resource Instance

Eine konkrete Resource-Instanz besitzt mindestens:

- stabile ID `resource:*`
- `definitionId`
- positive ganzzahlige `amount`
- `state`
- `location`
- optionalen `ownerId`
- `metadata`

Damit kann eine Instanz sowohl ein einzelnes physisches Gut (`amount = 1`) als auch eine kontrollierte Menge repräsentieren. Eine spätere Stapel-/Lagerplatzregel wird in CR-02A ausdrücklich noch nicht festgelegt.

## Grundzustände

CR-02A definiert ausschließlich die Zustandswerte:

- `AVAILABLE`
- `RESERVED`
- `CONSUMED`

Die Zustände bilden noch keine Transport- oder Produktionslogik ab.

## Standortvertrag

`location.kind` ist aktuell einer von:

- `cell` – Resource ist räumlich einer World-Cell zugeordnet
- `owner` – Resource ist logisch einem Owner-Ort zugeordnet
- `none` – keine räumliche Zuordnung

Für `cell` und `owner` ist eine gültige Stable-ID als `refId` erforderlich. CR-02A implementiert noch keine Bewegung zwischen diesen Orten.

## Owner-Vertrag

`ownerId` ist optional und muss, falls gesetzt, eine bekannte World-Referenz oder die World-ID sein. Gebäude-/Unit-Owner werden erst möglich, sobald diese Domänen produktive Entities besitzen und die Referenzprüfung entsprechend erweitert wird.

## Kontrollierte Mutationen

`ResourceState` stellt für CR-02A bereit:

- `createDefinition()`
- `createResource()`
- `get()` / `ids()`
- `setAmount()`
- `setState()`
- `relocate()`
- `snapshot()`

Snapshots sind tief eingefroren und vom autoritativen State getrennt.

## Self-Test

Der CR-02A-Test prüft:

1. stabile Resource-Type-ID,
2. Resource-Instanz mit Definition und Menge,
3. Location-/Owner-Referenzprüfung,
4. kontrollierte State-/Amount-/Location-Mutationen,
5. eingefrorene und getrennte Snapshots,
6. keine Erzeugung von Jobs, Units oder Buildings.

Die produktive Runtime startet weiterhin ohne Resource-Definitionen und ohne Resource-Instanzen. Testdaten existieren ausschließlich in isolierten Testinstanzen.

## Nicht-Ziele

Nicht Bestandteil von CR-02A:

- Carrier/Träger
- Transportaufträge
- Lagerplätze oder Stapelgrenzen
- Gebäudeinventare
- Baustellenbedarf
- Produktion oder Verbrauchsrezepte
- Wege/Navigation
- SaveGame
- UI für Ressourcen

## Abnahmekriterium

CR-02A kann auf PASS / FROZEN gesetzt werden, wenn die komplette Regression CR-00 → CR-01 Freeze-Gate weiterhin PASS ist und der Gerätetest `CR-02A SELF-TEST: PASS` zeigt.
