# CR-23A – Person / Resident Identity Contract

Status: **IMPLEMENTED – NOT FROZEN**

## Zweck

CR-23A führt erstmals eine stabile fachliche Identität für eine Person / einen Bewohner ein.

Die Person verwendet bewusst den bestehenden Stable-ID-Kind `unit`. `personId` ist damit die semantische Personenidentität auf der bereits vorhandenen allgemeinen Unit-ID-Basis. CR-23A erzeugt keinen zweiten Personen-Store und keine parallele ID-Welt.

## Vertrag

Ein CR-23A-Personenvertrag enthält ausschließlich:

- `kind: person-resident-identity`
- `personId`: gültige stabile `unit:`-ID
- `existenceState: EXISTS`

`EXISTS` ist in CR-23A nur der minimale Ausgangszustand. Weitere Person-Lifecycle-Zustände und Übergänge werden hier ausdrücklich nicht definiert.

## Im Scope

- stabile Person-Identität auf bestehender Unit-ID-Basis,
- deterministische Validierung der `personId`,
- minimaler Existenz-Ausgangszustand `EXISTS`,
- immutable Contract-Werte,
- klare Erweiterungsgrenze für spätere Home-/Housing-/Workforce-Systeme.

## Ausdrücklich nicht im Scope

- Registrierung im Unit-DomainStore,
- Home-/Building-Zuordnung,
- Housing Capacity / Occupancy,
- Household / Eltern / Kinder / Nachwuchs,
- Alter / Geschlecht / Namenssystem,
- BirthTimer oder Bevölkerungsregeneration,
- Profession / Workforce / Job-Zuweisung,
- Werkzeuge / Kleidung,
- Produktion,
- BuildingStock / Lager / Inventory,
- Construction,
- Transport,
- Bewegung / Position / Route,
- UI / Rendering.

## Architekturregel

Eine reale Person soll später dieselbe physische Entität bleiben, unabhängig davon, ob sie Bewohner, Carrier oder Spezialist ist. CR-23A schafft deshalb keine getrennte Bewohner-Identität neben der allgemeinen Unit-Identität.

## Prüfziel

`src/dev/cr-23a-self-test.js` prüft insbesondere:

- gültige `unit:`-PersonId,
- Ablehnung anderer Stable-ID-Kinds und ungültiger IDs,
- deterministische Vertragsbildung,
- ausschließlich `EXISTS` als aktuellen CR-23A-Existenzzustand,
- Immutability,
- keine vorgezogene Home-, Housing-, Population-, Workforce-, Production-, Storage-, Construction- oder Transportlogik.

## Abgrenzung innerhalb CR-23

- **CR-23A:** Person / Resident Identity Contract – **IMPLEMENTED / NOT FROZEN**
- **CR-23B:** Resident ↔ Home Assignment Contract – noch nicht begonnen
- **CR-23C:** Housing Capacity & Occupancy Foundation – noch nicht begonnen
